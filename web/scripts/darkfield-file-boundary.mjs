// Keep Darkfield's local verification readers inside their authorized trees.
// Validate both the lexical path and the resolved target to reject traversal
// and symlinks that point outside the root. This does not sandbox a process.
import { realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";

export class FileBoundaryError extends Error {
  constructor() {
    super("path escapes authorized directory");
    this.name = "FileBoundaryError";
  }
}

const within = (root, target) => {
  const rel = relative(root, target);
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
};

export const confinedFile = async (root, requested) => {
  // The callers accept only repository-relative filenames, never absolute
  // paths or parent traversal (even when it would normalize back inside).
  if (typeof requested !== "string" || !requested || isAbsolute(requested) ||
      requested.split(/[\\/]/).includes("..")) {
    throw new FileBoundaryError();
  }

  const base = resolve(root);
  const candidate = resolve(base, requested);
  if (!within(base, candidate)) throw new FileBoundaryError();

  const [realBase, realCandidate] = await Promise.all([realpath(base), realpath(candidate)]);
  if (!within(realBase, realCandidate)) throw new FileBoundaryError();
  return realCandidate;
};
