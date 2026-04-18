/**
 * Place PNG at public/images/logo-source.png, then:
 *   npm run build:logo
 * Removes flat white (or black) canvas touching the image edge via flood fill,
 * so interior shield art stays intact.
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
  console.error("Missing public/images/logo-source.png");
  process.exit(1);
}

const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h, channels: ch } = info;
const px = new Uint8ClampedArray(data);

const ii = (x, y) => y * w + x;
const oi = (k) => k * ch;

function isWhiteWalk(r, g, b) {
  return r >= 248 && g >= 248 && b >= 248;
}

function isWhiteFuzz(r, g, b) {
  const min = Math.min(r, g, b);
  const max = Math.max(r, g, b);
  return min >= 232 && max <= 255 && r + g + b >= 708;
}

function isBlackWalk(r, g, b) {
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return Math.max(r, g, b) < 28 && lum < 22;
}

function isBlackFuzz(r, g, b) {
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return Math.max(r, g, b) < 42 && lum < 32;
}

function floodClear(walk, fuzz) {
  const seen = new Uint8Array(w * h);
  const q = [];

  const tryPush = (x, y) => {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const k = ii(x, y);
    if (seen[k]) return;
    const o = oi(k);
    const r = px[o],
      g = px[o + 1],
      b = px[o + 2];
    if (!walk(r, g, b)) return;
    seen[k] = 1;
    q.push(k);
  };

  for (let x = 0; x < w; x++) {
    tryPush(x, 0);
    tryPush(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    tryPush(0, y);
    tryPush(w - 1, y);
  }

  while (q.length) {
    const k = q.pop();
    const x = k % w;
    const y = (k / w) | 0;
    const o = oi(k);
    px[o + 3] = 0;

    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx,
        ny = y + dy;
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      const nk = ii(nx, ny);
      if (seen[nk]) continue;
      const no = oi(nk);
      const r = px[no],
        g = px[no + 1],
        b = px[no + 2];
      if (walk(r, g, b) || fuzz(r, g, b)) {
        seen[nk] = 1;
        q.push(nk);
      }
    }
  }
}

floodClear(isWhiteWalk, isWhiteFuzz);
floodClear(isBlackWalk, isBlackFuzz);

await sharp(Buffer.from(px), {
  raw: { width: w, height: h, channels: ch },
})
  .png({ compressionLevel: 9 })
  .toFile(output);

console.log("Wrote", output);
