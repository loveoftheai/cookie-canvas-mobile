// Cookie Canvas Mobile — the on-chain 96x96 collaborative pixel board,
// native on Solana Mobile. Place pixels via Mobile Wallet Adapter; every
// pixel is a real on-chain transaction (CCv1 memo + tiny transfer).
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {ConnectionProvider} from './components/providers/ConnectionProvider';
import {
  AuthorizationProvider,
  useAuthorization,
} from './components/providers/AuthorizationProvider';
import ConnectButton from './components/ConnectButton';
import DisconnectButton from './components/DisconnectButton';
import PixelBoard from './src/PixelBoard';
import {applyPixel, newBoard, rebuildBoard, type Board} from './src/board';
import {
  buildPixelTx,
  CANVAS_H,
  CANVAS_W,
  NETWORKS,
  type NetCfg,
  type Pixel,
} from './src/chain';
import {
  transact,
  type Web3MobileWallet,
} from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';

const PALETTE = [
  '#ffffff',
  '#d4d7d9',
  '#898d90',
  '#515252',
  '#1c1c1c',
  '#ff4500',
  '#ffa800',
  '#ffd635',
  '#00a368',
  '#7eed56',
  '#00ccc0',
  '#3690ea',
  '#51e9f4',
  '#493ac1',
  '#b44ac0',
  '#ff99aa',
  '#ff3881',
  '#6d482f',
  '#9c6926',
  '#000000',
];

function shortKey(k: string) {
  return k.slice(0, 4) + '…' + k.slice(-4);
}

