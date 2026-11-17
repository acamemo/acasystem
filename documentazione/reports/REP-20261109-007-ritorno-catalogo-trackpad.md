# Ritorno animato dal catalogo con trackpad

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261109-007 |
| Stato | Completato; correzione installata sul banco ACA0.9.52/r99 |
| Data | 2026-11-09, Europe/Rome |
| Autore / modello | Codex; nome esatto del modello non disponibile |
| Commit di partenza | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta di riferimento | «se io trascino, appare tutta la parte dei widget […] però poi non c'è l'animazione inversa che mi riporta indietro». Precisazione: «trackpad 2 dita dal punto basso del trackpad vado verso l'alto». Chat corrente dopo installazione .51. |
| Autorizzazione | Correggere l'ingresso inverso da trackpad nel ritorno già richiesto, continuando la consegna sul banco PC autorizzata nel messaggio precedente. Conservare account/profili; nessuna pubblicazione o ampliamento grafico. |

## Obiettivo e perimetro

La Home riconosce lo scroll di rotella/trackpad per aprire, mentre BottomDrawer gestisce la chiusura solo tramite PointerEvents di trascinamento diretto. Aggiungere lo scroll inverso nel catalogo, usando la stessa chiusura già esistente: pannello verso il basso e ricomparsa della Home sulla stessa pagina. Distinguere gesto fisico del trackpad e delta di scroll fornito dal browser: la direzione opposta a quella di apertura chiude.

Solo input wheel sul catalogo passivo, comprese intestazione e zone vuote. Scorrimento orizzontale, pinch/zoom, campi, controlli e veri scroller verticali conservano il comportamento. Non riscrivere durate, materiali, CSS, storia browser o motore di animazione. Non ampliare le aree di drag Pointer in questo incarico. Riferimenti [REQ-32](../funzionalita/product.md), [ADR-0048](../decisions/ADR-0048-catalogo-widget-tendina.md), [brief](../design/componenti/catalogo-widget.md).

Baseline .51/r99 installata e fonte1816/SHA42e16a77 verificata in [REP006](REP-20261109-006-banco-pc-gesti-tutte-pagine.md),620voci Git preesistenti da conservare. Checkpoint in `backup/rep064/`. La verifica precedente del ritorno touch non copriva l'ingresso wheel mancante: il riscontro umano estende il collaudo a questo percorso concreto.

## Criteri di completamento

- Negativo riprodotto sulla .51 con wheel inverso; positivo dopo la correzione.
- Ritorno animato con frame intermedi reali del pannello e opacità Home, stessa pagina finale e nessun widget aggiunto/comando attivato.
- Gesti orizzontali e scroll dei moduli non intercettati; nessuna chiusura multipla per inerzia, pinch o scroll del verso sbagliato.
- Test mirati, strict/build e verifica browser desktop; movimento ridotto e cleanup/reopen conservati.
- Correzione minima e fonte sigillata; aggiornamento del solo ACA con backup/dati/identità/HA/D1 conservati, pacchetti e frontend effettivo verificati. Nessuna prova hardware implicita.

## Avanzamento e modifiche

Diagnosi statica concorde: nessun handler wheel in BottomDrawer; CSS inverso e ritenzione200ms già presenti. Non è ancora dimostrato un difetto del motore di animazione. Le sole aree Pointer ai margini sono un'osservazione distinta: l'utente ha precisato l'uso del trackpad e non vengono ampliate qui.

Riprodotto sulla .51: wheel negativo nel catalogo non chiude, mentre lo swipe touch diretto continua a chiudere. Aggiunto un listener wheel nativo soltanto nella vista catalogo; accumula lo scroll inverso dominante per48px nello stesso burst240ms, normalizzando le unità. Richiama la stessa chiusura/history già presente. Asse X, Ctrl/Shift, pinch, campi/controlli, scroller verticali reali e drag attivo non vengono intercettati; inerzia e rerender non generano chiusure multiple.

Diff esatto: BottomDrawer e relativo test, nessun CSS/durata/pointer/PanelPresence/useWidgetScene modificato. Fonte1816/SHA256 `5259d73c2407b3fc66a0820062661fdebf1577d7a89f1c153143e9c1244974dd`,2delta/0estranei/0aggiunti o rimossi; manifesto e terminatori originali verificati. Review indipendente senza blocker in `wheel-cross-review-final.json`.

## Verifiche ed evidenze

