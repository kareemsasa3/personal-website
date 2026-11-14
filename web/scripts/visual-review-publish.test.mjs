import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ASSETS_BRANCH, MARKER, loadArtifact, publish, renderComment } from "./visual-review-publish.mjs";

const REPO = "owner/site";
const HEAD = "a".repeat(40);
const OTHER_HEAD = "b".repeat(40);
const BOT = { login: "github-actions[bot]" };

// Smallest valid PNG header; the publisher only checks the signature and IHDR size.
const png = (seed, width = 1440, height = 900) => {
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  const size = Buffer.alloc(8);
  size.writeUInt32BE(width, 0);
  size.writeUInt32BE(height, 4);
  return Buffer.concat([header, size, Buffer.from(seed)]);
};
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

const side = (name, file, bytes, extra = {}) => ({
  side: name, status: "captured", reason: null, errors: [], blocked: [], notFound: false, errorBoundary: false,
  overflowX: 0, height: 900, clipped: false, attempts: 2, sha256: bytes ? sha256(bytes) : null, file, ...extra,
});

// Writes an artifact laid out like visual-review.mjs output.
const makeArtifact = async ({ pairs = "default", notes = [], coverage = "complete", tamper } = {}) => {
  const dir = await mkdtemp(join(tmpdir(), "visual-review-artifact-"));
  for (const sub of ["base", "head", "diff"]) await mkdir(join(dir, sub));
  const files = {
    "base/projects--1440x900.png": png("base"),
    "head/projects--1440x900.png": png("head"),
    "diff/projects--1440x900.png": png("diff"),
    "base/home--1440x900.png": png("same"),
    "head/home--1440x900.png": png("same"),
  };
  for (const [file, bytes] of Object.entries(files)) await writeFile(join(dir, file), bytes);
  const defaultPairs = [
    {
      id: "projects--1440x900", route: "/projects", viewport: "desktop 1440x900", verdict: "changed", pixels: "different",
      base: side("base", "base/projects--1440x900.png", files["base/projects--1440x900.png"]),
      head: side("head", "head/projects--1440x900.png", files["head/projects--1440x900.png"]),
      diff: { file: "diff/projects--1440x900.png", changedPixels: 1234, rows: [952, 980] },
    },
    {
      id: "home--1440x900", route: "/", viewport: "desktop 1440x900", verdict: "unverified-below-clip", pixels: "identical",
      base: side("base", "base/home--1440x900.png", files["base/home--1440x900.png"], { clipped: true, height: 5200 }),
      head: side("head", "head/home--1440x900.png", files["head/home--1440x900.png"], { clipped: true, height: 5200 }),
      diff: null,
    },
  ];
  const results = {
    args: { mode: "compare", theme: "dark", "base-sha": "c".repeat(40), "head-sha": "d".repeat(40) },
    plan: { routes: ["/projects", "/"], unreviewed: [], notes, coverage },
    environment: { browser: "chromium 1" },
    fatal: null,
    pairs: pairs === "default" ? defaultPairs : pairs,
  };
  tamper?.(results, dir);
  await writeFile(join(dir, "results.json"), JSON.stringify(results));
  return dir;
};

