import { Icon as AcaIcon, Button, Container, Flex, Text } from '../../primitives';
import type { PageNavigationProps, PageManagerProps } from '../../types/home';
import { useState, useRef, useEffect, useCallback } from 'react';
import { getIconComponent } from '../../icons';
import { useModalActions, usePages } from '../../contexts';

// ── Edit-mode page manager popover ──────────────────────────────────────

function PageManagerPopover({
  pages,
  activePage,
  setActivePage,
  setEditingPage,
  pageSettings,
  pagesConfig,
  persistConfig,
  setShowAddPageModal,
  onClose,
  t,
}: PageManagerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const pageOrder = pagesConfig?.pages || [];

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const movePage = (fromIndex: number, toIndex: number) => {
    if (!persistConfig || fromIndex === toIndex) return;
    const next = [...pageOrder];
    const [item] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, item);
    persistConfig({ ...pagesConfig, pages: next });
  };

  return (
    <Container
      ref={ref}
      className={`absolute top-full left-0 z-50 mt-2 w-52 origin-top-left translate-y-0 scale-100 transform rounded-2xl border border-white/10 p-1.5 opacity-100 shadow-2xl transition-all duration-200`}
      style={{ backgroundColor: 'var(--card-bg)', backdropFilter: 'blur(20px)' }}
    >
      <Container className="max-h-72 space-y-0.5 overflow-y-auto">
        {pages.map((page, idx) => {
          const settings = pageSettings[page.id] || {};
          const label = settings.label || page.label;
          const isHidden = settings.hidden;
          const Icon = settings.icon ? getIconComponent(settings.icon) || page.icon : page.icon;
          const isActive = activePage === page.id;
          const isOver = overIdx === idx && dragIdx !== idx;

          return (
            <Flex
              key={page.id}
              draggable
              onDragStart={() => setDragIdx(idx)}
              onDragOver={(e) => {
                e.preventDefault();
                setOverIdx(idx);
              }}
              onDragLeave={() => setOverIdx(null)}
              onDrop={() => {
                if (dragIdx !== null) movePage(dragIdx, idx);
                setDragIdx(null);
                setOverIdx(null);
              }}
              onDragEnd={() => {
                setDragIdx(null);
                setOverIdx(null);
              }}
              className={`group flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 transition-colors hover:bg-white/10 ${
                isOver ? 'bg-[var(--accent-color)]/10' : ''
              } ${isHidden ? 'opacity-50' : ''}`}
            >
              <Button
                type="button"
                onClick={() => {
                  setActivePage(page.id);
                  onClose();
                }}
                className="flex min-w-0 flex-1 items-center gap-2.5"
              >
                <Container
                  className={`shrink-0 rounded-md p-1.5 transition-colors ${
                    isActive
                      ? 'bg-[var(--accent-bg)] text-[var(--accent-color)]'
                      : 'bg-white/5 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </Container>
                <Container className="min-w-0">
                  <Text
                    as="p"
                    className={`truncate text-xs font-semibold ${
                      isActive
                        ? 'text-[var(--text-primary)]'
                        : 'text-[var(--text-primary)] group-hover:text-white'
                    }`}
                  >
                    {label}
                  </Text>
                  {isHidden && (
                    <Text
                      as="p"
                      className="text-[9px] tracking-wider text-[var(--text-muted)] uppercase"
                    >
                      {t('nav.hidden') || 'Hidden'}
                    </Text>
                  )}
                </Container>
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setEditingPage(page.id);
                  onClose();
                }}
                className="shrink-0 rounded-md p-1 text-[var(--accent-color)] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white/10"
                title={t('nav.editPage') || 'Edit page'}
              >
                <AcaIcon name="edit" className="h-3 w-3" />
              </Button>
            </Flex>
          );
        })}
      </Container>

      <Container className="mx-2 my-0.5 h-px bg-white/5" />

      <Button
        type="button"
        onClick={() => {
          setShowAddPageModal(true);
          onClose();
        }}
        className="group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left transition-colors hover:bg-white/10"
      >
        <Container className="rounded-md bg-[var(--accent-bg)] p-1.5 text-[var(--accent-color)] transition-colors group-hover:bg-[var(--accent-color)] group-hover:text-white">
          <AcaIcon name="add" className="h-3.5 w-3.5" />
        </Container>
        <Text
          as="p"
          className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-white"
        >
          {t('nav.addPage')}
        </Text>
      </Button>
    </Container>
  );
}

// ── Main navigation ─────────────────────────────────────────────────────

/**
 * PageNavigation - Navigation component for switching between pages
 *
 * In view mode: horizontal scrollable pill bar.
 * In edit mode: horizontal pills + a pinned "Pages" button that opens
 *   a dropdown with all pages, drag-reorder, edit, and add-page.
 */
export default function PageNavigation({
  pages,
  activePage,
  setActivePage,
  editMode,
  setEditingPage,
  t,
}: PageNavigationProps) {
  const { pagesConfig, persistConfig, pageSettings, headerSettings } = usePages();
  const { setShowAddPageModal } = useModalActions();
  const showLabelsOnMobile = headerSettings?.showPagePillLabelsOnMobile ?? false;
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [showManager, setShowManager] = useState(false);
  const pageOrder = pagesConfig?.pages || [];
  const isSinglePage = pages.length === 1;

  const toggleManager = useCallback(() => setShowManager((v) => !v), []);
  const closeManager = useCallback(() => setShowManager(false), []);

  // Close popover when leaving edit mode
  useEffect(() => {
    if (!editMode) setShowManager(false);
  }, [editMode]);

  const movePage = (sourceId: string, targetId: string) => {
    if (!persistConfig) return;
    if (!sourceId || !targetId || sourceId === targetId) return;
    const nextPages = [...pageOrder];
    const fromIndex = nextPages.indexOf(sourceId);
    const toIndex = nextPages.indexOf(targetId);
    if (fromIndex < 0 || toIndex < 0) return;
    nextPages.splice(fromIndex, 1);
    nextPages.splice(toIndex, 0, sourceId);
    persistConfig({ ...pagesConfig, pages: nextPages });
  };

  return (
    <Flex className="flex min-w-0 flex-1 items-center gap-2">
      {/* Scrollable page pills */}
      <Flex className="scrollbar-hide flex min-w-0 flex-1 items-center gap-4 overflow-x-auto pb-2">
        {pages.map((page) => {
          const settings = pageSettings[page.id] || {};
          const label = settings.label || page.label;
          const isHidden = settings.hidden;
          const hideSinglePagePill = settings.hideSinglePagePill === true;
          const Icon = settings.icon ? getIconComponent(settings.icon) || page.icon : page.icon;
          const isDragOver = dragOverId === page.id;

          if (!editMode && isHidden) return null;
          if (!editMode && isSinglePage && hideSinglePagePill) return null;

          return (
            <Button
              key={page.id}
              aria-label={label}
              draggable={editMode}
              onClick={() => (editMode ? setEditingPage(page.id) : setActivePage(page.id))}
              onDragStart={(event) => {
                if (!editMode) return;
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', page.id);
              }}
              onDragOver={(event) => {
                if (!editMode) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                setDragOverId(page.id);
              }}
              onDragLeave={() => {
                if (!editMode) return;
                setDragOverId(null);
              }}
              onDrop={(event) => {
                if (!editMode) return;
                event.preventDefault();
                const sourceId = event.dataTransfer.getData('text/plain');
                setDragOverId(null);
                movePage(sourceId, page.id);
              }}
              onDragEnd={() => setDragOverId(null)}
              className={`flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-2xl border px-3 py-2.5 text-[11px] font-bold tracking-wide whitespace-nowrap transition-all sm:min-h-0 sm:min-w-0 sm:rounded-full sm:px-5 sm:py-2.5 sm:text-xs ${
                activePage === page.id
                  ? 'border-[var(--glass-border)] bg-[var(--glass-bg-hover)] text-[var(--text-primary)]'
                  : 'border-transparent bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'
              } ${editMode && isHidden ? 'scale-95 border-gray-500 opacity-50' : ''} ${editMode ? 'cursor-move' : ''} ${isDragOver ? 'border-[var(--accent-color)]' : ''}`}
            >
              <Icon
                className={`h-5 w-5 sm:h-4 sm:w-4 ${editMode && isHidden ? 'animate-pulse' : ''}`}
              />
              <Text className={showLabelsOnMobile ? undefined : 'hidden sm:inline'}>{label}</Text>
            </Button>
          );
        })}
      </Flex>

      {/* Pinned edit-mode page manager trigger — always visible */}
      {editMode && (
        <Container className="relative shrink-0 pb-2">
          <Button
            type="button"
            onClick={toggleManager}
            aria-label={t('nav.addPage')}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-[11px] font-bold tracking-widest whitespace-nowrap uppercase transition-all sm:px-4 sm:py-2.5 sm:text-xs ${
              showManager
                ? 'border-[var(--accent-color)] bg-[var(--glass-bg-hover)] text-[var(--accent-color)]'
                : 'border-dashed border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'
            }`}
          >
            <AcaIcon name="add" className="h-3.5 w-3.5" />
            <Text className="hidden sm:inline">{t('nav.addPage')}</Text>
            <AcaIcon
              name="chevronDown"
              className={`h-3 w-3 transition-transform ${showManager ? 'rotate-180' : ''}`}
            />
          </Button>

          {showManager && (
            <PageManagerPopover
              pages={pages}
              activePage={activePage}
              setActivePage={setActivePage}
              setEditingPage={setEditingPage}
              pageSettings={pageSettings}
              pagesConfig={pagesConfig}
              persistConfig={persistConfig}
              setShowAddPageModal={setShowAddPageModal}
              onClose={closeManager}
              t={t}
            />
          )}
        </Container>
      )}
    </Flex>
  );
}
