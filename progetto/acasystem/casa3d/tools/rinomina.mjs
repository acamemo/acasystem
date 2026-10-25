// Generates casa3d/src (and casa3d/lang) from the frozen copy in casa3d/upstream (T2a of ADR-0014).
//
// Repeatable and local: it only reads upstream/ and overrides/, it never runs any script of the copied
// project and it never talks to the network. Every change with respect to upstream is a numbered patch
// below; the same list produces PATCHES.md.
//
// Run from anywhere:  node tools/rinomina.mjs   (or: npm run rinomina)
//
// The names of the original project appear in this file because it is the record of what was renamed
// or removed: this file, PATCHES.md, UPSTREAM.md, NOTICE, the LICENSE-* files, upstream/ and upstream.sha256 are the only
// places where they are allowed (see tools/controlla-marchio.mjs).

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const UP = join(ROOT, "upstream", "frontend");
const OUT_SRC = join(ROOT, "src");
const OUT_LANG = join(ROOT, "lang");
const OVERRIDES = join(ROOT, "overrides");
const REVISION = "1383a14200c2c96d676ff3fda8b8d87b709089fc";
const ARCHIVE_SHA256 = "8841c84f1b72673317dda9958afbcf0628bac2661ccd50a18ab48a9a38f33a02";

const fail = (msg) => {
  console.error(`rinomina: ${msg}`);
  process.exit(1);
};

// ------------------------------------------------------------------------------------------ helpers

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
const posix = (p) => p.split(sep).join("/");
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const count = (text, needle) => (needle === "" ? 0 : text.split(needle).length - 1);

// 1. upstream must be exactly what was archived (SHA-256 of every file in upstream.sha256)
function verifyUpstream() {
  const listing = readFileSync(join(ROOT, "upstream.sha256"), "utf8").trim().split("\n");
  const known = new Set();
  for (const line of listing) {
    const m = /^([0-9a-f]{64}) \*(.+)$/.exec(line);
    if (!m) fail(`upstream.sha256: bad line "${line}"`);
    known.add(m[2]);
    const file = join(ROOT, "upstream", m[2]);
    if (!existsSync(file)) fail(`upstream: file missing: ${m[2]}`);
    if (createHash("sha256").update(readFileSync(file)).digest("hex") !== m[1]) fail(`upstream: file changed: ${m[2]}`);
  }
  for (const f of walk(join(ROOT, "upstream"))) {
    if (!known.has(posix(relative(join(ROOT, "upstream"), f)))) fail(`upstream: unexpected file: ${posix(relative(join(ROOT, "upstream"), f))}`);
  }
  return listing.length;
}

// ------------------------------------------------------------------------------------------ removals

/** Files of the copied sources that are not carried into src/ (path relative to frontend/src). */
const REMOVED = {
  "panel.ts": "Pannello laterale di Home Assistant: sostituito dalla pagina Casa 3D di Acasystem.",
  "card.ts": "Scheda Lovelace della dashboard: non esiste in Acasystem.",
  "card-editor.ts": "Editor visuale della scheda Lovelace.",
  "card-config.ts": "Configurazione della scheda Lovelace (usata solo da card.ts e card-editor.ts).",
  "load-card-editor.ts": "Caricatore del bundle dell'editor della scheda.",
  "components/extensions.ts": "Pagina Estensioni: negozio, chiave di licenza, pacchetti firmati, newsletter, Discord. Sostituita in T8 dalla sezione Piano e pacchetti.",
  "fonts.ts": "Registrazione dei font del progetto originale; il font di Acasystem arriva con T9.",
  "diagnostics.ts": "Rapporti d'uso volontari verso un server di terzi (telemetria) e raccolta degli errori.",
  "diagnostics.test.ts": "Test del modulo diagnostics.ts rimosso.",
  "beta.ts": "Programma beta/Supporter e collegamento alla community del progetto originale.",
  "import/app.ts": "Pagina web di importazione del sito dell'autore (contiene un contatore di visite verso un server di terzi). I lettori dei formati restano in import/.",
};

/** Files written by hand in overrides/ that replace the generated one (path relative to frontend/src). */
const OVERRIDDEN = {
  "main.ts": "Punto d'ingresso provvisorio: registra la vista 3D e il pannello stanza (niente pannello, scheda e font del progetto originale).",
};

/** New files written by hand in overrides/ and copied into src/ (tests of the local patches; path relative to frontend/src). */
const ADDED = {
  "i18n.test.ts": "Test di i18n.ts (testi integrati in italiano, inglese a richiesta, ripiego sull'italiano, file mancante o rotto, indirizzo relativo al modulo).",
  "hass-contract.test.ts": "Contratto con l'adattatore dell'host (T3): il tipo dell'oggetto hass costruito da Acasystem coincide con quello atteso e i sorgenti leggono solo parti di hass che l'adattatore fornisce.",
  "esempio.test.ts": "Piano d'esempio della pagina di prova di Acasystem (T3): forma normale, stanze, aperture e mobili validi, nessun collegamento a entità o indirizzo di terzi.",
  "viewer/quality.ts": "Livelli di qualità Light, Medium e High con i loro parametri, rapporto pixel, distanza minima fra due fotogrammi e nomi usati dal viaggio nel tempo (T5). Dati e funzioni pure, senza three.js.",
  "viewer/quality.test.ts": "Test di quality.ts: livelli, nomi sconosciuti, rapporto pixel, regola che distanzia i fotogrammi in Light a 60, 90 e 120 Hz (T5).",
  "ask.test.ts": "Comandi (T7): gli elementi della vista non chiamano confirm(); un dispositivo «chiedi prima» passa all'host come callService(..., { ask: true }).",
};

/** Keys of the texts of services that are not carried over (licence, shop, extensions page, Supporter, usage reports): no interface uses them any more. */
const PRUNED_KEYS = /^(license_|ext_|supporter_|beta_|diag_)|^(news_to_shop|pro_shop|help_discord|pack_needs_update|pack_error_needs_update)$/;
/** Used by the room panel (copy of the room id), unrelated to the licence. */
const KEPT_KEYS = new Set(["license_copy"]);

// ------------------------------------------------------------------------------------------ patches

const patches = [];
let seq = 0;
const nextId = () => `P${String(++seq).padStart(2, "0")}`;

/** Exact text -> text. `count` is the number of places it must be found. */
function subLit(file, find, to, desc, n = 1) {
  patches.push({ id: nextId(), file, kind: "sostituzione", desc, n, apply: (t) => replaceExact(t, find, to, n) });
}
/** Removes every line that contains `needle` (the lines must be whole elements, nothing else on them). */
function dropLit(file, needle, desc, n = 1) {
  patches.push({
    id: nextId(),
    file,
    kind: "righe rimosse",
    desc,
    n,
    apply: (t) => {
      const lines = t.split("\n");
      const keep = lines.filter((l) => !l.includes(needle));
      if (lines.length - keep.length !== n) throw new Error(`expected ${n} line(s) with ${JSON.stringify(needle)}, found ${lines.length - keep.length}`);
      return { text: keep.join("\n"), n };
    },
  });
}
/** Removes the lines from the first line that starts with `startLine` up to (not including) the first later line that starts with `endLine` (null = end of file). */
function cutLines(file, startLine, endLine, desc, replacement = "") {
  patches.push({
    id: nextId(),
    file,
    kind: "blocco rimosso",
    desc,
    n: 1,
    apply: (t) => {
      const lines = t.split("\n");
      const starts = lines.flatMap((l, i) => (l.startsWith(startLine) ? [i] : []));
      if (starts.length !== 1) throw new Error(`expected one line starting with ${JSON.stringify(startLine)}, found ${starts.length}`);
      let end = lines.length;
      if (endLine !== null) {
        end = lines.findIndex((l, i) => i > starts[0] && l.startsWith(endLine));
        if (end < 0) throw new Error(`no line starting with ${JSON.stringify(endLine)} after the start`);
      }
      const head = lines.slice(0, starts[0]);
      const tail = lines.slice(end);
      const mid = replacement === "" ? [] : replacement.split("\n");
      return { text: [...head, ...mid, ...tail].join("\n"), n: 1 };
    },
  });
}
function replaceExact(t, find, to, n) {
  const found = count(t, find);
  if (found !== n) throw new Error(`expected ${n} match(es) of ${JSON.stringify(find.slice(0, 90))}, found ${found}`);
  return { text: t.split(find).join(to), n };
}

// ---- features.ts: no shop, no registration and manual links (the Pro code stays, behind the rights of T8)
cutLines(
  "features.ts",
  "/** The shop page where the Pro pack is sold",
  "export function unlockedFeatures(",
  "Tolti gli indirizzi del negozio, della registrazione e del manuale online (PRO_URL, registerUrl, shopUrl, manualUrl) e la tabella dei capitoli del manuale.",
);
subLit("features.ts", 'export type FreeFeature = "diagnostics";', "export type FreeFeature = never;", "Tolta la funzione gratuita «diagnostics» (rapporti d'uso).");
subLit("features.ts", 'export const UNRELEASED: readonly Gated[] = ["pool", "diagnostics"];', 'export const UNRELEASED: readonly Gated[] = ["pool"];', "Idem: «diagnostics» non è più nell'elenco delle funzioni non rilasciate.");
subLit("features.ts", '(feature !== "diagnostics" && hasFeature(feature))', "hasFeature(feature)", "Idem: released() senza il caso «diagnostics».");
subLit("features.ts", "/** The add-ons shown on the extensions page (sold in the shop). */", "/** The Pro add-ons (their code is in the bundles; what unlocks them is decided by Acasystem, T8). */", "Commento: non c'è più una pagina Estensioni né un negozio.");

