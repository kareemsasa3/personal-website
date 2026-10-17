// Publishes a Visual Review run's screenshots into its pull request's
// Conversation tab. Runs from .github/workflows/visual-review-publish.yml on
// workflow_run, so it is always the default branch's code; the artifact it reads
// was produced by pull request code and is validated as untrusted data.
//
// Images go to the visual-review-assets branch through the Git Data API and are
// referenced by commit SHA, so a comment's images can never change after it is
// written. One bot comment per PR is edited in place; it always names the PR
// head SHA its screenshots belong to, and is replaced with an explicit notice
// when a run produces no evidence or publishing fails.
//
// node scripts/visual-review-publish.mjs   (configured through environment; see readEnvironment)
import { createHash } from "node:crypto";
import { appendFile, lstat, readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const MARKER = "<!-- visual-review:comment -->";
export const ASSETS_BRANCH = "visual-review-assets";
const BOT_LOGIN = "github-actions[bot]";
const STATUS_CONTEXT = "Visual review / screenshots";
const MAX_CAPTURE_HEIGHT = 4000;

// Artifact limits. The capture workflow produces at most 6 routes x 2 viewports.
const MAX_RESULTS_BYTES = 5 * 1024 * 1024;
const MAX_PAIRS = 50;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_BYTES = 120 * 1024 * 1024;
const MAX_IMAGE_WIDTH = 4096;
const MAX_IMAGE_HEIGHT = 16384;

const VERDICTS = new Set(["changed", "unchanged", "unverified-below-clip", "missing-in-base", "missing-in-head", "missing-both", "runtime-error", "capture-failed"]);
// Pairs whose images are worth looking at; identical pairs are listed, not uploaded.
const PUBLISHED_VERDICTS = new Set(["changed", "missing-in-base", "missing-in-head", "missing-both", "runtime-error", "capture-failed"]);
const ROUTE = /^\/[A-Za-z0-9/_-]{0,120}$/;
const VIEWPORT = /^(desktop|mobile) \d{2,4}x\d{2,4}$/;
const PAIR_ID = /^[A-Za-z0-9_-]{1,160}--\d{2,4}x\d{2,4}$/;
const SHA = /^[0-9a-f]{40}$/;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const fail = (message) => {
  throw new Error(`Invalid visual-review artifact: ${message}`);
};

// Reads and validates results.json plus every image that will be published.
export async function loadArtifact(dir) {
  const root = resolve(dir);
  const readChecked = async (relative, maxBytes) => {
    const path = resolve(root, relative);
    if (!path.startsWith(root + sep)) fail(`file ${relative} is outside the artifact`);
    const info = await lstat(path).catch(() => fail(`file ${relative} is missing`));
    if (!info.isFile()) fail(`file ${relative} is not a regular file`);
    if (info.size > maxBytes) fail(`file ${relative} is larger than ${maxBytes} bytes`);
    return readFile(path);
  };

  let results;
  try {
    results = JSON.parse(await readChecked("results.json", MAX_RESULTS_BYTES));
  } catch (error) {
    fail(`results.json could not be read (${error.message})`);
  }
  const { args, plan, pairs, fatal } = results ?? {};
  if (!args || !plan || !Array.isArray(pairs)) fail("results.json is missing args, plan, or pairs");
  if (!["compare", "same-revision"].includes(args.mode)) fail("unknown mode");
  if (!["dark", "light"].includes(args.theme)) fail("unknown theme");
  if (args["base-sha"] && !SHA.test(args["base-sha"])) fail("malformed base SHA");
  if (!["complete", "partial", "explicit"].includes(plan.coverage)) fail("unknown coverage");
  if (!Array.isArray(plan.notes) || plan.notes.length > 30 || !plan.notes.every((note) => typeof note === "string")) fail("malformed notes");
  const unreviewed = plan.unreviewed ?? [];
  if (!Array.isArray(unreviewed) || !unreviewed.every((route) => typeof route === "string" && ROUTE.test(route))) fail("malformed unreviewed routes");
  if (fatal !== null && fatal !== undefined && typeof fatal !== "string") fail("malformed fatal");
  if (pairs.length > MAX_PAIRS) fail("too many pairs");

  const images = new Map();
  let total = 0;
  for (const [index, pair] of pairs.entries()) {
    const where = `pair ${index}`;
    if (typeof pair?.route !== "string" || !ROUTE.test(pair.route)) fail(`invalid route in ${where}`);
    if (typeof pair.viewport !== "string" || !VIEWPORT.test(pair.viewport)) fail(`invalid viewport in ${where}`);
    if (typeof pair.id !== "string" || !PAIR_ID.test(pair.id)) fail(`invalid id in ${where}`);
    if (!VERDICTS.has(pair.verdict)) fail(`unknown verdict in ${where}`);
    for (const name of ["base", "head"]) {
      const capture = pair[name];
      if (!capture || !["captured", "failed"].includes(capture.status)) fail(`invalid ${name} capture in ${where}`);
      if (capture.file !== null && !new RegExp(`^${name}/${pair.id}(\\.failed)?\\.png$`).test(capture.file)) fail(`invalid file path in ${where} ${name}`);
      if (capture.sha256 !== null && !/^[0-9a-f]{64}$/.test(capture.sha256)) fail(`invalid hash in ${where} ${name}`);
      if (!Number.isInteger(capture.height ?? 0) || typeof (capture.clipped ?? false) !== "boolean") fail(`invalid size in ${where} ${name}`);
    }
    if (pair.diff !== null && pair.diff !== undefined) {
      const { file, changedPixels, rows } = pair.diff;
      if (file !== `diff/${pair.id}.png`) fail(`invalid file path in ${where} diff`);
      if (!Number.isInteger(changedPixels) || !Array.isArray(rows) || rows.length !== 2 || !rows.every(Number.isInteger)) fail(`invalid diff in ${where}`);
    }
    if (!PUBLISHED_VERDICTS.has(pair.verdict)) continue;

    const wanted = [
      [pair.base.file, pair.base.status === "captured" ? pair.base.sha256 : null],
      [pair.head.file, pair.head.status === "captured" ? pair.head.sha256 : null],
      [pair.diff?.file, null],
    ];
    for (const [file, expectedHash] of wanted) {
      if (!file || images.has(file)) continue;
      const bytes = await readChecked(file, MAX_IMAGE_BYTES);
      if (bytes.length < 24 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE) || bytes.toString("latin1", 12, 16) !== "IHDR") fail(`${file} is not a PNG`);
      if (bytes.readUInt32BE(16) > MAX_IMAGE_WIDTH || bytes.readUInt32BE(20) > MAX_IMAGE_HEIGHT) fail(`${file} has oversized dimensions`);
      if (expectedHash && createHash("sha256").update(bytes).digest("hex") !== expectedHash) fail(`${file} does not match its recorded hash`);
      total += bytes.length;
      if (total > MAX_TOTAL_BYTES) fail("images exceed the total size limit");
      images.set(file, bytes);
    }
  }
  return { results: { args, plan: { ...plan, unreviewed }, pairs, fatal: fatal ?? null }, images };
}

