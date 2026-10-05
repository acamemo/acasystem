import {
  ArrowSwapHorizontalLinear as ArrowUpDown,
  CpuLinear as Bot,
  CalendarLinear as Calendar,
  CameraLinear as Camera,
  CarLinear as Car,
  TickSquareLinear as Check,
  CloudSunnyLinear as CloudSun,
  DollarCircleLinear as Coins,
  WindLinear as Fan,
  GameLinear as Gamepad2,
  HomeLinear as Home,
  LampOnLinear as Lightbulb,
  TaskSquareLinear as ListChecks,
  LockLinear as Lock,
  MinusLinear as Minus,
  MusicLinear as Music,
  SpeakerLinear as Speaker,
  TreeLinear as Sprout,
  AddLinear as Plus,
  SearchNormalLinear as Search,
  ShieldLinear as Shield,
  MagicStarLinear as Sparkles,
  Sun1Linear as Thermometer,
  MonitorLinear as Tv,
  FlashLinear as Zap,
} from 'mx-icons';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { isSonosMediaEntity, isToggleEntity } from '../utils';
import { getAreas, getEntitiesForArea } from '../services/haClient';
import { Button, Choice, Container, Heading, Input, Modal, Skeleton } from '../primitives';
import type {
  AddCardProps,
  RoomSectionProps,
  TypeChoiceProps,
  Area,
  AreaEntities,
  PickerIcon,
} from '../types/management';

const SELECTED_CONTAINER = 'aca-selection';
const SELECTED_TEXT = 'aca-selected-text';
const SELECTED_SUBTEXT = 'text-[var(--text-secondary)]';
const SELECTED_ICON = 'aca-selected-text';
const PRIMARY_ADD_BUTTON = 'w-full';

const TypeButton = ({ type, icon: TypeIcon, label, isActive, onSelect }: TypeChoiceProps) => (
  <Choice selected={isActive} onClick={() => onSelect(type)}>
    <TypeIcon color="currentColor" aria-hidden="true" className="h-4 w-4" /> {label}
  </Choice>
);