// ---- features.test.ts
subLit("features.test.ts", 'import { hasFeature, manualUrl, shopUrl, unlockedFeatures } from "./features.ts";', 'import { hasFeature, unlockedFeatures } from "./features.ts";', "Test: tolti gli import degli indirizzi rimossi.");
dropLit("features.test.ts", 'manualUrl("de", "time_travel")', "Test: tolta la verifica dell'indirizzo del manuale (de).");
dropLit("features.test.ts", 'manualUrl("en", "time_travel")', "Test: tolta la verifica dell'indirizzo del manuale (en).");
subLit("features.test.ts", "time travel is a Pro add-on of its own with its section in the manual", "time travel is a Pro add-on of its own", "Test: titolo senza il riferimento al manuale.");
cutLines("features.test.ts", 'test("manual and shop links follow the language', 'test("an unreleased add-on shows only', "Test: tolto il test degli indirizzi del negozio e del manuale.");

// ---- api.ts: the calls to the backend stay (they are replaced by the REST adapter in T3/T6), the shop and the reports go
cutLines("api.ts", "export interface ImportedPack {", "/** A full backup file:", "Tolte le chiamate al negozio e ai pacchetti firmati: importPack, removePack, ImportedPack, CatalogPack, ShopOffer, ShopLoyalty, offerte e aggiornamenti già visti, LicenseStatus e le quattro chiamate di licenza.");
cutLines("api.ts", "/** Fetch a bought pack from the shop", null, "Tolti installPack e le chiamate dei rapporti d'uso (DiagnosticsStatus, get/set/deleteDiagnostics).");
subLit("api.ts", 'format: "neonplan3d-backup";', 'format: "acasystem-casa3d-backup";', "Formato del file di backup: acasystem-casa3d-backup.");

// ---- building-controller.ts
dropLit("building-controller.ts", 'import { initDiagnostics } from "./diagnostics.ts";', "Tolto l'import della telemetria.");
dropLit("building-controller.ts", "// the opt-in reports: one local call per page", "Tolto il commento della chiamata ai rapporti d'uso.");
dropLit("building-controller.ts", "initDiagnostics(this.hass);", "Tolta la chiamata che interrogava il backend sui rapporti d'uso.");
dropLit("building-controller.ts", "/** Unsaved edits of the earlier name", "Tolto il commento della chiave di bozza del nome precedente.");
dropLit("building-controller.ts", 'const LEGACY_DRAFT_KEY = "floorplan-3d.unsaved";', "Tolta la chiave di bozza del nome precedente (nessuna installazione da migrare).");
subLit("building-controller.ts", "localStorage.getItem(DRAFT_KEY) ?? localStorage.getItem(LEGACY_DRAFT_KEY)", "localStorage.getItem(DRAFT_KEY)", "Lettura della bozza senza la chiave precedente.");
dropLit("building-controller.ts", "localStorage.removeItem(LEGACY_DRAFT_KEY);", "Idem per la cancellazione della bozza.");

// ---- transfer.ts
subLit("transfer.ts", 'export const EXPORT_FORMAT = "neonplan3d";', 'export const EXPORT_FORMAT = "acasystem-casa3d";', "Formato del file di esportazione: acasystem-casa3d (la lettura del formato originale resta una decisione aperta, D9).");

// ---- components/time-bar.ts
subLit("components/time-bar.ts", 'import { DISCORD_URL, isBeta } from "../beta.ts";\n', "", "Tolto l'import del modulo beta.");
subLit(
  "components/time-bar.ts",
  '${isBeta("time_travel") ? html` <a class="beta" href=${DISCORD_URL} target="_blank" rel="noopener" title=${t("beta_bar")}>🧪 BETA</a>` : nothing}',
  "",
  "Tolta l'etichetta BETA con il collegamento alla community del progetto originale.",
);

// ---- components/view3d.ts
subLit("components/view3d.ts", 'import { hasFeature, manualUrl, projectionOn, shopUrl, type Feature } from "../features.ts";', 'import { hasFeature, projectionOn, type Feature } from "../features.ts";', "Tolti gli import degli indirizzi del negozio e del manuale.");
dropLit("components/view3d.ts", 'import { countView, diagnosticsActive, recordFrame, watchDiagnostics } from "../diagnostics.ts";', "Tolto l'import della telemetria.");
dropLit("components/view3d.ts", "private unwatchDiag: (() => void) | null = null;", "Tolto il campo che teneva l'ascolto dei rapporti d'uso.");
dropLit("components/view3d.ts", "// the opt-in reports sample the frame rate", "Tolto il commento dell'ascolto dei rapporti d'uso.");
dropLit("components/view3d.ts", "this.unwatchDiag = watchDiagnostics(", "Tolto l'ascolto dei rapporti d'uso.");
dropLit("components/view3d.ts", "this.unwatchDiag?.();", "Tolta la chiusura dell'ascolto (1/2).");
dropLit("components/view3d.ts", "this.unwatchDiag = null;", "Tolta la chiusura dell'ascolto (2/2).");
dropLit("components/view3d.ts", "recordFrame(s);", "Tolto l'invio dei fotogrammi ai rapporti d'uso (le statistiche locali restano).");
subLit("components/view3d.ts", "this.viewer.setStats(this.showStats || diagnosticsActive());", "this.viewer.setStats(this.showStats);", "Le statistiche si mostrano solo a richiesta.");
dropLit("components/view3d.ts", 'countView("3d");', "Tolto il contatore d'uso della vista 3D.");
subLit("components/view3d.ts", 'if (changed.has("showStats")) v.setStats(this.showStats || diagnosticsActive());', 'if (changed.has("showStats")) v.setStats(this.showStats);', "Idem all'aggiornamento.");
dropLit("components/view3d.ts", 'countView("walk");', "Tolto il contatore d'uso della passeggiata.");
dropLit("components/view3d.ts", '<a class="fp3d-chip fp3d-chip-on" href=${shopUrl(this.hass.language)}', "Suggerimento Pro: tolto il collegamento al negozio.");
dropLit("components/view3d.ts", '<a class="fp3d-chip" href=${manualUrl(this.hass.language, this._proHint)}', "Suggerimento Pro: tolto il collegamento al manuale online.");
dropLit("components/view3d.ts", 'this.fire("open-extensions", null)', "Suggerimento Pro: tolto il pulsante verso la pagina Estensioni rimossa.");

subLit("components/view3d.ts", "/** A Pro feature was asked for without the Pro pack: a hint with the shop link. */", "/** A Pro feature was asked for without it being unlocked: a hint (no link: there is no shop). */", "Commento: il suggerimento Pro non ha più il collegamento al negozio (1/2).");
subLit("components/view3d.ts", "/** Shows the hint of a Pro add-on that is not installed (with the shop link). */", "/** Shows the hint of a Pro add-on that is not unlocked (no link: there is no shop). */", "Commento: idem (2/2).");

