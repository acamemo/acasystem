import type { ComponentPropsWithRef, MouseEvent } from 'react';
import { Button, Caption, Icon, type IconName } from '@/components/primitives';
import './edit.css';

export interface EditToolbarProps {
  /**
   * Out of edit mode: the bars wait below the screen, inert and silent, so they can rise and
   * sink with a transition instead of appearing and disappearing (REP-20261007-018).
   */
  hidden?: boolean;
  /**
   * The pages view is going back to edit mode (the pager has `is-closing`): the bar that comes
   * waits for the one that goes. A class of the bar and not a `:has()` on the main area (edit.css).
   */
  closing?: boolean;
  onAddWidget: () => void;
  /** Opens the page editor (the cards of the pages). */
  onPages: (event: MouseEvent<HTMLButtonElement>) => void;
  /**
   * «Fine»: leaves edit mode (REP-20261009-004, D1). Since ADR-0016 no control shares its corner:
   * «Modifica» is gone from the screen, and the one a keyboard has has no face.
   */
  onDone: (event: MouseEvent<HTMLButtonElement>) => void;
  /** The special pages take no widgets. */
  canAddWidget: boolean;
}

type ToolbarButtonProps = Omit<ComponentPropsWithRef<'button'>, 'children'> & {
  icon: IconName;
  /** Accessible name and tooltip. */
  label: string;
  /** Short visible text, contained in the label (REP-20261007-019); the label when absent. */
  text?: string;
};

/**
 * One action of the bar, at the height of the frame controls. On narrow screens only the icon
 * shows (edit.css): aria-label and title keep the name.
 */
function ToolbarButton({ icon, label, text, ...props }: ToolbarButtonProps) {
  return (
    <Button
      variant="control"
      size="md"
      className="aca-frame-pill aca-edit-toolbar__button"
      contentClassName="aca-edit-toolbar__button-content"
      aria-label={label}
      title={label}
      {...props}
    >
      <Icon name={icon} size="md" />
      <span className="aca-m__label aca-edit-toolbar__text">{text ?? label}</span>
    </Button>
  );
}

/**
 * Edit-mode bar inside the footer band (REP-20261008-001, E4): «+ Widget» at the start and
 * «Pagine» and «Fine» at the end, with the page indicator between them on wide screens.
 * Everything about the pages (new, order, name, main page, hiding, columns) lives in the page
 * editor that «Pagine» opens: its visible and keyboard way in, besides the press on the empty
 * page. The free cells with «+» are the main way to add a widget, so «Fine» (REP-20261009-004,
 * D1) is the only primary action of edit mode and the only orange one; it keeps its text at
 * every density. The special pages say why they take no widget instead of showing a disabled
 * button.
 * The footer band chooses how much text the bar shows (data-band-density, edit.css).
 */
export function EditToolbar({
  hidden = false,
  closing = false,
  onAddWidget,
  onPages,
  onDone,
  canAddWidget,
}: EditToolbarProps) {
  return (
    <div
      className={[
        'aca-edit-toolbar',
        hidden && 'aca-edit-toolbar--hidden',
        closing && 'aca-edit-toolbar--closing',
      ]
        .filter(Boolean)
        .join(' ')}
      role="group"
      aria-label="Modifica della disposizione"
      inert={hidden || undefined}
      aria-hidden={hidden || undefined}
      // The marks the footer band measures the bar by (REP-20261013-002, ADR-0013).
      data-band-bar="edit"
    >
      <div className="aca-edit-toolbar__group aca-edit-toolbar__actions" data-band-group="start">
        {canAddWidget ? (
          <ToolbarButton
            icon="add"
            label="Aggiungi widget"
            text="Widget"
            onClick={onAddWidget}
            data-launcher-add
          />
        ) : (
          // The note takes the width of the column and not the one of its text: the band does not
          // measure it (REP-20261013-002, ADR-0013).
          <Caption tone="muted" className="aca-edit-toolbar__note" data-band-flex>
            Questa pagina non contiene widget
          </Caption>
        )}
      </div>
      <div className="aca-edit-toolbar__group aca-edit-toolbar__pages" data-band-group="end">
        <ToolbarButton
          icon="grid"
          label="Modifica le pagine"
          text="Pagine"
          onClick={onPages}
          data-launcher-pages
        />
        <Button
          variant="primary"
          size="md"
          className="aca-frame-pill aca-edit-toolbar__done"
          onClick={onDone}
        >
          Fine
        </Button>
      </div>
    </div>
  );
}
