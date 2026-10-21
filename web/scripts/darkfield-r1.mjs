// web/scripts/darkfield-r1.mjs: the C2PA strip applied to registered R1 files before they ship (precedent 92fc157).
// PNG: drop every caBX chunk, keep all other chunks in order. SVG: drop the c2pa namespace attribute and the
// <metadata> element. Nothing else changes, so the stripped bytes are a pure function of the canonical bytes.
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
export const pngChunks = (bytes) => {
  if (!bytes.subarray(0, 8).equals(PNG)) throw new Error("not a PNG");
  const chunks = [];
  for (let i = 8; i < bytes.length; ) {
    const end = i + 12 + bytes.readUInt32BE(i);
    if (end > bytes.length) throw new Error("truncated PNG chunk");
    chunks.push({ type: bytes.toString("latin1", i + 4, i + 8), raw: bytes.subarray(i, end) });
    i = end;
  }
  return chunks;
};
export const stripC2pa = (bytes, path) => {
  if (path.endsWith(".png")) return Buffer.concat([PNG, ...pngChunks(bytes).filter((c) => c.type !== "caBX").map((c) => c.raw)]);
  if (path.endsWith(".svg")) return Buffer.from(bytes.toString("utf8").replace(' xmlns:c2pa="http://c2pa.org/manifest"', "").replace(/<metadata>[\s\S]*?<\/metadata>/, ""), "utf8");
  throw new Error(`${path}: no strip defined`);
};
