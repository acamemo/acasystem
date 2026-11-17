# Prova ACA da PC e iPhone: account, dispositivi, profili e Tavano

## Banco corrente — ACA 0.9.46/r99, Sistema e account

[REP017](../../reports/REP-20261104-017-sistema-e-personalizzazione-account-unica.md): aggiornamento concluso05novembre con backup/dati/identità verificati. Aprire http://127.0.0.1:3002/ sul PC o http://192.168.1.11:3002/ sulla LAN, caricare il nuovo frontend e usare il proprio account. Account/profili e HA/D1 conservati, nessun nuovo setup. Uso esclusivo del profilo invariato.

In Sistema scegliere una delle11schede: ora si vede un pannello per volta; tornando dal proprio account si conserva la scheda. Provare avatar in testata → Account, colore libero, Foto e sfondo e ritaglio con etichette/valori. Foto presente sostituisce il colore; rimuoverla ripristina il colore. Lo sfondo resta personale nella vista account; Copertina di Sistema continua a indicare ora/calendario Home.

Crea account usa lo stesso editor. Le immagini preparate prima dell'accesso sono temporanee: ricaricare la pagina le perde. Il salvataggio avviene dopo il login verificato e il collegamento del client, senza immagini o password nei tentativi/log. Per vedere l'editor non serve creare un altro account né condividere credenziali in chat.

Le bozze conflittuali del campo titolo sono temporanee mentre Sistema resta montato: il messaggio spiega la perdita uscendo da Sistema. Le modifiche normali continuano a usare il coordinatore esistente. Bozze dashboard/IndexedDB non sono state toccate da questo aggiornamento. Prova umana/iPhone distinta dalla QA con dati sintetici e dall'UI anonima del banco. [Avvio e rollback .45](../../infrastructure.md), nove compose correnti; nessuna nuova installazione client. Le sezioni sotto conservano le prove precedenti.

## Stato precedente — ACA 0.9.45/r99, Tavano

[REP016](../../reports/REP-20261104-016-tavano-lista-giorni-paginazione.md): aggiornamento completato con backup verificato, account/profili e27tabelle conservati. HA e D1 non riavviati. Aprire http://127.0.0.1:3002/ sul PC o http://192.168.1.11:3002/ sulla LAN; caricare il nuovo frontend e aprire Tavano con l'account esistente, senza nuovo setup. La regola di uso esclusivo del profilo è invariata.

Prova suggerita:

1. Aprire il widget Tavano, ora riconoscibile dall'icona insetto.
2. Usare Giorni:0 indica meno di24ore,1–6 intervalli precedenti di24ore; Tutti include la cronologia ancora disponibile. Non sono giorni del calendario.
3. Usare Categoria e, se servono, aprire Filtri. Persona/dispositivo mantengono nomi storici; eventuali omonimi si distinguono tramite breve ID. Escape chiude solo la tendina.
4. Con oltre30voci, passare a Successiva e tornare con Precedente. Aggiorna riparte dalla prima pagina fresca. La navigazione non accumula voci.
5. Copia pagina include soltanto le voci della pagina, con nomi sostituiti e prompt diagnostico. Su HTTP può comparire il testo da selezionare. Anteprima JSON dei filtri comprende anche le altre pagine e dichiara il limite5000.

I log scadono a sette giorni, entro le quote già previste; una build nuova non cancella eventi ancora validi. Nessun caricamento automatico verso chat. Le bozze locali dei browser non sono state toccate dagli strumenti. UI/retention/paginazione provate su fixture e immagine isolata; UI anonima reale5viste verificata, prova umana/iPhone distinta. Avvio e rollback alla .44 in [infrastructure.md](../../infrastructure.md), usando gli otto compose correnti. Le sezioni seguenti conservano la cronologia.

## Stato precedente — ACA 0.9.44/r99, avvisi e panoramica

[REP015](../../reports/REP-20261104-015-sovrapposizioni-sync-e-anteprime-pagine.md): avvisi separati dall'indicatore e dai widget; in panoramica pagina centrale alla scala precedente e laterali al 90%, con passaggio fluido. Su schermi corti la presentazione dei widget si adatta allo spazio disponibile senza riscrivere la configurazione.

Aprire una nuova scheda su http://127.0.0.1:3002/ dal PC o http://192.168.1.11:3002/ dalla LAN: l'IP del PC è cambiato da .19 a .11. Account e profili sono conservati; usare l'account esistente. Se la vecchia scheda contiene una bozza non sincronizzata, tenerla aperta: il suo storage locale non viene trasferito automaticamente a un altro indirizzo. Questa correzione grafica non risolve implicitamente la causa della riserva scaduta e non scarta bozze.

Per osservare l'animazione entrare nella panoramica delle pagine e passare alla precedente/successiva: la pagina che entra cresce mentre quella uscente si riduce. Con movimento ridotto il cambio è immediato. La regola di uso esclusivo del profilo resta invariata; non aprire un secondo dispositivo per questa prova finché il primo occupa il profilo.

Backup e 27/27 tabelle verificati, HA/D1 e identità conservati. UI reale anonima verificata in cinque viste; animazioni e avvisi collaudati con componenti reali e stati sintetici, non con la sessione dell'utente. Comandi correnti e rollback alla .43 in [infrastructure.md](../../infrastructure.md), includendo l'override di rete rep042. Le sezioni successive sono storico.

## Stato precedente — ACA0.9.43/r99, Vetro Bianco

