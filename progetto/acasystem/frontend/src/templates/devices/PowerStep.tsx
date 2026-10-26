import { useState } from 'react';
import { Body, Button, Field } from '@/components/primitives';
import type { PowerSetupBody, PowerStatusDto } from '@/@types/devices';
import { setupPower, toDeviceError } from '@/api/devicesApi';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { FormRow, InlineConfirm, Notice, SheetSection } from '../sheets/parts/Form';
import { broadcastFor, deviceTexts, isValidIpv4, isValidMac } from './deviceTexts';

/** The only fields of the request the screen can point at. */
const ADMIN_FIELDS = new Set(['mac', 'broadcastAddress', 'broadcastPort']);

/**
 * Power-on from off (D1e, D-D5): the server writes an automation in Home Assistant that sends the
 * wake-up packet when the TV is asked to turn on. A customer only taps «Attiva l'accensione» and
 * sends an empty body: the MAC comes from Home Assistant, and when it has none the server says the
 * installer must give it. An administrator can write the MAC and, under «Avanzate», the broadcast
 * address (proposed from the address of the TV just typed, in memory only) and the port. The MAC
 * is never shown again after it is sent: the server does not return it.
 */
export function PowerStep({
  entryId,
  mediaPlayerEntityId,
  isAdmin,
  typedHost,
  onFinished,
}: {
  entryId: string;
  mediaPlayerEntityId: string | null;
  isAdmin: boolean;
  /** The address typed in the first step; used only to propose the broadcast address. */
  typedHost: string | null;
  onFinished: () => void;
}) {
  const runtime = useWidgetRuntime();
  const [mac, setMac] = useState('');
  const [advanced, setAdvanced] = useState(false);
  const [broadcast, setBroadcast] = useState(() =>
    typedHost ? (broadcastFor(typedHost) ?? '') : ''
  );
  const [port, setPort] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [retryable, setRetryable] = useState(false);
  const [result, setResult] = useState<PowerStatusDto | null>(null);
  const [asking, setAsking] = useState(false);
  const [trial, setTrial] = useState<'idle' | 'sent' | 'failed'>('idle');

  const submit = () => {
    if (busy) return;
    const body: PowerSetupBody = {};
    const found: Record<string, string> = {};
    if (isAdmin) {
      if (mac.trim()) {
        if (isValidMac(mac)) body.mac = mac.trim();
        else found.mac = deviceTexts.powerMacInvalid;
      }
      if (advanced) {
        if (broadcast.trim()) {
          if (isValidIpv4(broadcast)) body.broadcastAddress = broadcast.trim();
          else found.broadcastAddress = deviceTexts.powerBroadcastInvalid;
        }
        if (port.trim()) {
          const number = Number(port);
          if (/^\d{1,5}$/.test(port.trim()) && number >= 1 && number <= 65535) {
            body.broadcastPort = number;
          } else {
            found.broadcastPort = deviceTexts.powerPortInvalid;
          }
        }
      }
    }
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setBusy(true);
    setProblem(null);
    setRetryable(false);
    setupPower(entryId, body)
      .then(setResult)
      .catch((failure: unknown) => {
        const info = toDeviceError(failure);
        const field =
          info.code === 'INVALID_INPUT' && info.field && ADMIN_FIELDS.has(info.field)
            ? info.field
            : null;
        if (field) setErrors({ [field]: info.message });
        else setProblem(info.message);
        setRetryable(info.code === 'ENTRY_NOT_READY' || info.status === 0 || info.status === 504);
      })
      .finally(() => setBusy(false));
  };

  const tryTurnOn = () => {
    setAsking(false);
    if (!mediaPlayerEntityId) return;
    Promise.resolve(
      runtime.callService('media_player', 'turn_on', { entity_id: mediaPlayerEntityId })
    ).then(
      () => setTrial('sent'),
      () => setTrial('failed')
    );
  };

  if (result) {
    const works = result.active === true;
    return (
      <div className="aca-device-flow">
        <SheetSection title={deviceTexts.powerTitle}>
          <Notice tone={works ? 'success' : 'danger'}>
            {works ? deviceTexts.powerWorks : (result.message ?? deviceTexts.powerInactive)}
          </Notice>
          {works && !asking && (
            <Button variant="control" size="md" onClick={() => setAsking(true)}>
              {deviceTexts.powerTry}
            </Button>
          )}
          {asking && (
            <InlineConfirm
              message={deviceTexts.powerTryAsk}
              confirmLabel={deviceTexts.powerTryConfirm}
              onConfirm={tryTurnOn}
              onCancel={() => setAsking(false)}
            />
          )}
          {trial === 'sent' && <Notice>{deviceTexts.powerTrySent}</Notice>}
          {trial === 'failed' && <Notice tone="danger">{deviceTexts.powerTryFailed}</Notice>}
        </SheetSection>
        <div className="aca-device-actions">
          <Button variant="primary" size="md" onClick={onFinished}>
            {deviceTexts.next}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="aca-device-flow">
      <SheetSection title={deviceTexts.powerTitle}>
        <Body size="sm">{deviceTexts.powerGuide}</Body>
        {problem && <Notice tone="danger">{problem}</Notice>}

        {isAdmin && (
          <>
            <FormRow label={deviceTexts.powerMacLabel} hint={deviceTexts.powerMacHint}>
              {({ labelId, hintId }) => (
                <Field
                  label={deviceTexts.powerMacLabel}
                  aria-labelledby={labelId}
                  {...(hintId ? { 'aria-describedby': hintId } : {})}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="02:00:00:00:00:01"
                  value={mac}
                  disabled={busy}
                  {...(errors.mac ? { error: errors.mac } : {})}
                  onChange={(event) => setMac(event.target.value)}
                />
              )}
            </FormRow>
            <Button
              variant="control"
              size="md"
              aria-expanded={advanced}
              onClick={() => setAdvanced((open) => !open)}
            >
              {deviceTexts.powerAdvanced}
            </Button>
            {advanced && (
              <>
                <FormRow label={deviceTexts.powerBroadcastLabel}>
                  {({ labelId }) => (
                    <Field
                      label={deviceTexts.powerBroadcastLabel}
                      aria-labelledby={labelId}
                      autoComplete="off"
                      spellCheck={false}
                      inputMode="decimal"
                      value={broadcast}
                      disabled={busy}
                      {...(errors.broadcastAddress ? { error: errors.broadcastAddress } : {})}
                      onChange={(event) => setBroadcast(event.target.value)}
                    />
                  )}
                </FormRow>
                <FormRow label={deviceTexts.powerPortLabel}>
                  {({ labelId }) => (
                    <Field
                      label={deviceTexts.powerPortLabel}
                      aria-labelledby={labelId}
                      autoComplete="off"
                      inputMode="numeric"
                      value={port}
                      disabled={busy}
                      {...(errors.broadcastPort ? { error: errors.broadcastPort } : {})}
                      onChange={(event) => setPort(event.target.value)}
                    />
                  )}
                </FormRow>
              </>
            )}
          </>
        )}
      </SheetSection>

      <div className="aca-device-actions">
        <Button variant="secondary" size="md" disabled={busy} onClick={onFinished}>
          {deviceTexts.skip}
        </Button>
        <Button variant="primary" size="md" loading={busy} onClick={submit}>
          {problem && retryable ? deviceTexts.retry : deviceTexts.powerEnable}
        </Button>
      </div>
    </div>
  );
}
