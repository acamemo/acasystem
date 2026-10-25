| Campo | Valore |
|---|---|
| ID e titolo | ADR-0014: Casa 3D, cioè una base copiata da neonplan3d (MIT) come ultima pagina del launcher, con livelli di qualità e diritti gestiti da Acasystem |
| Stato | **Accettata** il 2026-10-20 dall'utente («approvo la bozza, procedi con la misura della demo sul tablet»). Fino al 2026-10-20 era «Proposta». Le decisioni lasciate aperte dall'utente sono elencate in «Accettazione». |
| Data e autore | 2026-10-20. Scheda redatta da Claude Code (Opus 5.5, `claude-opus-5-5`) a partire dalle letture A-D dello stesso giorno (modello delle letture non disponibile), con critica di completezza e verifiche in sola lettura fatte lo stesso giorno |
| Decisore e autorizzazione | **Strada scelta dall'utente** nella chat del 2026-10-20: «possiamo lanciare un altro agente o usare una nuova chat per lavorare per la parte di casa 3d del repo github che ti avevo mandato prima?» e «noi possiamo anche andare a copiare tutto tranne il nome e ne personalizziamo il frontend integrandolo come base ma modificandola per fatti nostri».<br><br>**Requisiti aggiuntivi dell'utente**, stessa data:<br>(1) «e qualità superiore attivabile da menu, versione Light per tab lenovo, versione Medium e versione High per tablet con hardware più permissivi (high è la qualità massima)»;<br>(2) «le lascerei, però le nostre versioni ce le dovremmo studiare un momento con le opzioni a pagamento, i pacchetti e upgrade pacchetti, andrei a mettere un pulsante nell'interfaccia che ti permette di switchare fra i piani e una variabile in env che ci serve per disattivare i pagamenti e avere una testmode»;<br>(3) «andrei poi a collegare questa interfaccia 3d come ultima pagina di acasystem base con possibilità di spostarla, ma siccome è una cosa pesante va studiata per funzionare al meglio».<br><br>**Cosa non è approvato.** Architettura, parametri, modello dei diritti e regole di questa scheda sono proposte dell'agente. Nuove dipendenze (lit, three), eccezioni agli ADR esistenti, nuove tabelle e rotte **non sono autorizzate** finché l'utente non accetta questa scheda, anche modificandola. |
| Collegamenti | [REP-20261020-002](../reports/REP-20261020-002-casa-3d-piano.md), [REP-20261019-004](../reports/REP-20261019-004-studio-neonplan3d.md).<br>Requisiti: REQ-07 (AC-07), REQ-09 (AC-09), REQ-10 (AC-10), REQ-16 (AC-16), REQ-17.<br>Issue: ISSUE-006, ISSUE-008, ISSUE-009, ISSUE-012, ISSUE-014, ISSUE-015, ISSUE-016, ISSUE-048, ISSUE-062.<br>Conformità: C-03, C-05, C-06, C-08 di `compliance.md`.<br>ADR: [ADR-0004](ADR-0004-principi-frontend.md), [ADR-0005](ADR-0005-typescript-italiano-icone.md), [ADR-0007](ADR-0007-acasystem-os.md), [ADR-0008](ADR-0008-struttura-frontend-backend.md), [ADR-0009](ADR-0009-home-assistant-dietro-acasystem.md), [ADR-0011](ADR-0011-kit2-base-grafica.md), [ADR-0012](ADR-0012-pageshell.md), [ADR-0013](ADR-0013-barra-unica.md) |
| Sostituisce / sostituita da | Nessuna.<br>Se accettata, richiede annotazioni datate in:<br>- ADR-0012: nuovo PageKind `casa3d`;<br>- ADR-0009: nuove rotte REST sotto `/api`; il tunnel WS continua a non filtrare i comandi;<br>- `product.md` 6.1-6.4 e REQ-09/10/16, solo dopo la decisione D15. |

Il numero 0014 e quello del report sono liberi il 2026-10-20 (ultimo ADR-0013, ultimo report REP-20261020-001). Altri agenti lavorano nel repository: vanno ricontrollati al salvataggio.

## Contesto ed evidenze

Fonte esterna: https://github.com/Mastershort/neonplan3d, commit `1383a14200c2c96d676ff3fda8b8d87b709089fc` (v1.20.2, 2026-10-19). È stata letta via raw.githubusercontent.com e API GitHub, senza clonare e senza eseguire codice.

### Fatti verificati sulla base esterna