// Untrusted text rendered as inert markdown: no HTML, no mentions, no links or images.
const plain = (text, max = 400) =>
  String(text)
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .slice(0, max)
    .replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c])
    .replace(/@/g, "@​")
    .replace(/([\\`*_[\]()!#|~:])/g, "\\$1");

const short = (sha) => sha.slice(0, 7);
const VERDICT_LABEL = { "unverified-below-clip": "unverified below clip" };
const label = (verdict) => VERDICT_LABEL[verdict] ?? verdict;
const stateLine = ({ runId, runAttempt, headSha }) => `<!-- visual-review:state run=${runId} attempt=${runAttempt} head=${headSha} -->`;

const header = ({ repository, headSha, runUrl }) =>
  `## Visual review\n\nScreenshots for PR head [\`${short(headSha)}\`](https://github.com/${repository}/commit/${headSha}) · [capture run](${runUrl})`;

const counts = (pairs) => {
  const count = (...verdicts) => pairs.filter((pair) => verdicts.includes(pair.verdict)).length;
  return {
    changed: count("changed"),
    unchanged: count("unchanged"),
    unverified: count("unverified-below-clip"),
    missing: count("missing-in-base", "missing-in-head", "missing-both"),
    runtime: count("runtime-error"),
    failed: count("capture-failed"),
  };
};

const pairNotes = (pair) => {
  const notes = [];
  for (const capture of [pair.base, pair.head]) {
    if (capture.status === "failed") notes.push(`${capture.side ?? "capture"} capture failed`);
    if (capture.errorBoundary) notes.push(`${capture.side} rendered the error boundary`);
    if (capture.errors?.length) notes.push(`${capture.side}: ${capture.errors.length} runtime error(s)`);
  }
  if (pair.base.clipped || pair.head.clipped) notes.push(`clipped at ${MAX_CAPTURE_HEIGHT}px; page ${pair.base.height}px base, ${pair.head.height}px head`);
  if (pair.head.overflowX > 0) notes.push(`head overflows horizontally by ${Number(pair.head.overflowX)}px`);
  return notes;
};

export function renderComment({ repository, headSha, runId, runAttempt, runUrl, results, urls }) {
  const { args, plan, pairs } = results;
  const c = counts(pairs);
  const lines = [
    MARKER,
    stateLine({ runId, runAttempt, headSha }),
    `${header({ repository, headSha, runUrl })} · base ${args["base-sha"] ? `\`${short(args["base-sha"])}\`` : "n/a"} · ${args.theme} theme`,
    "",
  ];
  if (!pairs.length) {
    lines.push(`No route needed a screenshot for this head. Coverage: **${plan.coverage}**`, "");
  } else {
    lines.push(
      `**${c.changed} changed · ${c.unchanged} unchanged · ${c.unverified} unverified below clip · ${c.missing} missing · ${c.runtime} runtime error · ${c.failed} capture failed** · Coverage: **${plan.coverage}**`,
      "",
    );
  }
  if (plan.unreviewed.length) lines.push(`**Not reviewed (route cap):** ${plan.unreviewed.map((route) => `\`${route}\``).join(" ")}`, "");
  if (plan.notes.length) lines.push("<details><summary>Coverage notes</summary>", "", ...plan.notes.map((note) => `- ${plain(note)}`), "", "</details>", "");

  const shown = pairs.filter((pair) => PUBLISHED_VERDICTS.has(pair.verdict));
  let route = null;
  for (const pair of shown) {
    if (pair.route !== route) {
      route = pair.route;
      lines.push(`#### \`${route}\``, "");
    }
    const detail = [pair.viewport, label(pair.verdict)];
    if (pair.diff) detail.push(`${pair.diff.changedPixels.toLocaleString("en-US")} px differ in rows ${pair.diff.rows[0]}–${pair.diff.rows[1]}`);
    const cell = (file, what) => {
      const url = file && urls.get(file);
      return url ? `<td><a href="${url}"><img src="${url}" alt="${pair.route} ${pair.viewport} ${what}" width="280"></a></td>` : "<td>No image.</td>";
    };
    const columns = [["Before (base)", pair.base.file, "before"], ["After (head)", pair.head.file, "after"]];
    if (pair.diff) columns.push(["Diff", pair.diff.file, "diff"]);
    const notes = pairNotes(pair);
    lines.push(
      "<details open>",
      `<summary>${detail.join(" · ")}</summary>`,
      "",
      ...(notes.length ? [notes.map((note) => plain(note)).join("; "), ""] : []),
      "<table>",
      `<tr>${columns.map(([title]) => `<th>${title}</th>`).join("")}</tr>`,
      `<tr>${columns.map(([, file, what]) => cell(file, what)).join("")}</tr>`,
      "</table>",
      "",
      "</details>",
      "",
    );
  }

  const quiet = pairs.filter((pair) => !PUBLISHED_VERDICTS.has(pair.verdict));
  if (quiet.length) {
    lines.push("#### Without visual differences", "", "| Route | Viewport | Result | Notes |", "| --- | --- | --- | --- |");
    for (const pair of quiet) lines.push(`| \`${pair.route}\` | ${pair.viewport} | ${label(pair.verdict)} | ${pairNotes(pair).map((note) => plain(note)).join("; ") || "–"} |`);
    lines.push("");
  }
  lines.push(`<sub>Replaced on every run. Images are stored on the \`${ASSETS_BRANCH}\` branch at a fixed commit.</sub>`);
  return `${lines.join("\n")}\n`;
}

export function renderUnavailable({ repository, headSha, runId, runAttempt, runUrl, reason, publishRunUrl }) {
  return [
    MARKER,
    stateLine({ runId, runAttempt, headSha }),
    header({ repository, headSha, runUrl }),
    "",
    `**No screenshots for this head.** ${plain(reason)}`,
    "",
    `Earlier screenshots were removed from this comment because they described a different run.${publishRunUrl ? ` [Publisher run](${publishRunUrl})` : ""}`,
    "",
  ].join("\n");
}

const statusDescription = (headSha, results) => {
  if (!results.pairs.length) return `${short(headSha)}: no route needed a screenshot`;
  const c = counts(results.pairs);
  const parts = [`${c.changed} changed`, `${c.unchanged} unchanged`];
  if (c.unverified) parts.push(`${c.unverified} unverified below clip`);
  if (c.missing + c.runtime + c.failed) parts.push(`${c.missing + c.runtime + c.failed} not compared`);
  return `${short(headSha)}: ${parts.join(", ")}; coverage ${results.plan.coverage}`.slice(0, 140);
};

const listAll = async (api, path) => {
  const items = [];
  for (let page = 1; ; page += 1) {
    const batch = await api("GET", `${path}${path.includes("?") ? "&" : "?"}per_page=100&page=${page}`);
    items.push(...batch);
    if (batch.length < 100) return items;
  }
};

async function findPullRequest(api, { repository, headSha, headRepository }) {
  const pulls = await listAll(api, `/repos/${repository}/pulls?state=open`);
  const matches = pulls.filter((pr) => pr.head?.sha === headSha && pr.head?.repo?.full_name === headRepository);
  return matches.length === 1 ? matches[0] : null;
}

const parseState = (body) => {
  const match = /<!-- visual-review:state run=(\d+) attempt=(\d+)/.exec(body ?? "");
  return match ? [Number(match[1]), Number(match[2])] : [0, 0];
};
const isNewer = ([run, attempt], [ourRun, ourAttempt]) => run > ourRun || (run === ourRun && attempt > ourAttempt);

async function ownComments(api, repository, number) {
  const comments = await listAll(api, `/repos/${repository}/issues/${number}/comments`);
  return comments.filter((comment) => comment.user?.login === BOT_LOGIN && comment.body?.startsWith(MARKER));
}

// Edits the oldest visual-review comment in place and removes duplicates. Returns
// null without writing when a newer run already owns the comment.
async function upsertComment(api, { repository, number, body, run }) {
  const existing = (await ownComments(api, repository, number)).sort((a, b) => a.id - b.id);
  if (existing.some((comment) => isNewer(parseState(comment.body), run))) return null;
  if (!existing.length) return api("POST", `/repos/${repository}/issues/${number}/comments`, { body });
  const [keep, ...duplicates] = existing;
  const updated = await api("PATCH", `/repos/${repository}/issues/comments/${keep.id}`, { body });
  for (const duplicate of duplicates) await api("DELETE", `/repos/${repository}/issues/comments/${duplicate.id}`);
  return updated;
}

// Commits the images to the assets branch, replacing this PR's earlier images in
// the tree. The ref update is a fast-forward only, so concurrent publishers retry
// instead of overwriting each other.
async function uploadAssets(api, { repository, number, headSha, runId, runAttempt, images }) {
  const dir = `pr-${number}/${headSha}/${runId}-${runAttempt}`;
  const blobs = [];
  for (const [file, bytes] of images) {
    const { sha } = await api("POST", `/repos/${repository}/git/blobs`, { content: bytes.toString("base64"), encoding: "base64" });
    blobs.push({ path: `${dir}/${file}`, mode: "100644", type: "blob", sha });
  }
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    let parent = null;
    let baseTree = null;
    try {
      parent = (await api("GET", `/repos/${repository}/git/ref/heads/${ASSETS_BRANCH}`)).object.sha;
      baseTree = (await api("GET", `/repos/${repository}/git/commits/${parent}`)).tree.sha;
    } catch (error) {
      if (error.status !== 404) throw error;
    }
    let stale = [];
    if (baseTree) {
      const tree = await api("GET", `/repos/${repository}/git/trees/${baseTree}?recursive=1`);
      if (tree.truncated) throw new Error(`${ASSETS_BRANCH} tree is too large to list; prune the branch`);
      stale = tree.tree.filter((entry) => entry.type === "blob" && entry.path.startsWith(`pr-${number}/`));
    }
    const entries = [...stale.map((entry) => ({ path: entry.path, mode: "100644", type: "blob", sha: null })), ...blobs];
    const tree = await api("POST", `/repos/${repository}/git/trees`, { ...(baseTree ? { base_tree: baseTree } : {}), tree: entries });
    const commit = await api("POST", `/repos/${repository}/git/commits`, {
      message: `visual-review: PR #${number} at ${short(headSha)} (run ${runId}-${runAttempt})`,
      tree: tree.sha,
      parents: parent ? [parent] : [],
    });
    try {
      if (parent) await api("PATCH", `/repos/${repository}/git/refs/heads/${ASSETS_BRANCH}`, { sha: commit.sha, force: false });
      else await api("POST", `/repos/${repository}/git/refs`, { ref: `refs/heads/${ASSETS_BRANCH}`, sha: commit.sha });
    } catch (error) {
      if (error.status === 422 && attempt < 5) continue;
      throw error;
    }
    const urls = new Map([...images.keys()].map((file) => [file, `https://raw.githubusercontent.com/${repository}/${commit.sha}/${dir}/${file}`]));
    return { commitSha: commit.sha, urls };
  }
  throw new Error(`could not update ${ASSETS_BRANCH} after 5 attempts`);
}

