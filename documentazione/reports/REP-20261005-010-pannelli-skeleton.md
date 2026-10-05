# REP-20261005-010 — Pannelli e skeleton

| Campo | Valore |
|---|---|
| Stato | Completato |
| Data | 2026-10-05 |
| Autore / modello | Codex; modello esatto non disponibile |
| Commit di partenza | 5136d59 |
| Richiesta | Apertura/chiusura dei pannelli stile macOS con scale, opacità e spring; skeleton animati per contenuti dinamici durante il fetch. |
| Autorizzazione | Richiesta umana corrente; aggiornamento del banco locale e commit coerente, come negli interventi precedenti. |

## Obiettivo e perimetro

Intervenire sui contenitori condivisi dei pannelli, sui caricamenti lazy e sui fetch delle liste e della cronologia. Conservare temi, API, controlli HA e dipendenze. Stato Git iniziale pulito. Riferimenti: [design](../design/design.md), [architettura](../architecture.md), ADR-0004/0005.

## Criteri di completamento

- Apertura fluida e uscita realmente visibile prima dello smontaggio; chiusura non interattiva, riapertura sicura e rispetto del movimento ridotto.
- Skeleton riutilizzabili nelle primitive, ingombri stabili nei contenitori; dati già caricati conservati durante il refresh, risultati vuoti ed errori distinti dalle attese.
- Verifiche di regressione, tipi, lint, build e browser locale; nessuna modifica a dipendenze, HA o originali.

## Avanzamento e modifiche

- Primitive TS PanelPresence e Skeleton, senza dipendenze aggiunte. Presenza collegata ai 31 slot dei tre slice di orchestrazione: l'ultimo contenuto resta montato durante l'uscita, inert/aria-hidden, con completamento su animationend o fallback 200 ms. Riapertura annulla il timer; movimento ridotto completa subito. Nessun ritardo nelle azioni HA: viene trattenuta soltanto la presentazione.
- Apertura 360 ms: scala 0,96 → 1,008 → 1, opacità 0 → 1; uscita 180 ms verso scala 0,97/opacità zero. Backdrop separato. I pannelli laterali conservano la propria origine a destra e il comportamento di anteprima.
- AccessibleModalShell coordina i blocchi scroll dei dialoghi sovrapposti, ignora Escape negli elementi in uscita e ripristina il focus senza sottrarlo al nuovo dialogo. SidebarContainer applica lo stesso filtro su Escape.
- Skeleton per lazy loading, stanze/entità dell'area, profili, calendario e attività (card/modal/riepilogo), cronologia sensori, consumi e temperature. Gli skeleton multimediali preesistenti rispettano ora movimento ridotto. Gli spinner di scrittura, firmware e dispositivi attivi sono conservati: non sono fetch di contenuti.
- Dati di liste già disponibili conservati durante il refresh. Stanze e profili riservano almeno 216 px; grafici 350/320/140 px. Il contenitore consumi mantiene almeno 352 px con padding anche quando le barre usano 220 px. Il fetch stanze fallito produce un errore, senza dichiarare lista vuota; errore dispositivi distinto da conteggio zero.
- Documentazione tecnica/design/verifiche, indici e stato aggiornati. Compose punta alla nuova immagine locale. Originali, licenza, stack, API, sorgenti backend e configurazione HA invariati.

## Verifiche ed evidenze

