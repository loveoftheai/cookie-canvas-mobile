# Cookie Canvas — native on Solana Mobile

The on-chain collaborative pixel board, rebuilt as a **native Android app** for Solana Mobile / Seeker.

Every pixel on the 96×96 board is a real on-chain transaction — a `CCv1:x,y:rrggbb` memo plus a tiny transfer to the canvas treasury. The board reconstructs from chain data alone: no database, no app server — the ledger is the source of truth (read via public RPC endpoints). On your phone, placing a pixel goes through the **Mobile Wallet Adapter** — your wallet signs, you approve, the pixel lands on-chain. Tested with FakeWallet (Solana Mobile's MWA reference wallet); the same flow should work with any MWA wallet.

## Why native

- **Mobile Wallet Adapter** — one-tap authorize, sign-and-send in the wallet, deep-linked back to the canvas. Native MWA gives this interaction first-class treatment.
- **Pure-JS-rendered board** — the 96×96 board rasterizes to a single Image element (regenerated only on change); drag, pinch-zoom (up to 10×), tap a cell. Hand-rolled touch math, no gesture library.
- **Pixel provenance in your pocket** — tap any cell to see who placed it, when, and the transaction signature. Every pixel's full history lives on-chain.
- **Two networks, one toggle** — Cookie Chain (board read/rebuild; placement via the web twin) and Solana Devnet (full in-app place flow, zero-cost), same CCv1 memo protocol on both.

## Protocol (CCv1)

A pixel = one transaction:

```
Memo:   CCv1:<x>,<y>:<rrggbb>          (spl-memo v1)
Transfer: 0.000001 COOK → TREASURY
```

Board reconstruction walks `getSignaturesForAddress(TREASURY)` (most recent 4,000 signatures) and batch-pulls transactions via JSON-RPC (50 per round-trip), applying pixels oldest-first so the newest placement wins. Failed transactions (`meta.err` set) are skipped.

## Build & install

Requirements: JDK 17, Android SDK 34.

```bash
npm install
cd android && ./gradlew assembleRelease
# app/build/outputs/apk/release/app-release.apk
adb install -r app/build/outputs/apk/release/app-release.apk
```

A prebuilt release APK is included: `docs/cookie-canvas-release.apk` (signed with the debug keystore for side-loading; Hermes enabled, all four ABIs). Wallet: install FakeWallet (Solana Mobile's MWA reference wallet) or any MWA wallet. On first run the app opens on the Cookie Chain tab (empty board — expected); switch to **Solana Devnet** for the zero-cost full place flow shown in `docs/demo-ondevice.mp4`.

## Repo layout

- `src/chain.ts` — CCv1 protocol: memo encode/parse, pixel tx builder, signature walk + batched RPC
- `src/board.ts` — board state + on-chain reconstruction
- `src/PixelBoard.tsx` — pure-JS board rasterizer, pinch/zoom/tap
- `App.tsx` — MWA signing flow, network toggle, provenance card, palette

Built for the Solana Mobile CLOCK IN hackathon. Web twin: [loveoftheai.github.io/cookie-canvas](https://loveoftheai.github.io/cookie-canvas/) · agent-built, human-directed.
