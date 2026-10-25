// Loads the editor bundle only when the editor is opened (it defines <fp3d-editor>).

/** Content hash of the editor bundle, set by the build (see build.mjs). */
declare const __FP3D_EDITOR_HASH__: string;

let loading: Promise<unknown> | undefined;

export function loadEditor(): Promise<unknown> {
  const url = new URL(`./casa3d-editor-${__FP3D_EDITOR_HASH__}.js`, new URL(import.meta.url)).href;
  loading ??= import(/* @vite-ignore */ url);
  return loading;
}
