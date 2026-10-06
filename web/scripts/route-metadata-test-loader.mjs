// Scoped TypeScript loader for the route metadata tests (Node 20.6+).
// Transpiles only src/data with the repository's TypeScript compiler and resolves its
// extensionless relative imports; never loads React or a DOM.
import { register } from "node:module";
import { isMainThread } from "node:worker_threads";
import { access, readFile } from "node:fs/promises";
import ts from "typescript";
if (isMainThread) register(import.meta.url);
const dataRoot = new URL("../src/data/", import.meta.url).href;
export async function resolve(specifier, context, nextResolve) {
  if (
    context.parentURL?.startsWith(dataRoot) &&
    /^\.\.?\//.test(specifier) &&
    !specifier.endsWith(".ts")
  ) {
    const candidate = new URL(`${specifier}.ts`, context.parentURL);
    try {
      await access(candidate);
      return { url: candidate.href, shortCircuit: true };
    } catch {
      // Not a TypeScript module; fall through to the default resolver.
    }
  }
  return nextResolve(specifier, context);
}
export async function load(url, context, nextLoad) {
  if (url.startsWith(dataRoot) && url.endsWith(".ts")) {
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
