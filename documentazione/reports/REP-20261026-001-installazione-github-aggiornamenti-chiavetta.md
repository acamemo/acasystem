# REP-20261026-001 — Installazione da GitHub, aggiornamenti automatici e chiavetta USB (piano)

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261026-001: **ricerca e piano** per installare Acasystem dal repository GitHub, aggiornare in automatico il sistema e preparare una chiavetta «HA OS + Acasystem». Prima di tutto valuta la proposta dell'utente («repository privato + password segreta dell'organizzazione»). Solo ricerca e scrittura di documenti. |
| Stato | **In attesa di input.** Il piano è scritto; le scelte sono nella sezione 5 (D-G1…D-G13). Nessuna tappa di realizzazione e nessuna prova sono autorizzate da questo report. |
| Data | 2026-10-26 (Europe/Rome) |
| Autore / modello | Report scritto da Claude Code (Opus 5.5, `claude-opus-5-5`). Ricerche preparatorie di quattro subagenti dello stesso flusso (temi «repository dell'app», «aggiornamenti», «chiavetta USB», «modifiche al progetto»); il loro modello non è indicato nei risultati. |
| Commit di partenza | `4e198c5cd2d01cd5d50ac3a28275a3f8b3d24808` (`master`, che segue `origin/main`). L'albero di lavoro ha modifiche non committate di altri flussi (0.9.28 e documenti): lasciate intatte. Nessun commit eseguito. |
| Richiesta di riferimento | Utente, 2026-10-26: «volevo far funzionare la questione che acasystem viene installato automaticamente direttamente dalla repo github all'installazione + aggiornamento automatico del sistema in più volevo creare una chiavetta di installazione OS + Aca». Poi: «allora se facessimo che dalla repo privata con una password segreta dell'organizzazione viene installato acasystem? Si può fare?». |
| Autorizzazione | Solo ricerca e scrittura: questo report e una riga in `reports/README.md`. Esclusi: codice, banco, Docker, VM `acasystem-ha`, tablet, GitHub (nessun repository, pacchetto, token o workflow creato); nessun download di immagini o eseguibili; nessuna credenziale usata. Decisione di base già presa dall'utente: **D-C1 = Home Assistant OS sul mini-PC con Acasystem come app** (2026-10-23, [REP-20261023-004](REP-20261023-004-confronto-installazione.md), sezione «Decisione dell'utente su D-C1»). |

**Come leggere le etichette**

- **[F]** fatto letto in una fonte primaria (documentazione ufficiale di Home Assistant o GitHub, codice dei repository ufficiali `home-assistant/*`) il 2026-10-26.
- **[D]** deduzione dai fatti: non è scritta così nelle fonti e non è provata.
- **[P]** proposta: lavoro futuro, non autorizzato.
- **[Da verificare]** non trovato o non provato: va controllato prima di contarci.

**Limite di metodo.** Le pagine web sono state lette con uno strumento che riassume: non sono citazioni testuali. Il codice del Supervisor è stato letto in parte sul ramo `main` e in parte al tag `2026.10.3`; l'ultimo rilascio è `2026.10.4` (2026-10-24), quindi qualche dettaglio può differire sulla versione installata. **Niente è stato provato su un sistema acceso.**

**Glossario minimo**

- **Supervisor**: il programma di Home Assistant OS che installa, sorveglia e aggiorna HA e le app.
- **App (ex add-on)**: programma aggiuntivo gestito dal Supervisor. Dal rilascio 2026.2 di HA «add-on» si chiama «app».
- **Repository di app**: un repository Git con un file `repository.yaml` e una cartella per app con `config.yaml`. È il «catalogo» che il Supervisor legge.
- **Immagine**: il programma Acasystem già costruito e pronto da scaricare (come oggi `aca-system:0.9.x` sul banco).
- **Registro (GHCR)**: il «magazzino» delle immagini; GHCR è quello di GitHub (`ghcr.io`).
- **Token / PAT**: una chiave al posto della password. Il PAT «classico» è il tipo di chiave personale di GitHub che GHCR accetta.
- **Account macchina**: un account GitHub separato, usato solo da programmi.
- **Chiavetta CONFIG**: chiavetta (o cartella) che Home Assistant OS legge all'avvio per rete e chiavi SSH.
- **Orchestratore**: un nostro script che gira su un altro computer (portatile del tecnico o PC del laboratorio) e configura il mini-PC via rete.

---

## Risposta breve (per chi non è tecnico)

1. **Si può fare, ma non esattamente come proposto.** Mettere la «password» dentro l'indirizzo del repository privato tecnicamente funzionerebbe quasi certamente, ma è una cattiva idea: la password resterebbe scritta in chiaro in più punti del mini-PC (anche nei registri e nelle risposte dei programmi), darebbe accesso a **tutto il codice sorgente** e, soprattutto, **cambiarla romperebbe l'app installata**: Home Assistant riconosce l'app dall'indirizzo, e se l'indirizzo cambia la considera un'altra app (con altri dati). [F codice, D esito]
2. **La forma che funziona bene è dividere in due.** [P]
   - Un **piccolo repository «solo pacchetto»**, anche pubblico: contiene solo la scheda dell'app (nome, versione, porta, impostazioni), **nessun codice e nessun segreto**. Il suo indirizzo non cambia mai.
   - L'**immagine** di Acasystem resta **privata** su GitHub (GHCR). Ogni mini-PC riceve una **chiave di sola lettura** per scaricare quell'immagine. Home Assistant ha un posto apposito per queste chiavi (i «registri»), non le mostra a nessuno e le si può **cambiare in ogni momento senza toccare l'app**. [F codice]
3. **«Password segreta dell'organizzazione»: non esiste in quella forma.** [F] I «segreti dell'organizzazione» di GitHub servono solo ai processi automatici di GitHub (Actions) e un mini-PC non li può leggere. Inoltre oggi `acamemo` è un **account personale**, non un'organizzazione (verificato con l'API di GitHub il 2026-10-26).
4. **Quale chiave.** [F] GHCR accetta solo il token **classico** con il permesso «leggere pacchetti» (`read:packages`). I token più moderni e limitabili di GitHub (a grana fine, GitHub App) **non** funzionano con le immagini. Quindi la chiave va limitata tramite l'account: [P] un **account macchina** che vede **solo** il pacchetto di Acasystem e nient'altro.
5. **Se qualcuno la ruba dal mini-PC** [D]: può scaricare l'immagine di Acasystem (che sul mini-PC c'è già) e niente altro: non legge il codice, non può pubblicare nulla, non vede altri clienti. Si revoca subito da GitHub. Effetto collaterale: finché non si mette la chiave nuova, quel mini-PC non riceve aggiornamenti (Acasystem continua però a funzionare).
6. **Attenzione alla licenza.** Acasystem deriva da Tunet ed è GPL-3.0: chi riceve il programma ha diritto al sorgente corrispondente ([REP-20261023-004](REP-20261023-004-confronto-installazione.md) §4.4). L'immagine privata protegge da **chi non è cliente**, non dal cliente. Serve un parere umano o legale (D-C6, ancora aperta). Se il parere dice di pubblicare, la strada più semplice è immagine pubblica e **nessuna chiave**.
7. **Aggiornamenti automatici.** [F] Home Assistant controlla da solo ogni 3 ore se c'è una nuova versione di Acasystem e, se l'aggiornamento automatico dell'app è acceso, la installa dopo almeno un giorno, **facendo prima un backup**. Il Supervisor si aggiorna da solo. **HA (Core) e il sistema operativo invece no**: vanno aggiornati con un comando. [P] Lo si può fare **di notte, con backup prima**, ma conviene installare solo versioni che abbiamo provato sulla VM. Se HA resta troppo indietro, smette di arrivare anche Acasystem (sezione 2.6).
8. **Chiavetta.** [F] Home Assistant OS non sa leggere una «password» o un'app dalla chiavetta: la chiavetta può scrivere il sistema sul disco e preparare rete e accesso SSH, ma **Acasystem e la chiave vanno installati dopo il primo avvio** da un nostro script via rete. [P] Il modo più sicuro: **preinstallare in laboratorio** e spedire il mini-PC pronto; la chiave non va mai scritta sulla chiavetta. Da pochi giorni esiste anche una chiavetta ufficiale di Home Assistant (ancora «alpha») da cui si può partire.
9. **Cosa non si può fare** [F]: scegliere da Home Assistant una versione **precedente** di Acasystem; avere un «canale beta» ufficiale per le app (si simula con un ramo separato); dare ad Acasystem un accesso ridotto a HA tramite il Supervisor (il token del Supervisor è sempre amministratore pieno).

---

## Obiettivo e perimetro

**Obiettivo:** rispondere alla proposta dell'utente e dare un piano a tappe, con le decisioni da prendere, per: (1) installare Acasystem sul mini-PC del cliente direttamente dal repository GitHub; (2) aggiornare in automatico Acasystem e il sistema; (3) creare una chiavetta «HA OS + Acasystem».

