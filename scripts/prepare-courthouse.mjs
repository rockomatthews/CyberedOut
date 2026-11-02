// Adapt the supplied CC-BY scan for the browser, preserving embedded color maps.
import fs from "node:fs/promises";
import sharp from "sharp";
const [input, output = "public/models/bane-courthouse.glb"] =
  process.argv.slice(2);
if (!input)
  throw new Error(
    "Usage: node scripts/prepare-courthouse.mjs input.glb [output.glb]",
  );
const bytes = await fs.readFile(input);
const jsonLength = bytes.readUInt32LE(12);
const data = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
const bin = bytes.subarray(28 + jsonLength);
const images = new Map(data.images.map((image) => [image.bufferView, image]));
const chunks = [];
let offset = 0;
for (const [index, view] of data.bufferViews.entries()) {
  let chunk = bin.subarray(
    view.byteOffset || 0,
    (view.byteOffset || 0) + view.byteLength,
  );
  const image = images.get(index);
  if (image) {
    const color = data.materials.some(
      (m) =>
        m.extensions?.KHR_materials_pbrSpecularGlossiness?.diffuseTexture
          ?.index ===
        data.textures.findIndex((t) => t.source === data.images.indexOf(image)),
    );
    const pipeline = sharp(chunk).resize({
      width: color ? 2048 : 1024,
      height: color ? 2048 : 1024,
      fit: "inside",
      withoutEnlargement: true,
    });
    chunk = color
      ? await pipeline.jpeg({ quality: 88 }).toBuffer()
      : await pipeline.png().toBuffer();
    image.mimeType = color ? "image/jpeg" : "image/png";
  }
  view.byteOffset = offset;
  view.byteLength = chunk.length;
  const pad = Buffer.alloc((4 - (chunk.length % 4)) % 4);
  chunks.push(chunk, pad);
  offset += chunk.length + pad.length;
}
for (const material of data.materials) {
  const legacy = material.extensions?.KHR_materials_pbrSpecularGlossiness;
  if (legacy) {
    material.pbrMetallicRoughness = {
      baseColorFactor: legacy.diffuseFactor,
      baseColorTexture: legacy.diffuseTexture,
      metallicFactor: 0,
      roughnessFactor: 1 - legacy.glossinessFactor,
    };
    delete material.extensions.KHR_materials_pbrSpecularGlossiness;
    if (!Object.keys(material.extensions).length) delete material.extensions;
  }
}
for (const field of ["extensionsUsed", "extensionsRequired"])
  if (data[field])
    data[field] = data[field].filter(
      (x) => x !== "KHR_materials_pbrSpecularGlossiness",
    );
data.buffers[0].byteLength = offset;
const json = Buffer.from(JSON.stringify(data));
const jsonPad = Buffer.alloc((4 - (json.length % 4)) % 4, 32);
const packed = Buffer.concat(chunks);
const head = Buffer.alloc(20);
head.writeUInt32LE(0x46546c67, 0);
head.writeUInt32LE(2, 4);
head.writeUInt32LE(28 + json.length + jsonPad.length + packed.length, 8);
head.writeUInt32LE(json.length + jsonPad.length, 12);
head.writeUInt32LE(0x4e4f534a, 16);
const binHead = Buffer.alloc(8);
binHead.writeUInt32LE(packed.length, 0);
binHead.writeUInt32LE(0x004e4942, 4);
await fs.mkdir("public/models", { recursive: true });
await fs.writeFile(
  output,
  Buffer.concat([head, json, jsonPad, binHead, packed]),
);
console.log(`${output}: ${packed.length} binary bytes`);