const setStatus = (api, { repository, headSha, state, description, targetUrl }) =>
  api("POST", `/repos/${repository}/statuses/${headSha}`, { state, description: description.slice(0, 140), context: STATUS_CONTEXT, target_url: targetUrl });

// Returns { outcome: "published" | "unavailable" | "skipped", ... }. Throws after
// reporting when publishing fails, so the publisher run fails visibly.
export async function publish({ api, repository, runId, runAttempt, conclusion, headSha, headRepository, runUrl, publishRunUrl, artifactDir }) {
  const run = [runId, runAttempt];
  const context = { repository, headSha, runId, runAttempt, runUrl };
  const pr = await findPullRequest(api, { repository, headSha, headRepository });
  if (!pr) return { outcome: "skipped", reason: `no open pull request has head ${headSha} from ${headRepository}` };
  const number = pr.number;
  if ((await ownComments(api, repository, number)).some((comment) => isNewer(parseState(comment.body), run))) {
    return { outcome: "skipped", reason: "a newer run already published to this pull request" };
  }

  let loaded = null;
  let reason = null;
  if (conclusion !== "success") reason = `The capture run concluded ${conclusion}.`;
  else if (!artifactDir) reason = "The capture run uploaded no results.";
  else {
    try {
      loaded = await loadArtifact(artifactDir);
      if (loaded.results.fatal) reason = `The capture harness failed: ${loaded.results.fatal}`;
    } catch (error) {
      reason = error.message;
    }
  }
  if (reason) {
    const comment = await upsertComment(api, { repository, number, run, body: renderUnavailable({ ...context, reason }) });
    if (!comment) return { outcome: "skipped", reason: "a newer run already published to this pull request" };
    await setStatus(api, { repository, headSha, state: "error", description: `${short(headSha)}: no screenshots; ${reason}`, targetUrl: comment.html_url ?? runUrl });
    return { outcome: "unavailable", reason, number };
  }

  try {
    const { results, images } = loaded;
    const urls = images.size ? (await uploadAssets(api, { repository, number, headSha, runId, runAttempt, images })).urls : new Map();
    const current = await api("GET", `/repos/${repository}/pulls/${number}`);
    if (current.head?.sha !== headSha) return { outcome: "skipped", reason: `pull request head moved to ${current.head?.sha}` };
    const comment = await upsertComment(api, { repository, number, run, body: renderComment({ ...context, results, urls }) });
    if (!comment) return { outcome: "skipped", reason: "a newer run already published to this pull request" };
    await setStatus(api, { repository, headSha, state: "success", description: statusDescription(headSha, results), targetUrl: comment.html_url ?? runUrl });
    return { outcome: "published", number, images: images.size };
  } catch (error) {
    const reason = `Screenshots could not be published: ${error.message.split("\n")[0]}`;
    // Best effort: the run still fails below even if these reports cannot be written.
    await upsertComment(api, { repository, number, run, body: renderUnavailable({ ...context, reason, publishRunUrl }) }).catch(() => {});
    await setStatus(api, { repository, headSha, state: "failure", description: `${short(headSha)}: screenshots could not be published`, targetUrl: publishRunUrl ?? runUrl }).catch(() => {});
    throw error;
  }
}

