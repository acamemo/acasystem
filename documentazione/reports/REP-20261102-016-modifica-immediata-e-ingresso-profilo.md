# Modifica immediata e ingresso nel profilo condiviso

| Campo | Valore |
|---|---|
| ID | REP-20261102-016 |
| Stato | Completato localmente e installato sul banco PC autorizzato |
| Data | 2026-11-02, Europe/Rome |
| Autore / modello | Codex; nome esatto non disponibile |
| Commit iniziale | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta umana | «La gestione delle modifiche è poco intuitiva: tra blocco della disposizione, modifica pagine e Salva ci sono troppi passaggi. Vorrei renderla più semplice e immediata, soprattutto dal telefono […] Una sorta di modifica in tempo reale». |

## Obiettivo e perimetro

La richiesta successiva al collaudo REP015 corregge il percorso di editing approvato in ADR-0035: pubblicare automaticamente le modifiche concluse, senza un secondo Salva globale, con accesso diretto alla modifica intenzionale. Conservare riserve, revisioni, operazioni idempotenti, bozze offline, conflitti espliciti, undo mirato, account e profili esistenti. Stesso account sul nuovo dispositivo riapre l'interfaccia già disponibile invece di indurre a creare un duplicato. La risposta e il chiarimento successivi precisano una configurazione selezionata per la persona, condivisa nell'account; nessuna eliminazione dei profili alternativi.

L'utente conferma che Tavano aggiunto sul PC è visibile dal telefono. Lo snapshot anonimo after_selection di REP015 mostra i due client sullo stesso profilo; non dimostra ancora tutte le direzioni del collaudo. Computer Use si è fermato due volte perché non verificava l'URL Edge: nessun input è stato effettuato con quel canale. Le schermate umane mostrano il blocco disposizione come causa del comando disabilitato.

Preservate le 474 modifiche Git preesistenti e la correzione username già pronta in REP015. Dopo la preparazione concreta della build, alla domanda sull'aggiornamento locale con backup l'utente risponde esplicitamente **«Sì, aggiorna il banco su questo PC»**. Questo autorizza il solo banco0.9.35→0.9.37, non una pubblicazione, installazione domestica, comando fisico o attività VM. La prova precedente0.9.36 rimane materiale preparato, mai installato.

## Criteri di completamento

- Le modifiche effettive generano checkpoint automatici serializzati; scrivere durante una richiesta lenta non perde cambiamenti e ogni checkpoint usa un nuovo identificativo.
- Il comando intenzionale di modifica è raggiungibile senza disattivare preventivamente la protezione dai trascinamenti accidentali.
- Fatto/Fine termina il percorso e attende gli ultimi cambi; nessun Salva globale obbligatorio per propagare le modifiche normali.
- Il destinatario applica soltanto revisioni accettate, senza reload, regressioni di revisione o cicli di risalvataggio.
- Offline, risposta persa, conflitto, quota piena e rifiuto della riserva mantengono recuperabili i dati e indicano l'esito reale.
- Un nuovo client dello stesso account non crea implicitamente copie; il comportamento della selezione segue la risposta umana.
- Regressioni pertinenti, strict/lint e prova browser desktop/telefono isolata; collaudo fisico distinto e non inventato.

## Avanzamento

**Precisazioni umane durante il lavoro:** sign-in/sign-up con gerarchia della reference inline e materiale ACA; registrazione come nuovo account, accesso per riutilizzarne configurazione e comandi su dispositivi diversi. Rimuovere il campo di denominazione e basarsi sulla persona. Il chiarimento successivo ribadisce l'uso del PC o telefono secondo disponibilità. [ADR-0036](../decisions/ADR-0036-account-e-modifiche-immediate.md) registra la sostituzione parziale di ADR-0035. Reference UI-013 trascritta integra, catalogo/hash aggiornati, nessun import applicativo o nuova dipendenza.

Implementati accesso diretto e footer alternato; registrazione client con nome automatico, conservando sessioni distinte. Nuova selezione autorevole per account, ereditaria sui nuovi client e propagata tramite eventi; migrazione conserva alternative e chiede una scelta soltanto se storicamente divergenti. Nuova tabella preceduta da checkpoint su database persistente; transazione con evento Tavano.

