import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Container, Icon, Input } from '../../primitives';
import type { Translate } from '../../types/home';
interface IconPickerProps {
  value?: string | null;
  onSelect: (value: string) => void;
  onClear?: () => void;
  t?: Translate;
  maxHeightClass?: string;
}
import { getAllIconKeys, getIconComponent, preloadMdiIcons } from '../../icons';

export default function IconPicker({
  value,
  onSelect,
  onClear,
  t,
  maxHeightClass = 'max-h-72',
}: IconPickerProps) {
  const [query, setQuery] = useState('');
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [columnCount, setColumnCount] = useState(6);
  const [open, setOpen] = useState(false);
  const [mdiLoadedVersion, setMdiLoadedVersion] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const translate = t || ((key: string) => key);

  const ROW_HEIGHT = 52;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    preloadMdiIcons()
      .then(() => {
        if (!cancelled) setMdiLoadedVersion((prev) => prev + 1);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open]);

  const iconKeys = useMemo(() => {
    void mdiLoadedVersion;
    const keys: string[] = getAllIconKeys();
    return keys.slice().sort((a, b) => a.localeCompare(b));
  }, [mdiLoadedVersion]);
  const filteredKeys = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return iconKeys;
    return iconKeys.filter((key) => key.toLowerCase().includes(q));
  }, [iconKeys, query]);

  useEffect(() => {
    if (!open || !scrollRef.current) return;
    const updateHeight = () => {
      if (!scrollRef.current) return;
      setContainerHeight(scrollRef.current.clientHeight || 0);
      setColumnCount(
        Math.max(1, Math.min(6, Math.floor((scrollRef.current.clientWidth + 8) / 52)))
      );
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setScrollTop(0);
  }, [query]);

  const totalRows = Math.ceil(filteredKeys.length / columnCount);
  const visibleRowCount = Math.ceil(containerHeight / ROW_HEIGHT) + 2;
  const startRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT));
  const endRow = Math.min(totalRows, startRow + visibleRowCount);
  const startIndex = startRow * columnCount;
  const endIndex = endRow * columnCount;
  const visibleKeys = filteredKeys.slice(startIndex, endIndex);
  const topSpacerHeight = startRow * ROW_HEIGHT;
  const bottomSpacerHeight = Math.max(0, (totalRows - endRow) * ROW_HEIGHT);

  const SelectedIcon = value ? getIconComponent(value) : null;
  const selectedLabel = value || '';

  return (
    <Container className="aca-management space-y-3">
      <Button
        variant="control"
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="popup-surface flex w-full items-center justify-between rounded-2xl px-4 py-3"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl ${value ? 'aca-selected-text bg-[var(--accent-bg)]' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'}`}
          >
            {SelectedIcon ? (
              <SelectedIcon color="currentColor" aria-hidden="true" className="h-4 w-4" />
            ) : (
              <Icon name="refresh" size={18} />
            )}
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase">
              {translate('form.chooseIcon')}
            </span>
            {selectedLabel && (
              <span className="truncate text-sm font-medium text-[var(--text-primary)]">
                {selectedLabel}
              </span>
            )}
          </div>
        </div>
        <span className="text-[10px] font-bold tracking-widest text-[var(--text-secondary)] uppercase">
          {open ? translate('common.cancel') : translate('form.searchIcon')}
        </span>
      </Button>

      {open && (
        <div className="space-y-3">
          <Input
            type="text"
            className="popup-surface w-full rounded-xl px-4 py-2 text-[var(--text-primary)] transition-colors outline-none focus:border-[var(--accent-color)]"
            aria-label={translate('form.searchIcon')}
            placeholder={translate('form.searchIcon')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {onClear && (
            <Button
              variant="control"
              aria-pressed={!value}
              onClick={() => {
                onClear();
                setOpen(false);
              }}
              className={`w-full rounded-xl px-3 py-2 text-xs font-bold tracking-widest uppercase ${!value ? 'aca-selected-text bg-[var(--accent-bg)]' : 'popup-surface popup-surface-hover text-[var(--text-secondary)]'}`}
              title={translate('form.defaultIcon')}
            >
              {translate('form.defaultIcon')}
            </Button>
          )}
          <div
            ref={scrollRef}
            onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
            className={`custom-scrollbar grid h-60 content-start items-start gap-2 overflow-y-auto pr-2 sm:h-72 ${maxHeightClass}`}
            style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
          >
            {filteredKeys.length === 0 ? (
              <div
                style={{ gridColumn: '1 / -1' }}
                className="py-2 text-center text-xs text-[var(--text-secondary)]"
              >
                {translate('form.noIconsFound')}
              </div>
            ) : (
              <>
                {topSpacerHeight > 0 && (
                  <div style={{ gridColumn: '1 / -1', height: topSpacerHeight }} />
                )}
                {visibleKeys.map((iconName) => {
                  const CatalogIcon = getIconComponent(iconName);
                  if (!CatalogIcon) return null;
                  const isSelected = value === iconName;
                  return (
                    <Button
                      variant="control"
                      key={iconName}
                      onClick={() => {
                        onSelect(iconName);
                        setOpen(false);
                      }}
                      className={`flex items-center justify-center rounded-xl p-3 transition-all ${isSelected ? 'aca-selected-text bg-[var(--accent-bg)]' : 'popup-surface popup-surface-hover text-[var(--text-secondary)]'}`}
                      aria-label={iconName}
                      aria-pressed={isSelected}
                      title={iconName}
                    >
                      <CatalogIcon color="currentColor" aria-hidden="true" className="h-5 w-5" />
                    </Button>
                  );
                })}
                {bottomSpacerHeight > 0 && (
                  <div style={{ gridColumn: '1 / -1', height: bottomSpacerHeight }} />
                )}
              </>
            )}
          </div>
        </div>
      )}
    </Container>
  );
}
