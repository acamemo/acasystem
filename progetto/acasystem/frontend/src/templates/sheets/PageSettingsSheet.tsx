import { useEffect, useRef, useState } from 'react';
import {
  Button,
  Caption,
  Field,
  IconText,
  Sheet,
  Skeleton,
  type IconName,
} from '@/components/primitives';
import type { LauncherPage, PageKind } from '@/@types/launcher';
import { findPageKindDefinition } from '@/components/widgets/registry';
import { useLauncher } from '@/hooks/launcher/LauncherContext';
import { useWidgetRuntime } from '@/hooks/launcher/WidgetRuntimeContext';
import { usePages } from '@/hooks/context';
import { isSonosMediaEntity } from '@/utils/mediaEntityClassification';
import { entityName, sortByName } from './parts/EntityPicker';
import { ChoiceGroup, FormRow, InlineConfirm, Notice, SheetSection, ToggleRow } from './parts/Form';
import { usePresence } from './parts/hooks';
import { IconPicker } from './parts/IconPicker';
import type { PageSettingsSheetProps } from './types';
import './sheets.css';

interface KindInfo {
  kind: PageKind;
  label: string;
  hint: string;
  /**
   * Default label of the legacy typed pages (usePageManagement); the default icon is the kit
   * icon with the same meaning as the legacy one (Lightbulb, Home, Music, Speaker, Battery).
   */
  defaultLabel: string;
  defaultIcon: IconName | null;
}

const KINDS: readonly KindInfo[] = [
  {
    kind: 'widgets',
    label: 'Widget',
    hint: 'Una griglia libera: aggiungi e disponi i widget come preferisci.',
    defaultLabel: 'Nuova pagina',
    defaultIcon: null,
  },
  {
    kind: 'lights',
    label: 'Luci',
    hint: 'Tutte le luci della casa in un unico elenco.',
    defaultLabel: 'Luci',
    defaultIcon: 'light',
  },
  {
    kind: 'rooms',
    label: 'Stanze',
    hint: 'Le aree di Home Assistant con i loro dispositivi.',
    defaultLabel: 'Stanze',
    defaultIcon: 'home',
  },
  {
    kind: 'media',
    label: 'Multimedia',
    hint: 'I lettori multimediali scelti, con i comandi di riproduzione.',
    defaultLabel: 'Multimedia',
    defaultIcon: 'music',
  },
  {
    kind: 'sonos',
    label: 'Sonos',
    hint: 'Gli altoparlanti Sonos, con gruppi e volume.',
    defaultLabel: 'Sonos',
    defaultIcon: 'speaker',
  },
  {
    kind: 'battery',
    label: 'Batterie',
    hint: 'Il livello delle batterie dei dispositivi.',
    defaultLabel: 'Batterie',
    defaultIcon: 'battery',
  },
];

const kindInfo = (kind: PageKind): KindInfo => KINDS.find((item) => item.kind === kind) ?? KINDS[0];

/** Label of a page kind: the registry definition when present, the Italian fallback otherwise. */
function kindLabel(kind: PageKind): string {
  if (kind === 'widgets') return kindInfo(kind).label;
  return findPageKindDefinition(kind)?.label ?? kindInfo(kind).label;
}

/** Type of an existing page in the sheet description: a page of widgets is not a widget. */
function pageTypeLabel(kind: PageKind): string {
  return kind === 'widgets' ? 'Pagina di widget' : kindLabel(kind);
}

/**
 * New page or settings of an existing one, through the launcher API (addPage, updatePage,
 * removePage). New pages choose their kind: a widget grid or one of the special pages.
 */
