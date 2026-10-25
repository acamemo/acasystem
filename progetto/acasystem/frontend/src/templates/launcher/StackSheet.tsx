import type { ReactNode } from 'react';
import { Body, Button, Sheet } from '@/components/primitives';
import { SheetSection, ToggleRow } from '../sheets/parts/Form';
import { useLauncherUi } from './LauncherUiContext';

/**
 * «Pila di widget» (REP-20261007-037), as «Modifica pila» of One UI: the widgets of the stack
 * in order, each with «Togli dalla pila» (it goes back on the page), and the automatic
 * rotation. A stack left with one widget becomes that widget again.
 */
export function StackSheet({
  open,
  onClose,
  pageId,
  stackId,
  placement,
}: {
  open: boolean;
  onClose: () => void;
  pageId: string;
  stackId: string;
  /** Size and page of the stack in edit mode, as for a widget (REP-20261008-001). */
  placement?: ReactNode;
}) {
  const ui = useLauncherUi();
  const { controller } = ui;
  const stack = controller.layout.stacks?.[stackId];
  return (
    <Sheet
      open={open && Boolean(stack)}
      onClose={onClose}
      title="Pila di widget"
      description="I widget si scorrono col dito nello stesso posto."
      footer={
        <Button variant="primary" size="md" onClick={onClose}>
          Fatto
        </Button>
      }
    >
      {stack && (
        <div className="aca-settings">
          {placement}
          <SheetSection title="Widget nella pila">
            <ul className="aca-stack-sheet__list">
              {stack.ids.map((id) => {
                const name = ui.widgetName(pageId, id);
                return (
                  <li key={id} className="aca-stack-sheet__row">
                    <Body as="span" size="md" tone="ink">
                      {name}
                    </Body>
                    <Button
                      variant="secondary"
                      size="md"
                      className="aca-frame-pill"
                      aria-label={`Togli ${name} dalla pila`}
                      onClick={() => {
                        const last = stack.ids.length <= 2;
                        controller.unstackWidget(pageId, stackId, id);
                        ui.announce(`${name} tolto dalla pila.`);
                        if (last) onClose();
                      }}
                    >
                      Togli dalla pila
                    </Button>
                  </li>
                );
              })}
            </ul>
          </SheetSection>
          <SheetSection title="Rotazione">
            <ToggleRow
              label="Rotazione automatica"
              hint="Ogni dieci secondi passa al widget successivo, quando la pagina è visibile."
              checked={stack.rotate === true}
              onChange={(rotate) => controller.setStackRotate(stackId, rotate)}
            />
          </SheetSection>
        </div>
      )}
    </Sheet>
  );
}
