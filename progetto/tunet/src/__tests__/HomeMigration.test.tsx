import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Header from '../layouts/Header';
import EditToolbar from '../layouts/EditToolbar';
import PageNavigation from '../components/pages/PageNavigation';
import HomePageIcon from '../components/pages/home/HomePageIcon';
import DashboardGrid from '../rendering/DashboardGrid';
import ThemeSidebar from '../components/sidebars/ThemeSidebar';
import { it as italian } from '../i18n';
import { DEFAULT_LANGUAGE, getLocaleForLanguage, normalizeLanguage } from '../i18n/languageUtils';

vi.mock('../contexts', () => ({
  useConfig: () => ({ language: 'it' }),
  usePages: () => ({
    pagesConfig: { pages: ['home'], header: [], home: [] },
    pageSettings: {},
    headerSettings: { showPagePillLabelsOnMobile: true },
    persistConfig: vi.fn(),
  }),
  useModalActions: () => ({ setShowAddPageModal: vi.fn() }),
}));

const t = (key: string) => italian[key as keyof typeof italian] ?? key;
const actions = {
  setShowAddCardModal: vi.fn(),
  setConfigTab: vi.fn(),
  setShowConfigModal: vi.fn(),
};
const toolbar = {
  ...actions,
  setShowThemeSidebar: vi.fn(),
  setShowLayoutSidebar: vi.fn(),
  setShowHeaderEditModal: vi.fn(),
  onToggleEdit: vi.fn(),
  editMode: false,
  connected: true,
  updateCount: 0,
  t,
};
const page = {
  activePage: 'home',
  pagesConfig: { pages: ['home'], header: [], home: [] as string[] },
  pageSettings: {},
  editMode: false,
  isMediaPage: () => false,
  isSonosPage: () => false,
  isLightsPage: () => false,
  isBatteryPage: () => false,
  isRoomExplorerPage: () => false,
};
const grid = { gridLayout: {}, gridGapV: 16, gridGapH: 16, gridColCount: 3, cardScale: 100 };
const cards = {
  cardSettings: {},
  getCardSettingsKey: (id: string) => id,
  hiddenCards: [],
  isCardHiddenByLogic: () => false,
  renderCard: () => <div>Luce ufficio</div>,
};

function renderHome(isMobile = false) {
  return render(
    <>
      <Header
        now={new Date('2026-10-05T10:30:00')}
        headerTitle={t('page.home')}
        headerScale={1}
        editMode={false}
        isMobile={isMobile}
        t={t}
      />
      <PageNavigation
        pages={[{ id: 'home', label: t('page.home'), icon: HomePageIcon }]}
        activePage="home"
        setActivePage={vi.fn()}
        setEditingPage={vi.fn()}
        editMode={false}
        t={t}
      />
      <EditToolbar {...toolbar} isMobile={isMobile} />
      <DashboardGrid page={page} media={{}} grid={grid} cards={cards} actions={actions} t={t} />
    </>
  );
}

beforeEach(() => vi.clearAllMocks());

describe('HOME migrata a TypeScript', () => {
  it('usa italiano come lingua iniziale e locale per data/ora', () => {
    expect(DEFAULT_LANGUAGE).toBe('it');
    expect(normalizeLanguage('it')).toBe('it');
    expect(normalizeLanguage('en')).toBe('en');
    expect(getLocaleForLanguage('it')).toBe('it-IT');
    renderHome();
    expect(screen.getByRole('heading', { level: 1, name: 'PRINCIPALE' })).toBeInTheDocument();
    expect(screen.getByText(/lunedì 5 ottobre/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Benvenuto' })).toBeInTheDocument();
  });

  it('permette di selezionare italiano dalla sessione precedentemente in inglese', () => {
    const setLanguage = vi.fn();
    const setter = vi.fn();
    render(
      <ThemeSidebar
        open
        onClose={setter}
        onSwitchToLayout={setter}
        onSwitchToHeader={setter}
        t={t}
        themes={{ dark: {}, light: {} }}
        currentTheme="dark"
        setCurrentTheme={setter}
        language="en"
        setLanguage={setLanguage}
        bgMode="theme"
        setBgMode={setter}
        bgColor="#222222"
        setBgColor={setter}
        bgGradient="midnight"
        setBgGradient={setter}
        bgImage=""
        setBgImage={setter}
        inactivityTimeout={0}
        setInactivityTimeout={setter}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Lingua: Inglese' }));
    fireEvent.click(screen.getByRole('option', { name: 'Italiano' }));
    expect(setLanguage).toHaveBeenCalledWith('it');
  });

  it('mantiene aggiunta scheda e apertura del profilo nell’ordine corretto', () => {
    renderHome();
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi scheda' }));
    expect(actions.setShowAddCardModal).toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByRole('button', { name: 'Carica profilo' }));
    expect(actions.setConfigTab).toHaveBeenCalledWith('profiles');
    expect(actions.setShowConfigModal).toHaveBeenCalledWith(true);
    expect(actions.setConfigTab.mock.invocationCallOrder[0]).toBeLessThan(
      actions.setShowConfigModal.mock.invocationCallOrder[0]
    );
  });

  it('mantiene modifica e accesso al sistema nella toolbar desktop', () => {
    renderHome();
    fireEvent.click(screen.getByRole('button', { name: 'Modifica' }));
    expect(toolbar.onToggleEdit).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Impostazioni' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Apri sistema' }));
    expect(actions.setShowConfigModal).toHaveBeenCalledWith(true);
    expect(actions.setConfigTab).toHaveBeenCalledWith('connection');
  });

  it('mantiene le azioni del menu mobile e la chiusura con Escape', () => {
    renderHome(true);
    fireEvent.click(screen.getByRole('button', { name: 'Impostazioni' }));
    fireEvent.click(screen.getByTestId('settings-menu-edit'));
    expect(toolbar.onToggleEdit).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Impostazioni' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByTestId('settings-dropdown-trigger')).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });

  it('nasconde Carica profilo quando esistono schede in altre pagine o nell’intestazione', () => {
    render(
      <DashboardGrid
        page={{ ...page, pagesConfig: { pages: ['home'], home: [], header: ['person.office'] } }}
        media={{}}
        grid={grid}
        cards={cards}
        actions={actions}
        t={t}
      />
    );
    expect(screen.getByRole('button', { name: 'Aggiungi scheda' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Carica profilo' })).not.toBeInTheDocument();
  });

  it('conserva la griglia delle schede quando la pagina è popolata', () => {
    render(
      <DashboardGrid
        page={{ ...page, pagesConfig: { ...page.pagesConfig, home: ['light.office'] } }}
        media={{}}
        grid={{ ...grid, gridLayout: { 'light.office': { row: 1, col: 1, span: 1 } } }}
        cards={cards}
        actions={actions}
        t={t}
      />
    );
    expect(screen.getByText('Luce ufficio')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Benvenuto' })).not.toBeInTheDocument();
  });
});