// In-memory GitHub REST API: just the endpoints the publisher uses.
const fakeGitHub = ({ prs = [{ number: 7, head: HEAD }], comments = [], failOn } = {}) => {
  const state = {
    pulls: prs.map((pr) => ({ number: pr.number, head: { sha: pr.head, repo: { full_name: pr.headRepo ?? REPO } } })),
    comments: comments.map((comment, index) => ({ id: index + 1, user: BOT, ...comment })),
    blobs: new Map(), trees: new Map(), commits: new Map(), ref: null, statuses: [], calls: [], nextId: 100,
  };
  const id = (prefix) => `${prefix}${(state.nextId++).toString(16).padStart(40 - prefix.length, "0")}`;
  const fail = (status, message) => Object.assign(new Error(message), { status });
  const api = async (method, path, body) => {
    state.calls.push(`${method} ${path}`);
    if (failOn?.(method, path, state)) throw fail(500, `injected failure on ${method} ${path}`);
    const [route, query = ""] = path.split("?");
    const page = Number(new URLSearchParams(query).get("page") ?? 1);
    let match;
    if (method === "GET" && route === `/repos/${REPO}/pulls`) return page === 1 ? state.pulls : [];
    if (method === "GET" && (match = route.match(/^\/repos\/[^/]+\/[^/]+\/pulls\/(\d+)$/))) return state.pulls.find((pr) => pr.number === Number(match[1]));
    if (method === "GET" && route.match(/\/issues\/\d+\/comments$/)) return page === 1 ? state.comments : [];
    if (method === "POST" && (match = route.match(/\/issues\/(\d+)\/comments$/))) {
      const comment = { id: state.nextId++, user: BOT, body: body.body, html_url: "https://github.com/c" };
      state.comments.push(comment);
      return comment;
    }
    if (method === "PATCH" && (match = route.match(/\/issues\/comments\/(\d+)$/))) {
      const comment = state.comments.find((c) => c.id === Number(match[1]));
      comment.body = body.body;
      return { ...comment, html_url: "https://github.com/c" };
    }
    if (method === "DELETE" && (match = route.match(/\/issues\/comments\/(\d+)$/))) {
      state.comments = state.comments.filter((c) => c.id !== Number(match[1]));
      return null;
    }
    if (method === "POST" && route.endsWith("/git/blobs")) {
      const sha = id("b");
      state.blobs.set(sha, body.content);
      return { sha };
    }
    if (method === "GET" && route.endsWith(`/git/ref/heads/${ASSETS_BRANCH}`)) {
      if (!state.ref) throw fail(404, "Not Found");
      return { object: { sha: state.ref } };
    }
    if (method === "GET" && (match = route.match(/\/git\/commits\/(\w+)$/))) return { tree: { sha: state.commits.get(match[1]).tree } };
    if (method === "GET" && (match = route.match(/\/git\/trees\/(\w+)$/))) return { truncated: false, tree: state.trees.get(match[1]) };
    if (method === "POST" && route.endsWith("/git/trees")) {
      const files = new Map((body.base_tree ? state.trees.get(body.base_tree) : []).map((entry) => [entry.path, entry]));
      for (const entry of body.tree) {
        if (entry.sha === null) files.delete(entry.path);
        else files.set(entry.path, { path: entry.path, type: "blob", sha: entry.sha });
      }
      const sha = id("t");
      state.trees.set(sha, [...files.values()]);
      return { sha };
    }
    if (method === "POST" && route.endsWith("/git/commits")) {
      const sha = id("c");
      state.commits.set(sha, { tree: body.tree, parents: body.parents });
      return { sha };
    }
    if (method === "POST" && route.endsWith("/git/refs")) {
      if (state.ref) throw fail(422, "Reference already exists");
      state.ref = body.sha;
      return {};
    }
    if (method === "PATCH" && route.endsWith(`/git/refs/heads/${ASSETS_BRANCH}`)) {
      if (state.commits.get(body.sha).parents[0] !== state.ref) throw fail(422, "Update is not a fast forward");
      state.ref = body.sha;
      return {};
    }
    if (method === "POST" && route.includes("/statuses/")) {
      state.statuses.push({ sha: route.split("/").pop(), ...body });
      return {};
    }
    throw new Error(`fake GitHub has no route for ${method} ${path}`);
  };
  return { api, state };
};

const env = (artifactDir, overrides = {}) => ({
  repository: REPO, runId: 555, runAttempt: 1, conclusion: "success", headSha: HEAD, headRepository: REPO,
  runUrl: "https://github.com/owner/site/actions/runs/555", publishRunUrl: "https://github.com/owner/site/actions/runs/556",
  artifactDir, ...overrides,
});
const filesAt = (state) => state.trees.get(state.commits.get(state.ref).tree).map((entry) => entry.path).sort();