// ---- components/editor.ts
subLit("components/editor.ts", 'import { hasFeature, labOn, manualUrl, released, shopUrl, UNRELEASED } from "../features.ts";', 'import { hasFeature, labOn, released, UNRELEASED } from "../features.ts";', "Tolti gli import degli indirizzi del negozio e del manuale.");
dropLit("components/editor.ts", 'import { isBeta, supporterUrl } from "../beta.ts";', "Tolto l'import del modulo beta.");
cutLines("components/editor.ts", "  private async loadDiagnostics(): Promise<void> {", "  private async loadHistory(): Promise<void> {", "Tolti loadDiagnostics, changeDiagnostics, renderDiagnostics e renderDiagnosticsView (rapporti d'uso, link all'informativa del progetto originale).");
dropLit("components/editor.ts", 'import { deleteDiagnostics, getDiagnostics, setDiagnostics, type DiagnosticsStatus } from "../api.ts";', "Tolto l'import delle chiamate dei rapporti d'uso.");
dropLit("components/editor.ts", "_diag: { state: true },", "Tolto lo stato _diag (proprietà reattive).");
dropLit("components/editor.ts", "_diagView: { state: true },", "Tolto lo stato _diagView.");
dropLit("components/editor.ts", "_diagBusy: { state: true },", "Tolto lo stato _diagBusy.");
dropLit("components/editor.ts", "_diagNote: { state: true },", "Tolto lo stato _diagNote.");
dropLit("components/editor.ts", "/** The opt-in reports: their status", "Tolto il commento dello stato dei rapporti d'uso.");
dropLit("components/editor.ts", "private declare _diag: DiagnosticsStatus", "Tolta la dichiarazione di _diag.");
dropLit("components/editor.ts", "private declare _diagView: boolean;", "Tolta la dichiarazione di _diagView.");
dropLit("components/editor.ts", "private declare _diagBusy: boolean;", "Tolta la dichiarazione di _diagBusy.");
dropLit("components/editor.ts", "private declare _diagNote: string;", "Tolta la dichiarazione di _diagNote.");
dropLit("components/editor.ts", "this._diag = null;", "Tolta l'inizializzazione di _diag.");
dropLit("components/editor.ts", "this._diagView = false;", "Tolta l'inizializzazione di _diagView.");
dropLit("components/editor.ts", "this._diagBusy = false;", "Tolta l'inizializzazione di _diagBusy.");
dropLit("components/editor.ts", 'this._diagNote = "";', "Tolta l'inizializzazione di _diagNote.");
subLit("components/editor.ts", " ${this.renderDiagnosticsView()}", "", "Tolta la finestra dei rapporti d'uso dal disegno dell'editor.");
subLit("components/editor.ts", ' ${admin && released("diagnostics") ? this.renderDiagnostics() : nothing}', "", "Tolta la sezione «Aiuta a migliorare» (rapporti d'uso) dalle impostazioni.");
cutLines("components/editor.ts", "      /* the opt-in reports: the exact JSON they send */", "      /* the wall view: a room's wall from the front", "Tolto il CSS della finestra dei rapporti d'uso.");
dropLit("components/editor.ts", "// the extensions page is part of this bundle", "Tolto il commento dell'import della pagina Estensioni.");
dropLit("components/editor.ts", 'import "./extensions.ts";', "Tolto l'import della pagina Estensioni rimossa.");
subLit("components/editor.ts", '{ state: "opt", label: this.t("chk_pro_get"), href: shopUrl(this.hass?.language) }', '{ state: "opt", label: this.t("chk_pro_get") }', "Elenco di controllo energia: tolto il collegamento al negozio.");
cutLines("components/editor.ts", "  private renderHelpLinks() {", "  /** The Pro add-on: active (with the manual)", "La sezione di aiuto rimandava a GitHub e a un server di chat del progetto originale: ora non mostra nulla.", "  private renderHelpLinks() {\n    return nothing;\n  }\n");
subLit("components/editor.ts", "  private renderProCard() {\n    const lang = this.hass?.language;\n", "  private renderProCard() {\n", "Scheda Pro energia: tolta la variabile della lingua (serviva ai collegamenti).");
dropLit("components/editor.ts", '<div class="fp3d-actions"><a class="fp3d-btn" href=${manualUrl(lang, "energy_pro")}', "Scheda Pro energia: tolti i due collegamenti al manuale.", 2);
dropLit("components/editor.ts", 'const picture = new URL("./images/solar-pro.jpg", import.meta.url).href;', "Scheda Pro energia: tolta l'immagine dimostrativa (file non copiato).");
dropLit("components/editor.ts", '<img src=${picture} alt=${this.t("solar_pro_title")} loading="lazy" />', "Scheda Pro energia: tolto l'elemento immagine.");
subLit("components/editor.ts", '<a class="fp3d-btn fp3d-primary" href=${shopUrl(lang)} target="_blank" rel="noopener">${this.t("pro_unlock")}</a>', "", "Schede Pro energia e auto: tolto il pulsante «Sblocca» verso il negozio.", 2);
subLit("components/editor.ts", "  private renderCarForm(f: Furniture) {\n    const lang = this.hass?.language;\n", "  private renderCarForm(f: Furniture) {\n", "Scheda auto: tolta la variabile della lingua.");
dropLit("components/editor.ts", 'href=${shopUrl(this.hass?.language)} target="_blank" rel="noopener" @click=', "Avviso novità: tolto il pulsante verso il negozio.");
dropLit("components/editor.ts", 'const beta = isBeta("pool");', "Scheda piscina: tolta la variabile beta.");
dropLit("components/editor.ts", '<a class="fp3d-btn fp3d-primary" href=${beta ? supporterUrl(lang) : shopUrl(lang)}', "Scheda piscina: tolto il pulsante verso il negozio o la pagina dei sostenitori.");
dropLit("components/editor.ts", '<a class="fp3d-btn fp3d-primary" href=${isBeta("household") ? supporterUrl(lang) : shopUrl(lang)}', "Schede casa/elettrodomestici: tolti i pulsanti verso il negozio o la pagina dei sostenitori.", 2);
subLit("components/editor.ts", "  private renderPoolPro(a: OutdoorArea) {\n    const lang = this.hass?.language;\n", "  private renderPoolPro(a: OutdoorArea) {\n", "Scheda piscina: tolta la variabile della lingua.");
subLit("components/editor.ts", "  private renderHouseholdForm(f: Furniture) {\n    const admin = this.isAdmin;\n    const lang = this.hass?.language;\n", "  private renderHouseholdForm(f: Furniture) {\n    const admin = this.isAdmin;\n", "Scheda casa: tolta la variabile della lingua.");
subLit("components/editor.ts", '(plant || appliance || fridge)) return nothing;\n      const lang = this.hass?.language;\n', '(plant || appliance || fridge)) return nothing;\n', "Scheda elettrodomestici: tolta la variabile della lingua.");
subLit(
  "components/editor.ts",
  ' <a href=${shopUrl(this.hass?.language)} target="_blank" rel="noopener">${this.t("pro_shop")}</a> · <a href=${manualUrl(this.hass?.language, "screens")} target="_blank" rel="noopener">${this.t("manual_more")}</a>',
  "",
  "Immagini degli schermi: tolti i collegamenti al negozio e al manuale.",
);
subLit(
  "components/editor.ts",
  '    </section>\n    <div class="fp3d-ext-teaser">\n      <b>${this.t("ext_teaser_title")}</b>\n      <span class="fp3d-sub">${this.t("ext_teaser_text")}</span>\n      <button class="fp3d-btn fp3d-primary" @click=${() => this.dispatchEvent(new CustomEvent("open-extensions", { bubbles: true, composed: true }))}>${this.t("ext_open")}</button>\n    </div>`;',
  "    </section>`;",
  "Libreria mobili: tolto l'invito alla pagina Estensioni rimossa.",
);
subLit(
  "components/editor.ts",
  '      <p class="fp3d-sub">\n        ${this.t("backup_other_hint")}\n        <a href=${`https://neonplan3d.mastershort.de/import/?lang=${(this.hass?.language ?? "en").startsWith("de") ? "de" : "en"}`} target="_blank" rel="noopener">${this.t("backup_other")}</a>\n      </p>\n',
  "",
  "Backup: tolto il rimando alla pagina web di importazione dell'autore.",
);
subLit("components/editor.ts", 'data?.format !== "neonplan3d-backup"', 'data?.format !== "acasystem-casa3d-backup"', "Importazione del backup: controllo del formato acasystem-casa3d-backup.");

// ---- packs.ts and import tests
subLit("packs.ts", 'pack.id.replace(/^mastershort\\./, "")', 'pack.id.replace(/^casa3d\\./, "")', "Nome del pacchetto: prefisso degli id dei pacchetti propri (regola G9 per l'espressione regolare).");
subLit("import/simple.test.ts", '{ format: "neonplan3d", version: 1', '{ format: "acasystem-casa3d", version: 1', "Test: il file di esportazione usa il formato acasystem-casa3d.", 2);

// ---- tests that check translated texts: German is no longer built in, so they run in Italian
subLit("alerts.test.ts", 'language: "de"', 'language: "it"', "Test: la lingua del host di prova è l'italiano.", 4);
subLit("alerts.test.ts", '"Küche · Rauch: Rauchmelder"', '"Küche · Fumo: Rauchmelder"', "Test: testo atteso in italiano (fumo).");
subLit("alerts.test.ts", '"Küche · Rauch")', '"Küche · Fumo")', "Test: testo atteso in italiano (fumo, senza nome del dispositivo).");
subLit("alerts.test.ts", '"Alarm ausgelöst"', '"Allarme scattato"', "Test: testo atteso in italiano (allarme).", 2);
subLit("alerts.test.ts", '"Stromausfall: Netz"', '"Blackout: Netz"', "Test: testo atteso in italiano (blackout).");
subLit("alerts.test.ts", '"Pool: pH 8.3"', '"Piscina: pH 8.3"', "Test: testo atteso in italiano (piscina).");
subLit("alerts.test.ts", '"Küche · Kühlschrank offen: Kühlschranktür"', '"Küche · Frigorifero aperto: Kühlschranktür"', "Test: testo atteso in italiano (frigorifero).");
subLit("markers.test.ts", 'language: "de"', 'language: "it"', "Test: la lingua del host di prova è l'italiano.", 2);
subLit("markers.test.ts", '"Aus")', '"Spento")', "Test: testo atteso in italiano (spento).", 2);
subLit("markers.test.ts", '"Schließt"', '"In chiusura"', "Test: testo atteso in italiano (in chiusura).");
subLit("markers.test.ts", '"Offen"', '"Aperto"', "Test: testo atteso in italiano (aperto).");
subLit("markers.test.ts", '"Frei"', '"Libero"', "Test: testo atteso in italiano (libero).");
subLit("markers.test.ts", '"Nicht verfügbar"', '"Non disponibile"', "Test: testo atteso in italiano (non disponibile).", 2);
subLit("presence.test.ts", 'language: "de"', 'language: "it"', "Test: la lingua del host di prova è l'italiano.");
subLit("presence.test.ts", '"2 Räume · 1 Licht an · 2 Pers."', '"2 stanze · 1 luci accese · 2 persone"', "Test: testo atteso in italiano (conteggi del piano).");

