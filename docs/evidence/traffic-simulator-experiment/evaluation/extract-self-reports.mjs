import { readFileSync, writeFileSync } from "node:fs";
const load = (f) => readFileSync(f, "utf8").trim().split("\n").map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
const text = (m) => { const c = m?.message?.content; if (typeof c === "string") return c; if (Array.isArray(c)) return c.filter((p) => p.type === "text").map((p) => p.text).join("\n"); return ""; };
// node extract-self-reports.mjs <simple-transcript.jsonl> <detailed-transcript.jsonl> <out.md>
// The transcripts are local and private. The published self-reports.md is this script's output
// with the redactions listed in its header applied by hand afterwards.
const [simpleTranscript, detailedTranscript, outFile] = process.argv.slice(2);
const runs = [
  ["Simple", simpleTranscript, "worktree-traffic-sim-flow-model", "7420cc7"],
  ["Detailed", detailedTranscript, "worktree-traffic-simulator-b", "0e62d2c"],
];
let md = `# Prompts, timing, and closing reports\n\nExtracted from the two authoring sessions' local transcripts on 2026-10-05. The closing reports are **self-reports**: each agent's account of its own work. They are recorded here as evidence of what was claimed, not as validation. The transcripts themselves stay private.\n\n`;
for (const [name, file, branch, commit] of runs) {
  const L = load(file);
  const prompt = L.find((l) => l.type === "user" && text(l).includes("Implement the traffic simulator on my personal site"));
  const finals = L.filter((l) => l.type === "assistant" && !l.isSidechain && text(l).trim());
  const final = finals.at(-1);
  const models = [...new Set(L.filter((l) => l.type === "assistant" && !l.isSidechain).map((l) => l.message?.model).filter(Boolean))];
  const versions = [...new Set(L.map((l) => l.version).filter(Boolean))];
  const start = new Date(prompt.timestamp), end = new Date(final.timestamp);
  const s = Math.round((end - start) / 1000);
  let p = text(prompt).replace(/<\/?pasted_content[^>]*>/g, "").trim();
  md += `## ${name} prompt run\n\n- Branch: \`${branch}\`, final commit \`${commit}\`\n- Model (main thread): ${models.join(", ")}; Claude Code ${versions.join(", ")}\n- Prompt submitted: ${prompt.timestamp}\n- Closing report: ${final.timestamp}\n- Elapsed: ${Math.floor(s / 60)} min ${s % 60} s\n\n### Prompt (as submitted)\n\n\`\`\`text\n${p}\n\`\`\`\n\n### Closing report (verbatim)\n\n${text(final).trim()}\n\n`;
}
writeFileSync(outFile, md);
