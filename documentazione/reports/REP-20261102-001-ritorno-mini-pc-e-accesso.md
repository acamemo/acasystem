# Ritorno al mini PC, conservazione esperimento VM e collocazione dell'accesso

| Campo | Valore |
|---|---|
| ID | REP-20261102-001 |
| Stato | Checkpoint e analisi completati; VM accantonata, direzione mini PC registrata. Collocazione auth da decidere, ripristino applicativo non eseguito |
| Data | 2026-11-02, Europe/Rome |
| Autore / modello | Codex; nome esatto del modello non disponibile |
| Commit di partenza | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta | «accantonarla o perlomeno salvare questo stato se in futuro si vuole riprendere»; «ritornare sullo stato di avere desktop e android che si collegano all'ip del mini pc e l'app che lavora sulle api di HA come era in origine»; valutare registrazione/accesso nella webapp oppure nelle due distribuzioni |
| Autorizzazione | Conservare il punto di ripresa e registrare il ritorno al mini PC. La collocazione dell'autenticazione è una domanda da discutere; nessuna opzione va dichiarata accettata prima della risposta umana |
| Collegamenti | ISSUE-129, ADR-0023, ADR-0029, ADR-0030, REP-20261030-010 e REP-20261030-011 |

## Obiettivo e perimetro

Accantonare il lavoro sulla centrale VM desktop senza perderne codice, artefatti ed evidenze. Fotografare lo stato prima di un successivo ripristino del percorso client IP. Distinguere direzione approvata, implementazione attuale e raccomandazione sull'accesso. Non installare VMware né proseguire i benchmark; non disinstallare VirtualBox, eliminare/ripristinare dischi, avviare o cambiare VM/servizi, cancellare il diff o modificare i sorgenti applicativi in questa analisi.

Le numerose modifiche preesistenti tracked e untracked vanno conservate insieme al riferimento HEAD. Nessun commit, reset, pubblicazione o nuova dipendenza richiesti.

## Criteri di completamento

1. Checkpoint locale ignorato con sorgenti correnti, manifest/hash e indicazioni di ripresa; preservare clone VMDK, pacchetti ed evidenze già presenti senza duplicare inutilmente i dischi.
2. Aggiornare stato e decisioni: esperimento VM accantonato su richiesta umana, mini PC di nuovo centrale; QR/account/layout e design condiviso non ritirati automaticamente.
3. Ricostruire dal codice registrazione/onboarding e accesso ordinario, con proposta motivata e prerequisiti espliciti; nessuna architettura di login ancora approvata o implementata.
4. Verifiche documentali e confronto del diff; distinguere checkpoint eseguito da test di prodotto non eseguiti.

## Osservazioni iniziali

- Nessuna VM o processo ACA/VMware/VBoxHeadless in esecuzione rilevati nel preflight di questa ripresa; VirtualBox 7.2.22r175245. VMware non rilevato nei registri uninstall, PATH e percorsi standard. Non attribuire un'installazione/prova a U35: prima dell'interruzione era stato prodotto e verificato il clone VMDK, poi il portale richiedeva accesso Broadcom.
- Windows mantiene un percorso con IP esterno, ma sul banco il flag del motore locale era attivo. Android senza configurazione mostra attualmente l'avvio QR, non il vecchio form IP. Tornare al mini PC richiede quindi modifiche successive; non è già un rollback completato.
- Login ordinario già nella webapp; creazione proprietario e bootstrap HA/ACA nel core condiviso usato dalle dist. Riferimenti e proposta da completare dopo il checkpoint.

## Checkpoint eseguito

Cartella locale ignorata **`backup/checkpoints/2026-11-02-pc-vm-accantonato/`**. Archivio `sorgenti-e-documentazione.zip`, **1.946 file / 23.949.250 byte originali**, ZIP **9.040.541 byte**, SHA-256 **`09a8e147dd8612ae0c1e755361a4c4dcbbd2f201b8d5d342bafc4d40ebeded18`**. Manifesto per file, HEAD, stato Git, patch binaria dei tracked, verifica e RIPRESA.md. Include i file untracked pertinenti; esclude cache, node_modules, build/release, .claude, backup e nomi di credenziali. Non è un'immagine dell'intero workspace.

