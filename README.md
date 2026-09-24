# Cookie Canvas — native on Solana Mobile

The on-chain collaborative pixel board, rebuilt as a **native Android app** for Solana Mobile / Seeker.

Every pixel on the 96×96 board is a real on-chain transaction — a `CCv1:x,y:rrggbb` memo plus a tiny transfer to the canvas treasury. The whole board reconstructs from chain data alone: no database, no server, just the ledger. On your phone, placing a pixel goes through the **Mobile Wallet Adapter** — your wallet (Phantom, Solflare, Seeker's embedded wallet) signs, you approve, the pixel lands on-chain.

## Why native

- **Mobile Wallet Adapter** — one-tap authorize, sign-and-send in the wallet, deep-linked back to the canvas. This is the interaction a wrapped web app can't do properly.
- **Skia-rendered board** — the 96×96 board renders as a single GPU image; drag, pinch-zoom (up to 40×), tap a cell. Hand-rolled touch math, no gesture library.
- **Pixel provenance in your pocket** — tap any cell to see who placed it, when, and the transaction signature. Every pixel's full history lives on-chain.
- **Two networks, one toggle** — Cookie Chain (production) and Solana Devnet (zero-cost testing), same protocol, same board contract.

## Protocol (CCv1)

A pixel = one transaction:

```
Memo:   CCv1:<x>,<y>:<rrggbb>          (spl-memo v1)
Transfer: 0.000001 COOK → TREASURY
```

Board reconstruction walks `getSignaturesForAddress(TREASURY)` and batch-pulls transactions via JSON-RPC (25 per round-trip), applying pixels oldest-first so the newest placement wins.

## Build

Requirements: JDK 17, Android SDK 34.

```bash
npm install
cd android && ./gradlew assembleDebug
# app/build/outputs/apk/debug/app-debug.apk
```

## Repo layout

- `src/chain.ts` — CCv1 protocol: memo encode/parse, pixel tx builder, signature walk + batched RPC
- `src/board.ts` — board state + on-chain reconstruction
- `src/PixelBoard.tsx` — Skia canvas, pinch/zoom/tap
- `App.tsx` — MWA signing flow, network toggle, provenance card, palette

Built for the Solana Mobile CLOCK IN hackathon. Web twin: [loveoftheai.github.io/cookie-canvas](https://loveoftheai.github.io/cookie-canvas/) · agent-built, human-directed.