/** Room area picker — extracted outside AddCardContent so state persists across parent re-renders. */
function RoomSection({
  conn,
  searchTerm,
  selectedAreas,
  setSelectedAreas,
  selectedAreaEntitiesById,
  setSelectedAreaEntitiesById,
  t,
}: RoomSectionProps) {
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [entityErrors, setEntityErrors] = useState<Record<string, boolean>>({});
  const [loadingEntitiesByAreaId, setLoadingEntitiesByAreaId] = useState<Record<string, boolean>>(
    {}
  );

  useEffect(() => {
    if (!conn) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    (async () => {
      try {
        const result: Area[] = await getAreas(conn);
        if (!cancelled) {
          setAreas(result.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
        }
      } catch (err) {
        console.error('Failed to load areas:', err);
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [conn]);

  const fetchAreaEntities = async (areaId: string) => {
    if (!conn || !areaId) return;
    if (Array.isArray(selectedAreaEntitiesById?.[areaId])) return;

    setLoadingEntitiesByAreaId((prev) => ({ ...prev, [areaId]: true }));
    setEntityErrors((prev) => ({ ...prev, [areaId]: false }));
    try {
      const result = await getEntitiesForArea(conn, areaId);
      setSelectedAreaEntitiesById((prev) => ({ ...prev, [areaId]: result }));
    } catch (err) {
      console.error('Failed to load area entities:', err);
      setEntityErrors((prev) => ({ ...prev, [areaId]: true }));
    } finally {
      setLoadingEntitiesByAreaId((prev) => ({ ...prev, [areaId]: false }));
    }
  };

  const toggleAreaSelection = async (area: Area) => {
    const isSelected = selectedAreas.some((item) => item.area_id === area.area_id);
    if (isSelected) {
      setSelectedAreas((prev) => prev.filter((item) => item.area_id !== area.area_id));
      return;
    }

    setSelectedAreas((prev) => [...prev, area]);
    await fetchAreaEntities(area.area_id);
  };

  const filteredAreas = areas.filter((a) => {
    if (!searchTerm) return true;
    return (a.name || '').toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <p className="ml-4 text-xs font-bold text-[var(--text-secondary)] uppercase">
        {t('addCard.selectArea')}
      </p>
      <div className="min-h-[216px] space-y-3" aria-busy={loading}>
        {!loading && loadError && <p role="alert">Impossibile caricare le stanze.</p>}
        {!loading && !loadError && filteredAreas.length === 0 && (
          <p className="py-4 text-center text-sm text-[var(--text-secondary)] italic">
            {t('addCard.noAreas')}
          </p>
        )}
        {loading && areas.length === 0 && <Skeleton label="Caricamento delle stanze…" />}
        {filteredAreas.map((area) => {
          const isSelected = selectedAreas.some((item) => item.area_id === area.area_id);
          const areaEntities = selectedAreaEntitiesById?.[area.area_id] || [];
          const loadingEntities = loadingEntitiesByAreaId?.[area.area_id] === true;
          return (
            <Button
              variant="control"
              type="button"
              key={area.area_id}
              onClick={() => {
                void toggleAreaSelection(area);
              }}
              aria-pressed={isSelected}
              aria-busy={loadingEntities}
              className={`group entity-item flex w-full items-center justify-between rounded-2xl border p-3 text-left transition-colors ${isSelected ? SELECTED_CONTAINER : 'popup-surface popup-surface-hover border-transparent'}`}
            >
              <div className="mr-4 flex flex-col overflow-hidden">
                <span
                  className={`truncate text-sm font-bold transition-colors ${isSelected ? SELECTED_TEXT : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}
                >
                  {area.name || area.area_id}
                </span>
                <span
                  className={`truncate text-[11px] font-medium ${isSelected ? SELECTED_SUBTEXT : 'text-[var(--text-secondary)] group-hover:text-[var(--text-secondary)]'}`}
                >
                  {area.area_id}
                  {isSelected && loadingEntities && (
                    <span className="aca-skeleton__line inline-block" aria-hidden="true" />
                  )}
                  {isSelected &&
                    !loadingEntities &&
                    entityErrors[area.area_id] &&
                    ' — Dispositivi non disponibili'}
                  {isSelected &&
                    !loadingEntities &&
                    !entityErrors[area.area_id] &&
                    ` — ${areaEntities.length} ${t('addCard.roomEntitiesFound')}`}
                </span>
              </div>
              <div
                className={`flex-shrink-0 rounded-full p-2 transition-colors ${isSelected ? SELECTED_ICON : 'group-hover:aca-selected-text bg-[var(--glass-bg)] text-[var(--text-secondary)] group-hover:bg-[var(--accent-bg)]'}`}
              >
                {isSelected ? (
                  <Check color="currentColor" aria-hidden="true" className="h-4 w-4" />
                ) : (
                  <Plus color="currentColor" aria-hidden="true" className="h-4 w-4" />
                )}
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Content for the "Add Card" modal.
 * Handles entity selection and card type picking for adding new dashboard cards.
 */
function AddCardContent({
  onClose,
  addCardTargetPage,
  addCardType,
  setAddCardType,
  searchTerm,
  setSearchTerm,
  entities,
  pagesConfig,
  selectedEntities,
  setSelectedEntities,
  selectedWeatherId,
  setSelectedWeatherId,
  selectedTempId,
  setSelectedTempId,
  selectedAndroidTVMediaId,
  setSelectedAndroidTVMediaId,
  selectedAndroidTVRemoteId,
  setSelectedAndroidTVRemoteId,
  selectedAppleTVMediaId,
  setSelectedAppleTVMediaId,
  selectedAppleTVRemoteId,
  setSelectedAppleTVRemoteId,
  selectedCostTodayId,
  setSelectedCostTodayId,
  selectedCostMonthId,
  setSelectedCostMonthId,
  costSelectionTarget,
  setCostSelectionTarget,
  selectedNordpoolId,
  setSelectedNordpoolId,
  nordpoolDecimals,
  setNordpoolDecimals,
  selectedSpacerVariant,
  setSelectedSpacerVariant,
  onAddSelected,
  onAddRoom,
  conn,
  getAddCardAvailableLabel,
  getAddCardNoneLeftLabel,
  t,
}: AddCardProps) {
  const [selectedRoomAreas, setSelectedRoomAreas] = useState<Area[]>([]);
  const [selectedRoomEntitiesById, setSelectedRoomEntitiesById] = useState<AreaEntities>({});
  const [localSpacerVariant, setLocalSpacerVariant] = useState(selectedSpacerVariant || 'divider');

  useEffect(() => {
    if (addCardType === 'spacer') {
      setLocalSpacerVariant(selectedSpacerVariant || 'divider');
    }
  }, [addCardType, selectedSpacerVariant]);

  const getLabel = (key: string, fallback: string) => {
    const value = t ? t(key) : key;
    return value && value !== key ? value : fallback;
  };
  const betaSuffix = ` (${getLabel('addCard.betaLabel', 'beta')})`;

  const lowerSearchTerm = searchTerm.toLowerCase();
  const entityIds = useMemo(() => Object.keys(entities), [entities]);
  const selectedEntitiesSet = useMemo(() => new Set(selectedEntities), [selectedEntities]);

  const getEntityName = useCallback(
    (id: string) => entities[id]?.attributes?.friendly_name || id,
    [entities]
  );

  const calendarOptionsSnapshot = useMemo(() => {
    if (addCardType !== 'calendar') return [];
    return entityIds
      .filter((id) => id.startsWith('calendar.'))
      .map((id) => ({ id, name: getEntityName(id) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [addCardType, entityIds, getEntityName]);

  const weatherOptionsSnapshot = useMemo(() => {
    if (addCardType !== 'weather') return [];
    return entityIds
      .filter((id) => id.startsWith('weather.'))
      .map((id) => ({ id, name: getEntityName(id) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [addCardType, entityIds, getEntityName]);

  const tempOptionsSnapshot = useMemo(() => {
    if (addCardType !== 'weather') return [];
    return entityIds
      .filter((id) => {
        if (!id.startsWith('sensor.')) return false;
        const deviceClass = entities[id]?.attributes?.device_class;
        const lowerId = id.toLowerCase();
        return (
          deviceClass === 'temperature' ||
          lowerId.includes('temperature') ||
          lowerId.includes('temp')
        );
      })
      .map((id) => ({ id, name: getEntityName(id) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [addCardType, entityIds, entities, getEntityName]);

  const androidTVMediaOptionsSnapshot = useMemo(() => {
    if (addCardType !== 'androidtv' && addCardType !== 'appletv') return [];
    return entityIds
      .filter((id) => id.startsWith('media_player.'))
      .map((id) => ({ id, name: getEntityName(id) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [addCardType, entityIds, getEntityName]);

  const androidTVRemoteOptionsSnapshot = useMemo(() => {
    if (addCardType !== 'androidtv' && addCardType !== 'appletv') return [];
    return entityIds
      .filter((id) => id.startsWith('remote.'))
      .map((id) => ({ id, name: getEntityName(id) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [addCardType, entityIds, getEntityName]);

  const nordpoolOptionsSnapshot = useMemo(() => {
    if (addCardType !== 'nordpool') return [];
    return entityIds
      .filter((id) => id.startsWith('sensor.') && id.toLowerCase().includes('nordpool'))
      .map((id) => ({ id, name: getEntityName(id) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [addCardType, entityIds, getEntityName]);

  const excludedOnPage = useMemo(
    () => new Set(pagesConfig[addCardTargetPage] || []),
    [pagesConfig, addCardTargetPage]
  );
  const excludedHeader = useMemo(() => new Set(pagesConfig.header || []), [pagesConfig]);
  const excludedSettings = useMemo(() => new Set(pagesConfig.settings || []), [pagesConfig]);

  const EntityItem = ({
    id,
    isSelected,
    onClick,
    badgeText,
    displayName,
  }: {
    id: string;
    isSelected: boolean;
    onClick: () => void;
    badgeText?: string;
    displayName?: string;
  }) => (
    <Button
      variant="control"
      type="button"
      key={id}
      onClick={onClick}
      aria-pressed={isSelected}
      className={`group entity-item flex w-full items-center justify-between rounded-2xl border p-3 text-left transition-colors ${isSelected ? SELECTED_CONTAINER : 'popup-surface popup-surface-hover border-transparent'}`}
    >
      <div className="mr-4 flex flex-col overflow-hidden">
        <span
          className={`truncate text-sm font-bold transition-colors ${isSelected ? SELECTED_TEXT : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}
        >
          {displayName || entities[id]?.attributes?.friendly_name || id}
        </span>
        <span
          className={`truncate text-[11px] font-medium ${isSelected ? SELECTED_SUBTEXT : 'text-[var(--text-secondary)] group-hover:text-[var(--text-secondary)]'}`}
        >
          {id}
        </span>
      </div>
      {badgeText ? (
        <span className="aca-selected-text rounded-full border border-[var(--accent-color)] bg-[var(--accent-bg)] px-2 py-1 text-[9px] font-bold tracking-widest uppercase">
          {badgeText}
        </span>
      ) : (
        <div
          className={`flex-shrink-0 rounded-full p-2 transition-colors ${isSelected ? SELECTED_ICON : 'group-hover:aca-selected-text bg-[var(--glass-bg)] text-[var(--text-secondary)] group-hover:bg-[var(--accent-bg)]'}`}
        >
          {isSelected ? (
            <Check color="currentColor" aria-hidden="true" className="h-4 w-4" />
          ) : (
            <Plus color="currentColor" aria-hidden="true" className="h-4 w-4" />
          )}
        </div>
      )}
    </Button>
  );

  const filteredGenericEntityIds = useMemo(() => {
    return entityIds.filter((id) => {
      if (addCardTargetPage === 'header')
        return id.startsWith('person.') && !excludedHeader.has(id);
      if (addCardTargetPage === 'settings') return !excludedSettings.has(id);
      if (addCardType === 'lock') return id.startsWith('lock.') && !excludedOnPage.has(id);
      if (addCardType === 'vacuum') return id.startsWith('vacuum.') && !excludedOnPage.has(id);
      if (addCardType === 'mower') return id.startsWith('lawn_mower.') && !excludedOnPage.has(id);
      if (addCardType === 'fan') return id.startsWith('fan.') && !excludedOnPage.has(id);
      if (addCardType === 'camera') return id.startsWith('camera.');
      if (addCardType === 'cover') return id.startsWith('cover.');
      if (addCardType === 'climate') return id.startsWith('climate.');
      if (addCardType === 'alarm') return id.startsWith('alarm_control_panel.');
      if (addCardType === 'androidtv' || addCardType === 'appletv')
        return id.startsWith('media_player.') || id.startsWith('remote.');
      if (addCardType === 'cost') return id.startsWith('sensor.') || id.startsWith('input_number.');
      if (addCardType === 'media') return id.startsWith('media_player.');
      if (addCardType === 'sonos')
        return id.startsWith('media_player.') && isSonosMediaEntity(entities[id]);
      if (addCardType === 'sensor') {
        return (
          id.startsWith('sensor.') ||
          id.startsWith('script.') ||
          id.startsWith('scene.') ||
          id.startsWith('input_number.') ||
          id.startsWith('input_boolean.') ||
          id.startsWith('binary_sensor.') ||
          id.startsWith('switch.') ||
          id.startsWith('light.') ||
          id.startsWith('climate.') ||
          id.startsWith('button.') ||
          id.startsWith('input_button.') ||
          id.startsWith('automation.') ||
          id.startsWith('select.') ||
          id.startsWith('input_select.')
        );
      }
      if (addCardType === 'toggle') return isToggleEntity(id) && !excludedOnPage.has(id);
      if (addCardType === 'entity') {
        return !id.startsWith('person.') && !id.startsWith('update.') && !excludedOnPage.has(id);
      }
      return id.startsWith('light.') && !excludedOnPage.has(id);
    });
  }, [
    entityIds,
    addCardTargetPage,
    addCardType,
    excludedHeader,
    excludedOnPage,
    excludedSettings,
    entities,
  ]);

  const visibleGenericEntityIds = useMemo(() => {
    const sorted = filteredGenericEntityIds
      .filter((id) => {
        if (!lowerSearchTerm) return true;
        const name = getEntityName(id);
        return (
          id.toLowerCase().includes(lowerSearchTerm) || name.toLowerCase().includes(lowerSearchTerm)
        );
      })
      .sort((a, b) => getEntityName(a).localeCompare(getEntityName(b)));

    return addCardTargetPage === 'settings' ? sorted.slice(0, 100) : sorted;
  }, [filteredGenericEntityIds, lowerSearchTerm, addCardTargetPage, getEntityName]);

  const visibleWeatherOptions = useMemo(
    () =>
      weatherOptionsSnapshot.filter(
        ({ id, name }) =>
          !lowerSearchTerm ||
          id.toLowerCase().includes(lowerSearchTerm) ||
          name.toLowerCase().includes(lowerSearchTerm)
      ),
    [weatherOptionsSnapshot, lowerSearchTerm]
  );

  const visibleTempOptions = useMemo(
    () =>
      tempOptionsSnapshot.filter(
        ({ id, name }) =>
          !lowerSearchTerm ||
          id.toLowerCase().includes(lowerSearchTerm) ||
          name.toLowerCase().includes(lowerSearchTerm)
      ),
    [tempOptionsSnapshot, lowerSearchTerm]
  );

  const visibleAndroidTVMediaOptions = useMemo(
    () =>
      androidTVMediaOptionsSnapshot.filter(
        ({ id, name }) =>
          !lowerSearchTerm ||
          id.toLowerCase().includes(lowerSearchTerm) ||
          name.toLowerCase().includes(lowerSearchTerm)
      ),
    [androidTVMediaOptionsSnapshot, lowerSearchTerm]
  );

  const visibleAndroidTVRemoteOptions = useMemo(
    () =>
      androidTVRemoteOptionsSnapshot.filter(
        ({ id, name }) =>
          !lowerSearchTerm ||
          id.toLowerCase().includes(lowerSearchTerm) ||
          name.toLowerCase().includes(lowerSearchTerm)
      ),
    [androidTVRemoteOptionsSnapshot, lowerSearchTerm]
  );

  const visibleNordpoolOptions = useMemo(
    () =>
      nordpoolOptionsSnapshot.filter(
        ({ id, name }) =>
          !lowerSearchTerm ||
          id.toLowerCase().includes(lowerSearchTerm) ||
          name.toLowerCase().includes(lowerSearchTerm)
      ),
    [nordpoolOptionsSnapshot, lowerSearchTerm]
  );

  // --- Render sections ---

  const renderWeatherSection = () => {
    return (
      <div className="space-y-8">
        <div>
          <p className="mb-4 ml-4 text-xs font-bold text-[var(--text-secondary)] uppercase">
            {t('addCard.weatherRequired')}
          </p>
          <div className="space-y-3">
            {visibleWeatherOptions.map(({ id, name }) => (
              <EntityItem
                key={id}
                id={id}
                displayName={name}
                isSelected={selectedWeatherId === id}
                onClick={() => setSelectedWeatherId((prev) => (prev === id ? null : id))}
              />
            ))}
            {weatherOptionsSnapshot.length === 0 && (
              <p className="py-4 text-center text-sm text-[var(--text-secondary)] italic">
                {t('addCard.noWeatherSensors')}
              </p>
            )}
          </div>
        </div>

        <div>
          <p className="mb-4 ml-4 text-xs font-bold text-[var(--text-secondary)] uppercase">
            {t('addCard.tempSensorOptional')}
          </p>
          <div className="space-y-3">
            <Button
              variant="control"
              type="button"
              onClick={() => setSelectedTempId(null)}
              aria-pressed={!selectedTempId}
              className={`group entity-item flex w-full items-center justify-between rounded-2xl border p-3 text-left transition-colors ${!selectedTempId ? SELECTED_CONTAINER : 'popup-surface popup-surface-hover border-transparent'}`}
            >
              <div className="mr-4 flex flex-col overflow-hidden">
                <span
                  className={`truncate text-sm font-bold transition-colors ${!selectedTempId ? SELECTED_TEXT : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}
                >
                  {t('addCard.useWeatherTemp')}
                </span>
                <span
                  className={`truncate text-[11px] font-medium ${!selectedTempId ? SELECTED_SUBTEXT : 'text-[var(--text-secondary)] group-hover:text-[var(--text-secondary)]'}`}
                >
                  weather.temperature
                </span>
              </div>
              <div
                className={`flex-shrink-0 rounded-full p-2 transition-colors ${!selectedTempId ? SELECTED_ICON : 'group-hover:aca-selected-text bg-[var(--glass-bg)] text-[var(--text-secondary)] group-hover:bg-[var(--accent-bg)]'}`}
              >
                {!selectedTempId ? (
                  <Check color="currentColor" aria-hidden="true" className="h-4 w-4" />
                ) : (
                  <Plus color="currentColor" aria-hidden="true" className="h-4 w-4" />
                )}
              </div>
            </Button>
            {visibleTempOptions.map(({ id, name }) => (
              <EntityItem
                key={id}
                id={id}
                displayName={name}
                isSelected={selectedTempId === id}
                onClick={() => setSelectedTempId((prev) => (prev === id ? null : id))}
              />
            ))}
            {tempOptionsSnapshot.length === 0 && (
              <p className="py-4 text-center text-sm text-[var(--text-secondary)] italic">
                {t('addCard.noTempSensors')}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderTVSection = (isAppleTV = false) => {
    const selectedMediaId = isAppleTV ? selectedAppleTVMediaId : selectedAndroidTVMediaId;
    const setSelectedMediaId = isAppleTV ? setSelectedAppleTVMediaId : setSelectedAndroidTVMediaId;
    const selectedRemoteId = isAppleTV ? selectedAppleTVRemoteId : selectedAndroidTVRemoteId;
    const setSelectedRemoteId = isAppleTV
      ? setSelectedAppleTVRemoteId
      : setSelectedAndroidTVRemoteId;

    return (
      <div className="space-y-8">
        <div>
          <p className="mb-4 ml-4 text-xs font-bold text-[var(--text-secondary)] uppercase">
            {t('addCard.mediaPlayerRequired')}
          </p>
          <div className="space-y-3">
            {visibleAndroidTVMediaOptions.map(({ id, name }) => (
              <EntityItem
                key={id}
                id={id}
                displayName={name}
                isSelected={selectedMediaId === id}
                onClick={() => setSelectedMediaId((prev) => (prev === id ? null : id))}
              />
            ))}
            {androidTVMediaOptionsSnapshot.length === 0 && (
              <p className="py-4 text-center text-sm text-[var(--text-secondary)] italic">
                {t('addCard.noMediaPlayers')}
              </p>
            )}
          </div>
        </div>

        <div>
          <p className="mb-4 ml-4 text-xs font-bold text-[var(--text-secondary)] uppercase">
            {t('addCard.remoteOptional')}
          </p>
          <div className="space-y-3">
            <Button
              variant="control"
              type="button"
              onClick={() => setSelectedRemoteId(null)}
              aria-pressed={!selectedRemoteId}
              className={`group entity-item flex w-full items-center justify-between rounded-2xl border p-3 text-left transition-colors ${!selectedRemoteId ? SELECTED_CONTAINER : 'popup-surface popup-surface-hover border-transparent'}`}
            >
              <div className="mr-4 flex flex-col overflow-hidden">
                <span
                  className={`truncate text-sm font-bold transition-colors ${!selectedRemoteId ? SELECTED_TEXT : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}
                >
                  {t('addCard.noRemote')}
                </span>
                <span
                  className={`truncate text-[11px] font-medium ${!selectedRemoteId ? SELECTED_SUBTEXT : 'text-[var(--text-secondary)] group-hover:text-[var(--text-secondary)]'}`}
                >
                  {t('addCard.mediaControlOnly')}
                </span>
              </div>
              <div
                className={`flex-shrink-0 rounded-full p-2 transition-colors ${!selectedRemoteId ? SELECTED_ICON : 'group-hover:aca-selected-text bg-[var(--glass-bg)] text-[var(--text-secondary)] group-hover:bg-[var(--accent-bg)]'}`}
              >
                {!selectedRemoteId ? (
                  <Check color="currentColor" aria-hidden="true" className="h-4 w-4" />
                ) : (
                  <Plus color="currentColor" aria-hidden="true" className="h-4 w-4" />
                )}
              </div>
            </Button>
            {visibleAndroidTVRemoteOptions.map(({ id, name }) => (
              <EntityItem
                key={id}
                id={id}
                displayName={name}
                isSelected={selectedRemoteId === id}
                onClick={() => setSelectedRemoteId((prev) => (prev === id ? null : id))}
              />
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderSimpleAddSection = (Icon: PickerIcon, description: string, buttonLabel: string) => (
    <div className="flex flex-col items-center justify-center space-y-4 py-10 text-center">
      <div className="popup-surface rounded-full border border-[var(--glass-border)] p-4 text-[var(--text-primary)]">
        <Icon color="currentColor" aria-hidden="true" className="h-8 w-8" />
      </div>
      <p className="max-w-xs text-sm text-[var(--text-secondary)]">{description}</p>
      <Button variant="primary" onClick={() => onAddSelected()} className="w-full sm:w-auto">
        {buttonLabel}
      </Button>
    </div>
  );

  const renderCalendarSection = () => {
    const visibleCalendars = calendarOptionsSnapshot.filter(
      ({ id, name }) =>
        !lowerSearchTerm ||
        id.toLowerCase().includes(lowerSearchTerm) ||
        name.toLowerCase().includes(lowerSearchTerm)
    );

    return (
      <div className="space-y-3">
        <p className="mb-1 ml-4 text-xs font-bold text-[var(--text-secondary)] uppercase">
          {t('calendar.selectCalendars') || 'Select Calendars'}
        </p>
        <div className="space-y-3">
          {visibleCalendars.map(({ id, name }) => {
            const isSelected = selectedEntitiesSet.has(id);
            return (
              <Button
                variant="control"
                type="button"
                key={id}
                onClick={() => {
                  if (isSelected) setSelectedEntities((prev) => prev.filter((x) => x !== id));
                  else setSelectedEntities((prev) => [...prev, id]);
                }}
                aria-pressed={isSelected}
                className={`group entity-item flex w-full items-center justify-between rounded-2xl border p-3 text-left transition-colors ${isSelected ? SELECTED_CONTAINER : 'popup-surface popup-surface-hover border-transparent'}`}
              >
                <div className="mr-4 flex flex-col overflow-hidden">
                  <span
                    className={`truncate text-sm font-bold transition-colors ${isSelected ? SELECTED_TEXT : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}
                  >
                    {name}
                  </span>
                  <span
                    className={`truncate text-[11px] font-medium ${isSelected ? SELECTED_SUBTEXT : 'text-[var(--text-secondary)] group-hover:text-[var(--text-secondary)]'}`}
                  >
                    {id}
                  </span>
                </div>
                <div
                  className={`flex-shrink-0 rounded-full p-2 transition-colors ${isSelected ? SELECTED_ICON : 'group-hover:aca-selected-text bg-[var(--glass-bg)] text-[var(--text-secondary)] group-hover:bg-[var(--accent-bg)]'}`}
                >
                  {isSelected ? (
                    <Check color="currentColor" aria-hidden="true" className="h-4 w-4" />
                  ) : (
                    <Plus color="currentColor" aria-hidden="true" className="h-4 w-4" />
                  )}
                </div>
              </Button>
            );
          })}
          {calendarOptionsSnapshot.length === 0 && (
            <p className="py-4 text-center text-sm text-[var(--text-secondary)] italic">
              {t('calendar.noCalendarsFound') || 'No calendars found'}
            </p>
          )}
          {calendarOptionsSnapshot.length > 0 && visibleCalendars.length === 0 && (
            <p className="py-4 text-center text-sm text-[var(--text-secondary)] italic">
              {t('form.noResults') || 'No results'}
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderSpacerSection = () => (
    <div className="flex flex-col items-center justify-center space-y-4 py-10 text-center">
      <div className="popup-surface rounded-full border border-[var(--glass-border)] p-4 text-[var(--text-primary)]">
        <Minus color="currentColor" aria-hidden="true" className="h-8 w-8" />
      </div>
      <p className="max-w-xs text-sm text-[var(--text-secondary)]">
        {t('addCard.spacerDescription') ||
          'Add a spacer or divider card. You can switch between spacer and divider in the edit settings.'}
      </p>
      <div className="w-full max-w-sm space-y-2">
        <p className="text-xs font-bold text-[var(--text-secondary)] uppercase">
          {t('addCard.spacer.selectVariant') || 'Select variant'}
        </p>
        <div className="flex gap-2">
          {[
            { key: 'spacer', label: t('addCard.spacer.spacer') || 'Spacer' },
            { key: 'divider', label: t('addCard.spacer.divider') || 'Divider' },
          ].map((variant) => (
            <Button
              variant="control"
              key={variant.key}
              type="button"
              onClick={() => {
                setLocalSpacerVariant(variant.key);
                setSelectedSpacerVariant(variant.key);
              }}
              className={`flex-1 rounded-xl border px-4 py-2 text-xs font-bold tracking-widest uppercase transition-colors ${localSpacerVariant === variant.key ? 'popup-surface border-[var(--glass-border)] text-[var(--text-primary)]' : 'popup-surface popup-surface-hover text-[var(--text-secondary)]'}`}
              aria-pressed={localSpacerVariant === variant.key}
            >
              {variant.label}
            </Button>
          ))}
        </div>
      </div>
      <Button
        variant="primary"
        onClick={() => onAddSelected({ spacerVariant: localSpacerVariant })}
        className="w-full sm:w-auto"
      >
        {t('addCard.add')}
      </Button>
    </div>
  );

  const renderNordpoolSection = () => {
    return (
      <div className="space-y-8">
        <div>
          <p className="mb-4 ml-4 text-xs font-bold text-[var(--text-secondary)] uppercase">
            {t('addCard.nordpoolSensorRequired')}
          </p>
          <div className="space-y-3">
            {visibleNordpoolOptions.map(({ id, name }) => (
              <EntityItem
                key={id}
                id={id}
                displayName={name}
                isSelected={selectedNordpoolId === id}
                onClick={() => setSelectedNordpoolId((prev) => (prev === id ? null : id))}
              />
            ))}
            {nordpoolOptionsSnapshot.length === 0 && (
              <p className="py-4 text-center text-sm text-[var(--text-secondary)] italic">
                {t('addCard.noNordpoolSensors')}
              </p>
            )}
          </div>
        </div>
        <div>
          <p className="mb-2 ml-4 text-xs font-bold text-[var(--text-secondary)] uppercase">
            {t('addCard.decimals')}
          </p>
          <div className="flex gap-2 px-4">
            {[0, 1, 2, 3].map((dec) => (
              <Button
                variant="control"
                key={dec}
                onClick={() => setNordpoolDecimals(dec)}
                className={`rounded-lg px-4 py-2 font-bold transition-colors ${nordpoolDecimals === dec ? 'popup-surface border' : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]'}`}
                aria-pressed={nordpoolDecimals === dec}
              >
                {dec}
              </Button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderGenericEntityList = () => {
    return (
      <div>
        {addCardType === 'cost' && (
          <div className="mb-5">
            <p className="mb-2 ml-4 text-xs font-bold text-[var(--text-secondary)] uppercase">
              {t('addCard.costPickTarget')}
            </p>
            <div className="aca-choice-group flex flex-wrap gap-3 p-1">
              <Button
                variant="control"
                onClick={() => setCostSelectionTarget('today')}
                aria-pressed={costSelectionTarget === 'today'}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-bold tracking-widest whitespace-nowrap uppercase transition-colors ${costSelectionTarget === 'today' ? `${SELECTED_CONTAINER} ${SELECTED_TEXT}` : 'border-transparent bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
              >
                <Coins color="currentColor" aria-hidden="true" className="h-4 w-4" />{' '}
                {t('addCard.costToday')}
              </Button>
              <Button
                variant="control"
                onClick={() => setCostSelectionTarget('month')}
                aria-pressed={costSelectionTarget === 'month'}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-bold tracking-widest whitespace-nowrap uppercase transition-colors ${costSelectionTarget === 'month' ? `${SELECTED_CONTAINER} ${SELECTED_TEXT}` : 'border-transparent bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'}`}
              >
                <Coins color="currentColor" aria-hidden="true" className="h-4 w-4" />{' '}
                {t('addCard.costMonth')}
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold tracking-widest text-[var(--text-secondary)] uppercase">
              <span
                className={`rounded-full border px-3 py-1 ${selectedCostTodayId ? 'aca-selected-text border-[var(--accent-color)] bg-[var(--accent-bg)]' : 'border-[var(--glass-border)] text-[var(--text-secondary)]'}`}
              >
                {t('addCard.costToday')}:{' '}
                {selectedCostTodayId
                  ? entities[selectedCostTodayId]?.attributes?.friendly_name || selectedCostTodayId
                  : t('common.missing')}
              </span>
              <span
                className={`rounded-full border px-3 py-1 ${selectedCostMonthId ? 'aca-selected-text border-[var(--accent-color)] bg-[var(--accent-bg)]' : 'border-[var(--glass-border)] text-[var(--text-secondary)]'}`}
              >
                {t('addCard.costMonth')}:{' '}
                {selectedCostMonthId
                  ? entities[selectedCostMonthId]?.attributes?.friendly_name || selectedCostMonthId
                  : t('common.missing')}
              </span>
            </div>
          </div>
        )}
        <p className="mb-4 ml-4 text-xs font-bold text-[var(--text-secondary)] uppercase">
          {getAddCardAvailableLabel()}
        </p>
        <div className="space-y-3">
          {visibleGenericEntityIds.map((id) => {
            const isSelected =
              addCardType === 'cost'
                ? selectedCostTodayId === id || selectedCostMonthId === id
                : selectedEntitiesSet.has(id);
            const isSelectedToday = selectedCostTodayId === id;
            const isSelectedMonth = selectedCostMonthId === id;
            return (
              <Button
                variant="control"
                type="button"
                key={id}
                onClick={() => {
                  if (addCardType === 'cost') {
                    if (costSelectionTarget === 'today') {
                      setSelectedCostTodayId((prev) => (prev === id ? null : id));
                    } else {
                      setSelectedCostMonthId((prev) => (prev === id ? null : id));
                    }
                    return;
                  }
                  if (selectedEntitiesSet.has(id))
                    setSelectedEntities((prev) => prev.filter((e) => e !== id));
                  else setSelectedEntities((prev) => [...prev, id]);
                }}
                aria-pressed={isSelected}
                className={`group entity-item flex w-full items-center justify-between rounded-2xl border p-3 text-left transition-colors ${isSelected ? SELECTED_CONTAINER : 'popup-surface popup-surface-hover border-transparent'}`}
              >
                <div className="mr-4 flex flex-col overflow-hidden">
                  <span
                    className={`truncate text-sm font-bold transition-colors ${isSelected ? SELECTED_TEXT : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}
                  >
                    {entities[id].attributes?.friendly_name || id}
                  </span>
                  <span
                    className={`truncate text-[11px] font-medium ${isSelected ? SELECTED_SUBTEXT : 'text-[var(--text-secondary)] group-hover:text-[var(--text-secondary)]'}`}
                  >
                    {id}
                  </span>
                </div>
                {addCardType === 'cost' ? (
                  <div className="flex flex-shrink-0 items-center gap-2">
                    {isSelectedToday && (
                      <span className="aca-selected-text rounded-full border border-[var(--accent-color)] bg-[var(--accent-bg)] px-2 py-1 text-[9px] font-bold tracking-widest uppercase">
                        {t('addCard.costToday')}
                      </span>
                    )}
                    {isSelectedMonth && (
                      <span className="aca-selected-text rounded-full border border-[var(--accent-color)] bg-[var(--accent-bg)] px-2 py-1 text-[9px] font-bold tracking-widest uppercase">
                        {t('addCard.costMonth')}
                      </span>
                    )}
                    {!isSelected && (
                      <div className="group-hover:aca-selected-text rounded-full bg-[var(--glass-bg)] p-2 text-[var(--text-secondary)] transition-colors group-hover:bg-[var(--accent-bg)]">
                        <Plus color="currentColor" aria-hidden="true" className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className={`flex-shrink-0 rounded-full p-2 transition-colors ${isSelected ? SELECTED_ICON : 'group-hover:aca-selected-text bg-[var(--glass-bg)] text-[var(--text-secondary)] group-hover:bg-[var(--accent-bg)]'}`}
                  >
                    {isSelected ? (
                      <Check color="currentColor" aria-hidden="true" className="h-4 w-4" />
                    ) : (
                      <Plus color="currentColor" aria-hidden="true" className="h-4 w-4" />
                    )}
                  </div>
                )}
              </Button>
            );
          })}
          {filteredGenericEntityIds.length === 0 && (
            <p className="py-4 text-center text-sm text-[var(--text-secondary)] italic">
              {getAddCardNoneLeftLabel()}
            </p>
          )}
        </div>
      </div>
    );
  };

  const usesEntityMultiSelect = [
    'sensor',
    'light',
    'lock',
    'vacuum',
    'mower',
    'fan',
    'camera',
    'climate',
    'cover',
    'alarm',
    'media',
    'sonos',
    'toggle',
    'entity',
  ].includes(addCardType);
  const usesMultiSelectWithCalendar = usesEntityMultiSelect || addCardType === 'calendar';

  return (
    <Modal
      open
      onClose={onClose}
      titleId="add-card-modal-title"
      title={t('modal.addCard.title')}
      closeLabel={t('common.close')}
      wide
      footer={
        <div className="flex flex-col gap-3">
          {usesMultiSelectWithCalendar && selectedEntities.length > 0 && (
            <Button variant="primary" onClick={onAddSelected} className={PRIMARY_ADD_BUTTON}>
              <Plus color="currentColor" aria-hidden="true" className="h-5 w-5" />{' '}
              {addCardType === 'media'
                ? `${t('addCard.add')} ${selectedEntities.length} ${t('addCard.players')}`
                : addCardType === 'sonos'
                  ? `${t('addCard.add')} ${selectedEntities.length} ${t('addCard.players')}`
                  : addCardType === 'calendar'
                    ? `${t('addCard.add')} ${t('addCard.type.calendar') || 'Calendar'} ${t('addCard.cards')}`
                    : addCardType === 'camera'
                      ? `${t('addCard.add')} ${selectedEntities.length} ${t('addCard.cameraCard') || 'camera cards'}`
                      : `${t('addCard.add')} ${selectedEntities.length} ${t('addCard.cards')}`}
            </Button>
          )}
          {addCardType === 'cost' && selectedCostTodayId && selectedCostMonthId && (
            <Button variant="primary" onClick={onAddSelected} className={PRIMARY_ADD_BUTTON}>
              <Plus color="currentColor" aria-hidden="true" className="h-5 w-5" />{' '}
              {t('addCard.costCard')}
            </Button>
          )}
          {addCardType === 'weather' && selectedWeatherId && (
            <Button variant="primary" onClick={onAddSelected} className={PRIMARY_ADD_BUTTON}>
              <Plus color="currentColor" aria-hidden="true" className="h-5 w-5" />{' '}
              {t('addCard.weatherCard')}
            </Button>
          )}
          {addCardType === 'nordpool' && selectedNordpoolId && (
            <Button variant="primary" onClick={onAddSelected} className={PRIMARY_ADD_BUTTON}>
              <Plus color="currentColor" aria-hidden="true" className="h-5 w-5" />{' '}
              {t('addCard.nordpoolCard')}
            </Button>
          )}
          {addCardType === 'androidtv' && selectedAndroidTVMediaId && (
            <Button variant="primary" onClick={onAddSelected} className={PRIMARY_ADD_BUTTON}>
              <Plus color="currentColor" aria-hidden="true" className="h-5 w-5" />{' '}
              {t('addCard.add')}
            </Button>
          )}
          {addCardType === 'appletv' && selectedAppleTVMediaId && (
            <Button variant="primary" onClick={onAddSelected} className={PRIMARY_ADD_BUTTON}>
              <Plus color="currentColor" aria-hidden="true" className="h-5 w-5" />{' '}
              {t('addCard.add')}
            </Button>
          )}
          {addCardType === 'room' && selectedRoomAreas.length > 0 && (
            <Button
              variant="primary"
              onClick={() => onAddRoom && onAddRoom(selectedRoomAreas, selectedRoomEntitiesById)}
              className={PRIMARY_ADD_BUTTON}
            >
              <Plus color="currentColor" aria-hidden="true" className="h-5 w-5" />{' '}
              {`${t('addCard.add')} ${selectedRoomAreas.length} ${t('addCard.cards')}`}
            </Button>
          )}
          <Button variant="secondary" onClick={onClose} className="w-full">
            {t('common.close')}
          </Button>
        </div>
      }
    >
      <Container className="aca-management aca-add-card space-y-5">
        {addCardTargetPage !== 'header' && (
          <div className="relative mb-4">
            <Search
              color="currentColor"
              aria-hidden="true"
              className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]"
            />
            <Input
              type="text"
              data-autofocus
              aria-label={t('addCard.search')}
              placeholder={t('addCard.search')}
              className="aca-input--search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}

        {addCardTargetPage !== 'header' && addCardTargetPage !== 'settings' && (
          <div className="mb-5">
            <Heading level={3} className="aca-field-label mb-3">
              {t('addCard.cardType')}
            </Heading>
            <div className="aca-choice-group flex flex-wrap gap-3 p-1">
              <TypeButton
                type="sensor"
                icon={Sparkles}
                label={t('addCard.type.sensor')}
                isActive={addCardType === 'sensor'}
                onSelect={setAddCardType}
              />
              <TypeButton
                type="light"
                icon={Lightbulb}
                label={t('addCard.type.light')}
                isActive={addCardType === 'light'}
                onSelect={setAddCardType}
              />
              <TypeButton
                type="lock"
                icon={Lock}
                label={getLabel('addCard.type.lock', 'Lock')}
                isActive={addCardType === 'lock'}
                onSelect={setAddCardType}
              />
              <TypeButton
                type="vacuum"
                icon={Bot}
                label={t('addCard.type.vacuum')}
                isActive={addCardType === 'vacuum'}
                onSelect={setAddCardType}
              />
              <TypeButton
                type="mower"
                icon={Sprout}
                label={t('addCard.type.mower')}
                isActive={addCardType === 'mower'}
                onSelect={setAddCardType}
              />
              <TypeButton
                type="fan"
                icon={Fan}
                label={t('addCard.type.fan')}
                isActive={addCardType === 'fan'}
                onSelect={setAddCardType}
              />
              <TypeButton
                type="camera"
                icon={Camera}
                label={`${getLabel('addCard.type.camera', 'Camera')}${betaSuffix}`}
                isActive={addCardType === 'camera'}
                onSelect={setAddCardType}
              />
              <TypeButton
                type="climate"
                icon={Thermometer}
                label={t('addCard.type.climate')}
                isActive={addCardType === 'climate'}
                onSelect={setAddCardType}
              />
              <TypeButton
                type="cover"
                icon={ArrowUpDown}
                label={getLabel('addCard.type.cover', 'Cover')}
                isActive={addCardType === 'cover'}
                onSelect={setAddCardType}
              />
              <TypeButton
                type="alarm"
                icon={Shield}
                label={getLabel('addCard.type.alarm', 'Alarm')}
                isActive={addCardType === 'alarm'}
                onSelect={setAddCardType}
              />
              <TypeButton
                type="car"
                icon={Car}
                label={t('addCard.type.car')}
                isActive={addCardType === 'car'}
                onSelect={setAddCardType}
              />
              <TypeButton
                type="androidtv"
                icon={Gamepad2}
                label={t('addCard.type.androidtv')}
                isActive={addCardType === 'androidtv'}
                onSelect={setAddCardType}
              />
              <TypeButton
                type="appletv"
                icon={Tv}
                label={t('addCard.type.appletv')}
                isActive={addCardType === 'appletv'}
                onSelect={setAddCardType}
              />
              <TypeButton
                type="cost"
                icon={Coins}
                label={t('addCard.type.cost')}
                isActive={addCardType === 'cost'}
                onSelect={setAddCardType}
              />
              <TypeButton
                type="media"
                icon={Music}
                label={t('addCard.type.media')}
                isActive={addCardType === 'media'}
                onSelect={setAddCardType}
              />
              <TypeButton
                type="sonos"
                icon={Speaker}
                label={t('addCard.type.sonos')}
                isActive={addCardType === 'sonos'}
                onSelect={setAddCardType}
              />
              <TypeButton
                type="weather"
                icon={CloudSun}
                label={t('addCard.type.weather')}
                isActive={addCardType === 'weather'}
                onSelect={setAddCardType}
              />
              <TypeButton
                type="calendar"
                icon={Calendar}
                label={getLabel('addCard.type.calendar', 'Calendar')}
                isActive={addCardType === 'calendar'}
                onSelect={setAddCardType}
              />
              <TypeButton
                type="todo"
                icon={ListChecks}
                label={getLabel('addCard.type.todo', 'Todo')}
                isActive={addCardType === 'todo'}
                onSelect={setAddCardType}
              />
              <TypeButton
                type="nordpool"
                icon={Zap}
                label={t('addCard.type.nordpool')}
                isActive={addCardType === 'nordpool'}
                onSelect={setAddCardType}
              />
              <TypeButton
                type="room"
                icon={Home}
                label={getLabel('addCard.type.room', 'Room')}
                isActive={addCardType === 'room'}
                onSelect={setAddCardType}
              />
              <TypeButton
                type="spacer"
                icon={Minus}
                label={getLabel('addCard.type.spacer', 'Spacer')}
                isActive={addCardType === 'spacer'}
                onSelect={setAddCardType}
              />
            </div>
            {addCardType === 'sensor' && (
              <p className="mt-2 ml-4 text-[11px] text-[var(--text-secondary)] opacity-75">
                {t('addCard.sensorIncludes') !== 'addCard.sensorIncludes'
                  ? t('addCard.sensorIncludes')
                  : 'Includes binary sensors, sensors, switches, automations, scripts and more.'}
              </p>
            )}
          </div>
        )}

        <div className="space-y-6">
          {addCardType === 'weather' ? (
            renderWeatherSection()
          ) : addCardType === 'androidtv' ? (
            renderTVSection(false)
          ) : addCardType === 'appletv' ? (
            renderTVSection(true)
          ) : addCardType === 'calendar' ? (
            renderCalendarSection()
          ) : addCardType === 'todo' ? (
            renderSimpleAddSection(
              ListChecks,
              t('addCard.todoDescription') ||
                'Add a to-do card. You can select which list to use after adding.',
              t('addCard.add')
            )
          ) : addCardType === 'spacer' ? (
            renderSpacerSection()
          ) : addCardType === 'car' ? (
            renderSimpleAddSection(Car, t('addCard.carDescription'), t('addCard.carCard'))
          ) : addCardType === 'nordpool' ? (
            renderNordpoolSection()
          ) : addCardType === 'room' ? (
            <RoomSection
              conn={conn}
              searchTerm={searchTerm}
              t={t}
              selectedAreas={selectedRoomAreas}
              setSelectedAreas={setSelectedRoomAreas}
              selectedAreaEntitiesById={selectedRoomEntitiesById}
              setSelectedAreaEntitiesById={setSelectedRoomEntitiesById}
            />
          ) : (
            renderGenericEntityList()
          )}
        </div>
      </Container>
    </Modal>
  );
}

const FLICKER_PRONE_TYPES = new Set(['androidtv', 'appletv', 'weather', 'nordpool']);

function areAddCardPropsEqual(prev: AddCardProps, next: AddCardProps) {
  const freezeType =
    FLICKER_PRONE_TYPES.has(prev.addCardType) && FLICKER_PRONE_TYPES.has(next.addCardType);
  if (!freezeType) return false;

  return (
    prev.addCardType === next.addCardType &&
    prev.addCardTargetPage === next.addCardTargetPage &&
    prev.searchTerm === next.searchTerm &&
    prev.selectedWeatherId === next.selectedWeatherId &&
    prev.selectedTempId === next.selectedTempId &&
    prev.selectedAndroidTVMediaId === next.selectedAndroidTVMediaId &&
    prev.selectedAndroidTVRemoteId === next.selectedAndroidTVRemoteId &&
    prev.selectedAppleTVMediaId === next.selectedAppleTVMediaId &&
    prev.selectedAppleTVRemoteId === next.selectedAppleTVRemoteId &&
    prev.selectedNordpoolId === next.selectedNordpoolId &&
    prev.nordpoolDecimals === next.nordpoolDecimals &&
    prev.t === next.t
  );
}

export default React.memo(AddCardContent, areAddCardPropsEqual);
