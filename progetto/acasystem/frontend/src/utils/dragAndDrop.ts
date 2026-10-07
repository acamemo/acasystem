import type {
  CSSProperties,
  DragEvent as ReactDragEvent,
  MutableRefObject,
  TouchEvent as ReactTouchEvent,
} from 'react';
import type { PagesConfig, Setter } from '@/@types/dashboard';

export interface DragSource {
  index: number;
  cardId: string;
  colIndex?: number;
}

export interface TouchTarget {
  targetId: string;
  targetIndex: number;
  targetColIndex?: number;
}

export interface TouchPath {
  startX: number;
  startY: number;
  x: number;
  y: number;
}

export interface DragAndDropDeps {
  editMode: boolean;
  pagesConfig: PagesConfig;
  setPagesConfig: (config: PagesConfig) => void;
  persistConfig?: ((config: PagesConfig) => void) | null;
  activePage: string;
  dragSourceRef: MutableRefObject<DragSource | null>;
  touchTargetRef: MutableRefObject<TouchTarget | null>;
  touchSwapCooldownRef: MutableRefObject<number>;
  touchPath: TouchPath | null;
  setTouchPath: Setter<TouchPath | null>;
  touchTargetId: string | null;
  setTouchTargetId: (id: string | null) => void;
  setDraggingId: (id: string | null) => void;
  ignoreTouchRef: MutableRefObject<boolean>;
}

export interface DragPropsInput {
  cardId: string;
  index: number;
  colIndex?: number;
}

export interface CardStyleInput {
  cardId: string;
  isHidden?: boolean;
  isDragging?: boolean;
}

export const safeVibrate = (ms: number): void => {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      if (
        typeof navigator.userActivation !== 'undefined' &&
        !navigator.userActivation.hasBeenActive
      ) {
        return; // Avoid "Blocked call to navigator.vibrate" warning
      }
      navigator.vibrate(ms);
    }
  } catch (_e) {
    // Ignore blocked vibration calls
  }
};

const readIndex = (element: Element, name: string): number =>
  parseInt(element.getAttribute(name) ?? '');

const isDragSource = (value: unknown): value is { index: number } =>
  typeof value === 'object' && value !== null && 'index' in value;

