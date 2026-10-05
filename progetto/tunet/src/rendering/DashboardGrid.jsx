import { lazy, Suspense } from 'react';
import HomeEmptyState from '../components/pages/home/HomeEmptyState';
import CardErrorBoundary from '../components/ui/CardErrorBoundary';
import { formatDuration } from '../utils';

const MediaPage = lazy(() => import('../components/pages/MediaPage'));
const LightsPage = lazy(() => import('../components/pages/LightsPage'));
const BatteryPage = lazy(() => import('../components/pages/BatteryPage'));
const RoomExplorerPage = lazy(() => import('../components/pages/RoomExplorerPage'));

const pageFallback = <div className="page-transition min-h-[40vh]" aria-hidden="true" />;

export default function DashboardGrid({ page, media, grid, cards, actions, t }) {
  const { activePage, pagesConfig, pageSettings, editMode, isMediaPage, isSonosPage, isLightsPage, isBatteryPage, isRoomExplorerPage } = page;
  const {
    entities,
    conn,
    isSonosActive,
    activeMediaId,
    setActiveMediaId,
    getA,
    getEntityImageUrl,
    callService,
    savePageSetting,
  } = media;
  const { gridLayout, isMobile, gridGapV, gridGapH, gridColCount, isCompactCards, cardScale } = grid;
  const { cardSettings, getCardSettingsKey, hiddenCards, isCardHiddenByLogic, renderCard } = cards;
  const { setShowAddCardModal, setConfigTab, setShowConfigModal } = actions;

  if (isMediaPage(activePage)) {
    return (
      <div key={activePage} className="page-transition">
        <Suspense fallback={pageFallback}>
          <MediaPage
            pageId={activePage}
            entities={entities}
            conn={conn}
            pageSettings={pageSettings}
            editMode={editMode}
            isSonosActive={isSonosActive}
            activeMediaId={activeMediaId}
            setActiveMediaId={setActiveMediaId}
            getA={getA}
            getEntityImageUrl={getEntityImageUrl}
            callService={callService}
            savePageSetting={savePageSetting}
            formatDuration={formatDuration}
            t={t}
            mode="media"
          />
        </Suspense>
      </div>
    );
  }

  if (isSonosPage(activePage)) {
    return (
      <div key={activePage} className="page-transition">
        <Suspense fallback={pageFallback}>
          <MediaPage
            pageId={activePage}
            entities={entities}
            conn={conn}
            pageSettings={pageSettings}
            editMode={editMode}
            isSonosActive={isSonosActive}
            activeMediaId={activeMediaId}
            setActiveMediaId={setActiveMediaId}
            getA={getA}
            getEntityImageUrl={getEntityImageUrl}
            callService={callService}
            savePageSetting={savePageSetting}
            formatDuration={formatDuration}
            t={t}
            mode="sonos"
          />
        </Suspense>
      </div>
    );
  }

  if (isLightsPage(activePage)) {
    return (
      <div key={activePage} className="page-transition">
        <Suspense fallback={pageFallback}>
          <LightsPage
            entities={entities}
            callService={callService}
            conn={conn}
            pageSettings={pageSettings}
            pageId={activePage}
            savePageSetting={savePageSetting}
            t={t}
          />
        </Suspense>
      </div>
    );
  }

  if (isBatteryPage(activePage)) {
    return (
      <div key={activePage} className="page-transition">
        <Suspense fallback={pageFallback}>
          <BatteryPage
            entities={entities}
            conn={conn}
            pageSettings={pageSettings}
            pageId={activePage}
            savePageSetting={savePageSetting}
            t={t}
          />
        </Suspense>
      </div>
    );
  }

  if (isRoomExplorerPage(activePage)) {
    return (
      <div key={activePage} className="page-transition">
        <Suspense fallback={pageFallback}>
          <RoomExplorerPage
            entities={entities}
            callService={callService}
            conn={conn}
            pageSettings={pageSettings}
            pageId={activePage}
            savePageSetting={savePageSetting}
            t={t}
          />
        </Suspense>
      </div>
    );
  }

  const hasVisiblePlacement =
    (pagesConfig[activePage] || []).filter((id) => gridLayout[id]).length > 0;
  const cardIndexMap = new Map((pagesConfig[activePage] || []).map((id, index) => [id, index]));
  const scaleFactor = (cardScale || 100) / 100;
  const needsScale = scaleFactor !== 1;
  if (!hasVisiblePlacement) {
    const allPages = pagesConfig.pages || [];
    const totalCards =
      allPages.reduce((sum, p) => sum + (pagesConfig[p] || []).length, 0) +
      (pagesConfig.header || []).length;

    return (
      <HomeEmptyState
        key={`${activePage}-empty`}
        totalCards={totalCards}
        onAddCard={() => setShowAddCardModal(true)}
        onLoadProfile={() => {
          setConfigTab('profiles');
          setShowConfigModal(true);
        }}
        t={t}
      />
    );
  }

  return (
    <div
      key={activePage}
      className="page-transition grid items-start font-sans"
      style={{
        gap: `calc(${gridGapV}px * var(--density-gap-scale, 1)) calc(${gridGapH}px * var(--density-gap-scale, 1))`,
        gridAutoRows: 'auto',
        gridTemplateColumns: `repeat(${gridColCount}, minmax(0, 1fr))`,
      }}
    >
      {(pagesConfig[activePage] || [])
        .map((id) => ({ id, placement: gridLayout[id] }))
        .filter(({ placement }) => placement)
        .sort((a, b) => {
          if (a.placement.row !== b.placement.row) return a.placement.row - b.placement.row;
          return a.placement.col - b.placement.col;
        })
        .map(({ id }) => {
          const index = cardIndexMap.get(id) ?? -1;
          const placement = gridLayout[id];
          const isCalendarCard = id.startsWith('calendar_card_');
          const isTodoCard = id.startsWith('todo_card_');
          const isLargeCard = isCalendarCard || isTodoCard;
          const sizeSetting = isLargeCard
            ? cardSettings[getCardSettingsKey(id)]?.size || cardSettings[id]?.size
            : null;
          const forcedSpan = isLargeCard
            ? sizeSetting === 'small'
              ? 1
              : sizeSetting === 'medium'
                ? 2
                : 4
            : placement?.span;
          const settingsKey = getCardSettingsKey(id);
          const settings = cardSettings[settingsKey] || cardSettings[id] || {};
          const heading = cardSettings[settingsKey]?.heading;
          const colSpan = placement?.colSpan || 1;
          const isSpacerCard = id.startsWith('spacer_card_');

          if (!editMode && (hiddenCards.includes(id) || isCardHiddenByLogic(id))) return null;

          const cardContent = renderCard(id, index);
          if (!cardContent) return null;

          const gapPx = gridGapV;
          const baseRowPx = isMobile ? 82 : 100;
          const rowPx = baseRowPx * scaleFactor;
          let cardHeight;
          if (
            id.startsWith('spacer_card_') &&
            Number.isFinite(Number(settings.heightPx)) &&
            Number(settings.heightPx) > 0
          ) {
            cardHeight = Math.max(40, Math.min(420, Number(settings.heightPx) * scaleFactor));
          } else if (isLargeCard && sizeSetting !== 'small' && sizeSetting !== 'medium') {
            cardHeight = 4 * rowPx + 3 * gapPx;
          } else {
            cardHeight = forcedSpan * rowPx + Math.max(0, forcedSpan - 1) * gapPx;
          }

          return (
            <div
              key={id}
              data-dashboard-card={id}
              className={`relative ${isCompactCards || isMobile ? 'card-compact' : ''}`}
              style={{
                gridRowStart: placement.row,
                gridColumnStart: placement.col,
                gridRowEnd: `span ${forcedSpan}`,
                gridColumnEnd: colSpan > 1 ? `span ${colSpan}` : undefined,
                height: `${cardHeight}px`,
              }}
            >
              {heading && !isSpacerCard && (
                <div className="absolute -top-4 left-2 text-[10px] font-bold tracking-[0.2em] text-[var(--text-secondary)] uppercase">
                  {heading}
                </div>
              )}
              <div
                className="h-full overflow-hidden"
                style={needsScale ? {
                  fontSize: `${scaleFactor}em`,
                } : undefined}
              >
                <CardErrorBoundary cardId={id} t={t}>
                  {cardContent}
                </CardErrorBoundary>
              </div>
            </div>
          );
        })}
    </div>
  );
}
