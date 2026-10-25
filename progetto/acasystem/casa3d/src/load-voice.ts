// Voice (the microphone probe for now): its bundle loads only when it is asked for.

import type * as VoiceBundle from "./voice/entry.ts";

/** Content hash of the voice bundle, set by the build (see build.mjs). */
declare const __FP3D_VOICE_HASH__: string;

let loading: Promise<typeof VoiceBundle> | undefined;

export function loadVoice(): Promise<typeof VoiceBundle> {
  const url = new URL(`./casa3d-voice-${__FP3D_VOICE_HASH__}.js`, new URL(import.meta.url)).href;
  loading ??= (import(/* @vite-ignore */ url) as Promise<typeof VoiceBundle>).catch((err) => {
    loading = undefined;
    throw err;
  });
  return loading;
}

/**
 * Whether the microphone probe was asked for in the address ("?fp3d_mic=1", also after "#"). Remembered for this tab:
 * Home Assistant may drop the parameter when it forwards to a dashboard.
 */
export function micProbeAsked(): boolean {
  try {
    if (/[?&#]fp3d_mic=1\b/.test(location.href)) sessionStorage.setItem("casa3d.mic", "1");
    return sessionStorage.getItem("casa3d.mic") === "1";
  } catch {
    return false;
  }
}

/** Voice control on this device: the microphone button in the 3D view (the card has its option `voice`). */
export function voiceOnHere(): boolean {
  try {
    return localStorage.getItem("casa3d.voice") === "1";
  } catch {
    return false;
  }
}

export function setVoiceHere(on: boolean): void {
  try {
    if (on) localStorage.setItem("casa3d.voice", "1");
    else localStorage.removeItem("casa3d.voice");
  } catch {
    // private mode: nothing remembered
  }
}

/** The Assist pipeline chosen for this device (null: Home Assistant's preferred one). */
export function voicePipeline(): string | null {
  try {
    return localStorage.getItem("casa3d.voicePipeline");
  } catch {
    return null;
  }
}

export function setVoicePipeline(id: string | null): void {
  try {
    if (id) localStorage.setItem("casa3d.voicePipeline", id);
    else localStorage.removeItem("casa3d.voicePipeline");
  } catch {
    // private mode: nothing remembered
  }
}

/** The probe closed: it does not open again in this tab. */
export function micProbeDone(): void {
  try {
    sessionStorage.removeItem("casa3d.mic");
  } catch {
    // private mode
  }
}
