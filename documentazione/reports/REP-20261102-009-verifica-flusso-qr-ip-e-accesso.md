# Verifica del primo collegamento QR/IP e accesso web

| Campo | Valore |
|---|---|
| ID | REP-20261102-009 |
| Stato | Verifica completata, nessun codice modificato |
| Data | 2026-11-02, Europe/Rome |
| Autore / modello | Codex; nome esatto del modello non disponibile |
| Commit iniziale | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta | U47: valutare desktop IP/incolla, Android scanner al primo collegamento con consenso e fallback IP, QR mostrato dal sistema HAOS; «Come ti sembra questa soluzione? Verifica senza scrivere ancora codice» |
| Precisazione umana | U48: «si appunto, si connette alla centrale e ciò che succede subito dopo parte la registrazione se non sei registrato o accesso se risulti già registrato» |
| Perimetro | Lettura sorgenti e fonti primarie, valutazione e memoria documentale. Nessuna implementazione, dipendenza, installazione, build/test applicativo, VM o pubblicazione autorizzata. |

## Obiettivo e criteri

Verificare compatibilità del flusso con i client correnti, ruolo della libreria Nayuki, contenuto del QR, passaggio ad autenticazione web e disponibilità della schermata HAOS. Distinguere implementato, intento umano e scelte esecutive proposte. Conservare i risultati senza modificare codice/configurazioni.

## Valutazione del flusso

La soluzione è coerente con mini PC centrale/client e registrazione/accesso nella webapp, già confermati da U37 e precisati da U48. Un QR di collegamento sostituisce la digitazione dell'indirizzo e conserva un fallback equivalente. Desktop può usare soltanto IP o URL completo incollato; Android può privilegiare lo scanner al primo collegamento. Alla riapertura una configurazione valida e una sessione valida consentono di aprire ACA direttamente.

Flusso consigliato, non ancora implementato integralmente:

1. Centrale con HA/ACA pronti mostra QR e URL completo, per esempio http://192.168.1.50:3002/. È l'endpoint ACA sul computer HAOS, non l'interfaccia HA su8123.
2. Android non configurato entra nel percorso scansione, spiega l'uso della fotocamera e richiede il consenso prima di accedervi. Annullamento/rifiuto restano sul collegamento con possibilità IP; non riaprire lo scanner o il consenso in ciclo. Il percorso con un tocco esplicito «Scansiona» è la variante consigliata dalle linee guida Android per la richiesta contestuale del permesso.
3. QR/IP sono validati e la centrale deve rispondere come ACA prima di salvare. Poi la stessa webapp gestisce account e configurazione.
4. Centrale senza proprietario: creazione primo account. Centrale con configurazione incompleta: autenticazione se necessaria e completamento della casa. Centrale pronta senza sessione: accesso. Sessione valida: uso dell'app. Un nuovo telefono con un account esistente segue l'accesso.

«Non registrato» non è rilevabile dalla sola scansione: occorre distinguere casa senza primo proprietario da persona nuova in una casa già configurata. Il codice attuale crea soltanto il primo proprietario tramite onboarding; la registrazione autonoma di ulteriori utenti non va dedotta da questo flusso. Nessuna nuova funzione multiutente implementata o approvazione tecnica implicita registrata.

## Riscontro sui sorgenti correnti

| Parte | Implementato oggi | Differenza rispetto alla proposta |
|---|---|---|
| Desktop | [shell/index.html](../../progetto/client/windows/shell/index.html), [wizard.ts:35](../../progetto/client/core/src/wizard.ts:35): IP o URL canonico ACA, porta acquisita dall'URL, health prima del salvataggio. Nessuno scanner desktop. | Percorso proposto già compatibile. La verifica riguarda sorgenti, non una nuova certificazione del vecchio ZIP. |
| Primo avvio Android | [main.ts:80](../../progetto/client/android/web/main.ts:80) apre oggi IP se manca la centrale; accesso scanner con show-scan e poi scan. | Manca orchestrazione scanner-first/avvio automatico iniziale. Un test corrente fissa esplicitamente IP-first: va aggiornato in un eventuale incarico di implementazione. |
| Camera Android | [plugin:56](../../progetto/client/android/android/app/src/main/java/it/acasystem/client/AcaShellPlugin.java:56): controlla hardware/permesso, poi CaptureActivity QR; gestisce rifiuto, annullamento e indisponibilità. Camera opzionale nel manifest. | Lettore/permessi già esistenti. «Usa IP» è nella schermata launcher, raggiungibile chiudendo la camera; un pulsante direttamente nell'anteprima richiederebbe adattamento nativo aggiuntivo. |
| Riapertura Android | [main.ts:82](../../progetto/client/android/web/main.ts:82) usa centrale salvata e avvio normale; se irraggiungibile mostra errore senza perdere configurazione. | Conservare questo percorso, evitando camera a ogni avvio o rete momentaneamente assente. |
| QR generico | [show-connection.mjs:4](../../progetto/ha-app/image/show-connection.mjs:4), [connectionCode.ts](../../progetto/client/core/src/connectionCode.ts): solo URL, niente account/password/token. Android lo passa a submitAddress e boot. | Adatto alla connessione seguita da registrazione/accesso web di U48. Nessuna nuova associazione autenticata necessaria nel payload. |
| Account web | [AppRoot.tsx:64](../../progetto/acasystem/frontend/src/routes/AppRoot.tsx:64), [homeAssistantSetup.ts:26](../../progetto/acasystem/backend/src/services/homeAssistantSetup.ts:26): gate owner/setup/ready, accesso e riuso credenziali/sessione. | La distinzione è stato centrale/sessione; un QR non riconosce da solo una persona. |
| QR bootstrap HAOS | [bootstrap-haos.sh:92](../../progetto/ha-app/bootstrap/bootstrap-haos.sh:92) stampa QR e URL dopo installazione/health/versione nella console dove viene eseguito. | Non è una schermata locale automatica al boot: [run.sh](../../progetto/ha-app/image/run.sh) avvia il server senza richiamare il QR. |
| QR in ACA | [qrCodeSection.tsx:64](../../progetto/acasystem/frontend/src/pages/system/sections/qrCodeSection.tsx:64) genera il collegamento e mostra URL testuale; distinto da invito account/layout. | Nessun pulsante esplicito Copia. L'indirizzo oggi viene stampato prima del QR console; la disposizione sotto al QR resta da definire. |

