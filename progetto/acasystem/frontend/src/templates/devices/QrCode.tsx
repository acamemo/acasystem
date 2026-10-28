import { useMemo } from 'react';
import type { QrLevel } from '@/@types/devices';
import { Notice } from '../sheets/parts/Form';
import { encodeQr, qrPath } from './qrEncode';

/** Light modules around the symbol, as the standard asks (4). */
const QUIET_ZONE = 4;

/**
 * A QR code as SVG (REP-20261028-004, T7). It is always black on white whatever the theme: a
 * scanner needs the contrast, so the colours are not the kit tokens. A text that cannot be
 * encoded (too long) is told instead of drawn.
 */
export function QrCode({ data, level, label }: { data: string; level: QrLevel; label: string }) {
  const symbol = useMemo(() => {
    try {
      const modules = encodeQr(data, level);
      return { path: qrPath(modules, QUIET_ZONE), side: modules.length + QUIET_ZONE * 2 };
    } catch {
      return null;
    }
  }, [data, level]);
  if (!symbol) return <Notice tone="danger">Non riesco a mostrare il codice. Esci e riprova.</Notice>;

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${symbol.side} ${symbol.side}`}
      shapeRendering="crispEdges"
      style={{ display: 'block', width: '100%', maxWidth: '16rem', height: 'auto', margin: '0 auto' }}
    >
      <rect width={symbol.side} height={symbol.side} fill="white" />
      <path d={symbol.path} fill="black" />
    </svg>
  );
}
