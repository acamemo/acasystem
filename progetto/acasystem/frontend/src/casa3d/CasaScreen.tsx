/**
 * The house (ADR-0014, R1): the Casa 3D as a screen of its own at `#/casa`, over the launcher the
 * way Sistema is, 100dvh by 100dvw. The 3D view is interactive from the start (one finger turns,
 * two move and zoom, the wheel zooms, + and - zoom from the keyboard) in Light, with «Rimetti la
 * vista» always at hand. Everything else sits flat over the picture:
 * - the arrow at the top left opens the side bar (Esplora, Modifica la piantina, Piani, Elenco
 *   stanze, Qualità, Esci); «Esci» is also always at the top right;
 * - the plan comes from the server (planApi, ISSUE-103). If the server still holds the example house
 *   of the T6 test, «Ricomincia» replaces it with an empty one, after a question;
 * - what is open on top (the bar, a sheet, the question) is part of the history (casaNav.ts): the
 *   back button and Esc close it first, then the house; the house closes with its view released.
 *
 * Commands (T7) stay off: the switch of commandSwitch.ts is off until R7. The screen already follows
 * the rule of the revised plan, so the day it is on nothing else changes: the devices are commanded
 * only in Esplora, with the view up and nothing open on top of it. `#/casa/piantina` is a place for
 * the editor (R2) and for now only says so; the view is kept, hidden, for the way back.
 */
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Body,
  Button,
  Caption,
  ConfirmSheet,
  Heading,
  Icon,
  Sheet,
  SideSheet,
  Skeleton,
  Surface,
  Title,
  type IconName,
} from '@/components/primitives';
import { ConnectionNotice } from '@/components/system/status-bar/ConnectionNotice';
import { useHomeAssistantMeta } from '@/hooks/context/HomeAssistantContext';
import { Casa3dPlanPreview } from './Casa3dPlanPreview';
import { Casa3dQualityPicker } from './Casa3dQualityPicker';
import type { Casa3dVistaHandle } from './Casa3dVista';
import { useCasaNav, type CasaNav } from './casaNav';
import { decideKey, overlayOpen } from './exploreKeys';
import { previewRoomsOf } from './planModel';
import { CASA3D_QUALITY_OPTIONS, isWeakDevice, useCasa3dQuality } from './quality';
import { useCasa3dContextGuard } from './useCasa3dContextGuard';
import { useCasa3dPlan } from './useCasa3dPlan';
import './casaScreen.css';

const Casa3dVista = lazy(() => import('./Casa3dVista'));

const TEXT_FIELD = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]';

export interface CasaScreenProps {
  /** Opens Sistema (the way back to the connection after an expired sign-in). */
  onOpenSystem: () => void;
}

function MenuItem({
  icon,
  label,
  detail,
  current = false,
  onClick,
}: {
  icon: IconName;
  label: string;
  detail?: string;
  current?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="casa-menu__item"
      aria-current={current ? 'true' : undefined}
      onClick={onClick}
    >
      <Icon name={icon} size="lg" />
      <span className="casa-menu__text">
        <span>{label}</span>
        {detail && <span className="casa-menu__detail">{detail}</span>}
      </span>
    </button>
  );
}

function CenteredPanel({ children, role }: { children: ReactNode; role?: 'status' | 'alert' }) {
  return (
    <div className="casa__center">
      <Surface className="casa__panel" role={role}>
        {children}
      </Surface>
    </div>
  );
}

