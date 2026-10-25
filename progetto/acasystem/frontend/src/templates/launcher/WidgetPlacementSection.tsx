import { useState } from 'react';
import { Body, Button, Caption, Icon, Numeric, type IconName } from '@/components/primitives';
import { pagePlacements } from '@/utils/launcher/layout';
import { COVER_LABEL } from '@/utils/launcher/pager';
import { displayLabel } from '@/utils/launcher/pageIdentity';
import { SheetSection } from '../sheets/parts/Form';
import { useLauncherUi } from './LauncherUiContext';

/**
 * A step of the size or of the page; `blocked` is why it cannot be taken now (null: it can).
 * Taken, it returns what happened, shown in the sheet.
 */
interface Step {
  icon: IconName;
  label: string;
  blocked: string | null;
  onStep: () => string;
}

/**
 * A round 44 px control. A step that cannot be taken stays focusable with aria-disabled and
 * shows its reason when pressed, instead of disappearing from the keyboard.
 */
function StepButton({ step, show }: { step: Step; show: (text: string) => void }) {
  return (
    <Button
      variant="control"
      size="md"
      shape="circle"
      aria-label={step.label}
      title={step.blocked ?? step.label}
      aria-disabled={step.blocked ? true : undefined}
      onClick={() => show(step.blocked ?? step.onStep())}
    >
      <Icon name={step.icon} size="md" />
    </Button>
  );
}

/**
 * «Dimensione» and «Pagina» of a widget in its settings (REP-20261008-001): the single-tap
 * alternative to dragging the dots of its frame and to dragging it onto another page
 * (WCAG 2.5.7). The steps are the ones of the keyboard (stepWidget, moveToAdjacentPage); the
 * sheet follows the widget when it changes page. What a step did, or why it cannot be taken,
 * is shown under its section in a live region of the sheet: the modal sheet makes the
 * launcher's own announcements inert.
 */
export function WidgetPlacementSection({
  pageId,
  widgetId,
  onPageChange,
}: {
  pageId: string;
  widgetId: string;
  onPageChange: (pageId: string) => void;
}) {
  const ui = useLauncherUi();
  const { controller } = ui;
  const [status, setStatus] = useState<{ section: 'size' | 'page'; text: string } | null>(null);
  const page = controller.findPage(pageId);
  const rect = page ? pagePlacements(page, controller.classFor(pageId))[widgetId] : undefined;
  if (!rect) return null;
  const grid = controller.gridFor(pageId);
  const sizes = controller.sizesFor(pageId, widgetId);
  const min = sizes?.min ?? { w: 1, h: 1 };
  const max = sizes?.max ?? grid;
  const name = ui.widgetName(pageId, widgetId);
  // The label of the pager entry, from the page itself: the entries are not in the controller
  // of the widgets (REP-20261012-003).
  const labelOf = (id: string) => {
    const target = controller.findPage(id);
    if (!target) return '';
    return target.kind === 'cover' ? COVER_LABEL : displayLabel(target.label);
  };
  const pageName = labelOf(pageId);

  const resize = (dx: number, dy: number) => ui.stepWidget(pageId, widgetId, 'resize', dx, dy);
  /**
   * Why the widget cannot grow: it spans the whole page that way (no move helps), its largest
   * size, or no room left before the page edge.
   */
  const grow = (size: number, span: number, limit: number, room: number, what: string) =>
    size >= span
      ? `Occupa già tutte le ${what === 'Larghezza' ? 'colonne' : 'righe'} di questa pagina.`
      : size >= limit
        ? `${what} massima per questo widget.`
        : room > 0
          ? null
          : 'Bordo della pagina: spostalo prima per ingrandirlo.';
  const rows: { label: string; value: number; steps: [Step, Step] }[] = [
    {
      label: 'Larghezza',
      value: rect.w,
      steps: [
        {
          icon: 'minus',
          label: 'Riduci larghezza',
          blocked: rect.w <= min.w ? 'Larghezza minima per questo widget.' : null,
          onStep: () => resize(-1, 0),
        },
        {
          icon: 'add',
          label: 'Aumenta larghezza',
          blocked: grow(rect.w, grid.w, max.w, grid.w - rect.x - rect.w, 'Larghezza'),
          onStep: () => resize(1, 0),
        },
      ],
    },
    {
      label: 'Altezza',
      value: rect.h,
      steps: [
        {
          icon: 'minus',
          label: 'Riduci altezza',
          blocked: rect.h <= min.h ? 'Altezza minima per questo widget.' : null,
          onStep: () => resize(0, -1),
        },
        {
          icon: 'add',
          label: 'Aumenta altezza',
          blocked: grow(rect.h, grid.h, max.h, grid.h - rect.y - rect.h, 'Altezza'),
          onStep: () => resize(0, 1),
        },
      ],
    },
  ];
  const toPage = (direction: -1 | 1): Step => ({
    icon: direction < 0 ? 'chevronLeft' : 'chevronRight',
    label: direction < 0 ? 'Sposta nella pagina precedente' : 'Sposta nella pagina successiva',
    blocked: ui.hasAdjacentPage(pageId, direction) ? null : 'Nessuna pagina in questa direzione.',
    onStep: () => {
      const next = ui.moveToAdjacentPage(pageId, widgetId, direction);
      if (!next) {
        return `Nella pagina ${direction < 0 ? 'precedente' : 'successiva'} non c’è spazio per questo widget.`;
      }
      onPageChange(next);
      return `Spostato nella pagina ${labelOf(next)}.`;
    },
  });
  const show = (section: 'size' | 'page') => (text: string) => setStatus({ section, text });
  /** The live region of a section: empty until one of its steps is pressed. */
  const statusOf = (section: 'size' | 'page') => (
    <Caption as="p" role="status" className="aca-placement__status">
      {status?.section === section ? status.text : ''}
    </Caption>
  );

  return (
    <>
      <SheetSection
        title="Dimensione"
        description="Puoi anche trascinare i pallini sul bordo o toccare una cella libera."
      >
        {rows.map((row) => (
          <div
            key={row.label}
            className="aca-placement__row"
            role="group"
            aria-label={`${row.label} di ${name}`}
          >
            <Body as="span" size="md" tone="ink">
              {row.label}
            </Body>
            <span className="aca-placement__stepper">
              <StepButton step={row.steps[0]} show={show('size')} />
              <Caption as="span" tone="ink" className="aca-placement__value">
                <Numeric>{row.value}</Numeric> {row.value === 1 ? 'quadrato' : 'quadrati'}
              </Caption>
              <StepButton step={row.steps[1]} show={show('size')} />
            </span>
          </div>
        ))}
        {statusOf('size')}
      </SheetSection>
      <SheetSection title="Pagina">
        <div className="aca-placement__row" role="group" aria-label={`Pagina di ${name}`}>
          <StepButton step={toPage(-1)} show={show('page')} />
          <Body as="span" size="md" tone="ink" className="aca-placement__page">
            {pageName}
          </Body>
          <StepButton step={toPage(1)} show={show('page')} />
        </div>
        {statusOf('page')}
      </SheetSection>
    </>
  );
}