export function PageSettingsSheet({ open, onClose, pageId }: PageSettingsSheetProps) {
  const launcher = useLauncher();
  const mounted = usePresence(open);
  const page = pageId ? launcher.layout.pages.find((item) => item.id === pageId) : undefined;
  const editing = pageId !== null;

  const [kind, setKind] = useState<PageKind>('widgets');
  const [label, setLabel] = useState('');
  const [icon, setIcon] = useState<string | null>(null);
  const [labelError, setLabelError] = useState<string | undefined>(undefined);
  const [confirming, setConfirming] = useState(false);
  const [orderMessage, setOrderMessage] = useState('');
  const [session, setSession] = useState<{ open: boolean; pageId: string | null } | null>(null);

  // Fresh form each time the sheet opens or targets another page (not on layout changes).
  if (open && (session?.open !== open || session.pageId !== pageId)) {
    setSession({ open, pageId });
    setKind('widgets');
    setLabel(page?.label ?? '');
    setIcon(page?.icon ?? null);
    setLabelError(undefined);
    setConfirming(false);
    setOrderMessage('');
  } else if (!open && session?.open) {
    setSession({ open, pageId });
  }

  const create = () => {
    const info = kindInfo(kind);
    launcher.addPage({
      label: label.trim() || info.defaultLabel,
      icon: icon ?? info.defaultIcon ?? undefined,
      kind,
    });
    onClose();
  };

  /** Saves the edited name; an empty name keeps the previous one and says why. */
  const commitLabel = (target: LauncherPage): boolean => {
    const next = label.trim();
    if (!next) {
      setLabelError('Il nome non può essere vuoto: resta quello di prima.');
      return false;
    }
    setLabelError(undefined);
    if (next !== target.label) launcher.updatePage(target.id, { label: next });
    return true;
  };

  const footer = !editing ? (
    <>
      <Button variant="secondary" size="md" onClick={onClose}>
        Annulla
      </Button>
      <Button variant="primary" size="md" onClick={create}>
        Crea la pagina
      </Button>
    </>
  ) : (
    <Button
      variant="primary"
      size="md"
      onClick={() => {
        if (page && !commitLabel(page)) return;
        onClose();
      }}
    >
      Fatto
    </Button>
  );

  const removable = Boolean(page) && pageId !== 'home' && launcher.layout.pages.length > 1;
  const pageCount = launcher.layout.pages.length;
  const pageIndex = launcher.layout.pages.findIndex((item) => item.id === pageId);
  const earlierRef = useRef<HTMLButtonElement>(null);
  const laterRef = useRef<HTMLButtonElement>(null);
  const movedRef = useRef<-1 | 1 | null>(null);
  // A move to the first or last place disables the button just used: keep the focus on the other.
  useEffect(() => {
    const direction = movedRef.current;
    if (direction === null) return;
    movedRef.current = null;
    const used = direction === -1 ? earlierRef.current : laterRef.current;
    const other = direction === -1 ? laterRef.current : earlierRef.current;
    if (used?.disabled) other?.focus();
  }, [pageIndex]);
  const reorder = (direction: -1 | 1) => {
    const target = pageIndex + direction;
    if (pageIndex < 0 || target < 0 || target >= pageCount) return;
    const ids = launcher.layout.pages.map((item) => item.id);
    [ids[pageIndex], ids[target]] = [ids[target], ids[pageIndex]];
    movedRef.current = direction;
    launcher.reorderPages(ids);
    setOrderMessage(`Pagina spostata alla posizione ${target + 1} di ${ids.length}.`);
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? 'Impostazioni della pagina' : 'Nuova pagina'}
      description={
        editing
          ? page
            ? `${pageTypeLabel(page.kind)}: ${page.label}`
            : 'Pagina non trovata.'
          : 'Scegli il tipo di pagina, il nome e l’icona.'
      }
      footer={footer}
      className="aca-page-settings"
    >
      {mounted && !editing && (
        <div className="aca-settings">
          <ChoiceGroup<PageKind>
            label="Tipo di pagina"
            hint={kindInfo(kind).hint}
            options={KINDS.map((item) => ({ value: item.kind, label: kindLabel(item.kind) }))}
            value={kind}
            onChange={setKind}
          />
          <FormRow label="Nome">
            {({ labelId }) => (
              <Field
                label="Nome"
                aria-labelledby={labelId}
                placeholder={kindInfo(kind).defaultLabel}
                value={label}
                onChange={(event) => setLabel(event.target.value)}
              />
            )}
          </FormRow>
          <IconPicker value={icon} onSelect={setIcon} onClear={() => setIcon(null)} />
        </div>
      )}

      {mounted && editing && !page && (
        <Notice tone="danger">Questa pagina non esiste più: chiudi e riprova.</Notice>
      )}

      {mounted && editing && page && (
        <div className="aca-settings">
          <SheetSection title="Generali">
            <FormRow label="Nome">
              {({ labelId }) => (
                <Field
                  label="Nome"
                  aria-labelledby={labelId}
                  value={label}
                  error={labelError}
                  onChange={(event) => setLabel(event.target.value)}
                  onBlur={() => commitLabel(page)}
                />
              )}
            </FormRow>
            <IconPicker
              value={page.icon ?? null}
              onSelect={(name) => launcher.updatePage(page.id, { icon: name })}
              onClear={() => launcher.updatePage(page.id, { icon: undefined })}
            />
            <ToggleRow
              label="Nascondi la pagina"
              hint="Non compare nello scorrimento né nell’indicatore."
              checked={Boolean(page.hidden)}
              onChange={(hidden) => launcher.updatePage(page.id, { hidden })}
            />
          </SheetSection>

          <SheetSection title="Ordine delle pagine">
            {pageCount < 2 ? (
              <Caption as="p">C’è una sola pagina: non c’è un ordine da cambiare.</Caption>
            ) : (
              <div className="aca-chips">
                <Button
                  ref={earlierRef}
                  variant="control"
                  size="md"
                  disabled={pageIndex <= 0}
                  onClick={() => reorder(-1)}
                >
                  Sposta prima
                </Button>
                <Button
                  ref={laterRef}
                  variant="control"
                  size="md"
                  disabled={pageIndex < 0 || pageIndex === pageCount - 1}
                  onClick={() => reorder(1)}
                >
                  Sposta dopo
                </Button>
              </div>
            )}
            <Caption as="p" role="status">
              {orderMessage}
            </Caption>
          </SheetSection>

          {(page.kind === 'media' || page.kind === 'sonos') && (
            <MediaPageSettings pageId={page.id} sonos={page.kind === 'sonos'} />
          )}

          <SheetSection title="Eliminazione">
            {!removable ? (
              <Caption as="p">
                {pageId === 'home'
                  ? 'La pagina principale non si può eliminare.'
                  : 'L’ultima pagina non si può eliminare.'}
              </Caption>
            ) : confirming ? (
              <InlineConfirm
                message={`Eliminare la pagina «${page.label}»? ${
                  page.kind === 'widgets'
                    ? 'I suoi widget vengono tolti dal launcher.'
                    : 'La pagina speciale viene tolta dal launcher.'
                }`}
                confirmLabel="Elimina la pagina"
                onCancel={() => setConfirming(false)}
                onConfirm={() => {
                  launcher.removePage(page.id);
                  onClose();
                }}
              />
            ) : (
              <Button variant="control" size="sm" onClick={() => setConfirming(true)}>
                <IconText icon="warning" iconTone="danger" tone="danger">
                  Elimina la pagina
                </IconText>
              </Button>
            )}
          </SheetSection>
        </div>
      )}
    </Sheet>
  );
}

