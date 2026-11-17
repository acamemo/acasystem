import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Button, ConfirmSheet, Field, Icon, Sheet } from '@/components/primitives';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { useServiceCatalog } from '../../adaptive/useServiceCatalog';
import { CommandFeedback } from '../../controls/shared/CommandFeedback';
import { useTrackedCommand } from '../../controls/shared/useTrackedCommand';
import {
  PRODUCT_ALARM_ACTIONS,
  alarmActionAllowed,
  alarmActionSupported,
  alarmCodePolicy,
  alarmPolicyKey,
  productAlarmStateLabel,
  productAlarmView,
  type AlarmCodePolicy,
  type ProductAlarmAction,
} from './productAlarmModel';

/** Uncontrolled password: no secret in React state or the Sheet's retained exit frame. */
function AlarmCodeQuestion({
  open,
  title,
  label,
  action,
  policy,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  label: string;
  action: ProductAlarmAction;
  policy: AlarmCodePolicy;
  onConfirm: (code?: string) => void;
  onCancel: () => void;
}) {
  const input = useRef<HTMLInputElement>(null),
    [filled, setFilled] = useState(false);
  const clear = () => {
    if (input.current) input.current.value = '';
    setFilled(false);
  };
  useLayoutEffect(() => {
    if (!open) clear();
  }, [open]);
  useLayoutEffect(
    () => () => {
      if (input.current) input.current.value = '';
    },
    []
  );
  const cancel = () => {
    clear();
    onCancel();
  };
  const submit = () => {
    const raw = input.current?.value ?? '';
    if (policy.required && !raw.length) return;
    clear();
    onConfirm(raw.length ? raw : undefined);
  };
  return (
    <Sheet
      open={open}
      onClose={cancel}
      title={title}
      className="aca-confirm product-alarm-confirm"
      footer={
        <>
          <Button variant="secondary" onClick={cancel}>
            Annulla
          </Button>
          <Button
            variant={action.key === 'disarm' ? 'danger' : 'primary'}
            disabled={policy.required && !filled}
            onClick={submit}
          >
            {action.label}
          </Button>
        </>
      }
    >
      <Field
        ref={input}
        label={`Codice${policy.required ? '' : ' (facoltativo)'} di ${label}`}
        type="password"
        inputMode={policy.mode}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        placeholder={policy.required ? 'Codice' : 'Codice (facoltativo)'}
        defaultValue=""
        data-autofocus=""
        onChange={(event) => setFilled(event.target.value.length > 0)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            submit();
          }
        }}
      />
    </Sheet>
  );
}
type Question = { action: ProductAlarmAction; entityId: string; policy: AlarmCodePolicy };
export function ProductAlarmControls({
  entityId,
  label,
  disabled = false,
}: {
  entityId: string;
  label: string;
  disabled?: boolean;
}) {
  const runtime = useWidgetRuntime(),
    services = useServiceCatalog(),
    view = productAlarmView(runtime.entities[entityId]);
  const arm = useTrackedCommand(view.state, undefined, 30000),
    disarm = useTrackedCommand(view.state, undefined, 30000);
  const [question, setQuestion] = useState<Question | null>(null),
    active = useRef<Question | null>(null),
    last = useRef<Question | null>(null);
  const sending = useRef({ arm: false, disarm: false });
  const latest = useRef({ runtime, services, disabled, entityId, arm, disarm });
  latest.current = { runtime, services, disabled, entityId, arm, disarm };
  const blocked =
    disabled ||
    runtime.editMode ||
    !runtime.entitiesLoaded ||
    !runtime.conn ||
    runtime.conn.connected === false ||
    !view.available;
  const cancel = () => {
    active.current = null;
    setQuestion(null);
  };
  useLayoutEffect(() => {
    if (
      question &&
      (blocked ||
        question.entityId !== entityId ||
        !alarmActionAllowed(view, services, question.action, arm.pending) ||
        alarmPolicyKey(question.policy) !== alarmPolicyKey(alarmCodePolicy(view, question.action)))
    )
      cancel();
  }, [
    blocked,
    entityId,
    question,
    services,
    view,
    arm.pending,
  ]);
  useEffect(() => {
    if (!arm.pending) sending.current.arm = false;
  }, [arm.pending]);
  useEffect(() => {
    if (!disarm.pending) sending.current.disarm = false;
  }, [disarm.pending]);
  const busy = (action: ProductAlarmAction) =>
    action.key === 'disarm'
      ? disarm.pending || sending.current.disarm
      : arm.pending || disarm.pending || sending.current.arm || sending.current.disarm;
  const request = (action: ProductAlarmAction) => {
    if (
      blocked ||
      active.current ||
      busy(action) ||
      !alarmActionAllowed(view, services, action, arm.pending)
    )
      return;
    const next = { action, entityId, policy: alarmCodePolicy(view, action) };
    active.current = next;
    last.current = next;
    setQuestion(next);
  };
  const confirm = (code?: string) => {
    const asked = active.current;
    cancel();
    if (!asked) return;
    const now = latest.current,
      observed = productAlarmView(now.runtime.entities[now.entityId]);
    const policy = alarmCodePolicy(observed, asked.action),
      kind = asked.action.key === 'disarm' ? 'disarm' : 'arm';
    const command = kind === 'disarm' ? now.disarm : now.arm;
    if (
      now.entityId !== asked.entityId ||
      now.disabled ||
      now.runtime.editMode ||
      !now.runtime.entitiesLoaded ||
      !now.runtime.conn ||
      now.runtime.conn.connected === false ||
      !alarmActionAllowed(observed, now.services, asked.action, now.arm.pending) ||
      alarmPolicyKey(policy) !== alarmPolicyKey(asked.policy) ||
      command.pending ||
      sending.current[kind] ||
      (kind === 'arm' && (now.disarm.pending || sending.current.disarm)) ||
      (policy.required && !code?.length)
    )
      return;
    sending.current[kind] = true;
    command.run(asked.action.target, 'alarm_control_panel', `alarm_${asked.action.key}`, {
      entity_id: now.entityId,
      ...(policy.prompt && code?.length ? { code } : {}),
    });
  };
  const shown = question ?? last.current;
  const action = shown?.action ?? PRODUCT_ALARM_ACTIONS[0];
  const policy: AlarmCodePolicy = shown?.policy ?? { prompt: false, required: false, mode: 'text' };
  const title = `${action.label} ${label}?`;
  return (
    <div className="product-alarm-controls">
      <div
        className="product-alarm-controls__actions"
        role="group"
        aria-label={`Comandi di ${label}`}
      >
        {PRODUCT_ALARM_ACTIONS.filter((item) => alarmActionSupported(view, services, item)).map(
          (item) => (
            <Button
              key={item.key}
              variant="control"
              size="sm"
              aria-label={`${item.label} ${label}`}
              disabled={
                blocked || busy(item) || !alarmActionAllowed(view, services, item, arm.pending)
              }
              onClick={() => request(item)}
            >
              <Icon name={item.key === 'disarm' ? 'unlock' : 'shield'} />
              <span>{item.label}</span>
            </Button>
          )
        )}
      </div>
      <CommandFeedback
        message={arm.message}
        pendingText={arm.pending ? `Richiesto · ${productAlarmStateLabel(arm.value)}` : null}
      />
      <CommandFeedback
        message={disarm.message}
        pendingText={disarm.pending ? 'Richiesto · Disinserito' : null}
      />
      <ConfirmSheet
        open={!!question && !policy.prompt}
        title={title}
        confirmLabel={action.label}
        danger={action.key === 'disarm'}
        onConfirm={() => confirm()}
        onCancel={cancel}
      />
      <AlarmCodeQuestion
        open={!!question && policy.prompt}
        title={title}
        label={label}
        action={action}
        policy={policy}
        onConfirm={confirm}
        onCancel={cancel}
      />
    </div>
  );
}
