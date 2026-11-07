// Checks who can start a production deploy, and what it deploys, by evaluating the
// deploy job's own `if:` and `with:` expressions from .github/workflows/deploy.yml
// against representative event payloads.
// Run after `npm ci` in web/ (js-yaml comes from there):
//   node infrastructure/tests/deploy-workflow.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const root = new URL("../../", import.meta.url);
const yaml = createRequire(new URL("web/package.json", root))("js-yaml");
const read = (path) => readFileSync(new URL(path, root), "utf8");

const workflow = yaml.load(read(".github/workflows/deploy.yml"));
const action = yaml.load(read(".github/actions/ssh-deploy/action.yml"));
const job = workflow.jobs.deploy;
const deployStep = job.steps.find((step) => step.uses === "./.github/actions/ssh-deploy");

// Evaluates the subset of GitHub expression syntax these fields use: context
// paths, single-quoted strings, ==, !=, &&, || and parentheses. Anything else fails
// the test rather than being evaluated loosely.
const evaluate = (expression, contexts) => {
  const body = expression.trim().replace(/^\$\{\{([\s\S]*)\}\}$/, "$1");
  const allowed = /^(\s+|\(|\)|&&|\|\||==|!=|'[^']*'|(github|inputs)(\.[A-Za-z_][A-Za-z0-9_-]*)+)+$/;
  assert.match(body, allowed, `unsupported expression syntax: ${body}`);
  const js = body
    .replace(/==/g, "===")
    .replace(/!===/g, "!==")
    .replace(/\b(github|inputs)((?:\.[A-Za-z_][A-Za-z0-9_-]*)+)/g, (_, ctx, path) =>
      `${ctx}${path.replace(/\./g, "?.")}`
    );
  return new Function("github", "inputs", `return (${js});`)(contexts.github, contexts.inputs ?? {});
};

const repository = "kareemsasa3/personal-website";
const headSha = "f865e919dcece537595fb42e3a8dad69dde29b0d";
const workflowRun = (overrides) => ({
  github: {
    event_name: "workflow_run",
    repository,
    ref: "refs/heads/main",
    event: {
      workflow_run: {
        conclusion: "success",
        event: "push",
        head_branch: "main",
        head_sha: headSha,
        head_repository: { full_name: repository },
        ...overrides,
      },
    },
  },
});
const dispatch = (ref, inputs) => ({
  github: { event_name: "workflow_dispatch", repository, ref, event: {} },
  inputs,
});
const runs = (contexts) => Boolean(evaluate(job.if, contexts));

test("a successful push build on main in this repository deploys its own commit", () => {
  const contexts = workflowRun({});
  assert.equal(runs(contexts), true);
  assert.equal(evaluate(deployStep.with.sha, contexts), headSha);
  assert.equal(evaluate(deployStep.with.expected_digest, contexts), "");
});

test("builds that are not trusted pushes to main never deploy", () => {
  const cases = {
    "fork pull request from a branch named main": {
      event: "pull_request",
      head_repository: { full_name: "someone/personal-website" },
    },
    "same-repository pull request": { event: "pull_request", head_branch: "feature" },
    "push from another repository": { head_repository: { full_name: "someone/personal-website" } },
    "push to another branch": { head_branch: "fix/canonical-trailing-slash" },
    "failed build": { conclusion: "failure" },
    "cancelled build": { conclusion: "cancelled" },
    "pull_request_target build": { event: "pull_request_target" },
  };
  for (const [name, overrides] of Object.entries(cases)) {
    assert.equal(runs(workflowRun(overrides)), false, name);
  }
});

test("a manual dispatch on main deploys the selected release and digest", () => {
  const digest = "sha256:4230f431f3802bea55306f65c334f9e0b8de0bbdfae990352b8d963aaebaff07";
  const sha = "a16c70fefc1e577b3bdfdef102d961a4b775b017";
  const contexts = dispatch("refs/heads/main", { sha, expected_digest: digest });
  assert.equal(runs(contexts), true);
  assert.equal(evaluate(deployStep.with.sha, contexts), sha);
  assert.equal(evaluate(deployStep.with.expected_digest, contexts), digest);
});