// ---- loaders of the lazy bundles (T2b): the content hash is part of the file name (casa3d-3d-<hash>.js), not a query,
// so a file is immutable by name and a stale name is a clean 404 (D16); build.mjs writes the files with these names.
for (const [file, bundle, hash] of [
  ["load3d.ts", "3d", "VIEWER"],
  ["load-editor.ts", "editor", "EDITOR"],
  ["load-fun.ts", "fun", "FUN"],
  ["load-timetravel.ts", "timetravel", "TIMETRAVEL"],
  ["load-voice.ts", "voice", "VOICE"],
]) {
  subLit(file, `./neonplan3d-${bundle}.js?v=\${__FP3D_${hash}_HASH__}`, `./casa3d-${bundle}-\${__FP3D_${hash}_HASH__}.js`, `Indirizzo del bundle «${bundle}»: l'impronta del contenuto è nel nome del file e non in una query (D16, T2b).`);
}
subLit(
  "load3d.ts",
  "let loading: Promise<ViewerModule> | undefined;\n\nexport function load3d(): Promise<ViewerModule> {\n  loading ??= import(/* @vite-ignore */ url) as Promise<ViewerModule>;\n",
  "let loading: Promise<ViewerModule> | undefined;\n// failed tries so far: the next one asks for another address (?r=<n>), because a browser may keep a\n// failed module under its address and refuse the same one again without a new request\nlet failures = 0;\n\nexport function load3d(): Promise<ViewerModule> {\n  // a failed load is forgotten, so a new view (Riprova) tries the file again\n  loading ??= (import(/* @vite-ignore */ failures ? `${url}?r=${failures}` : url) as Promise<ViewerModule>).catch(\n    (err: unknown) => {\n      failures += 1;\n      loading = undefined;\n      throw err;\n    },\n  );\n",
  "Il caricamento del bundle 3D che fallisce non resta in memoria e il nuovo tentativo («Riprova») chiede un indirizzo diverso (?r=n), perché un browser può tenere il modulo fallito sotto il suo indirizzo (T5).",
);

// ---- viewer: quality levels, release before create and loss of the WebGL context (T5)
// The levels, their parameters and the frame spacing live in overrides/viewer/quality.ts (a file added to src/).
subLit(
  "viewer/viewer3d.ts",
  'export type Quality = "auto" | "low" | "high";',
  'import { displayPeriodMeter, mustWait, normalizeQuality, pixelRatioFor, TIERS, type ContextEvent, type Quality } from "./quality.ts";\nexport type { ContextEvent, Quality } from "./quality.ts";',
  "Livelli di qualità: Light, Medium e High al posto di auto, low e high (T5); i parametri stanno in quality.ts.",
);
subLit(
  "viewer/viewer3d.ts",
  "  onStats?: (stats: ViewerStats) => void;\n",
  "  onStats?: (stats: ViewerStats) => void;\n  /** The drawing context was lost, came back, or no renderer could be made (the host shows a message and falls back to the still picture). */\n  onContext?: (event: ContextEvent) => void;\n",
  "Opzioni della vista: onContext, la perdita e il ripristino del contesto WebGL arrivano all'host (T5).",
);
subLit(
  "viewer/viewer3d.ts",
  "  /** The low quality level is active (tablet). */\n  low: boolean;\n",
  "  /** The Light level is active. */\n  low: boolean;\n  /** The level in use. */\n  quality: Quality;\n",
  "ViewerStats: aggiunto il livello in uso (T5).",
);
cutLines(
  "viewer/viewer3d.ts",
  "export function isLowEnd(): boolean {",
  "export class FloorplanViewer {",
  "Tolto isLowEnd (rilevamento automatico del livello dal solo browser): il livello lo sceglie l'host e si parte da Light su ogni dispositivo (T1, T5).",
);
subLit(
  "viewer/viewer3d.ts",
  "  private lowQuality = false;\n  private highQuality = false;\n",
  '  private lowQuality = false;\n  private highQuality = false;\n  private level: Quality = "light";\n  /** The browser took the drawing context away (or none could be made): nothing is drawn until it is back. */\n  private contextLost = false;\n  /** When the last frame was drawn (the frame spacing of Light, see quality.ts). */\n  private lastDraw = 0;\n  /** The measured time between display frames: the spacing of Light applies on fast screens only. */\n  private readonly displayPeriod = displayPeriodMeter();\n  private qualityTimer: ReturnType<typeof setTimeout> | undefined;\n',
  "Campi della vista: livello in uso, contesto perso, istante dell'ultimo disegno e timer del cambio di livello (T5).",
);
subLit(
  "viewer/viewer3d.ts",
  'this.renderer = this.makeRenderer(options.quality ?? "auto");',
  "this.renderer = this.makeRenderer(normalizeQuality(options.quality));",
  "Costruttore: il livello iniziale è quello dell'host; senza indicazione e per ogni nome sconosciuto, Light (T5).",
);
subLit(
  "viewer/viewer3d.ts",
  "  /** Whether the tablet level is active (hosts lighten their own work with it). */\n  get low(): boolean {\n    return this.lowQuality;\n  }\n",
  "  /** Whether the tablet level is active (hosts lighten their own work with it). */\n  get low(): boolean {\n    return this.lowQuality;\n  }\n\n  /** The level in use. */\n  get quality(): Quality {\n    return this.level;\n  }\n",
  "Aggiunto il lettore del livello in uso (T5).",
);
subLit(
  "viewer/viewer3d.ts",
  `  setQuality(quality: Quality): void {
    const canvas = this.renderer.domElement;
    const next = this.makeRenderer(quality);
    this.rebuildTier();
    this.applyTierFlags();
    canvas.replaceWith(next.domElement);
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer = next;
    const view = this.controls.view;
    this.controls.dispose();
    this.controls = this.makeControls();
    this.controls.view = view;
    this.resize();
  }
`,
  `  /**
   * Changes the level. The old drawing context is freed before the new one is made (two at once cost memory on a
   * tablet, T1) and nothing changes while a finger or a flight holds the camera.
   */
  setQuality(quality: Quality): void {
    const level = normalizeQuality(quality);
    clearTimeout(this.qualityTimer);
    this.qualityTimer = undefined;
    if (this.disposed || (level === this.level && !this.contextLost)) return;
    if (this.controls.active) {
      this.qualityTimer = setTimeout(() => this.setQuality(level), 250);
      return;
    }
    const view = this.controls.view;
    this.controls.dispose();
    this.releaseRenderer();
    try {
      this.renderer = this.makeRenderer(level);
    } catch {
      // no context could be made: the host falls back to the still picture
      this.contextLost = true;
      this.options.onContext?.({ state: "failed" });
      return;
    }
    this.contextLost = false;
    this.controls = this.makeControls();
    this.controls.view = view;
    this.rebuildTier();
    this.applyTierFlags();
    this.resize();
  }

  /** Frees the drawing context now instead of when the garbage collector gets to it. */
  private releaseRenderer(): void {
    const canvas = this.renderer.domElement;
    canvas.removeEventListener("webglcontextlost", this.onContextLost);
    canvas.removeEventListener("webglcontextrestored", this.onContextRestored);
    this.renderer.dispose();
    // a context the browser already took away has nothing to free (and three.js would only warn)
    if (!this.contextLost) this.renderer.forceContextLoss();
    canvas.remove();
  }

  /** The browser took the context away (memory pressure, a driver reset): the picture stays, nothing is drawn. */
  private readonly onContextLost = (event: Event) => {
    event.preventDefault();
    if (this.disposed) return;
    this.contextLost = true;
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.options.onContext?.({ state: "lost" });
  };

  /**
   * Back again. three.js starts its own state anew and uploads buffers, textures and programs again at the next frame,
   * so a frame is all that is needed (a rebuild would dispose geometry the new state never saw: the browser warns for each).
   */
  private readonly onContextRestored = () => {
    if (this.disposed) return;
    this.contextLost = false;
    this.invalidate();
    this.options.onContext?.({ state: "restored" });
  };
`,
  "setQuality rilascia il contesto vecchio prima di creare il nuovo, non cambia durante un gesto e segnala un renderer che non si può creare; perdita e ripristino del contesto WebGL (T5).",
);
subLit(
  "viewer/viewer3d.ts",
  `    this.renderer.dispose();
    // frees the GPU context now instead of when the garbage collector gets to it
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
    this.labels.remove();
`,
  `    clearTimeout(this.qualityTimer);
    this.releaseRenderer();
    this.labels.remove();
`,
  "dispose usa releaseRenderer e ferma il timer del cambio di livello (T5).",
);
subLit(
  "viewer/viewer3d.ts",
  "    if (this.frame || this.disposed || document.hidden || !this.onScreen) return;",
  "    if (this.frame || this.disposed || this.contextLost || document.hidden || !this.onScreen) return;",
  "invalidate: nessun fotogramma richiesto mentre il contesto è perso (T5).",
);
cutLines(
  "viewer/viewer3d.ts",
  "  private makeRenderer(quality: Quality): WebGLRenderer {",
  "  private makeControls(): OrbitControls {",
  "makeRenderer dai parametri del livello (antialias, rapporto pixel, preferenza di potenza) con l'ascolto di perdita e ripristino del contesto; imposta il livello solo a renderer creato (T5).",
  `  private makeRenderer(level: Quality): WebGLRenderer {
    const tier = TIERS[level];
    // may throw: nothing is changed before the renderer exists
    const renderer = new WebGLRenderer({ antialias: tier.antialias, alpha: true, powerPreference: tier.powerPreference });
    this.level = level;
    this.lowQuality = level === "light";
    this.highQuality = level === "high";
    this.applyWeather();
    renderer.setPixelRatio(pixelRatioFor(level, window.devicePixelRatio));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.domElement.className = "fp3d-canvas";
    renderer.domElement.addEventListener("webglcontextlost", this.onContextLost);
    renderer.domElement.addEventListener("webglcontextrestored", this.onContextRestored);
    this.host.prepend(renderer.domElement);
    return renderer;
  }
`,
);
subLit(
  "viewer/viewer3d.ts",
  "  private render(now: number): void {\n    this.frame = 0;\n    if (this.disposed) return;\n",
  "  private render(now: number): void {\n    this.frame = 0;\n    if (this.disposed || this.contextLost) return;\n    // Light spaces the frames while something moves (quality.ts); the next display frame asks again\n    if (mustWait(now, this.lastDraw, TIERS[this.level].drawGapMs, this.displayPeriod(now))) {\n      this.invalidate();\n      return;\n    }\n",
  "render: in Light i fotogrammi sono distanziati mentre qualcosa si muove; niente disegno a contesto perso (T5).",
);
subLit(
  "viewer/viewer3d.ts",
  "    if (this.projections.active) this.updateProjections();\n    this.renderer.render(this.scene, this.camera);\n",
  "    if (this.projections.active) this.updateProjections();\n    this.lastDraw = now;\n    this.renderer.render(this.scene, this.camera);\n",
  "render: ricorda l'istante dell'ultimo disegno (T5).",
);
subLit(
  "viewer/viewer3d.ts",
  "        low: this.lowQuality,\n        pixelRatio: this.renderer.getPixelRatio(),",
  "        low: this.lowQuality,\n        quality: this.level,\n        pixelRatio: this.renderer.getPixelRatio(),",
  "reportStats: il livello in uso (T5).",
);