export const createDragAndDropHandlers = ({
  editMode,
  pagesConfig,
  setPagesConfig,
  persistConfig,
  activePage,
  dragSourceRef,
  touchTargetRef,
  touchSwapCooldownRef,
  touchPath,
  setTouchPath,
  touchTargetId,
  setTouchTargetId,
  setDraggingId,
  ignoreTouchRef,
}: DragAndDropDeps) => {
  const pendingTouchConfigRef: { current: PagesConfig | null } = { current: null };
  const touchWorkingConfigRef: { current: PagesConfig | null } = { current: null };

  const saveConfig = (newConfig: PagesConfig) => {
    if (typeof persistConfig === 'function') {
      persistConfig(newConfig);
      return;
    }
    setPagesConfig(newConfig);
    try {
      localStorage.setItem('tunet_pages_config', JSON.stringify(newConfig));
    } catch (error) {
      console.error('Failed to save pages config to localStorage:', error);
    }
  };

  const resetDragState = () => {
    setDraggingId(null);
    dragSourceRef.current = null;
    touchTargetRef.current = null;
    pendingTouchConfigRef.current = null;
    touchWorkingConfigRef.current = null;
    setTouchTargetId(null);
    setTouchPath(null);
  };

  const startTouchDrag = (
    cardId: string,
    index: number,
    colIndex: number | undefined,
    x: number,
    y: number
  ) => {
    if (!editMode) return;
    safeVibrate(50);
    dragSourceRef.current = { index, cardId, colIndex };
    touchTargetRef.current = null;
    pendingTouchConfigRef.current = null;
    touchWorkingConfigRef.current = {
      ...pagesConfig,
      [activePage]: [...(pagesConfig[activePage] || [])],
    };
    setTouchPath({ startX: x, startY: y, x, y });
    setTouchTargetId(null);
    setDraggingId(cardId);
  };

  const moveCard = ({ source, targetIndex }: { source: DragSource; targetIndex: number }) => {
    const baseConfig = touchWorkingConfigRef.current || pagesConfig;
    const newConfig: PagesConfig = { ...baseConfig };
    const currentList = [...(newConfig[activePage] || [])];
    const [movedItem] = currentList.splice(source.index, 1);
    currentList.splice(targetIndex, 0, movedItem);
    newConfig[activePage] = currentList;
    source.index = targetIndex;
    touchWorkingConfigRef.current = newConfig;

    return { newConfig, source };
  };

  const updateTouchDrag = (x: number, y: number) => {
    if (!editMode || !dragSourceRef.current) return;
    setTouchPath((prev) => (prev ? { ...prev, x, y } : { startX: x, startY: y, x, y }));
    const el = document.elementFromPoint(x, y);
    const cardEl = el?.closest?.('[data-card-id]');

    if (!cardEl) return;

    const targetId = cardEl.getAttribute('data-card-id');
    const targetIndex = readIndex(cardEl, 'data-index');
    const targetColIndexStr = cardEl.getAttribute('data-col-index');
    const targetColIndex = targetColIndexStr ? parseInt(targetColIndexStr) : undefined;

    if (!targetId || targetId === dragSourceRef.current.cardId) return;

    touchTargetRef.current = { targetId, targetIndex, targetColIndex };
    setTouchTargetId(targetId);

    const now = Date.now();
    if (now - touchSwapCooldownRef.current <= 150) return;
    touchSwapCooldownRef.current = now;

    const { newConfig, source } = moveCard({
      source: dragSourceRef.current,
      targetIndex,
    });

    dragSourceRef.current = source;
    pendingTouchConfigRef.current = newConfig;
    setPagesConfig(newConfig);
    safeVibrate(10);
  };

  const performTouchDrop = (x: number, y: number) => {
    const dragSource = dragSourceRef.current;
    if (!dragSource) return;

    const cards = Array.from(document.querySelectorAll('[data-card-id]'));
    let cardElement = cards.find((card) => {
      const rect = card.getBoundingClientRect();
      return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    });

    if (!cardElement) {
      let minDist = Infinity;
      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dist = Math.hypot(x - cx, y - cy);
        if (dist < 220 && dist < minDist) {
          minDist = dist;
          cardElement = card;
        }
      });
    }

    const touchTarget = touchTargetRef.current;
    if (!cardElement && touchTarget) {
      cardElement = cards.find(
        (card) => card.getAttribute('data-card-id') === touchTarget.targetId
      );
    }

    if (!cardElement) {
      if (pendingTouchConfigRef.current) {
        saveConfig(pendingTouchConfigRef.current);
      }
      return;
    }

    const targetId = cardElement.getAttribute('data-card-id');
    const targetIndex = readIndex(cardElement, 'data-index');

    if (!targetId || targetId === dragSource.cardId) {
      if (pendingTouchConfigRef.current) {
        saveConfig(pendingTouchConfigRef.current);
      }
      return;
    }

    const { newConfig } = moveCard({
      source: dragSource,
      targetIndex,
    });

    saveConfig(newConfig);
    pendingTouchConfigRef.current = null;
    touchWorkingConfigRef.current = null;
    safeVibrate(20);
  };

  const handleTouchEnd = (e: ReactTouchEvent<HTMLElement>) => {
    if (!editMode || !dragSourceRef.current) return;
    const touch = e.changedTouches[0];
    const x = touch.clientX;
    const y = touch.clientY;
    performTouchDrop(x, y);
    resetDragState();
  };

  const handleTouchCancel = (e: ReactTouchEvent<HTMLElement>) => {
    if (!editMode || !dragSourceRef.current) return;
    if (e.cancelable) e.preventDefault();
    const x = touchPath?.x;
    const y = touchPath?.y;
    if (typeof x === 'number' && typeof y === 'number') {
      performTouchDrop(x, y);
    }
    resetDragState();
  };

  const getDragProps = ({ cardId, index, colIndex }: DragPropsInput) => ({
    draggable: editMode,
    onDragStart: (e: ReactDragEvent<HTMLElement>) => {
      e.dataTransfer.setData('dragData', JSON.stringify({ index, cardId, colIndex }));
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => setDraggingId(cardId), 0);
    },
    onDragEnd: () => setDraggingId(null),
    onDragOver: (e: ReactDragEvent<HTMLElement>) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    },
    onDrop: (e: ReactDragEvent<HTMLElement>) => {
      e.stopPropagation();
      const rawData = e.dataTransfer.getData('dragData');
      if (!rawData) return;
      const source: unknown = JSON.parse(rawData);
      const sourceIndex = isDragSource(source) ? source.index : undefined;

      const newConfig: PagesConfig = { ...pagesConfig };
      const currentList = [...(newConfig[activePage] || [])];
      const movedItem = currentList.splice(Number(sourceIndex), 1)[0];
      currentList.splice(index, 0, movedItem);
      newConfig[activePage] = currentList;

      saveConfig(newConfig);
      setDraggingId(null);
    },
    onTouchStart: (e: ReactTouchEvent<HTMLElement>) => {
      if (ignoreTouchRef.current) return;
      if (!editMode) return;
      const target = e.target;
      if (!(target instanceof Element) || !target.closest('[data-drag-handle]')) return;
      if (e.cancelable) e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;
      startTouchDrag(cardId, index, colIndex, touch.clientX, touch.clientY);
    },
    onTouchMove: (e: ReactTouchEvent<HTMLElement>) => {
      if (ignoreTouchRef.current) return;
      if (!editMode || !dragSourceRef.current) return;
      if (e.cancelable) e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;
      updateTouchDrag(touch.clientX, touch.clientY);
    },
    onTouchEnd: handleTouchEnd,
    onTouchCancel: handleTouchCancel,
    'data-card-id': cardId,
    'data-index': index,
    'data-col-index': colIndex,
  });

  const getCardStyle = ({ cardId, isHidden, isDragging }: CardStyleInput): CSSProperties => {
    const isTouchTarget = !!touchTargetId && touchTargetId === cardId;

    const style: CSSProperties = {
      backgroundColor: isDragging ? 'rgba(30, 58, 138, 0.6)' : 'var(--card-bg)',
      borderColor: isDragging
        ? 'rgba(96, 165, 250, 1)'
        : editMode
          ? 'rgba(59, 130, 246, 0.2)'
          : 'var(--card-border)',
      backdropFilter: 'blur(16px)',
      borderStyle: 'solid',
      borderWidth: editMode ? '2px' : '1px',
      borderRadius: 'var(--card-border-radius, 16px)',
      opacity: isHidden && editMode ? 0.4 : 1,
      filter: isHidden && editMode ? 'grayscale(100%)' : 'none',
      transform: isDragging ? 'scale(1.08)' : 'none',
      animation:
        editMode && !isDragging ? 'editJiggle 0.3s infinite alternate ease-in-out' : 'none',
      // Randomize animation start slightly based on card char code sum so they don't sync perfectly
      animationDelay:
        editMode && !isDragging
          ? `${(cardId.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 10) / -10}s`
          : '0s',
      boxShadow: isDragging
        ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        : isTouchTarget
          ? '0 0 0 2px rgba(59, 130, 246, 0.6), 0 0 30px rgba(59, 130, 246, 0.35)'
          : editMode
            ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
            : 'none',
      zIndex: isDragging ? 50 : 1,
      pointerEvents: isDragging ? 'none' : 'auto',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    };

    return style;
  };

  return {
    getDragProps,
    getCardStyle,
    isTouchTarget: (cardId: string) => !!touchTargetId && touchTargetId === cardId,
    startTouchDrag,
    updateTouchDrag,
    performTouchDrop,
    resetDragState,
  };
};
