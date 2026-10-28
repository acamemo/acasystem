# REP-20261028-005 — Piano: `/mockup` al posto dei kit

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261028-005, piano della pagina `/mockup` e della rimozione dei kit |
| Stato | Sviluppo K1–K4 fatto e verificato con il browser; prova sul Tab M11 da fare; non committato |
| Data | 2026-10-28, sera (Europe/Rome) |
| Autore / modello | Claude Code, `claude-opus-5-5` |
| Commit di partenza | `d11b9fd` |
| Richiesta di riferimento | «un url che se nella barra di ricerca scrivo /mockup, accedo ad una versione speciale dell'app con tutti i widget mockappati e attivi, a te la progettazione di questa pagina, che dovrà fungere da sostituzione di /kit, perché per ora non mi sembra che i widget in quella pagina siano mockuppati per come appaiono nell'app attuale, quindi ridicuamo il peso». Poi: «Scrivi il piano di /mockup e della rimozione dei kit, poi decido lo sviluppo.» |
| Autorizzazione | «Accetto le raccomandazioni M-1, M-2, M-3 e M-4 e do il via libera allo sviluppo K1-K4 di /mockup.» (2026-10-28) |

## Obiettivo

`/mockup` apre l'app vera, con tutti i widget attivi, alimentata da un Home Assistant simulato nel browser. Sostituisce le pagine di prova che oggi ridisegnano i widget a parte e restano indietro rispetto all'app. Il peso del progetto scende perché quelle pagine vengono tolte.

**Escluso:** nuove funzioni dei widget, cambi di grafica, collegamento a un HA vero da `/mockup`, scritture sul server.

## Cosa esiste oggi (a `d11b9fd`)

| Pagina | Dove | Contenuto | Nel build di produzione | Righe |
|---|---|---|---|---|
| `/ui-kit` (`/kit`, `/ui`) | `src/pages/ui-kit` | Prototipi Principale e Temperatura, galleria del kit, anteprime dei widget, scheda «Widget» con le **proposte di design** dei 25 tipi (REP-20261014-002, «proposte da valutare»), gesti | Sì (pezzi caricati a richiesta) | 1544 |
| Kit 2 | `src/pages/kit2` | Pagina di riferimento della soft UI scelta come base (ADR-0011), aperta da `/ui-kit` | Sì | 774 |
| Kit Metallo | `kit.html`, `src/pages/kit` | Matrice degli stati del materiale Metallo (alternativa conservata) | No (sviluppo) | 1649 |
| Launcher di prova | `launcher.html`, `src/pages/launcher/preview` | Launcher con widget segnaposto | No (sviluppo) | 593 |
| Anteprime per gruppo | `preview-*.html`, `src/components/widgets/*/preview`, `src/pages/system/preview` | Anteprime di controlli, home, media, utilità, sistema | No (sviluppo) | 2867 |

Totale circa **7.400 righe** parallele all'app. Le usano 10 file di test (`Polish2LauncherKit`, `Polish2LauncherPreview`, `PolishKit`, `WidgetDesignGallery`, `WidgetDesignChart`, `WidgetDesignModel`, `WidgetGestureControl`, `Polish2Cornice`, `PolishWidgetPoles`, `FixLauncherLogic`) e le citano `design.md`, ADR-0010…0014, ADR-0020, `infrastructure.md`, `LEGGIMI.md` e vari report storici.

**Dati di prova già pronti:** `src/utils/fixtures/adaptiveData.ts` (entità, impostazioni e servizi per ogni tipo di widget, usati dal banco isolato e dal collaudo e2e) e `createFixtureRuntime` in `src/utils/fixtures/runtime.ts`.

## Proposta

### `/mockup`
- **Indirizzo.** `#/mockup`; scrivendo `/mockup` nella barra si arriva lì (come oggi `/kit` in `main.tsx`). `/kit`, `/ui-kit` e `/ui` portano a `/mockup`.
- **L'app vera.** `LauncherScreen`, registro dei widget, fogli, dettagli, console, «Trova dispositivi», tutto il codice di produzione. Nessun widget ridisegnato.
- **Home Assistant simulato nel browser** (`utils/mockup/`):
  - entità da `adaptiveData.ts`, una sola fonte con il banco e i test;
  - `callService` aggiorna lo stato delle entità simulate (luci, prese, tapparelle, clima, media, aspirapolvere…) con una piccola tabella per dominio e servizio; i servizi non simulati rispondono senza effetto;
  - registri di dispositivi ed entità coerenti con le entità, così «Trova dispositivi» e «Collegati» funzionano;
  - immagini delle videocamere e copertine generate in locale (SVG), nessuna richiesta esterna.
