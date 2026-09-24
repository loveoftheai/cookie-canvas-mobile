// Board state: 96x96 RGB held flat + provenance record per latest pixel.
import {CANVAS_H, CANVAS_W, fetchPixelSignatures, fetchPixelsBatch, type NetCfg, type Pixel} from './chain';

export interface Board {
  // 96*96*3 bytes, row-major
  rgb: Uint8Array;
  // latest pixel record per coordinate key `x,y`
  provenance: Map<string, Pixel>;
  count: number;
}

export function newBoard(): Board {
  return {
    rgb: new Uint8Array(CANVAS_W * CANVAS_H * 3),
    provenance: new Map(),
    count: 0,
  };
}

export function applyPixel(b: Board, p: Pixel): boolean {
  const idx = (p.y * CANVAS_W + p.x) * 3;
  const r = parseInt(p.rgb.slice(0, 2), 16);
  const g = parseInt(p.rgb.slice(2, 4), 16);
  const bl = parseInt(p.rgb.slice(4, 6), 16);
  const changed =
    b.rgb[idx] !== r || b.rgb[idx + 1] !== g || b.rgb[idx + 2] !== bl;
  b.rgb[idx] = r;
  b.rgb[idx + 1] = g;
  b.rgb[idx + 2] = bl;
  const key = `${p.x},${p.y}`;
  if (!b.provenance.has(key)) {
    b.count++;
  }
  b.provenance.set(key, p);
  return changed;
}

/** Reconstruct the board from TREASURY signature history (newest-first). */
export async function rebuildBoard(
  net: NetCfg,
  onProgress?: (done: number, total: number) => void,
): Promise<Board> {
  const sigs = await fetchPixelSignatures(net, 4);
  const board = newBoard();
  // oldest-first application so newest pixels win
  const all = sigs.slice().reverse();
  const CHUNK = 200;
  for (let i = 0; i < all.length; i += CHUNK) {
    const slice = all.slice(i, i + CHUNK);
    const pixels = await fetchPixelsBatch(net, slice);
    for (const p of pixels) {
      if (p) {
        applyPixel(board, p);
      }
    }
    onProgress?.(Math.min(i + CHUNK, all.length), all.length);
  }
  return board;
}

/** Poll for signatures newer than what we have; returns new pixels (newest-first input). */
export async function pollNewPixels(
  net: NetCfg,
  board: Board,
  knownNewest: string | undefined,
): Promise<Pixel[]> {
  const conn = net.rpc;
  const sigs = await fetchPixelSignatures(net, 1);
  const fresh: string[] = [];
  for (const s of sigs) {
    if (s === knownNewest) {
      break;
    }
    fresh.push(s);
  }
  if (!fresh.length) {
    return [];
  }
  const pixels = (await fetchPixelsBatch(net, fresh)).filter(
    (p): p is Pixel => !!p,
  );
  for (const p of pixels) {
    applyPixel(board, p);
  }
  return pixels;
}
