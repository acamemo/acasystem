// Loads the editor bundle only when the editor is opened (it defines <fp3d-editor>).

/** Content hash of the editor bundle, set by the build (see build.mjs). */
declare const __FP3D_EDITOR_HASH__: string;

let loading: Promise<unknown> | undefined;

export function loadEditor(): Promise<unknown> {
  const url = new URL(`./neonplan3d-editor.js?v=${__FP3D_EDITOR_HASH__}`, new URL(import.meta.url)).href;
  loading ??= import(/* @vite-ignore */ url);
  return loading;
}
