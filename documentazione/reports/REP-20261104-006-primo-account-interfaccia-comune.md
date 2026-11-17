# Primo account nella normale interfaccia di registrazione ACA

| Campo | Valore |
|---|---|
| ID | REP-20261104-006 |
| Stato | Completato nel software e installato sul banco0.9.41; creazione umana e recupero proseguono in REP005 |
| Data / autore | 2026-11-04, Europe/Rome; Codex, nome esatto del modello non disponibile |
| Fonte umana | Screenshot «Configura la tua casa / Crea proprietario»; richiesta: «perché mi compare questa schermata così? non potremmo creare direttamente un primo account senza questa interfaccia? mi pare futile». |
| Autorizzazione | Unificare presentazione del primo account con «Crea account», stesso layout e pill colore. La distinzione tecnica del primo proprietario rimane interna, senza nuova assegnazione di privilegi alle iscrizioni successive. Prosegue la prova del banco già autorizzata. |

## Perimetro e criteri

Il banco è volutamente tornato alla creazione iniziale per richiesta umana in REP005. La schermata mostrata crea già il primo account ma usa ancora una composizione e testi tecnici separati. Usare l’interfaccia di registrazione ACA corrente, con nome utente unico, password/conferma, occhiolini, pill colore e pulsante «Crea account». Riusare campi/primitivi senza duplicare una nuova UI. Primo proprietario e iscrizioni successive mantengono endpoint e permessi distinti; nessun bypass dell’onboarding HA.

Il colore scelto deve appartenere all’account HA autenticato appena creato, senza password persistenti o nuova API. Preservare la scelta se il percorso viene interrotto dove possibile; nessun colore deve essere applicato all’account sbagliato. Testare questa corrispondenza e i recuperi. Si può precompilare lo username già noto nel successivo login, senza memorizzare password. Non sono assegnati in questo intervento un nuovo protocollo di auto-login, nuovi provider o modifica automatica del nome casa.

Target build locale successiva 0.9.41/r99, mantenendo il HA dedicato persistente di rep032 e gli originali. Nessuna nuova release pubblica, dipendenza o intervento su HA storico. Il recupero/copia dei due profili prosegue dopo la creazione umana del nuovo account, con l’helper locale già verificato; nessuna copia ancora applicata.

## Avanzamento e verifiche

Audit iniziale dell’unificazione richiesto in sola lettura. Evidenze/checkpoint nuovi in `backup/rep033/`; materiali di recupero in rep032. Le verifiche saranno registrate dopo l’esecuzione, distinguendo UI, prima creazione reale simulata, build/banco e passaggi umani.

Implementazione nei sorgenti: `AccountCreationFields` locale comune ai due percorsi, prima card con titolo/CTA «Crea account» e stessa pill; username unico e occhiolini conservati. `LoginForm` espone un callback opzionale separato per lo username effettivamente usato, lasciando invariata l’invocazione dei normali `onSession` a un argomento. Il nome casa e il login esplicito successivo restano i passaggi precedenti, senza nuovo protocollo automatico.

Il colore del primo account viene conservato in sessionStorage come solo intento non segreto, associato allo username e poi a casa/utente verificati tramite il preciso token transitorio del login. Dopo il normale collegamento del client, un gate prima dei profili legge/salva tramite l’API account esistente con CAS e conferma; risposta persa o errore mantengono la possibilità di riprovare. I guard su casa/utente/client evitano di modificare il contesto di un accesso cambiato nel frattempo. Le nuove richieste con token transitorio/catturato sopprimono il logout globale su401; i normali comportamenti autenticati restano predefiniti. I grant temporanei abbandonati vengono revocati una volta, mai quelli accettati; cambiare percorso invalida un vecchio binding pendente. Queste verifiche riguardano il nuovo percorso asincrono, non una sostituzione dell’autenticazione.

Strict e lint mirato superati, build web0.9.41 riuscita con variabile di versione ripristinata; warning chunk oltre500kB noto. Review indipendente del nuovo percorso ha rilevato e fatto correggere i guard401/contesto/cambio percorso e il cleanup dei grant abbandonati prima del congelamento.

QA con **HA reale2026.9.4 isolato**, immagine locale immutabile, configurazione in tmpfs e backend SQLite in memoria: **4 passi PASS**, layout1366/390 corretto senza overflow, creazione owner reale→login esplicito→nome casa→schermata profili. `auth/current_user` conferma owner/admin, nome normalizzato e colore scelto associato al suo esatto ID; colore persistente dopo reload. Nessun profilo creato, errore JS, richiesta browser esterna o comando fisico. Screenshot desktop/telefono ispezionati anche dal coordinatore. Questa fixture non è il banco dell’utente e non ne crea l’account. Evidenze `backup/rep033/qa-owner-results.json` e PNG, limiti nel relativo handoff.