// ---- components/view3d.ts: Light by default, the replay still speaks the old level names, context and statistics events
subLit(
  "components/view3d.ts",
  'import type { DeviceMarker, FloorplanViewer, FloorStack, RobotInfo, Quality, ScreenState, SoundSource, SurfaceGrab, ViewerStats, WallMode } from "../viewer/viewer3d.ts";',
  'import type { DeviceMarker, FloorplanViewer, FloorStack, RobotInfo, Quality, ScreenState, SoundSource, SurfaceGrab, ViewerStats, WallMode } from "../viewer/viewer3d.ts";\nimport { toLegacyQuality } from "../viewer/quality.ts";',
  "Import dei nomi di livello usati dal viaggio nel tempo (T5).",
);
subLit("components/view3d.ts", 'this.quality = "auto";', 'this.quality = "light";', "Livello predefinito della vista: Light (T5).");
subLit("components/view3d.ts", "this.replay?.setQuality(this.quality, v.low);", "this.replay?.setQuality(toLegacyQuality(this.quality), v.low);", "Il viaggio nel tempo riceve il livello con i nomi che usa (T5).");
subLit("components/view3d.ts", "    showStats: { type: Boolean },\n", "    showStats: { type: Boolean },\n    statsEvents: { type: Boolean },\n", "Proprietà statsEvents: la vista manda le statistiche all'host come evento «stats» (T5).");
subLit("components/view3d.ts", "  declare showStats: boolean;\n", "  declare showStats: boolean;\n  declare statsEvents: boolean;\n", "Dichiarazione di statsEvents (T5).");
subLit("components/view3d.ts", "    this.showStats = false;\n", "    this.showStats = false;\n    this.statsEvents = false;\n", "Inizializzazione di statsEvents (T5).");
subLit(
  "components/view3d.ts",
  "        onStats: (s) => {\n          if (this.showStats) this._stats = s;\n        },\n",
  '        onStats: (s) => {\n          if (this.showStats) this._stats = s;\n          if (this.statsEvents) this.fire("stats", s);\n        },\n        onContext: (e) => this.fire("context-state", e),\n',
  "Eventi «stats» e «context-state» verso l'host (T5).",
);
subLit("components/view3d.ts", "      this.viewer.setStats(this.showStats);\n", "      this.viewer.setStats(this.showStats || this.statsEvents);\n", "Le statistiche si raccolgono anche quando l'host le chiede come evento (T5).");
subLit(
  "components/view3d.ts",
  'if (changed.has("showStats")) v.setStats(this.showStats);',
  'if (changed.has("showStats") || changed.has("statsEvents")) v.setStats(this.showStats || this.statsEvents);',
  "Idem all'aggiornamento (T5).",
);
subLit(
  "components/view3d.ts",
  "    } catch (err) {\n      this._error = String(err);\n    } finally {\n      this.starting = false;\n",
  '    } catch (err) {\n      this._error = String(err);\n      // the view could not start; the host keeps the still picture. failed: this browser makes no WebGL 2 context; error: any other cause (code not loaded, data refused)\n      if (!this.viewer) {\n        const gl = document.createElement("canvas").getContext("webgl2");\n        gl?.getExtension("WEBGL_lose_context")?.loseContext();\n        this.fire("context-state", { state: gl ? "error" : "failed" });\n      }\n    } finally {\n      this.starting = false;\n',
  "Se la vista non si può creare l'host riceve «context-state»: failed se manca il contesto di disegno (niente WebGL 2), error per ogni altro errore (codice non caricato, dati rifiutati); in entrambi i casi ripiega sull'anteprima (T5).",
);
subLit("components/editor.ts", '.quality=${"auto"}', '.quality=${"light"}', "Le viste 3D dell'editor partono in Light (T5; l'editor è T10).", 2);

