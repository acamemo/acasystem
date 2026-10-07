import { useId, type ComponentPropsWithRef } from 'react';
import { Body, Button, Caption, Icon, Toggle, type IconName } from '@/components/primitives';
import './edit.css';

export interface EditToolbarProps {
  onAddWidget: () => void;
  onPageSettings: () => void;
  onNewPage: () => void;
  /** The cover and the special pages take no widgets. */
  canAddWidget: boolean;
  /** No page settings on the cover. */
  canEditPage: boolean;
  coverEnabled: boolean;
  onCoverChange: (enabled: boolean) => void;
}

/** Name of the cover setting: «Mostra copertina», not the «Copertina» of the indicator. */
export const COVER_SETTING_LABEL = 'Mostra copertina';

/**
 * Short visible name of the cover setting where the bar is narrow (density «short», V-06): it
 * belongs to the switch, so a note before it never reads as its label. «Mostra», not «Copertina»:
 * on the cover the indicator already shows that word right beside it (V2-05). The accessible
 * name stays COVER_SETTING_LABEL, which contains it (WCAG 2.5.3).
 */
export const COVER_SETTING_SHORT_LABEL = 'Mostra';

type ToolbarButtonProps = Omit<ComponentPropsWithRef<'button'>, 'children'> & {
  icon: IconName;
  label: string;
};

/**
 * One action of the bar, at the height of the frame controls. On narrow screens only the icon
 * shows (edit.css): aria-label and title keep the name.
 */
function ToolbarButton({ icon, label, ...props }: ToolbarButtonProps) {
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
      <span className="aca-m__label aca-edit-toolbar__text">{label}</span>
    </Button>
  );
}

/**
 * Edit-mode bar inside the footer band: the actions on the page at the start (new page, page
 * settings, add a widget) and the cover setting at the end, with the page indicator between
 * them on wide screens. The free cells with «+» are the main way to add a widget, so no action
 * here is orange: «Fine» in the status bar is the only primary action of edit mode.
 * The always-available action comes first, so nothing moves when a page offers fewer actions:
 * the cover and the special pages say why instead of showing disabled buttons.
 * The footer band chooses how much text the bar shows (data-band-density, edit.css).
 */
export function EditToolbar({
  onAddWidget,
  onPageSettings,
  onNewPage,
  canAddWidget,
  canEditPage,
  coverEnabled,
  onCoverChange,
}: EditToolbarProps) {
  const coverLabel = `copertina-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const note = canEditPage
    ? 'Questa pagina non contiene widget'
    : 'La copertina non contiene widget';
  return (
    <div className="aca-edit-toolbar" role="group" aria-label="Modifica della disposizione">
      <div className="aca-edit-toolbar__group aca-edit-toolbar__actions">
        <ToolbarButton icon="grid" label="Nuova pagina" onClick={onNewPage} />
        {canEditPage && <ToolbarButton icon="settings" label="Pagina" onClick={onPageSettings} />}
        {canAddWidget ? (
          <ToolbarButton
            icon="add"
            label="Aggiungi widget"
            onClick={onAddWidget}
            data-launcher-add
          />
        ) : (
          <Caption tone="muted" className="aca-edit-toolbar__note">
            {note}
          </Caption>
        )}
      </div>
      <div className="aca-edit-toolbar__group aca-edit-toolbar__cover">
        <Icon name="calendar" size="md" className="aca-edit-toolbar__cover-icon" />
        <Body as="span" size="md" tone="ink" id={coverLabel} className="aca-edit-toolbar__text">
          {COVER_SETTING_LABEL}
        </Body>
        <Body as="span" size="sm" tone="ink" className="aca-edit-toolbar__short" aria-hidden="true">
          {COVER_SETTING_SHORT_LABEL}
        </Body>
        <Toggle
          compact
          className="aca-edit-toolbar__toggle"
          checked={coverEnabled}
          aria-labelledby={coverLabel}
          title={COVER_SETTING_LABEL}
          onClick={() => onCoverChange(!coverEnabled)}
        />
      </div>
    </div>
  );
}