/** Reachable outside the inert special-page preview, with the same mediaIds keys as Tunet. */
function MediaPageSettings({ pageId, sonos }: { pageId: string; sonos: boolean }) {
  const { entities, entitiesLoaded } = useWidgetRuntime();
  const { pageSettings, savePageSetting } = usePages();
  const all = sortByName(
    entities,
    Object.keys(entities).filter(
      (id) => id.startsWith('media_player.') && isSonosMediaEntity(entities[id]) === sonos
    )
  );
  const saved = pageSettings[pageId]?.mediaIds;
  const selected = Array.isArray(saved)
    ? saved.filter((id): id is string => typeof id === 'string')
    : all;
  return (
    <SheetSection title="Lettori della pagina" description="Scegli quali lettori vengono mostrati.">
      <div className="aca-chips">
        <Button
          variant="control"
          size="md"
          onClick={() => savePageSetting(pageId, 'mediaIds', null)}
        >
          Mostra tutti
        </Button>
        <Button variant="control" size="md" onClick={() => savePageSetting(pageId, 'mediaIds', [])}>
          Nascondi tutti
        </Button>
      </div>
      {!entitiesLoaded && <Skeleton rows={2} label="Caricamento dei lettori…" />}
      {entitiesLoaded &&
        all.map((id) => (
          <ToggleRow
            key={id}
            label={entityName(entities, id)}
            checked={selected.includes(id)}
            onChange={(checked) =>
              savePageSetting(
                pageId,
                'mediaIds',
                checked ? [...selected, id] : selected.filter((item) => item !== id)
              )
            }
          />
        ))}
      {entitiesLoaded && all.length === 0 && (
        <Caption as="p">Nessun lettore disponibile in Home Assistant.</Caption>
      )}
    </SheetSection>
  );
}