// ---- commands (T7): no native confirm(); the host asks first, with the primitive of Acasystem
// A device marked «ask first» in the plan (or a car lock) no longer calls the browser's confirm(): the bundle passes `{ ask: true }`
// as the fourth argument of callService, and the host (frontend/src/casa3d/commandPath.ts) puts the question on screen and sends the
// command only after the answer. Locks and alarms are asked by the host whatever the plan says.
subLit(
  "types.ts",
  "  callService(domain: string, service: string, data?: Record<string, unknown>): Promise<unknown>;\n",
  "  /** `options.ask`: the host asks the person first (the device is marked so in the plan); the bundle never calls confirm() itself (T7). */\n  callService(domain: string, service: string, data?: Record<string, unknown>, options?: { ask?: boolean }): Promise<unknown>;\n",
  "callService accetta un quarto argomento { ask }: la conferma la chiede l'host, non il browser (T7).",
);
subLit(
  "markers.ts",
  'export function toggleEntity(hass: HomeAssistant, entityId: string): Promise<unknown> {\n  const domain = entityId.slice(0, entityId.indexOf("."));\n  return hass.callService(domain, "toggle", { entity_id: entityId });\n}',
  'export function toggleEntity(hass: HomeAssistant, entityId: string, ask = false): Promise<unknown> {\n  const domain = entityId.slice(0, entityId.indexOf("."));\n  return hass.callService(domain, "toggle", { entity_id: entityId }, ask ? { ask: true } : undefined);\n}',
  "toggleEntity passa { ask } all'host invece di chiedere con confirm() (T7).",
);
subLit(
  "components/view3d.ts",
  '      if (this.confirmSet.has(entityId) && !confirm(translate(this.hass, "confirm_switch", { name: entityName(this.hass, entityId) }))) return;\n      void toggleEntity(this.hass, entityId);\n',
  "      void toggleEntity(this.hass, entityId, this.confirmSet.has(entityId));\n",
  "Un tocco su un dispositivo «chiedi prima»: la domanda la fa l'host (T7), non confirm().",
);
subLit(
  "components/view3d.ts",
  "    const svc = (domain: string, service: string, id: string) => void hass.callService(domain, service, { entity_id: id });\n    const onOff = (id: string, on: boolean) => (id.startsWith",
  "    const svc = (domain: string, service: string, id: string, ask = false) => void hass.callService(domain, service, { entity_id: id }, ask ? { ask: true } : undefined);\n    const onOff = (id: string, on: boolean) => (id.startsWith",
  "Scheda dell'auto: svc passa { ask } all'host (T7).",
);
subLit(
  "components/view3d.ts",
  '        if (!confirm(t("car_unlock_confirm"))) return;\n        if (isLock) svc("lock", "unlock", c.lock);\n        else svc("homeassistant", "turn_off", c.lock);\n',
  '        if (isLock) svc("lock", "unlock", c.lock, true);\n        else svc("homeassistant", "turn_off", c.lock, true);\n',
  "Sblocco dell'auto dalla scheda: la conferma la chiede l'host (T7), non confirm().",
);
subLit(
  "components/quick-menu.ts",
  '  /** Ask before switching when the device is marked so (power and lock buttons; sliders and colours never ask). */\n  private ask(): boolean {\n    return !this.confirmSwitch || confirm(this.t("confirm_switch", { name: entityName(this.hass, this.entity) }));\n  }\n\n  private call(domain: string, service: string, data: Record<string, unknown> = {}): void {\n    void this.hass.callService(domain, service, { entity_id: this.entity, ...data });\n  }\n',
  '  private call(domain: string, service: string, data: Record<string, unknown> = {}, ask = false): void {\n    void this.hass.callService(domain, service, { entity_id: this.entity, ...data }, ask ? { ask: true } : undefined);\n  }\n\n  /** Power, lock and blind-move buttons: the host asks first when the device is marked so (sliders and colours never ask). */\n  private callAsk(domain: string, service: string, data: Record<string, unknown> = {}): void {\n    this.call(domain, service, data, this.confirmSwitch);\n  }\n',
  "Menu rapido: la domanda «chiedi prima» passa dall'host ({ ask }), non da confirm() (T7).",
);
subLit("components/quick-menu.ts", "this.ask() && this.call(", "this.callAsk(", "Menu rapido: i pulsanti di accensione e movimento chiamano callAsk (T7).", 6);
subLit(
  "components/quick-menu.ts",
  '@click=${() => this.ask() && (domain === "lock" ? this.call("lock", on ? "lock" : "unlock") : this.call("homeassistant", "toggle"))}',
  '@click=${() => (domain === "lock" ? this.callAsk("lock", on ? "lock" : "unlock") : this.callAsk("homeassistant", "toggle"))}',
  "Menu rapido: accensione e serratura chiamano callAsk (T7).",
);
subLit(
  "components/quick-menu.ts",
  "    const svc = (domain: string, service: string, id: string, data: Record<string, unknown> = {}) => void this.hass.callService(domain, service, { entity_id: id, ...data });\n",
  "    const svc = (domain: string, service: string, id: string, data: Record<string, unknown> = {}, ask = false) => void this.hass.callService(domain, service, { entity_id: id, ...data }, ask ? { ask: true } : undefined);\n",
  "Menu rapido dell'auto: svc passa { ask } all'host (T7).",
);
subLit(
  "components/quick-menu.ts",
  '? confirm(this.t("car_unlock_confirm")) && (lockIsLock ? svc("lock", "unlock", lockId!) : svc("homeassistant", "turn_off", lockId!))',
  '? lockIsLock ? svc("lock", "unlock", lockId!, {}, true) : svc("homeassistant", "turn_off", lockId!, {}, true)',
  "Sblocco dell'auto dal menu: la conferma la chiede l'host (T7), non confirm().",
);
subLit(
  "components/room-panel.ts",
  '  private call(domain: string, service: string, data: Record<string, unknown>): void {\n    if (this.readOnly) return;\n    void this.hass.callService(domain, service, data);\n  }\n',
  '  private call(domain: string, service: string, data: Record<string, unknown>, ask = false): void {\n    if (this.readOnly) return;\n    void this.hass.callService(domain, service, data, ask ? { ask: true } : undefined);\n  }\n',
  "Pannello stanza: call passa { ask } all'host (T7).",
);
subLit(
  "components/room-panel.ts",
  '  /** Ask first for devices marked so (a blind that must not move by accident). */\n  private askFor(id: string): boolean {\n    return !this.confirmEntities?.has(id) || confirm(this.t("confirm_switch", { name: this.name(id) }));\n  }\n\n  private toggle(st: HassEntity, on: boolean, onToggle: () => void) {\n    const guarded = () => {\n      if (this.readOnly) return;\n      if (this.confirmEntities?.has(st.entity_id) && !confirm(this.t("confirm_switch", { name: this.name(st.entity_id) }))) return;\n      onToggle();\n    };',
  '  /** Devices marked «ask first» (a blind that must not move by accident): the host asks, not the browser (T7). */\n  private askFor(id: string): boolean {\n    return !!this.confirmEntities?.has(id);\n  }\n\n  private toggle(st: HassEntity, on: boolean, onToggle: (ask: boolean) => void) {\n    const guarded = () => {\n      if (this.readOnly) return;\n      onToggle(this.askFor(st.entity_id));\n    };',
  "Pannello stanza: nessun confirm(); i dispositivi «chiedi prima» passano { ask } all'host (T7).",
);
subLit("components/room-panel.ts", '${this.toggle(st, on, () => this.call("light", "toggle", { entity_id: id }))}', '${this.toggle(st, on, (ask) => this.call("light", "toggle", { entity_id: id }, ask))}', "Pannello stanza: interruttore delle luci con { ask } (T7).");
subLit(
  "components/room-panel.ts",
  'const act = () => (kind === "lock" ? this.call("lock", on ? "lock" : "unlock", { entity_id: id }) : this.call(domain, "toggle", { entity_id: id }));',
  'const act = (ask: boolean) => (kind === "lock" ? this.call("lock", on ? "lock" : "unlock", { entity_id: id }, ask) : this.call(domain, "toggle", { entity_id: id }, ask));',
  "Pannello stanza: serrature e interruttori con { ask } (T7).",
);
subLit("components/room-panel.ts", 'this.askFor(id) && this.call("cover", "open_cover", { entity_id: id })', 'this.call("cover", "open_cover", { entity_id: id }, this.askFor(id))', "Pannello stanza: apertura con { ask } (T7).");
subLit("components/room-panel.ts", 'this.askFor(id) && this.call("cover", "close_cover", { entity_id: id })', 'this.call("cover", "close_cover", { entity_id: id }, this.askFor(id))', "Pannello stanza: chiusura con { ask } (T7).");

// ------------------------------------------------------------------------------------------ generic renames

