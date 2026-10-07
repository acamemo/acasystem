import { useMemo } from 'react';

/** Valori passati dall'app: l'hook li raggruppa senza leggerli. */
export interface AppViewModelParams {
  activePage: unknown;
  pagesConfig: unknown;
  pageSettings: unknown;
  editMode: unknown;
  isMediaPage: unknown;
  isSonosPage: unknown;
  isLightsPage: unknown;
  isBatteryPage: unknown;
  isRoomExplorerPage: unknown;
  entities: unknown;
  conn: unknown;
  isSonosActive: unknown;
  activeMediaId: unknown;
  setActiveMediaId: unknown;
  getA: unknown;
  getS: unknown;
  getEntityImageUrl: unknown;
  callService: unknown;
  savePageSetting: unknown;
  gridLayout: unknown;
  isMobile: unknown;
  gridGapV: unknown;
  gridGapH: unknown;
  gridColCount: unknown;
  isCompactCards: unknown;
  cardSettings: unknown;
  getCardSettingsKey: unknown;
  hiddenCards: unknown;
  isCardHiddenByLogic: unknown;
  renderCard: unknown;
  setShowAddCardModal: unknown;
  setConfigTab: unknown;
  setShowConfigModal: unknown;
  activeUrl: unknown;
  connected: unknown;
  authRef: unknown;
  config: unknown;
  setConfig: unknown;
  t: unknown;
  language: unknown;
  setLanguage: unknown;
  currentTheme: unknown;
  setCurrentTheme: unknown;
  bgMode: unknown;
  setBgMode: unknown;
  bgColor: unknown;
  setBgColor: unknown;
  bgGradient: unknown;
  setBgGradient: unknown;
  bgImage: unknown;
  setBgImage: unknown;
  cardTransparency: unknown;
  setCardTransparency: unknown;
  cardBorderOpacity: unknown;
  setCardBorderOpacity: unknown;
  cardBgColor: unknown;
  setCardBgColor: unknown;
  cardMaterial: unknown;
  setCardMaterial: unknown;
  density: unknown;
  setDensity: unknown;
  cardScale: unknown;
  setCardScale: unknown;
  inactivityTimeout: unknown;
  setInactivityTimeout: unknown;
  setGridGapH: unknown;
  setGridGapV: unknown;
  gridColumns: unknown;
  setGridColumns: unknown;
  dynamicGridColumns: unknown;
  setDynamicGridColumns: unknown;
  effectiveGridColumns: unknown;
  cardBorderRadius: unknown;
  setCardBorderRadius: unknown;
  sectionSpacing: unknown;
  updateSectionSpacing: unknown;
  cardsOnlyMode: unknown;
  updateCardsOnlyMode: unknown;
  headerTitle: unknown;
  headerScale: unknown;
  headerSettings: unknown;
  updateHeaderTitle: unknown;
  updateHeaderScale: unknown;
  updateHeaderSettings: unknown;
  showOnboarding: unknown;
  setShowOnboarding: unknown;
  isOnboardingActive: unknown;
  onboardingStep: unknown;
  setOnboardingStep: unknown;
  onboardingUrlError: unknown;
  setOnboardingUrlError: unknown;
  onboardingTokenError: unknown;
  setOnboardingTokenError: unknown;
  testingConnection: unknown;
  testConnection: unknown;
  connectionTestResult: unknown;
  setConnectionTestResult: unknown;
  startOAuthLogin: unknown;
  handleOAuthLogout: unknown;
  canAdvanceOnboarding: unknown;
  pageDefaults: unknown;
  editingPage: unknown;
  setEditingPage: unknown;
  newPageLabel: unknown;
  setNewPageLabel: unknown;
  newPageIcon: unknown;
  setNewPageIcon: unknown;
  createPage: unknown;
  createMediaPage: unknown;
  createSonosPage: unknown;
  createLightsPage: unknown;
  createBatteryPage: unknown;
  createRoomExplorerPage: unknown;
  deletePage: unknown;
  removeCard: unknown;
  persistPageSettings: unknown;
  persistConfig: unknown;
  optimisticLightBrightness: unknown;
  setOptimisticLightBrightness: unknown;
  hvacMap: unknown;
  fanMap: unknown;
  swingMap: unknown;
  isMediaActive: unknown;
  addCardTargetPage: unknown;
  addCardType: unknown;
  setAddCardType: unknown;
  searchTerm: unknown;
  setSearchTerm: unknown;
  selectedEntities: unknown;
  setSelectedEntities: unknown;
  selectedWeatherId: unknown;
  setSelectedWeatherId: unknown;
  selectedTempId: unknown;
  setSelectedTempId: unknown;
  selectedAndroidTVMediaId: unknown;
  setSelectedAndroidTVMediaId: unknown;
  selectedAndroidTVRemoteId: unknown;
  setSelectedAndroidTVRemoteId: unknown;
  selectedAppleTVMediaId: unknown;
  setSelectedAppleTVMediaId: unknown;
  selectedAppleTVRemoteId: unknown;
  setSelectedAppleTVRemoteId: unknown;
  selectedCostTodayId: unknown;
  setSelectedCostTodayId: unknown;
  selectedCostMonthId: unknown;
  setSelectedCostMonthId: unknown;
  costSelectionTarget: unknown;
  setCostSelectionTarget: unknown;
  selectedNordpoolId: unknown;
  setSelectedNordpoolId: unknown;
  nordpoolDecimals: unknown;
  setNordpoolDecimals: unknown;
  selectedSpacerVariant: unknown;
  setSelectedSpacerVariant: unknown;
  onAddSelected: unknown;
  getAddCardAvailableLabel: unknown;
  getAddCardNoneLeftLabel: unknown;
  saveCardSetting: unknown;
  persistCardSettings: unknown;
  customNames: unknown;
  saveCustomName: unknown;
  persistCustomNames: unknown;
  customIcons: unknown;
  saveCustomIcon: unknown;
  persistCustomIcons: unknown;
  toggleCardVisibility: unknown;
  persistHiddenCards: unknown;
  statusPillsConfig: unknown;
  saveStatusPillsConfig: unknown;
}

