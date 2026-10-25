// Loads the three.js bundle only when a 3D view is opened.

import type * as Viewer from "./viewer/viewer3d.ts";

export type ViewerModule = typeof Viewer;

/** Content hash of the 3D bundle, set by the build (see build.mjs). */
declare const __FP3D_VIEWER_HASH__: string;

const base = new URL(import.meta.url);
const url = new URL(`./casa3d-3d-${__FP3D_VIEWER_HASH__}.js`, base).href;

let loading: Promise<ViewerModule> | undefined;
// failed tries so far: the next one asks for another address (?r=<n>), because a browser may keep a
// failed module under its address and refuse the same one again without a new request
let failures = 0;

export function load3d(): Promise<ViewerModule> {
  // a failed load is forgotten, so a new view (Riprova) tries the file again
  loading ??= (import(/* @vite-ignore */ failures ? `${url}?r=${failures}` : url) as Promise<ViewerModule>).catch(
    (err: unknown) => {
      failures += 1;
      loading = undefined;
      throw err;
    },
  );
  return loading;
}
