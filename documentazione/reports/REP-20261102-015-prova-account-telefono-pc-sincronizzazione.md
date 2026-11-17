# Prova account dal telefono, accesso PC e sincronizzazione

| Campo | Valore |
|---|---|
| ID | REP-20261102-015 |
| Stato | In corso |
| Data | 2026-11-02, Europe/Rome |
| Autore / modello | Codex; nome esatto non disponibile |
| Commit iniziale | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta umana | «Ok, proviamo la creazione dell’account dal telefono e poi l’accesso dal PC, verificando che lo stesso profilo e le modifiche siano sincronizzati.» |

## Perimetro e criteri

Collaudo guidato sul banco locale0.9.35 di REP014, telefono iPhone dell'utente e PC. Creazione/accesso effettuati dall'utente nei rispettivi form, senza credenziali in chat o evidenze. Verificare client distinti e stesso account/profilo, cambiamenti visibili in entrambe le direzioni e ricaricamento senza perdita. Nessun comando fisico, reset di HA, accesso a profili altrui o nuova pubblicazione. Eventuali difetti del flusso richiesto vanno diagnosticati e corretti preservando account/dati già creati.

## Avanzamento

Health0.9.35 e owner-required rilevati. L'utente riferisce che dopo «Crea proprietario» compare l'accesso; al successivo login/completamento segnala un errore. Richiesto solo il testo dell'errore. Il servizio status alla rilettura indica ancora owner-required: discrepanza da risolvere, non dichiarata creazione riuscita sulla sola navigazione UI.

Il testo ricevuto identifica il rifiuto dei dati di creazione. Il nome utente aveva una maiuscola iniziale. Verifica primaria in sola lettura dei sorgenti **HA2026.9.4 installati**, `components/onboarding/views.py` e `auth/providers/homeassistant.py`: `_validate_new_username` rifiuta username diversi da `strip().casefold()`, prima di creare l'utente. Metadati anonimi allora confermavano zero proprietari e il solo utente di sistema. Nessun nome/username personale conservato nelle prove o nei test.

L'utente riprova tutto minuscolo e conferma che può accedere; il backend passa a setup-required. Il successivo errore di login era un nome inserito erroneamente, rettificato dall'utente senza operazioni sugli account. Dopo nome casa/completamento e scelta del profilo l'utente conferma i widget sull'iPhone; status centrale ora ready. Le foto inviate mostrano la scelta del profilo, non un errore. L'elenco tecnico della preview è annotato come rilievo di presentazione, senza una riscrittura del flusso nel presente collaudo.

Correzione correlata preparata: creazione proprietario normalizza username con trim/minuscole al blur e submit e nel servizio; campo «Nome utente» su setup/accesso, password/nome visibile non trasformati. Errore HA username_not_normalized tradotto in messaggio controllato, senza dettagli upstream. Test frontend42PASS e backend12PASS, strict e lint pertinenti riusciti. Non si modifica la creazione già completata; nessun riavvio durante l'inserimento dei dati e la prova utente. Nuova build locale in preparazione, pubblicazione non assegnata.

## Verifiche e punto di ripresa

**Aggiornamento dopo il collaudo guidato:** l'utente conferma «Fatto» sulla selezione del profilo. Snapshot readonly anonimo after_selection, sequence4, mostra due client sullo stesso profile1/account1, revisione1 e due sessioni distinte; il duplicato profile2 resta conservato. Successivamente l'utente riferisce Tavano aggiunto alla pagina e visibile anche dal telefono. Non dichiarare per questo completati anche reverse, reload, conflitti o comandi fisici.

Computer Use si è fermato prima di interagire per mancata verifica affidabile dell'URL Edge, anche dopo che l'utente l'ha portato in primo piano. Le schermate umane identificano «Blocca la disposizione» come causa del comando disattivato; l'utente lo sblocca. La critica successiva assegna il nuovo flusso in [REP016](REP-20261102-016-modifica-immediata-e-ingresso-profilo.md), che riprende la sincronizzazione con accesso personale e checkpoint automatici. Le righe successive conservano l'avanzamento rilevato prima di questa precisazione; il collaudo fisico completo della nuova versione rimane da effettuare.

Creazione/login/completamento casa e profilo iPhone confermati dall'utente. Osservazione anonima in sola lettura: centrale ready, un account ACAv2 noto, un client/sessione e un profilo selezionato alla revisione1, nessuna operazione di modifica ancora registrata. Alias soltanto nella memoria del processo, nessun ID/nome/token/configurazione nelle evidenze. Questo non prova ancora la sincronizzazione.

L'utente conferma ora widget visibili anche sul PC. Snapshot anonimo after_pc: due client attivi dello stesso account e due riferimenti di sessione HA distinti, ma **due profili selezionati differenti**, entrambi revisione1 e nessun salvataggio operativo. Accesso multiplo riuscito; non è ancora una prova di sincronizzazione dello stesso profilo. Richiesto sul PC Sistema → Profili → Usa qui sul profilo non attivo, per selezionare quello già usato dal telefono. Nessun profilo eliminato o forzato dall'agente; attesa conferma umana della selezione.

Dopo l'allineamento verificare con nuovo snapshot. Percorso di prova sicuro della configurazione: Sistema → Schermata Home → Modifica le pagine → nome della pagina corrente non Copertina → nome temporaneo → Invio/Fatto → **Salva**, poi Fine. Invio/Fatto aggiorna la bozza e Fine da solo non equivale a Salva. L'altro client deve vedere la modifica sulla stessa pagina senza ricaricare. Ripetere in direzione inversa, poi ripristinare il nome originale. Non sostituire questo controllo con la sola rinomina del profilo, che verifica metadati distinti dal JSON della configurazione.

Correzione username pronta in immagine **locale, non avviata** `ghcr.io/acamemo/acasystem:0.9.36.99` (ACA0.9.36), digest `sha256:1bdf5b506475b21e1ee3be7c991259126c5bb33b4ad74616d311f4fa1e5fc9d2`, snapshot1738file/SHA `0e96e2facf24aa05a48f226404097ab57da558ea9856980675c35c59b906612f`. Banco resta0.9.35 durante il collaudo, nessun riavvio della sessione dell'utente. Log build/prepare e verifiche in backup/rep022. L'installazione va coordinata dopo il passo corrente e con backup; nessuna pubblicazione assegnata.

Osservatore readonly interattivo attivo per gli scatti richiesti, senza timer o transazione persistente: script `backup/rep022/observe-state.mjs`, alias effimeri, ultima evidenza `current-state.json`. Alla chiusura del collaudo fermarlo. Prova account/PC in corso, nessuna credenziale salvata; accesso PC e sincronizzazione ancora da verificare.