[REP014](../../reports/REP-20261104-014-banco-vetro-bianco.md): installata la versione rifinita con backup verificato e27/27tabelle conservate. Account/configurazioni/profili esistenti, HA e D1 attivi; nessun setup da ripetere.

Aprire http://127.0.0.1:3002/ sul PC o http://192.168.1.19:3002/ sulla LAN. Ricaricare il browser con Ctrl+F5 oppure chiudere/riaprire ACA. Con sessione valida si torna al proprio profilo; se richiesto accedere con l'account esistente. Per usare il telefono chiudere l'altra istanza ACA secondo la regola di uso esclusivo già concordata.

UI reale anonima verificata1366/390/320 e preferenze ridotte; prova autenticata/iPhone distinta. Comando corrente base+rep032+rep033+rep036+rep041 e rollback alla .42 in [infrastructure.md](../../infrastructure.md). Le sezioni seguenti sono storico.

## Stato precedente — ACA0.9.42/r99, Liquid Glass

[REP009](../../reports/REP-20261104-009-banco-liquid-glass.md): aggiornato il solo ACA su richiesta umana, con backup freddo verificato e27tabelle identiche dopo il riavvio. Account HA, identità tecnica, profili e originali recuperati conservati; HA/D1 non riavviati. Non ripetere creazione o importazione dei profili.

Aprire http://127.0.0.1:3002/ sul PC oppure http://192.168.1.19:3002/ sulla LAN. Ricaricare le schede già aperte (Ctrl+F5 nel browser PC) per caricare il nuovo frontend. Accedere con l’account esistente se richiesto; nessuna password in chat. Con sessione valida si rientra normalmente nel proprio profilo. La regola di uso esclusivo resta invariata: per passare al telefono chiudere ACA sul PC.

Nuovo tema verificato nell’interfaccia reale anonima1366/390; prova umana autenticata/iPhone distinta. Pubblica0.9.34 invariata. Compose corrente: base+rep032+rep033+rep036, con [avvio e rollback aggiornati](../../infrastructure.md). Le sezioni successive sono lo storico; non usarne i vecchi override per il banco attuale.

## Stato precedente — ACA0.9.41, prima creazione comune

[REP006](../../reports/REP-20261104-006-primo-account-interfaccia-comune.md): il primo account si presenta con la normale «Crea account», Nome utente unico, password/conferma e pill colore. Installato sul banco e verificato con HA reale isolato e nell’UI anonima effettiva. Aprire http://127.0.0.1:3002/ sul PC o http://192.168.1.19:3002/ sulla LAN.

La prima creazione è stata completata dall’utente. [REP005](../../reports/REP-20261104-005-recupero-account-banco.md) concluso: nuovo account funzionante, due copie recuperate e vecchi originali conservati; nella libreria dell’account nuovo restano3profili, compreso quello creato durante la prova. È attiva la copia del precedente profilo selezionato e l’utente conferma di vedere i widget recuperati. Non ripetere creazione/provisioning o script di copia. Checkpoint finale verificato in `backup/rep032/recovered-bank-checkpoint/`, con configurazione HA e database ACA; storia HA esclusa.

I passaggi del primo avvio attuale sono Crea account → Accedi → nome casa → scelta/caricamento profilo → Home. Con sessione valida le aperture successive rientrano nell’app. Per provare il nuovo account dall’iPhone sulla stessa LAN, chiudere prima ACA sul PC secondo l’uso esclusivo del profilo; inserire le credenziali soltanto nell’app. La prova iPhone resta da confermare.

Override correnti rep032 (HA dedicato) + rep033 (versione ACA), con il [comando aggiornato](../../infrastructure.md). [Manifest0.9.41.99](../../../progetto/ha-app/out/0.9.41.99/manifest.json), pubblico0.9.34 invariato. Le sezioni successive descrivono stati precedenti; non usarne gli override per riavviare il banco attuale.

## Stato precedente — ACA0.9.40, recupero e nuova creazione

[REP004](../../reports/REP-20261104-004-ingresso-semplificato-banco.md) installa nome utente unico, ingresso senza token manuale e pill colore. [REP005](../../reports/REP-20261104-005-recupero-account-banco.md) prosegue il recupero autorizzato dell’account: HA di prova nuovo e persistente, configurazione storica e due profili ACA conservati. Account e copia profili non ancora completati; attesa immagine dell’utente sul primo ingresso.

Aprire http://127.0.0.1:3002/ dal PC o http://192.168.1.19:3002/ sulla LAN. Il banco presenta la creazione iniziale richiesta, non il login dell’HA storico. Override corrente `backup/rep032/compose-recovery-local.yaml`; avvio descritto nell’[infrastruttura](../../infrastructure.md). Gli override delle sezioni successive sono storici. Artefatti locali [0.9.40.99](../../../progetto/ha-app/out/0.9.40.99/manifest.json), nessuna nuova release pubblica. Riferirsi al report005 per riprendere il recupero senza ricreare o riassegnare automaticamente i profili.

## Stato precedente — ACA 0.9.39, revisione99

Aggiornato al 2026-11-04, [REP-20261104-002](../../reports/REP-20261104-002-palette-fissa-tema-classico.md). Il banco usa **ACA Classico**, con palette chiara/viola fissa e senza sfondo globale; avatar e copertina dell'account restano personalizzabili. Account, profili e bozze sono conservati: non ricreare il proprietario o la casa.