L'invito account/layout resta un altro QR, temporaneo e monouso, generato dall'utente autenticato in ACA. Richiede comunque login; non va confuso con il QR generico di avvio. Un invito con hash/query incollato nel wizard desktop non equivale al riscatto dell'invito: il percorso richiesto qui riguarda l'URL canonico della centrale.

## Contenuto e raggiungibilità

Raccomandato mantenere il QR di avvio come URL completo, leggibile anche da fotocamera normale/browser; non contiene credenziali o sessioni persistenti. La webapp continua a fare registrazione/accesso. Un eventuale futuro codice di autorizzazione temporaneo sarebbe un requisito diverso dal collegamento qui chiarito.

Oggi i client supportano IPv4 privato e HTTP locale; il generatore console richiede porta3002. Nomi .local, IPv6, HTTPS/remoto non sono supportati da questi parser. PC Ethernet e telefono Wi-Fi possono raggiungersi sulla stessa LAN: non serve lo stesso mezzo fisico, serve assenza di isolamento tra reti e porta accessibile. Il QR non configura il Wi-Fi o l'accesso remoto. IP assegnato a una VM in NAT può essere irraggiungibile dal telefono, come già documentato in U39.

Il QR deve riflettere l'indirizzo LAN corrente; un IP cambiato rende vecchio il collegamento. Rilevamento/aggiornamento automatico al boot non è presente nel percorso verificato. Inoltre una console su un monitor fisico consente di trascrivere l'indirizzo: per «Copia» sul desktop serve una pagina/console aperta sul PC o altro contesto con appunti, non basta mostrarlo su un monitor separato.

## Nayuki

Verificati README master e sito autore il2026-11-02. La libreria offre encoder TypeScript/JavaScript e altri linguaggi, matrice di moduli/pixel QR e licenza MIT. Può generare il simbolo del collegamento, ma non implementa scansione camera, permessi, rete, associazione o login. Queste responsabilità restano nei client/server; non richiede la stessa libreria del lettore Android per interoperare con QR standard.

ACA usa già qrcode-generator2.0.4 per generazione e JourneyApps/ZXing per la lettura Android. Non è necessario introdurre Nayuki per realizzare questo flusso; la candidatura U41 rimane valida ma non risulta un vantaggio che giustifichi una sostituzione ora. Nessuna revisione Nayuki adottata, scaricata come dipendenza o compilata.

Fonti primarie consultate il2026-11-02:

- [Nayuki README master](https://github.com/nayuki/QR-Code-generator/blob/master/Readme.markdown) e [pagina autore](https://www.nayuki.io/page/qr-code-generator-library): encoder, output e licenza. Ramo letto, nessun pin assunto.
- [Android runtime permissions](https://developer.android.com/training/permissions/requesting): richiesta contestuale, controllo del permesso e possibilità di continuare se negato.
- [Android camera access](https://developer.android.com/training/permissions/explaining-access): accedere alla camera solo dopo consenso.
- [HAOS local console](https://contributors.home-assistant.io/os/operating-system/debugging/#the-local-console): monitor/console VM mostrano HA CLI. Non fornisce da sola la schermata grafica ACA desiderata.

## Esito, limiti e punto di ripresa

Flusso giudicato coerente, con direzione U48 confermata: collegamento prima, account nella webapp subito dopo. Parti già presenti e lacune sono separate sopra; intento esecutivo registrato in ISSUE-135 senza avviare implementazione. Priorità eventuale: onboarding Android scanner-first e modalità reale di visualizzazione QR/IP della centrale. La scelta del generatore QR non è il blocco principale.

Solo letture statiche e navigazione delle fonti primarie; non eseguiti test/build, scanner fisico, avvio HAOS/VM, installazioni o cambi codice/config. I collaudi precedenti restano storici. Mantenute tutte le modifiche preesistenti; HEAD5c321b9 e nessun commit. Verifica completata, nessun incarico di codice attivo.
