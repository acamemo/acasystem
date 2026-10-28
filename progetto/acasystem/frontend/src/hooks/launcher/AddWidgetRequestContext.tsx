import { createContext, useContext, type ReactNode } from 'react';
import type { AddWidgetSelection } from '@/@types/launcher';

export interface AddWidgetRequestOptions {
  /**
   * Adds the widget without showing the sheet, on `pageId` at the first free place (the page,
   * else the next with room, else a new one): the automatic widget of «Dispositivi trovati».
   */
  auto?: boolean;
}

/**
 * Opens «Aggiungi un widget» on `pageId` with a device already chosen. With `auto` the widget
 * is added with no sheet.
 */
export type RequestAddWidget = (
  pageId: string,
  selection: AddWidgetSelection,
  options?: AddWidgetRequestOptions
) => void;

const AddWidgetRequestContext = createContext<RequestAddWidget | null>(null);

/**
 * The launcher screen owns the add sheet; this lets a widget (the details of «Rileva
 * dispositivi») ask it to open with a device selected, without the widgets importing the screen.
 */
export function AddWidgetRequestProvider({
  value,
  children,
}: {
  value: RequestAddWidget;
  children: ReactNode;
}) {
  return (
    <AddWidgetRequestContext.Provider value={value}>{children}</AddWidgetRequestContext.Provider>
  );
}

/** The request, or null where there is no launcher (previews, tests of a single widget). */
export function useAddWidgetRequest(): RequestAddWidget | null {
  return useContext(AddWidgetRequestContext);
}

/** Opens «Aggiungi un widget» on the types of `pageId`, with nothing chosen. */
export type RequestAddSheet = (pageId: string) => void;

const AddSheetRequestContext = createContext<RequestAddSheet | null>(null);

/** The same sheet, plain: «Scegli il widget» of «Dispositivi trovati» for a device with no type. */
export function AddSheetRequestProvider({
  value,
  children,
}: {
  value: RequestAddSheet;
  children: ReactNode;
}) {
  return (
    <AddSheetRequestContext.Provider value={value}>{children}</AddSheetRequestContext.Provider>
  );
}

/** The request, or null where there is no launcher. */
export function useAddSheetRequest(): RequestAddSheet | null {
  return useContext(AddSheetRequestContext);
}