Editing live: modifiche raggruppate in checkpoint350ms dopo input effettivi, conservazione degli input durante invio anche in IndexedDB, riscontro di sincronizzazione e Fatto/Fine per uscire. Editor espliciti mantengono la riserva fra checkpoint; impostazioni transitorie la rilasciano alla conferma. Risposta incerta mantiene lo stesso intento; modifiche successive sono conservate separatamente. Protezione storica della disposizione non blocca l'ingresso live; primitive e palette conservate. In review corretti perdita dei campi al solo blur su Escape, riuso di editor transitori nello sheet e conservazione del mutatore quando una promozione strutturale riceve409. Revisioni monotone anche con letture concorrenti e risposte tardive.

Audit in lettura: il protocollo SSE già distribuiva le revisioni accettate. La frizione era dovuta ai salvataggi espliciti e al nuovo client senza selezione, con form di creazione mostrato accanto alla libreria. Un semplice save dopo ogni update era insufficiente: il vecchio save chiudeva l'editor e poteva sovrascrivere cambi locali arrivati durante l'invio. Checkpoint e nuovi input ora sono coordinati; lo stato remoto non provoca una nuova modifica automatica.

## Verifiche ed evidenze

Baseline prima delle modifiche: LiveProfileCoordinator e LiveProfilesRollback,17PASS. Verifiche finali:

| Controllo | Esito ed evidenza |
|---|---|
| Backend completo seriale | **710PASS/1skip,48filePASS**, `backup/rep023/backend-account-profile-serial.log`. Due fallimenti iniziali fuori area nel parallelo passano entrambi nel rerun49/49 e nella suite seriale; nessuna modifica ai relativi sorgenti. |
| UI/accesso/controller | **72PASS/7file**, `ui-and-access-final.log`: ingresso diretto, accesso/gate/owner, rollback, sheet/Fatto/Escape, controller. |
| Registrazione e ordine | **9PASS/2file**, `registration-and-order-final.log`, compreso footer finale. |
| Coordinatore | **33PASS**, suite dedicata: debounce, aggiornamenti durante HTTP, idempotenza, recupero dopo chiusura, offline/conflitti, quota e riserva negata, monotonicità, promozione409. |
| Strict/lint/build | Frontend/backend strict e lint mirati dei sorgenti PASS; Vite e Docker/Casa3D PASS. Detector meccanico UI sui target modificati restituisce `[]`. Il lint dei test è escluso dal config ordinario e non è dichiarato eseguito. |
| Browser isolato | **10scenariPASS**, `qa-live-results.json`: due contesti Chromium desktop/touch390×844, login/registrazione, due client/un solo profilo, selezione automatica, rinomina PC↔telefono senza Salva/reload, Intestazione/Fatto, ripristino e persistenza. Zero erroriJS, zero comandi fisici. Origini esterne tentate dai preset completamente bloccate. |
| Verifica visiva | Quattro screenshot auth ispezionati. Prima tornata rileva CTA troppo basse per una variabile di padding ereditata; corretta nello scope della card e unica tornata di conferma. CTA finali67,19px/75,59px su entrambi i formati. |
| Artefatti |7checksum e1740sorgenti verificati;119asset ZIPweb/immagine identici. Smoke isolato networknone/read-only/tmpfs: health200/0.9.37, manifest200, HTML200, bootstrap anonimo401. `artifact-0.9.37-handoff.md`. |

La prima QA funzionale, conservata, apriva l'editor telefono mentre il PC stava ancora rilasciando la riserva:409 legittimo, non difetto del blocco disposizione. La fixture è stata corretta per attendere il rilascio; nessun bypass del protocollo. I conteggi sopra si riferiscono alle esecuzioni finali e non sommano le suite ripetute. Suite generale frontend/lint generale non rilanciati né dichiarati verdi; debito ISSUE-134 invariato, inclusa l'attesa SystemPage su un testo «indirizzo» già presente fuori area.

## Build e aggiornamento autorizzato del banco