- **Licenza e marchio.**
  - MIT, «Copyright (c) 2026 Mastershort» (`LICENSE` righe 1-3).
  - «NeonPlan 3D» è il nome del progetto originale, e i pacchetti e gli extra Pro venduti non sono nella repository (README riga 142).
  - L'autore dichiara gratuite le funzioni di sicurezza (fumo, acqua, allarme, pioggia, blackout) e vende gli extra una tantum, senza abbonamento (README riga 50).
- **Stack e peso.**
  - Lit 3 e three.js 0.186: sette bundle esbuild per circa 2,7 MB; la sola vista (principale + 3D) pesa 1,42 MB.
  - `editor.ts` ha 15.206 righe (731 KB), `view3d.ts` 5.914, `viewer3d.ts` 4.742.
  - `build.mjs` usa `legalComments: 'none'`, quindi i bundle non contengono gli avvisi di licenza.
- **Dipendenza da HA.**
  - Il motore 3D non nomina `hass`.
  - Il backend Python in `custom_components/neonplan3d` si raggiunge solo da `api.ts`.
  - L'oggetto `hass` è piccolo (`types.ts`).
- **Qualità.**
  - `Quality = "auto" | "low" | "high"` (`viewer3d.ts:88`).
  - `isLowEnd()` (righe 476-481) è vero con `deviceMemory <= 3`, `hardwareConcurrency <= 4` o UA Silk/Kindle. Sul Tab M11 l'esito **non è determinato**: dipende da `deviceMemory`, che Chrome arrotonda e che non è mai stato misurato.
  - `makeRenderer` (1626-1638) usa antialias e pixel ratio fino a 2 (2,5 in high).
  - `setQuality` (740-755) crea il nuovo renderer prima di rilasciare il vecchio.
  - Il disegno avviene solo a richiesta (`invalidate`, 1619) e si ferma con `IntersectionObserver` e `document.hidden` (688-697).
- **Contesto WebGL.**
  - L'app non ha gestori di `webglcontextlost`.
  - three.js 0.186.1 gestisce il proprio stato, ma nessuno richiede il ridisegno.
- **Gesti.**
  - `HOLD_MS = 500` (`controls.ts:35`).
  - `setPointerCapture` a ogni `pointerdown` (152).
  - Tolleranza di 6 px (194), doppio tocco entro 320 ms (272), `touch-action: none` sul canvas.
- **Conferme.**
  - `confirm()` nativo in `view3d.ts` (1811, 4052) e in 9 punti di `editor.ts`.
  - `unsafeHTML` con filtro per `<ha-icon>` (`editor.ts:9997`).
  - `innerHTML` delle icone dei pin (`viewer3d.ts:874`).
- **Immagini e modello.**
  - Il client ridimensiona e ricodifica le immagini: sfondi a 2048 px in JPEG, immagini degli schermi a 512 px (`editor.ts:5047-5053, 11561-11567`).
  - Il modello ammette URL http(s) per le immagini degli schermi (`model.ts:134`).
  - Lo schema server impone ID con regex e lunghezze massime (`schema.py:13-26`).
  - Una bozza intera del piano resta nel `localStorage` (`building-controller.ts:14,26-42`).
- **Funzioni Pro.** Il codice è nella repository; lo sblocco viene da pacchetti firmati venduti dall'autore (`features.ts:1-4, 106-114`).

### Fatti verificati su Acasystem

- **Pager** (`Pager.tsx`).
  - Monta tutte le pagine.
  - Le pagine fuori schermo sono `inert` e `aria-hidden` e ricevono `PageVisibilityContext` false (righe 556-600).
  - Esiste già un blocco dello scorrimento: prop `locked`, classe `is-locked`, `isBlocked` (459, 530; `launcher.css:66-69`).
  - Gesti del launcher: `LONG_PRESS_MS 500`, `HOLD_TOLERANCE_PX 14`, `DOUBLE_TAP_MS 280` (`gestures.ts:8-12`).
- **Rete e sicurezza.**
  - CSP con `script-src 'self'`, ma `connect-src` e `img-src` ammettono `http:` e `https:` (`security.ts:8-20`).
  - Limite del corpo JSON: 2 MB.
  - Nessuna rotta verifica `is_admin`.
- **Preferenze.** `current_settings` è indicizzata per (`ha_user_id`, `device_id`), e il `device_id` vive nel `localStorage` (`useSettingsSync.ts:67-80`).
- **Configurazione.**
  - `progetto/.env.example` contiene solo `ACASYSTEM_VERSION`.
  - `compose.tunet.yaml` elenca `environment` in modo esplicito.
  - Il build non esegue i lint (solo typecheck in `prebuild`).
