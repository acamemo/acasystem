import { useRef, type ReactNode } from 'react';
import {
  Body,
  Button,
  Icon,
  Popover,
  type IconName,
  type PopoverTriggerProps,
} from '@/components/primitives';
import './edit.css';

export interface WidgetEditControlsProps {
  /** Name of the widget for the accessible names («Rimuovi Luce cucina»). */
  name: string;
  /**
   * Renders the surface that opens the actions (the whole widget in edit mode): spread the
   * trigger props on a button.
   */
  handle: (props: PopoverTriggerProps) => ReactNode;
  onMove: () => void;
  onResize: () => void;
  onSettings: () => void;
  onRemove: () => void;
  /** Receives the remove button, so a key (Canc) can ask for confirmation. */
  removeRef?: (node: HTMLElement | null) => void;
}

function MenuItem({
  icon,
  children,
  onClick,
}: {
  icon: IconName;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <Button
      variant="control"
      size="md"
      className="aca-widget-menu__item"
      contentClassName="aca-widget-menu__item-content"
      onClick={onClick}
    >
      <Icon name={icon} size="md" />
      <span>{children}</span>
    </Button>
  );
}

/**
 * Edit-mode controls of a widget: «×» to remove (with confirmation) and the actions menu
 * (Sposta, Ridimensiona, Impostazioni, Rimuovi) opened by the widget itself, with a tap or
 * Invio: the keyboard alternative to dragging.
 */
export function WidgetEditControls({
  name,
  handle,
  onMove,
  onResize,
  onSettings,
  onRemove,
  removeRef,
}: WidgetEditControlsProps) {
  const removeButton = useRef<HTMLElement | null>(null);
  return (
    <>
      <Popover label={`Azioni per ${name}`} placement="bottom-start" trigger={handle}>
        {(close) => (
          <div className="aca-widget-menu">
            <MenuItem
              icon="move"
              onClick={() => {
                close();
                onMove();
              }}
            >
              Sposta
            </MenuItem>
            <MenuItem
              icon="resize"
              onClick={() => {
                close();
                onResize();
              }}
            >
              Ridimensiona
            </MenuItem>
            <MenuItem
              icon="settings"
              onClick={() => {
                close();
                onSettings();
              }}
            >
              Impostazioni
            </MenuItem>
            <MenuItem
              icon="close"
              onClick={() => {
                close();
                // The confirmation lives on «×»: open it once the menu has closed.
                setTimeout(() => removeButton.current?.click(), 0);
              }}
            >
              Rimuovi
            </MenuItem>
          </div>
        )}
      </Popover>

      <Popover
        label={`Conferma la rimozione di ${name}`}
        placement="bottom-start"
        trigger={(props) => (
          <Button
            {...props}
            ref={(node: HTMLButtonElement | null) => {
              props.ref(node);
              removeButton.current = node;
              removeRef?.(node);
            }}
            variant="control"
            shape="circle"
            size="md"
            className="aca-widget-edit__remove"
            aria-label={`Rimuovi ${name}`}
          >
            <Icon name="close" size="sm" />
          </Button>
        )}
      >
        {(close) => (
          <div className="aca-widget-confirm">
            <Body size="sm" tone="ink">
              {`Rimuovere «${name}» da questa pagina? Le sue impostazioni restano salvate.`}
            </Body>
            <div className="aca-widget-confirm__actions">
              <Button
                variant="secondary"
                size="md"
                className="aca-frame-pill"
                data-autofocus
                onClick={close}
              >
                Annulla
              </Button>
              {/* Destructive, not primary: the danger variant of the kit (K21). */}
              <Button
                variant="danger"
                size="md"
                className="aca-frame-pill"
                onClick={() => {
                  close();
                  onRemove();
                }}
              >
                Rimuovi
              </Button>
            </div>
          </div>
        )}
      </Popover>
    </>
  );
}
