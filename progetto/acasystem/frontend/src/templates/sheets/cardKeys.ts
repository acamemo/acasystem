/** Key of a card in cardSettings: page and card id, as the legacy getCardSettingsKey. */
export const cardSettingsKey = (pageId: string, cardId: string): string => `${pageId}::${cardId}`;