Apri **[http://192.168.1.19:3002/](http://192.168.1.19:3002/)** sulla rete locale oppure **[http://127.0.0.1:3002/](http://127.0.0.1:3002/)** dal solo PC. L'utente ha confermato che ACA compare da Edge sul nuovo indirizzo LAN; la prova dal telefono su questo indirizzo resta da eseguire. Il PC che ospita la centrale deve rimanere acceso; il loopback non va usato sul telefono o nel suo QR.

Per mantenere questa versione locale usa l'[override Classico](../../../backup/rep029/compose-classic-local.yaml), dalla radice del repository:

```powershell
docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml -f backup/rep029/compose-classic-local.yaml up -d --no-deps --no-build --pull never tunet
```

Materiali **0.9.39.99**: [sorgenti](../../../progetto/ha-app/out/0.9.39.99/acasystem-src-0.9.39.99.zip), [bundle web](../../../progetto/ha-app/out/0.9.39.99/acasystem-web-0.9.39.zip), [manifest](../../../progetto/ha-app/out/0.9.39.99/manifest.json), [provenienza](../../../progetto/ha-app/out/0.9.39.99/SOURCE-PROVENANCE.json) e [SHA-256](../../../progetto/ha-app/out/0.9.39.99/SHA256SUMS). Il manifest richiede server0.9.39 e shell0.1.0. La release pubblica resta0.9.34; ZIP Windows e APK Android descritti sotto restano conservati.

## Stato precedente — ACA 0.9.38, revisione100

Le sezioni seguenti conservano istruzioni e riscontri precedenti. Gli indirizzi192.168.1.11 e gli override0.9.38 sono storici: per riprendere il banco corrente usa indirizzi e override riportati sopra.

Aggiornato al 2026-11-03, REP-20261103-004. [Piano iniziale](03-profili-dispositivi-tavano-piano.md), [architettura](../../architecture.md), [account e modifiche immediate](../../decisions/ADR-0036-account-e-modifiche-immediate.md), [uso esclusivo e posizioni adattive](../../decisions/ADR-0037-uso-esclusivo-profilo-e-posizioni.md), [collaudo umano PC/iPhone](../../reports/REP-20261102-015-prova-account-telefono-pc-sincronizzazione.md) e [hotfix del cambio dispositivo](../../reports/REP-20261103-004-cambio-dispositivo-immediato.md).

**Il banco esegue l'hotfix locale ACA 0.9.38, revisione100, con passaggio iPhone→Edge confermato dall'utente in pochi secondi.** Backup/dati verificati ed esiti in [REP-20261103-004](../../reports/REP-20261103-004-cambio-dispositivo-immediato.md). L'ultimo stato precedente era la revisione99. Configurazione comune per account, salvataggio automatico e uso del profilo da un solo dispositivo alla volta restano confermati. La release pubblica resta 0.9.34; questa prova non pubblica una nuova versione. Apri **http://192.168.1.11:3002/** dal PC e dall'iPhone collegato allo stesso Wi-Fi. Il PC deve restare acceso. Dal solo PC è disponibile anche http://127.0.0.1:3002/: questo indirizzo non va usato sul telefono o nel suo QR. Non si tratta ancora di un mini PC domestico installato.

**Sul banco casa e proprietario sono già stati creati dall'iPhone.** L'utente ha confermato l'accesso e i widget su iPhone e PC, poi Tavano aggiunto dal PC visibile anche sul telefono. Le prime conferme appartengono a REP015. Nella0.9.38/revisione99 l’utente ha poi confermato il passaggio PC→iPhone e il ritorno iPhone→Edge dopo attesa3min/Riprova; rilascio immediato Safari e spostamento Tavano non sono ancora confermati. [Riscontri e limiti precedenti](../../reports/REP-20261103-003-ritorno-iphone-edge.md). Nella revisione100 la prova reale assegnata è riuscita: chiusa la scheda ACA sull’iPhone, l’utente conferma «Sì, entra in pochi secondi» su Edge. Spostamento Tavano e altre reti/sospensioni restano prove distinte. Non ripetere la creazione del proprietario, della casa o dell'account.

ZIP Windows e APK Android sono contenitori nativi0.1.0: caricano la webapp e usano il backend v2 della centrale. La sola apertura del nuovo contenitore non aggiorna un'altra centrale ferma alla versione precedente.

## Riprendere la prova dopo l'hotfix

Con l'installazione confermata in REP-20261103-004, **ricarica una volta entrambe le webapp, su Edge e su iPhone**. La versione mostrata rimane0.9.38; i nuovi materiali si distinguono per SHA-256 e revisione100, non per un diverso numero nell'interfaccia. I contenitori verificano anche il checksum del bundle. Per passare la configurazione aggiornata all'altro dispositivo non occorre ricreare il profilo.

Per verificare prima il passaggio, apri ACA sul PC; poi chiudi l'app desktop e tutte le schede ACA del PC, lasciando il computer acceso, ed entra dall'iPhone. **Chiudi la scheda ACA nel selettore schede di Safari**, quindi torna a Edge: deve entrare automaticamente dopo pochi secondi. La sola pressione Home o il passaggio a un'altra app non equivale alla chiusura della scheda. Questa verifica fisica del passaggio è stata confermata dall’utente nella r100; le prove di modifica sotto rimangono distinte.

1. **Dal PC**, apri http://192.168.1.11:3002/ nel browser oppure usa questo indirizzo nel launcher ACA Windows. Con una sessione valida entri direttamente; altrimenti premi **Accedi** usando l'account già creato.
2. **Dall'iPhone sullo stesso Wi-Fi**, apri lo stesso indirizzo e usa lo stesso account. Non viene chiesto il nome del dispositivo. Finché ACA rimane aperta sul PC, il telefono deve mostrare: **questo profilo è in uso su un altro dispositivo chiudi le altre sessioni per usare questo dispositivo**.
3. Se compaiono configurazioni storiche divergenti, scegli una sola volta quella da usare. Le alternative restano recuperabili; la scelta vale per l'account sui suoi dispositivi.
4. Sul PC vai in **Sistema → Schermata Home → Modifica**, tocca il nome di una pagina e cambialo temporaneamente. Premi **Invio** o esci dal campo: la modifica si sincronizza senza un pulsante Salva. **Fine** termina la modalità di modifica. Attendi **Sincronizzato**.
5. Chiudi ACA sul PC o la sua scheda, lasciando il PC acceso: dopo circa 3 secondi il telefono deve entrare automaticamente e rileggere la configurazione aggiornata. Se resta in attesa, usa **Riprova**. Controlla il nome della pagina, poi ripristinalo dal telefono. Nelle impostazioni di un widget, **Fatto** attende gli ultimi campi e chiude.
6. Chiudi la scheda ACA sull'iPhone e riaprila sul PC per verificare la modifica inversa. Mettere soltanto il PC in secondo piano non libera il profilo; anche una seconda scheda ACA deve attendere il proprio turno.

L'accesso alternato della revisione99 è confermato, compreso il recupero dopo attesa3min e Riprova; questo non provava il rilascio immediato o la sua causa. L'immediatezza iPhone della revisione100, le modifiche dei punti4–5 e Tavano restano da completare fisicamente. App desktop e scheda Edge sono due istanze distinte anche sullo stesso PC: chiuderne una sola non libera il profilo se l’altra lo sta usando. Con il nuovo bundle, la fine dell'ultima connessione aggiornamenti del titolare avvia il rilascio dopo circa3 secondi, anche senza il messaggio di uscita del browser. Il fallback di180 secondi rimane quando la disconnessione non è rilevabile o il client non usa il nuovo protocollo. Per un'altra persona usa **Crea account** nel footer della schermata di accesso; accedere dallo stesso account serve invece a ritrovare configurazione e comandi personali su un altro dispositivo.

In «Configura la tua casa» trovi titolo, campi e azione, senza i precedenti paragrafi esplicativi. Nei campi password usa l'occhio per mostrare o nascondere ciò che stai scrivendo; password e conferma hanno controlli indipendenti. Il comando non invia il modulo. Errori e stati necessari restano visibili.

## Materiali e preparazione

- [ZIP Windows portable, revisione 2](../../../progetto/client/windows/release/profili-tavano-20261102/revisione2/Acasystem-0.1.0-win-x64.zip): estrai la cartella e apri `Acasystem.exe`.
- [APK Android debug, revisione 2](../../../backup/rep019/artefatti/revisione2/Acasystem-profili-tavano-debug.apk): materiale locale disponibile per il successivo collaudo Android; non è stato installato su un dispositivo fisico durante l'incarico.
- [Comandi di build, SHA-256 e prova di conservazione delle bozze](../../../backup/rep019/native-handoff-revisione2.md). Questi ZIP/APK sono locali e non sono allegati alla release pubblica0.9.34; i precedenti artefatti restano conservati.

La [release pubblica ACA0.9.34](https://github.com/acamemo/acasystem-releases/releases/tag/v0.9.34) contiene otto asset: sorgenti, web, manifest, bootstrap HAOS, istruzioni, provenienza e checksum, con download verificati in U55. Il wrapper hotfix predisposto è `ghcr.io/acamemo/acasystem:0.9.38.100`, che mostra ACA0.9.38: la revisione100 identifica il materiale locale, non una release pubblicata. Verifica in REP-20261103-004 quando risulta installato sul banco. ZIP Windows/APK revisione2 conservano il collegamento alla centrale e possono riceverne il nuovo bundle0.9.38; non sono stati ricompilati in questo intervento. Non serve eseguire il bootstrap HAOS per provare questo banco.

Materiali locali0.9.38/revisione100: [bundle web](../../../progetto/ha-app/out/0.9.38.100/acasystem-web-0.9.38.zip), [manifest](../../../progetto/ha-app/out/0.9.38.100/manifest.json), [provenienza](../../../progetto/ha-app/out/0.9.38.100/SOURCE-PROVENANCE.json) e [SHA-256](../../../progetto/ha-app/out/0.9.38.100/SHA256SUMS). Archivio web di3131273 byte, SHA-256 `e51cb410eccd5e9d0134917a9762652d631d6178cc184a8cc4368cb15d1f4b23`. Restano invariati i minimi del manifest: server0.9.38 e shell0.1.0.

### Riavviare il banco con la prova locale

Il file `.env` e il compose principale conservano la versione pubblica0.9.34. Dopo che REP-20261103-004 conferma installazione e disponibilità dei materiali, per mantenere l'hotfix0.9.38/revisione100 usa l'override locale predisposto. Dalla **radice del repository**:

```powershell
docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml -f backup/rep027/compose-switch-local.yaml up -d --no-build --pull never tunet
```

L'avvio con il solo compose principale usa invece la versione pubblica0.9.34; eseguirlo sostituisce la prova locale:

```powershell
docker compose --env-file progetto/.env -f progetto/compose.tunet.yaml up -d --no-build --pull never tunet
```

Il comando riguarda soltanto ACA, non riavvia HA/D1. Stato dell'installazione della revisione100, backup e verifiche dei dati sono registrati in [REP-20261103-004](../../reports/REP-20261103-004-cambio-dispositivo-immediato.md); questa guida non anticipa il loro esito.

**Passaggio precedente0.9.38/revisione99, conservato:** banco aggiornato e healthy in [REP-20261103-001](../../reports/REP-20261103-001-spostamento-widget-live.md). I materiali in `progetto/ha-app/out/0.9.38.99/` e l'override `backup/rep024/compose-usage-local.yaml` restano disponibili come stato precedente, distinto dall'hotfix100.

**Passaggio precedente0.9.37, conservato:** l'aggiornamento di [REP016](../../reports/REP-20261102-016-modifica-immediata-e-ingresso-profilo.md) aveva mantenuto invariate le26tabelle precedenti e aggiunto la selezione profilo per account, con HA/D1 non riavviati. Materiali0.9.37/revisione100 e override `backup/rep023/compose-live-local.yaml` restano disponibili come stato precedente; non sono quelli della prova corrente.

**Materiali precedenti U52–U54, conservati:** sul PC rimane il wrapper locale di sola verifica `ghcr.io/acamemo/acasystem:0.9.34.99`, con [manifest/provenienza](../../../progetto/ha-app/out/0.9.34.99/SOURCE-PROVENANCE.json), sorgenti ZIP e bundle nella stessa cartella. La revisione99 non è stata pubblicata e non è quella installata sul banco aggiornato in U55.

Per provare in futuro un'altra centrale, devono essere disponibili HA e ACA già predisposti e l'indirizzo completo corretto, compresa la porta. In Sistema controlla le informazioni della versione web; il numero0.1.0 della shell identifica il contenitore nativo. L'indirizzo192.168.1.11 è quello attuale di questo PC, non un valore da applicare ad altri impianti.

Su una centrale nuova il primo proprietario e la preparazione della casa hanno un flusso distinto, completabile anche da telefono. Il banco attuale ha già superato quei passaggi. La creazione libera dei membri richiede anche l'identità tecnica ACA pronta: se gli accessi sono in preparazione, attendi e usa **Riprova**.

## Aprire la stessa centrale

Su Windows, al primo avvio incolla l'indirizzo della centrale nel launcher e conferma il collegamento. L'app verifica la centrale, riceve la webapp e apre il suo accesso. Le aperture successive riusano l'indirizzo salvato. **Cambia indirizzo** permette di scegliere un'altra centrale; il cambio rimuove la sessione precedente da quel contenitore.

Android non configurato apre prima lo scanner. Consenti la fotocamera e inquadra il QR pubblico della centrale. Annullamento, diniego o errore rendono disponibile l'inserimento manuale dell'indirizzo. Con una centrale già salvata, ACA la riapre normalmente.

Da ACA già aperta sul PC vai in **Sistema → QR Code → Mostra QR di collegamento**. La schermata mostra QR, indirizzo selezionabile e **Copia indirizzo**. Per questo banco usa l'indirizzo LAN http://192.168.1.11:3002/, anche quando apri ACA dal PC. Su iPhone puoi inquadrare quel codice con la fotocamera e aprire ACA nel browser; il percorso QR/fotocamera resta da collaudare fisicamente. La conferma U55 riguarda l'apertura della schermata all'indirizzo LAN.

Il QR pubblico contiene l'URL della centrale. Rimane utilizzabile finché quell'indirizzo non cambia; ogni persona deve comunque registrarsi o accedere. L'invito temporaneo account/layout, nella stessa sezione Sistema, ha invece durata di cinque minuti e un solo utilizzo.

## Nuova persona oppure altro dispositivo

La pagina di ingresso mostra direttamente il form di accesso. Nel footer puoi passare a **Crea account** e tornare ad **Accedi**:

| Scelta | Quando usarla | Passi successivi |
| --- | --- | --- |
| **Crea account** | Una persona che vuole il proprio account HA nella casa | Nome, nome utente, password e conferma; **Colore profilo** facoltativo. Dopo la creazione accedi con quell'utente. |
| **Accedi** | Un altro PC, telefono o tablet della stessa persona | Usa le credenziali HA già esistenti: ritrovi l'interfaccia del tuo account quando il profilo è libero. |

La registrazione dei membri è libera per chi raggiunge la centrale pronta: non compare un'approvazione da parte di un altro membro. Il nuovo membro non riceve privilegi amministrativi. HA conserva l'account; ACA conserva soltanto i dati necessari a riprendere il tentativo, senza la password. Se l'esito resta in verifica, riprova con lo stesso tentativo invece di creare un altro utente.

Dopo l'accesso il dispositivo viene riconosciuto automaticamente, per esempio **PC Windows** o **iPhone**. Se aveva già un nome scelto, questo viene conservato; il nome rimane modificabile in **Sistema → I miei dispositivi**. Non compare un campo obbligatorio per denominarlo. Gli accessi restano indipendenti anche con lo stesso account: puoi scollegare il telefono lasciando collegato il PC. I vecchi token condivisi richiedono un login personale per ottenere questa separazione.

## Scegliere o recuperare un profilo

Con un account già configurato ACA riapre automaticamente il suo profilo attivo, se libero. Se è già usato su un altro dispositivo o in un'altra scheda, compare il messaggio di attesa; non viene creata un'altra configurazione. **Il tuo profilo ACA** compare per un account ancora senza configurazione o quando alternative storiche divergenti richiedono una scelta esplicita. In quest'ultimo caso scegli il profilo da recuperare; gli originali restano disponibili.

Per la prima configurazione scegli eventualmente una **Configurazione di partenza**, indica **Nome del profilo** e premi **Continua**. L'**Anteprima della configurazione** è richiusa e si può aprire prima di scegliere. Non è richiesta una denominazione del dispositivo durante la creazione del profilo.

Un profilo iniziale nuovo riceve le pagine di partenza. Una configurazione importata conserva i propri contenuti senza essere riempita con nuove categorie automatiche. Configurazione, comandi, ordine dei widget e preferenze di posizione sono comuni all'account; colonne e dimensioni si adattano allo schermo. Un telefono può mostrare più segmenti della stessa pagina senza creare nuove pagine persistenti. Gli originali di migrazione rimangono conservati sulla centrale.

Per spostare Tavano o un altro widget, tienilo premuto e trascinalo sulla cella desiderata. La posizione può mantenere uno spazio vuoto precedente: un widget unico non deve più tornare automaticamente all'inizio. Dopo la sincronizzazione e la riapertura, sullo stesso formato resta la posizione scelta. Sugli altri schermi viene adattata alla griglia disponibile: per esempio colonna3/riga3 sul PC può diventare colonna2/riga4 sul telefono. Non è una promessa di coordinate o dimensioni identiche in pixel.

In **Sistema → Profili** puoi:

- scegliere **Usa questo profilo**, cambiare il nome o eliminare un tuo profilo;
- creare una copia come nuovo profilo, con un nome distinto;
- esportare la configurazione o **Importa come nuovo profilo**;
- consultare e recuperare le bozze locali.

La libreria e il profilo attivo appartengono al tuo account. Scegliere un altro profilo vale anche per gli altri dispositivi collegati allo stesso account; eventuali modifiche già aperte devono essere terminate o conservate prima di cambiare. L'uso del profilo avviene su un dispositivo alla volta. Pagine e popup aperti restano locali al singolo schermo.

## Provare salvataggio e passaggio fra dispositivi

1. Apri il profilo sul PC e accedi dallo stesso account sull'iPhone. Il secondo deve mostrare esattamente: **questo profilo è in uso su un altro dispositivo chiudi le altre sessioni per usare questo dispositivo**. Il telefono non deve poter azionare o modificare il profilo mentre è occupato.
2. Dal PC usa **Sistema → Schermata Home → Modifica**: non serve disattivare prima **Blocca la disposizione**, che non è più mostrato nel percorso live. Rinomina una pagina, premi **Invio** o esci dal campo. La modifica viene inviata automaticamente; **Fine** esce dalla modalità di modifica.
3. Nelle impostazioni di un widget modifica un valore. La modifica conclusa viene sincronizzata automaticamente; **Fatto** attende gli ultimi campi e chiude, senza un secondo Salva. Trascina anche Tavano su una cella libera e attendi **Sincronizzato**. Ricarica il PC: deve mantenere profilo e posizione senza cedere il turno al telefono in attesa.
4. Metti ACA in secondo piano sul PC: il profilo deve restare occupato. Poi chiudi ACA o tutte le sue schede che lo usano, lasciando acceso il PC che ospita la centrale. Dopo la breve attesa di circa 3 secondi, il telefono deve entrare automaticamente nella configurazione aggiornata. **Riprova** permette di ritentare se necessario. Controlla nome, valore e disposizione adattata di Tavano.
5. Modifica dal telefono, attendi la sincronizzazione e chiudi la sua scheda ACA. Riapri sul PC per verificare la direzione inversa. **Annulla ultima modifica**, quando disponibile, applica soltanto l'inverso controllato della modifica interessata.

Gli stati **Sincronizzazione…**, **Modifiche in attesa** e **Sincronizzato** distinguono l'invio dalla conferma. Errori o conflitti restano visibili con la bozza recuperabile e un'azione di ripresa; non occorre confermare ogni modifica con un pulsante Salva globale.

Con l'hotfix100 il collegamento aggiornamenti SSE identifica la singola istanza ACA autenticata. Quando la centrale rileva la fine dell'ultima connessione di quell'istanza, avvia un rilascio di circa 3 secondi legato alla concessione corrente: funziona anche se il messaggio di uscita del browser non arriva. La riconnessione della stessa istanza annulla questa attesa; una vecchia disconnessione non può liberare il proprietario successivo. La normale uscita conserva anche la grazia di 3 secondi per il ricaricamento dello stesso client.

Una pagina ancora aperta e connessa, anche in secondo piano, mantiene il turno. La scadenza generale resta di 180 secondi, rinnovata ogni 20: è il fallback per i client senza il nuovo collegamento o quando la rete non rende rilevabile la chiusura. Il solo rinnovo HTTP non annulla il rilascio già avviato per la fine degli stream. La pagina ripresa deve riverificare l'uso e rileggere il profilo prima di riabilitare comandi e modifiche. Non occorre disconnettere l'account o revocare il dispositivo per passare il turno. L'effetto della chiusura reale di Safari sulla nuova revisione resta da confermare con la prova fisica.

Le riserve interne di editing restano distinte: durano 45 secondi, con rinnovo ogni 15, e proteggono le risorse effettivamente coinvolte, comprese le impostazioni propagate. Una vecchia finestra non può salvare con un permesso scaduto. Gli stati HA e le automazioni sulla centrale continuano a funzionare mentre un altro client attende il profilo.

## Interruzione della rete e bozze

Le copie già lette e le bozze restano conservate sul dispositivo durante un'interruzione. Il loro possesso non permette di aggirare l'uso esclusivo: se ACA non può verificare la riserva, il profilo resta bloccato e propone **Riprova**. Un primo accesso senza dati conosciuti richiede la centrale. Se l'interruzione avviene durante un editor ancora attivo, **Offline · bozza sul dispositivo** distingue i dati locali da quelli sincronizzati; quando consentito, **Fatto** termina conservando la bozza e non indica un salvataggio già riuscito sulla centrale.

Quando il profilo torna disponibile, in **Sistema → Profili → Bozze locali** usa **Riprendi**, **Esporta bozza**, **Crea copia indipendente** o **Scarta**. Alla riconnessione ACA verifica l'uso e rilegge la configurazione della centrale. Se la stessa risorsa è cambiata, mostra il conflitto: scegli **Usa versione attuale**, **Usa la mia bozza** o **Crea copia indipendente**. Nello sheet del widget le prime due azioni si chiamano **Usa quella attuale** e **Usa la mia**. Una risposta persa può lasciare una bozza con sincronizzazione in verifica: scartare la copia locale non annulla una modifica già accettata sulla centrale. **Riprova sincronizzazione** riprende un invio in errore senza introdurre un Salva obbligatorio nel percorso normale.

Il limite delle bozze è 10 MiB. A quota esaurita ACA blocca nuove modifiche e permette di esportare/scartare esplicitamente; non cancella bozze in silenzio. Nei contenitori nativi **revisione 2**, il cambio IP o centrale conserva il database delle bozze e pulisce credenziali, identità memorizzata, cookie, cache e foto locali precedenti. Per recuperare una bozza devi accedere di nuovo alla casa e all'account corretti; un'altra casa o persona non la vede. Se la pulizia non termina, ACA mostra l'errore e non apre la nuova webapp con la vecchia identità.

La cancellazione manuale dei dati del browser/app resta un'operazione distinta: prima esporta ciò che vuoi conservare. Le bozze non accodano accensioni, aperture o altri comandi fisici.

Un rifiuto definitivo o una revoca riapre il login; una centrale temporaneamente indisponibile conserva la sessione nota. La chiusura dell'app sul client non spegne HA o le automazioni del mini PC.

## Nomi e revoca dei propri dispositivi

In **Sistema → I miei dispositivi** trovi i client del tuo account. **Salva nome** rinomina il client; **Scollega dispositivo** chiede conferma e blocca quell'accesso senza eliminare account, profili o gli altri client.

Se HA non conferma ancora, appare **Revoca in attesa** e da un altro client rimane **Riprova revoca**. Scollegare il client in uso riporta all'accesso anche durante quell'attesa. Per provare la revoca indipendente, scollega il telefono dal PC e verifica che il PC mantenga il proprio accesso.

## QR account e copia del layout

In **Sistema → QR Code → Genera QR Code** crei l'invito temporaneo. Dopo averlo inquadrato:

- **Collega account** richiede il login con lo stesso account del mittente. Il nuovo client ritrova il profilo attivo dell'account e vi entra quando è libero, con la configurazione aggiornata; una scelta esplicita resta necessaria soltanto per alternative storiche ancora da risolvere.
- **Importa layout** produce una copia indipendente. Nel browser scarica il file, apri ACA della tua casa e usa **Sistema → QR Code → Importa file layout**. Nella shell una copia ricevuta resta da convalidare e può comparire come **Layout ricevuto dal QR** nella scelta del profilo, oppure come **Salva il layout ricevuto** in Sistema.

La copia trasferisce interfaccia e aspetto consentito. Mantiene casa e account del destinatario; non trasferisce credenziali o controllo dei dispositivi del mittente. I widget importati vanno collegati ai dispositivi della propria casa. Le modifiche successive dei due profili rimangono indipendenti.

## Aprire e copiare Tavano

Apri **Tavano** dal relativo widget; se manca, aggiungilo dal catalogo dei widget. Il click apre la lista a schermo intero, con avatar/nome della persona, client, azione, esito e **Dettagli**. Il registro è consultabile da tutti i membri autenticati della casa, comprese le attività dei profili; ciascuno continua a modificare soltanto i propri profili.

Usa i filtri per persona, dispositivo, profilo, widget, categoria, esito o intervallo. **Carica altre** estende le voci lette. **Copia (n)** copia tutte e soltanto le `n` voci attualmente caricate, con un prompt diagnostico e nomi sostituiti per la condivisione. Se la clipboard del browser non è disponibile, compare il testo selezionabile. La scelta di incollarlo in una chat rimane tua: ACA non lo invia automaticamente.

**Anteprima esportazione JSON** mostra la copia depurata prima di **Scarica JSON depurato**. Il registro arriva fino a sette giorni entro la quota disponibile; non promette sette giorni completi sotto qualsiasi carico. Un comando accettato da HA e l'effetto osservato sul dispositivo sono distinti. Un esito incerto non genera un nuovo invio automatico.

## Personalizzare foto, colore e sfondo account

In Sistema premi l'icona del tuo account. Nella vista **Il mio account**, tocca l'avatar o **Personalizza account** per scegliere un colore oppure **Carica foto profilo**. Con una foto presente il colore del cerchio non compare; **Rimuovi foto profilo** ripristina il colore.

Il ritaglio permette trascinamento, zoom, posizione orizzontale/verticale e **Ruota di 90°**. Conferma con **Usa questo ritaglio**. **Sfondo account** apre il ritaglio della cover, visibile soltanto nella vista account, senza cambiare lo sfondo del profilo dashboard.

Sono ammessi sorgenti JPEG, PNG o WebP fino a 10 MiB. Il browser produce avatar 512×512 entro 256 KiB e cover 1536×768 entro 768 KiB; una foto non elaborabile mostra un errore prima del salvataggio. Se un altro client modifica l'account nel frattempo, ACA rilegge i dati e chiede di verificare prima di salvare di nuovo. Foto e sorgenti non entrano nelle copie Tavano o nel layout condiviso con un amico.

## Cosa è stato provato e cosa resta da provare

Build native locali e smoke Windows con centrali simulate, prove della webapp/backend con HA simulato e immagini sono in [REP012](../../reports/REP-20261102-012-profili-client-editing-tavano.md). Pubblicazione0.9.34, backup e aggiornamento del banco PC, integrità delle nove tabelle legacy e correzione firewall sono in [REP013](../../reports/REP-20261102-013-pubblicazione-0.9.34-aggiornamento-centrale.md). Il banco0.9.35 e i controlli su form/password sono documentati in [REP014](../../reports/REP-20261102-014-accesso-essenziale-password-visibile.md).

Nel successivo [REP015](../../reports/REP-20261102-015-prova-account-telefono-pc-sincronizzazione.md), l'utente ha creato il proprietario dal telefono e confermato login/widget su iPhone e PC; i due client sono stati allineati allo stesso profilo e Tavano aggiunto dal PC è risultato visibile sul telefono. La precedente sequenza sblocco/modifica/Salva ha motivato il nuovo intervento.

[REP016](../../reports/REP-20261102-016-modifica-immediata-e-ingresso-profilo.md) documenta0.9.37: il banco isolato FakeHA aveva verificato dieci scenari con desktop e telefono emulato, fra cui accesso allo stesso profilo senza scelte, modifiche bidirezionali senza Salva/reload, ultimo campo incluso da Fatto e persistenza. Due client, un profilo e nessun comando fisico; quattro schermate auth e CTA di almeno44px verificate. Aggiornamento del banco reale con backup verificato,26tabelle precedenti invariate e nuova selezione profilo per account; HA/D1 non riavviati. La richiesta successiva sostituisce l'uso contemporaneo con l'alternanza fra dispositivi.

[REP-20261103-001](../../reports/REP-20261103-001-spostamento-widget-live.md) documenta 0.9.38 e la correzione Tavano. La prova browser isolata con HA simulato ha superato sette scenari: trascinamento e persistenza sulla cella libera del PC, secondo client bloccato con messaggio esatto, ricaricamento del PC senza perdita del turno, rinnovo della riserva, chiusura e ingresso automatico del telefono, adattamento della disposizione senza nuove pagine e PC riaperto bloccato. Il passaggio dopo la chiusura ha ottenuto la concessione dopo 3012 ms e l'interfaccia pronta dopo 3485 ms; due client, un profilo, nessun comando fisico e nessun errore JavaScript. Sono prove con Chromium e telefono emulato, non una conferma di Safari o hardware reale. Il browser headless è rimasto visibile anche portando un'altra pagina davanti: il vero PC minimizzato/in secondo piano resta da verificare fisicamente, distinto dai controlli software del mantenimento della riserva.

[REP-20261103-004](../../reports/REP-20261103-004-cambio-dispositivo-immediato.md) documenta l'hotfix0.9.38/revisione100. La nuova app completa con HA simulato ha superato sei scenari: stream associato all'istanza titolare, proprietario ancora aperto dopo22,5s e PC respinto, reload telefono, chiusura telefono con DELETE di uscita realmente scartato, riapertura del vecchio titolare bloccata e reload PC, chiusure ordinarie nelle due direzioni. Senza DELETE il PC entra automaticamente in3471ms; le chiusure ordinarie PC→telefono e telefono→PC richiedono rispettivamente3395ms e3540ms. Due client, un profilo, nessun errore JavaScript e nessun comando fisico. La baseline precedente con il rilascio scartato rimaneva bloccata dopo7091ms e Riprova423. Sono risultati Chromium emulato, distinti dal nuovo riscontro fisico atteso dopo l'installazione.

Il rilascio rapido della revisione100 su Safari reale, lo spostamento Tavano sul dispositivo dell'utente, i comandi su dispositivi reali, l'installazione su mini PC domestico, fotocamera e permessi Android, il flusso QR su iPhone e la continuità H24 non sono stati collaudati. Il precedente accesso alternato PC/iPhone e il recupero dopo attesa restano invece confermati dall'utente in REP-20261103-003.

La prova descritta usa la rete locale. Accesso da rete mobile o da fuori casa, cloud/relay e nuova schermata di avvio HAOS restano fuori dal lavoro. L'esperimento VM desktop rimane conservato e non viene avviato dai nuovi contenitori.