Lo ZIP è congelato prima degli aggiornamenti documentali U36: contiene anche questo report nel suo stato iniziale «In corso». I documenti correnti successivi indicano invece l'accantonamento e la direzione nuova. Nessun codice applicativo differisce dal checkpoint per questo intervento; la verifica finale deve confermare il confronto. Per una futura ripresa estrarre in una directory separata, senza sovrascrivere il lavoro corrente o ripristinare automaticamente il disco operativo.

I grandi artefatti sono conservati separatamente e referenziati in `manifest-large-artifacts.json`:

| Materiale | Percorso | Verifica |
|---|---|---|
| Pacchetto PC/VM 0.9.31 | `progetto/client/windows/release/pc-vm-0.9.31/Acasystem-PC-VM-0.9.31.zip` | 711.762.334 byte, SHA `163e92868e664aaccea3d048b551f9cd4b8a1cbf7fc4b7ebd2c7e5023ca605c7` ricontrollato |
| Clone VMware | `backup/rep011/vmware-trial/aca-haos.vmdk` | 7.187.005.440 byte, SHA `ac3e33b52a4fdc881313c4986b14a61b2ee914d1b1a5fdbfbdd0588db6790724` ricontrollato |
| VDI operativo ACA | `%APPDATA%/Acasystem/engine/haos.vdi` | 7.283.408.896 byte, SHA `06a221ae1ea9c61e22f92cb1c149130522afa4a52f9af153d8cdd42d65bb7882` ricontrollato |
| Checkpoint pre-owner | `backup/rep010/pre-web-qa-haos.vdi` | 7.259.291.648 byte; SHA C8FB storico, **non ricalcolato** in U36 |

La copia VMDK non è diventata un disco di esercizio; per prove future usare un'altra copia e non avviarla insieme all'originale con la stessa identità. Nessuna installazione VMware, avvio VM, rimozione dati o ripresa Broadcom eseguiti in U36.

## Ricostruzione del flusso attuale

| Parte | Evidenza nel codice | Conseguenza |
|---|---|---|
| Connessione centrale | `progetto/client/core/src/config.ts`, `startup.ts` | Host/porta, controllo disponibilità, bundle/cache condivisi dai client |
| Prima creazione proprietario | `core/src/setup.ts:createOwner`, `loginAdmin`, `completeSetup` | Onboarding HA, poi installazione/avvio ACA. Le dist utilizzano questo core; il bootstrap loginAdmin non supporta MFA |
| Accesso quotidiano | `frontend/src/pages/connect/LoginForm.tsx`, `api/haLogin.ts` | Login e MFA già nella webapp condivisa attraverso `/ha` |
| Sessione | `frontend/src/api/oauthStorage.ts`, `api/apiAuth.ts`, `hooks/context/HomeAssistantContext.tsx` | Token/rinnovo/connessione nella parte web; non una password da copiare fra dispositivi |
| Verifica utente | `backend/src/services/homeAssistantAuthService.ts` | Il server verifica token e identità con HA |
| Confine onboarding web | `backend/src/config/homeAssistantProxy.ts` | Allowlist auth/token presente, onboarding/creazione owner assenti |
| Ripristino client ancora necessario | `windows/src/main.ts:boot`, `android/web/main.ts:boot` | Flag locale Windows può avviare la VM; Android senza configurazione mostra QR. Nessun ritorno già operativo al vecchio form IP |

## Raccomandazione, non ancora approvata

Mettere prima configurazione e accesso nella **webapp condivisa**, mostrata dentro Electron/Capacitor e nel browser. Distribuzioni per inserire/salvare l'indirizzo centrale, aprire la UI e gestire funzioni native; webapp per schermate iniziali, credenziali/MFA e gestione della sessione. HA resta l'autorità per utenti/permessi/token, con sessione propria per ciascun dispositivo. Primo avvio della casa crea il proprietario; i successivi dispositivi accedono alla stessa centrale. Non è una registrazione cloud ACA o una delega automatica dal solo QR.

Beneficio atteso: una UI per desktop, Android e browser, accesso già in gran parte presente e aggiornamenti del flusso web condivisi quando non cambiano i contratti nativi. Il luogo della UI è distinto dalla custodia concreta delle sessioni e dal protocollo HA: non assumere che il medesimo token debba essere copiato fra dispositivi o inserito nel QR.

