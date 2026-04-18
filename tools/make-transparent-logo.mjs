/**
 * One-off: place a PNG at public/images/logo-source.png, then run:
 *   node tools/make-transparent-logo.mjs
 * Writes public/images/logo.png with the flat black canvas removed (alpha).
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const input = path.join(root, "public", "images", "logo-source.png");
const output = path.join(root, "public", "images", "logo.png");

if (!fs.existsSync(input)) {
  console.error("Missing public/images/logo-source.png — add your export, then re-run.");
  process.exit(1);
}

const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;
const px = new Uint8ClampedArray(data);
const ch = channels;

for (let i = 0; i < px.length; i += ch) {
  const r = px[i];
  const g = px[i + 1];
  const b = px[i + 2];
  const max = Math.max(r, g, b);
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;

  const hasGlow = b > r + 8 || b > g + 8;

  if (hasGlow) continue;

  if (max < 18 && lum < 16) {
    px[i + 3] = 0;
  } else if (max < 32 && lum < 24) {
    const t = (lum - 10) / 14;
    px[i + 3] = Math.round(Math.min(255, Math.max(0, t * 255)));
  }
}

await sharp(Buffer.from(px), {
  raw: { width, height, channels: ch },
})
  .png({ compressionLevel: 9 })
  .toFile(output);

console.log("Wrote", output);
