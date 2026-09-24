// Cookie Canvas Mobile — chain bindings (ported from the web cApp).
// A pixel = one transaction carrying a `CCv1:` memo + a tiny native transfer
// to the network TREASURY. The board reconstructs from chain data alone.
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {Buffer} from 'buffer';

export interface NetCfg {
  key: string;
  label: string;
  rpc: string;
  treasury: string;
  unit: string;
}

export const NETWORKS: Record<string, NetCfg> = {
  cookie: {
    key: 'cookie',
    label: 'Cookie Chain',
    rpc: 'https://rpc.cookiescan.io',
    treasury: '5qnXpdxeJzn8zYgU4ezgFP4FrMJ6BwMBUUxpRHqQEeJS',
    unit: 'COOK',
  },
  devnet: {
    key: 'devnet',
    label: 'Solana Devnet',
    rpc: 'https://api.devnet.solana.com',
    treasury: '2hAXRdZkoZvgeA9FK5jxhPXtRPk7Z51XFJa8b6pgdYtE',
    unit: 'SOL (devnet)',
  },
};

export const MEMO_PROGRAM_ID = new PublicKey(
  'Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo',
);
export const PIXEL_COST = 0.000001 * LAMPORTS_PER_SOL;
export const CANVAS_W = 96;
export const CANVAS_H = 96;
export const MEMO_PREFIX = 'CCv1';

const MEMO_RE = /^CCv1:(\d+),(\d+):([0-9a-fA-F]{6})$/;

export function encodeMemo(x: number, y: number, rgb: string): string {
  return `CCv1:${x},${y}:${rgb}`;
}

export interface Pixel {
  x: number;
  y: number;
  rgb: string;
  signature: string;
  signer: string;
  slot: number;
  blockTime?: number;
}

export function parseMemo(str: string): {
  x: number;
  y: number;
  rgb: string;
} | null {
  const m = MEMO_RE.exec((str || '').trim());
  if (!m) {
    return null;
  }
  const x = +m[1];
  const y = +m[2];
  if (x >= CANVAS_W || y >= CANVAS_H) {
    return null;
  }
  return {x, y, rgb: m[3].toLowerCase()};
}

export function connectionFor(net: NetCfg): Connection {
  return new Connection(net.rpc, {commitment: 'confirmed'});
}

export function treasuryFor(net: NetCfg): PublicKey {
  return new PublicKey(net.treasury);
}

/** Build the pixel-placement tx; signed & sent via Mobile Wallet Adapter. */
export async function buildPixelTx(
  net: NetCfg,
  payer: PublicKey,
  x: number,
  y: number,
  rgb: string,
): Promise<Transaction> {
  const conn = connectionFor(net);
  const tx = new Transaction().add(
    new TransactionInstruction({
      programId: MEMO_PROGRAM_ID,
      keys: [{pubkey: payer, isSigner: true, isWritable: true}],
      data: Buffer.from(encodeMemo(x, y, rgb), 'utf8'),
    }),
    SystemProgram.transfer({
      fromPubkey: payer,
      toPubkey: treasuryFor(net),
      lamports: PIXEL_COST,
    }),
  );
  tx.feePayer = payer;
  tx.recentBlockhash = (await conn.getLatestBlockhash()).blockhash;
  return tx;
}

/** Walk signature history on TREASURY, newest-first. */
export async function fetchPixelSignatures(
  net: NetCfg,
  pages = 4,
): Promise<string[]> {
  const conn = connectionFor(net);
  const treasury = treasuryFor(net);
  const sigs: string[] = [];
  let before: string | undefined = undefined;
  for (let p = 0; p < pages; p++) {
    const batch: {signature: string}[] = await conn.getSignaturesForAddress(
      treasury,
      {
        limit: 1000,
        ...(before ? {before} : {}),
      },
    );
    if (!batch.length) {
      break;
    }
    sigs.push(...batch.map((b: {signature: string}) => b.signature));
    before = batch[batch.length - 1].signature;
    if (batch.length < 1000) {
      break;
    }
  }
  return sigs;
}

interface ParsedTx {
  slot: number;
  blockTime?: number;
  transaction: {
    message: {
      accountKeys: {pubkey: string; signer: boolean}[];
      instructions: {parsed?: unknown}[];
    };
  };
  meta?: {logMessages?: string[]};
}

function extractMemoFromLogs(logs?: string[]): string | null {
  if (!logs) {
    return null;
  }
  for (const line of logs) {
    const i = line.indexOf('Program log: ');
    if (i >= 0 && line.slice(i + 13).startsWith(MEMO_PREFIX)) {
      return line.slice(i + 13);
    }
  }
  return null;
}

function pixelFromTx(tx: ParsedTx, signature: string): Pixel | null {
  const signerKey =
    tx.transaction.message.accountKeys.find((k) => k.signer) ??
    tx.transaction.message.accountKeys[0];
  const memo =
    (tx.transaction.message.instructions
      .map((i) => (i.parsed && typeof i.parsed === 'string' ? i.parsed : null))
      .find(Boolean) as string | undefined) ??
    extractMemoFromLogs(tx.meta?.logMessages);
  const pixel = memo ? parseMemo(memo) : null;
  if (!pixel) {
    return null;
  }
  return {
    ...pixel,
    signature,
    signer: signerKey.pubkey,
    slot: tx.slot,
    blockTime: tx.blockTime,
  };
}

/** Batched JSON-RPC pull of many transactions in one round-trip. */
export async function fetchPixelsBatch(
  net: NetCfg,
  signatures: string[],
): Promise<(Pixel | null)[]> {
  const results: (Pixel | null)[] = new Array(signatures.length).fill(null);
  let pending = signatures.map((signature, i) => ({signature, i}));
  for (let round = 0; round < 2 && pending.length; round++) {
    if (round) {
      await new Promise((r) => setTimeout(r, 600));
    }
    const res = await fetch(net.rpc, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(
        pending.map(({signature}, i) => ({
          jsonrpc: '2.0',
          id: i,
          method: 'getTransaction',
          params: [
            signature,
            {maxSupportedTransactionVersion: 0, encoding: 'jsonParsed'},
          ],
        })),
      ),
    });
    if (!res.ok) {
      throw new Error('batch rpc http ' + res.status);
    }
    const arr = (await res.json()) as {
      id: number;
      error?: unknown;
      result?: ParsedTx;
    }[];
    const byId = new Map(arr.map((r) => [r.id, r]));
    const still: {signature: string; i: number}[] = [];
    for (let i = 0; i < pending.length; i++) {
      const r = byId.get(i);
      if (r && !r.error && r.result) {
        try {
          results[pending[i].i] = pixelFromTx(r.result, pending[i].signature);
        } catch {
          /* unparseable — leave null */
        }
      } else {
        still.push(pending[i]);
      }
    }
    pending = still;
  }
  return results;
}