**Prerequisito:** predisporre il mini PC con HA/ACA e una modalità iniziale ACA raggiungibile prima della creazione owner. Oggi il client crea owner e poi installa/avvia ACA; il proxy non espone l'onboarding. La proposta richiede quindi un flusso iniziale/endpoint da progettare e verificare, non il solo spostamento grafico del form. Non è stata dimostrata la relativa implementazione. Se si vuole continuare da un HA OS non predisposto con l'installazione automatica dal client, mantenere il bootstrap core nelle dist più il login web esistente è l'alternativa attuale da valutare.

Fonti primarie consultate il **2026-11-02**: [HA, sistema di autenticazione](https://contributors.home-assistant.io/core/internals/auth/) distingue proprietario creato durante onboarding, utenti, credenziali e token; [HA, Authentication API](https://contributors.home-assistant.io/core/internals/auth-api/), aggiornata 2026-10-12, descrive autorizzazione, access/refresh token, rinnovo e revoca. Supportano i confini di responsabilità, non dichiarano implementato il bootstrap web ACA. Nessuna modifica al protocollo o dipendenza adottata.

## Verifiche ed evidenze

| Controllo | Esito | Evidenza e limiti |
|---|---|---|
| ZIP checkpoint | Superato | 1.946 entry decompresse e SHA confrontati, fonti rilette prima della modifica documentale; `tar -tf` exit 0, `verification.json` |
| Artefatti grandi | Superato per i tre hash ricontrollati | Manifesto separato; C8FB esplicitamente storico non ricalcolato |
| Stato VM/VMware | Solo lettura | Nessuna VM running e nessuna installazione VMware rilevate; nessun benchmark o avvio in U36 |
| Lettura auth e doppio controllo | Eseguito | Codice frontend/core/backend confrontato con fonti HA, nessuna credenziale letta o pubblicata |
| Sorgenti dopo aggiornamento documentale | Superato | **1.713 file sotto progetto/** confrontati per SHA con il manifest: zero differenze. ZIP immutato e HEAD invariato; `parent-final-check.json` |
| Collegamenti/diff pertinenti | Eseguiti, con limiti preesistenti | Destinazioni nuove presenti; link LEGGIMI → WidgetTray già mancante. Diff Git pertinente superato con soli avvisi CRLF. Una riga whitespace preesistente di product.md da distinguere dalle modifiche U36, senza correzioni estranee |
| Mini PC/login/IP su prodotto | Non eseguito | Nessun codice/configurazione prodotto modificati in questo passaggio |

## Chiusura e punto di ripresa

Conservazione e analisi concluse; [ADR-0031](../decisions/ADR-0031-ritorno-mini-pc-client.md) registra soltanto la scelta umana del mini PC e dell'accantonamento. REQ-20/AC-20 storici accantonati, ID conservati; ISSUE-129 accantonata senza correzione e ISSUE-130 per scelta auth/ripristino client. QR/account/layout e design restano lavoro conservato.

Prossimo passo: decisione umana su prima configurazione/accesso nella webapp e relativo mini PC predisposto oppure mantenimento del bootstrap nelle dist. Dopo la decisione riprendere il ripristino applicativo da questo codice, senza un reset generale o uso dell'EXE PC/VM come se fosse già il client IP. Nessuna prova VMware o richiesta di accesso Broadcom resta attiva per questa direzione; nessuna automazione o commit creati.

Controllo conclusivo U36: 18 documenti pertinenti, 1159 destinazioni locali controllate; nessun nuovo rimando mancante, solo LEGGIMI → WidgetTray già noto. Diff Git pertinente riuscito con soli avvisi CRLF; whitespace di product.md riga 91 presente identico nello ZIP pre-intervento e conservato. Confrontati 1.713 file di prodotto per hash: zero differenze. HEAD invariato, nessun commit; evidenze finali parent-final-check.json e doc-final-check.json nel checkpoint. Test di prodotto non eseguiti perché questa consegna conserva lo stato e registra/discute la direzione, senza ripristino applicativo.


**Seguito U37, 2026-11-02:** la successiva richiesta umana approva registrazione/accesso web e HA/ACA predisposti. Implementazione e artefatti locali in [REP-20261102-002](REP-20261102-002-ripristino-client-mini-pc-e-onboarding-web.md). Questo report conserva il momento U36 prima della decisione; checkpoint ZIP non rigenerato.