Evidenze locali selezionate in backup/panels-skeleton-20261005, escluse da Git. Nessun dato di autenticazione acquisito. Fonte dei fatti esterni: nessuna nuova ricerca o dipendenza necessaria; l'implementazione usa lo stack già presente.

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Tipi | npm run typecheck, host Node 24.14; typecheck:home anche nella build Node 26 | Superato | JS precedente + strict primitive/interfacce migrate; typecheck.log. Non converte tutto il codice a TS. |
| Lint/temi | npm run lint; npm run lint:theme-colors | Superato | Nessun errore/warning; colori: 43 file. lint.log, theme.log. |
| Regressioni | docker run --rm --network none aca-tunet-panels-check:1 npm test | Superato | 94 file / 740 test, tests-final.log. 12 nuovi casi in PanelLoading.test.jsx; stessa immagine builder del codice finale. |
| Test mirati | npm test -- src/__tests__/PanelLoading.test.jsx; ripetuti nel builder isolato | Superato | 12 casi. Le prime esecuzioni hanno evidenziato assunzioni errate del test su timer React e nome evento JSDOM: corretto il confronto con timer iniziali e coperti animationend/webkitAnimationEnd. La prova finale include entrambi e il filtro degli eventi dei figli. |
| Build | Dockerfile temporaneo FROM aca-tunet-mgmt-check:1, COPY sorgenti, SKIP_POSTBUILD=1 npm run build | Superato | build-final.log. Primo tentativo Dockerfile upstream con rete disattivata fallito su apk non in cache, build.log; ripresa con immagini locali già disponibili, nessuna reinstallazione o aggiornamento dipendenze. |
| Budget | docker run --rm --network none aca-tunet-panels-check:1 node scripts/check-bundle-size.mjs | Superato | index 886,7 KB / soglia 900 KB, tutti i chunk nei limiti; bundle-final.log. |
| Banco locale | Runtime derivato dalla precedente immagine locale, sostituendo dist; compose up -d --no-build tunet | Superato | aca-tunet:1.22.1-aca-panels-neu1, ID sha256:a6b097e6f92effd06948b45beedfaa6e2f6aafce4c54e2a6d37829cf50483b47, healthy. HA non ricreato; stesso volume aca-tunet_tunet-data → /app/data. |
| HTTP | Fetch host di root, health e asset iniziali | Superato | 23 asset iniziali HTTP 200, http-assets.json. Non è un collaudo offline/lazy completo. |
| Browser desktop | Browser laterale localhost:3002, sola lettura HA | Superato | aca-panel-in / 0,36 s; chiusura aca-panel-out con inert, passaggio Aspetto→Disposizione con uscita e ingresso contemporanei; fallback lazy e successivo pannello osservati. Viewport finale 778×710, un dialogo, nessun overflow. pannello-desktop.png. |
| Browser mobile | Override 390×844, aggiunta scheda/Stanze, Escape e ripristino viewport | Superato | Skeleton durante fetch reale poi lista disponibile; minimo 216 px, pannello entro viewport e nessun overflow. stanze-mobile.png. Nessuna area selezionata, comando dispositivo o salvataggio pagina/profilo. |
| Movimento ridotto | MatchMedia nei test + controllo delle media query | Superato, limitato | Uscita senza attesa animata; shimmer/pannelli/backdrop disattivati. Preferenza OS non emulata/modificata nel browser; non certificazione di accessibilità globale. |
| Integrità/perimetro/link | Validatore locale baseline/hash/fonti protette, link e git diff --check | Superato | 407 file baseline e ZIP integri; 24 fonti protette e report Antigravity invariati; 40 documenti / 330 link locali / 32 file nel perimetro. Riconfermato dopo la chiusura del report. |

## Controllo del diff e decisioni

Il diff riguarda presentazione, gestione dello smontaggio, stati di fetch, verifiche e storico. Nessuna tecnologia sostituita, nuova dipendenza, remote o deploy esterno. La classe React della presenza conserva esplicitamente il nodo dell'ultimo render aperto; CSS gestisce le animazioni, senza libreria aggiuntiva. Nessun ADR nuovo necessario per queste scelte esecutive.

I pannelli dinamici possono crescere quando arriva una quantità diversa di dati: non è garantito CLS nullo in ogni schermata. Il fallback lazy è generico; menu impostazioni e pannelli interni multimediali mantengono le transizioni preesistenti. I fetch calendario/consumi/temperature conservano la gestione errori legacy; il collaudo con dispositivi reali resta aperto. Le regressioni simulate non provano una risposta fisica dell'impianto, conformità complessiva, backup o offline.

## Chiusura e punto di ripresa

Incarico completato sul banco locale; nessuna attività resta aperta in questo perimetro. Rimangono, senza automatica autorizzazione, migrazione delle altre interfacce, traduzione legacy, dimmer con riscontro HA e collaudo dei dispositivi. Commit contenente il report identificabile con git log -- documentazione/reports/REP-20261005-010-pannelli-skeleton.md; non viene inserito un hash futuro.
