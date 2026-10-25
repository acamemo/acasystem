// Main bundle: sidebar panel, dashboard card and editor. three.js is loaded separately on demand.

import "./polyfills.ts";
import { registerFonts } from "./fonts.ts";
import "./panel.ts";
import "./card.ts";
import { micProbeAsked } from "./load-voice.ts";

registerFonts();
// note "?fp3d_mic=1" before Home Assistant forwards the address to a dashboard and drops it
micProbeAsked();
