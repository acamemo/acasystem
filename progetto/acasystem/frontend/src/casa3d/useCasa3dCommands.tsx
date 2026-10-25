/**
 * Binds the command path of the Casa 3D page (commandPath.ts) to the app (ADR-0014, T7): the call
 * of the widgets sends the command, the entity map of the app says what the devices show, and the
 * confirmation primitive of Acasystem asks. It gives back the `commands` for the adapter, the
 * dialog and the status line to render.
 *
 * Without the widget runtime (the test page, a unit test) there are no commands, so the adapter
 * stays read-only. The path is made in an effect and dropped with it: Strict Mode mounts twice and
 * the first path must not outlive its mount.
 *
 * TalkBack: the status line on screen is hidden from assistive technology and a visually hidden
 * live region says the same in words, for the end of a command only (sent and done, refused,
 * not confirmed, cancelled), so a swipe that sends several values is not read out step by step.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Body, ConfirmSheet, Surface } from '@/components/primitives';
import { useOptionalWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import type { Casa3dCommands } from './haShim';
import {
  createCommandPath,
  type CommandAnswer,
  type CommandOutcome,
  type CommandPath,
} from './commandPath';
import type { CommandQuestion } from './commandPolicy';

/** The line stays on screen this long after the end of a command. */
export const NOTICE_MS = 5000;

interface Notice {
  key: number;
  text: string;
  tone: 'info' | 'error';
  /** Said by the live region; the steps in between are only shown. */
  final: boolean;
}

/** The words of each step of a command. */
export function describeOutcome(outcome: CommandOutcome): Omit<Notice, 'key'> {
  const { label, message } = outcome;
  switch (outcome.status) {
    case 'sent':
      return { text: `${label}…`, tone: 'info', final: false };
    case 'confirmed':
      return { text: `${label}: fatto`, tone: 'info', final: true };
    case 'rejected':
      return {
        text: `${label}: Home Assistant ha rifiutato il comando${message ? ` (${message})` : ''}`,
        tone: 'error',
        final: true,
      };
    case 'unconfirmed':
      return {
        text: `${label}: inviato, ma il dispositivo non ha risposto`,
        tone: 'error',
        final: true,
      };
    case 'cancelled':
      return { text: `${label}: annullato`, tone: 'info', final: true };
    case 'refused':
      // The reason is for the log and the tests; the person is told in plain words.
      return { text: 'Questo comando non è abilitato in Casa 3D', tone: 'error', final: true };
  }
}

export interface Casa3dCommandsView {
  /** For the adapter; null while there is no runtime or the path is not made yet. */
  commands: Casa3dCommands | null;
  /** The confirmation dialog and the status line: render them anywhere inside the page. */
  overlay: ReactNode;
}

/**
 * @param isOpen the barrier of the page, read at every call: true only in Esplora, still, on screen.
 * @param active the same barrier as a render value: a question still open when it turns false is cancelled.
 */
export function useCasa3dCommands(isOpen: () => boolean, active: boolean): Casa3dCommandsView {
  const runtime = useOptionalWidgetRuntime();
  const hasRuntime = runtime !== null;
  // The latest data and call, read by the path without remaking it.
  const live = useRef({ entities: runtime?.entities ?? {}, callService: runtime?.callService });
  useEffect(() => {
    live.current = { entities: runtime?.entities ?? {}, callService: runtime?.callService };
  });
  const [path, setPath] = useState<CommandPath | null>(null);
  const [question, setQuestion] = useState<CommandQuestion | null>(null);
  const resolver = useRef<((answer: CommandAnswer) => void) | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const counter = useRef(0);

  const answer = useCallback((value: CommandAnswer) => {
    const resolve = resolver.current;
    resolver.current = null;
    setQuestion(null);
    resolve?.(value);
  }, []);

  useEffect(() => {
    if (!hasRuntime) return undefined;
    const made = createCommandPath({
      isOpen,
      getStates: () => live.current.entities,
      send: (domain, service, data) => {
        const call = live.current.callService;
        if (!call) return Promise.reject(new Error('Nessuna connessione a Home Assistant'));
        return Promise.resolve(call(domain, service, data));
      },
      ask: (next) =>
        new Promise<CommandAnswer>((resolve) => {
          resolver.current = resolve;
          setQuestion(next);
        }),
      notify: (outcome) => {
        counter.current += 1;
        setNotice({ key: counter.current, ...describeOutcome(outcome) });
      },
    });
    setPath(made);
    return () => {
      made.dispose();
      setPath(null);
      // A question still open is a «no».
      const resolve = resolver.current;
      resolver.current = null;
      setQuestion(null);
      resolve?.({ ok: false });
    };
  }, [hasRuntime, isOpen]);

  // The states changed: commands waiting for a state are settled.
  const entities = runtime?.entities;
  useEffect(() => {
    path?.observe();
  }, [path, entities]);

  // Esplora ended with the question on screen: it is a «no».
  useEffect(() => {
    if (!active && resolver.current) answer({ ok: false });
  }, [active, answer]);

  // The line goes away a few seconds after the end of a command.
  useEffect(() => {
    if (!notice?.final) return undefined;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  const commands = useMemo<Casa3dCommands | null>(
    () => (path ? { isOpen, run: path.run } : null),
    [path, isOpen]
  );

  const overlay = (
    <>
      {question && (
        <ConfirmSheet
          open
          title={question.title}
          description={question.description}
          confirmLabel={question.confirmLabel}
          danger={question.danger}
          code={question.code}
          onConfirm={(code) => answer({ ok: true, code })}
          onCancel={() => answer({ ok: false })}
        />
      )}
      {notice && (
        <Surface
          className="c3d-command-notice"
          shape="card"
          error={notice.tone === 'error'}
          aria-hidden="true"
        >
          <Body size="sm">{notice.text}</Body>
        </Surface>
      )}
      <span className="sr-only" role="status">
        {notice?.final ? notice.text : ''}
      </span>
    </>
  );

  return { commands, overlay };
}
