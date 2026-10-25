# Pagine reali per categoria

| Campo | Valore |
|---|---|
| ID | REP-20261014-006 |
| Stato | Completato |
| Data | 2026-10-14 |
| Autore | Codex |
| Commit di partenza | 7298d4df0d33bc92123517776d9ebc7c12ecefa6 |
| Richiesta | «Inizia a fare le pagine per categoria con tutti i widget»; conferma esplicita «Pagine reali del launcher». |

## Obiettivo e perimetro

Scelta tra pagina vuota e categorie già popolate, usando le normali griglie del launcher. Widget inizialmente da associare, tap per scegliere dispositivi, comandi bloccati prima del collegamento, modifica e rimozione esistenti. Riutilizzare i componenti operativi e quelli di Copertina senza ridisegnarli. Nessuna migrazione delle pagine esistenti, commit, deploy o modifica Docker. Preservare il diff preesistente e i concept simulati del kit.

## Criteri di completamento

Categorie complete e pagine persistenti, identità stabile dei widget durante configurazione, nessun comando HA dai widget non configurati. Griglie e continuazioni responsive, aggiunta/rimozione/riordino esistenti conservati. Test pertinenti, statici, build e browser senza GPU a tre larghezze; massimo quattro worker, browser separato dai test.

## Avanzamento e modifiche

«Nuova pagina» offre griglia vuota, sette categorie e «Tutte le categorie». Le pagine sono del normale tipo `widgets`, senza nuove schermate speciali. Catalogo completo: Luci e comandi 5, Clima e meteo 3, Sicurezza 3, Multimedia 4, Casa e info 7, Energia 2, Utilità 1.

`categoryPages.ts` genera ID nativi stabili e impostazioni prive di collegamenti. Il controller salva disposizione e impostazioni delle nuove pagine usando il sistema esistente di continuazioni. Creazione multipla nello stesso evento conservata; nessuna sostituzione di pagine esistenti.

`CategoryWidgetContent` usa lo stesso componente operativo prima/dopo associazione, anche nelle pile. Prima del collegamento, contenuto inert, connessione assente e chiamate servizio neutralizzate; entità locali marcate indisponibili, senza valori fisici inventati. Il tap apre le impostazioni. Luce, ventilatore, aspirapolvere e tagliaerba mantengono l'ID della disposizione ma ricevono l'entità reale per i comandi e i dettagli. Nomi e icone personalizzati conservati sul widget.

`CategoryBindingSection` sceglie un'entità coerente con il tipo; per Stanza riusa RoomPicker e associa l'area con le sue entità. Prima dell'associazione le opzioni applicative restano nascoste; dopo, sono disponibili le impostazioni operative esistenti. Orologio, Data, Meteo di casa e Separatore hanno già un comportamento locale e non richiedono una nuova entità HA per essere presenti: vengono riusati gli originali.

Questo incarico collega i componenti operativi esistenti: non converte i grafici e tutte le capacità simulate del kit in nuove API o nuovi comandi HA. La galleria adattiva dei report 004/005 rimane separata e conservata.

## Verifiche ed evidenze

| Controllo | Procedura realmente eseguita | Esito e limiti |
|---|---|---|
| Test | Vitest CategoryPages, LauncherController, LauncherScreen, SystemSheets, LauncherStacks; massimo quattro worker | 151 casi complessivamente superati: 131 nei tre file invariati dell'ultima suite e 20 nei due file rieseguiti dopo correzioni alle sole aspettative dei test. Prima suite: tre aspettative della vecchia creazione immediata aggiornate; ultima suite: nomi accessibili senza spazio in jsdom e chiave griglia dinamica corrette nei test. |
| Statici | npm run typecheck, lint, lint:theme-colors, lint:typography | Superati; zero violazioni dei colori su 313 file e della tipografia su 439 file. |
| Build | npm run build | Superata; warning preesistente hls >500 kB. |
| Formattazione/diff | Prettier sui file interessati, git diff --check, detector Impeccable | Superati; detector senza segnalazioni. Diff preesistente preservato. |
| Browser | backup/check-categorie-complete.cjs, Chromium software, contesti isolati a 390/1280/1920 | Tutte le sette categorie, 25 widget; una continuazione a 390 e nessuna alle altre larghezze; nessun errore pagina o fallback «Widget non disponibile», nessun overflow orizzontale della pagina. Associazione luce e ricaricamento verificati a tutte le larghezze. |
| Modifica | backup/check-categorie-modifica.cjs a 1280, browser separato dai test | Pressione lunga: luce da (1,0) a (1,1); Shift+freccia porta la larghezza da 1 a 2; Canc rimuove, Annulla ripristina. Movimento ridotto: animationName none. Primo tentativo misurava la pagina ancora in transizione: ripetuto dopo il suo assestamento. |
| HA fisico | Connessione e azioni su dispositivi reali | Non eseguite; browser con fixture, test con runtime controllato. RoomPicker riusato, area HA reale non selezionata nel browser di verifica. |

## Controllo del diff e decisioni

Nessuna modifica automatica alle pagine salvate; nuova scelta alla creazione. Primitive e griglie esistenti riusate (ADR-0004/0007), nessuna nuova dipendenza o tipo di pagina. Nessuna modifica ai concept, alla Copertina o al banco Docker. I grafici simulati non sono spacciati per dati HA.

## Chiusura e punto di ripresa

Intervento completato, nessun incarico attivo per queste pagine. Nel frontend di sviluppo: Modifica → Pagine → Nuova pagina → categoria oppure Tutte le categorie → Fine. Poi tap sul widget da associare. Sul banco :3002 il codice non è aggiornato; nessun commit o deploy. Da verificare sul banco autorizzato: associazioni HA reali, area della stanza, dispositivi di ogni categoria e permessi dell'impianto.

## Rettifica successiva — 2026-10-14

La successiva precisazione umana richiede tutte le categorie presenti di base. [REP-20261014-007](REP-20261014-007-categorie-iniziali.md) sostituisce la necessità di aggiungerle: vengono inizializzate automaticamente una sola volta; le rimozioni successive sono conservate. La scelta manuale sopra descritta resta facoltativa per nuove pagine.
