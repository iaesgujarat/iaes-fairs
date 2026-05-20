// scripts/generate-icons.mjs
// Generate the v17-P1 PWA icon set from the real IAES circular emblem
// master, using ONLY Node built-ins (zlib). No sharp/ImageMagick.
//
// Why hand-rolled: the project has no image tooling. Outsourcing to a
// generative AI tool produces a REDRAWN counterfeit (we saw it). The
// right primitive is *compositing* — placing the actual transparent PNG
// onto a background and downscaling pixel-accurately. That's what this
// does: decode the master, optional area-weighted box downscale, optional
// alpha-composite onto a solid bg, re-encode.
//
// Reads:  app/brand/IAES Circular Logo.png  (1700² RGBA, transparent)
// Writes: public/icons/{icon-192, icon-512, icon-maskable-512,
//                       apple-icon, favicon}.png
//
// Run:    node scripts/generate-icons.mjs

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

// ── CRC32 (PNG chunk CRC) ─────────────────────────────────────────
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++)
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ── PNG decode (colorType 6 RGBA, 8-bit, non-interlaced) ──────────
function decodePng(buf) {
  if (buf.slice(0, 8).toString("hex") !== "89504e470d0a1a0a") {
    throw new Error("not a PNG");
  }
  let p = 8;
  let w = 0, h = 0, bitDepth = 0, colorType = 0, interlace = 0;
  const idatChunks = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p); p += 4;
    const type = buf.slice(p, p + 4).toString("ascii"); p += 4;
    const data = buf.slice(p, p + len); p += len;
    p += 4; // skip CRC
    if (type === "IHDR") {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === "IDAT") {
      idatChunks.push(data);
    } else if (type === "IEND") {
      break;
    }
  }
  if (bitDepth !== 8)
    throw new Error(`unsupported bitDepth ${bitDepth} (need 8)`);
  if (colorType !== 6)
    throw new Error(`unsupported colorType ${colorType} (need 6 RGBA)`);
  if (interlace !== 0) throw new Error("interlaced PNG not supported");

  const raw = zlib.inflateSync(Buffer.concat(idatChunks));
  const bpp = 4;
  const stride = w * bpp;
  const out = Buffer.alloc(h * stride);
  const zeros = Buffer.alloc(stride);
  let rp = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[rp++];
    const prev = y === 0 ? zeros : out.slice((y - 1) * stride, y * stride);
    const dst = out.slice(y * stride, (y + 1) * stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? dst[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      let v;
      const x = raw[rp + i];
      switch (filter) {
        case 0: v = x; break;
        case 1: v = (x + a) & 0xff; break;
        case 2: v = (x + b) & 0xff; break;
        case 3: v = (x + ((a + b) >> 1)) & 0xff; break;
        case 4: {
          const p_ = a + b - c;
          const pa = Math.abs(p_ - a),
                pb = Math.abs(p_ - b),
                pc = Math.abs(p_ - c);
          const pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
          v = (x + pr) & 0xff;
          break;
        }
        default: throw new Error(`unknown filter ${filter}`);
      }
      dst[i] = v;
    }
    rp += stride;
  }
  return { w, h, pixels: out };
}

// ── Area-weighted box downscale w/ premultiplied alpha ────────────
function resize(src, srcW, srcH, dstW, dstH) {
  const dst = Buffer.alloc(dstW * dstH * 4);
  const xr = srcW / dstW;
  const yr = srcH / dstH;
  for (let oy = 0; oy < dstH; oy++) {
    const sy0 = oy * yr;
    const sy1 = (oy + 1) * yr;
    const iy0 = Math.floor(sy0);
    const iy1 = Math.min(srcH, Math.ceil(sy1));
    for (let ox = 0; ox < dstW; ox++) {
      const sx0 = ox * xr;
      const sx1 = (ox + 1) * xr;
      const ix0 = Math.floor(sx0);
      const ix1 = Math.min(srcW, Math.ceil(sx1));
      let R = 0, G = 0, B = 0, A = 0, W = 0;
      for (let sy = iy0; sy < iy1; sy++) {
        const yw = Math.min(sy + 1, sy1) - Math.max(sy, sy0);
        if (yw <= 0) continue;
        for (let sx = ix0; sx < ix1; sx++) {
          const xw = Math.min(sx + 1, sx1) - Math.max(sx, sx0);
          if (xw <= 0) continue;
          const w = xw * yw;
          const o = (sy * srcW + sx) * 4;
          const aSrc = src[o + 3];
          R += (src[o + 0] * aSrc * w) / 255;
          G += (src[o + 1] * aSrc * w) / 255;
          B += (src[o + 2] * aSrc * w) / 255;
          A += aSrc * w;
          W += w;
        }
      }
      const od = (oy * dstW + ox) * 4;
      if (W > 0 && A > 0) {
        const aAvg = A / W;
        dst[od + 0] = Math.round(((R / W) * 255) / aAvg);
        dst[od + 1] = Math.round(((G / W) * 255) / aAvg);
        dst[od + 2] = Math.round(((B / W) * 255) / aAvg);
        dst[od + 3] = Math.round(aAvg);
      } else {
        dst[od + 0] = 0; dst[od + 1] = 0; dst[od + 2] = 0; dst[od + 3] = 0;
      }
    }
  }
  return dst;
}

