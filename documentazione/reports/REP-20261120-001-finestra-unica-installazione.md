# Finestra unica di installazione nell'app Acasystem per PC

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261120-001 |
| Stato | Completato |
| Data | 2026-11-20, Europe/Rome |
| Autore / modello | Claude Code, Opus 5.5 (`claude-opus-5-5`) per piano e verifica; implementazione affidata a sottoagenti Sonnet, come da preferenza dell'utente sul credito |
| Commit di partenza | `0dc6b42` |
| Richiesta di riferimento | Dopo la prova dell'`.exe` 18.4-2 su un altro PC: «a livello grafico tutta l'installazione è un po' bruttina, suggerimenti?». Proposta dell'agente: una sola finestra Acasystem dall'installazione alla centrale pronta. Poi «fai lo schizzo delle schermate della finestra unica» (schizzo: canvas privato `Finestra unica di installazione`, 5 schermate) e «procedi con l'implementazione della finestra unica». |
| Autorizzazione | Implementare la finestra unica come nello schizzo: benvenuto con controlli, download con avanzamento, preparazione del primo avvio (risolve ISSUE-168), centrale pronta con QR, variante «Manca VirtualBox». L'`.exe` installa solo l'app e gli script; il resto lo guida l'app. Release e push seguono le regole già concordate in questa sessione (commit senza attribuzione, push su `main`). |

## Obiettivo e perimetro

**Risultato.** Al primo avvio, senza un indirizzo salvato, l'app per PC mostra il benvenuto. Da lì «Prepara la centrale» porta a termine tutto nella stessa finestra:
1. controllo dei requisiti: VirtualBox, spazio, rete di casa, Internet;
2. download del disco della centrale con barra di avanzamento, ripresa dopo una caduta e controllo dell'impronta;
3. creazione della VM con gli script già provati (`Installa-Centrale.ps1` e supervisore);
4. avanzamento del primo avvio: centrale accesa, indirizzo trovato, download di Home Assistant, installazione di Acasystem;
5. centrale pronta, con QR per telefono e tablet, e ingresso nell'app senza scrivere l'indirizzo.

«Ho già una centrale o un mini PC» porta alla schermata di collegamento esistente.

**Modifiche ammesse:**
- guscio Windows dell'app (`progetto/client/windows`): nuovo modulo di installazione nel processo principale, nuove viste nella pagina locale, stato e IPC;
- `Installa-Centrale.ps1`: nuovo parametro per un disco già scaricato;
- installatore NSIS: niente più download in PowerShell, solo app e script;
- dipendenza `qrcode-generator` 2.0.4 nel guscio, la stessa versione già usata da frontend e schermata di avvio.

**Esclusi:**
- nessun cambiamento all'immagine della centrale né alla schermata di avvio (il punto 2 di ISSUE-168 resta proposta);
- nessun cambiamento all'app Android né alla webapp;
- niente firma del codice, nessun nuovo tema.
- Il modulo `src/engine/ownedHaVm.ts` (NAT con inoltro porte, escluso dalla build) non viene riusato né modificato: il percorso provato è la rete bridged con supervisore.

**Riferimenti:**
- ADR-0023 (guscio A-ibrida): la pagina locale del guscio resta senza interfaccia scaricata;
- ADR-0004: primitive condivise `design-aca`, le stesse della schermata di collegamento;
- design Vetro Bianco (`design.md`);
- ISSUE-168;
- REP-20261118-001 (`.exe`, disco `centrale-vm-18.4-2`, aggiornamenti automatici).

**Modifiche preesistenti:** nessuna nel working tree all'avvio (`git status` pulito dopo `0dc6b42`).

## Criteri di completamento

1. Primo avvio senza configurazione: vista benvenuto con i quattro controlli e il loro esito reale. VirtualBox mancante: variante con il pulsante al sito ufficiale e «controlla di nuovo».
2. Download dal disco pubblicato `centrale-vm-18.4-2`: percentuale, MB, tempo stimato. Ripresa automatica dopo un'interruzione, impronta SHA-256 verificata, estrazione del `.vdi`. Annullabile.
3. VM creata con `Installa-Centrale.ps1 -Disco … -Conferma`, con le stesse impostazioni dell'installatore attuale: bridged, supervisore all'accesso, `installazione.json`.
4. Primo avvio seguito senza console, con passi che cambiano davvero:
   - indirizzo della VM trovato dal suo MAC;
   - Home Assistant pronto quando `:8123/api/` risponde 401;
   - Acasystem pronto quando `:3002/api/health` risponde ok.
   Chiudendo e riaprendo l'app si riprende dal punto raggiunto. Notifica di Windows quando la centrale è pronta, se l'app è aperta.