/** Ordered rules applied to every kept file after the specific patches. */
const RULES = [
  { id: "G1", re: /custom_components\/neonplan3d\/(\w+)\.py/g, to: "casa3d backend: $1", desc: "Commenti che citano i file Python dell'integrazione originale diventano «casa3d backend: nome»." },
  { id: "G2", re: /neonplan3d\//g, to: "casa3d/", desc: "Tipi dei comandi websocket e allowlist: neonplan3d/… diventa casa3d/…" },
  { id: "G3", re: /neonplan3d-/g, to: "casa3d-", desc: "Nomi dei bundle (…-3d.js, …-editor.js, …), degli elementi e degli eventi." },
  { id: "G4", re: /neonplan3d\./g, to: "casa3d.", desc: "Chiavi di localStorage e sessionStorage." },
  { id: "G5", re: /neonplan-import/g, to: "casa3d-import", desc: "Formato di importazione semplice." },
  { id: "G6", re: /"neonplan"/g, to: '"casa3d"', desc: "Tipo di sorgente «neonplan» dell'importatore." },
  { id: "G7", re: /NeonPlan 3D/g, to: "Casa 3D", desc: "Nome visibile (messaggi, console)." },
  { id: "G8", re: /NeonPlan/g, to: "Casa 3D", desc: "Nome senza «3D» (commenti, test, stringhe)." },
  { id: "G9", re: /mastershort\./g, to: "casa3d.", desc: "Prefisso degli id dei pacchetti di mobili e funzioni (mastershort.xxx diventa casa3d.xxx)." },
];

const BRAND = /neonplan|mastershort|floorplan[-_ ]?3d|neon plan/i;

// ------------------------------------------------------------------------------------------ i18n

/** Reads the `key: "text"` entries of a TypeScript object literal (some entries break after the colon). */
function parseTable(block, what) {
  const out = new Map();
  // comment lines between the entries are not texts
  block = block.replace(/^[ \t]*\/\/.*$/gm, "");
  let rest = block;
  for (const m of block.matchAll(/(^|\n)  ([A-Za-z0-9_]+):\s*("(?:[^"\\\n]|\\.)*"),(?=\n)/g)) {
    if (out.has(m[2])) fail(`i18n ${what}: duplicate key ${m[2]}`);
    out.set(m[2], JSON.parse(m[3]));
    rest = rest.replace(m[0], "\n");
  }
  if (rest.trim() !== "") fail(`i18n ${what}: text left after reading the entries: ${JSON.stringify(rest.trim().slice(0, 120))}`);
  return out;
}

const TEXT_RULES = [
  [/ \(api\.mastershort\.de\)/g, ""],
  [/ (su|at) mastershort\.de/g, ""],
  [/NeonPlan 3D/g, "Casa 3D"],
  [/NeonPlan/g, "Casa 3D"],
];
const retext = (s) => TEXT_RULES.reduce((acc, [re, to]) => acc.replace(re, to), s);

function buildI18n(upstreamSrc, itJson) {
  const deStart = upstreamSrc.indexOf("const de = {\n");
  const deEnd = upstreamSrc.indexOf("\n};\n", deStart);
  const enStart = upstreamSrc.indexOf("const en: Record<Key, string> = {\n");
  const enEnd = upstreamSrc.indexOf("\n};\n", enStart);
  if ([deStart, deEnd, enStart, enEnd].some((i) => i < 0)) fail("i18n.ts: tables not found");
  const de = parseTable(upstreamSrc.slice(deStart + "const de = {\n".length, deEnd + 1), "de");
  const en = parseTable(upstreamSrc.slice(enStart + "const en: Record<Key, string> = {\n".length, enEnd + 1), "en");
  const it = new Map(Object.entries(itJson));
  const same = (a, b) => a.size === b.size && [...a.keys()].every((k) => b.has(k));
  if (!same(de, en)) fail("i18n: the German and English tables have different keys");
  if (!same(de, it)) {
    const missing = [...de.keys()].filter((k) => !it.has(k));
    const extra = [...it.keys()].filter((k) => !de.has(k));
    fail(`i18n: lang/it.json does not match the keys (missing ${missing.join(",")}; extra ${extra.join(",")})`);
  }
  const pruned = [...it.keys()].filter((k) => PRUNED_KEYS.test(k) && !KEPT_KEYS.has(k));
  const fix = (m) => new Map([...m].filter(([k]) => !pruned.includes(k)).map(([k, v]) => [k, retext(v)]));
  const itFixed = fix(it);
  const enFixed = fix(en);
  for (const m of [itFixed, enFixed]) for (const [k, v] of m) if (BRAND.test(v) || /https?:\/\//.test(v)) fail(`i18n: brand or URL left in ${k}`);
  const ident = /^[A-Za-z_][A-Za-z0-9_]*$/;
  const body = [...itFixed].map(([k, v]) => `  ${ident.test(k) ? k : JSON.stringify(k)}: ${JSON.stringify(v)},`).join("\n");
  const text = `// UI strings. Italian is built in; the English texts are a small file next to the bundles (lang/en.json),
// fetched once when the host runs in English. A key missing there falls back to Italian.

import type { HomeAssistant } from "./types.ts";

const it = {
${body}
};

type Key = keyof typeof it;

export type I18nKey = Key;

declare const __FP3D_LANG_HASH__: string;

/**
 * Languages beyond the built-in Italian live in lang/<code>.json next to the bundles (so wall tablets never
 * load texts they do not need) and are fetched once when the host runs in that language. Missing keys fall
 * back to Italian.
 */
export const EXTRA_LANGUAGES = ["en"] as const;
const extra = new Map<string, Record<string, string>>();
const pending = new Map<string, Promise<void>>();

/** The language file a host language needs (null: Italian, built in). */
export function languageCode(lang: string | undefined): string | null {
  const code = (lang ?? navigator.language).toLowerCase().slice(0, 2);
  return (EXTRA_LANGUAGES as readonly string[]).includes(code) ? code : null;
}

/** Whether the texts for a language are at hand (built in, or already fetched). */
export function languageReady(lang: string | undefined): boolean {
  const code = languageCode(lang);
  return !code || extra.has(code);
}

/** Fetch a language's texts (once); a missing or broken file leaves Italian in place. */
export function loadLanguage(lang: string | undefined): Promise<void> {
  const code = languageCode(lang);
  if (!code || extra.has(code)) return Promise.resolve();
  let p = pending.get(code);
  if (!p) {
    const url = new URL(\`./lang/\${code}.json?v=\${typeof __FP3D_LANG_HASH__ === "string" ? __FP3D_LANG_HASH__ : "0"}\`, import.meta.url).href;
    p = fetch(url)
      .then((r) => (r.ok ? r.json() : {}))
      .then((table: Record<string, string>) => void extra.set(code, table && typeof table === "object" ? table : {}))
      .catch(() => void extra.set(code, {}))
      .finally(() => pending.delete(code));
    pending.set(code, p);
  }
  return p;
}

export function translate(hass: HomeAssistant | undefined, key: Key, vars: Record<string, string | number> = {}): string {
  const code = languageCode(hass?.language ?? navigator.language);
  const table: Record<string, string> = (code && extra.get(code)) || it;
  let s: string = table[key] ?? it[key] ?? key;
  for (const [k, v] of Object.entries(vars)) s = s.replace(\`{\${k}}\`, String(v));
  return s;
}

export function formatNumber(hass: HomeAssistant | undefined, value: number, digits = 2): string {
  return value.toLocaleString(hass?.language ?? undefined, { maximumFractionDigits: digits });
}
`;
  const enJson = JSON.stringify(Object.fromEntries(enFixed), null, 2) + "\n";
  return { text, enJson, keys: itFixed.size, pruned: pruned.length };
}

// ------------------------------------------------------------------------------------------ main

function main() {
  const verified = verifyUpstream();
  const srcRoot = join(UP, "src");
  const files = new Map();
  for (const f of walk(srcRoot)) files.set(posix(relative(srcRoot, f)), readFileSync(f, "utf8"));
  const upstreamCount = files.size;

  // removals and overrides
  for (const f of Object.keys(REMOVED)) if (!files.delete(f)) fail(`removed file not found in upstream: ${f}`);
  for (const f of Object.keys(OVERRIDDEN)) {
    if (!files.has(f)) fail(`overridden file not found in upstream: ${f}`);
    const o = join(OVERRIDES, f);
    if (!existsSync(o)) fail(`override missing: overrides/${f}`);
    files.set(f, readFileSync(o, "utf8"));
  }

  for (const f of Object.keys(ADDED)) {
    const o = join(OVERRIDES, f);
    if (files.has(f)) fail(`added file already exists in upstream: ${f}`);
    if (!existsSync(o)) fail(`override missing: overrides/${f}`);
    files.set(f, readFileSync(o, "utf8"));
  }

  // targeted patches
  const applied = [];
  for (const p of patches) {
    if (!files.has(p.file)) fail(`${p.id}: file not in the sources: ${p.file}`);
    try {
      const res = p.apply(files.get(p.file));
      files.set(p.file, res.text);
      applied.push({ ...p, found: res.n });
    } catch (e) {
      fail(`${p.id} (${p.file}): ${e.message}`);
    }
  }

  // i18n tables
  const i18n = buildI18n(files.get("i18n.ts"), JSON.parse(readFileSync(join(UP, "lang", "it.json"), "utf8")));
  files.set("i18n.ts", i18n.text);

  // generic renames (the i18n tables are done already)
  const ruleHits = RULES.map((r) => ({ ...r, total: 0, files: new Map() }));
  for (const [name, text] of files) {
    if (name === "i18n.ts") continue;
    let t = text;
    for (const r of ruleHits) {
      const n = (t.match(r.re) ?? []).length;
      if (n) {
        t = t.replace(r.re, r.to);
        r.total += n;
        r.files.set(name, n);
      }
    }
    files.set(name, t);
  }

  // nothing of the original name may be left in the sources
  const left = [];
  for (const [name, text] of files) {
    text.split("\n").forEach((line, i) => {
      if (BRAND.test(line)) left.push(`${name}:${i + 1}: ${line.trim().slice(0, 120)}`);
    });
  }
  if (left.length) fail(`the original name is still in ${left.length} line(s):\n${left.slice(0, 40).join("\n")}`);

  // write src/ and lang/ (only these two folders are ever deleted)
  for (const d of [OUT_SRC, OUT_LANG]) rmSync(d, { recursive: true, force: true });
  for (const [name, text] of files) {
    const target = join(OUT_SRC, name);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, text);
  }
  writeFileSync(
    join(OUT_SRC, "GENERATO.md"),
    "Cartella generata da tools/rinomina.mjs a partire da upstream/ e overrides/. Non modificare a mano: una modifica si fa in overrides/ o come patch nello script, e si rigenera. Il registro è in ../PATCHES.md.\n",
  );
  mkdirSync(OUT_LANG, { recursive: true });
  writeFileSync(join(OUT_LANG, "en.json"), i18n.enJson);

  writeFileSync(join(ROOT, "PATCHES.md"), buildPatches({ verified, upstreamCount, written: files.size, applied, ruleHits, i18n }));
  const tests = [...files.keys()].filter((f) => f.endsWith(".test.ts")).length;
  console.log(`rinomina: upstream verified (${verified} files); ${upstreamCount} sources -> ${files.size} files in src/ (${tests} test files); ${applied.length} targeted patches; ${ruleHits.reduce((s, r) => s + r.total, 0)} generic substitutions; ${i18n.keys} texts`);
}

// ------------------------------------------------------------------------------------------ PATCHES.md

function buildPatches({ verified, upstreamCount, written, applied, ruleHits, i18n }) {
  const rows = (arr) => arr.join("\n");
  return `# Registro delle patch di casa3d

File generato da \`tools/rinomina.mjs\`: non modificarlo a mano.

## Origine

- Base: progetto di terzi con licenza MIT, revisione \`${REVISION}\` (v1.20.2, 2026-10-19).
- Archivio scaricato da codeload.github.com: SHA-256 \`${ARCHIVE_SHA256}\`.
- Copia verbatim: \`upstream/\` (${verified} file; impronte in \`upstream.sha256\`, controllate a ogni esecuzione dello script).
- Copia di lavoro: \`src/\` (${written} file generati da ${upstreamCount} sorgenti) e \`lang/en.json\`.
- Avvisi di copyright e licenze: \`NOTICE\`, \`LICENSE-MIT-Mastershort\`, \`LICENSE-BSD3-lit\`, \`LICENSE-MIT-three\`.

## Come si usa

- \`npm run rinomina\` rigenera \`src/\` e \`lang/\` e questo file. Si modifica sempre lo script, \`overrides/\` o i dati: mai \`src/\`.
- \`npm test\` esegue i test \`node --test\` dei sorgenti copiati; \`npm run marchio\` controlla che il nome e il marchio originali, il formato delle chiavi di licenza e ogni URL verso terzi non compaiano nel prodotto, che non ci siano API di rete proprie (\`sendBeacon\`, \`XMLHttpRequest\`, \`WebSocket\`, \`EventSource\`, \`importScripts\`, \`Worker\`) e che le chiamate per indirizzo (\`fetch\`, \`import()\`, \`Image\`, caricatori di texture) compaiano solo nei file elencati nello script, con il motivo.
- Il nome e il marchio originali compaiono, per forza, soltanto in: \`upstream/\`, \`upstream.sha256\`, \`NOTICE\`, \`LICENSE-*\`, \`UPSTREAM.md\`, questo file e \`tools/rinomina.mjs\`.
- Il prefisso tecnico \`fp3d\` (classi CSS, elementi \`fp3d-*\`, variabili \`--fp3d-*\`, \`__FP3D_*__\`) è mantenuto (ADR-0014, D3).

## 1. File non portati in src/

| File | Motivo |
|---|---|
${rows(Object.entries(REMOVED).map(([f, why]) => `| \`${f}\` | ${why} |`))}