// ── Center-composite fg (RGBA) onto a solid-colour canvas ─────────
function compositeCenter(fg, fgW, fgH, dstW, dstH, bgR, bgG, bgB) {
  const dst = Buffer.alloc(dstW * dstH * 4);
  for (let i = 0; i < dstW * dstH; i++) {
    const o = i * 4;
    dst[o + 0] = bgR;
    dst[o + 1] = bgG;
    dst[o + 2] = bgB;
    dst[o + 3] = 255;
  }
  const offX = Math.floor((dstW - fgW) / 2);
  const offY = Math.floor((dstH - fgH) / 2);
  for (let y = 0; y < fgH; y++) {
    for (let x = 0; x < fgW; x++) {
      const fo = (y * fgW + x) * 4;
      const a = fg[fo + 3];
      if (a === 0) continue;
      const dox = offX + x, doy = offY + y;
      if (dox < 0 || doy < 0 || dox >= dstW || doy >= dstH) continue;
      const od = (doy * dstW + dox) * 4;
      const ia = 255 - a;
      dst[od + 0] = Math.round((fg[fo + 0] * a + dst[od + 0] * ia) / 255);
      dst[od + 1] = Math.round((fg[fo + 1] * a + dst[od + 1] * ia) / 255);
      dst[od + 2] = Math.round((fg[fo + 2] * a + dst[od + 2] * ia) / 255);
      dst[od + 3] = 255;
    }
  }
  return dst;
}

// ── PNG encode (colorType 6 RGBA, 8-bit, filter 0 None) ───────────
function encodePng(pixels, w, h) {
  const stride = w * 4;
  const raw = Buffer.alloc(h * (1 + stride));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + stride)] = 0; // filter None
    pixels.copy(raw, y * (1 + stride) + 1, y * stride, (y + 1) * stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    const typeB = Buffer.from(type, "ascii");
    const crcB = Buffer.alloc(4);
    crcB.writeUInt32BE(crc32(Buffer.concat([typeB, data])), 0);
    return Buffer.concat([len, typeB, data, crcB]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ── Main ───────────────────────────────────────────────────────────
const SRC = path.join("app", "brand", "IAES Circular Logo.png");
const OUT = path.join("public", "icons");
fs.mkdirSync(OUT, { recursive: true });

const t0 = Date.now();
console.log(`Decoding ${SRC}...`);
const src = decodePng(fs.readFileSync(SRC));
console.log(`  ${src.w}x${src.h} RGBA decoded in ${Date.now() - t0}ms`);

function gen(name, fn) {
  const t = Date.now();
  const buf = fn();
  const p = path.join(OUT, name);
  fs.writeFileSync(p, buf);
  console.log(`  wrote ${p} (${Math.round(buf.length / 1024)} KB, ${Date.now() - t}ms)`);
}

// 1. icon-192 — transparent, logo edge-to-edge
gen("icon-192.png", () => {
  const px = resize(src.pixels, src.w, src.h, 192, 192);
  return encodePng(px, 192, 192);
});

// 2. icon-512 — transparent, logo edge-to-edge
gen("icon-512.png", () => {
  const px = resize(src.pixels, src.w, src.h, 512, 512);
  return encodePng(px, 512, 512);
});

// 3. icon-maskable-512 — WHITE bg, logo within centre 80% (=410²).
//    Original spec was navy #0B2B5C, but the IAES emblem's navy
//    elements (star wings, "IAES" wordmark, ring outline, tagline)
//    vanish against a navy background — this logo was designed for
//    light backgrounds. Brand navy still lives in the PWA
//    theme_color (browser/install chrome). Android adaptive icons
//    crop to a shape and only guarantee the inner 80%, so we pre-pad
//    so the ring text is never clipped.
gen("icon-maskable-512.png", () => {
  const inner = Math.round(512 * 0.8); // 410
  const fg = resize(src.pixels, src.w, src.h, inner, inner);
  const px = compositeCenter(fg, inner, inner, 512, 512, 0xff, 0xff, 0xff);
  return encodePng(px, 512, 512);
});

// 4. apple-icon — 180×180 on solid WHITE (iOS home screen ignores
//    transparency → solid bg is required), logo at ~80%.
gen("apple-icon.png", () => {
  const inner = Math.round(180 * 0.8); // 144
  const fg = resize(src.pixels, src.w, src.h, inner, inner);
  const px = compositeCenter(fg, inner, inner, 180, 180, 0xff, 0xff, 0xff);
  return encodePng(px, 180, 180);
});

// 5. favicon — 48×48 transparent
gen("favicon.png", () => {
  const px = resize(src.pixels, src.w, src.h, 48, 48);
  return encodePng(px, 48, 48);
});

console.log(`Done in ${Date.now() - t0}ms.`);
