# ADR-0034 Consolidamento dei progetti e dei confini applicativi

| Campo | Valore |
|---|---|
| ID e titolo | ADR-0034 — Consolidamento dei progetti e dei confini applicativi |
| Stato | Accettata nel perimetro U46; avanzamento ed esiti nel report REP-20261102-008 |
| Data e autore | 2026-11-02; scheda redatta da Codex |
| Decisore e autorizzazione | Utente, [U46](../riprogettazione/diario/2026-11-02.md#u46-consolidamento-dei-progetti-e-dei-flussi): riporta i tre punti della proposta incrementale dell'audit U45 e conferma «andrei a seguire la tua proposta» |
| Collegamenti | [Audit U45](../reports/REP-20261102-007-scalabilita-struttura-cartelle.md), [report U46](../reports/REP-20261102-008-consolidamento-progetti-e-flussi.md), ISSUE-133 in [project-status](../project-status.md), [ADR-0004](ADR-0004-principi-frontend.md), [ADR-0031](ADR-0031-ritorno-mini-pc-client.md), [ADR-0032](ADR-0032-design-condiviso-workspaces.md), [ADR-0033](ADR-0033-ui-movimento-layout-condivisi.md) |
| Sostituisce / sostituita da | Nessuna; consolida l'organizzazione esistente e i confini di ADR-0031/0032/0033, senza sostituire la direzione mini PC/client |

## Contesto ed evidenze

L'audit U45 rileva risorse comuni lette dalla cartella Windows, assembler del bundle web duplicati, copie generate che mantengono file rimossi e controlli UI/design separati dal comando generale. Individua inoltre modelli launcher nella cartella delle schermate e DTO API copiati a mano fra browser e server. Sono rischi di manutenzione documentati, non una dimostrazione di incompatibilità dei pacchetti pubblici.

La struttura ha già confini utili: due radici npm con lockfile distinti, frontend/backend/Casa3D separati, UI React e design canonici, core dei client indipendente dalle piattaforme. U46 approva i tre passi proposti dall'audit: consolidamento, risorse e packaging comuni, crescita per flussi applicativi. Accettazione della decisione, implementazione e verifica restano stati distinti.

## Decisione umana e scelte esecutive

1. Conservare le radici npm `progetto/acasystem` e `progetto/client`, i rispettivi lockfile e gli adattatori Windows/Android. Aggregare i controlli UI/design esistenti nel comando generale server/web; ignorare cache e output generati senza nascondere le fonti. Le copie del design rigenerano soltanto una destinazione dedicata `design-aca`, con controllo dei percorsi e regressioni per residui, rinomina e rimozione.
2. Collocare le fonti multipiattaforma in `progetto/client/shared`: `shell/` contiene composizione CSS, icona e copia degli asset; `packaging/` contiene assemblaggio del bundle web e lettura/scrittura ZIP. Windows, Android e HAOS mantengono ingressi e adattamenti propri e usano queste fonti. `progetto/acasystem/design` rimane la fonte dei temi/font; `ui` rimane la fonte dei componenti DOM React di ADR-0033. Non duplicare questi livelli nei client.
3. Separare modelli e contratti dalle schermate: `frontend/src/domain/launcher` contiene catalogo, geometria, classificazione e configurazione del launcher; `progetto/acasystem/contracts/devices.ts` contiene i tipi di trasporto comuni a server e browser, senza dipendenze UI/server. Conservare i precedenti percorsi come re-export quando necessari. Estrarre gradualmente flussi coesi dall'orchestratore: in questo incremento `hooks/launcher/useLauncherRemoval.ts` raccoglie rimozione e annullamento, preservandone API e interazione.
4. Collegare sorgenti e immagine con uno snapshot di nomi e byte: `ha-app/build-base.mjs` costruisce da un contesto congelato e registra hash sorgenti e versione nelle etichette dell'immagine. `prepare.mjs` verifica la corrispondenza prima di preparare materiali locali, riusa gli stessi byte sorgente nell'archivio e congela gli input della preparazione. `SOURCE-PROVENANCE.json` registra la provenienza locale, l'immagine di base e gli input previsti dal flusso.
5. Conservare stack, dipendenze, API, dati e flusso mini PC/client. L'incarico non aggiunge dipendenze, un account cloud ACA, un relay remoto o un motore HA nei client; non autorizza pubblicazioni o interventi sulla VM accantonata. Il relativo checkpoint resta conservato.

## Alternative e motivazioni

Lasciare risorse e packaging sotto una piattaforma conserverebbe dipendenze estranee dei nuovi consumatori. Duplicare modelli e DTO conserverebbe il costo di sincronizzazione già individuato. Il consolidamento approvato interviene su questi confini mantenendo gli adattatori esistenti.

Non si fondono i due lockfile e non si trasferisce tutto in una nuova gerarchia `apps/packages`. Non vengono introdotti Nx/Turborepo, nuovi framework o un pacchetto npm per ogni cartella. Formalizzare UI/design come pacchetti autonomi potrà essere valutato quando esisterà un consumatore indipendente che lo richieda. I modelli della casa rimangono applicativi, separati dalla UI riutilizzabile.

## Conseguenze

Le fonti comuni hanno un proprietario riconoscibile; gli output Windows/Android sono rigenerati e non diventano sorgenti da modificare. Una modifica comune richiede la ricostruzione dei consumatori. I vecchi percorsi mantenuti come facciate non costituiscono una seconda implementazione.

I contratti TypeScript condivisi riducono la divergenza dei DTO, ma non sostituiscono la validazione dei dati a runtime. L'estrazione di un flusso dal launcher non autorizza una riscrittura dei widget o nuovi comportamenti.

Il confronto fra snapshot, etichette e image ID è una verifica locale di provenienza, non un'attestazione firmata o una garanzia di build riproducibile byte per byte. In particolare il riferimento base `node:26-alpine` è mobile. Versioni degli strumenti, dipendenze e ambiente continuano a incidere sugli artefatti; i limiti del congelamento e delle prove effettive sono riportati nel report U46.

## Verifiche e revisione

Il [report REP-20261102-008](../reports/REP-20261102-008-consolidamento-progetti-e-flussi.md) è la fonte degli esiti e dei limiti delle verifiche: comandi comuni, asset generati, packaging, contratti, regressioni dei flussi e provenienza immagine/sorgenti. Questa decisione non dichiara concluso il collaudo del prodotto o delle piattaforme fisiche.

Riesaminare i confini quando un nuovo consumatore richiede distribuzione indipendente, cambiano i DTO o il packaging, oppure un flusso supera il ruolo dell'adattatore locale. Per una futura pubblicazione verificare nuovamente la corrispondenza dei sorgenti e dell'immagine; la preparazione locale non costituisce autorizzazione al deploy.
