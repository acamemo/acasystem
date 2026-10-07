import type { CSSProperties } from 'react';
import type { CellSize } from '@/@types/launcher';
import { Caption } from '@/components/primitives';
import '../sheets.css';

/**
 * Footprint of a widget on the launcher grid: the cells it covers drawn inside the largest size
 * the widget allows. Purely visual; the size is also written in words next to it.
 */
export function SizePreview({ size, frame }: { size: CellSize; frame: CellSize }) {
  const columns = Math.max(frame.w, size.w);
  const rows = Math.max(frame.h, size.h);
  const style = {
    '--aca-preview-cols': columns,
    '--aca-preview-rows': rows,
    '--aca-preview-w': size.w,
    '--aca-preview-h': size.h,
  } as CSSProperties;
  return (
    <div className="aca-size-preview">
      <div className="aca-size-preview__grid" style={style} aria-hidden="true">
        {Array.from({ length: columns * rows }, (_, index) => (
          <span key={index} className="aca-size-preview__cell" />
        ))}
        <span className="aca-size-preview__widget" />
      </div>
      <Caption>
        {size.w} × {size.h} {size.w * size.h === 1 ? 'cella' : 'celle'}
      </Caption>
    </div>
  );
}
