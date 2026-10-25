import { useState, type ComponentType } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Connection, HassEntity } from 'home-assistant-js-websocket';
import type { PageSettings } from '@/@types/dashboard';
import type { PageKindProps, WidgetRuntime } from '@/@types/launcher';
import { WidgetRuntimeProvider } from '@/hooks/launcher/WidgetRuntimeContext';
import { createFixtureRuntime, fixtureEntities, fixtureEntity } from '@/utils/fixtures/runtime';
import { mediaPages } from '@/components/widgets/media';
import { MediaKindPage, SonosKindPage } from '@/components/widgets/media/views/MediaPage';

const recent = () => new Date().toISOString();
const sonos = (
  id: string,
  name: string,
  members: string[] = [id],
  state = 'playing'
): HassEntity => ({
  ...fixtureEntity(id, state, {
    friendly_name: name,
    media_title: `${name} brano`,
    group_members: members,
  }),
  last_updated: recent(),
});
const tvPlayer = fixtureEntity('media_player.tv', 'playing', {
  friendly_name: 'Televisore',
  media_title: 'Notiziario',
});

/**
 * The launcher passes the page its own settings and a save callback (PageKindProps); the harness
 * keeps them in state like the launcher does, and records every save.
 */
function renderPage(
  Page: ComponentType<PageKindProps>,
  entities: HassEntity[],
  overrides: Partial<WidgetRuntime> = {},
  initial: PageSettings = {}
) {
  const callService = vi.fn(async () => undefined);
  const onSaveSetting = vi.fn();
  const runtime = createFixtureRuntime({
    entities: fixtureEntities(entities),
    callService,
    ...overrides,
  });
  function Harness() {
    const [settings, setSettings] = useState<PageSettings>(initial);
    return (
      <Page
        pageId="pagina"
        settings={settings}
        onSaveSetting={(key, value) => {
          onSaveSetting(key, value);
          setSettings((previous) => ({ ...previous, [key]: value }));
        }}
      />
    );
  }
  render(
    <WidgetRuntimeProvider value={runtime}>
      <Harness />
    </WidgetRuntimeProvider>
  );
  return { callService, onSaveSetting };
}

const conn = { sendMessagePromise: vi.fn(async () => ({ children: [] })) } as unknown as Connection;

describe('Pagina Sonos', () => {
  it('mostra solo i lettori Sonos e raggruppa gli altri con join', () => {
    const { callService } = renderPage(
      SonosKindPage,
      [
        sonos('media_player.sonos_sala', 'Sonos sala'),
        sonos('media_player.sonos_studio', 'Sonos studio'),
        tvPlayer,
      ],
      { conn }
    );
    expect(screen.queryByText('Televisore')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Raggruppa tutti/ }));
    expect(callService).toHaveBeenCalledWith('media_player', 'join', {
      entity_id: 'media_player.sonos_sala',
      group_members: ['media_player.sonos_studio'],
    });
  });

  it('senza connessione non chiama join (regola legacy)', () => {
    const { callService } = renderPage(SonosKindPage, [
      sonos('media_player.sonos_sala', 'Sonos sala'),
      sonos('media_player.sonos_studio', 'Sonos studio'),
    ]);
    fireEvent.click(screen.getByRole('button', { name: /Raggruppa tutti/ }));
    expect(callService).not.toHaveBeenCalled();
  });

  it('separa tutti quando il lettore ha altri membri', () => {
    const members = ['media_player.sonos_sala', 'media_player.sonos_studio'];
    const { callService } = renderPage(
      SonosKindPage,
      [
        sonos('media_player.sonos_sala', 'Sonos sala', members),
        sonos('media_player.sonos_studio', 'Sonos studio', members),
      ],
      { conn }
    );
    fireEvent.click(screen.getByRole('button', { name: /Separa tutti/ }));
    expect(callService).toHaveBeenCalledWith('media_player', 'unjoin', {
      entity_id: 'media_player.sonos_studio',
    });
  });

  it('pagina vuota: spiega cosa collegare', () => {
    renderPage(SonosKindPage, [tvPlayer]);
    expect(screen.getByText('Nessun lettore Sonos trovato')).toBeInTheDocument();
  });
});