## Chiusura e punto di ripresa

UI e banco completati. L’utente può ricaricare ACA e creare il proprio nuovo account nella normale interfaccia; password soltanto nell’app. Il percorso successivo resta login esplicito e nome casa. Chiesto di fermarsi alla schermata profili, prima di crearne uno, per applicare la copia conservativa già autorizzata e verificata in REP005. Nessun account reale o copia creati dall’agente in questo intervento.

## Esiti finali e distribuzione locale

Vitest nativo: **89 PASS/2 FAIL**, 13 file. Tutti i nuovi casi pending/contesto/cancellazione/grant/401 e i percorsi owner/member/login/MFA/account passano. I due errori sono `AppRootLoginRace`, che cerca ancora i campi di denominazione manuale del dispositivo già ritirati: questo test e `ClientAccessGate` sono byte-identici allo ZIP sorgenti0.9.40.99. Evidenza `preexisting-app-root-login-race.json`; nessuna baseline completa rieseguita, nessuna modifica per dichiarare una suite generale verde. Strict finale, ESLint10moduli e colori0/596file PASS. Checkpoint/diff/hash di16file in `frontend-source-evidence.json` e `frontend-scope.diff`.

Artefatti locali0.9.41/r99: wrapper `sha256:39b90413f40ccd35fea65a531ade2cb7d738abe9c82ccbfdd9aaf23125726f91`, base `sha256:673072f2c8d424f6e4417aee8d8f78779101825d2e8bde0eb9bb9edaf41b2c78`, snapshot1755file SHA256 `80435d945bbe8124b485747b189eaa7694feb0f650d0cb5f0c666390e8448603`. Bundle3129258byte SHA256 `2b18f1a7f3c1ae45c0cacd952eebaa525d8072d8d7d0f294977fb0ac18e82c7e`, minServer0.9.41/minShell0.1.0. Audit indipendente:7checksum,1755sorgenti,22tools+2generati,119asset e116runtime PASS; smoke isolato health/root/manifest200 e bootstrap anonimo401. Nessun push o modifica della pubblica0.9.34.

```powershell
node progetto/ha-app/build-base.mjs --version 0.9.41 --tag aca-system:first-account-local
node progetto/ha-app/prepare.mjs --version 0.9.41 --revision 99 --base-image aca-system:first-account-local
```

Aggiornato soltanto ACA sul banco, conservando HA dedicato, HA storico fermo e D1 con stessi stati/orari. Backup freddo `backup/rep033/cold-bank-pre-0.9.41/aca-data-pre-0.9.41.tgz`,222570byte SHA256 `de6289f69ce93f0fd365a1504c7223dd67926a204480389616ff324b6d6c7e46`; integrità confermata, segreto tecnico escluso. Dopo riavvio27/27tabelle identiche, nessuna colonna nuova. Container0.9.41 healthy, health LAN/loopback e manifest attesi; browser anonimo reale verifica «Crea account», tre campi/pill e assenza delle vecchie etichette senza inserire credenziali o inviare il form. Stato `owner-required` atteso sul HA nuovo. Screenshot reale `bank-owner-form-actual.png`; nessuna prova fisica iPhone dedotta.

Override corrente composto da base + rep032 (HA dedicato) + rep033 (versione ACA):

```powershell
docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml -f backup/rep032/compose-recovery-local.yaml -f backup/rep033/compose-first-account-local.yaml up -d --no-deps --no-build --pull never tunet
```

Per un avvio completo del banco includere anche `ha-bank` senza `--no-deps`; il volume persistente del HA dedicato rimane quello già predisposto. Non usare i vecchi override che puntano all’HA storico. Nessun commit, nuova dipendenza o nuovo protocollo di login. La conclusione di questo intervento UI non conclude il recupero dei profili: riprendere REP005 al riscontro umano.

Controlli documentali finali:239nuovi collegamenti verificati senza percorsi locali mancanti, hash/dimensioni dei pacchetti nativi precedenti invariati. Nei16file del diff corrente non rilevati spazi finali aggiunti; i problemi storici restano distinti. Ultima lettura dello stato reale ancora `owner-required`: nessuna creazione umana completata al momento del controllo, nessuna copia da avviare senza identità di destinazione verificata. Materiali e file sensibili di backup esclusi da Git, verificato tramite `git check-ignore`.
