# Demo video — as recorded (docs/demo-ondevice.mp4, 72 s, ONE continuous take)

Recorded on-device (redroid Android 14 emulator, 720×1280) with `adb shell
screenrecord`, driving the real release build via `adb shell input tap` — one
unbroken take: place flow → network toggle → rebuild → provenance.

| Time      | On screen                                                                                         | What it proves                                                          |
| --------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 0:00–0:06 | Devnet board (173 px, complete cookie), fresh app state — CONNECT WALLET                          | state is live, prior pixels present                                     |
| 0:06–0:11 | Tap cell 55,42 → picker ("55,42") → FakeWallet **AUTHORIZE DAPP** sheet → AUTHORIZE               | real MWA association + user consent                                     |
| 0:12–0:17 | Back in app → place → FakeWallet **SIGN TRANSACTION(S)** sheet → AUTHORIZE                        | wallet-native signing, not a private key in app                         |
| 0:19–0:24 | **SENDING TRANSACTION(S)** sheet → SEND TRANSACTION TO CLUSTER; wallet posts via RPC              | wallet submits, not the app                                             |
| 0:24–0:34 | App returns: `pixel placed ✓ 2uj1EQKh…`; cell 55,42 selected                                      | tx landed mid-recording                                                 |
| 0:34–0:40 | Cookie Chain tab: `0 pixels on Cookie Chain`, empty board                                         | no local cache of devnet pixels                                         |
| 0:40–0:46 | Devnet tab: board rebuilds from ledger → `174 pixels on Solana Devnet`, cookie restored           | full reconstruction from chain data alone (incl. the pixel just placed) |
| 0:46–1:12 | The open 55,42 card updates in place as rebuild data lands (by m4dG..LyAN, tx 2uj1EQKh…, #ffa800) | placed record re-read from the rebuilt chain data                       |

The provenance card stays open from the placement tap through the rebuild, so
its final contents come from the chain-fetched transaction, not from the
optimistic local record shown right after placing.

## On-chain receipt (verifiable)

- Signature `2uj1EQKhmcc5wwNtU7iVsdFN3G6X8saSdiPkPZTjY2N9oFuG3RW8BeuKSj4j3wAStqPp2QhVmj1V52UDhzu3R6p7`
- Memo `CCv1:55,42:ffa800` · slot 503788828 · blockTime 2026-09-25T03:18:12Z (mid-recording)
- Status: **finalized**, err: null; treasury 2hAXRdZkoZvgeA9FK5jxhPXtRPk7Z51XFJa8b6pgdYtE

Wallet used: FakeWallet (Solana Mobile's MWA reference wallet, v2.1.1) —
the same flow should work with any MWA wallet (only FakeWallet tested).

Note: the wallet sheet shows the scaffold-default dApp identity ("React
Native dApp", solanamobile.com). It is kept deliberately — see the comment at
`components/providers/AuthorizationProvider.tsx` — so FakeWallet's
assetlinks source verification fails deterministically and package-scoped
authorization approves consistently; a production build would publish
`/.well-known/assetlinks.json` on the app's own domain.