export default function CasaScreen({ onOpenSystem }: CasaScreenProps) {
  const nav: CasaNav = useCasaNav();
  const { mode, overlay } = nav;
  const plan = useCasa3dPlan();
  const meta = useHomeAssistantMeta();
  const rootRef = useRef<HTMLElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const vista = useRef<Casa3dVistaHandle | null>(null);

  const [preference, setPreference] = useCasa3dQuality();
  const guard = useCasa3dContextGuard(undefined, mode === 'esplora');
  const { phase, generation, forceLight, reason } = guard.state;
  const staticOnly = phase === 'static';
  // After a loss the view is made again in Light, whatever the saved level, until the user chooses.
  const quality = forceLight ? 'light' : preference;
  const weak = useMemo(() => isWeakDevice(), []);
  const [ready, setReady] = useState(false);
  // The level at which the drawing stayed slow, and whether the user waved the offer away.
  const [slowAt, setSlowAt] = useState<string | null>(null);
  // undefined: the default (the only floor, else the whole house); null: the whole house.
  const [floorChoice, setFloorChoice] = useState<string | null | undefined>(undefined);
  const [restartError, setRestartError] = useState<string | null>(null);

  const planState = plan.state;
  const readyPlan = planState.status === 'ready' ? planState : null;
  const house = readyPlan?.hasHouse === true;
  const floors = useMemo(() => readyPlan?.floors ?? [], [readyPlan]);
  const defaultFloor = floors.length === 1 ? (floors[0]?.id ?? null) : null;
  const floorId =
    floorChoice === undefined || (floorChoice !== null && !floors.some((f) => f.id === floorChoice))
      ? defaultFloor
      : floorChoice;
  const previewRooms = useMemo(() => previewRoomsOf(floors), [floors]);

  const mounted = house && !staticOnly;
  // A context lost while the view was away is gone with the released view: the next one is new.
  const { release: releaseLostView } = guard;
  useEffect(() => {
    if (!mounted) releaseLostView();
  }, [mounted, releaseLostView]);
  const live = mounted && ready && phase === 'ok';
  // Commands go to the devices only in Esplora, with the view up and nothing open on top of it.
  const commandsOn = mode === 'esplora' && live && overlay === null;
  const gate = useRef(false);
  useLayoutEffect(() => {
    gate.current = commandsOn;
    // A view that outlives the screen with the adapter it was given must find the barrier shut.
    return () => {
      gate.current = false;
    };
  }, [commandsOn]);
  const commandGate = useCallback(() => gate.current, []);

  // A level chosen elsewhere (Sistema) also ends the Light that followed a loss.
  const lastPreference = useRef(preference);
  const { choose: clearForcedLight } = guard;
  useEffect(() => {
    if (lastPreference.current === preference) return;
    lastPreference.current = preference;
    clearForcedLight();
  }, [preference, clearForcedLight]);
  const chooseQuality = (next: typeof preference) => {
    guard.choose();
    setSlowAt(null);
    setPreference(next);
  };
  const qualityLabel =
    CASA3D_QUALITY_OPTIONS.find((option) => option.value === quality)?.label ?? 'Light';

  // The focus starts on the title of the screen (as in Sistema), so a screen reader says where it is.
  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, []);

  // Keys. Esc leaves (or closes the plan) unless something open on top takes it; + and - zoom.
  // The deleting and undoing keys never reach the launcher below (hidden, but still listening).
  const navRef = useRef(nav);
  useEffect(() => {
    navRef.current = nav;
  });
  const commandsAvailable = useRef(false);
  useEffect(() => {
    commandsAvailable.current = live && overlay === null && mode === 'esplora';
  }, [live, overlay, mode]);
  useEffect(() => {
    const root = rootRef.current;
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const decision = decideKey(event, { root, exploring: true, overlay: overlayOpen() });
      if (decision === 'exit') {
        event.preventDefault();
        // A held key must not leave twice.
        if (event.repeat) return;
        if (navRef.current.mode === 'piantina') navRef.current.goExplore();
        else navRef.current.exit();
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey || !commandsAvailable.current) return;
      const first = event.composedPath()[0];
      if (first instanceof Element && first.matches(TEXT_FIELD)) return;
      const direction = event.key === '+' || event.key === '=' ? 1 : event.key === '-' ? -1 : 0;
      if (direction !== 0 && vista.current?.zoom(direction)) event.preventDefault();
    };
    const onRootKey = (event: KeyboardEvent) => {
      if (decideKey(event, { root, exploring: true, overlay: false }) === 'swallow') {
        event.stopPropagation();
      }
    };
    window.addEventListener('keydown', onKey);
    root?.addEventListener('keydown', onRootKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      root?.removeEventListener('keydown', onRootKey);
    };
  }, []);

  const focusTitleWhenClosed = useRef(false);
  useEffect(() => {
    if (overlay !== null || !focusTitleWhenClosed.current) return;
    focusTitleWhenClosed.current = false;
    titleRef.current?.focus({ preventScroll: true });
  }, [overlay]);

  const restart = async () => {
    if (plan.restarting) return;
    setRestartError(null);
    const result = await plan.restart();
    // The latest nav: the question may have been closed with the back button in the meantime.
    const questionOpen = navRef.current.overlay === 'ricomincia';
    if (questionOpen) navRef.current.closeOverlay();
    // The button that opened the question is gone with the notice: the focus goes to the title.
    if (result.ok) {
      if (questionOpen) focusTitleWhenClosed.current = true;
      else titleRef.current?.focus({ preventScroll: true });
    }
    if (!result.ok) {
      setRestartError(
        result.conflict
          ? 'La casa è stata cambiata da un altro dispositivo: ecco com’è adesso. Non ho sostituito nulla.'
          : result.message
      );
    }
  };

  let stage: ReactNode;
  if (mode === 'piantina' && !house) {
    // The place of the editor says its own thing; there is no picture to keep behind it.
    stage = null;
  } else if (planState.status === 'loading') {
    stage = (
      <div className="casa__center">
        <Skeleton variant="panel" rows={2} label="Caricamento della casa…" />
      </div>
    );
  } else if (planState.status === 'error') {
    stage = (
      <CenteredPanel role="alert">
        <Heading level={2} size="md">
          La casa non si legge
        </Heading>
        <Body>{planState.message}</Body>
        <Button variant="primary" onClick={plan.reload}>
          Riprova
        </Button>
      </CenteredPanel>
    );
  } else if (!house) {
    stage = (
      <CenteredPanel>
        <Heading level={2} size="md">
          Nessuna casa disegnata
        </Heading>
        <Body>Disegna la piantina per vedere la casa in 3D.</Body>
        <Button variant="primary" onClick={nav.goPlan}>
          Modifica la piantina
        </Button>
      </CenteredPanel>
    );
  } else {
    stage = (
      <>
        <Casa3dPlanPreview rooms={previewRooms} decorative={live} />
        {mounted && (
          <Suspense fallback={null}>
            <div className="casa__layer" data-ready={live ? 'true' : 'false'}>
              <Casa3dVista
                building={planState.building}
                revision={planState.revision}
                floorId={floorId}
                handleRef={vista}
                paused={mode === 'piantina'}
                onReadyChange={setReady}
                quality={quality}
                generation={generation}
                onContextState={guard.report}
                onSlow={() => setSlowAt(quality)}
                commandsOn={commandsOn}
                commandGate={commandGate}
              />
            </div>
          </Suspense>
        )}
      </>
    );
  }

  return (
    <main
      ref={rootRef}
      className="casa"
      aria-labelledby="casa-titolo"
      data-mode={mode}
      data-view={live ? 'ready' : mounted ? 'loading' : 'none'}
    >
      <Title level={1} id="casa-titolo" className="sr-only" tabIndex={-1} ref={titleRef}>
        Casa 3D
      </Title>

      <div className="casa__stage">{stage}</div>

      {mode === 'piantina' && (
        <CenteredPanel>
          <Heading level={2} size="md">
            La piantina a quadretti è in arrivo
          </Heading>
          <Body>
            Qui disegnerai le stanze e sposterai i mobili, come su un foglio a quadretti. Per ora la
            casa si guarda soltanto.
          </Body>
          <Button variant="primary" onClick={nav.goExplore}>
            Torna a Esplora
          </Button>
        </CenteredPanel>
      )}

      <button
        type="button"
        className="casa__control casa__control--menu"
        aria-label="Menu della casa"
        aria-haspopup="dialog"
        aria-expanded={overlay === 'menu'}
        onClick={() => nav.showOverlay('menu')}
      >
        <Icon name="chevronRight" size="lg" />
      </button>
      <button type="button" className="casa__control casa__control--exit" onClick={nav.exit}>
        <Icon name="close" size="md" />
        <span>Esci</span>
      </button>

      <div className="casa__bottom">
        <div className="casa__notices">
          <ConnectionNotice
            visible={meta.haUnavailableVisible}
            oauthExpired={meta.oauthExpired}
            disconnectedSince={meta.disconnectedSince}
            onRetry={() => globalThis.window?.location.reload()}
            onSignIn={onOpenSystem}
          />
          {readyPlan?.isExample && (
            <Surface className="casa__notice" role="status">
              <Body size="sm">Questa è la casa d’esempio rimasta dalle prove, non la tua.</Body>
              <Button variant="secondary" onClick={() => nav.showOverlay('ricomincia')}>
                Ricomincia
              </Button>
            </Surface>
          )}
          {restartError && (
            <Surface className="casa__notice" role="alert" error>
              <Body size="sm">{restartError}</Body>
              <Button variant="secondary" onClick={() => setRestartError(null)}>
                Chiudi
              </Button>
            </Surface>
          )}
          {phase === 'lost' && (
            <Surface className="casa__notice" role="status">
              <Body size="sm">La vista 3D si è interrotta. Provo a ripristinarla…</Body>
            </Surface>
          )}
          {staticOnly && (
            <Surface className="casa__notice" role="alert">
              <Body size="sm">
                {reason === 'failed'
                  ? 'Questo dispositivo non riesce a mostrare la vista 3D. Restano la pianta e l’elenco delle stanze.'
                  : reason === 'error'
                    ? 'La vista 3D non si è caricata. Restano la pianta e l’elenco delle stanze: puoi riprovare.'
                    : 'La vista 3D si è interrotta di nuovo e resta ferma: ti mostro la pianta. Puoi riprovare o aprire l’elenco delle stanze.'}
              </Body>
              <Button variant="secondary" onClick={guard.retry}>
                Riprova
              </Button>
            </Surface>
          )}
          {slowAt === quality && quality !== 'light' && phase === 'ok' && (
            <Surface className="casa__notice" role="status">
              <Body size="sm">Il disegno è lento a questo livello. Tornare a Light?</Body>
              <div className="casa__notice-buttons">
                <Button variant="primary" onClick={() => chooseQuality('light')}>
                  Passa a Light
                </Button>
                <Button variant="secondary" onClick={() => setSlowAt(null)}>
                  Ignora
                </Button>
              </div>
            </Surface>
          )}
        </div>
        {house && mode === 'esplora' && (
          <button
            type="button"
            className="casa__control casa__control--reset"
            disabled={!live}
            onClick={() => vista.current?.resetView()}
          >
            <Icon name="refresh" size="md" />
            <span>Rimetti la vista</span>
          </button>
        )}
      </div>

      <SideSheet
        open={overlay === 'menu'}
        onClose={nav.closeOverlay}
        title="Casa 3D"
        closeLabel="Chiudi il menu"
      >
        <nav aria-label="Menu della casa">
          <ul className="casa-menu">
            <li>
              <MenuItem
                icon="eye"
                label="Esplora"
                current={mode === 'esplora'}
                onClick={nav.goExplore}
              />
            </li>
            <li>
              <MenuItem
                icon="edit"
                label="Modifica la piantina"
                current={mode === 'piantina'}
                onClick={nav.goPlan}
              />
            </li>
            <li>
              <MenuItem icon="grid" label="Piani" onClick={() => nav.showOverlay('piani')} />
            </li>
            <li>
              <MenuItem
                icon="menu"
                label="Elenco stanze"
                onClick={() => nav.showOverlay('stanze')}
              />
            </li>
            <li>
              <MenuItem
                icon="settings"
                label="Qualità"
                detail={qualityLabel}
                onClick={() => nav.showOverlay('qualita')}
              />
            </li>
            <li>
              <MenuItem icon="chevronLeft" label="Esci" onClick={nav.exit} />
            </li>
          </ul>
        </nav>
      </SideSheet>

      <Sheet
        open={overlay === 'piani'}
        onClose={nav.closeOverlay}
        title="Piani"
        description={floors.length === 0 ? 'Nessun piano disegnato.' : undefined}
      >
        {floors.length > 0 && (
          <ul className="casa-list">
            {floors.length > 1 && (
              <li>
                <Button
                  variant="secondary"
                  aria-pressed={floorId === null}
                  state={floorId === null ? 'selected' : undefined}
                  onClick={() => {
                    setFloorChoice(null);
                    nav.closeOverlay();
                  }}
                >
                  Tutta la casa
                </Button>
              </li>
            )}
            {floors.map((floor) => (
              <li key={floor.id}>
                <Button
                  variant="secondary"
                  aria-pressed={floorId === floor.id}
                  state={floorId === floor.id ? 'selected' : undefined}
                  onClick={() => {
                    setFloorChoice(floor.id);
                    nav.closeOverlay();
                  }}
                >
                  {floor.name}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Sheet>

      <Sheet
        open={overlay === 'stanze'}
        onClose={nav.closeOverlay}
        title="Elenco stanze"
        description={house ? undefined : 'Nessuna stanza disegnata.'}
      >
        {floors
          .filter((floor) => floor.rooms.length > 0)
          .map((floor) => (
            <section key={floor.id} className="casa-rooms">
              <Heading level={3} size="sm">
                {floor.name}
              </Heading>
              <ul className="casa-list">
                {floor.rooms.map((room) => (
                  <li key={room.id}>
                    <Body as="span">{room.name}</Body>
                  </li>
                ))}
              </ul>
            </section>
          ))}
      </Sheet>

      <Sheet open={overlay === 'qualita'} onClose={nav.closeOverlay} title="Qualità della vista 3D">
        <Casa3dQualityPicker
          value={quality}
          weak={weak}
          onChange={chooseQuality}
          note={
            forceLight
              ? 'La vista è tornata a Light dopo un’interruzione. Scegli un livello per riprovare.'
              : undefined
          }
        />
        <Caption as="p">La scelta vale per questo dispositivo.</Caption>
      </Sheet>

      <ConfirmSheet
        open={overlay === 'ricomincia'}
        title="Ricominciare da una casa vuota?"
        description="La casa d’esempio viene sostituita da una casa vuota. Resta tra i punti di ripristino."
        confirmLabel="Ricomincia"
        danger
        onConfirm={() => void restart()}
        onCancel={nav.closeOverlay}
      />
    </main>
  );
}