5. Centrale pronta: indirizzo, QR di `http://<ip>:3002/` e «Apri Acasystem», che salva l'indirizzo e apre l'interfaccia come oggi.
6. L'`.exe` installa app, script, collegamenti e disinstallatore senza scaricare nulla. Il disinstallatore rimuove anche la centrale creata dall'app.
7. Test unitari dei nuovi moduli (download con ripresa e impronta, lettura della tabella ARP, avanzamento del primo avvio, stato persistito); `npm run typecheck` e `npm test` del guscio superati.
8. Prova reale su questo PC: installazione dell'`.exe`, percorso completo fino a «Apri Acasystem», disinstallazione.

## Avanzamento e modifiche

Piano dell'agente (2026-11-20):
- `src/setup/` nel processo principale con contratto comune in `src/setup/types.ts`, scritto prima;
- un sottoagente per il motore (controlli, download, VM, scoperta dell'indirizzo, avanzamento, stato) e uno per viste, IPC e installatore, su file distinti;
- verifica e prova reale dell'orchestratore.

**Realizzato.**
- **Motore** in `progetto/client/windows/src/setup/`: `constants`, `deps`, `net`, `checks`, `download`, `vm`, `discovery`, `tracker`, `state`, `qr`, `centralSetup`, con 5 file di test.
  - Il download riprende con `Range`, fa fino a 20 tentativi e considera caduta una connessione ferma per 60 s; verifica dimensione e SHA-256 ed estrae con `tar.exe` nella cartella `Download` accanto a `Centrale`.
  - La VM si crea con `Installa-Centrale.ps1 -Disco … -NonInterattivo`.
  - L'indirizzo si trova dal MAC della VM: tentativi TCP sulla /24 per popolare l'ARP, poi `arp -a`.
  - Il primo avvio si segue con `:8123/api/` (401) e `:3002/api/health`, con un limite di 90 minuti.
  - Lo stato è persistito in `centrale-setup.json`.
- **`Installa-Centrale.ps1`:**
  - `-Disco` sposta il `.vdi` già scaricato nella cartella della centrale;
  - `-NonInterattivo` non attende mai Invio e scrive `ERRORE: …` sull'uscita;
  - variabile interna rinominata `$discoPronto`, perché in PowerShell `$disco` e `$Disco` sono la stessa variabile.
- **Guscio:**
  - viste di installazione in `shell/index.html`, `shell/setup.css` e `src/renderer/shell.ts`;
  - stato `setup` in `shellState.ts`;
  - 9 canali IPC, tutti limitati alle pagine locali (`fromShell`);
  - all'avvio senza indirizzo salvato il guscio riprende l'installazione o mostra il benvenuto;
  - notifica quando la centrale è pronta;
  - QR disegnato con `createElementNS` da `qrcode-generator` 2.0.4 (stessa versione del frontend);
  - versione dell'app 0.2.0.
- **Installatore** (`aca-system.nsi`, `crea-installer.ps1`, `LEGGIMI.txt`):
  - installa app, script e disinstallatore senza scaricare nulla;
  - pagina finale con «Apri Acasystem»;
  - reinstallabile sopra una versione esistente senza toccare `Centrale`.
- **Correzioni dell'orchestratore dopo la prova visiva:**
  - cornice del fuoco sui titoli rimossa;
  - colori di stato chiari sul vetro, scuri con trasparenza ridotta o contrasto alto (prima l'ambra «Non installato» era quasi illeggibile);
  - sottotitolo vuoto nascosto.
- **Controllo «Memoria e processore»** (richiesta dell'utente «Yes, add it» dopo la domanda sui requisiti): sotto 4 GB o 2 core il requisito manca; sotto 6 GB o 4 core è al limite e si può continuare.
- **Difetto corretto nel download:** i byte erano contati prima di essere scritti e l'annullamento scartava quelli ancora in memoria, quindi il file parziale poteva risultare più corto o vuoto. Ora ogni blocco è scritto prima di essere contato e il file si chiude anche annullando. Il test dell'annullamento, prima fallito 5 volte su 5 con il PC sotto carico, ora passa.

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Typecheck, test e build del guscio | `npm run typecheck`, `npm test`, `npm run build` in `progetto/client/windows` (Node 24) | Superato | 12 file, 161 test (prima del controllo hardware e della correzione del download: 158) |
| Viste a confronto con lo schizzo | App dai sorgenti con profilo temporaneo, stati d'esempio inviati alla pagina, schermate Playwright | Superato dopo correzioni | Paesaggio e vetro come lo schizzo; corretti fuoco sui titoli, contrasto dell'ambra, vuoti. Pulsante principale nello stile `aca-m--primary` del guscio, non lavanda come nello schizzo |
| Pacchetto dell'app | `npm run dist:zip` | Superato | `Acasystem-0.2.0-win-x64.zip`; dentro `node_modules/qrcode-generator`, `build/windows/src/setup/`, `generated-shell/setup.css` |
| Installatore | `crea-installer.ps1`, poi `/S /D=` in una cartella di prova | Superato | Installa `Client`, `Installatore` (script + supervisore) e `Disinstalla.exe` in pochi secondi, nessuna centrale creata. Versione finale `ACA-System-Setup-0.2.0.exe`, 115.529.097 byte, SHA-256 `e15365b5…9974`, in `backup/rep20261120-finestra/`, escluso da Git |
| Percorso completo reale | App dai sorgenti, profilo temporaneo, script installati dall'exe; Playwright clicca «Prepara la centrale» e «Apri Acasystem» | Superato | 13:45:57 controlli tutti verdi; download di 591 MB in circa 1 min; impronta ed estrazione 10 s; VM creata in 4 s; IP `192.168.1.67` trovato dal MAC in meno di 1 min; «La centrale è pronta» dopo 4 min di primo avvio; «Apri Acasystem» apre l'interfaccia della centrale (creazione del primo account). Con la versione precedente al controllo hardware |
| Controllo «Memoria e processore» | App ricompilata, schermata del benvenuto | Superato | «16 GB, 24 core» in verde |
| App installata con un profilo reale | — | Non eseguito | Il PC ha già il profilo `%APPDATA%\Acasystem` dell'app in uso: non toccato. L'app installata non usa le variabili di prova; il pacchetto è stato verificato per contenuto |
| Disinstallazione dopo la centrale creata dall'app | `Disinstalla.exe /S` della cartella di prova (richiesta dell'utente «Yes, remove it») | Superato | In 12 s rimossi VM `ACA-Centrale`, attività pianificata, cartella, collegamenti e voce di registro; `192.168.1.67` non risponde più |

## Controllo del diff e decisioni

- **Criteri:** i criteri 1-8 sono soddisfatti, salvo la prova dell'app installata con un profilo reale (vedi verifiche).
- **Aggiunte alla richiesta iniziale, entrambe dall'utente:** il controllo «Memoria e processore», chiesto durante il lavoro, e la correzione del download.
- **Deviazioni dallo schizzo:**
  - pulsante principale nello stile del guscio;
  - nella preparazione «Puoi ridurre a icona: ti avviso…» al posto di «Puoi chiudere», perché la notifica arriva solo con l'app aperta;
  - «Appena avviata» sotto il primo minuto.
- **Non modificati:** il modulo `ownedHaVm.ts`, l'app Android e la webapp.
- **Nuova dipendenza** del guscio: `qrcode-generator` 2.0.4, già nel progetto.
- **Limite noto:** se lo script fallisce dopo aver creato la cartella della centrale, «Riprova» non pulisce una VM a metà e indica di contattare l'assistenza. La pulizia automatica richiede una decisione.
- **Riferimenti:** ISSUE-168 punto 1 è risolto per la centrale su PC, con le fasi seguite dall'app; i punti 2 (schermata della centrale) e 3 restano aperti per il mini PC con la chiavetta.

## Chiusura e punto di ripresa

Completato il 2026-11-20. Prossimo passo: prova dell'utente con `ACA-System-Setup-0.2.0.exe` su un altro PC, da pubblicare o consegnare su richiesta. Nessun incarico resta attivo in questo report.