Non sono copiati affatto (nemmeno in \`upstream/\`): le altre 15 lingue di \`frontend/lang\`, i font e le immagini, i bundle compilati, gli script di build accessori (anteprime, registrazioni, pacchetti di immagini), il sito, i tutorial, gli strumenti, i test Python, la documentazione dell'autore e l'integrazione Python (salvo i cinque file di riferimento per T6).

## 2. File sostituiti da overrides/

| File | Motivo |
|---|---|
${rows(Object.entries(OVERRIDDEN).map(([f, why]) => `| \`${f}\` | ${why} |`))}

## 2b. File aggiunti da overrides/

| File | Motivo |
|---|---|
${rows(Object.entries(ADDED).map(([f, why]) => `| \`${f}\` | ${why} |`))}

## 3. Patch mirate

| ID | File | Tipo | Che cosa | Occorrenze |
|---|---|---|---|---|
${rows(applied.map((p) => `| ${p.id} | \`${p.file}\` | ${p.kind} | ${p.desc} | ${p.found} |`))}

## 4. Regole di rinomina generiche

Applicate in quest'ordine a tutti i file di \`src/\` (tranne \`i18n.ts\`) dopo le patch mirate.

| Regola | Sostituzione | Che cosa | Occorrenze | File |
|---|---|---|---|---|
${rows(ruleHits.map((r) => `| ${r.id} | \`${r.re.source}\` -> \`${r.to}\` | ${r.desc} | ${r.total} | ${r.files.size} |`))}

Dettaglio per file:

${rows(ruleHits.map((r) => `- ${r.id}: ${[...r.files].map(([f, n]) => `${f} (${n})`).join(", ") || "nessuna occorrenza"}`))}

## 5. Testi (i18n.ts e lang/en.json)

- \`src/i18n.ts\`: la tabella tedesca di origine è tolta; la tabella principale è l'italiano (${i18n.keys} testi, da \`frontend/lang/it.json\` della copia). \`translate()\` usa l'italiano e, se il host è in inglese, il file \`lang/en.json\` caricato a richiesta (stesse chiavi, tabella inglese di origine). Le altre lingue non sono portate.
- Nei testi sono riscritti il nome del prodotto (\`NeonPlan 3D\` e \`NeonPlan\` diventano \`Casa 3D\`) e i due riferimenti al sito dell'autore (\`${TEXT_RULES[0][0].source}\`, \`${TEXT_RULES[1][0].source}\`).
- Potati ${i18n.pruned} testi dei servizi non portati (licenza, negozio, pagina Estensioni, Supporter e beta, rapporti d'uso, richiesta di aggiornamento tramite HACS): nessuna interfaccia li usa. Resta \`license_copy\`, che l'editor usa per copiare l'id della stanza. Altri testi con riferimenti residui (newsletter, GitHub) vanno riletti nella revisione dell'italiano (T9c).
- Il testo italiano non è stato rivisto da una persona.

## 6. Residui noti e lavoro rimandato

- Formato di esportazione: \`acasystem-casa3d-backup\` (versione 1, \`GET\` e \`POST /api/casa3d/backup\`, T6); il file nel formato originale non è letto (D9 aperta).
- Funzioni Pro: il codice c'è; \`features.ts\` sblocca ancora con i pacchetti installati (\`hasFeature\`). I diritti di Acasystem e \`ACASYSTEM_PAYMENTS\` sono T8, non in questo giro. Nessuna vendita, nessun modo live.
- Interruttori di prova dell'originale ancora attivi in \`features.ts\` e \`load-voice.ts\`: \`?fp3d_lab\`, \`?fp3d_projection\`, \`?fp3d_mic\` (scrivono chiavi di localStorage e mostrano funzioni non rilasciate). Residuo di T8: si tolgono con una patch di \`overrides/features.aca.ts\` insieme ai diritti.
- \`hasFeature\` si fida del campo \`features\` dei pacchetti, perché la verifica della firma Ed25519 stava nel backend Python che non è portato. Per questo il backend di Acasystem (T6) non accetta nessun pacchetto: \`casa3d/packs/list\` risponde sempre con una lista vuota (l'adattatore, senza chiamare il server) e l'importazione di un backup salta ogni pacchetto (\`skipped\`, motivo \`unsupported\`). Lo sblocco delle funzioni Pro resta solo ai diritti di T8.
- \`diagnostics.ts\` è tolto, non sostituito da un modulo vuoto, e con lui \`diagnostics.test.ts\`. Le patch locali hanno un test proprio in \`overrides/\` (\`i18n.test.ts\`, copiato in \`src/\`).
- \`api.ts\` non è patchato per T6: parla ancora al backend con \`callWS\`/\`subscribeMessage\` (tipi \`casa3d/…\`) e la traduzione verso le rotte REST \`/api/casa3d/*\` sta nell'adattatore del frontend (\`frontend/src/casa3d/planApi.ts\`, collegato in \`haShim.ts\`), così il confronto con l'originale resta possibile. Il piano passa solo dal backend di Acasystem, mai da Home Assistant: l'adattatore continua a rifiutare \`callService\` e ogni comando di scrittura verso Home Assistant. Il modulo tiene la revisione dell'ultimo piano letto o salvato e la manda a ogni salvataggio (\`base_revision\`; al conflitto il server risponde 409 e l'errore ha il codice \`revision_conflict\`). Differenze dall'originale: la risposta di \`casa3d/building/get\` non ha il campo \`version\` (\`backendVersion\` resta nullo e l'avviso «riavvia Home Assistant» non compare); \`casa3d/building/subscribe\` diventa la lettura della sola revisione ogni 30 s a pagina visibile (il server non ha un canale di notifica); le immagini viaggiano come binario (\`PUT /images/:id\`) e tornano come indirizzo \`data:\`; un'immagine che non è PNG, JPEG o WebP è rifiutata dal client prima della richiesta e dal server sui byte. La Vista del launcher non usa ancora questo canale (mostra il piano d'esempio): lo userà l'editor (T10a).
- \`load-editor.ts\` e \`load-timetravel.ts\` (caricatori dei bundle dell'editor e del viaggio nel tempo) non hanno più chi li usa: li userà il guscio della pagina (T4a, T10).
- Il punto d'ingresso \`main.ts\` è provvisorio (il guscio della pagina è T4a). La build è \`build.mjs\` (T2b): bundle con l'impronta del contenuto nel nome (\`casa3d-3d-<impronta>.js\`, patch dei caricatori nella sezione 3), \`dist/manifest.json\`, licenze accanto ai bundle; servizio sotto \`/casa3d/\` (D16).
- Qualità (T5): tre livelli Light, Medium e High (\`viewer/quality.ts\`, file aggiunto); il livello lo sceglie sempre l'host e si parte da Light su ogni dispositivo (\`isLowEnd\` è tolto). Light: rapporto pixel 1, niente antialias, preferenza di potenza bassa, fotogrammi distanziati di almeno 24 ms mentre qualcosa si muove solo su schermi da 75 Hz in su (frequenza misurata con i fotogrammi dello schermo: a 60 Hz nessun fotogramma è saltato; soglia 21 ms sui tempi dei callback, \`displayPeriodMeter\`), più le riduzioni già presenti del livello «tablet» dell'originale (luce a celle da 0,5 m, niente terreno, ombre, aloni, coni, meteo, timer a 66 ms). Medium: rapporto pixel fino a 1,25, niente antialias. High: fino a 2, antialias. \`setQuality\` libera il contesto vecchio prima di crearne uno nuovo e non cambia durante un gesto; \`webglcontextlost\` e \`webglcontextrestored\` sono gestiti (evento \`context-state\` all'host; al ripristino basta un fotogramma, non si ricostruisce la geometria). **Non fatto, da misurare sul tablet:** distanza di disegno (\`far\`) ridotta, niente esterni in Light, altri piani solo come contorno, fotogrammi con meno chiamate di disegno (geometrie unite o istanze), rapporto pixel 0,85 o 0,75, \`powerPreference\` come unica leva. Le texture da canvas 2D (\`CanvasTexture\`: 8x32 dell'avvolgibile in Light, più 1024x1024, 768x512 e 64x64 sopra Light) sono caricate con \`texSubImage2D\`: sul renderer software del PC è l'origine dei quattro avvisi «GPU stall due to ReadPixels»; non cambiate.
- I titoli e le altre stringhe in tedesco e inglese di \`voice/mic-probe.ts\` e le parole chiave dei comandi vocali restano nelle lingue di origine.
- Le immagini si caricano ancora da qualunque indirizzo http(s) indicato nei dati (\`model.ts\`, immagini degli schermi, \`entity_picture\`): è dato dell'utente, non una chiamata del prodotto; per \`entity_picture\` l'adattatore (T3) lascia passare solo percorsi sotto \`/ha\` e indirizzi della stessa origine (toglie gli altri e usa \`entity_picture_local\` come ripiego); gli indirizzi delle immagini degli schermi e degli sfondi nei dati del piano sono rifiutati dal validatore del server (T6: ammessi solo l'id di un'immagine salvata o \`camera:<entità>\`, ogni altro indirizzo dà 400), ma il codice copiato (\`pictureUrl\` in \`view3d.ts\`) accetta ancora un indirizzo http(s) nelle immagini degli schermi di un piano che non passa dal server (per esempio quello d'esempio).
- Il look (token, ombre, font, bersagli da 44 px, \`ha-icon\`, \`confirm()\`) e le patch dell'editor per il tablet sono T9 e T10.
- I test di alerts, markers e presence verificano testi tradotti: la lingua di prova e le attese sono passate dal tedesco all'italiano (patch della sezione 3 sui rispettivi file di test).
`;
}

main();
