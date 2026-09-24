# Cookie Canvas — pitch deck (CLOCK IN, Solana Mobile)

## Slide 1 — Title

**Cookie Canvas**
The on-chain pixel board, native on Seeker.
Every pixel is a real transaction. The whole artwork lives on the blockchain.

## Slide 2 — The problem

Place-pixel apps (r/place) die when the server dies. History is editable, ownership is a database row, and mobile is an afterthought — a shrunken web page.
On chain, none of that can be faked — but on-chain canvases so far have been desktop-first web toys.

## Slide 3 — The insight

A pixel fits in a memo. `CCv1:x,y:rrggbb` + a dust transfer = one transaction.
The entire board state is _derivable_ from the ledger — no indexer, no backend, no server to kill. Rebuild the artwork by replaying signatures. That makes the canvas genuinely permanent — and makes the PHONE the natural home: you check it, you tap, your wallet signs, you're done in seconds.

## Slide 4 — What we built (native, not a wrapper)

- **Mobile Wallet Adapter** signing — authorize once, place pixels with wallet-native confirmation
- **Skia-rendered 96×96 board** — single GPU draw call, pinch to 40× zoom, drag, tap-to-inspect
- **Pixel provenance** — tap any cell: who placed it, when, which tx
- **Dual network** — Cookie Chain (production) / Solana Devnet (free testing), one toggle
- Board reconstructs from chain: signature walk + batched JSON-RPC pulls

## Slide 5 — Why it's sticky

The board is a living shared artifact. Someone paints over your pixel; you notice; you paint back. Every tap is a signature — skin in the game. Provenance turns every pixel into a story you can check. Daily-revisit mechanics come free with the medium.

## Slide 6 — Demo (3 min)

1. Open app → board loads by replaying the chain (progress shown)
2. Pinch-zoom into a region, tap a cell → provenance card
3. Pick color → "place" → wallet confirmation pops (MWA) → pixel lands on-chain
4. Toggle to Devnet → place a free pixel → see it appear
5. Rotate/zoom — 60fps Skia rendering

## Slide 7 — Team & status

Solo builder + agent orchestration (Claude Code on a DGX Spark). Web twin live at loveoftheai.github.io/cookie-canvas; native app built fresh for this hackathon — MWA signing, Skia renderer, touch model, and mobile UX are all new mobile-specific development.

## Slide 8 — What's next

dApp Store publication, Seeker-specific polish (NFC tap-to-place?), pixel streaks + local notifications, on-chain thumbnails for sharing.