| Controllo | Procedura | Esito | Limiti |
|---|---|---|---|
| Checkpoint | `node backup/rep064/checkpoint.mjs`: confronto fonte .51 e copie6file pertinenti | Superato |1816file/SHA42e16a77; prima delle modifiche |
| Regressioni mirate |4file test: BottomDrawer, WidgetScene, Pager e HomeCatalogScroll |36/36 superati | RED wheel0/1 e intermedio35/36 per mock matchMedia incompleto preservati; corretto solo il fixture prima del giro verde |
| Strict e UI | TypeScript frontend/UI e `npm run test:ui` | Superato,3UI test | Nessuna nuova dipendenza o regola grafica |
| Input e animazione | Browser privato con wheel e campionamento RAF |7/7 superati | Scheda/header/padding desktop, touch conservato; X/ctrl e modulo con overflow nativo non intercettati |
| Pacchetto .52 | Browser privato sull'estratto ZIP esatto, wheel negativo desktop1366 | Superato | RAF34campioni:5Yintermedi/5opacità Home intermedie; stessa pagina/layout,0comandi, finale Home usabile |
| Build e audit | Ricetta derivata congelata;7checksum,127web,117runtime,4hash/marker | Superato | Runtime/19APK identici alla .51; primo marker falso negativo per quoting corretto solo nel verificatore e conservato |
| Compose effettivo | `docker compose … config --quiet` sulla catena completa | Superato |16file, nessun segreto stampato; nessun parser YAML autonomo dichiarato |
| Backup e update | `Update-AcaTrackpadBank.ps1`, stop e ricreazione solo ACA | Superato | Backup206911byte estratto/integro;27tabelle immediate identiche |
| Conservazione successiva | Audit esatto e controllo ristretto cold→live separati |5/6 esatto, ristretto superato |26tabelle esatte,31righe token con campi fissi invariati, solo1seen_at monotono e0imprevisti |
| UI banco | Browser anonimo390, health/manifest/entry esatti .52 | Superato | Nessun login/credenziale/invio/mutazione/WS/errore; hardware e sessione umana distinti |

## Controllo del diff e decisioni

Confrontare col checkpoint, preservare il worktree storico. Il rimedio deve aggiungere il percorso input mancante e utilizzare la transizione corrente; altri rifacimenti restano fuori incarico.

Confronto concluso: soltanto due file applicativi cambiati, nessun’aggiunta/rimozione o delta estraneo. Frontend/Casa3D ricostruiti con builder vincolato e runtime .46 esatto,180fonti backend/contratti/manifeste invariate; ricetta SHA558ba87a…30fc90. Wrapper installato `sha256:f972cff2e71d898365715ace54f5ba6ef87a1312fe9094d5a09730ece599b9e8`; web3372590byte/SHAabd9e7816c68e34bff5c3df7df251a647e32cd037bad0b30425c985e53c77b3f. Nessuna nuova dipendenza, modifica .env/firewall o pubblicazione.

Il confronto precedente copriva swipe touch ma non wheel inverso: le sue evidenze restano storiche e non erano prova del percorso segnalato dall'utente. Negativi preservati: test RED0/1, fixture reduced-motion35/36, selettori dei harness e marker del compilato con backtick. Sono stati corretti i soli verificatori/fixture quando pertinenti; nessun allargamento dei criteri di comportamento. L’osservazione sui margini Pointer resta [ISSUE-150](../project-status.md#issue-150--aree-esterne-al-trascinamento-del-catalogo), non implementata.

## Chiusura e punto di ripresa

Completato: banco .52/r99 healthy e casa ready su [PC](http://127.0.0.1:3002/) e [LAN](http://192.168.1.37:3002/). Ricaricare conCtrl+F5 e usare nel catalogo lo scroll a due dita opposto a quello di apertura. Non occorre ricreare account o profili.

Nuovo backup freddo `backup/rep064/cold-bank-pre-0.9.52/aca-data-pre-0.9.52.tgz`,206911byte/SHAe700a8a381907a91941c9413835a6615a27d16a028e996fb2320f16efd7a122c, estrazione/integrità ok.27tabelle immediate identiche; tardivo stretto5/6 preservato in `ops-preservation-audit.json`, ristretto PASS in `live-preservation-final.json` per solo1seen_at monotono. Identità HA/provider/segreto tecnico e mount conservati; HA/D1 stessi container/immagini/avvii, solo ACA ricreato. Nessun rollback necessario; procedura alla .51 con dati correnti in [infrastruttura](../infrastructure.md).

Browser/context/helper privati chiusi, anteprima utente4185 conservata. Le prove wheel sono input del browser automatizzato, non un collaudo del trackpad fisico o Safari/Android/M11. Pubblica .34 invariata, nessun commit/push. Nessuna attività software residua implicita.

Sigillo finale `backup/rep064/final-validation.json` superato: immagine effettiva .52/healthy, fonte5259d73c invariata e soli2delta;36test/3UI e QA7+1+1 confermati. Pacchetto34frame con5posizioni e5opacità intermedie; entry servita esatta, PC/LAN ready, backup/hash e conservazione confermati.12documenti/1554collegamenti locali validi, nessun nuovo whitespace; spazio finale storico product.md identico a HEAD conservato. Arresto delle porte private51547/54377/60907 verificato; cleanup browser attestato nel sigillo QA. Il negativo operativo esatto5/6 rimane distinto dall'audit ristretto superato.