describe('Pagina media', () => {
  it('esclude i Sonos, comanda il lettore selezionato e salva activeId', () => {
    const { callService, onSaveSetting } = renderPage(MediaKindPage, [
      tvPlayer,
      fixtureEntity('media_player.radio', 'paused', {
        friendly_name: 'Radio',
        media_title: 'Giornale radio',
      }),
      sonos('media_player.sonos_sala', 'Sonos sala'),
    ]);
    expect(screen.queryByText('Sonos sala')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^Radio/ }));
    expect(screen.getByRole('heading', { name: 'Giornale radio' })).toBeInTheDocument();
    expect(onSaveSetting).toHaveBeenCalledWith('activeId', 'media_player.radio');
    fireEvent.click(screen.getByRole('button', { name: 'Riproduci' }));
    expect(callService).toHaveBeenCalledWith('media_player', 'media_play_pause', {
      entity_id: 'media_player.radio',
    });
  });

  it('in modifica non offre un editor interno inattivo: i lettori si scelgono in «Gestisci»', () => {
    renderPage(
      MediaKindPage,
      [tvPlayer, fixtureEntity('media_player.radio', 'idle', { friendly_name: 'Radio' })],
      { editMode: true }
    );
    expect(screen.queryByRole('switch', { name: 'Radio' })).not.toBeInTheDocument();
    expect(screen.queryByText('Lettori della pagina')).not.toBeInTheDocument();
  });

  /*
   * REP-20261008-001: the page settings sheet is gone, so the players of Multimedia are chosen
   * in «Gestisci» of the page, as on Sonos; the cases of the sheet (PAR-1) come here.
   */
  const players = () => [
    tvPlayer,
    fixtureEntity('media_player.salotto', 'idle', { friendly_name: 'Salotto' }),
    sonos('media_player.sonos_studio', 'Sonos studio'),
  ];

  it('«Gestisci» elenca solo i lettori non Sonos e togliendone uno salva tutti gli altri', () => {
    const { onSaveSetting } = renderPage(MediaKindPage, players());
    fireEvent.click(screen.getByRole('button', { name: 'Gestisci' }));
    expect(screen.getByRole('switch', { name: 'Salotto' })).toBeChecked();
    expect(screen.queryByRole('switch', { name: 'Sonos studio' })).toBeNull();
    // Everything is shown: no «Mostra tutti» to press.
    expect(screen.queryByRole('button', { name: 'Mostra tutti' })).toBeNull();
    fireEvent.click(screen.getByRole('switch', { name: 'Televisore' }));
    expect(onSaveSetting).toHaveBeenLastCalledWith('mediaIds', ['media_player.salotto']);
    expect(screen.getByRole('switch', { name: 'Televisore' })).not.toBeChecked();
  });

  it('con una scelta salvata aggiunge in coda, conserva i lettori assenti e «Mostra tutti» la toglie', () => {
    const { onSaveSetting } = renderPage(
      MediaKindPage,
      players(),
      {},
      { mediaIds: ['media_player.assente', 'media_player.tv'] }
    );
    fireEvent.click(screen.getByRole('button', { name: 'Gestisci' }));
    fireEvent.click(screen.getByRole('switch', { name: 'Salotto' }));
    expect(onSaveSetting).toHaveBeenLastCalledWith('mediaIds', [
      'media_player.assente',
      'media_player.tv',
      'media_player.salotto',
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Mostra tutti' }));
    expect(onSaveSetting).toHaveBeenLastCalledWith('mediaIds', null);
    expect(screen.queryByRole('button', { name: 'Mostra tutti' })).toBeNull();
  });

  it('tutti i lettori tolti: la pagina vuota offre «Mostra tutti»', () => {
    const { onSaveSetting } = renderPage(MediaKindPage, players(), {}, { mediaIds: [] });
    expect(screen.getByText('In questa pagina non è scelto nessun lettore.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mostra tutti' }));
    expect(onSaveSetting).toHaveBeenLastCalledWith('mediaIds', null);
    expect(screen.getByRole('heading', { name: 'Notiziario' })).toBeInTheDocument();
  });

  it('durante il caricamento delle entità non dice che i lettori mancano o non sono scelti', () => {
    renderPage(MediaKindPage, players(), { entitiesLoaded: false }, { mediaIds: [] });
    expect(screen.getByRole('heading', { name: 'Caricamento del lettore…' })).toBeInTheDocument();
    expect(screen.queryByText('In questa pagina non è scelto nessun lettore.')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Mostra tutti' })).toBeNull();
  });
});

describe('Impostazioni della pagina dalle props del launcher (PageKindProps)', () => {
  const players = () => [
    tvPlayer,
    fixtureEntity('media_player.radio', 'paused', {
      friendly_name: 'Radio',
      media_title: 'Giornale radio',
    }),
    fixtureEntity('media_player.cucina', 'idle', {
      friendly_name: 'Cucina',
      media_title: 'Ricette',
    }),
  ];

  it('mostra solo i lettori di mediaIds e parte dal lettore activeId', () => {
    renderPage(
      MediaKindPage,
      players(),
      {},
      {
        mediaIds: ['media_player.radio', 'media_player.cucina'],
        activeId: 'media_player.cucina',
      }
    );
    expect(screen.queryByText('Televisore')).toBeNull();
    expect(screen.getByRole('button', { name: /^Radio/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ricette' })).toBeInTheDocument();
  });

  it('mediaIds vuoto: nessun lettore, anche se Home Assistant ne ha', () => {
    renderPage(MediaKindPage, players(), {}, { mediaIds: [] });
    expect(screen.getByText('Nessun lettore trovato')).toBeInTheDocument();
  });

  it('non dipende dal contesto delle pagine legacy: niente PageProvider', () => {
    expect(() =>
      renderPage(SonosKindPage, [sonos('media_player.sonos_sala', 'Sonos sala')])
    ).not.toThrow();
    expect(screen.getByRole('heading', { name: 'Sonos sala brano' })).toBeInTheDocument();
  });

  it('le definizioni registrate usano gli stessi componenti', () => {
    expect(mediaPages.find((page) => page.kind === 'media')?.Page).toBe(MediaKindPage);
    expect(mediaPages.find((page) => page.kind === 'sonos')?.Page).toBe(SonosKindPage);
  });
});
