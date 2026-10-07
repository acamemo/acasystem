# REP-20261007-001 — Polish e layout del launcher, «Principale» come schermata di base

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261007-001 |
| Stato | Completato e verificato; banco su localhost:3002 aggiornato a `aca-system:0.2` |
| Data | 2026-10-07, Europe/Rome |
| Autore / modello | Claude Code, Opus 5.5 (`claude-opus-5-5`), orchestratore; subagenti general-purpose per valutazioni e corsie |
| Commit di partenza | e192121, con le modifiche non committate successive; istantanea `usa-come-git/v012` |
| Richiesta di riferimento | Chat del 2026-10-07: «devi fare un check sul kit di design, perché questo è il risultato, una buona base però va impiegato /impeccable polish e /impeccable layout per sistemare le interfacce e rendere "Principale" come schermata di base con dei quadratini al cui interno c'è il + da cui si possono aggiungere i widget». Allegate tre schermate del banco: copertina, Principale, modalità modifica. |
| Autorizzazione | Richiesta umana sopra. Inclusi: controllo del kit Metallo sulle schermate reali; polish e layout delle interfacce del launcher (copertina, pagine di widget, modalità modifica, barra di stato, indicatore); «Principale» come pagina iniziale; celle libere con «+» che aggiungono un widget in quella posizione. Esclusi: nuove dipendenze, commit, modifiche al banco Docker senza nuova richiesta, nuove griglie per classe di dispositivo (proposta all'utente). |

## Obiettivo e perimetro

Rendere la pagina «Principale» la schermata di base del launcher. Ogni cella libera delle pagine di widget mostra un quadratino con «+» che apre l'aggiunta e colloca il widget in quella cella. Insieme, si applica il polish e il layout di impeccable alle superfici del launcher, allineandole al kit Metallo (ADR-0006/0007, `design.md`, sezione «Sistema Metallo»).

Restano valide le decisioni precedenti: tema metallico chiaro unico, accenti arancione/blu/rosso, nessun maiuscolo né tracking né grassetto, testo inciso e raggio delle card del kit.

## Criteri di completamento

- All'avvio il launcher mostra «Principale»; la copertina resta raggiungibile con lo swipe; «Principale» resta nel pager anche se vuota.
- Le celle libere di ogni pagina di widget mostrano un quadratino con «+»:
  - il tocco apre l'aggiunta;
  - il widget va nella cella toccata, o nella più vicina se non entra;
  - c'è un'alternativa da tastiera.
- La griglia non cambia dimensione né posizione entrando e uscendo dalla modifica.
- I rilievi di layout e kit delle tre valutazioni isolate sono corretti o motivati come eccezioni.
- Typecheck, lint, tipografia, colori, suite, build e anteprime a 1280×800, 1536×736, 1920×920, 390×844 e 844×390 sono verdi.

## Avanzamento e modifiche

**Valutazioni isolate** (workflow `wf_51225965-5ce`, sola lettura):
- **A, layout:** 21 rilievi.
- **B, pre-scansione meccanica:** 13 rilievi. Il rilevatore impeccable sui sorgenti non applica regole di layout.
- **C, kit e polish:** 26 rilievi.

Scoperta di A: le schermate dell'utente «1920×920» corrispondono a un viewport CSS di 1536×736 con scala al 125%.

Rilievi concordi:
- le celle libere non sono indirizzabili;
- l'aggiunta non conosce la cella;
- l'avvio è sulla copertina;
- una «Principale» vuota sparisce dal pager;
- la griglia salta entrando in modifica;
- la × copre il widget;
- i pozzetti sono fuori dal kit;
- la barra di modifica è incoerente;
- l'indicatore con due pagine sembra un interruttore;
- l'alone dell'orologio è gonfiato;
- manca una scala di spaziature.

**Token condivisi** aggiunti dall'orchestratore prima delle corsie: `--aca-space-1…7` (base 4 px), `--aca-gutter`, `--aca-control-height` (44 px).

**Primo giro** (workflow `wf_48d063b2-3a0`, quattro corsie a proprietà esclusiva più due revisori indipendenti):
- **Launcher** (`templates/launcher`, `utils/launcher`, controller):
  - celle libere come pulsanti con «+» del kit, in vista e in modifica, solo sulle celle libere; una fermata di tabulazione con le frecce; nome «Aggiungi un widget: colonna X, riga Y»;
  - aggiunta ancorata alla cella toccata (`openAddWidget(pageId, at)` → `placeWidget(…, at)` → `placeWidgetInLayout`);
  - avvio sempre su «Principale», che resta nel pager anche vuota; rimossi la pagina ricordata e il componente EmptyPage;
  - raggio unico `--aca-radius-cell`, strati locali con nome, spazio per ombre e ×.
- **Cornice** (`system/edit`, `app-shell`, `status-bar`, `page-indicator`):
  - piè di pagina a fascia costante: la griglia non cambia tra vista e modifica;
  - barra di modifica a 44 px: «Fine» unica azione arancione, «Aggiungi widget», «Pagina» e «Nuova pagina» metallici, «Mostra copertina»;
  - × piccola centrata sullo spigolo;
  - barra di stato ad altezza fissa con l'ora riservata anche in copertina;
  - pallino degli aggiornamenti blu;
  - chip con sfumatura;
  - indicatore distinto da un interruttore (tacche e passi da 44 px);
  - conferma «Rimuovi» con la variante danger.
- **Kit:**
  - variante `danger` del Button (inchiostro rosso sul metallo, tutti gli stati);
  - copertina: pozzetto dell'orologio con le ombre del kit e orologio allineato al foglio; data grande arancione (`--aca-orange-ink-large`); giorno della settimana centrato come in UI-008; disposizione orizzontale sul telefono in orizzontale; misure che crescono sugli schermi larghi.
- **Widget:** nei controlli grandi senza comando, nome in alto e valore ancorato in basso.

**Secondo giro** (workflow `wf_be326c9f-a56`, due corsie più due revisori):
- con la cella la taglia scelta viene prima della riduzione (R-01);
- focus corretto dopo un'aggiunta che apre le impostazioni (R-02);
- pagina corrente obsoleta riportata alla base (R-03);
- «+» dopo i widget nel DOM (V-03/R-04);
- pozzetti senza «+» sulle celle riservate dai widget nascosti (V-04);
- pozzetto tenue promosso a modificatore del kit `aca-m--well-soft`, con matrice e README (R-05);
- celle più quiete, con contrasto del bordo 1,52:1 e «+» a circa 7,5:1;
- barra di modifica che non si sovrappone all'indicatore (V-01);
- fascia a una riga sui telefoni orizzontali larghi (V-02, parziale);
- etichetta dell'indicatore con minimo leggibile (V-05);
- copertina in modifica sul telefono (V-06);
- strati con nome in `edit.css` e scala nell'indicatore (R-05/R-06).

**Integrazione dell'orchestratore:**
- test DES-8 dell'indicatore aggiornati ai token;
- badge «Nascosto» sulla scala;
- distanza dalla cella toccata misurata dal rettangolo e non dal suo angolo (C2-03), con un test che fallisce senza la correzione;
- nomi lunghi che vanno a capo con il trattino (`hyphens: auto`) invece di spezzarsi a metà parola;
- anteprima che legge le opzioni al montaggio (test stabile);
- etichetta breve dell'interruttore «Mostra» (V2-05);
- documentazione: `design.md` (schermata di base, celle «+», cornice, token), README e2e, annotazione in REP-20261006-001.

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Valutazioni isolate | Workflow di tre valutatori, Playwright col Chromium locale | Eseguito | Risultati nello scratchpad di sessione (`assess-result.json`, screenshot in `assess/`). |
| Revisione visiva indipendente, due giri | Playwright a 1280×800, 1536×736, 1920×920, 390×844, 844×390, 375×667 e 360×740; caso reale (Principale con un 2×2), pagina vuota, 8 e 12 pagine, movimento ridotto | Superato con residui | Avvio su Principale; «+» solo sulle celle libere; widget nella cella toccata; griglia identica tra vista e modifica in tutte le viewport; × intera; squint test: il widget prevale; tastiera e focus dopo l'aggiunta; 0 errori in console. Residui sotto. |
| Statici | `tsc -p tsconfig.strict.json`, `eslint src`, `lint-typography`, `lint-theme-colors` | Superato | 0 errori; tipografia 0 violazioni (386 file), colori 0 (275 file). |
| Suite frontend completa | `npx vitest run` | Superato | 113 file, 1281/1281. |
| Prova di mutazione C2-03 | Misura della distanza riportata all'angolo | Superato | Il nuovo test fallisce senza la correzione e passa con la correzione. |
| Build e budget | `npm run build`, `check-bundle-size.mjs` | Superato | index 677,1/900 KB, vendor nei limiti. |
| Immagine Docker | `docker build -t aca-system:0.2`; container temporaneo sulla porta 3012 | Superato | health ok, root 200, `lang="it"`, titolo «Acasystem». Container rimosso. |
| Banco localhost:3002 | Su richiesta dell'utente («aggiorna il banco»): `docker compose stop`, copia a freddo del volume, `image: aca-system:0.2` in `compose.tunet.yaml`, `docker compose up -d --no-build` | Superato | Codice identico a quello dell'immagine (nessun file più recente della build). Copia `backup/banco/tunet-data-20261007-pre-0.2-freddo.tgz` (database, WAL, SHM). Container `healthy`, `/api/health` ok, pagina principale 200, `lang="it"`, titolo «Acasystem», bundle `index-DBB0ZHU1.js` della build verificata. Ripristino: `image: aca-system:0.1` e lo stesso comando. Il launcher con le entità reali va visto dall'utente con la propria sessione HA. |

## Controllo del diff e decisioni

- Il diff riguarda il launcher, la cornice dell'OS, il kit (variante danger, pozzetto tenue, token), la copertina e il contenuto dei widget dei controlli. Nessuna dipendenza nuova, nessun commit, banco invariato.
- Scelte esecutive dell'orchestratore, nel perimetro della richiesta:
  - «Principale» apre sempre all'avvio e la pagina ricordata non decide più;
  - «+» su ogni pagina di widget, in vista e in modifica;
  - fascia del piè di pagina costante;
  - un'unica azione arancione per stato.
- Decisioni lasciate all'utente:
  - griglia più larga per gli schermi oltre ~16:9 (sul suo monitor 1536×736 la griglia 8×5 lascia due bande vuote ai lati; servirebbe una classe di griglia nuova, con la migrazione delle posizioni);
  - righe in più sul telefono (per esempio 4×7);
  - ritorno automatico a Principale dopo inattività (ADR-0007 l'aveva escluso).
- Residui registrati in ISSUE-028:
  - indicatore e barra di modifica con 9–13 pagine su telefoni stretti (V2-01/V2-02);
  - seconda riga della fascia vuota in vista sui telefoni verticali (V-02);
  - annuncio della posizione quando il widget non entra nella cella toccata (V2-06).

## Chiusura e punto di ripresa

Completato e verificato. Banco su `aca-system:0.2` dal 2026-10-07, su richiesta dell'utente. Istantanea del codice `usa-come-git/v013`; il compose del banco punta ora a `aca-system:0.2`. Nessun incarico applicativo resta aperto. Prossimo passo: il parere dell'ufficio sull'interfaccia, poi le modifiche indicate dall'utente.
