// What a spoken sentence asks NeonPlan to show: a device ("Zeig die Waschmaschine", "wo ist die Stehlampe"), a
// camera to look through ("Zeig die Kamera Haustür", "die Kamera im Garten"), all cameras ("Zeig die Kameras"), or a
// place (a room, a floor, the house). Matched on the names in the plan and in Home Assistant.

import type { Building, Room } from "../model.ts";
import { findPlace, normalize, showCommand, type Place } from "./commands.ts";

/** A device that can be shown: its name, the room it is in, and whether it is a camera. */
export interface Shown {
  entity: string;
  name: string;
  /** The room (or outdoor area) it stands in, as named in the plan ("" when none). */
  room: string;
  camera: boolean;
}

export type Target = Place | { kind: "device"; entity: string; name: string; camera: boolean } | { kind: "cameras"; name: string };

/** Words that ask to see something, and "where is …" (the place words of commands.ts and a few more). */
const SHOW = /\b(zeig|zeige|zeigt|geh|gehe|wechsel|wechsle|oeffne|offne|spring|springe|wo|where|show|go|open|switch|jump|find|toon|waar|ga|montre|affiche|ou|va|mostra|dove|vai|apri|muestra|donde|ve|abre|mostre|visa|vis|hvor|nayta|missa|pokaz|gdzie|ukaz|kde|pokazi|arata|unde|mutasd|hol)\b/;
/** "camera" in the languages NeonPlan speaks (plural forms end the same way or are listed). */
const CAMERA = /\b(kamera|kameras|camera|cameras|cam|cams|camera's|telecamera|telecamere|camara|camaras|kamerat|kameraer|kamery|kamere|camerele|kamerak)\b/;
const CAMERAS = /\b(kameras|cameras|cams|camera's|telecamere|camaras|kamerat|kameraer|kamery|kamere|camerele|kamerak|alle kamera|all camera)\b/;

const words = (s: string) => normalize(s).split(" ").filter((w) => w.length > 1);

/**
 * The thing a sentence asks to see, or null (then it is for Assist). A device needs a word that asks to see it
 * ("zeig", "wo ist") – "Licht im Flur an" names the hall light but switches it.
 */
export function showTarget(sentence: string, building: Building, devices: readonly Shown[], alias?: (room: Room) => string | null | undefined): Target | null {
  const text = normalize(sentence);
  if (!text) return null;
  const asks = SHOW.test(text);
  const said = new Set(text.split(" "));
  const camWord = CAMERA.test(text);
  if (asks && CAMERAS.test(text) && devices.some((d) => d.camera)) return { kind: "cameras", name: "" };
  const place = findPlace(sentence, building, alias);
  let best: Shown | null = null;
  let bestScore = 0;
  let bestFull = false;
  for (const d of devices) {
    const own = words(d.name);
    if (!own.length) continue;
    const hit = own.filter((w) => said.has(w)).length;
    const full = hit === own.length;
    const inRoom = !!d.room && ` ${text} `.includes(` ${normalize(d.room)} `);
    // a camera asked for by "camera" and its room or part of its name ("die Kamera im Garten")
    const camera = camWord && d.camera && (hit > 0 || inRoom || devices.filter((x) => x.camera).length === 1);
    if (!full && !camera) continue;
    const score = hit + (inRoom ? 0.5 : 0) + (camera ? 1 : 0) + (full ? own.length : 0);
    if (score > bestScore) {
      best = d;
      bestScore = score;
      bestFull = full;
    }
  }
  if (best && asks) {
    // a room named as fully as the device ("Zeig das Wohnzimmer" – device "Wohnzimmer Lampe" only half): the room
    const roomBetter = place && place.kind !== "house" && !best.camera && (!bestFull || normalize(place.name).length >= normalize(best.name).length);
    if (!roomBetter) return { kind: "device", entity: best.entity, name: best.name, camera: best.camera };
  }
  return showCommand(sentence, building, alias);
}