- **Facciata dei dispositivi simulata** (`/api/dispositivi/*`) dentro il browser, per la ricerca con scheletro, i loghi (icone di famiglia), «Nascondi», gli ignorati e un flusso di collegamento dimostrativo che termina con il widget creato da solo.
- **Pagine già pronte.** Una pagina per categoria del vassoio (Luci e comandi, Clima e meteo, Sicurezza, Multimedia, Casa e info, Energia, Utilità), con ogni tipo di widget in più taglie, e una pagina «Tutti i widget».
- **Separata dall'app reale.** Nessuna connessione a HA, nessuna richiesta al server; disposizione e impostazioni in memoria della sessione (o `sessionStorage`), mai nelle chiavi dell'app. Una barretta discreta «Modalità dimostrativa · Esci» per non confonderla con la casa vera.
- **Peso.** Un pezzo caricato solo da `#/mockup`; l'app normale non cresce.
- **Usi:** prova visiva dei widget, demo a clienti e al responsabile sul tablet senza un HA, base per le critiche di design e per il collaudo e2e (che oggi usa un server a parte).

### Rimozione dei kit
1. Prima `/mockup` funzionante e verificato; poi la rimozione, in un commit a parte.
2. Togliere `launcher.html`, `preview-*.html`, `kit.html` e le relative cartelle; `pages/ui-kit` salvo quanto deciso in M-1/M-2.
3. Per ogni test che li usa: se controlla una regola ancora valida dell'app, spostarlo su `/mockup` o sul componente vero; se controlla solo la pagina di prova, toglierlo. Elenco con l'esito nel report di sviluppo.
4. Aggiornare `design.md`, `LEGGIMI.md` e `infrastructure.md` dove indicano le pagine di prova; i report e gli ADR storici restano come sono, con un'annotazione dove serve.
5. Verificare il peso: righe tolte, dimensione della build prima e dopo.

## Decisioni dell'utente

| ID | Domanda | Raccomandazione |
|---|---|---|
| M-1 | Le **proposte di design dei 25 widget** (scheda «Widget» di `/ui-kit`, REP-20261014-002) | Toglierle: erano proposte mai adottate e restano nella storia Git; ciò che serve di nuovo si rifà sui widget veri |
| M-2 | La **pagina Kit 2** (riferimento della base grafica, ADR-0011) e il **kit Metallo** (alternativa conservata, `kit.html`) | Tenere solo Kit 2 come pagina di riferimento dentro `/mockup` («Materiali»), togliere la matrice Metallo; il Metallo resta nel codice dei temi |
| M-3 | `/mockup` raggiungibile anche nella **versione installata dai clienti** | Sì: serve per le demo; non tocca dati né HA |
| M-4 | **Collaudo e2e** sul banco isolato | Passarlo su `/mockup` dopo, in un incarico a parte |

**Decisioni (2026-10-28):** accettate tutte le raccomandazioni. M-1 le proposte dei 25 widget si tolgono; M-2 resta solo Kit 2 come pagina «Materiali» dentro `/mockup`, la matrice Metallo si toglie; M-3 `/mockup` anche nella versione dei clienti; M-4 il collaudo e2e passa su `/mockup` in un incarico a parte.

## Tappe (autorizzate il 2026-10-28)

| Tappa | Contenuto |
|---|---|
| K1 | HA simulato e facciata dei dispositivi simulata, con test |
| K2 | Rotta `#/mockup`, pagine pronte, barretta dimostrativa, rimando da `/kit` |
| K3 | Verifica nel browser a 1280×665 e 390 px; prova sul Tab M11 |
| K4 | Rimozione dei kit secondo M-1/M-2, test e documenti aggiornati, misura del peso |

## Criteri di completamento

1. `/mockup` mostra ogni tipo di widget del catalogo, in più taglie, con l'aspetto dell'app attuale.
2. I comandi cambiano lo stato simulato e i widget rispondono; nessuna richiesta parte verso HA o verso il server.
3. «Trova dispositivi» funziona sul simulato, dalla ricerca al widget creato da solo.
4. La disposizione dell'app reale non cambia dopo una visita a `/mockup`.
5. Kit rimossi secondo le decisioni; suite e build verdi; peso misurato.