/**
 * Raggruppa i valori dell'app nei modelli passati a DashboardGrid e ModalManager.
 * Il tipo generico conserva i tipi forniti dal chiamante.
 */
export function useAppViewModels<P extends AppViewModelParams>(params: P) {
  const {
    activePage,
    pagesConfig,
    pageSettings,
    editMode,
    isMediaPage,
    isSonosPage,
    isLightsPage,
    isBatteryPage,
    isRoomExplorerPage,
    entities,
    conn,
    isSonosActive,
    activeMediaId,
    setActiveMediaId,
    getA,
    getS,
    getEntityImageUrl,
    callService,
    savePageSetting,
    gridLayout,
    isMobile,
    gridGapV,
    gridGapH,
    gridColCount,
    isCompactCards,
    cardSettings,
    getCardSettingsKey,
    hiddenCards,
    isCardHiddenByLogic,
    renderCard,
    setShowAddCardModal,
    setConfigTab,
    setShowConfigModal,
    activeUrl,
    connected,
    authRef,
    config,
    setConfig,
    t,
    language,
    setLanguage,
    currentTheme,
    setCurrentTheme,
    bgMode,
    setBgMode,
    bgColor,
    setBgColor,
    bgGradient,
    setBgGradient,
    bgImage,
    setBgImage,
    cardTransparency,
    setCardTransparency,
    cardBorderOpacity,
    setCardBorderOpacity,
    cardBgColor,
    setCardBgColor,
    cardMaterial,
    setCardMaterial,
    density,
    setDensity,
    cardScale,
    setCardScale,
    inactivityTimeout,
    setInactivityTimeout,
    setGridGapH,
    setGridGapV,
    gridColumns,
    setGridColumns,
    dynamicGridColumns,
    setDynamicGridColumns,
    effectiveGridColumns,
    cardBorderRadius,
    setCardBorderRadius,
    sectionSpacing,
    updateSectionSpacing,
    cardsOnlyMode,
    updateCardsOnlyMode,
    headerTitle,
    headerScale,
    headerSettings,
    updateHeaderTitle,
    updateHeaderScale,
    updateHeaderSettings,
    showOnboarding,
    setShowOnboarding,
    isOnboardingActive,
    onboardingStep,
    setOnboardingStep,
    onboardingUrlError,
    setOnboardingUrlError,
    onboardingTokenError,
    setOnboardingTokenError,
    testingConnection,
    testConnection,
    connectionTestResult,
    setConnectionTestResult,
    startOAuthLogin,
    handleOAuthLogout,
    canAdvanceOnboarding,
    pageDefaults,
    editingPage,
    setEditingPage,
    newPageLabel,
    setNewPageLabel,
    newPageIcon,
    setNewPageIcon,
    createPage,
    createMediaPage,
    createSonosPage,
    createLightsPage,
    createBatteryPage,
    createRoomExplorerPage,
    deletePage,
    removeCard,
    persistPageSettings,
    persistConfig,
    optimisticLightBrightness,
    setOptimisticLightBrightness,
    hvacMap,
    fanMap,
    swingMap,
    isMediaActive,
    addCardTargetPage,
    addCardType,
    setAddCardType,
    searchTerm,
    setSearchTerm,
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
    getAddCardAvailableLabel,
    getAddCardNoneLeftLabel,
    saveCardSetting,
    persistCardSettings,
    customNames,
    saveCustomName,
    persistCustomNames,
    customIcons,
    saveCustomIcon,
    persistCustomIcons,
    toggleCardVisibility,
    persistHiddenCards,
    statusPillsConfig,
    saveStatusPillsConfig,
  } = params;

  const dashboardGridPage = useMemo(
    () => ({
      activePage,
      pagesConfig,
      pageSettings,
      editMode,
      isMediaPage,
      isSonosPage,
      isLightsPage,
      isBatteryPage,
      isRoomExplorerPage,
    }),
    [
      activePage,
      pagesConfig,
      pageSettings,
      editMode,
      isMediaPage,
      isSonosPage,
      isLightsPage,
      isBatteryPage,
      isRoomExplorerPage,
    ]
  );

  const dashboardGridMedia = useMemo(
    () => ({
      entities,
      conn,
      isSonosActive,
      activeMediaId,
      setActiveMediaId,
      getA,
      getEntityImageUrl,
      callService,
      savePageSetting,
    }),
    [
      entities,
      conn,
      isSonosActive,
      activeMediaId,
      setActiveMediaId,
      getA,
      getEntityImageUrl,
      callService,
      savePageSetting,
    ]
  );

  const dashboardGridGrid = useMemo(
    () => ({
      gridLayout,
      isMobile,
      gridGapV,
      gridGapH,
      gridColCount,
      isCompactCards,
      cardScale,
    }),
    [gridLayout, isMobile, gridGapV, gridGapH, gridColCount, isCompactCards, cardScale]
  );

  const dashboardGridCards = useMemo(
    () => ({
      cardSettings,
      getCardSettingsKey,
      hiddenCards,
      isCardHiddenByLogic,
      renderCard,
    }),
    [cardSettings, getCardSettingsKey, hiddenCards, isCardHiddenByLogic, renderCard]
  );

  const dashboardGridActions = useMemo(
    () => ({
      setShowAddCardModal,
      setConfigTab,
      setShowConfigModal,
    }),
    [setShowAddCardModal, setConfigTab, setShowConfigModal]
  );

  const modalManagerCore = useMemo(
    () => ({
      entities,
      conn,
      activeUrl,
      connected,
      authRef,
      config,
      setConfig,
      t,
      language,
      setLanguage,
    }),
    [entities, conn, activeUrl, connected, authRef, config, setConfig, t, language, setLanguage]
  );

  const modalManagerAppearance = useMemo(
    () => ({
      currentTheme,
      setCurrentTheme,
      bgMode,
      setBgMode,
      bgColor,
      setBgColor,
      bgGradient,
      setBgGradient,
      bgImage,
      setBgImage,
      cardTransparency,
      setCardTransparency,
      cardBorderOpacity,
      setCardBorderOpacity,
      cardBgColor,
      setCardBgColor,
      cardMaterial,
      setCardMaterial,
      density,
      setDensity,
      cardScale,
      setCardScale,
      inactivityTimeout,
      setInactivityTimeout,
    }),
    [
      currentTheme,
      setCurrentTheme,
      bgMode,
      setBgMode,
      bgColor,
      setBgColor,
      bgGradient,
      setBgGradient,
      bgImage,
      setBgImage,
      cardTransparency,
      setCardTransparency,
      cardBorderOpacity,
      setCardBorderOpacity,
      cardBgColor,
      setCardBgColor,
      cardMaterial,
      setCardMaterial,
      density,
      setDensity,
      cardScale,
      setCardScale,
      inactivityTimeout,
      setInactivityTimeout,
    ]
  );

  const modalManagerLayout = useMemo(
    () => ({
      gridGapH,
      setGridGapH,
      gridGapV,
      setGridGapV,
      gridColumns,
      setGridColumns,
      dynamicGridColumns,
      setDynamicGridColumns,
      effectiveGridColumns,
      cardBorderRadius,
      setCardBorderRadius,
      sectionSpacing,
      updateSectionSpacing,
      cardsOnlyMode,
      updateCardsOnlyMode,
      headerTitle,
      headerScale,
      headerSettings,
      updateHeaderTitle,
      updateHeaderScale,
      updateHeaderSettings,
    }),
    [
      gridGapH,
      setGridGapH,
      gridGapV,
      setGridGapV,
      gridColumns,
      setGridColumns,
      dynamicGridColumns,
      setDynamicGridColumns,
      effectiveGridColumns,
      cardBorderRadius,
      setCardBorderRadius,
      sectionSpacing,
      updateSectionSpacing,
      cardsOnlyMode,
      updateCardsOnlyMode,
      headerTitle,
      headerScale,
      headerSettings,
      updateHeaderTitle,
      updateHeaderScale,
      updateHeaderSettings,
    ]
  );

  const modalManagerOnboarding = useMemo(
    () => ({
      showOnboarding,
      setShowOnboarding,
      isOnboardingActive,
      onboardingStep,
      setOnboardingStep,
      onboardingUrlError,
      setOnboardingUrlError,
      onboardingTokenError,
      setOnboardingTokenError,
      testingConnection,
      testConnection,
      connectionTestResult,
      setConnectionTestResult,
      startOAuthLogin,
      handleOAuthLogout,
      canAdvanceOnboarding,
    }),
    [
      showOnboarding,
      setShowOnboarding,
      isOnboardingActive,
      onboardingStep,
      setOnboardingStep,
      onboardingUrlError,
      setOnboardingUrlError,
      onboardingTokenError,
      setOnboardingTokenError,
      testingConnection,
      testConnection,
      connectionTestResult,
      setConnectionTestResult,
      startOAuthLogin,
      handleOAuthLogout,
      canAdvanceOnboarding,
    ]
  );

  const modalManagerPageManagement = useMemo(
    () => ({
      pageDefaults,
      editingPage,
      setEditingPage,
      newPageLabel,
      setNewPageLabel,
      newPageIcon,
      setNewPageIcon,
      createPage,
      createMediaPage,
      createSonosPage,
      createLightsPage,
      createBatteryPage,
      createRoomExplorerPage,
      deletePage,
      removeCard,
      pageSettings,
      savePageSetting,
      persistPageSettings,
      pagesConfig,
      persistConfig,
      activePage,
    }),
    [
      pageDefaults,
      editingPage,
      setEditingPage,
      newPageLabel,
      setNewPageLabel,
      newPageIcon,
      setNewPageIcon,
      createPage,
      createMediaPage,
      createSonosPage,
      createLightsPage,
      createBatteryPage,
      createRoomExplorerPage,
      deletePage,
      removeCard,
      pageSettings,
      savePageSetting,
      persistPageSettings,
      pagesConfig,
      persistConfig,
      activePage,
    ]
  );

  const modalManagerEntityHelpers = useMemo(
    () => ({
      callService,
      getEntityImageUrl,
      getA,
      getS,
      optimisticLightBrightness,
      setOptimisticLightBrightness,
      hvacMap,
      fanMap,
      swingMap,
      isSonosActive,
      isMediaActive,
    }),
    [
      callService,
      getEntityImageUrl,
      getA,
      getS,
      optimisticLightBrightness,
      setOptimisticLightBrightness,
      hvacMap,
      fanMap,
      swingMap,
      isSonosActive,
      isMediaActive,
    ]
  );

  const modalManagerAddCard = useMemo(
    () => ({
      addCardTargetPage,
      addCardType,
      setAddCardType,
      searchTerm,
      setSearchTerm,
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
      getAddCardAvailableLabel,
      getAddCardNoneLeftLabel,
    }),
    [
      addCardTargetPage,
      addCardType,
      setAddCardType,
      searchTerm,
      setSearchTerm,
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
      getAddCardAvailableLabel,
      getAddCardNoneLeftLabel,
    ]
  );

  const modalManagerCardConfig = useMemo(
    () => ({
      cardSettings,
      saveCardSetting,
      persistCardSettings,
      customNames,
      saveCustomName,
      persistCustomNames,
      customIcons,
      saveCustomIcon,
      persistCustomIcons,
      hiddenCards,
      toggleCardVisibility,
      persistHiddenCards,
      getCardSettingsKey,
      statusPillsConfig,
      saveStatusPillsConfig,
    }),
    [
      cardSettings,
      saveCardSetting,
      persistCardSettings,
      customNames,
      saveCustomName,
      persistCustomNames,
      customIcons,
      saveCustomIcon,
      persistCustomIcons,
      hiddenCards,
      toggleCardVisibility,
      persistHiddenCards,
      getCardSettingsKey,
      statusPillsConfig,
      saveStatusPillsConfig,
    ]
  );

  return {
    dashboardGridPage,
    dashboardGridMedia,
    dashboardGridGrid,
    dashboardGridCards,
    dashboardGridActions,
    modalManagerCore,
    modalManagerAppearance,
    modalManagerLayout,
    modalManagerOnboarding,
    modalManagerPageManagement,
    modalManagerEntityHelpers,
    modalManagerAddCard,
    modalManagerCardConfig,
  };
}