**Collegamenti:** [REP-20261023-004](REP-20261023-004-confronto-installazione.md) (D-C1 decisa; tappe A1-A8; domande D-C4…D-C15, in particolare D-C5, D-C6, D-C7, D-C10, D-C11, D-C15), [REP-20261023-003](REP-20261023-003-piano-aggiungi-dispositivi.md) (tappa I-P dell'installer, D1), [ADR-0009](../decisions/ADR-0009-home-assistant-dietro-acasystem.md), [ADR-0021](../decisions/ADR-0021-configurazione-dispositivi-da-acasystem.md), [ADR-0022](../decisions/ADR-0022-identita-di-servizio-dispositivi.md), REQ-15 in [product.md](../funzionalita/product.md) (kiosk del tablet).

**Escluso:** ogni modifica a codice, banco, Docker, VM, tablet, GitHub; ogni prova; ogni credenziale. Le modifiche non committate di altri flussi sono preservate (questo report tocca solo due file di documentazione).

## Criteri di completamento

1. Risposta motivata alla proposta «repository privato + password», con fonti e data. — Sezioni «Risposta breve» e 1.
2. Architettura proposta: repository dell'app, immagini, aggiornamenti di Acasystem, aggiornamenti di HA con backup e finestra notturna, chiavetta con protezioni contro la cancellazione del disco sbagliato. — Sezione 2.
3. Modifiche ad Acasystem per girare come app, con stima. — Sezione 3.
4. Tappe in ordine, con le prove possibili sulla VM `acasystem-ha` prima del mini-PC. — Sezione 4.
5. Decisioni chiuse per l'utente, con opzioni e una consigliata. — Sezione 5.
6. Rischi, limiti, fonti con data; distinzione [F]/[D]/[P]; fonti vecchie o in conflitto segnalate. — Sezioni 6 e 7.

---

## 1. La proposta «repository privato + password»: cosa succede davvero

### 1.1 Come il Supervisor legge un repository di app

- [F] Un repository di app è un repository Git con `repository.yaml` alla radice (obbligatorio solo `name`) e una cartella per ogni app con `config.yaml`. Il Supervisor lo **clona con Git** (profondità 1); va bene qualunque URL Git raggiungibile, anche fuori da GitHub; il ramo si sceglie con il suffisso `#ramo`. Si aggiunge dall'interfaccia, con `ha store add URL` o con `POST /store/repositories`.
- [F] La documentazione **non dice nulla** su repository privati o credenziali.
- [F codice] Il Supervisor non ha campi per credenziali Git: valida l'URL con l'espressione `^(?P<url>[^#\s]+)(?:#ramo)?$` e un controllo «è un URL», poi chiama `git clone` con l'URL così com'è. Nessun gestore di credenziali, nessuna chiave SSH.

### 1.2 Perché il token nell'URL è sconsigliato

Un indirizzo come `https://utente:TOKEN@github.com/acamemo/acasystem` **passa** la validazione e verrebbe usato da Git [D, non provato]. Indizio indiretto: il Supervisor 2026.07.5 toglie le credenziali dagli URL dei repository nei rapporti d'errore inviati a Sentry [F], quindi qualcuno li usa. I problemi:

| Problema | Fonte |
|---|---|
| Il token resta in chiaro nell'elenco dei repository del Supervisor (`/data/store.json`) e nella configurazione Git del clone | [F codice] `store/__init__.py`, `store/git.py`; [D] per la configurazione Git |
| Il Supervisor scrive l'URL intero nei log («Cloning … from …») e negli errori | [F codice] `store/git.py` |
| `GET /store/repositories` restituisce l'URL non mascherato: lo vede l'interfaccia admin e ogni app con ruolo `manager` | [F codice] `api/store.py` |
| L'URL finisce nel `backup.json` dei backup, nella parte **non cifrata** | [F codice, tag 2026.10.3] `backups/backup.py` |
| L'ID del repository è lo SHA-1 dell'URL (primi 8 caratteri) e l'ID dell'app è `<hash>_acasystem`: **cambiare il token cambia l'app**. Il Supervisor rifiuta di rimuovere un repository con app installate. Ruotare il token significherebbe reinstallare l'app e migrarne i dati. La documentazione dice di tenere l'URL stabile | [F codice] `store/utils.py`, `store/__init__.py`; [F] guida ai repository; [D] l'esito sulla rotazione |
| Il token di un repository dà accesso ai **sorgenti**, non solo al pacchetto | [F] documentazione dei PAT di GitHub. *Precisazione della verifica del 2026-10-26 (Claude Code):* vale per la proposta così com'è (repository privato **dei sorgenti**). [F] Un PAT a grana fine si può limitare a un solo repository con permesso di sola lettura e può non scadere; non funziona però da collaboratore esterno (va creato dal proprietario `acamemo`). [D] Con un repository privato **del solo pacchetto** il token non vedrebbe i sorgenti, ma restano tutti gli altri problemi di questa tabella, in particolare la rotazione che cambia l'ID dell'app |
| Un errore di autenticazione diventa un problema «repository corrotto», non «accesso negato» | [F codice] `store/git.py` |
| Senza la chiave `image`, il mini-PC **costruirebbe** Acasystem dal Dockerfile a ogni installazione e aggiornamento (oggi: compilazione di `better-sqlite3`, typecheck e build di frontend e Casa 3D): lento, fragile, tempi su N100 non misurati | [F] guida di pubblicazione; [F] `progetto/acasystem/Dockerfile`; [D] i tempi |
| Le alternative non servono: le chiavi di deploy SSH non hanno un posto nel Supervisor; i token di una GitHub App scadono dopo 1 ora | [F] codice del Supervisor; documentazione GitHub |

### 1.3 Il «segreto dell'organizzazione»

- [F] I segreti di organizzazione di GitHub sono variabili per i workflow di GitHub Actions; la documentazione non descrive alcun modo di leggerli da fuori. Non servono a consegnare una password a un mini-PC.
- [F] `https://api.github.com/users/acamemo` risponde `type: User` (account creato il 2026-10-23): oggi **non c'è un'organizzazione**. `acamemo/acasystem` risponde 404 senza credenziali, coerente con un repository privato.

**Conclusione** [P]: la proposta si realizza bene nella forma della sezione 2 (pacchetto senza segreti + immagine privata + chiave di sola lettura nei «registri» del Supervisor), non con il token nell'URL.

---

## 2. Architettura proposta [P]

### 2.1 Repository e immagini

```text
acamemo/acasystem            (PRIVATO, sorgenti, come oggi)
   └─ GitHub Actions su tag di rilascio
        ├─ costruisce l'immagine amd64 (aarch64 solo se servirà il Raspberry Pi)
        ├─ pubblica ghcr.io/acamemo/acasystem:<versione>   (pacchetto PRIVATO)
        └─ DOPO la pubblicazione aggiorna version nel repository del pacchetto

acamemo/acasystem-ha-app     (PUBBLICO, nessun sorgente né segreto)
   ├─ repository.yaml
   └─ acasystem/ config.yaml, CHANGELOG.md, DOCS.md, icone
        image: ghcr.io/acamemo/acasystem   (senza tag: il tag è version)

mini-PC del cliente (HA OS)
   ├─ registro ghcr.io con utente macchina + token read:packages
   ├─ repository: https://github.com/acamemo/acasystem-ha-app
   └─ app <hash>_acasystem, porta 3002, auto_update secondo D-G5
```

Fatti su cui si appoggia:

- [F] Con `image` in `config.yaml` il Supervisor **scarica** l'immagine con tag = `version` e non costruisce nulla; senza `image` costruisce sul dispositivo. La guida raccomanda l'immagine già pronta, multi-architettura, nome senza tag; `{arch}` resta un ripiego. `arch` ammette solo `amd64` e `aarch64`.
- [F] Ordine obbligatorio: **prima** pubblicare il tag dell'immagine, **poi** alzare `version`, altrimenti i clienti vedono un aggiornamento che non riescono a scaricare. Un tag non si sovrascrive né si cancella mai.
- [F] La pubblicazione prevista usa le azioni componibili del repository `home-assistant/builder` (`prepare-multi-arch-matrix`, `build-image`, `publish-multi-arch-manifest`, `cosign-verify`) con il `GITHUB_TOKEN` del workflow (`packages: write`, `id-token: write` per la firma Cosign). L'azione «tutto in uno» `home-assistant/builder` è deprecata. Ultimo rilascio del builder letto: 2026.09.0 (2026-09-14). [P] Fissare le azioni a un rilascio, non a un ramo.
- [F] Un pacchetto nuovo su GHCR è privato di serie; i permessi del pacchetto (Read/Write/Admin) si separano da quelli del repository togliendo l'ereditarietà.
- [F] Il Supervisor gestisce le credenziali dei registri: `POST /docker/registries` con `{ "ghcr.io": { "username": …, "password": … } }`, `GET` (restituisce solo i nomi utente), `DELETE /docker/registries/{host}`; CLI `ha docker registries add`. Le credenziali sono usate per scaricare le immagini delle app. Un `POST` con lo stesso host **sostituisce** la voce: cambiare la chiave non tocca l'app.

### 2.2 La «password»: quale e com'è fatta

| Tipo di chiave | Utilizzabile per le immagini GHCR? | Fonte |
|---|---|---|
| PAT classico con solo `read:packages` | **Sì**, unico tipo documentato | [F] docs GitHub «Working with the Container registry» |
| PAT a grana fine | No: «non accede ai Packages» | [F] docs GitHub sui PAT. Conflitto: alcuni utenti (discussione #38467, 2023) e una guida di terzi dicono che funziona; la fonte ufficiale prevale |
| Token di installazione di GitHub App | No: dura 1 ora; GHCR lo rifiuta al pull | [F] docs GitHub; [F, fonte non ufficiale] discussione #171423, attiva fino al 2026-09-08 |
| Segreto di organizzazione | No: solo per GitHub Actions | [F] docs GitHub Actions |
| Chiave di deploy SSH | No: il Supervisor non gestisce chiavi | [F] codice del Supervisor |

Forma consigliata [P]:

- un **account macchina** dedicato (account creato a mano; GitHub ammette gli account macchina [F]; ~~il testo dei Termini sul loro numero [Da verificare]~~ *Verifica del 2026-10-26 (Claude Code):* [F] Termini di servizio GitHub §B.3: una persona o entità legale può avere **un solo account gratuito** più **un solo account macchina gratuito**, usato solo per compiti automatici. [D] Va chiarito chi «possiede» `acamemo` rispetto all'account personale `Mattiapentagallo`: vedi domanda V-Q1 in fondo);
- **nessun accesso ai repository**; ruolo **Read solo sul pacchetto** `acasystem` (ereditarietà dal repository tolta);
- sull'account macchina, **un PAT classico per cliente**, con nome del cliente, scope **solo** `read:packages`. [D] Un account può avere più PAT classici, ognuno revocabile da solo; danno tutti lo stesso accesso (il numero massimo [Da verificare]);
- conservazione in un **gestore di password** aziendale, mai in Git né sulla chiavetta.

Vincoli da sapere [F]:

- Il PAT classico vale per **tutti** i pacchetti che l'account può leggere: il limite sta nei permessi dell'account, non nel token.
- Se l'organizzazione (quando ci sarà) **blocca i PAT classici**, i download falliscono con 403: un utente lo ha segnalato a maggio 2026.
- La scadenza dei PAT classici è facoltativa; un'organizzazione può imporre un massimo.
- GitHub **elimina i token non usati da un anno** (*Verifica del 2026-10-26 (Claude Code):* la pagina «Token expiration and revocation» dice che li **revoca** automaticamente, per PAT e token OAuth; stesso effetto): [D] un cliente che non scarica nulla per un anno perde la chiave in silenzio. [D] Il controllo degli aggiornamenti passa dal repository Git del pacchetto, non dal registro: la chiave è «usata» solo quando si scarica un'immagine.
- *Aggiunto dalla verifica del 2026-10-26 (Claude Code):* [F] GitHub revoca un token anche se compare in un repository o gist **pubblico** o se **chiunque** lo segnala all'API di revoca delle credenziali. [D] Chi estrae la chiave da un mini-PC può quindi farla revocare (blocco degli aggiornamenti, non accesso ai dati): con un PAT per cliente il danno resta su quel cliente; con un PAT unico (D-G4 b) su tutti.
- Con SAML SSO dell'organizzazione il token va autorizzato.

Alternative con chiavi davvero «per progetto» [F funzioni, D compatibilità non provata]: deploy token di **GitLab** (scope `read_registry`, non legati a una persona, scadenza facoltativa, revocabili uno a uno, anche nel piano gratuito); token di organizzazione di **Docker Hub** (limitabili a repository, solo piani Team o Business). Richiedono di pubblicare l'immagine su un'altra piattaforma.

### 2.3 Se qualcuno estrae la chiave dal mini-PC

- [F codice] Le credenziali sono in `/data/docker.json` del Supervisor, **in chiaro** (nessuna cifratura applicativa). L'API non restituisce mai la password.
- [D] Per leggerle servono il disco o una shell da amministratore sull'host (SSH di debug sulla porta 22222, spento di serie, oppure un'app con protezione disattivata). Se il disco dati di HA OS sia cifrato: [Da verificare], nessuna fonte trovata.
- [D] Con l'account macchina limitato a un pacchetto, chi ha la chiave può **solo scaricare le immagini di Acasystem** (tutti i tag) e consumare la banda. Non può scrivere, cancellare, leggere i sorgenti, la CI o i dati degli altri clienti. **Condizione:** l'immagine non deve contenere segreti (token di HA, chiavi, indirizzi di tunnel).
- [D] Revoca: si elimina **quel** PAT (effetto immediato). L'app installata continua a girare con l'immagine locale; aggiornamenti e nuovi download falliscono (`DockerRegistryAuthError` [F codice]) finché non si inserisce la chiave nuova. Falliscono anche il ripristino da backup su un disco nuovo e il riscaricamento dopo un reset dello spazio Docker.
- [F, tag 2026.10.3] Dal Supervisor 2026.03.3 le credenziali dei registri sono **incluse nei backup** (`supervisor.tar`, cifrato se il backup è cifrato). Al ripristino però l'ordine è: cartelle, HA, repository, **app (download dell'immagine)**, e **solo dopo** le credenziali. [D] Un backup «modello» ripristinato su un disco nuovo fallisce al download se la chiave non è già registrata. (Un'altra ricerca del flusso riteneva il contrario: vedi 6.3.)

### 2.4 Come si inserisce e come si cambia

**All'installazione** [F + P]:

- [F] La chiavetta o cartella `CONFIG` di HA OS importa solo: `network/` (NetworkManager), `modules/`, `modprobe/`, `udev/`, `authorized_keys` (accende l'SSH di debug sulla 22222), `timesyncd.conf`, pacchetti `.raucb`. **Non esiste un preseed del Supervisor**: niente repository, registri o app dalla chiavetta. Dopo il riavvio nessun nostro script gira sul mini-PC.
- [F] L'onboarding si fa via API: `POST /api/onboarding/users` senza autenticazione crea il proprietario, poi i passi `core_config`, `analytics`, `integration` con il token.
  - *Aggiunto dalla verifica del 2026-10-26 (Claude Code):* [F codice Core `onboarding/views.py`, ramo `dev`] `POST /api/onboarding/users` richiede `name`, `username`, `password`, `client_id`, `language` e restituisce un `auth_code`, non un token: l'orchestratore deve scambiarlo con `POST /auth/token` (passo mancante nell'elenco). Il passo riesce **una sola volta** e il codice non lo limita alla rete locale. [D] Finché l'onboarding non è fatto, **chiunque sulla stessa rete** può creare il proprietario prima di noi: è un motivo in più per installare in laboratorio (D-G10 a) e fare l'onboarding subito dopo il primo avvio.
- [F] Il comando WebSocket di HA `supervisor/api` inoltra **qualsiasi** chiamata al Supervisor per un utente amministratore.
- [P] Quindi l'**orchestratore**, su un PC della stessa rete, fa: onboarding → `POST /docker/registries` (ghcr.io) → `POST /store/repositories` → `POST /store/reload` → installazione `POST /store/addons/<hash>_acasystem/install` → opzioni (`boot: auto`, `watchdog: true`, `auto_update` secondo D-G5) → avvio → primo backup → prove di fumo. L'ID `<hash>` si calcola in anticipo: primi 8 caratteri dello SHA-1 dell'URL in minuscolo.
- [P] La chiave arriva dal gestore di password del PC dell'installatore e **non** compare sulla chiavetta, nei log dello script o nell'immagine.
- [P] Via alternativa: SSH sulla 22222 con chiave messa in `CONFIG`, poi `ha docker registries add …`. [Da verificare] che il comando `ha` sia disponibile in quella shell.

**Cambio su tutti i mini-PC** [F + P]:

- [F] Lo stesso `POST /docker/registries` sostituisce la chiave; nessuna disinstallazione, nessun cambio di ID.
- [D] Serve però **un modo per raggiungere ogni mini-PC** da remoto: oggi non c'è (D-C15, aperta).
- [P] Procedura con sovrapposizione: creare il token nuovo → inserirlo su tutti i dispositivi → verificare con un controllo degli aggiornamenti → solo allora revocare il vecchio.
- [F] Dare ad Acasystem il ruolo `manager` del Supervisor gli permetterebbe di cambiare la chiave da solo, ma `manager` copre anche `/store`, `/docker`, `/host`, `/os`, `/backups`: [P] sconsigliato, la rotazione la fa lo strumento dell'installatore.

### 2.5 Aggiornamenti di Acasystem

- [F codice `misc/tasks.py`] Il Supervisor ricarica il catalogo **ogni 3 ore** (`git fetch`), rilegge `version`; aggiorna le app **ogni 16 ore**, solo quelle con `auto_update` acceso (di serie spento). Salta l'app se l'aggiornamento attraversa una versione elencata in `breaking_versions`.
- [F] L'aggiornamento automatico aspetta **un giorno** dal momento in cui il `config.yaml` è stato scritto **su quel dispositivo** (data del file, non della release): [D] il primo aggiornamento arriva tra circa 24 e 40 ore dopo, ogni mini-PC per conto suo. Non è uno scaglionamento centrale.
- [F] Prima di aggiornare chiede a HA un **backup**. Se l'aggiornamento fallisce scrive solo un avviso: nessun nuovo tentativo e nessun ritorno indietro automatico.
- [F] Le app **non tornano indietro** da sole e l'API non permette di installare una versione precedente. [D] Tornare indietro = ripristinare il backup preso prima dell'aggiornamento, e serve che il tag vecchio esista ancora nel registro e che la chiave sia valida.
- [F] Un'app non può aggiornare se stessa tramite l'API del Supervisor.
- [P] Ritiro di una versione: prima che arrivi ai clienti, si riporta `version` alla precedente nel repository del pacchetto; dopo, si pubblica subito una versione nuova correttiva (si va avanti, non indietro); `breaking_versions` per le versioni che richiedono un intervento a mano.
- [F] Non esiste un canale beta per le app. Il ramo si sceglie con `#beta` nell'URL, ma **cambia l'ID dell'app**: si sceglie all'installazione e poi non si sposta.

### 2.6 Aggiornamenti di HA (Supervisor, Core, sistema operativo)

Fatti [F]:

- **Supervisor**: si aggiorna da solo (`auto_update` vero di serie, controllo ogni 24 ore); i plugin ogni circa 12 ore. **Va lasciato acceso**: il ricaricamento del catalogo delle app richiede che il Supervisor sia aggiornato, e che Core e OS siano «supportati». Core è «non supportato» oltre 2 anni dall'ultima versione; OS oltre 3 versioni maggiori indietro. **Se HA resta troppo indietro, Acasystem smette di aggiornarsi.** *Aggiunto dalla verifica del 2026-10-26 (Claude Code):* [F codice `updater.py`, `main`] anche lo scaricamento dell'elenco delle versioni (`fetch_data`) richiede Core e OS supportati: in quel caso **smette di aggiornarsi anche il Supervisor**, quindi non si esce dallo stallo senza un intervento su Core/OS. [F codice `misc/tasks.py`] L'aggiornamento automatico delle app passa da Core (comando WebSocket con `backup: true`): [D] se Core è fermo, le app non si aggiornano.
- **Core e OS**: nessun compito del Supervisor li aggiorna. Si aggiornano con le entità `update.*` e il servizio `update.install` (campi `version` e `backup`). Dal 2026.7 la pagina Aggiornamenti non ha «Aggiorna tutto» per Core, OS e Supervisor.
- **Ritorno indietro**: Core reinstalla da solo la versione precedente **solo** se la nuova non risponde (attese 10 + 15 minuti); i dati già migrati non tornano indietro. Un'integrazione rotta con l'interfaccia funzionante non viene rilevata. L'OS ha due slot A/B e torna a quello precedente se non si avvia.
- **Cadenza**: una versione di HA al mese più correzioni settimanali; le note elencano i «Backward-incompatible changes».
- **Backup**: con `backup: true` HA fa il backup prima; se il backup fallisce l'aggiornamento non parte [D dal flusso del codice]. Esistono sensori dello stato dei backup.

Proposta [P] (in dettaglio nella decisione D-G6):

- Supervisor sempre automatico.
- Core e OS **di notte** (finestra concordata, per esempio 03:00-05:00), con `backup: true`, **solo alla versione approvata** da noi dopo la prova sulla VM e almeno dopo la prima patch (`x.y.1` o `x.y.2`).
- La «versione approvata» deve arrivare al mini-PC. Strade: (i) il canale remoto di D-C15; (ii) l'elenco delle versioni approvate distribuito **con il pacchetto di Acasystem**, letto da un'automazione di HA o da Acasystem stesso. La (ii) fa chiamare `update.install` ad Acasystem con l'identità di servizio: amplia il suo ruolo e richiede un ADR.
- Avviso se l'ultimo backup riuscito è vecchio o se un aggiornamento fallisce.
- Backup conservati **anche fuori dal mini-PC** (la documentazione lo raccomanda); dove: da decidere.

### 2.7 Chiavetta USB «HA OS + Acasystem»

**Novità rispetto a REP-20261023-004** [F]: la PR #256 dell'installer ufficiale (`home-assistant/installer`, chiavetta live per generic x86-64) è stata **unita il 2026-10-23** (commit `befe0f2`); esiste il rilascio `0.0.0-alpha.4` (2026-10-23), pre-release. Funziona così:

- Alpine 3.24.2 e immagine HA OS stabile fissate con sha256, piccolo programma `hai-live`;
- funziona offline;
- propone solo dischi SATA/NVMe/eMMC interni da almeno 32 GB, nasconde la chiavetta, chiede di **digitare `erase`**, cancella le firme a inizio e fine disco, verifica l'immagine;
- collaudato solo su Dell OptiPlex 3020M (SATA) e Proxmox; NVMe ed eMMC non ancora;
- richiede UEFI, Secure Boot spento, SATA in AHCI;
- **non ha** modalità non presidiata né iniezione di configurazione (dal sorgente letto);
- licenza **Apache-2.0**: riusabile.

Altri fatti [F]: la guida ufficiale indica la scrittura del disco da un Linux live o con Etcher; dischi con settori da 512 byte (no 4Kn); Ethernet con Internet al primo avvio (il Supervisor scarica Core). Lo script `haos-config` di HA OS 18.3, se non trova una chiavetta `CONFIG`, legge la cartella `/mnt/boot/CONFIG` nella partizione di avvio e **la cancella** dopo l'importazione. Gli aggiornamenti dell'OS sono firmati: l'immagine HA OS va scritta **intatta**. Progetto della comunità «HAOS USB Creator» (AGPL-3.0, v1.2 del 2026-10-02): utile solo come riferimento; un utente segnala la rete non funzionante su un OnLogic HX310.

**Cosa fa la chiavetta** [P]:

1. Si avvia (UEFI), mostra il modello del mini-PC e i dischi.
2. Sceglie il disco **solo** fra quelli interni idonei (vedi protezioni).
3. Scrive l'immagine HA OS fissata e verificata (sha256 nel manifest della chiavetta).
4. Scrive nella partizione di avvio la cartella `CONFIG` con rete (solo se serve Wi-Fi o IP fisso) e la chiave pubblica SSH del laboratorio. [D] Così non serve una seconda chiavetta: da provare sulla VM.
5. Chiede di togliere la chiavetta e riavvia (evita il ciclo di reinstallazione).
6. Al primo avvio HA OS si espande e scarica Core. **L'orchestratore** (PC del laboratorio) trova il mini-PC e fa onboarding, chiave del registro, repository, installazione di Acasystem, opzioni, backup e prove (sezione 2.4).

**Contenuto della chiavetta** [P]: ISO Alpine fissata, immagine HA OS fissata (versione + sha256 in un manifest), programma di scrittura (fork leggero di `hai-live`), nessun segreto. Costruita in CI Linux come `.img`, scritta con Etcher o Rufus. Aggiornarla = cambiare versioni e checksum nel manifest e ricostruire.

**Protezioni contro la cancellazione del disco sbagliato** [P]:

- esclusi i dischi USB e quelli sotto la soglia di dimensione;
- modalità senza domande **solo** se c'è esattamente un disco interno idoneo **e** il disco è vuoto o contiene già HA OS (nessuna partizione estranea, per esempio Windows preinstallato);
- in ogni altro caso: elenco dei dischi con modello, numero di serie e dimensione, e conferma **digitando** le ultime cifre del numero di serie;
- verifica dell'immagine prima di scrivere e rilettura dopo;
- registro dell'operazione salvato sulla chiavetta (senza dati del cliente).

Il Secure Boot acceso (frequente su mini-PC con Windows) va spento nel BIOS: è un passo fisico, da fare in laboratorio.

---

## 3. Modifiche ad Acasystem per girare come app (stima)

Letto sul codice, nessuna modifica. Scala come in REP-20261023-004: **piccola** = una sessione; **media** = più sessioni con prove; **grande** = più giorni.

| Voce | Cosa cambia | Stima |
|---|---|---|
| Repository del pacchetto | `repository.yaml`, `config.yaml` (`image`, `version`, `arch: [amd64]`, `ports: 3002/tcp`, `watchdog` su `/api/health`, `backup: cold`, `boot: auto`, `startup: application`, `ingress: false`, `homeassistant_api` secondo D-G9), `CHANGELOG.md`, `DOCS.md`, icone | Piccola |
| Dockerfile | Restano i due stadi; si aggiungono `ARG/ENV ACASYSTEM_VERSION` anche nello stadio finale ed etichette. [F] Oggi la versione c'è solo nello stadio di build e il compose la passa a runtime; il Supervisor non la inietta. Senza questa modifica `/api/health` mostrerebbe `0.1.0` | Piccola |
| Avvio | Piccolo programma che, se esiste `/data/options.json`, imposta `DATA_DIR=/data` e l'indirizzo interno di HA; sul banco Docker non cambia nulla | Piccola, con test |
| Indirizzo di HA | Da `host.docker.internal:8123` a `http://homeassistant:<porta>` (rete interna `172.30.32.0/23`, Core a `172.30.32.1` [F]). [F ADR-0009, nota non verificata] Con il Supervisor Core può ascoltare sulla **80**: la porta va letta, non presunta | Piccola + prova sulla VM |
| Identità verso HA | Due strade: (1) utente «Acasystem (servizio)» di ADR-0022, con il file segreto **fuori** dai backup di HA (`backup_exclude` o percorso dedicato); (2) `SUPERVISOR_TOKEN`, cioè l'alternativa scartata in ADR-0022 (amministratore pieno, nessun utente visibile). Vedi D-G9 | Piccola/media (1); media + nuovo ADR (2) |
| Dati | `tunet.db` (SQLite WAL, con le immagini della Casa 3D) in `/data`; `backup: cold` per una copia coerente; migrazione dei dati del banco con copia a freddo | Piccola |
| Accesso dal tablet | Porta diretta 3002, non ingress. [F] Il frontend usa già percorsi relativi; l'unico assoluto è `fetch('/api/health')` in `AboutSection.tsx`, che alla radice funziona. Il supporto ingress del server resta spento | Nessuna modifica per la porta diretta |
| PWA a schermo intero | [F MDN] Service worker e installazione richiedono HTTPS (o localhost): su `http://<IP>:3002` la PWA non si installa. Strade: HTTPS sul mini-PC oppure kiosk (Fully Kiosk o APK Capacitor, REQ-15). Non verificato sul Lenovo Tab M11. Vedi D-G12 | Media/grande (HTTPS); da valutare (kiosk) |
| Limiti per indirizzo | [D] Se Node vede un solo indirizzo per tutti i tablet (gateway Docker), i limiti di login e WebSocket diventano condivisi | Piccola, da verificare sulla VM |
| CI e immagine | Workflow su tag: build `amd64`, firma Cosign, push GHCR privato, controllo «tag = `version` = `ACASYSTEM_VERSION`», poi aggiornamento del repository del pacchetto. Oggi il progetto non ha CI | Media |
| Banco attuale | `compose.tunet.yaml`, `DATA_DIR=/app/data`, proxy `/ha` invariati; non regressione con le suite esistenti | Piccola |

---

## 4. Tappe in ordine e prove sulla VM [P]

Le tappe G integrano le A1-A8 di REP-20261023-004 (A2 ≈ G2, A3 ≈ G3, A5 ≈ G6, A6 ≈ G8, A8 ≈ G10) e la tappa I-P di REP-20261023-003. Nessuna è autorizzata.

| Tappa | Contenuto | Dove si prova | Dimensione | Dipende da |
|---|---|---|---|---|
| G0 | Risposte a D-G1…D-G13 e D-C6 (parere GPL); ADR sulla distribuzione, da accettare dall'utente | — | Utente | — |
| G1 | Prove con un'**app di prova minima** (non Acasystem): pacchetto pubblico di prova + immagine privata di prova su GHCR + account macchina di prova | VM `acasystem-ha` con snapshot prima di ogni prova (oppure un clone, per non disturbare D1) | Media | G0, autorizzazione a creare repository, pacchetto e token **di prova** |
| G2 | Acasystem come app: Dockerfile, avvio, indirizzo di HA, identità (D-G9), dati in `/data` | PC (suite) + VM come app locale | Media | G1 superata |
| G3 | CI GitHub Actions → GHCR privato, firma, controlli di versione | GitHub | Media | G2, D-G3 |
| G4 | Repository del pacchetto pubblico, ramo `beta` per banco e VM (D-G7) | GitHub + VM | Piccola | G3 |
| G5 | Account macchina definitivo, PAT per cliente, custodia, procedura scritta di rotazione e revoca | GitHub, gestore di password | Piccola | G0 (D-G2, D-G4) |
| G6 | Orchestratore: onboarding, registro, repository, installazione, opzioni, backup, automazione notturna di HA, prove di fumo | VM (da snapshot «HA appena installato») | Media | G4, G5, D-C5 |
| G7 | Prova completa con Acasystem vero sul canale beta: aggiornamento, rotazione, revoca, ripristino | VM | Media | G6 |
| G8 | Chiavetta: fork di `hai-live` o installer ufficiale + `CONFIG` in `/mnt/boot` | VM VirtualBox (avvio da ISO, disco virtuale vuoto) e un disco di scarto | Grande, rischiosa | D-G8, D-C10 |
| G9 | Prova sul mini-PC N100 reale e sul Dell: Secure Boot, NVMe, rete, blackout, watchdog | Hardware | Piccola con hardware | G7, G8, autorizzazione |
| G10 | Manutenzione: versione approvata di HA, prove di regressione a ogni Supervisor, avvisi, rotazione annuale della chiave | Banco + VM | Continua | D-G6, D-C15 |

**Prove sulla VM prima del mini-PC** (G1, G6, G7, G8; nessuna eseguita):

| Prova | Cosa verifica | Esito atteso da confermare |
|---|---|---|
| PV1 | Installazione e aggiornamento di un'app con immagine privata e credenziali in `/docker/registries` | Scarica e aggiorna senza altri passaggi; il controllo del manifest anonimo non blocca |
| PV2 | Sostituzione della chiave con `POST` sullo stesso host e aggiornamento successivo | Nessun cambio di ID dell'app |
| PV3 | Chiave revocata | L'app gira; l'aggiornamento fallisce con un errore leggibile; comportamento a metà aggiornamento |
| PV4 | Backup e ripristino su un sistema vuoto, con e senza chiave registrata prima | Conferma dell'ordine «app prima delle credenziali» (6.3) |
| PV5 | `POST /docker/registries` via WebSocket `supervisor/api` con il token del proprietario | Accettato |
| PV6 | `auto_update` dell'app, attesa di un giorno, backup prima; `breaking_versions`; effetto di `--auto-update false` del Supervisor sullo stato «non supportato» | Come nel codice |
| PV7 | Porta di Core vista dall'app (80 o 8123), indirizzo del tablet visto da Node, `backup: cold` su `tunet.db` | Da misurare |
| PV8 | Cartella `CONFIG` nella partizione di avvio scritta subito dopo l'immagine | Importata e cancellata al primo avvio |
| PV9 (facoltativa) | URL con token di un repository di prova | Solo per confermare i rischi della sezione 1.2; si può saltare |

---

## 5. Decisioni per l'utente

Opzioni non in ordine di preferenza; la consigliata è indicata. Prefisso nuovo D-G per non riusare numeri.

- **D-G1. Come si installa Acasystem dal repository**
  - (a) Repository privato dei sorgenti con token nell'URL.
  - (b) **Repository pubblico solo per il pacchetto + immagine privata su GHCR + chiave di sola lettura nei registri del Supervisor.** *(consigliata, se si vuole l'immagine privata)*
  - (c) Repository del pacchetto e immagine pubblici, nessuna chiave. È la più semplice; da riconsiderare se il parere sulla GPL-3.0 (D-C6) lo indica.
- **D-G2. Proprietario su GitHub**
  - (a) **Creare un'organizzazione GitHub dell'azienda** che possieda repository, pacchetto e account macchina, con regole sui token. *(consigliata; costi e posti dell'account macchina [Da verificare]; l'organizzazione non deve bloccare i PAT classici)*
  - (b) Restare sull'account personale `acamemo` e invitare l'account macchina al solo pacchetto.
- **D-G3. Costruzione delle immagini con GitHub Actions su GHCR** (richiede autorizzazione a creare workflow e pacchetti)
  - (a) **Sì, su tag di rilascio del repository privato, con `GITHUB_TOKEN`, azioni fissate a un rilascio.** *(consigliata; costo dei minuti di Actions per repository privato [Da verificare])*
  - (b) Costruzione sul PC e invio a mano con un token di scrittura.
  - (c) Non ora.
- **D-G4. Chiavi per i clienti**
  - (a) **Un PAT per cliente (stesso account macchina), revocabile da solo.** *(consigliata)*
  - (b) Un PAT unico per tutti: meno da gestire, ma se trapela va cambiato su tutti i mini-PC.
  - (c) Spostare le immagini su GitLab con deploy token per progetto.

  E la scadenza:
  - (a) **Nessuna scadenza finché non esiste il canale remoto (D-C15), con almeno un aggiornamento all'anno; poi un anno con rotazione sovrapposta.** *(consigliata)*
  - (b) Un anno da subito (serve andare da ogni cliente per la rotazione).
- **D-G5. Aggiornamento automatico di Acasystem sui mini-PC dei clienti** (precisa D-C7)
  - (a) **Acceso, con backup prima (comportamento di serie del Supervisor), dopo che la versione ha girato sul canale beta del banco.** *(consigliata)*
  - (b) Acceso solo su alcuni clienti pilota; gli altri aggiornati da noi dopo l'esito.
  - (c) Solo a mano.
- **D-G6. Aggiornamento di HA (Core e sistema operativo)** (precisa D-C7)
  - (a) Solo Acasystem automatico; Core e OS a mano dall'installatore. Il Supervisor resta comunque automatico.
  - (b) Core e OS automatici di notte con backup, qualunque nuova versione dopo un'attesa (per esempio 7 giorni e almeno la patch `.1`).
  - (c) **Core e OS automatici di notte con backup, ma solo alla versione approvata da noi dopo la prova sulla VM.** *(consigliata come obiettivo; richiede la scelta del canale per la «versione approvata», sezione 2.6; fino ad allora vale la (a))*
- **D-G7. Canale beta per il banco**
  - (a) **Ramo `beta` del repository del pacchetto, installato solo su banco e VM** (ID d'app diverso, dati propri), con aggiornamento automatico acceso. *(consigliata; il banco deve diventare un'app nella VM: tocca D-C11)*
  - (b) Nessun canale beta: si prova a mano sulla VM prima di alzare `version`.
- **D-G8. La chiavetta può cancellare il disco senza conferma?** (precisa D-C10)
  - (a) **Sempre con conferma, digitando le ultime cifre del numero di serie del disco.** *(consigliata per la prima versione)*
  - (b) Senza conferma solo se c'è un unico disco interno idoneo, vuoto o già con HA OS; altrimenti conferma.
  - (c) Mai conferma. *(sconsigliata)*

  E la base della chiavetta:
  - (a) **Fork leggero di `hai-live` (Apache-2.0)** che aggiunge le protezioni e la cartella `CONFIG`. *(consigliata)*
  - (b) Installer ufficiale (alpha) così com'è, più `CONFIG` e orchestratore.
  - (c) Scrittura a mano come la guida ufficiale.
- **D-G9. Identità di Acasystem verso HA dentro l'app**
  - (a) **Mantenere l'utente «Acasystem (servizio)» di ADR-0022, con il file segreto fuori dai backup di HA.** *(consigliata: è la decisione già accettata)*
  - (b) Usare `SUPERVISOR_TOKEN`: niente file né attivazione, ma amministratore pieno senza utente visibile. Serve un nuovo ADR che superi ADR-0022.
- **D-G10. Dove si installa**
  - (a) **In laboratorio: il mini-PC esce già pronto e la chiave non lascia l'ufficio.** *(consigliata)*
  - (b) Dal cliente, con il portatile del tecnico.
- **D-G11. Prove**: autorizzi G1 (app di prova, pacchetto, immagine e account macchina **di prova**) sulla VM `acasystem-ha` con snapshot, o su un suo clone per non disturbare D1?
  - (a) **Sì, su un clone della VM.** *(consigliata)*
  - (b) Sì, sulla VM di D1 con snapshot.
  - (c) Non ora.
- **D-G12. Schermo intero sul tablet** (emerso dalla ricerca)
  - (a) **Kiosk (Fully Kiosk o APK Capacitor, già previsto da REQ-15), da provare sul Tab M11.** *(consigliata come prima prova)*
  - (b) HTTPS sul mini-PC con certificato accettato dal tablet.
- **D-G13. Rotazione e revoca della chiave su tutti i mini-PC**
  - (a) **Dallo strumento dell'installatore tramite il canale remoto di D-C15.** *(consigliata)*
  - (b) Acasystem con ruolo `manager` del Supervisor che scarica la chiave nuova da un nostro servizio. *(sconsigliata: troppi poteri all'app)*

Restano aperte da REP-20261023-004 e collegate a questo piano: **D-C5** (password del proprietario), **D-C6** (parere GPL-3.0), **D-C11** (banco come app), **D-C15** (canale remoto).

**Annotazione del 2026-10-26 (Claude Code, Opus 5.5, chat dell'app client): risposte dell'utente.** Testo dell'utente in risposta ai punti proposti:
- **D-G1: «pubblica»** → (c), pacchetto e immagine pubblici, nessuna chiave;
- **D-C6: «va bene»** → i sorgenti GPL-3.0 si rendono disponibili, con il modo da scegliere (Q-S1 di REP-20261026-005);
- **D-G2: «restare»** → (b), si resta su `acamemo`.

**Conseguenze:** decadono D-G4, D-G13, la tappa G5, le prove PV1-PV4 e la parte chiavi delle sezioni 2.2-2.4. L'orchestratore di §2.4 diventa l'app client (REP-20261026-002). Il repository del pacchetto proposto è `acamemo/acasystem-releases`, già pubblico, al posto di `acasystem-ha-app`. Piano unico in [REP-20261026-005](REP-20261026-005-configurazione-automatica-mini-pc.md). Le altre domande D-G restano aperte.

---

## 6. Rischi e limiti

### 6.1 Rischi

| Rischio | Effetto | Riduzione [P] |
|---|---|---|
| Chiave scaduta, revocata o eliminata per un anno di inattività | Il mini-PC non si aggiorna e non si ripristina su disco nuovo | Promemoria, rotazione sovrapposta, almeno un rilascio all'anno, prova PV3 |
| L'organizzazione blocca i PAT classici | Tutti i download falliscono (403) | Regola scritta nell'ADR; nessuna politica che li vieti |
| HA lasciato indietro (Core > 2 anni, OS > 3 versioni maggiori) o Supervisor non aggiornato | Il catalogo non si ricarica e Acasystem non si aggiorna più | D-G6, avviso sullo stato |
| Aggiornamento di HA che rompe un'integrazione | Core non torna indietro da solo se l'interfaccia risponde | Versione approvata, backup prima, finestra notturna |
| Versione di Acasystem difettosa | Nessun ritorno automatico | Canale beta, `breaking_versions`, correzione rapida, backup |
| Cancellazione del disco sbagliato | Perdita dei dati del cliente | Protezioni di 2.7, preinstallazione in laboratorio |
| Secure Boot acceso, NVMe 4Kn, RAID/RST/VMD, scheda di rete senza driver nell'installer | La chiavetta non installa | Preparazione in laboratorio, prova G9 |
| Il Supervisor cambia le rotte `/addons` → `/apps` | Lo script si rompe | Strato che isola i percorsi; prova a ogni nuova versione (A8/G10) |
| Quota di GHCR | [F] Pagina di fatturazione: «registro container gratuito» ma anche 500 MB / 1 GB di trasferimento al mese nel piano Free per i pacchetti privati, frasi non riconciliate | Ricontrollare prima della consegna; dimensione dell'immagine da misurare |
| Segreti finiti nell'immagine | La chiave estratta darebbe accesso a quei segreti | Controllo in CI: nessun token o chiave nell'immagine |
| Licenza GPL-3.0 | L'immagine privata non esonera dall'offrire il sorgente | Parere D-C6 |
| *Aggiunto dalla verifica del 2026-10-26 (Claude Code):* chiave pubblica SSH **del laboratorio** messa in `CONFIG` (2.7 passo 4) | [F codice HA OS 18.3 `haos-config`] la chiave viene copiata per root e l'SSH di debug sulla 22222 resta acceso anche dopo la cancellazione di `/mnt/boot/CONFIG`. [D] Una sola chiave del laboratorio su tutti i mini-PC = accesso root all'host di ogni cliente (e alla chiave GHCR) per chi ottiene la chiave privata | [P] togliere la chiave a fine installazione oppure una chiave per dispositivo; decisione da aggiungere (V-Q2) |
| *Aggiunto dalla verifica del 2026-10-26 (Claude Code):* onboarding non ancora fatto | [F] `POST /api/onboarding/users` è senza autenticazione; [D] chiunque sulla rete può diventare proprietario | Onboarding in laboratorio subito dopo il primo avvio (D-G10 a) |
| *Aggiunto dalla verifica del 2026-10-26 (Claude Code):* chiave estratta e segnalata a GitHub o pubblicata | [F] revoca automatica; [D] quel mini-PC non si aggiorna più | Un PAT per cliente (D-G4 a), sorveglianza dei download falliti |
| *Aggiunto dalla verifica del 2026-10-26 (Claude Code):* backup conservati fuori dal mini-PC | [F] le credenziali dei registri sono nel `supervisor.tar` del backup; [D] la chiave lascia il mini-PC insieme ai backup, in chiaro se il backup non è cifrato | Backup sempre cifrati; [Da verificare] la cifratura di serie dei backup automatici |

### 6.2 Limiti

- Nessuna prova su un sistema acceso: comportamento di URL con token, registri, rotazione, revoca, ripristino, `CONFIG` in `/mnt/boot` e orchestratore sono [F] da codice o documentazione, oppure [D].
- Codice del Supervisor letto su `main` e al tag 2026.10.3, non al tag in uso sul banco; Core letto al tag 2026.10.2 e sul ramo `dev`; HA OS al tag 18.3.
- Pagine web lette con uno strumento che riassume; le pagine di documentazione non riportano data o versione (si usano la data dell'ultimo commit della documentazione, 2026-10-07, e i tag di rilascio).
- Non verificati: ~~termini GitHub sugli account macchina~~ (verificati il 2026-10-26, vedi 2.2), numero massimo di PAT classici (la documentazione indica solo 50 PAT a grana fine per account), posto a pagamento dell'account macchina, cifratura del disco dati di HA OS, firma indipendente dell'immagine HA OS (c'è solo il digest sha256 dell'asset GitHub), modello esatto del mini-PC.

### 6.3 Fonti vecchie, in conflitto o discordanze tra le ricerche

1. **«Add-on» → «app»** [F]: dal rilascio 2026.2 (2026-02-04), solo nel nome. La documentazione per sviluppatori è passata da `developers.home-assistant.io` a `contributors.home-assistant.io` (redirect 301): i link di REP-20261023-004 sono vecchi ma reindirizzati. L'API del Supervisor resta `/addons` e `/store/addons`; le rotte `/apps` (v2) sono dietro il flag `supervisor_v2_api` e «stanno ancora cambiando». Dal Supervisor 2026.07.4 i container si chiamano `app_` invece di `addon_`, con compatibilità. Le chiavi legacy (`addons`, `addon_config`) sono accettate con avviso. Il sorgente di `repository.md` e la pagina pubblicata descrivono l'interfaccia con parole diverse.
2. **REP-20261023-004 è superato su due punti** [F]: la PR #256 dell'installer non è più aperta ma unita (2026-10-23); il Supervisor più recente è 2026.10.4, non 2026.10.3. Confermato invece il suo «da verificare» (§4.1): un'immagine privata richiede credenziali di registro su ogni Supervisor, e per il repository Git privato non c'è un meccanismo.
3. **Token a grana fine su GHCR**: la documentazione ufficiale dice no; discussioni della comunità e una guida di terzi dicono che a volte funziona. Si assume no.
4. **Credenziali dei registri nei backup**: una ricerca riteneva «probabilmente no»; un'altra, al tag 2026.10.3 con i commit #6674 e #7218, ha letto «sì, dal 2026.03.3, ripristinate dopo le app». Il report segue la seconda; resta da provare (PV4).
5. **Uso delle credenziali per il manifest**: due ricerche lo leggono in `docker/manifest.py`, una afferma che il manifest (solo per la barra di avanzamento) è chiesto senza credenziali e che l'errore non è bloccante. Da provare (PV1).
6. **Un token per cliente**: una ricerca riteneva che servisse un account per cliente. [D] Più PAT classici sullo stesso account sono possibili e revocabili uno a uno; danno tutti lo stesso accesso. Il numero massimo [Da verificare].
7. **`acamemo` organizzazione**: alcune ricerche lo davano per organizzazione; l'API GitHub dice account personale.
8. **Fatturazione GHCR**: due frasi non riconciliate (6.1).
9. **README del builder** datato: indica come ultimo rilascio 2026.02.1 e dice che la vecchia azione «sarà rimossa», mentre le note 2026.06.0 dicono che è già rimossa.

---

## 7. Fonti (consultate il 2026-10-26)

**Home Assistant, documentazione**

- https://contributors.home-assistant.io/apps/guides/repository/ (sorgente: https://raw.githubusercontent.com/home-assistant/developers.home-assistant/master/docs/apps/repository.md)
- https://contributors.home-assistant.io/apps/guides/publishing/
- https://contributors.home-assistant.io/apps/reference/configuration/ (sorgente `docs/apps/configuration.md`, ultimo commit della cartella `docs/apps` 2026-10-07)
- https://contributors.home-assistant.io/apps/reference/environment/ ; https://contributors.home-assistant.io/apps/guides/options/
- https://contributors.home-assistant.io/apps/guides/communication/ ; https://contributors.home-assistant.io/apps/guides/ingress/
- https://contributors.home-assistant.io/apps/supervisor-api/
- https://contributors.home-assistant.io/os/operating-system/configuration/ ; …/debugging/ ; …/networking/ ; …/generic/ ; …/partitions/ ; …/update-system/
- https://www.home-assistant.io/installation/generic-x86-64/
- https://www.home-assistant.io/more-info/dockerhub-rate-limit (finestra «Registri»; link di feedback alla 2026.10.4)
- https://www.home-assistant.io/common-tasks/os/ ; https://www.home-assistant.io/integrations/hassio/ ; https://www.home-assistant.io/integrations/backup/ ; https://www.home-assistant.io/actions/hassio.backup_full/
- https://www.home-assistant.io/blog/2026/02/04/release-20262/ ; https://www.home-assistant.io/blog/2026/07/01/release-20267/ ; https://frenck.dev/renaming-home-assistant-add-ons-to-apps/ (proposta del 2025-11-01)

**Home Assistant, codice** (`https://github.com/home-assistant/...`)

- `supervisor`, ramo `main` e tag `2026.10.3`: `supervisor/validate.py`, `store/git.py`, `store/validate.py`, `store/__init__.py`, `store/repository.py`, `store/utils.py`, `store/data.py`, `api/__init__.py`, `api/store.py`, `api/docker.py`, `api/apps.py`, `api/proxy.py`, `api/middleware/security.py`, `docker/interface.py`, `docker/manager.py`, `docker/manifest.py`, `apps/app.py`, `apps/build.py`, `misc/tasks.py`, `updater.py`, `homeassistant/core.py`, `backups/backup.py`, `backups/manager.py`, `resolution/evaluations/*`, `const.py`. Rilasci: https://github.com/home-assistant/supervisor/releases (2026.07.4, 2026.07.5, 2026.08.0, 2026.09.0, 2026.10.4 del 2026-10-24).
- `core`, tag `2026.10.2` e ramo `dev`: `components/hassio/websocket_api.py`, `hassio/update.py`, `hassio/update_helper.py`, `update/services.yaml`, `onboarding/views.py`, `backup/onboarding.py`. Ultimo rilascio 2026.10.4 (2026-10-24).
- `operating-system`, tag `18.3` (2026-09-17): `buildroot-external/rootfs-overlay/usr/sbin/haos-config`; `Documentation/configuration.md`. 18.4.rc1 del 2026-10-20.
- `cli`, ramo `master` (5.6.0 del 2026-10-20): `cmd/store_repositories_add.go`, `cmd/docker_registries_add.go`, `cmd/supervisor_options.go`.
- `installer`: PR https://github.com/home-assistant/installer/pull/256 (unita il 2026-10-23, `befe0f2`), rilascio `0.0.0-alpha.4`, `crates/hai-live/src/{main,safety,drives}.rs`, `crates/hai-core/src/live_usb/downloads.rs`.
- `builder`: https://github.com/home-assistant/builder e i suoi rilasci (2026.09.0, 2026.06.0, 2026.03.2).

**GitHub, documentazione**

- https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- https://docs.github.com/en/packages/learn-github-packages/about-permissions-for-github-packages ; …/configuring-a-packages-access-control-and-visibility
- https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
- https://docs.github.com/en/organizations/managing-programmatic-access-to-your-organization/setting-a-personal-access-token-policy-for-your-organization
- https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app
- https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys (account macchina) ; https://docs.github.com/en/get-started/learning-about-github/types-of-github-accounts
- https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions
- https://docs.github.com/en/billing/concepts/product-billing/github-packages
- API: https://api.github.com/users/acamemo (`type: User`), https://api.github.com/repos/acamemo/acasystem (404 anonimo)

**Altre fonti** (secondarie o di altri fornitori)

- https://docs.gitlab.com/user/project/deploy_tokens/ ; https://docs.docker.com/security/access-tokens/
- https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers ; https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
- Discussioni della comunità GitHub (non ufficiali): https://github.com/orgs/community/discussions/38467 ; …/171423 ; …/177617
- Comunità HA (non ufficiali): https://community.home-assistant.io/t/haos-usb-creator-an-aio-installer-for-ha-for-generic-x86-64-pcs/1010287 ; https://github.com/Xalies/HAOS-USB-Creator ; https://github.com/poeschl/hassio-addons
- Stampa: https://www.notebookcheck.net/Home-Assistant-adds-new-USB-installer-that-could-make-setting-up-mini-PCs-easier.1433620.0.html

**File del repository letti:** `progetto/acasystem/Dockerfile`; `backend/src/config/env.ts`, `config/version.ts`, `server.ts`, `middlewares/homeAssistantAuth.ts`, `middlewares/ingressPath.ts`, `middlewares/rateLimit.ts`, `models/database.ts`; `frontend/vite.config.js`, `src/api/haUrl.ts`, `src/main.tsx`, `src/pages/system/sections/AboutSection.tsx`, `public/manifest.json`; `backup/d1/patch/d1-server.diff` (non applicato); ADR-0009, ADR-0021, ADR-0022; REP-20261023-004.

---

## Avanzamento e modifiche

- Raccolti i risultati delle quattro ricerche del flusso; riconciliate le discordanze (6.3).
- Scritto questo report e aggiunta una riga in `reports/README.md`. Nessun altro file toccato; nessuna modifica a codice, banco, Docker, VM, tablet o GitHub.
- Nessuna proposta è stata applicata o promossa ad approvata.

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Numero libero del report | `ls documentazione/reports` subito prima di scrivere | Superato | Nessun file `REP-20261026-*` presente: usato 001 |
| Coerenza con D-C1 e REP-20261023-004 | Lettura delle sezioni 5.1, 9 e «Decisione dell'utente su D-C1» | Superato | Tappe A1-A8 e domande D-C richiamate; nessun ID riusato (prefisso nuovo D-G) |
| Prove PV1-PV9 | Previste sulla VM | Non eseguito | Richiedono autorizzazione (D-G11) |
| Comportamento reale di Supervisor, registri, chiavetta | — | Non eseguito | Solo codice e documentazione |

## Controllo del diff e decisioni

- Il diff contiene solo questo report e la riga dell'indice, come chiesto.
- Nessun ADR creato o modificato. La distribuzione via GHCR, la versione approvata di HA e l'eventuale cambio di identità (D-G9 b) richiedono decisioni umane e, per la parte architetturale, un ADR da accettare.
- Conflitto da registrare quando si decide: D-G9 (b) supererebbe ADR-0022; D-G6 (c) amplierebbe il ruolo di Acasystem.

## Chiusura e punto di ripresa

- **Lavoro aperto:** le risposte a D-G1…D-G13 e a D-C5, D-C6, D-C11, D-C15.
- **Prossimo passo dentro l'incarico:** nessuno; il piano è consegnato.
- **Primo passo proposto, se autorizzato:** G1, prove con un'app di prova su un clone della VM `acasystem-ha` (D-G11).
- Nessun incarico di realizzazione resta attivo da questo report. `project-status.md` non è stato aggiornato perché l'incarico del flusso limitava le modifiche a questo report e all'indice.

## Rettifiche successive

### Verifica del 2026-10-26 (Claude Code, verifica avversaria dello stesso flusso)

**Metodo.** Per ogni affermazione tecnica importante si è cercato di smentirla rileggendo le fonti primarie il 2026-10-26: codice di `home-assistant/supervisor` sul ramo `main` (ultimo rilascio 2026.10.4 del 24 ottobre), `home-assistant/core` ramo `dev`, `home-assistant/operating-system` tag 18.3, PR #256 di `home-assistant/installer`, guide `contributors.home-assistant.io` (repository, publishing), note di rilascio HA 2026.2 e 2026.7, documentazione GitHub (permessi dei pacchetti, PAT, scadenza e revoca dei token, fatturazione dei pacchetti, Termini di servizio). Stesso limite di metodo del report: pagine lette con uno strumento che riassume; niente provato su un sistema acceso. Nessuna modifica a codice, banco, VM, tablet o GitHub.

**Confermate senza cambi** [F]: validazione dell'URL del repository (`RE_REPOSITORY` in `validate.py`) e `git clone` con l'URL così com'è, profondità 1, nessun gestore di credenziali né mascheramento nei log (`store/git.py`); ID = primi 8 caratteri dello SHA-1 dell'URL in minuscolo (`store/utils.py`); rifiuto di rimuovere un repository con app installate; la guida ai repository dice di tenere l'URL stabile e che `#ramo` dà app con ID diverso; `GET /store/repositories` restituisce l'URL senza mascheramento; elenco dei repository nel `backup.json` non cifrato; credenziali dei registri in `docker.json` dentro `supervisor.tar` e ripristinate **dopo** le app (`backups/manager.py`, ordine: cartelle, HA, repository, app, configurazione del Supervisor); `POST /docker/registries` sostituisce la voce dello stesso host, `GET` restituisce solo i nomi utente; manifest scaricato senza credenziali e non bloccante (risolve il punto 5 di 6.3 a favore della lettura «senza credenziali»); intervalli 3 ore (ricarica) e 16 ore (aggiornamento app), salto per `breaking_versions`, attesa di un giorno dalla data del `config.yaml` sul dispositivo (`st_mtime` in `store/data.py`), backup chiesto a Core; un'app non può aggiornare se stessa («can't update itself», `api/store.py`) e l'aggiornamento non accetta una versione; ricarica del catalogo condizionata a Supervisor aggiornato e Core/OS supportati, soglie 2 anni (Core) e «solo le ultime 4 versioni maggiori» (OS); `auto_update` del Supervisor vero di serie; ruolo `manager` con `/store`, `/docker`, `/host`, `/os`, `/backups`; WebSocket `supervisor/api` senza limiti di percorso per gli amministratori; ritorno indietro di Core solo se la nuova versione non risponde (10 + 15 minuti; controlla anche frontend e WebSocket); `haos-config` gira a ogni avvio, legge `/mnt/boot/CONFIG` in mancanza della chiavetta e la cancella; PR #256 unita il 2026-10-23; «Aggiorna tutto» escluso per Core, OS e Supervisor dal 2026.7; GHCR solo con PAT classico («GitHub Packages only supports authentication using a personal access token (classic)»).

**Cambi fatti nel testo** (marcati in linea con «Verifica del 2026-10-26»):

1. 2.2: risolto il [Da verificare] sui Termini degli account macchina (un solo account macchina gratuito per persona o entità legale, oltre all'account personale); «elimina» precisato in «revoca»; aggiunta la revoca su segnalazione di chiunque o per pubblicazione del token.
2. 1.2: precisato che un PAT a grana fine può essere limitato a un solo repository in sola lettura; l'affermazione «dà accesso ai sorgenti» vale per il repository dei sorgenti, non per un repository privato del solo pacchetto. La conclusione non cambia (rotazione = nuova app).
3. 2.4: aggiunto lo scambio `auth_code` → `POST /auth/token` mancante e il rischio dell'onboarding non autenticato.
4. 2.6: aggiunto che con Core/OS non supportati smette di aggiornarsi anche il Supervisor e che l'aggiornamento automatico delle app passa da Core.
5. 6.1: quattro rischi nuovi (chiave SSH del laboratorio in `CONFIG`, onboarding aperto, revoca provocata da terzi, chiave nei backup esterni).
6. 6.2: aggiornato l'elenco dei non verificati.

**Dubbi non risolti (non corretti nel testo)**

- **Fatturazione GHCR (6.1, 6.3 punto 8).** [F] La pagina dice sia «Container image storage and bandwidth for the Container registry is currently free» con almeno un mese di preavviso, sia le quote 500 MB / 1 GB del piano Free per i pacchetti privati. [D] La lettura più probabile è che oggi GHCR sia gratuito e che le quote valgano per gli altri registri dei pacchetti; non c'è conferma esplicita. Rischio: un cambio di politica con un mese di preavviso, con N clienti × dimensione dell'immagine.
- **Rilasci 2026.03.3 (credenziali nei backup) e 2026.07.5 (credenziali tolte dagli URL inviati a Sentry)**: non riletti nelle note di rilascio; il comportamento attuale è però confermato dal codice su `main` per i backup.
- **`ha` nella shell della 22222** (2.4): non verificato.
- **Cifratura di serie dei backup automatici di HA** e quindi esposizione della chiave GHCR nei backup esterni: non verificata.
- **Esito di un aggiornamento automatico fallito**: il Supervisor scrive solo un avviso se il comando a Core fallisce; cosa mostra Core all'utente (riparazione, notifica) non è stato letto.
- **Primo aggiornamento «tra 24 e 40 ore»** (2.5): [D] va aggiunto il ritardo della ricarica (fino a 3 ore) e il fatto che una nuova clonazione del repository (reset) rinnova la data del file e ritarda di nuovo.
- **Chiavetta: `CONFIG` scritta nella partizione di avvio subito dopo l'immagine** (2.7 punto 4): il servizio gira a ogni avvio senza condizioni, ma non è provato che la partizione di avvio sia già montata e la cartella letta al **primo** avvio (PV8 resta necessaria).

**Domande per l'utente aggiunte dalla verifica**

- **V-Q1.** `acamemo` appartiene all'azienda (entità legale) o a te come persona, accanto all'account `Mattiapentagallo`? Dai Termini GitHub dipende se si può aggiungere un account macchina gratuito o se conviene subito l'organizzazione (D-G2 a).
- **V-Q2.** La chiave SSH del laboratorio deve restare sui mini-PC dei clienti dopo l'installazione (assistenza remota) o va tolta? Se resta, una per dispositivo o una per tutti?
- **V-Q3.** Accetti che chi ha accesso fisico al mini-PC possa leggere la chiave GHCR e farla revocare (l'effetto è solo sugli aggiornamenti di quel cliente)? Se no, l'unica strada senza chiave sul dispositivo è l'immagine pubblica (D-G1 c), legata anche al parere GPL (D-C6).

---

## Acasystem a schermo intero sul mini PC (modalità chiosco), 2026-10-26

Sezione aggiunta il 2026-10-26 dopo la verifica del report. Solo ricerca e scrittura: nessuna modifica a codice, banco, Docker, VM, tablet o GitHub, nessun download, nessuna prova eseguita. Etichette: **[F]** fatto da fonte primaria o repository, **[D]** deduzione, **[P]** proposta non autorizzata, **[Da verificare]**. ID nuovi con prefisso D-K, senza riuso di ID esistenti.

### K.1 La domanda

> «ma potenzialmente se volessi fare che si avvia acasystem sul computer come UI, cosa va fatto?»

Interpretazione: il mini PC con HA OS mostra Acasystem a schermo intero sul **proprio** monitor (chiosco), non più solo sul tablet.

### K.2 Risposta breve

[F] Non esiste una via ufficiale di Home Assistant per mostrare una schermata sull'uscita video di HA OS. La richiesta «Native HDMI screens / PC monitors Support» (discussione 1668, 2025-11-11) ha 3 voti e nessuna risposta ufficiale; l'unica replica la sconsiglia perché HA OS è un apparecchio da server. Le pagine ufficiali non descrivono un chiosco locale.

[F] Esistono app della comunità che avviano un browser a schermo intero. La principale è HAOS-kiosk. [D] Può funzionare anche con Acasystem, ma il lavoro non è solo «puntare un browser sull'indirizzo». Servono:

1. un browser a schermo intero che parte da solo e si riavvia se muore;
2. uno schermo con tocco USB HID standard e una tastiera a schermo;
3. gestione di spegnimento e riaccensione dello schermo, rotazione e accesso persistente ad Acasystem (ha già pagina di accesso e porta 3002);
4. un piano per gli aggiornamenti: ogni pezzo grafico in più può rompersi quando cambiano HA OS o Debian.

[F] Supervised e Core sono deprecati dal 2025-05-22 e senza supporto dalla 2025.12; restano HA OS e Container, e Container non ha le app. Questo restringe le strade «Linux normale».

### K.3 Le strade

| Strada | Cosa è | Pro | Contro | Stima [P] |
|---|---|---|---|---|
| **1. HA OS + app chiosco comunitaria** | Nessun cambio di sistema: si aggiunge un'app che avvia un browser a schermo intero sul mini PC | Coerente con D-C1; la chiavetta non cambia; un solo apparecchio | Manutentore unico e poco attivo; browser e GPU nello stesso dominio di guasto del server; nessun dato su N100; i pannelli con tocco I2C dipendono dal kernel di HA OS | Media, più lavoro a ogni aggiornamento di HA OS |
| **2a. Debian + HA Container + chiosco** | Si abbandona HA OS | Controllo totale su GPU, kernel, browser | Si perdono Supervisor, app, backup completi e rollback di HA OS; Acasystem non è più un'app; si rifanno A1-A8 e la chiavetta; contraddice D-C1 | Grande |
| **2b. Debian o Proxmox con HA OS in VM e chiosco sull'host** | HA OS resta, il browser è fuori | Un crash della GPU non tocca HA | Due sistemi da aggiornare; passaggio USB (Zigbee, Z-Wave) alla VM; 8 GB stretti; già scartata come opzione C in REP-20261023-004 | Grande |
| **3. Schermo separato** | Mini PC nascosto con HA OS e Acasystem come app; schermo su un altro apparecchio | Nessuna modifica a HA OS né alla chiavetta; un aggiornamento di HA OS non può rompere lo schermo; già collaudata sul Lenovo Tab M11; lo schermo può stare dove serve | Un apparecchio in più per sito da alimentare e aggiornare | Piccola per 3a; media per 3b; media o grande per 3c |

Varianti della strada 3: **3a** tablet o pannello Android con Fully Kiosk Browser o con l'APK Capacitor di Acasystem (REQ-15, D-G12); **3b** pannello Android da parete con PoE; **3c** pannello PC o mini PC dietro il monitor con Debian, Cage e Chromium che apre Acasystem via rete, cioè la 2a su un secondo apparecchio, con il server HA OS lasciato pulito; **3d** app companion di HA, non adatta perché mostra l'interfaccia di HA e non Acasystem.

### K.4 Strada 1 in dettaglio (HA OS + app chiosco)

**App e manutenzione [F, GitHub, letti il 2026-10-26].**

- HAOS-kiosk (`puterboy/HAOS-kiosk`): X, OpenBox e browser Luakit (WebKitGTK). Licenza GPL-2.0, v1.3.2 del 2026-05-07, ultimo push 2026-05-07, 125 stelle, 19 issue aperte (25 con le PR), non archiviato. L'ultima risposta del manutentore risale al 2026-08-17 (#118); #137 «No support here anymore?» (2026-10-15) e #140 (2026-10-19) sono senza risposta.
- Fork Chromium `speedy3wk/haos-chromium-kiosk`: licenza MIT, ultimo push 2026-10-18, 2 stelle, 2 issue; Chromium in modalità chiosco, VA-API, watchdog di Chromium, rotazione, spegnimento con timeout. La pagina non parla di tocco né di tastiera a schermo.
- Altri fork (`erik04tl/HAOS-kiosk`, `rhythmcreative/Kiosk-chromium`, `HyziPyzi/HAOS-kiosk`, `korellas/haos-web-kiosk`): elencati dalla ricerca, **non verificati**. [D] Sono tutti progetti di una persona sola.

**Funzioni (config.yaml e README 1.3.2) [F].** Tocco se il dispositivo è `/dev/input/eventN` con N minore di 25; tastiera a schermo Onboard, attiva di default; rotazione normale, sinistra, destra, capovolta; `screen_timeout` e comandi REST per accendere e spegnere lo schermo; URL iniziale configurabile; senza un display valido collegato all'avvio l'app non parte. Servono nome utente e password di HA nella configurazione e l'accesso automatico inietta uno script nella pagina di accesso di HA (#128). Permessi: privileged, SYS_ADMIN, dispositivi dri e input, rete dell'host; il README avverte che la whitelist dei comandi REST può consentire qualsiasi comando di shell e che VNC non è cifrato.

**Problemi noti [F, issue].**

- #118 (2026-06-26): Luakit/WebKitGTK blocca la GPU su Intel Iris Xe (GPU HANG, reset GuC falliti, schermo congelato). [D] L'N100 ha una GPU Intel di generazione vicina: rischio plausibile, **non provato**.
- #139 (2026-10-18): memoria di Luakit in crescita di circa 12-15 MB/ora, chiosco morto dopo circa una settimana, workaround con riavvio notturno (prova su Raspberry Pi 5). #132: crash per memoria esaurita. #129: WebRTC non funziona in Luakit.
- Tocco: #140 non riconosciuto con HA OS 18.3 su un Lenovo ThinkSmart Hub 500; #114 touch USB non rilevato; #121 non mappato dopo la rotazione. Un utente riporta invece un tocco USB-C che funziona al primo avvio (forum HA, 975086).
- Lato HA OS [F]: il tocco I2C su pannelli x86 non funzionava ed è stato corretto caso per caso (#4446 con PR #4463; #4899 pannello N150 con PR #4900; #5088 con PR #5089, chiusa il 2026-10-15); #4846 (regressione del tocco su RPi) è aperta. [D] Un aggiornamento di HA OS può rompere tocco o video; i monitor con tocco USB HID standard sono la categoria meno rischiosa, i pannelli con controller I2C interno la più rischiosa.

**Combinazione con Acasystem [D, da provare].** L'URL iniziale accetta indirizzi qualsiasi e, con la rete dell'host, `http://localhost:3002` dovrebbe raggiungere Acasystem. Localhost è un contesto sicuro, quindi service worker e PWA sarebbero possibili. Conflitti: l'app chiede comunque credenziali di HA, in tensione con D-C5 e ADR-0022; e il tema Kit 2 con molte ombre va misurato su WebKitGTK/Chromium Intel (sul tablet il lag del 2026-10-12 era raster GPU delle ombre). Sul mini PC N100 non esistono dati pubblicati di consumo di RAM [Da verificare]; [D] con 8 GB ci stanno HA, Acasystem e il browser, ma serve un riavvio programmato del chiosco.

**Cosa andrebbe fatto [P].**

1. Prova sul banco e sul vero N100 con un monitor touch HDMI più USB HID standard, in orizzontale (evita i bug di rotazione del tocco), senza controller I2C interni.
2. Preferire Chromium a Luakit; fork o copia con versione fissata nel nostro repository (GPL-2.0 e MIT lo consentono) e aggiornamento automatico spento solo per questa app.
3. Aggiungere il repository allo script dell'installatore (tappe A5 e G6) e impostare URL verso Acasystem, uscita video, rotazione, timeout dello schermo e riavvio notturno.
4. Usare un utente HA dedicato e non amministratore oppure un fork senza credenziali; decidere il login di Acasystem sul chiosco (sessione legata al dispositivo, REQ-15).
5. Controllare la tastiera a schermo sulle schermate con testo.
6. Spinotto HDMI fittizio per le installazioni senza monitor (l'app non parte senza display).
7. Prova a ogni aggiornamento di HA OS sul banco con lo stesso monitor. [D] Il rollback A/B di HA OS protegge solo se il sistema non parte, non da un chiosco rotto.

**Chiavetta e installatore.** [D] L'immagine HA OS della chiavetta (2.7) non cambia; si aggiungono passi allo script di configurazione e serve un monitor collegato all'avvio.

### K.5 Strada 2 in dettaglio (Linux al posto di HA OS)

[F] HA ha deprecato Supervised e Core il 2025-05-22; restano HA OS e Container. Container non ha le app, Thread e Z-Wave senza supporto pronto, Matter fuori da HA OS non supportato (REP-20261023-004), nessun Supervisor, aggiornamenti manuali, nessun rollback A/B. Acasystem non sarebbe più un'app: A2-A5 da rifare come container, serve un token a lunga durata al posto dell'identità dell'app. Per il chiosco [F pacchetti Debian 13, letti 2026-10-26]: chromium 156.0.8078.47-1~deb13u1, cage 0.2.0-2 (upstream `cage-kiosk/cage` v0.3.1 del 2026-06-30, MIT, 132 issue aperte, ultimo push 2026-10-25), squeekboard 1.43.1-1, onboard 1.4.1-10. [D] La tastiera a schermo con Chromium su Wayland è il punto debole (wvkbd dichiara di non gestire i campi di testo); si può ripiegare su X11 con Onboard. La chiavetta diventerebbe un'installazione Debian automatica (preseed) e la tappa A6 andrebbe rifatta. [F] apt non è atomico: un blackout durante l'aggiornamento può lasciare il sistema non avviabile; `unattended-upgrades` non riavvia e non fa rollback.

La variante 2b (HA OS in VM KVM, chiosco sull'host) [F] è prevista dalla pagina di installazione HA (.qcow2, minimo 2 GB e 2 vCPU) e un utente del forum riporta prestazioni pari a HA OS nudo con Proxmox; [D] mantiene Supervisor, app, backup e rollback e isola il browser da HA, ma raddoppia installazione e aggiornamenti.

### K.6 Strada 3 in dettaglio (schermo separato)

[F, fully-kiosk.com, 2026-10-26] Fully Kiosk Browser: licenza PLUS una tantum 8,90 EUR a dispositivo, sconti da 10 dispositivi; kiosk, schermo intero, rilevamento movimento, amministrazione remota, API REST e JavaScript, MQTT. L'alternativa già prevista (REQ-15) è l'APK Capacitor di Acasystem. L'interfaccia di oggi è il Lenovo Tab M11 (Chrome 1280x665, DPR 1,5, Mali-G52, 4 GB), già misurato. I pannelli Android PoE da parete esistono come schede commerciali (non test indipendenti); [Da verificare] patch di sicurezza del produttore, WebView aggiornabile, compatibilità con il frontend. Per 3c [D] i limiti del tocco I2C sul kernel di HA OS non si applicano perché il sistema è Debian, e un crash del browser o della GPU non tocca HA.

Effetti [D]: nessuna modifica alla chiavetta né al rollback; l'interfaccia può stare lontano dal mini PC e il mini PC non ha bisogno di monitor. Contro: un apparecchio in più per sito (patch Android, WebView, licenza), e il kiosk Android non è sotto il nostro controllo dei processi.

### K.7 Rischi della strada 1

Manutentore unico e poco attivo; WebKitGTK instabile su Iris Xe e memoria crescente; browser nello stesso dominio di guasto del server (preoccupazione espressa nella discussione 1668); credenziali di HA in configurazione; permessi privilegiati dell'app; nessun watchdog documentato per l'app; dipendenza da kernel e driver di HA OS per tocco e video.

### K.8 Raccomandazione [P]

1. **Confermare D-C1:** HA OS sul mini PC con Acasystem come app. Passare a Debian solo per lo schermo non è giustificato.
2. **Strada standard per la schermata: schermo separato (strada 3)**, coerente con D-G12 e REQ-15; per i siti che vogliono un pannello PC x86, la variante 3c.
3. **Chiosco sullo stesso mini PC (strada 1) solo come variante a richiesta e dopo prova**, con le condizioni di K.4 (monitor scelto da noi, Chromium, versione congelata, utente dedicato, riavvio notturno, prova a ogni aggiornamento di HA OS).
4. **Strada 2b** solo se il titolare vuole una sola scatola e rifiuta le incognite della strada 1.
5. Prima di decidere, una **prova breve e a basso rischio** sul banco o su un clone della VM `acasystem-ha` (con snapshot), da autorizzare insieme a D-G11: app scelta, apertura di `http://localhost:3002`, tocco, tastiera, spegnimento e riaccensione, riavvio dopo blackout, memoria dopo 24 ore.

Da evitare: chiosco comunitario come predefinito per tutti i clienti senza prova su N100; pannelli con tocco I2C interno su HA OS; far dipendere l'installazione dei clienti da un'app il cui manutentore non risponde.

### K.9 Domande chiuse per l'utente

Rispondere con la lettera. Nessuna tappa di realizzazione è autorizzata da questa sezione. Collegate a D-G11, D-G12, D-C5, D-C10 e D-C15.

- **D-K1. Serve davvero lo schermo sul mini PC, o basta un pannello o tablet separato?**
  - (a) **Schermo separato come standard; chiosco sul mini PC solo a richiesta e dopo prova.** *(consigliata)*
  - (b) Chiosco sul mini PC come standard per tutti i clienti.
  - (c) Nessuna delle due per ora: resta il tablet attuale.
- **D-K2. Autorizzi una prova breve sul banco (VM o mini PC) con l'app chiosco comunitaria?** Misura tocco, tastiera, riaccensione, memoria su N100.
  - (a) **Sì, dopo D-G11, su un clone della VM con snapshot e poi sul vero N100 con il monitor scelto in D-K5.** *(consigliata)*
  - (b) Solo sul vero N100, senza VM.
  - (c) No, nessuna prova.
- **D-K3. Se si fanno chioschi sul mini PC: forkare e congelare l'app comunitaria nel nostro repository** (GPL-2.0 per HAOS-kiosk, MIT per speedy3wk) e mantenerla noi?
  - (a) **Sì, fork con versione fissata e aggiornamento automatico spento per questa app.** *(consigliata)*
  - (b) Usare l'app così com'è, con aggiornamento automatico.
  - (c) Scrivere un'app nostra (lavoro grande).
- **D-K4. Credenziali per il chiosco** (conflitto con D-C5 e ADR-0022):
  - (a) **Utente HA dedicato, non amministratore, solo per il chiosco.** *(consigliata)*
  - (b) Fork senza credenziali (lavoro in più).
  - (c) Utente del proprietario (sconsigliata).
- **D-K5. Hardware di riferimento per lo schermo:**
  - (a) **Tablet Lenovo Tab M11 o equivalente con APK o Fully Kiosk (già collaudato)**; per i siti che chiedono lo schermo sul mini PC, un monitor touch HDMI e USB HID standard in orizzontale da provare per la strada 1. *(consigliata)*
  - (b) Pannello Android PoE da parete (scegliere un modello da provare).
  - (c) Pannello PC x86 con Debian, Cage e Chromium (3c).
- **D-K6. Pannelli PC x86 con tocco I2C interno su HA OS:**
  - (a) **Esclusi dal catalogo finché non provati.** *(consigliata)*
  - (b) Ammessi caso per caso dopo prova.
- **D-K7. Il titolare accetta un apparecchio in più per sito** (tablet o pannello) in cambio di non toccare HA OS e la chiavetta?
  - (a) **Sì.** *(consigliata)*
  - (b) No, vuole una sola scatola: si valuta la strada 1 o la 2b.

### K.10 Fonti (consultate il 2026-10-26)

- https://github.com/orgs/home-assistant/discussions/1668 (richiesta di schermi HDMI nativi, 2025-11-11, senza risposta ufficiale).
- https://github.com/puterboy/HAOS-kiosk e API GitHub del repository (v1.3.2 del 2026-05-07, GPL-2.0, 125 stelle); issue #114, #118, #121, #128, #129, #132, #137, #139, #140.
- https://github.com/speedy3wk/haos-chromium-kiosk (MIT, push 2026-10-18); fork elencati e non verificati: erik04tl/HAOS-kiosk, rhythmcreative/Kiosk-chromium, HyziPyzi/HAOS-kiosk, korellas/haos-web-kiosk.
- https://community.home-assistant.io/t/major-update-v1-2-0-haoskiosk-add-on-display-your-dashboards-directly-on-your-haos-server/975086 e https://community.home-assistant.io/t/need-advice-on-how-to-display-ha-on-touchscreen-monitor/1010162.
- https://www.home-assistant.io/blog/2025/05/22/deprecating-core-and-supervised-installation-methods-and-32-bit-systems/ ; https://www.home-assistant.io/installation/ ; https://www.home-assistant.io/installation/linux/.
- https://contributors.home-assistant.io/apps/reference/configuration/ (avvio predefinito `auto`, `watchdog`, `devices`, `privileged`).
- https://github.com/home-assistant/operating-system, issue #4446, #4791, #4846, #4899, #5088 e relative PR; release 18.4.rc2 (2026-10-23, kernel 6.18.58).
- https://github.com/cage-kiosk/cage (MIT, v0.3.1 del 2026-06-30); pacchetti Debian trixie chromium, cage, squeekboard, onboard (https://packages.debian.org); https://github.com/proycon/wvkbd; https://ubuntu.com/frame/docs.
- https://www.fully-kiosk.com/ (8,90 EUR a dispositivo); https://community.home-assistant.io/t/experiences-using-poe-knx-android-panels-with-home-assistant/1011581 (post di un fornitore, non indipendente).
- Repository locale: REP-20261023-004, questo report (sezioni 2.7 e 5), `documentazione/funzionalita/product.md` (REQ-15), `progetto/compose.tunet.yaml` (porta 3002).

**Limiti.** Nessuna prova in esecuzione: le affermazioni su comportamento su N100, tocco, tastiera e memoria sono [D] o [Da verificare]. Le schede commerciali dei pannelli Android non sono test indipendenti. Gli altri fork di HAOS-kiosk non sono stati verificati.
