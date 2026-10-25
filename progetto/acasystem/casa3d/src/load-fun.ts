// Fun packs (pets …): their bundle loads only when one is unlocked and switched on.

import type * as FunBundle from "./fun/entry.ts";

/** Content hash of the fun bundle, set by the build (see build.mjs). */
declare const __FP3D_FUN_HASH__: string;

let loading: Promise<typeof FunBundle> | undefined;

export function loadFun(): Promise<typeof FunBundle> {
  const url = new URL(`./casa3d-fun-${__FP3D_FUN_HASH__}.js`, new URL(import.meta.url)).href;
  loading ??= (import(/* @vite-ignore */ url) as Promise<typeof FunBundle>).catch((err) => {
    loading = undefined;
    throw err;
  });
  return loading;
}
