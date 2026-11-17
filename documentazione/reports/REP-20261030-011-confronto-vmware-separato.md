# Confronto separato del motore VMware

| Campo | Valore |
|---|---|
| ID | REP-20261030-011 |
| Stato | Accantonato su richiesta U36 il 2026-11-02; clone conservato, nessuna installazione/prova VMware eseguita |
| Data | 2026-10-30, Europe/Rome |
| Autore / modello | Codex; nome esatto del modello non disponibile |
| Commit di partenza | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta e autorizzazione | U35: «Sì, prova VMware separatamente», risposta alla domanda su installazione ufficiale e copia del disco, preservando VM attuale/protezioni, senza migrare il gestore ACA |
| Riferimenti | ISSUE-129, proposta P-129-A e prove U31-U34 in [report010](REP-20261030-010-rallentamenti-vm-windows.md), ADR-0029 |

## Obiettivo e perimetro

Installare VMware Workstation da fonte ufficiale verificata, creare un banco separato dal disco ACA e confrontare avvio e timer in idle. Conservare VM/disco/registri ACA originali e le due VM storiche; non avviare contemporaneamente centrali con la stessa identità. Non disattivare Hyper-V/VBS o altre protezioni, non cambiare energia/boot host, non aggiornare HA OS/Core, non creare account del cliente o migrare il manager dell'app. L'installazione può richiedere UAC: nessuna elevazione alternativa o riavvio automatico.

Sorgenti e documenti hanno molte modifiche preesistenti non committate, già identificate nello stato Git e conservate. Diff prodotto iniziale archiviato nella cartella locale ignorata `backup/rep011/`; nessuna riscrittura dei sorgenti applicativi assegnata. L'eventuale adozione/inclusione VMware nell'installer ACA è un incarico successivo, non implicita in questa prova.

## Criteri di completamento

- Installer ufficiale e firma verificati, versione reale installata e necessità di riavvio documentate; se accesso Broadcom manca, registrare il blocco senza usare mirror o credenziali inventate.
- Copia VMDK distinta e controllata, originale intatto tramite hash/configurazioni; VM di prova identificata e rete distinta, stesso HA OS 18.4/Core 2026.10.4, UEFI, 4 vCPU e 4096 MB.
- Avvio e almeno cinque minuti senza sonde host per ogni campione; tempi/deadline e log guest, non solo HTTP. Se primo campione sano, almeno due cold/idle prima di ritenere il miglioramento ripetibile. Nessuna garanzia H24.
- Arresto normale e stato finale espliciti, nessun helper persistente o automazione creata, report/indice/stato aggiornati. Eventuali accessi o riavvio dipendenti dall'utente distinti da esiti tecnici.

## Avanzamento e modifiche

Preflight alle 19:26 Europe/Rome: VirtualBox 7.2.22r175245, nessuna VM in esecuzione, ACA poweroff con marker/disco corrispondenti. VMware/vmrun non rilevati nei percorsi previsti, PATH o registri uninstall. Circa 375 GB liberi, boot host sempre 17:28:53. Sorgente attuale VDI **7.283.408.896 byte**, SHA-256 **`06a221ae1ea9c61e22f92cb1c149130522afa4a52f9af153d8cdd42d65bb7882`**. Questo è il disco dopo le prove normali U33-U34, non il precedente checkpoint pre-owner C8FB. Preflight/configurazioni in `backup/rep011/`.

Acquisizione/versione/parametri ufficiali ancora da verificare; nessuna installazione VMware già dichiarata.

## Verifiche ed evidenze

| Controllo | Esito | Evidenza e limiti |
|---|---|---|
| Identità e stato sorgente | Superato | VBoxManage e registro ACA, `backup/rep011/preflight.json` |
| Hash sorgente/configurazioni iniziali | Superato | SHA-256 prima della conversione; confronto finale ancora da eseguire |
| Installer/versione installata | Non eseguito | Ricerca ufficiale in corso |
| Cold/idle VMware | Non eseguito | Non dedurre un rimedio dall'approvazione o dalla documentazione |

## Controllo del diff e decisioni

U35 autorizza solo il banco separato proposto in P-129-A. Nessun ADR di adozione del motore, dipendenza o migrazione applicativa approvati. Preservare tutto il diff preesistente; nessun commit/push/deploy richiesti.

## Chiusura e punto di ripresa

In corso. Proseguire con materiali ufficiali, conversione della sola copia e verifiche di esecuzione. Se portale Broadcom richiede accesso personale non disponibile, predisporre le parti indipendenti e richiedere soltanto quell'accesso, senza ripetere l'autorizzazione U35.

## Annotazione di accantonamento, 2026-11-02

U36 interrompe il filone VM/VMware e torna al mini PC come centrale, [ADR-0031](../decisions/ADR-0031-ritorno-mini-pc-client.md). Il punto di ripresa sopra è storico e non un invito a proseguire l'installazione o chiedere ancora l'accesso Broadcom. Nessuna installazione o prova VMware osservata; verifica odierna dei percorsi, PATH e registry coerente con il precedente arresto al login del portale.

Correzione dello stato di avanzamento rimasto incompleto dopo l'interruzione della chat: il 2026-10-30 era stato eseguito `VBoxManage clonemedium disk <UUID-sorgente> <nuovo-VMDK> --format VMDK --variant Standard`. Evidenze già presenti `backup/rep011/clonemedium-output.txt` e `clone-verification.json`; clone UUID `c2a10956-4455-419a-aaea-b7b0aa1231f5`, **7.187.005.440 byte**, SHA-256 **`ac3e33b52a4fdc881313c4986b14a61b2ee914d1b1a5fdbfbdd0588db6790724`**. Il VDI originale, **7.283.408.896 byte**, mantiene SHA-256 **`06a221ae1ea9c61e22f92cb1c149130522afa4a52f9af153d8cdd42d65bb7882`**; hash di entrambi ricontrollati il 2026-11-02. Non è avvenuto un benchmark né una migrazione del manager.

Checkpoint sorgenti/documentazione e manifesti artefatti in `backup/checkpoints/2026-11-02-pc-vm-accantonato/`, [report della conservazione](REP-20261102-001-ritorno-mini-pc-e-accesso.md). Nessuna cancellazione/ripristino dischi o disinstallazione. Per un'eventuale ripresa seguire RIPRESA.md e verificare dati/configurazioni nuovi prima di usare una copia separata; nessuna prosecuzione automatica di U35.