Build **localeACA0.9.37**, wrapper `ghcr.io/acamemo/acasystem:0.9.37.100`, digest **`sha256:cf72a506edfe0184ce800a243fd27f80158332dbf2c8eef6dabb7265ed8b4122`**. Snapshot applicativo1740file, SHA256 **`3db7ac33720a4254afe6557c6e4515c5356d7ace2530a7383a211f3ccb2cb4b2`**. Materiali in [out0.9.37.100](../../progetto/ha-app/out/0.9.37.100/PUBBLICAZIONE.md); bundle3128213byte, SHA256 **`6b5d0424ba4aa152b1a5ea45c16935b45a02765ba03d98d269cfe4c0aed81bfd`**, minServer0.9.37/minShell0.1.0. Pubblica0.9.34 immutata: nessun push o release.

Arrestato soltanto ACA, eseguito backup a freddo verificato, poi applicato l'override `backup/rep023/compose-live-local.yaml` con no-build/pullnever. Backup `cold-bank-pre-0.9.37/aca-data-pre-0.9.37.tgz`:291572byte, SHA256 **`959aca6e198e7cefad34722a5762316abad75ee22583870dc1e1f104b69882c1`**. Volume identità tecnica escluso; copia estratta in tmpfs e integrity_check ok.

Prima/dopo: tutte le **26tabelle preesistenti con hash/conteggi identici**, aggiunta soltanto `aca_v2_account_profiles`; integrità ok. HA e D1 mantengono ora di avvio e stato, nessuna VM. Health reale healthy/0.9.37, setupready, registrazioneready e manifestclient0.9.37, raggiungibili da loopback/LAN. Nessun accesso con credenziali personali, account creato o comando fisico eseguito dall'agente. Evidenze: `bank-health.json`, `data-comparison.json`, `registration-bank-status.json`, manifest backup e timestamp servizi.

## Chiusura e punto di ripresa

Controllo finale del diff proporzionato al checkpoint preesistente: nessuna modifica agli archivi o agli originali acquisiti, UI-013 verificata per byte/hash,100nuovi collegamenti locali validi e artefatti nativi revisione2 invariati. Whitespace diff PASS con configurazione CRLF del repository; soltanto avvisi di normalizzazione già gestiti. Nessun commit, push o modifica delle dipendenze. Evidenze di chiusura in backup/rep023.

**Correzione finale della quota, stessa versione0.9.37/revisione100:** il popup nativo rende inerte la pagina sottostante. In review finale è stato rilevato che lo scarto presente soltanto nella barra globale non era raggiungibile dal popup a quota piena. Aggiunto lo scarto esplicito anche dentro lo sheet, senza toccare commit già accettati o bozze con esito incerto. Suite sheet11PASS e QA isolata aggiuntiva4PASS: IndexedDB10MiB dummy, dialog:modal, campi/Fatto bloccati, export scaricato e scarto interno cliccabile; vecchia bozza integra e profilo revisione2→2, zero operazioni aggiuntive/comandi/erroriJS. Evidenze separate `qa-quota-results.json` e `qa-quota-handoff.md`; le precedenti10prove e quattro schermate sono conservate.

La revisione99 iniziale rimane conservata con le sue prove; il confronto delle provenienze99/100 mostra soltanto WidgetSettingsSheet e il relativo test modificati. Verificati nuovamente7checksum/1740sorgenti/119asset sulla revisione100. Prima del passaggio finale, seconda copia a freddo333910byte/SHA256 **`89a4dbbaa206785af4c6ed51a6852ae623006842bc0e5a0add1f9a496cd730bf`**, volume servizio escluso e integrity_check ok. Tutte le27tabelle rimangono identiche nel confronto prima/dopo finale; health e manifest corrispondono al digest finale, HA/D1 invariati. Nessuna nuova versione pubblica o modifica di backend/contratti nel passaggio100.

Implementazione e aggiornamento del banco autorizzato completati. Riaprire/ricaricare ACA su PC e iPhone a **http://192.168.1.11:3002/** per caricare la nuova UI, accedendo allo stesso account se richiesto. Il primo profilo resta configurabile e le alternative storiche sono conservate; il secondo accesso eredita la selezione dell'account. Modifica→azioni live→Fatto/Fine; nessun nuovo Salva globale.

Restano distinti il nuovo riscontro umano su iPhone/Safari fisico, Android/scanner su hardware e comandi su dispositivi reali; non risultano collaudati dalla QA Chromium. Guida corrente aggiornata; nessuna pubblicazione o attività ulteriore avviata. La breve assistenza al prossimo riscontro del telefono può riprendere da qui senza ricreare account o profili.