export const createApi =
  ({ token, baseUrl = "https://api.github.com" }) =>
  async (method, path, body) => {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
        "user-agent": "visual-review-publish",
        ...(body ? { "content-type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw Object.assign(new Error(`${method} ${path.split("?")[0]} failed with ${response.status}: ${text.slice(0, 200)}`), { status: response.status });
    }
    return response.status === 204 ? null : response.json();
  };

function readEnvironment(env) {
  const need = (name, pattern) => {
    const value = env[name] ?? "";
    if (!pattern.test(value)) throw new Error(`${name} is missing or malformed`);
    return value;
  };
  return {
    token: need("GITHUB_TOKEN", /^\S+$/),
    repository: need("REPOSITORY", /^[\w.-]+\/[\w.-]+$/),
    runId: Number(need("RUN_ID", /^\d+$/)),
    runAttempt: Number(need("RUN_ATTEMPT", /^\d+$/)),
    conclusion: need("RUN_CONCLUSION", /^[a-z_]+$/),
    headSha: need("HEAD_SHA", SHA),
    headRepository: need("HEAD_REPOSITORY", /^[\w.-]+\/[\w.-]+$/),
    runUrl: need("RUN_URL", /^https:\/\/github\.com\/\S+$/),
    publishRunUrl: need("PUBLISH_RUN_URL", /^https:\/\/github\.com\/\S+$/),
    artifactDir: env.ARTIFACT_DOWNLOADED === "true" ? need("ARTIFACT_DIR", /^\S+$/) : null,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { token, ...options } = readEnvironment(process.env);
  const summary = (text) => (process.env.GITHUB_STEP_SUMMARY ? appendFile(process.env.GITHUB_STEP_SUMMARY, `${text}\n`) : undefined);
  try {
    const result = await publish({ api: createApi({ token }), ...options });
    console.log(JSON.stringify(result));
    await summary(`## Visual review publish\n\n${result.outcome}${result.number ? ` to #${result.number}` : ""}${result.reason ? `: ${result.reason}` : ""}`);
    if (result.outcome !== "published") console.log(`::notice title=Visual review publish::${result.outcome}: ${result.reason}`);
  } catch (error) {
    console.error(error);
    console.log(`::error title=Visual review publish::Screenshots were not published: ${error.message.split("\n")[0]}`);
    await summary(`## Visual review publish\n\n**Failed:** screenshots were not published. ${error.message.split("\n")[0]}`);
    process.exit(1);
  }
}