- **Cache.** `sw.js` mette in cache solo `/assets/` e non elimina le versioni vecchie.
- **Conferme.** Non esiste una primitiva di conferma generica; c'è il pattern a due tocchi della serratura.
- **Licenza.** Acasystem è GPL-3.0.
- **Tab M11.** Mali-G52, 4 GB con circa 150 MB liberi, 1280×665 a DPR 1,5. ISSUE-062 è aperto.

### Inferenze non verificate

- peso, avvio e fluidità sul Tab M11;
- Lit dentro React 19;
- ripristino delle risorse GPU dopo la perdita del contesto;
- lettura dei registri HA da parte di un utente non admin, secondo il sorgente di HA 2026.9.4;
- valori di `deviceMemory` e `hardwareConcurrency` del Tab M11.

### Conflitti da registrare

1. **Collocazione.** REP-20261019-004 (valutazione 5) e le letture A-D indicavano una pagina a schermo intero fuori dal pager. Il requisito 3 dell'utente chiede l'ultima pagina del launcher, spostabile, e prevale. L'editor dell'installatore resta fuori dal pager.
2. **`product.md` 6.4.** Lì il 2D è lo standard sui tablet economici. Mitigazioni: Light, anteprima statica, «Elenco stanze».
3. **`product.md` 6.1-6.2 (REQ-09/10).** Lì la piantina è caricata anche in SVG, con coordinate X%/Y%, mentre la base usa metri e rifiuta gli SVG. Decisione D15.
4. **REQ-07 / AC-07.** I diritti della Casa 3D sono di fatto la prima realizzazione dei Feature Modules a licenza: non devono nascere come modello separato.

## Proposta o decisione

La strada è dell'utente: copia come base, tutto tranne nome e marchio, con frontend personalizzato. La realizzazione è proposta dall'agente.

### 1. Sede e build

- **Workspace.** Workspace npm separato `progetto/acasystem/casa3d/` con build esbuild propria e output `casa3d/dist/`, copiato dal Dockerfile e servito same-origin.
- **Struttura interna.**
  - `upstream/`: copia verbatim a 1383a14, mai modificata;
  - `src/`: copia di lavoro rinominata con `scripts/rinomina.mjs`;
  - `overrides/`: moduli sostituiti per intero con alias;
  - `PATCHES.md`: registro delle patch;
  - `NOTICE`: Mastershort MIT, lit BSD-3-Clause, three MIT.
- **Prefisso.** Il prefisso tecnico `fp3d` resta (decisione D3).
- **Percorso e cache.** Due possibilità, da scegliere (decisione D16):
  - **(a)** `/casa3d/`, servito con hash nel nome, `Cache-Control: immutable` e un 404 esplicito (niente ripiego SPA);
  - **(b)** `/assets/casa3d/` con hash, nella cache del service worker, con una regola di pulizia delle versioni vecchie, che oggi manca.
- **Licenze nella distribuzione.**
  - `NOTICE` va servito accanto ai bundle e mostrato nella pagina Informazioni.
  - Il controllo di build «nessun `mastershort`/`neonplan`» esclude soltanto `NOTICE`, `LICENSE-*` e quel testo.

### 2. Collocazione: ultima pagina del launcher

