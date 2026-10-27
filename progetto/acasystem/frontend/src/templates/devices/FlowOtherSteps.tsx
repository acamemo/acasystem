import { Body, Button, Caption, Icon, Skeleton } from '@/components/primitives';
import type { FlowExternalDto, FlowMenuDto, FlowProgressDto } from '@/@types/devices';
import { Notice } from '../sheets/parts/Form';
import { deviceTexts } from './deviceTexts';

/**
 * The steps of a flow that are not a form (F4): a menu of ways to go on, a wait while Home
 * Assistant works, and the page of the maker where the person logs in. The texts come from the
 * server in Italian; the screens only add the buttons.
 */

/** A menu: one row per option; the answer is the id of the chosen one. */
export function MenuStep({
  step,
  busy,
  error,
  onChoose,
  onExit,
}: {
  step: FlowMenuDto;
  busy: boolean;
  error: string | null;
  onChoose: (id: string) => void;
  onExit: () => void;
}) {
  return (
    <div className="aca-device-flow">
      {error && <Notice tone="danger">{error}</Notice>}
      {step.description && <Caption as="p">{step.description}</Caption>}
      <ul className="aca-pick__list">
        {step.options.map((option) => (
          <li key={option.id}>
            <Button
              variant="control"
              size="sm"
              className="aca-pick-row"
              contentClassName="aca-pick-row__content"
              disabled={busy}
              onClick={() => onChoose(option.id)}
            >
              <span className="aca-pick-row__text">
                <Body as="span" size="sm" className="aca-pick-row__title">
                  {option.label}
                </Body>
              </span>
              <Icon name="chevronRight" size="md" />
            </Button>
          </li>
        ))}
      </ul>
      <div className="aca-device-actions">
        <Button variant="secondary" size="md" disabled={busy} onClick={onExit}>
          {deviceTexts.exit}
        </Button>
      </div>
    </div>
  );
}

/** A wait: Home Assistant is working (searching, connecting). The screen goes on by itself. */
export function ProgressStep({
  step,
  onExit,
}: {
  step: FlowProgressDto;
  onExit: () => void;
}) {
  return (
    <div className="aca-device-flow aca-device-pairing" aria-busy="true">
      <Skeleton rows={2} label={deviceTexts.progressWaiting} />
      <Body role="status" aria-live="polite" className="aca-device-pairing__text">
        {step.description}
      </Body>
      <div className="aca-device-actions">
        <Button variant="secondary" size="md" onClick={onExit}>
          {deviceTexts.exit}
        </Button>
      </div>
    </div>
  );
}

/**
 * The page of the maker (an account on its site, OAuth). It opens in a new window; in the apps for
 * Windows and Android the shell sends it to the system browser. Meanwhile the flow is read until
 * Home Assistant has the answer, and the screen goes on by itself.
 */
export function ExternalStep({
  step,
  onExit,
}: {
  step: FlowExternalDto;
  onExit: () => void;
}) {
  const open = () => {
    window.open(step.url, '_blank', 'noopener,noreferrer');
  };
  return (
    <div className="aca-device-flow">
      <Body>{step.description}</Body>
      <div className="aca-device-actions">
        <Button variant="secondary" size="md" onClick={onExit}>
          {deviceTexts.exit}
        </Button>
        <Button variant="primary" size="md" onClick={open}>
          {deviceTexts.openMakerPage}
        </Button>
      </div>
      <Caption as="p" role="status">
        {deviceTexts.externalWaiting}
      </Caption>
    </div>
  );
}