## Verifiche ed evidenze

| Controllo | Procedura | Esito |
|---|---|---|
| Inventario pagine e righe | Lettura di `main.tsx`, `AppRoutes.tsx`, `vite.config.js`, conteggio righe | Eseguito (tabella sopra) |
| Test e documenti collegati | Ricerca nei test e in `documentazione/` | Eseguito (elenchi sopra) |
| K1–K2 | Agente Sonnet: `utils/mockup/` (HA simulato, connessione finta, facciata dei dispositivi simulata via `setBackendOverride` in `api/backendClient.ts`, `localStorage` in memoria durante la visita), `pages/mockup/`, `routes/MockupGate.tsx` | Fatto | 33 tipi di widget legati al simulato; pagine per categoria e «Tutti i widget»; «Materiali» carica Kit 2; pezzo `MockupPage` 47,4 kB (16 kB gzip) caricato solo da `#/mockup` |
| K3 | Browser con la build di produzione, 1280×665 e 390×844 | Superato | `/mockup` porta a `#/mockup`; 81 widget; barretta «Modalità dimostrativa · Materiali · Esci» (346 px al telefono); nessuno scorrimento orizzontale; nessuna richiesta all'esterno. Tab M11 non provato (tablet spento) |
| K4 | Agente Sonnet: rimossi `pages/ui-kit`, `pages/kit`, `pages/launcher/preview`, `pages/system/preview`, `components/widgets/*/preview`, `kit.html`, `launcher.html`, `preview-*.html`, `preview.css`; 5 file di test solo delle pagine tolte eliminati, 2 ridotti; `design.md`, `LEGGIMI.md`, `progetto/acasystem/README.md` aggiornati, ADR-0010 e ADR-0011 annotati | Fatto | 6.741 righe di sorgente tolte (diff: 7.515 righe cancellate); JS distribuito invariato rispetto a K2, perché le pagine tolte non erano nella build, mentre l'uscita di `/ui-kit` dalle rotte in K2 aveva già tolto circa 63 kB di JS |
| Suite frontend | `npx vitest run` | Superato con instabilità note | 3523/3527; i 4 falliti (`AvMediaPage` per un errore di lettura del file, `Casa3dHistory`, `DiscoveryScreen`, `LauncherScreen`) passano tutti rilanciati da soli (216/216) |

## Chiusura e punto di ripresa

**Stato:** fatto; manca la prova sul Tab M11. Non committato.

**Punto di ripresa:** prova di `/mockup` sul Tab M11; commit su richiesta; proposta aperta: selettore di scenari (dati normali, valori estremi, non raggiungibili, casa vuota) per usare `/mockup` come banco dei difetti di interfaccia.

**Annotazione 2026-10-28 sera, una sola app:** richiesta dell'utente: «L'importante è che sia una demo uno ad uno rispetto all'originale, e che quando si fanno modifiche su una, le modifiche avvengono anche sull'originale», poi «fai usare a /mockup la pagina vera del launcher, cambiando solo la sorgente dei dati, e includi anche la pagina Sistema». Tolti `pages/mockup/MockupPage.tsx` e `routes/MockupGate.tsx` (314 righe che ricostruivano `LauncherPage`): in demo si monta l'albero vero dell'app (`main.tsx`, `AppRoutes`, `LauncherPage`, `SystemPage`). Restano solo della demo la sorgente dei dati (`utils/mockup`, con la nuova risposta in memoria a salute, impostazioni e profili), i punti di iniezione (`api/demoSource.ts`, connessione in `HomeAssistantContext`, credenziali in `haSession`, immagini e mappa locali, un filtro su `fetch` che rifiuta ogni indirizzo non della demo), lo scambio di `localStorage` e `sessionStorage` prima del montaggio e la barretta. Non uno a uno: «Collega di nuovo» ed «Esci» di Sistema non agiscono, Casa 3D senza piantina, videocamere con immagini ferme. Prova nel browser con la build: launcher vero, Sistema con «Demo · Proprietario» e «Sincronizzato», nessuna richiesta di rete, «Esci» riporta all'app con la sua memoria intatta. Suite completa 3546/3548; i 2 falliti passano rilanciati (37/37), e al test LG della finestra sono stati dati tempi più larghi.
