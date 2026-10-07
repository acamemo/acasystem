import { Button, Caption, Icon } from '@/components/primitives';
import './edit.css';

/**
 * Single-tap alternative to dragging, sharing the launcher's keyboard operations. It takes the
 * footer band while it is open (appShell.css): one row on wide screens, two on narrow ones.
 * «Fatto» is a control, not orange: «Fine» stays the only primary action of edit mode.
 */
export function WidgetPositionControls({
  name,
  mode,
  onStep,
  onPage,
  onDone,
}: {
  name: string;
  mode: 'move' | 'resize';
  onStep: (dx: number, dy: number) => void;
  onPage: (direction: -1 | 1) => void;
  onDone: () => void;
}) {
  const moving = mode === 'move';
  return (
    // Esc ends the move as «Fatto» does (as on the widget itself), not the whole edit mode.
    <div
      className="aca-widget-position"
      role="group"
      aria-label={`${moving ? 'Sposta' : 'Ridimensiona'} ${name}`}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        onDone();
      }}
    >
      <Caption tone="info" className="aca-widget-position__name">{`${
        moving ? 'Sposta' : 'Ridimensiona'
      } ${name}`}</Caption>
      <div className="aca-widget-position__actions">
        {/* Each set stays whole on narrow screens (the page pair never splits). */}
        <span className="aca-widget-position__set">
          {[
            {
              dx: -1,
              dy: 0,
              icon: 'chevronLeft' as const,
              label: moving ? 'Sposta a sinistra' : 'Riduci larghezza',
            },
            {
              dx: 1,
              dy: 0,
              icon: 'chevronRight' as const,
              label: moving ? 'Sposta a destra' : 'Aumenta larghezza',
            },
            {
              dx: 0,
              dy: -1,
              icon: 'chevronUp' as const,
              label: moving ? 'Sposta in alto' : 'Riduci altezza',
            },
            {
              dx: 0,
              dy: 1,
              icon: 'chevronDown' as const,
              label: moving ? 'Sposta in basso' : 'Aumenta altezza',
            },
          ].map(({ dx, dy, icon, label }) => (
            <Button
              key={label}
              variant="control"
              size="md"
              shape="circle"
              aria-label={label}
              title={label}
              onClick={() => onStep(dx, dy)}
            >
              <Icon name={icon} size="md" />
            </Button>
          ))}
        </span>
        {moving && (
          <span className="aca-widget-position__set">
            <Button
              variant="control"
              size="md"
              shape="circle"
              aria-label="Sposta nella pagina precedente"
              title="Sposta nella pagina precedente"
              onClick={() => onPage(-1)}
            >
              <Icon name="chevronLeft" size="md" />
            </Button>
            <Caption tone="ink">Pagina</Caption>
            <Button
              variant="control"
              size="md"
              shape="circle"
              aria-label="Sposta nella pagina successiva"
              title="Sposta nella pagina successiva"
              onClick={() => onPage(1)}
            >
              <Icon name="chevronRight" size="md" />
            </Button>
          </span>
        )}
        <Button
          variant="control"
          size="md"
          className="aca-frame-pill aca-widget-position__done"
          onClick={onDone}
        >
          <Icon name="done" size="md" />
          Fatto
        </Button>
      </div>
    </div>
  );
}