- **PageKind.** Nuovo PageKind `casa3d` con superficie speciale (PageShell/PageKindHost). Una istanza per layout, aggiunta in coda una volta sola, spostabile e nascondibile. Non si ricrea se l'utente la elimina (decisione D12).
- **Stati della pagina.**
  - **Riposo.** Predefinito, ed è anche lo stato fuori schermo, nella vista pagine e in modifica. Nessun JS 3D. Mostra un'anteprima statica e i comandi da 56 px «Esplora» ed «Elenco stanze».
  - **Vista.** Canvas montato e fermo. Solo tocco breve sui pin. Lo swipe resta al pager: niente cattura del puntatore e `touch-action: pan-x`. Una pressione di 500 ms sul canvas va al launcher: comportamento da confermare (D18).
  - **Esplora.** Gesti al 3D; pager bloccato con il `locked` esistente; pressione lunga del launcher sospesa. Si esce con «Fine» da 56 px sempre visibile, con Esc, con il tasto indietro (una voce nella cronologia dell'HashRouter), con l'indicatore delle pagine o dopo 60 s senza tocchi.
- **Caricamento.**
  - Con la pagina adiacente, `<link rel="modulepreload">`: prelievo e compilazione, non esecuzione.
  - Con la pagina corrente e ferma e senza vista pagine, modifica o Sistema aperti: `import()` e creazione del renderer.
  - Il codice importato resta in memoria fino al ricaricamento.
- **Sospensione.**
  - Pagina non visibile: timer e disegno fermi.
  - Dopo 60 s fuori schermo, con Sistema o l'editor aperti, o con lo schermo spento a lungo: `dispose` e `forceContextLoss`.
- **Anteprima statica.**
  - Si cattura con stati neutri, cioè luci spente, e porta la scritta «Anteprima».
  - Si invalida a ogni cambio di tema, accento o piano.
  - Resta in un blob URL di sessione. La copia in IndexedDB richiede la decisione D17.
- **Proprietà e tastiera.**
  - Le proprietà si assegnano con un ref dopo `customElements.whenDefined`; gli eventi si ascoltano con `addEventListener`.
  - I gestori globali usano `composedPath()`; Esc in Esplora o nell'editor chiama `preventDefault` prima che agisca il launcher.
- **Editor dell'installatore.** Overlay a schermo intero fuori dal pager, sul modello di Sistema.

### 3. Adattatore `hass`

- Costruito su HomeAssistantContext.
- Se l'utente è assente, vale come non admin.
- `entity_picture` viene riscritto in `/ha/...`.
- I registri area, piano, dispositivo ed entità (`list_for_display`) si caricano alla prima apertura.
- Le azioni passano da una **nuova primitiva di conferma** (ADR-0004), oppure dal pattern a due tocchi esistente, al posto di `confirm()` (11 punti).

### 4. Persistenza nel backend Acasystem

- **Tabelle nuove in `tunet.db`:**
  - `casa3d_building`: `home_id`, `revision`, `data`, `data_enc`;
  - `casa3d_image`: BLOB;
  - `casa3d_history`: 20 punti di ripristino, al più uno ogni 600 s.
- **Rotte e scrittura.**
  - Rotte `/api/casa3d/*` con compare-and-swap e 409 in caso di conflitto.
  - Scrittura consentita solo all'installatore verificato dal server (D13).
- **Validatore.**
  - Riporta i vincoli di `schema.py`: ID con regex e al massimo 64 caratteri, nomi fino a 100, riferimenti fino a 255, 20 piani, 200 stanze, 1000 elementi.
  - Limita la dimensione totale.
  - Rifiuta gli URL esterni delle immagini.
- **Immagini.**
  - Rotta binaria dedicata.
  - Controllo dei primi byte, decodifica, limiti in pixel e in byte, ricodifica o rifiuto, `nosniff`.
  - Niente SVG.
- **Bozza e dati.**
  - La bozza locale dell'editor si cancella al salvataggio e al cambio di utente.
  - Il piano entra nelle copie a freddo; la cifratura a riposo segue la decisione D8.

### 5. Qualità grafica (requisito 1)

Il tipo diventa `light | medium | high` ed è sempre l'host a sceglierlo.

| Parametro | Light (predefinita sul Tab M11) | Medium | High (massima) |
|---|---|---|---|
| Pixel ratio | 1 (0,85 se la misura lo richiede) | min(DPR, 1,25) | min(DPR, 2) |
| Antialias | no | no | sì (MSAA) |
| `powerPreference` | low-power | default | default |
| Mesh ombra / atlante dei pattern | no / no | sì / sì | sì / sì |
| Cella della luce calcolata sulla CPU | 0,5 m | 0,25 m | 0,25 m |
| Materiali | MeshBasic tematizzati; niente aloni, coni, schermi o vetri additivi, niente acqua | aloni sì, coni no | tutti, coni compresi |
| Luci | solo il colore della lampada nella stanza | come Light, più gli aloni | complete |
| Timer delle animazioni | 66 ms, 15 fps; effetti a 250 ms | 33 ms | 33 ms |
| Disegno durante il gesto | fino a 30 fps | fino a 60 fps | vsync |
| Distanza di disegno (`far`, diagonale dell'edificio) | 1,5×; niente esterni o terreno; altri piani solo come contorno | 3×; esterni semplificati | 6×; completi |
| Meteo / rotazione automatica | no / no | ridotto / no | sì / a scelta |
| Overlay sopra il canvas | piatti, senza ombra né blur | piatti, senza ombra né blur | senza blur |

- **Rilevamento iniziale.**
  - Senza WebGL2, o con `failIfMajorPerformanceCaveat` (contesto di prova rilasciato subito): «Elenco stanze».
  - Profilo di dispositivo noto (TB330FU, o scelto in Sistema): Light.
  - GPU Mali-G5x o Adreno ≤ 6xx (nome della GPU DA VERIFICARE su Chrome 155), oppure `deviceMemory` ≤ 4: Light.
  - Altrimenti Medium. High non viene mai scelta in automatico.
- **Scelta e salvataggio.**
  - Si sceglie dal menu della pagina e da Sistema.
  - Si salva per dispositivo in `localStorage`, con copia in `current_settings` quando la sincronizzazione è attiva. La chiave è per utente e dispositivo, e il `device_id` sta nel browser.
  - Se il browser viene pulito, la preferenza si perde e il dispositivo riparte dal rilevamento.
- **Cambio di livello.**
  - Si rilascia il vecchio renderer prima di creare il nuovo.
  - Non è ammesso durante un gesto.
  - Su un dispositivo rilevato come Light, il passaggio a High chiede conferma.
- **Perdita del contesto WebGL.**
  - Al `webglcontextlost`: `preventDefault`, timer fermi, avviso.
  - Al ripristino: firme di contenuto azzerate, poi `rebuild` e `invalidate`.
  - Senza ripristino entro 5 s: renderer ricreato in Light.
  - Seconda perdita entro 10 minuti: anteprima statica, «Riprova» ed «Elenco stanze».
  - Se gli fps restano bassi a lungo, si propone di scendere di un livello senza imporlo.

### 6. Diritti, piani e pagamenti (requisito 2)

- **Cosa si toglie.**
  - Licenza e pacchetti firmati dell'autore: `license.py`, Ed25519 e chiavi di `packs.py`, `extensions.ts`.
  - Ogni URL verso mastershort.de.
- **Catalogo di Acasystem**, versionato nel backend:
  - funzioni: le chiavi di `features.ts`;
  - pacchetti con livelli, dove l'upgrade è il passaggio al livello successivo;
  - piani.
- **Tabella dei diritti.**
  - Tabella generica `entitlements(scope, home_id, plan_id, packs, source: installer|test|purchase, valid_from, valid_to, revision, updated_by)` con registro degli eventi.
  - `scope = 'casa3d'` per ora: è la prima realizzazione di REQ-07 e AC-07, non un modello separato.
- **Verifica sul server.** `hasFeature()` mantiene la firma, ma la revoca vale anche sul server: le rotte che servono funzioni Pro, se ne esistono, controllano il diritto (AC-07).
- **Variabile `ACASYSTEM_PAYMENTS = off | test | live`.**
  - Sta in `progetto/.env`, `.env.example` e nella voce `environment` del compose (`${ACASYSTEM_PAYMENTS:-off}`) ed è letta da `config/env.ts`.
  - Se manca o non è valida vale `off`.
  - Il frontend non la incorpora: la legge dall'API.
- **Modi.**
  - **`off`**: niente acquisti né commutatore; il piano lo imposta l'installatore (D13).
  - **`test`**: commutatore «Piano: … ▾» nel menu della pagina e in Sistema, con la fascia «Modalità di prova» sempre visibile. Cambio immediato, gratuito e registrato, riservato all'installatore (D13). Uscendo da `test`, i diritti con `source = test` vengono ignorati.
  - **`live`**: rifiutata finché non esiste un fornitore. Vale come `off` e lascia un avviso nel log.
- **Limite dichiarato.** Con codice GPL-3.0 e backend presso il cliente, il blocco è solo tecnico (valutazione, non parere legale).
- **Proposte.**
  - Le funzioni di sicurezza restano gratuite in ogni piano (D14).
  - Nessuna funzione Pro va in vendita senza una decisione umana esplicita, preferibilmente dopo aver informato l'autore.

### 7. Tema, lingua, accessibilità

- **Tema.**
  - Token `--fp3d-*` ridefiniti sull'elemento ospite e mappati su `--k2-*`. Le ombre di Kit 2 non vanno sopra il canvas.
  - Look «kit2» chiaro e scuro nello shader, aggiornato a ogni cambio di tema o accento.
  - Uno script per i circa 530 colori fissi e un foglio aggiuntivo per pesi, maiuscole e spaziature (ADR-0007).
  - Inter.
- **Lingua.** `it.json` più la sovrapposizione `it.aca.json`, con controllo di build delle chiavi mancanti.
- **Bersagli.** Pin di almeno 48 px, comandi della pagina da 56 px, testo di almeno 16 px.
- **Movimento ridotto.** Con `prefers-reduced-motion`, cioè `useReducedMotion`: `flyTo` istantaneo, niente inerzia, niente animazioni infinite.
- **Lettori di schermo.**
  - «Elenco stanze» è l'alternativa equivalente.
  - Con TalkBack attivo si apre direttamente l'elenco.
  - Il canvas ha un'etichetta e il riepilogo dello stato della casa è in testo.

### 8. Eccezioni perimetrate (solo per `casa3d/`)

- **ADR-0004.** L'interno è Lit; il contenitore React usa le primitive.
- **ADR-0005.** mx-icons per tappe; `<ha-icon>` sostituito.
- **ADR-0007 e ADR-0011.** Foglio e script, con un elenco di esenzioni e una data di rientro.
- **ADR-0008.** Nuovo workspace.

### 9. Aggiornabilità

- Copia congelata a 1383a14.
- Il nucleo (model, geometry, viewer, controls, devices) si confronta con l'originale tramite script e le correzioni si riportano a mano.
- Per editor, view3d e testi si accetta la divergenza.
- Nessun merge promesso.
- Gli avvisi di sicurezza di lit e three vanno seguiti da noi.

## Alternative e motivazioni

- **Cartella `frontend/src/features/casa3d/` sotto Vite.** È possibile. Il lint della tipografia non blocca la build, ma il controllo `lint:typography` fallirebbe. Restano da riscrivere i caricatori `new URL(...?v=HASH)` e il comportamento di Rolldown non è provato. Scartata come proposta perché mescola codice di terzi all'app.
- **Integrazione HA rinominata.** Scartata:
  - richiede codice Python in ogni HA, contro `product.md` 5.3;
  - il piano resterebbe fuori dalle copie di Acasystem e leggibile da ogni utente HA;
  - un solo edificio.
- **Pagina a schermo intero fuori dal pager.** Superata dal requisito 3; resta solo per l'editor.
- **Sbloccare il Pro togliendo il controllo.** Non proposta: sostituita dai diritti di Acasystem, con la vendita rimandata a una decisione umana.
- **Copiare solo il motore e riscrivere l'interfaccia** (lettura B). Contraria a «copiare tutto tranne il nome»; resta come ripiego se l'editor costa troppo.

Questioni irrisolte (D1-D19 in REP-20261020-002):
- piani e prezzi;
- fornitore di pagamento e fatturazione;
- termini di vendita e GDPR;
- identità dell'installatore;
- lettura della planimetria;
- rapporto con REQ-09/10;
- importazione del formato originale;
- revisione dell'italiano;
- Google Play Billing, DA VERIFICARE (ISSUE-048);
- compatibilità del modello a pagamento con la GPL-3.0.

## Conseguenze

- **Comportamento.**
  - Nuova ultima pagina del launcher, spostabile.
  - Sezione «Casa 3D» in Sistema.
  - Editor riservato all'installatore.
  - Una pagina in più nella vista pagine: un'immagine statica, da misurare per ISSUE-062.
- **API e dati.**
  - Nuove tabelle in `tunet.db`, che entrano nelle copie a freddo.
  - Primo controllo di ruolo lato server.
  - Nuova variabile `ACASYSTEM_PAYMENTS`.
  - Primo modello di diritti (REQ-07).
  - Nessuna modifica a proxy o CSP. La CSP non blocca chiamate esterne, quindi l'assenza di rete verso terzi si prova con grep e misura di rete.
- **Dipendenze e licenze.**
  - lit e three a versione esatta, solo nel workspace.
  - `NOTICE` distribuito.
  - Nuove voci in `compliance.md` dopo C-13.
- **Prestazioni.**
  - JS aggiuntivo stimato 1,1-1,3 MB per la vista e circa 0,85 MB per l'editor, sempre lazy (stima).
  - Il chunk `index` non cresce.
  - Il codice caricato resta in memoria fino al ricaricamento.
  - Rischio alto sul Tab M11 fino a T1/T5.
- **Manutenzione.** Correzioni di geometria, compatibilità e sicurezza diventano nostre.
- **Limiti.** Nessuna misura, nessuna prova a runtime, nessun fornitore di pagamento.

## Accettazione (2026-10-20)

Risposta dell'utente alla bozza:

> «approvo la bozza, procedi con la misura della demo sul tablet»
> - quali funzioni Pro servono davvero: «pensiamoci dopo, iniziamo a integrare e poi vedo col capo»
> - piani e prezzi: nessuna risposta
> - chi può vedere la planimetria: nessuna risposta
> - se l'editor serve anche su PC: «l'app deve essere eseguibile da ogni tipo di dispositivo»

**Cosa si ricava:**
- **Accettate le scelte consigliate della bozza** per le decisioni tecniche:
  - pacchetto separato con build propria;
  - copia fissata a 1383a14 con registro delle patch;
  - prefisso tecnico `fp3d` mantenuto;
  - persistenza nel backend Acasystem;
  - qualità Light/Medium/High;
  - pagina `casa3d` ultima nel launcher e spostabile;
  - diritti gestiti da Acasystem con `ACASYSTEM_PAYMENTS`.
- **Restano aperte, da decidere con il capo prima delle tappe che le usano:**
  - quali funzioni Pro attivare, e il rapporto con l'autore;
  - piani, prezzi e fornitore di pagamento;
  - chi può vedere la planimetria;
  - le questioni di licenza GPL-3.0 e Play Store sul modello a pagamento.
- **Le funzioni Pro si integrano con il resto del codice,** ma non si attivano in vendita (`live`) senza la decisione con il capo.
- **L'editor e la vista devono funzionare su ogni tipo di dispositivo** (PC, tablet, telefono), non solo sul Tab M11: le tappe dell'editor e il collaudo vanno estesi di conseguenza.
- **Le versioni esatte delle dipendenze** (lit, three) sono autorizzate per l'uso previsto dalla bozza. Andranno registrate in REP-20261020-002 al momento dell'installazione.
- **Annotazione del 2026-10-21 (D16 confermata).** L'utente ha scritto: «conferma /casa3d/ e nascondi la pagina di prova, poi procedi con T6». D16 è quindi decisa: il servizio sta sotto `/casa3d/` (opzione (a)), con nomi dei file con l'impronta, `immutable` e 404 esplicito. La frase **non** copre l'elenco delle esclusioni del controllo del marchio (`upstream/`, `upstream.sha256`, `UPSTREAM.md`, `PATCHES.md`, `tools/rinomina.mjs`, oltre a `NOTICE` e alle licenze): resta da approvare ([ISSUE-089](../project-status.md#issue-089)). La rotta di prova `#/casa3d-prova` è tolta dalla build di produzione ([ISSUE-091](../project-status.md#issue-091)).

**Annotazione 2026-10-21 (superata in parte da [ADR-0017](ADR-0017-casa-3d-schermo-intero-editor-quadretti.md)):** l'utente ha accettato il piano rivisto REP-20261021-002 («ok alle proposte, approvo e procedi con G1-G2 […]», poi «parti» per la tappa R1). Restano validi qualità, persistenza T6, diritti, tema e aggiornabilità. Sono superati: la sezione 2 (la casa è una rotta a schermo intero fuori dal pager, la pagina del launcher diventa un'anteprima ferma, «Esplora» è una voce della barra laterale e non un tocco sul canvas); l'«Editor dell'installatore» (editor nostro a quadretti da 50 cm al posto di quello copiato, rimosso solo dopo R5b) con la divergenza accettata della sezione 9; la scrittura riservata all'installatore (sezione 4 e annotazione T6 su D13): scrive chiunque, anche i clienti (ISSUE-102). Il testo storico sopra non è modificato.

## Verifiche e revisione

**Esiti disponibili:**
- solo lettura statica: letture A-D, quattro controlli puntuali via curl nella sintesi;
- critica di completezza del 2026-10-20 con letture in sola lettura di Acasystem e di sei file a monte (elenco in REP-20261020-002).

**Non eseguiti:** misure, build, test, prove a runtime.

**Da verificare nelle tappe di REP-20261020-002:**
- misura della demo sul Tab M11, con `deviceMemory`, `hardwareConcurrency` e GPU;
- build con grep del marchio uguale a zero, NOTICE escluso;
- adattatore;
- gesti e vista pagine senza renderer;
- TalkBack e testo al 125/150% sul guscio;
- Light misurata, Medium e High selezionabili senza blocchi;
- perdita del contesto;
- persistenza con 403/409 e immagini rifiutate;
- conferme;
- diritti con `ACASYSTEM_PAYMENTS` e rete verso terzi uguale a zero;
- contrasti;
- editor su tablet;
- collaudo finale con PSS del processo.

**Revisione da aprire se:**
- T1 rende Light insufficiente;
- cambia la decisione sul Pro o sull'identità dell'installatore;
- arriva un fornitore di pagamento o l'app va sul Play Store;
- REQ-17 richiede più case per istanza;
- REQ-07 viene progettato in generale;
- il registro delle patch supera la soglia oltre cui conviene dichiarare la divergenza totale.

**Annotazione 2026-10-20 (T5, qualità e contesto):** la realizzazione della sezione 5 si scosta in tre punti dal testo, senza una decisione umana nuova (da confermare, [REP-20261020-002](../reports/REP-20261020-002-casa-3d-piano.md), «T5 — Qualità e contesto»):
- **Rilevamento iniziale.** Nessun livello è scelto dal browser: si parte da Light su ogni dispositivo (esito di T1), anche dove ADR-0014 diceva Medium. `deviceMemory` e processori fanno solo chiedere conferma prima di High. Il ripiego su «Elenco stanze» c'è per WebGL assente (il renderer non si crea) e non per il solo renderer software (`failIfMajorPerformanceCaveat`), che avrebbe tolto il 3D a ogni prova su PC senza GPU.
- **Perdita del contesto.** L'anteprima statica scatta alla perdita che segue di meno di 10 minuti una vista rifatta in Light, alla quinta perdita nei 10 minuti o se la vista non si può creare; una perdita che il browser restituisce in pochi secondi non la fa scattare, perché il «Fatto quando» di T5 vuole tre perdite con ripristino. Il ripristino non ricostruisce la geometria (three.js ricarica da solo le risorse). Il ripiego a Light dopo 5 s è come scritto.
- **Fotogrammi in Light.** Distanza minima di 24 ms fra due disegni mentre qualcosa si muove (circa 30 fps a 60 Hz, 45 a 90 Hz), invece del tetto di 30 fps: la costante `drawGapMs` di `viewer/quality.ts`. Le altre leve della tabella (distanza di disegno, niente esterni, altri piani come contorno, meno chiamate di disegno, rapporto pixel 0,85) non sono fatte: serve la misura sul Tab M11.

**Rettifica 2026-10-20 (dopo la revisione di T5):** la distanza minima fra i disegni vale ora solo su schermi da 75 Hz in su (frequenza misurata con i callback dello schermo); a 60 Hz si disegna a ogni fotogramma, perché 24 ms su 16,7 ms lasciava esattamente 30 fps. La costante è 21 ms sui tempi dei callback (i 24 ms di prima meno 3 ms di anticipo). Resta uno scostamento da confermare, come gli altri due.

**Annotazione 2026-10-21 (T6, persistenza):** la realizzazione della sezione 4 ([REP-20261020-002](../reports/REP-20261020-002-casa-3d-piano.md), «T6 — Persistenza») si scosta in cinque punti dal testo, senza una decisione umana nuova:
- **Ruolo di scrittura (D13).** D13 non ha un'opzione consigliata e l'accettazione del 2026-10-20 non la copre. T6 usa come «installatore» l'utente che Home Assistant, interrogato dal server con il suo token, dichiara amministratore o proprietario (`is_admin` o `is_owner`): è l'ultima possibilità elencata in D13 («ogni admin HA può cambiare il piano») e non distingue l'installatore dal cliente. Il ruolo non viene mai dal client (403 altrimenti). Il punto da cambiare per un'altra scelta è solo `backend/src/helpers/casa3dRole.ts`. Dietro l'ingress del Supervisor l'utente fidato ha `is_admin: false`, quindi nessuno scrive.
- **Lettura.** Ogni utente autenticato legge piano e immagini (D8 aperta, [ISSUE-085](../project-status.md#issue-085)); cronologia, esportazione e importazione sono solo dell'installatore.
- **Immagini.** Il server verifica firma e struttura (PNG con CRC dei blocchi, segmenti JPEG, blocchi RIFF di WebP non animato), dimensioni fino a 2048 px per lato e fine regolare del file; rifiuta SVG, markup, immagine troncata o danneggiata e oltre 6 MB. **Non decodifica i pixel né ricodifica l'immagine** (il testo sopra lo prevedeva): non c'è una libreria di immagini tra le dipendenze e aggiungerla richiede una autorizzazione ([ISSUE-104](../project-status.md#issue-104)).
- **Cifratura.** Il piano segue `TUNET_ENCRYPTION_MODE` come le impostazioni; le immagini (BLOB) non sono cifrate (D8 aperta).
- **Cronologia.** Venti punti di ripristino, al più uno ogni 600 s sul salvataggio, più uno prima di ogni ripristino e di ogni importazione e quelli chiesti a mano. L'importazione non accetta pacchetti di mobili (nessuna verifica della firma sul server): li salta, in attesa dei diritti di T8.
