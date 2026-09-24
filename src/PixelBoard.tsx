// 96x96 board rendered as a pure-JS PNG through RN's native image decoder.
// Drag, pinch-zoom (to 40x), tap-to-select — hand-rolled touch math.
import React, {useEffect, useRef, useState} from 'react';
import {Image, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import type {Board} from './board';
import {boardToPngBase64} from './png';
import {CANVAS_H, CANVAS_W} from './chain';

interface Props {
  board: Board;
  version: number;
  selected: {x: number; y: number} | null;
  onTapCell: (x: number, y: number) => void;
}

interface Xf {
  scale: number;
  ox: number;
  oy: number;
}

export default function PixelBoard({
  board,
  version,
  selected,
  onTapCell,
}: Props) {
  const [uri, setUri] = useState<string | null>(null);
  const [xf, setXf] = useState<Xf>({scale: 4, ox: 0, oy: 0});
  const viewRef = useRef<View>(null);
  const touch = useRef({
    mode: 'none' as 'none' | 'pan' | 'pinch',
    startX: 0,
    startY: 0,
    baseXf: xf,
    pinchDist: 0,
    moved: 0,
    t0: 0,
  });

  // board -> PNG data URI (one per version)
  useEffect(() => {
    const b64 = boardToPngBase64(board.rgb, CANVAS_W, CANVAS_H);
    setUri('data:image/png;base64,' + b64);
  }, [board, version]);

  // fit to view on first layout
  const fitted = useRef(false);
  const onLayout = () => {
    viewRef.current?.measure((_x, _y, w, h) => {
      if (!fitted.current && w > 0) {
        const s = Math.min(w, h) / CANVAS_W;
        setXf({
          scale: s,
          ox: (w - CANVAS_W * s) / 2,
          oy: (h - CANVAS_H * s) / 2,
        });
        fitted.current = true;
      }
    });
  };

  const toCell = (tx: number, ty: number) => {
    const cx = Math.floor((tx - xf.ox) / xf.scale);
    const cy = Math.floor((ty - xf.oy) / xf.scale);
    if (cx < 0 || cy < 0 || cx >= CANVAS_W || cy >= CANVAS_H) {
      return null;
    }
    return {x: cx, y: cy};
  };

  const onTouchStart = (e: any) => {
    const ts = e.nativeEvent.touches;
    const t = ts[0];
    touch.current.moved = 0;
    touch.current.t0 = Date.now();
    touch.current.baseXf = xf;
    if (ts.length >= 2) {
      touch.current.mode = 'pinch';
      touch.current.pinchDist = Math.hypot(
        ts[0].pageX - ts[1].pageX,
        ts[0].pageY - ts[1].pageY,
      );
    } else {
      touch.current.mode = 'pan';
      touch.current.startX = t.pageX;
      touch.current.startY = t.pageY;
    }
  };

  const onTouchMove = (e: any) => {
    const ts = e.nativeEvent.touches;
    const b = touch.current.baseXf;
    if (touch.current.mode === 'pinch' && ts.length >= 2) {
      const d = Math.hypot(
        ts[0].pageX - ts[1].pageX,
        ts[0].pageY - ts[1].pageY,
      );
      const midX = (ts[0].pageX + ts[1].pageX) / 2;
      const midY = (ts[0].pageY + ts[1].pageY) / 2;
      const k = clamp(d / (touch.current.pinchDist || 1), 0.5, 2);
      const ns = clamp(b.scale * k, 2, 40);
      const ox = midX - ((midX - b.ox) / b.scale) * ns;
      const oy = midY - ((midY - b.oy) / b.scale) * ns;
      setXf({scale: ns, ox, oy});
    } else if (touch.current.mode === 'pan' && ts.length === 1) {
      const dx = ts[0].pageX - touch.current.startX;
      const dy = ts[0].pageY - touch.current.startY;
      touch.current.moved = Math.max(touch.current.moved, Math.hypot(dx, dy));
      setXf({...b, ox: b.ox + dx, oy: b.oy + dy});
    }
  };

  const onTouchEnd = (e: any) => {
    const t = e.nativeEvent.changedTouches?.[0];
    const quick = Date.now() - touch.current.t0 < 350;
    if (
      touch.current.mode === 'pan' &&
      quick &&
      touch.current.moved < 12 &&
      t
    ) {
      const cell = toCell(t.pageX, t.pageY);
      if (cell) {
        onTapCell(cell.x, cell.y);
      }
    }
    touch.current.mode = 'none';
  };

  return (
    <View
      ref={viewRef}
      style={styles.fill}
      onLayout={onLayout}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}>
      {uri && (
        <Image
          source={{uri}}
          style={{
            position: 'absolute',
            left: xf.ox,
            top: xf.oy,
            width: CANVAS_W * xf.scale,
            height: CANVAS_H * xf.scale,
            resizeMode: 'stretch',
          }}
        />
      )}
      {selected && (
        <View
          style={{
            position: 'absolute',
            left: xf.ox + selected.x * xf.scale - 1,
            top: xf.oy + selected.y * xf.scale - 1,
            width: xf.scale + 2,
            height: xf.scale + 2,
            borderWidth: 2,
            borderColor: '#fff',
            borderRadius: 2,
          }}
        />
      )}
      <TouchableOpacity
        style={styles.resetBtn}
        onPress={() => {
          fitted.current = false;
          onLayout();
        }}>
        <Text style={styles.resetTxt}>fit</Text>
      </TouchableOpacity>
      <Text style={styles.hint}>
        drag · pinch · tap a cell{'  '}zoom {(xf.scale / 4).toFixed(1)}x
      </Text>
    </View>
  );
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

const styles = StyleSheet.create({
  fill: {flex: 1},
  hint: {
    position: 'absolute',
    bottom: 4,
    right: 8,
    color: '#8a8',
    fontSize: 11,
  },
  resetBtn: {
    position: 'absolute',
    bottom: 2,
    left: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: '#1c201a',
  },
  resetTxt: {color: '#9aa08e', fontSize: 11},
});
