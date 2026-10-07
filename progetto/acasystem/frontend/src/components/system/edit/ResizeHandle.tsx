import type { PointerEvent } from 'react';
import { MaterialLayers, materialClass } from '@/components/primitives';
import './edit.css';

/**
 * Corner handle that resizes a widget by dragging (pointer only, 44 px target). The keyboard
 * alternative is Maiusc + frecce, or Ridimensiona in the widget menu.
 */
export function ResizeHandle({
  onPointerDown,
}: {
  onPointerDown: (event: PointerEvent<HTMLSpanElement>) => void;
}) {
  return (
    <span className="aca-resize-handle" onPointerDown={onPointerDown} aria-hidden="true">
      <span
        className={materialClass(
          { behavior: 'press', shape: 'circle', size: 'sm' },
          'aca-resize-handle__grip'
        )}
      >
        <MaterialLayers contentClassName="aca-resize-handle__lines" />
      </span>
    </span>
  );
}