function MainApp() {
  const {selectedAccount, authorizeSession} = useAuthorization();
  const [netKey, setNetKey] = useState<string>('cookie');
  const net: NetCfg = NETWORKS[netKey];
  const [board, setBoard] = useState<Board>(() => newBoard());
  const [version, setVersion] = useState(0);
  const [status, setStatus] = useState('loading board…');
  const [selected, setSelected] = useState<{x: number; y: number} | null>(null);
  const [color, setColor] = useState('#ffa800');
  const [placing, setPlacing] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const newestSig = useRef<string | undefined>(undefined);

  const refresh = useCallback(async (n: NetCfg) => {
    setStatus('rebuilding from chain…');
    try {
      const b = await rebuildBoard(n, (done, total) =>
        setStatus(`backfill ${done}/${total} txs…`),
      );
      setBoard(b);
      setVersion(v => v + 1);
      const first = b.provenance.values().next().value as Pixel | undefined;
      newestSig.current = first?.signature;
      setStatus(`${b.count} pixels on ${n.label}`);
    } catch (e: any) {
      setStatus('board load failed: ' + (e?.message || e));
    }
  }, []);

  useEffect(() => {
    refresh(net);
    return () => {
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [netKey]);

  const selPixel: Pixel | undefined = selected
    ? board.provenance.get(`${selected.x},${selected.y}`)
    : undefined;

  const placePixel = async () => {
    if (!selected || placing) {
      return;
    }
    setPlacing(true);
    const rgb = color.replace('#', '');
    try {
      const sig = await transact(async (wallet: Web3MobileWallet) => {
        const auth = await authorizeSession(wallet);
        const tx = await buildPixelTx(
          net,
          auth.publicKey,
          selected.x,
          selected.y,
          rgb,
        );
        const [res] = await wallet.signAndSendTransactions({
          transactions: [tx],
        });
        return res;
      });
      const p: Pixel = {
        x: selected.x,
        y: selected.y,
        rgb,
        signature: String(sig),
        signer: selectedAccount?.publicKey?.toString() ?? '',
        slot: 0,
        blockTime: Math.floor(Date.now() / 1000),
      };
      applyPixel(board, p);
      newestSig.current = p.signature;
      setVersion(v => v + 1);
      setStatus('pixel placed ✓ ' + String(sig).slice(0, 16) + '…');
    } catch (e: any) {
      setStatus('place failed: ' + (e?.message || e));
    } finally {
      setPlacing(false);
    }
  };

  return (
    <SafeAreaView style={styles.shell}>
      <View style={styles.header}>
        <Text style={styles.title}>Cookie Canvas</Text>
        <View style={styles.netRow}>
          {Object.values(NETWORKS).map(n => (
            <TouchableOpacity
              key={n.key}
              onPress={() => setNetKey(n.key)}
              style={[styles.netBtn, n.key === netKey && styles.netBtnOn]}>
              <Text
                style={[styles.netText, n.key === netKey && styles.netTextOn]}>
                {n.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.walletRow}>
          {selectedAccount ? (
            <>
              <Text style={styles.acct}>
                {shortKey(selectedAccount.publicKey.toString())}
              </Text>
              <DisconnectButton title="disconnect" />
            </>
          ) : (
            <ConnectButton title="connect wallet" />
          )}
        </View>
      </View>

      <View style={styles.boardWrap}>
        <PixelBoard
          board={board}
          version={version}
          selected={selected}
          onTapCell={(x, y) => setSelected({x, y})}
        />
      </View>

      <Text style={styles.status}>{status}</Text>

      {selected && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            cell {selected.x},{selected.y}
            {selPixel ? ` · #${selPixel.rgb}` : ' · empty'}
          </Text>
          {selPixel && (
            <Text style={styles.cardBody} selectable>
              by {shortKey(selPixel.signer)}
              {selPixel.blockTime
                ? ' · ' +
                  new Date(selPixel.blockTime * 1000)
                    .toISOString()
                    .slice(0, 16)
                    .replace('T', ' ') +
                  'Z'
                : ''}
              {'\n'}tx {selPixel.signature.slice(0, 24)}…
            </Text>
          )}
          <TouchableOpacity
            style={[styles.placeBtn, placing && styles.placeBtnOff]}
            onPress={placePixel}
            disabled={placing}>
            <Text style={styles.placeText}>
              {placing
                ? 'signing in wallet…'
                : selectedAccount
                ? `place ${color} here`
                : 'connect wallet to place'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        horizontal
        style={styles.palette}
        contentContainerStyle={styles.paletteInner}>
        {PALETTE.map(c => (
          <TouchableOpacity
            key={c}
            onPress={() => setColor(c)}
            style={[
              styles.swatch,
              {backgroundColor: c},
              color === c && styles.swatchOn,
            ]}
          />
        ))}
      </ScrollView>
      <Text style={styles.foot}>
        {CANVAS_W}×{CANVAS_H} · every pixel is an on-chain tx · CCv1
      </Text>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ConnectionProvider
      config={{commitment: 'confirmed'}}
      endpoint={NETWORKS.cookie.rpc}>
      <AuthorizationProvider>
        <MainApp />
      </AuthorizationProvider>
    </ConnectionProvider>
  );
}

const styles = StyleSheet.create({
  shell: {flex: 1, backgroundColor: '#0d0f0c', padding: 8},
  header: {paddingBottom: 6},
  title: {color: '#e8e2d0', fontSize: 20, fontWeight: '700'},
  netRow: {flexDirection: 'row', gap: 6, marginTop: 4},
  netBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#1c201a',
  },
  netBtnOn: {backgroundColor: '#3a4d2e'},
  netText: {color: '#9aa08e', fontSize: 12},
  netTextOn: {color: '#e8e2d0', fontWeight: '600'},
  walletRow: {flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6},
  acct: {color: '#8a8', fontFamily: 'monospace', fontSize: 12},
  btn: {
    backgroundColor: '#3a4d2e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  btnText: {color: '#e8e2d0', fontSize: 12},
  boardWrap: {
    flex: 1,
    minHeight: 240,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#080a08',
  },
  status: {color: '#9aa08e', fontSize: 11, paddingVertical: 4},
  card: {
    backgroundColor: '#161a14',
    borderRadius: 10,
    padding: 10,
    marginVertical: 4,
  },
  cardTitle: {color: '#e8e2d0', fontSize: 13, fontWeight: '600'},
  cardBody: {
    color: '#9aa08e',
    fontSize: 11,
    marginTop: 4,
    fontFamily: 'monospace',
  },
  placeBtn: {
    backgroundColor: '#ffa800',
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 8,
    alignItems: 'center',
  },
  placeBtnOff: {opacity: 0.5},
  placeText: {color: '#1c1c1c', fontWeight: '700'},
  palette: {maxHeight: 44, marginVertical: 4},
  paletteInner: {gap: 6, paddingHorizontal: 2},
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  swatchOn: {borderColor: '#fff', borderWidth: 2},
  foot: {color: '#5c6252', fontSize: 10, textAlign: 'center'},
});
