/**
 * Removes sparkle / wing marks at the bottom of the shield by cloning from above.
 * node tools/remove-logo-sparkles.mjs
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const inputPath = path.join(root, "public", "images", "logo.png");
const backupPath = path.join(root, "public", "images", "logo.before-sparkle-removal.png");

if (!fs.existsSync(inputPath)) {
  console.error("Missing public/images/logo.png");
  process.exit(1);
}

const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h, channels: ch } = info;
const px = new Uint8ClampedArray(data);
const idx = (x, y) => (y * w + x) * ch;

let minX = w,
  minY = h,
  maxX = 0,
  maxY = 0;
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const o = idx(x, y);
    if (px[o + 3] < 25) continue;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
}

const bh = maxY - minY + 1;
const bw = maxX - minX + 1;
const xPad = Math.floor(bw * 0.1);
const x0 = minX + xPad;
const x1 = maxX - xPad;

const yBand = minY + Math.floor(bh * 0.82);
const yTip = minY + Math.floor(bh * 0.9);

function isChromeBorder(r, g, b) {
  const l = lum(r, g, b);
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  if (b > r + 18) return false;
  if (mx - mn < 10 && l > 200) return false;
  return l > 175 && mx > 182 && mx - mn < 42;
}

function isVeryDarkInterior(r, g, b) {
  return lum(r, g, b) < 68 && Math.max(r, g, b) < 92;
}

function isSparkleOrAccent(r, g, b, a) {
  if (a < 35) return false;
  if (r > 248 && g > 248 && b > 248) return false;
  const l = lum(r, g, b);
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  if (b > 165 && b > r + 8 && l > 72) return true;
  if (l > 125 && l < 252 && mx - mn < 62 && mn > 88) return true;
  return false;
}

function sampleAbove(x, y) {
  const dys = [12, 16, 20, 24, 28, 32];
  let tr = 0,
    tg = 0,
    tb = 0,
    ta = 0,
    n = 0;
  for (const dy of dys) {
    const yy = y - dy;
    if (yy < minY) continue;
    const o = idx(x, yy);
    const a = px[o + 3];
    if (a < 35) continue;
    tr += px[o];
    tg += px[o + 1];
    tb += px[o + 2];
    ta += a;
    n++;
  }
  if (n === 0) return null;
  return {
    r: Math.round(tr / n),
    g: Math.round(tg / n),
    b: Math.round(tb / n),
    a: Math.round(ta / n),
  };
}

for (let y = yBand; y <= maxY; y++) {
  for (let x = x0; x <= x1; x++) {
    const o = idx(x, y);
    const r = px[o],
      g = px[o + 1],
      b = px[o + 2],
      a = px[o + 3];
    if (a < 35) continue;
    if (isChromeBorder(r, g, b)) continue;
    if (isVeryDarkInterior(r, g, b)) continue;

    const inTip = y >= yTip;
    const killAccent = isSparkleOrAccent(r, g, b, a);
    if (!inTip && !killAccent) continue;

    if (inTip && !killAccent && lum(r, g, b) < 105) continue;

    const s = sampleAbove(x, y);
    if (!s) continue;
    px[o] = s.r;
    px[o + 1] = s.g;
    px[o + 2] = s.b;
    px[o + 3] = s.a;
  }
}

if (!fs.existsSync(backupPath)) {
  fs.copyFileSync(inputPath, backupPath);
}

await sharp(Buffer.from(px), { raw: { width: w, height: h, channels: ch } })
  .png({ compressionLevel: 9 })
  .toFile(inputPath);

console.log("Updated", inputPath);
