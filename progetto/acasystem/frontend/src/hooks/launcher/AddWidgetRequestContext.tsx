import { createContext, useContext, type ReactNode } from 'react';
import type { AddWidgetSelection } from '@/@types/launcher';

/** Opens «Aggiungi un widget» on `pageId` with a device already chosen. */
export type RequestAddWidget = (pageId: string, selection: AddWidgetSelection) => void;

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
