// Minimal pure-JS PNG encoder (RGB, no filtering) — lets the board render
// through RN's native image pipeline with zero native build deps.
import {deflate} from 'pako';

function crc32(buf: Uint8Array, start = 0, end = buf.length): number {
  let c = ~0;
  for (let i = start; i < end; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
  }
  return ~c >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) {
    out[4 + i] = type.charCodeAt(i);
  }
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out, 4, 8 + data.length));
  return out;
}

/** Encode width x height RGB buffer (row-major, 3 bytes/px) as base64 PNG. */
export function boardToPngBase64(
  rgb: Uint8Array,
  width: number,
  height: number,
): string {
  // PNG signature
  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  // IHDR: w, h, bitdepth 8, color type 2 (RGB)
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, width);
  dv.setUint32(4, height);
  ihdr[8] = 8;
  ihdr[9] = 2;
  // raw scanlines with filter byte 0
  const raw = new Uint8Array(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    const ro = y * (1 + width * 3);
    raw[ro] = 0;
    raw.set(rgb.subarray(y * width * 3, (y + 1) * width * 3), ro + 1);
  }
  const idat = deflate(raw, {level: 6});
  const parts = [
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', new Uint8Array(0)),
  ];
  let len = 0;
  for (const p of parts) {
    len += p.length;
  }
  const all = new Uint8Array(len);
  let o = 0;
  for (const p of parts) {
    all.set(p, o);
    o += p.length;
  }
  // base64 (chunked to avoid call-stack overflow on large inputs)
  let bin = '';
  const STEP = 0x8000;
  for (let i = 0; i < all.length; i += STEP) {
    bin += String.fromCharCode.apply(
      null,
      Array.from(all.subarray(i, i + STEP)) as number[],
    );
  }
  // global btoa exists in RN's JS runtime
  return btoa(bin);
}
