import type { CSSProperties } from 'react';
import { Body, Caption, Surface } from '@/components/primitives';
import type { DragSession } from '@/hooks/launcher/useWidgetDrag';

/** Floating copy of the dragged widget, under the pointer (it can travel to another page). */
export function DragGhost({ session }: { session: DragSession }) {
  if (session.mode !== 'move') return null;
  const style: CSSProperties = {
    width: `${session.box.width}px`,
    height: `${session.box.height}px`,
    transform: `translate3d(${session.pointer.x - session.offset.x}px, ${
      session.pointer.y - session.offset.y
    }px, 0)`,
  };
  const target = session.target;
  return (
    <div className="aca-drag-ghost" style={style} aria-hidden="true">
      <Surface
        error={target ? !target.valid : false}
        className="aca-m--fill aca-drag-ghost__frame"
        contentClassName="aca-drag-ghost__layer"
      >
        <div className="aca-drag-ghost__content">
          <Body as="span" size="sm" tone="ink" className="aca-drag-ghost__name">
            {session.label}
          </Body>
          {target && (
            <Caption tone={target.valid ? 'muted' : 'danger'}>
              {target.valid
                ? `Colonna ${target.rect.x + 1}, riga ${target.rect.y + 1}`
                : 'Non c’è spazio qui'}
            </Caption>
          )}
        </div>
      </Surface>
    </div>
  );
}
