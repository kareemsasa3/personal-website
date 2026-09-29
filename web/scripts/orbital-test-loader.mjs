// Scoped TypeScript loader for the dependency-free Node test suite (Node 20.6+).
// Uses the repository's existing TypeScript compiler; never loads React or a DOM.
import { register } from "node:module";
import { isMainThread } from "node:worker_threads";
import { readFile } from "node:fs/promises";
import ts from "typescript";
if (isMainThread) register(import.meta.url);
const physicsRoot = new URL(
  "../src/components/OrbitalSimulator/physics/",
  import.meta.url,
).href;
const registryUrl = new URL("../src/data/simulationsData.ts", import.meta.url)
  .href;
export async function load(url, context, nextLoad) {
  if (
    url.endsWith(".ts") &&
    (url.startsWith(physicsRoot) || url === registryUrl)
  ) {
    const source = await readFile(new URL(url), "utf8");
    return {
      format: "module",
      shortCircuit: true,
      source: ts.transpileModule(source, {
        compilerOptions: {
          target: ts.ScriptTarget.ES2020,
          module: ts.ModuleKind.ESNext,
        },
      }).outputText,
    };
  }
  return nextLoad(url, context);
}
