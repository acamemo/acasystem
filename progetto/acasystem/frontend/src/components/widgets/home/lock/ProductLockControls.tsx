import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Button, ConfirmSheet, Field, Icon, Sheet } from '@/components/primitives';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { useServiceCatalog } from '../../adaptive/useServiceCatalog';
import { CommandFeedback } from '../../controls/shared/CommandFeedback';
import { useTrackedCommand } from '../../controls/shared/useTrackedCommand';
import {
  lockActionAllowed,
  lockActionLabel,
  lockActionSupported,
  lockActionTarget,
  lockPrimaryAction,
  productLockView,
  type ProductLockAction,
} from './productLockModel';

/** The secret lives only in the native input and the transient HA request, never in a retained Sheet frame. */
function LockCodeQuestion({
  open,
  title,
  label,
  confirmLabel,
  danger,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  label: string;
  confirmLabel: string;
  danger: boolean;
  onConfirm: (code: string) => void;
  onCancel: () => void;
}) {
  const input = useRef<HTMLInputElement>(null),
    [ready, setReady] = useState(false);
  const clear = () => {
    if (input.current) input.current.value = '';
    setReady(false);
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
    const code = input.current?.value ?? '';
    if (!code.length) return;
    clear();
    onConfirm(code);
  };
  return (
    <Sheet
      open={open}
      onClose={cancel}
      title={title}
      className="aca-confirm product-lock-confirm"
      footer={
        <>
          <Button variant="secondary" onClick={cancel}>
            Annulla
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} disabled={!ready} onClick={submit}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <Field
        ref={input}
        label={`Codice di ${label}`}
        type="password"
        inputMode="text"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        defaultValue=""
        data-autofocus=""
        onChange={(event) => setReady(event.target.value.length > 0)}
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

type Question = { action: ProductLockAction; entityId: string; codeFormat: string | null };
export function ProductLockControls({
  entityId,
  label,
  disabled = false,
  compact = false,
}: {
  entityId: string;
  label: string;
  disabled?: boolean;
  compact?: boolean;
}) {
  const runtime = useWidgetRuntime(),
    services = useServiceCatalog(),
    view = productLockView(runtime.entities[entityId]);
  const command = useTrackedCommand(view.state, undefined, 30000);
  const [question, setQuestion] = useState<Question | null>(null),
    activeQuestion = useRef<Question | null>(null),
    lastQuestion = useRef<Question | null>(null),
    sending = useRef(false);
  const blocked =
    disabled ||
    !runtime.entitiesLoaded ||
    !runtime.conn ||
    runtime.conn.connected === false ||
    !view.available;
  const cancel = () => {
    activeQuestion.current = null;
    setQuestion(null);
  };
  useLayoutEffect(() => {
    if (
      question &&
      (blocked ||
        question.entityId !== entityId ||
        question.codeFormat !== view.codeFormat ||
        !lockActionAllowed(view, services, question.action))
    ) {
      activeQuestion.current = null;
      setQuestion(null);
    }
  }, [
    blocked,
    entityId,
    question,
    services,
    view,
  ]);
  useEffect(() => {
    if (!command.pending) sending.current = false;
  }, [command.pending]);
  const send = (action: ProductLockAction, code?: string) => {
    if (
      blocked ||
      sending.current ||
      command.pending ||
      !lockActionAllowed(view, services, action) ||
      (view.requiresCode && !code?.length)
    )
      return;
    sending.current = true;
    command.run(lockActionTarget(action), 'lock', action, {
      entity_id: entityId,
      ...(view.requiresCode ? { code } : {}),
    });
  };
  const request = (action: ProductLockAction) => {
    if (blocked || sending.current || command.pending || !lockActionAllowed(view, services, action))
      return;
    if (action === 'lock' && !view.requiresCode) {
      send(action);
      return;
    }
    const next = { action, entityId, codeFormat: view.codeFormat };
    activeQuestion.current = next;
    lastQuestion.current = next;
    setQuestion(next);
  };
  const confirm = (code?: string) => {
    const current = activeQuestion.current;
    cancel();
    if (!current || current.entityId !== entityId || current.codeFormat !== view.codeFormat) return;
    send(current.action, code);
  };
  const shown = question ?? lastQuestion.current,
    action = shown?.action ?? 'unlock',
    title = `${lockActionLabel(action)} ${label}?`,
    needsCode = typeof shown?.codeFormat === 'string' && shown.codeFormat.length > 0;
  const primary = lockPrimaryAction(view),
    actions = compact ? (primary ? [primary] : []) : (['lock', 'unlock', 'open'] as const);
  return (
    <div className="product-lock-controls" data-compact={compact || undefined}>
      <div
        className="product-lock-controls__actions"
        role="group"
        aria-label={`Comandi di ${label}`}
      >
        {actions
          .filter((item) => lockActionSupported(view, services, item))
          .map((item) => (
            <Button
              key={item}
              variant="control"
              size="sm"
              shape={compact ? 'circle' : 'pill'}
              aria-label={`${lockActionLabel(item)} ${label}`}
              aria-busy={command.pending || undefined}
              disabled={blocked || command.pending || !lockActionAllowed(view, services, item)}
              onClick={() => request(item)}
            >
              <Icon name={item === 'lock' ? 'lock' : item === 'unlock' ? 'unlock' : 'key'} />
              {!compact && <span>{lockActionLabel(item)}</span>}
            </Button>
          ))}
      </div>
      <CommandFeedback
        message={command.message}
        pendingText={
          !compact && command.pending
            ? `Richiesto · ${productLockView({ ...runtime.entities[entityId]!, state: command.value ?? '' }).stateLabel}`
            : null
        }
      />
      <ConfirmSheet
        open={!!question && !needsCode}
        title={title}
        confirmLabel={lockActionLabel(action)}
        danger={action !== 'lock'}
        onConfirm={() => confirm()}
        onCancel={cancel}
      />
      <LockCodeQuestion
        open={!!question && needsCode}
        title={title}
        label={label}
        confirmLabel={lockActionLabel(action)}
        danger={action !== 'lock'}
        onConfirm={confirm}
        onCancel={cancel}
      />
    </div>
  );
}
