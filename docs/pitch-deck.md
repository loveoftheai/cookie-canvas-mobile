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
The entire board state is _derivable_ from the ledger — no indexer, no backend, no app server to kill. Rebuild the artwork by replaying signatures (public RPC endpoints remain the read path; devnet history can be reset by Solana Labs). And that makes the PHONE the natural home: you check it, you tap, your wallet signs, you're done in seconds.

## Slide 4 — What we built (native, not a wrapper)

- **Mobile Wallet Adapter** signing — authorize once, place pixels with wallet-native confirmation
- **Pure-JS-rendered 96×96 board** — the board rasterizes to one image, regenerated only on change; pinch to 10× zoom, drag, tap-to-inspect
- **Pixel provenance** — tap any cell: who placed it, when, which tx
- **Dual network** — Cookie Chain (board read/rebuild; placement via the web twin) / Solana Devnet (full in-app place flow, zero-cost), one toggle, same CCv1 protocol
- Board reconstructs from chain: signature walk + batched JSON-RPC pulls

## Slide 5 — Why it's sticky

The board is a living shared artifact. Someone paints over your pixel; you notice on refresh; you paint back. Every tap is a signature — skin in the game. Provenance turns every pixel into a story you can check. Daily-revisit mechanics come free with the medium.

## Slide 6 — Demo (docs/demo-ondevice.mp4, 72 s, ONE continuous take, Android 14 emulator)

1. Tap cell 55,42 → connect wallet → **AUTHORIZE DAPP** (MWA) → authorize
2. Place → **SIGN TRANSACTION(S)** sheet → authorize → **SEND TRANSACTION(S)** → send
3. Back in app: `pixel placed ✓ 2uj1EQKh…`
4. Toggle to Cookie Chain: `0 pixels` (empty board — the devnet state is not faked locally)
5. Toggle back to Devnet: board **rebuilds from the ledger alone** by 0:46 → `174 pixels on Solana Devnet`, full cookie restored
6. The open cell card updates in place as chain data lands — provenance (signer, time, tx) re-read from the rebuilt data

On-chain receipt for the demo tx: signature `2uj1EQKhmcc5wwNtU7iVsdFN3G6X8saSdiPkPZTjY2N9oFuG3RW8BeuKSj4j3wAStqPp2QhVmj1V52UDhzu3R6p7`, memo `CCv1:55,42:ffa800`, slot 503788828, finalized.

## Slide 7 — Team & status

Solo builder + agent orchestration (Claude Code on a DGX Spark). Web twin live at loveoftheai.github.io/cookie-canvas; native app built fresh for this hackathon — MWA signing, pure-JS renderer, touch model, and mobile UX are all new mobile-specific development.

## Slide 8 — What's next

dApp Store publication, Seeker-specific polish (NFC tap-to-place?), pixel streaks + local notifications, on-chain thumbnails for sharing.
