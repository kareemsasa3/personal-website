// Shared path resolution for terminal commands that read bundled virtual-file
// content. Everything here operates on in-memory data only.

import type { FileSystemItem } from "../types/terminal";

export type VirtualFileLookup =
  | { status: "file"; path: string; content: string[] }
  | { status: "directory"; path: string }
  | { status: "missing"; path: string };

// Resolve an input path against the current virtual directory. Handles
// absolute paths, `.`, `..`, and repeated slashes; `..` never climbs above `/`.
export const resolveVirtualPath = (
  currentDirectory: string,
  input: string
): string => {
  const segments = input.startsWith("/")
    ? []
    : currentDirectory.split("/").filter(Boolean);

  for (const part of input.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      segments.pop();
      continue;
    }
    segments.push(part);
  }

  return "/" + segments.join("/");
};

// Find the virtual tree item at a normalized absolute path.
export const findVirtualItem = (
  fileSystem: FileSystemItem[],
  absolutePath: string
): FileSystemItem | null => {
  if (absolutePath === "/") {
    return {
      name: "/",
      type: "directory",
      permissions: "drwxr-xr-x",
      size: "0",
      date: "",
      children: fileSystem,
    };
  }

  let currentItems = fileSystem;
  let currentItem: FileSystemItem | null = null;

  for (const part of absolutePath.split("/").filter(Boolean)) {
    if (currentItem && currentItem.type !== "directory") return null;
    currentItem = currentItems.find((item) => item.name === part) || null;
    if (!currentItem) return null;
    currentItems = currentItem.children || [];
  }

  return currentItem;
};

// Resolve a command argument to a virtual file and its bundled content.
// Content keys are the absolute virtual path without the leading slash.
export const readVirtualFile = (
  fileSystem: FileSystemItem[],
  currentDirectory: string,
  input: string,
  getFileContent?: (path: string) => { content: string[] } | null
): VirtualFileLookup => {
  const path = resolveVirtualPath(currentDirectory, input);
  const item = findVirtualItem(fileSystem, path);

  if (!item) return { status: "missing", path };
  if (item.type === "directory") return { status: "directory", path };

  const fileContent = getFileContent ? getFileContent(path.slice(1)) : null;
  if (!fileContent) return { status: "missing", path };

  return { status: "file", path, content: fileContent.content };
};
