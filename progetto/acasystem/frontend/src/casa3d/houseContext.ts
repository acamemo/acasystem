/**
 * How the Casa 3D opens (ADR-0014, R1). The house is a screen of its own (`#/casa`) over the
 * launcher, like Sistema; whoever opens it (the launcher page, Sistema) asks through this context,
 * so it does not know the router and the app can remember the button that asked, to give it back
 * the focus when the house closes. Without a provider (previews, tests) there is nothing to open.
 */
import { createContext, useContext } from 'react';

export interface Casa3dHouse {
  /** Opens the house; `trigger` is the button that was pressed (it gets the focus back on exit). */
  open: (trigger?: HTMLElement | null) => void;
}

export const Casa3dHouseContext = createContext<Casa3dHouse | null>(null);

export function useCasa3dHouse(): Casa3dHouse | null {
  return useContext(Casa3dHouseContext);
}

/** Marks the buttons that open the house: the app looks for one when the opener is gone (Sistema is rebuilt). */
export const CASA3D_OPENER_ATTRIBUTE = 'data-casa-opener';
