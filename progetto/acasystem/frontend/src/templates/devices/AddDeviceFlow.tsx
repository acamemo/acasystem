import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Body, Button, Caption, Heading, Skeleton } from '@/components/primitives';
import { useOptionalWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { identifyActionFor } from '@/utils/devices/identify';
import type { EntryDto } from '@/@types/devices';
import { Notice } from '../sheets/parts/Form';
import { CatalogStep } from './CatalogStep';
import { deviceTexts, HANDLER_HINTS } from './deviceTexts';
import { FlowFormStep } from './FlowFormStep';
import { ExternalStep, MenuStep, ProgressStep } from './FlowOtherSteps';
import { NameRoomStep } from './NameRoomStep';
import { PairingStep } from './PairingStep';
import { PowerStep } from './PowerStep';
import { useDeviceFlow, type DeviceKind } from './useDeviceFlow';
import { useEntityPresence } from './useEntityPresence';
import './devices.css';

export interface AddDeviceFlowProps {
  kind: DeviceKind;
  /**
   * The device is added and its media player is in the live data (or the wait is over): the
   * entity id to link, or null when Home Assistant has not shown one.
   */
  onDone: (mediaPlayerEntityId: string | null) => void;
  /** The person left; an open flow has been cancelled. */
  onExit: () => void;
  /** A flow Home Assistant opened by itself (a discovery): it is taken over, no catalogue. */
  discoveredFlowId?: string | null;
  /** The device is added and shown in the live data: the whole entry, for any family. */
  onEntryDone?: (entry: EntryDto) => void;
}

/**
 * «Aggiungi un dispositivo» (REQ-18, D1): the whole way from the choice of the integration to the
 * device linked to the widget, drawn from what the server returns at each step (ADR-0021). It
 * lives inside the sheet that opened it, with its own buttons; it never opens a second dialog.
 * Order after the entry is created: name and room, power-on from off, then the end.
 */
export function AddDeviceFlow({
  kind,
  onDone,
  onExit,
  discoveredFlowId = null,
  onEntryDone,
}: AddDeviceFlowProps) {
  const flow = useDeviceFlow(kind, onExit, discoveredFlowId);
  const discovered = discoveredFlowId !== null;
  const { state } = flow;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [stage, setStage] = useState('');

  const entry = state.created?.entry ?? null;
  // A TV waits for its media player; the other families are ready as soon as the entry is loaded.
  const ready = Boolean(entry?.loaded && (kind !== 'tv' || entry.mediaPlayerEntityId));

  const title =
    state.phase === 'form' && state.form
      ? state.form.title
      : state.step && (state.phase === 'menu' || state.phase === 'progress' || state.phase === 'external')
        ? state.step.title
        : state.phase === 'created' && ready
        ? stageTitle(stage)
        : deviceTexts.addDevice;

  // The focus follows the step, so a screen reader announces where the person is.
  const stepKey = `${state.phase}:${state.form?.stepId ?? state.step?.stepId ?? ''}:${stage}`;
  useEffect(() => {
    headingRef.current?.focus();
  }, [stepKey]);

  const exitRow = (extra?: ReactNode) => (
    <div className="aca-device-actions">
      <Button variant="secondary" size="md" disabled={state.busy} onClick={flow.exit}>
        {deviceTexts.exit}
      </Button>
      {extra}
    </div>
  );

  let body: ReactNode;
  switch (state.phase) {
    case 'checking':
      body = (
        <Skeleton
          rows={3}
          label={discovered ? deviceTexts.discoveredLoading : deviceTexts.checking}
        />
      );
      break;

    case 'unavailable':
      body = (
        <div className="aca-device-flow">
          <Notice tone="danger">{state.message ?? deviceTexts.featureUnavailable}</Notice>
          {exitRow()}
        </div>
      );
      break;

    case 'blocked':
      body = (
        <div className="aca-device-flow">
          <Notice tone="danger">{state.message ?? deviceTexts.unsupportedStep}</Notice>
          {exitRow()}
        </div>
      );
      break;

    case 'resume': {
      const conflict = state.openFlow?.conflict === true;
      body = (
        <div className="aca-device-flow">
          <Notice>{conflict ? deviceTexts.conflictFlow : deviceTexts.pendingFlow}</Notice>
          {!conflict && <Caption as="p">{deviceTexts.pendingFlowHint}</Caption>}
          <div className="aca-device-actions">
            <Button variant="secondary" size="md" disabled={state.busy} onClick={flow.discardOpen}>
              {deviceTexts.cancel}
            </Button>
            <Button variant="primary" size="md" loading={state.busy} onClick={flow.resume}>
              {conflict ? deviceTexts.continueFlow : deviceTexts.resume}
            </Button>
          </div>
        </div>
      );
      break;
    }

    case 'catalog':
      body = (
        <CatalogStep
          kind={kind}
          busy={state.busy}
          onStart={flow.start}
          onExit={flow.exit}
        />
      );
      break;

    case 'form': {
      const form = state.form;
      if (!form) {
        body = null;
        break;
      }
      const extra = state.formError
        ? { field: state.formError.field, message: state.formError.message }
        : null;
      body =
        form.waitSeconds !== null ? (
          <PairingStep
            form={form}
            busy={state.busy}
            extraError={extra}
            onSubmit={() => flow.answer({})}
            onExit={flow.exit}
          />
        ) : (
          <FlowFormStep
            key={`${form.flowId}:${form.stepId}`}
            form={form}
            busy={state.busy}
            extraError={extra}
            onSubmit={flow.answer}
            onExit={flow.exit}
          />
        );
      break;
    }

    case 'menu': {
      const step = state.step;
      body =
        step?.type === 'menu' ? (
          <MenuStep
            key={`${step.flowId}:${step.stepId}`}
            step={step}
            busy={state.busy}
            error={state.formError?.message ?? null}
            onChoose={(id) => flow.answer({ next_step_id: id })}
            onExit={flow.exit}
          />
        ) : null;
      break;
    }

    case 'progress': {
      const step = state.step;
      body =
        step?.type === 'progress' ? <ProgressStep step={step} onExit={flow.exit} /> : null;
      break;
    }

    case 'external': {
      const step = state.step;
      body =
        step?.type === 'external' ? (
          <ExternalStep key={`${step.flowId}:${step.stepId}`} step={step} onExit={flow.exit} />
        ) : null;
      break;
    }

    case 'aborted': {
      const alreadyThere = state.abort?.reason === 'already_configured';
      body = (
        <div className="aca-device-flow">
          <Notice tone="danger">{state.abort?.message ?? deviceTexts.unsupportedStep}</Notice>
          <div className="aca-device-actions">
            {alreadyThere ? (
              <Button variant="primary" size="md" onClick={flow.exit}>
                {deviceTexts.backToChoice}
              </Button>
            ) : (
              <>
                <Button variant="secondary" size="md" onClick={flow.exit}>
                  {deviceTexts.exit}
                </Button>
                {!discovered && (
                  <Button variant="primary" size="md" onClick={flow.restart}>
                    {deviceTexts.restart}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      );
      break;
    }

    case 'failed': {
      const failure = state.failure;
      body = (
        <div className="aca-device-flow">
          <Notice tone="danger">{failure?.error.message ?? deviceTexts.unsupportedStep}</Notice>
          <div className="aca-device-actions">
            <Button variant="secondary" size="md" onClick={flow.exit}>
              {deviceTexts.exit}
            </Button>
            {failure?.canRestart && !discovered && (
              <Button variant="primary" size="md" onClick={flow.restart}>
                {deviceTexts.restart}
              </Button>
            )}
            {failure?.canRetry && (
              <Button variant="primary" size="md" onClick={flow.retry}>
                {deviceTexts.retry}
              </Button>
            )}
          </div>
        </div>
      );
      break;
    }

    case 'created':
      body =
        entry && ready ? (
          <CreatedStages
            key={entry.entryId}
            entry={entry}
            kind={kind}
            isAdmin={state.status?.user.isAdmin === true}
            typedHost={flow.typedHost()}
            onStage={setStage}
            onDone={onDone}
            {...(onEntryDone ? { onEntryDone } : {})}
          />
        ) : (
          <div className="aca-device-flow">
            <Notice>{entry?.message ?? deviceTexts.entryPending}</Notice>
            {exitRow(
              <Button variant="primary" size="md" loading={state.busy} onClick={flow.refreshEntry}>
                {deviceTexts.retry}
              </Button>
            )}
          </div>
        );
      break;
  }

  return (
    <div className="aca-device-flow" data-device-phase={state.phase}>
      <div className="aca-device-flow__head">
        <Heading level={3} size="md" ref={headingRef} tabIndex={-1}>
          {title}
        </Heading>
        {state.phase === 'form' && state.form && state.form.waitSeconds === null && (
          <Caption as="p">
            {state.form.description ?? HANDLER_HINTS[state.form.handler] ?? null}
          </Caption>
        )}
      </div>
      {body}
    </div>
  );
}

const stageTitle = (stage: string): string => {
  switch (stage) {
    case 'name':
      return deviceTexts.added;
    case 'power':
      return deviceTexts.powerTitle;
    default:
      return deviceTexts.added;
  }
};

/** Name and room, power-on from off, then the end: each only when it applies. */
function CreatedStages({
  entry,
  kind,
  isAdmin,
  typedHost,
  onStage,
  onDone,
  onEntryDone,
}: {
  entry: EntryDto;
  kind: DeviceKind;
  isAdmin: boolean;
  typedHost: string | null;
  onStage: (stage: string) => void;
  onDone: (mediaPlayerEntityId: string | null) => void;
  onEntryDone?: (entry: EntryDto) => void;
}) {
  const runtime = useOptionalWidgetRuntime();
  const [nameDone, setNameDone] = useState(false);
  const [powerDone, setPowerDone] = useState(false);
  const needsName = entry.device !== null && !nameDone;
  const needsPower = !needsName && entry.power !== null && !entry.power.configured && !powerDone;
  const stage = needsName ? 'name' : needsPower ? 'power' : 'done';

  useEffect(() => {
    onStage(stage);
  }, [onStage, stage]);

  if (needsName && entry.device) {
    return (
      <NameRoomStep
        device={entry.device}
        {...(kind === 'tv' ? {} : { proposal: entry.device.name })}
        identify={runtime ? identifyActionFor(entry.entities, runtime.entities) : null}
        onFinished={() => setNameDone(true)}
      />
    );
  }
  if (needsPower) {
    return (
      <PowerStep
        entryId={entry.entryId}
        mediaPlayerEntityId={entry.mediaPlayerEntityId}
        isAdmin={isAdmin}
        typedHost={typedHost}
        onFinished={() => setPowerDone(true)}
      />
    );
  }
  return <DonePanel entry={entry} onDone={onDone} {...(onEntryDone ? { onEntryDone } : {})} />;
}

/** The end: the device is added; «Fine» links it once its entity is in the live data. */
function DonePanel({
  entry,
  onDone,
  onEntryDone,
}: {
  entry: EntryDto;
  onDone: (mediaPlayerEntityId: string | null) => void;
  onEntryDone?: (entry: EntryDto) => void;
}) {
  const presence = useEntityPresence(entry.mediaPlayerEntityId ?? entry.entities[0] ?? null);
  return (
    <div className="aca-device-flow">
      <Notice tone="success">{deviceTexts.added}</Notice>
      <Body size="sm">{entry.device?.name ?? entry.title}</Body>
      {presence === 'waiting' && (
        <Caption as="p" role="status">
          {deviceTexts.entityAppearing}
        </Caption>
      )}
      {presence === 'late' && (
        <Caption as="p" role="status">
          {deviceTexts.entityLate}
        </Caption>
      )}
      <div className="aca-device-actions">
        <Button
          variant="primary"
          size="md"
          loading={presence === 'waiting'}
          onClick={() => {
            onDone(entry.mediaPlayerEntityId);
            onEntryDone?.(entry);
          }}
        >
          {deviceTexts.done}
        </Button>
      </div>
    </div>
  );
}