test("publishes before, after, and diff images inline for a changed pair", async () => {
  const { api, state } = fakeGitHub();
  const result = await publish({ api, ...env(await makeArtifact()) });
  assert.equal(result.outcome, "published");
  assert.equal(state.comments.length, 1);
  const body = state.comments[0].body;
  assert.ok(body.startsWith(MARKER));
  const images = [...body.matchAll(/<img src="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(images.length, 3, body);
  for (const url of images) assert.match(url, new RegExp(`^https://raw\\.githubusercontent\\.com/${REPO}/${state.ref}/pr-7/${HEAD}/555-1/(base|head|diff)/projects--1440x900\\.png$`));
  assert.match(body, /<summary>[^<]*desktop 1440x900[^<]*changed/);
  assert.match(body, /`\/projects`/);
  assert.match(body, /rows 952–980/);
});

test("committed assets are exactly the published images, filed under the PR head SHA", async () => {
  const { api, state } = fakeGitHub();
  await publish({ api, ...env(await makeArtifact()) });
  assert.deepEqual(filesAt(state), ["base", "diff", "head"].map((s) => `pr-7/${HEAD}/555-1/${s}/projects--1440x900.png`).sort());
});

test("pairs without differences are listed but not uploaded, and clipping stays visible", async () => {
  const { api, state } = fakeGitHub();
  await publish({ api, ...env(await makeArtifact()) });
  const body = state.comments[0].body;
  assert.ok(!filesAt(state).some((path) => path.includes("home--")));
  assert.match(body, /`\/` \| desktop 1440x900 \| unverified below clip \|/);
  assert.match(body, /5200px/);
});

test("the comment names the head SHA and links the capture run", async () => {
  const { api, state } = fakeGitHub();
  await publish({ api, ...env(await makeArtifact()) });
  const body = state.comments[0].body;
  assert.ok(body.includes(`https://github.com/${REPO}/commit/${HEAD}`));
  assert.ok(body.includes(HEAD.slice(0, 7)));
  assert.ok(body.includes("actions/runs/555"));
});

test("a later run edits the existing comment and replaces earlier assets", async () => {
  const { api, state } = fakeGitHub();
  await publish({ api, ...env(await makeArtifact()) });
  const first = state.comments[0].id;
  await publish({ api, ...env(await makeArtifact(), { runId: 600 }) });
  assert.equal(state.comments.length, 1);
  assert.equal(state.comments[0].id, first);
  assert.ok(state.comments[0].body.includes("/600-1/"));
  assert.ok(filesAt(state).every((path) => path.startsWith(`pr-7/${HEAD}/600-1/`)), filesAt(state).join("\n"));
});

test("duplicate visual-review comments are collapsed into one", async () => {
  const { api, state } = fakeGitHub({ comments: [{ body: `${MARKER}\nold` }, { body: `${MARKER}\nolder` }] });
  await publish({ api, ...env(await makeArtifact()) });
  assert.equal(state.comments.filter((c) => c.body.startsWith(MARKER)).length, 1);
});

test("a marker in someone else's comment is never edited or deleted", async () => {
  const human = { user: { login: "someone" }, body: `${MARKER}\nquoted by a human` };
  const { api, state } = fakeGitHub({ comments: [human] });
  await publish({ api, ...env(await makeArtifact()) });
  assert.ok(state.comments.some((c) => c.user.login === "someone" && c.body.endsWith("quoted by a human")));
  assert.equal(state.comments.length, 2);
});

test("a run for a superseded head SHA publishes nothing", async () => {
  const { api, state } = fakeGitHub({ prs: [{ number: 7, head: OTHER_HEAD }] });
  const result = await publish({ api, ...env(await makeArtifact()) });
  assert.equal(result.outcome, "skipped");
  assert.equal(state.comments.length, 0);
  assert.equal(state.ref, null);
});

test("an older run never overwrites a newer run's comment", async () => {
  const { api, state } = fakeGitHub();
  await publish({ api, ...env(await makeArtifact(), { runId: 900 }) });
  const result = await publish({ api, ...env(await makeArtifact(), { runId: 800 }) });
  assert.equal(result.outcome, "skipped");
  assert.ok(state.comments[0].body.includes("/900-1/"));
});

test("a fork PR is matched by head repository as well as SHA", async () => {
  const { api, state } = fakeGitHub({ prs: [{ number: 3, head: HEAD, headRepo: "someone/site" }, { number: 4, head: HEAD, headRepo: "other/site" }] });
  await publish({ api, ...env(await makeArtifact(), { headRepository: "someone/site" }) });
  assert.ok(state.calls.includes(`POST /repos/${REPO}/issues/3/comments`));
});

test("a failed capture run replaces earlier screenshots with an explicit no-evidence notice", async () => {
  const { api, state } = fakeGitHub({ comments: [{ body: `${MARKER}\n<!-- visual-review:state run=1 attempt=1 -->\nold screenshots ![x](y)` }] });
  const result = await publish({ api, ...env(null, { conclusion: "failure" }) });
  assert.equal(result.outcome, "unavailable");
  const body = state.comments[0].body;
  assert.match(body, /No screenshots/);
  assert.doesNotMatch(body, /<img|!\[/);
  assert.equal(state.statuses.at(-1).state, "error");
});

test("a publishing failure is reported as a failure, never as posted evidence", async () => {
  const { api, state } = fakeGitHub({ failOn: (method, path) => method === "POST" && path.endsWith("/git/commits") });
  await assert.rejects(publish({ api, ...env(await makeArtifact()) }), /injected failure/);
  const body = state.comments[0].body;
  assert.match(body, /could not be published/);
  assert.doesNotMatch(body, /<img/);
  assert.equal(state.statuses.at(-1).state, "failure");
});

test("a successful publish sets a success status on the PR head SHA", async () => {
  const { api, state } = fakeGitHub();
  await publish({ api, ...env(await makeArtifact()) });
  const status = state.statuses.at(-1);
  assert.equal(status.sha, HEAD);
  assert.equal(status.state, "success");
  assert.match(status.description, /1 changed/);
  assert.ok(status.description.length <= 140);
});

test("a concurrent assets-branch update is retried, not lost", async () => {
  let raced = false;
  const { api, state } = fakeGitHub({
    failOn: (method, path, s) => {
      // Another publisher moves the branch between our read and our update.
      if (!raced && method === "PATCH" && path.endsWith(`/git/refs/heads/${ASSETS_BRANCH}`)) {
        raced = true;
        const sha = `c${"9".repeat(39)}`;
        s.trees.set("tother", [{ path: "pr-99/x/1-1/head/a--1x1.png", type: "blob", sha: "bx" }]);
        s.commits.set(sha, { tree: "tother", parents: [s.ref] });
        s.ref = sha;
      }
      return false;
    },
  });
  await publish({ api, ...env(await makeArtifact()) });
  await publish({ api, ...env(await makeArtifact(), { runId: 700 }) });
  assert.ok(raced);
  assert.ok(filesAt(state).includes("pr-99/x/1-1/head/a--1x1.png"));
  assert.ok(filesAt(state).some((path) => path.startsWith(`pr-7/${HEAD}/700-1/`)));
});

test("untrusted text cannot mention users, inject HTML, or add images", () => {
  const body = renderComment({
    repository: REPO, headSha: HEAD, runId: 1, runAttempt: 1, runUrl: "https://x",
    results: { args: { mode: "compare", theme: "dark", "base-sha": "" }, plan: { coverage: "partial", notes: ["ping @octocat <img src=x onerror=alert(1)> ![t](https://evil/x.png)"], unreviewed: [] }, fatal: null, pairs: [] },
    urls: new Map(),
  });
  assert.doesNotMatch(body, /@octocat/);
  assert.doesNotMatch(body, /<img src=x/);
  assert.doesNotMatch(body, /!\[t\]\(/);
});

test("artifact validation rejects paths outside the artifact", async () => {
  const dir = await makeArtifact({ tamper: (results) => { results.pairs[0].head.file = "../../etc/passwd"; } });
  await assert.rejects(loadArtifact(dir), /file/);
});

test("artifact validation rejects images that do not match their recorded hash", async () => {
  const dir = await makeArtifact();
  await writeFile(join(dir, "head/projects--1440x900.png"), png("swapped"));
  await assert.rejects(loadArtifact(dir), /hash/);
});

test("artifact validation rejects symlinks and non-PNG files", async () => {
  const linked = await makeArtifact();
  await writeFile(join(linked, "secret.png"), png("x"));
  const { rm } = await import("node:fs/promises");
  await rm(join(linked, "diff/projects--1440x900.png"));
  await symlink(join(linked, "secret.png"), join(linked, "diff/projects--1440x900.png"));
  await assert.rejects(loadArtifact(linked), /regular file/);

  const text = await makeArtifact();
  await writeFile(join(text, "diff/projects--1440x900.png"), "not a png");
  await assert.rejects(loadArtifact(text), /PNG/);
});

test("artifact validation rejects unknown verdicts and malformed routes", async () => {
  await assert.rejects(loadArtifact(await makeArtifact({ tamper: (r) => { r.pairs[0].verdict = "fine"; } })), /verdict/);
  await assert.rejects(loadArtifact(await makeArtifact({ tamper: (r) => { r.pairs[0].route = "/x) ![a](b"; } })), /route/);
});

test("an invalid artifact is reported as unavailable, not published", async () => {
  const { api, state } = fakeGitHub();
  const dir = await makeArtifact({ tamper: (r) => { r.pairs[0].verdict = "fine"; } });
  const result = await publish({ api, ...env(dir) });
  assert.equal(result.outcome, "unavailable");
  assert.match(state.comments[0].body, /No screenshots/);
  assert.equal(state.ref, null);
});

test("a run that needed no screenshots says so for its head SHA", async () => {
  const { api, state } = fakeGitHub();
  const result = await publish({ api, ...env(await makeArtifact({ pairs: [] })) });
  assert.equal(result.outcome, "published");
  assert.match(state.comments[0].body, /No route needed a screenshot/);
  assert.equal(state.ref, null);
});