test("a manual dispatch from any other ref does not deploy", () => {
  for (const ref of ["refs/heads/feature", "refs/tags/v1", "refs/pull/26/merge"]) {
    assert.equal(runs(dispatch(ref, { sha: headSha })), false, ref);
  }
});

test("only these two triggers exist, and dispatch requires a release SHA", () => {
  assert.deepEqual(Object.keys(workflow.on).sort(), ["workflow_dispatch", "workflow_run"]);
  assert.deepEqual(workflow.on.workflow_run.workflows, ["Build & Publish Images"]);
  assert.equal(workflow.on.workflow_dispatch.inputs.sha.required, true);
});

test("the deploy step passes inputs through the environment, not into the script text", () => {
  const step = action.runs.steps.find((s) => s.name === "Deploy over SSH");
  assert.ok(step, "Deploy over SSH step");
  assert.doesNotMatch(step.run, /\$\{\{/, "no expression interpolation inside the run script");
  assert.equal(step.env.SHA, "${{ inputs.sha }}");
  assert.equal(step.env.EXPECTED_DIGEST, "${{ inputs.expected_digest }}");
  assert.match(step.run, /bash -s"?\s*\\?\s*\n?\s*< infrastructure\/prod\/deploy-release\.sh/);
});

test("the deploy passes the pinned host key from its own secret", () => {
  assert.equal(deployStep.with.known_hosts, "${{ secrets.PROD_SSH_KNOWN_HOSTS }}");
  assert.equal(action.inputs.known_hosts.required, true);
  const configure = action.runs.steps.find((s) => s.name === "Configure SSH");
  assert.equal(configure.env.KNOWN_HOSTS_RAW, "${{ inputs.known_hosts }}");
  assert.doesNotMatch(configure.run, /inputs\.known_hosts/, "the multi-line secret is never spliced into the script");
});

test("every SSH connection verifies the host key against the pinned file only", () => {
  const text = read(".github/actions/ssh-deploy/action.yml");
  assert.doesNotMatch(text, /StrictHostKeyChecking=(no|accept-new|off)/i);
  assert.doesNotMatch(text, /UserKnownHostsFile=\/dev\/null/);
  assert.doesNotMatch(text, /ssh-keyscan/, "the host key never comes from the network at deploy time");

  const scripts = action.runs.steps.map((s) => s.run ?? "").join("\n");
  const optionSets = [...scripts.matchAll(/^\s*SSH_OPTS="([^"]*)"/gm)].map((m) => m[1]);
  assert.equal(optionSets.length, 2, "one option set for the sync and one for the deploy");
  for (const opts of optionSets) {
    assert.match(opts, /-o StrictHostKeyChecking=yes(\s|$)/);
    assert.match(opts, /-o UserKnownHostsFile=~\/\.ssh\/deploy_known_hosts(\s|$)/);
    assert.match(opts, /-o GlobalKnownHostsFile=\/dev\/null(\s|$)/);
    assert.match(opts, /-o KnownHostsCommand=none(\s|$)/);
    assert.match(opts, /-o VerifyHostKeyDNS=no(\s|$)/);
    assert.match(opts, /-o UpdateHostKeys=no(\s|$)/);
  }

  // Every ssh command starts its own line (the sync's follows a `tar ... | \`).
  const sshCalls = scripts.split("\n").map((line) => line.trim()).filter((line) => /(^|[|;&]\s*)ssh\s/.test(line));
  assert.equal(sshCalls.length, 3, "the sync, deploy and diagnostics SSH calls");
  for (const call of sshCalls) {
    assert.match(call, /ssh (-\S+ )*\$SSH_OPTS /, `SSH call without the verified options: ${call}`);
  }
});

test("the production health check goes through the public URL, never the origin IP", () => {
  const step = job.steps.find((s) => s.name === "Verify production health");
  assert.ok(step, "Verify production health step");
  assert.doesNotMatch(JSON.stringify(step), /PROD_ORIGIN_IP|--resolve/);
  assert.match(step.run, /curl -fsS -m 10 "https:\/\/\$DOMAIN\/health"/);
});

test("rendered compose configuration, which holds secrets, is never uploaded", () => {
  const text = read(".github/actions/ssh-deploy/action.yml");
  assert.doesNotMatch(text, /upload-artifact/);
  assert.doesNotMatch(text, /compose\.rendered/);
});
