# Riflessione su editing condiviso, bozze offline e Tavano

| Campo | Valore |
|---|---|
| ID | REP-20261102-011 |
| Stato | Riflessione completata; nessun piano redatto |
| Data | 2026-11-02, Europe/Rome |
| Autore / modello | Codex; nome esatto del modello non disponibile |
| Commit iniziale | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta U50 | Approfondire l'evidenziazione del widget con «[nome_utente] sta editando…», attesa degli altri editor, widget «Tavano» per consultare/condividere log e cancellazione settimanale per contenere lo spazio. Testo nel [diario](../riprogettazione/diario/2026-11-02.md#u50-editing-condiviso-offline-e-tavano). |
| Autorizzazione | Proseguire la riflessione U49 e conservarne memoria. Nessun piano esecutivo, codice, installazione, test di prodotto, VM, esportazione di log reali o invio a terzi. |

## Obiettivo e perimetro

Valutare il blocco durante la modifica, i suoi limiti in caso di disconnessione e la conservazione delle modifiche; distinguere il registro di attività desiderato dai registri già esistenti e proporre regole comprensibili di consultazione, condivisione e durata. Riferimenti: [riflessione U49](REP-20261102-010-riflessione-utenti-dispositivi-profili.md), [architettura corrente](../architecture.md), [ADR-0031](../decisions/ADR-0031-ritorno-mini-pc-client.md). Le indicazioni seguenti sono raccomandazioni, non decisioni accettate né tappe di sviluppo.

Al momento dell'apertura Git mostra numerose modifiche preesistenti (388 righe di stato); vengono preservate. L'intervento modifica soltanto la memoria documentale. Nessuna modifica a prodotto, requisiti approvati o ADR accettati.

## Criteri di completamento

- Spiegare chi attende, su quale risorsa e quando il diritto di modifica termina, includendo due dispositivi dello stesso account e il ritorno di un vecchio editor.
- Definire una regola proposta per le bozze offline senza sovrascritture silenziose o dipendenza dalla durata dei log.
- Distinguere presenza, attività, diagnosi, storia HA e ripristino; indicare riscontri reali e lacune di ACA.
- Proporre durata e limiti di spazio, consultazione ed esportazione volontaria, senza promettere completezza o capacità non provate.
- Controllare collegamenti e perimetro documentale; registrare limiti e punto di ripresa.

## Avanzamento e modifiche

Lettura dei flussi di sincronizzazione/salvataggio, launcher/rimozione/undo, registro dispositivi, cronologie e logger. Confronto indipendente degli scenari di concorrenza e dei registri. I riscontri e le raccomandazioni sono distinti di seguito.

### 1. Modifica esclusiva e indicazione sul widget

La proposta dell'utente è sensata per la **configurazione dello stesso widget nello stesso profilo condiviso**. Un dispositivo ottiene dalla centrale il diritto temporaneo di modificarlo; gli altri lo vedono evidenziato, con testo centrato orizzontalmente e verticalmente, per esempio «Mario sta modificando…» e «PC dello studio». La stessa persona su due dispositivi può leggere «Stai modificando dal PC dello studio». Identità account, client e singola sessione di editing devono restare distinti, anche fra due schede dello stesso browser.

Il blocco riguarda proprietà/layout/associazioni del widget. Non congela la casa o gli aggiornamenti di HA; la disponibilità dei normali comandi domotici va trattata separatamente, soprattutto mentre cambiano associazioni o viene rimosso un widget. Gli altri widget restano modificabili quando le operazioni sono indipendenti. Due copie personali non condivise di un widget sulla stessa luce non sono automaticamente la stessa risorsa di configurazione.

La scritta non costituisce la protezione: la centrale deve concedere il diritto a un solo editor e verificarlo al salvataggio. Il controllo della versione impedisce inoltre di accettare una base superata. Come riferimento concettuale, lock rinnovabili con scadenza sono descritti da [RFC 4918 §6.6](https://www.rfc-editor.org/rfc/rfc4918.txt); controlli condizionali contro aggiornamenti persi da [RFC 9110 §13.1.1](https://www.rfc-editor.org/rfc/rfc9110.html#section-13.1.1). Non si propone l'adozione di WebDAV o di un protocollo specifico.

| Caso | Comportamento raccomandato, non implementato |
|---|---|
| Due editor arrivano insieme | La centrale assegna il diritto a uno; l'altro vede l'indicazione e attende. |
| Salva | Il widget si libera dopo conferma del salvataggio della centrale; eventuali errori rimangono visibili. |
| Annulla | Vengono scartate soltanto le modifiche locali di quell'editing, senza ripristinare lo stato altrui. |
| App chiusa, arresto improvviso, telefono sospeso | Diritto a scadenza breve rinnovabile; esempio da misurare 30–60 secondi dall'ultimo contatto. Non è la durata massima dell'editing. |
| Vecchio editor torna dopo la scadenza | Il suo vecchio permesso non vale più, anche se appartiene allo stesso account: bozza conservata, rilettura dello stato corrente e nuova acquisizione/riconciliazione. |
| Centrale riavviata | I vecchi permessi non devono autorizzare salvataggi successivi senza nuova verifica. |

Il nome mostrato deriva dall'identità autenticata; il nome leggibile del client aiuta a capire dove si sta lavorando. Il nome di un account condiviso non prova quale persona fisica stia usando il dispositivo. Non va offerto uno sblocco forzato ordinario che permetta di scavalcare un editor ancora valido.

### 2. Perché il solo blocco del widget non basta al codice attuale

Riscontri statici, non prove di concorrenza:

- [qrAccountSync.ts](../../progetto/acasystem/frontend/src/hooks/qrAccountSync.ts) pubblica l'intera configurazione dell'account. Dopo un409 aggiorna la revisione e mantiene il proprio snapshot per un tentativo successivo: può sovrascrivere cambi altrui, anche su widget differenti. La presenza di revisioni non dimostra una riconciliazione sicura.
- [useLauncherRemoval.ts](../../progetto/acasystem/frontend/src/hooks/launcher/useLauncherRemoval.ts) conserva il layout completo prima della rimozione e «Annulla» chiama restoreLayout con quel layout. Un ripristino globale può cancellare modifiche intervenute altrove.
- [PageLockContext.tsx](../../progetto/acasystem/frontend/src/hooks/launcher/PageLockContext.tsx) limita localmente i gesti del pager; non assegna un diritto remoto di editing. Anche layout.locked è un blocco locale di configurazione, non proprietà di una sessione.
- Eliminazione pagina, colonne, riordino, pile e ripristino coinvolgono più risorse: occorre proteggerne gli effetti indiretti e preservare le modifiche estranee. Non basta aggiungere un overlay a ogni widget mantenendo questi salvataggi globali.

Il blocco va riferito alla risorsa canonica condivisa, con identità stabile del profilo e dell'istanza widget. Il collegamento live del profilo nominato è una lacuna già distinta in U49. Acquisizione/rinnovo/rilascio e controllo del titolare non risultano implementati nei flussi esaminati.

### 3. Regola esplicita proposta per offline e conflitti

Senza centrale raggiungibile non si può promettere l'esclusività rispetto agli altri dispositivi. La scelta consigliata è conservare il lavoro come **bozza locale in attesa**, con indicazione «Non sincronizzata», senza dichiararlo salvato nella casa o mantenere un blocco remoto per ore.

Al ritorno della rete si confrontano base della bozza e versione corrente. Solo cambi compatibili possono essere riconciliati senza intervento; campi diversi non sono sempre indipendenti, per esempio nuova associazione a un dispositivo e vecchi parametri per l'associazione precedente. Per conflitti reali mostrare modifica locale e corrente e consentire una scelta esplicita o conservare una copia della bozza. Nessun criterio «vince chi salva per ultimo» nascosto e nessun aggiornamento della sola revisione per forzare lo snapshot vecchio.

Un widget cancellato altrove non viene ricreato automaticamente; una copia può essere proposta esplicitamente. Una bozza non si applica a un profilo che il client non può più modificare. La bozza rimane separata dalla versione corrente fino a salvataggio riconciliato o scarto esplicito: la pulizia dei log non deve eliminarla. Durata/quota e avvisi delle bozze sono una politica distinta, ancora da definire. La conservazione locale non protegge dalla cancellazione dei dati dell'app o dalla perdita del dispositivo; non si promette durabilità assoluta di materiale mai arrivato alla centrale.

Questa regola riguarda le modifiche di configurazione. Non autorizza a rigiocare automaticamente vecchi comandi fisici offline, per esempio un'apertura o uno spegnimento, quando torna la rete.

### 4. Tavano come vista del registro centrale

Il nome «Tavano» è conservato come proposto. Non risultano un widget o un registro completo con questo nome nei sorgenti esaminati. Il blocco di editing fornisce eventi utili, ma non crea automaticamente un sistema di log.

Proposta: widget con attività recenti e apertura del registro consultabile, filtri per persona/client/profilo/widget/intervallo/esito e caricamento a pagine. I dati domestici già ricevuti si conservano sulla centrale; ogni telefono non deve scaricare o tenere in RAM l'intero archivio. I diagnostici del client offline possono essere raccolti localmente entro un limite e inviati quando torna la connessione, distinguendo tempo di origine e ricezione e senza duplicare gli eventi.

| Tipo | Funzione e durata concettuale |
|---|---|
| Presenza «sta modificando» | Stato temporaneo dell'editor, aggiornato in tempo reale e destinato a scadere. Nessuna riga persistente per ogni rinnovo. |
| Attività leggibili | Chi, da quale client, cosa ha tentato/salvato, risorsa e risultato; un riepilogo per operazione significativa. |
| Diagnostica tecnica | Errori e contesto utile all'assistenza, separabili/filtrabili rispetto alle attività. Niente debug illimitato permanente. |
| Versioni e bozze recuperabili | Materiale necessario al recupero delle modifiche; non coincide con il registro e ha una politica autonoma. |
| Storia delle entità HA | Stati e serie temporali dell'impianto; non equivale da sola ad attribuzione personale dell'azione. |

Esempio di riga: «10:42 — Mario · PC studio — Profilo Casa / widget Luci — modifica salvata». Un tentativo rifiutato o in bozza non può comparire come salvataggio riuscito. «Richiesta inviata a HA», «comando accettato» e «stato fisico osservato» sono esiti differenti. Automazione/sistema/autore non determinabile vanno indicati quando sono il massimo livello di attribuzione disponibile.

Per promettere lo storico di ogni modifica confermata serve coerenza fra registrazione dell'evento e salvataggio accettato; il registro best effort esistente non basta. Eventi ripetuti di rete, rinnovi, trascinamenti intermedi e ogni misura di un sensore non vanno accumulati come azioni dell'utente. Il registro può mostrare lacune o diagnostica non disponibile, senza dichiararsi completo per ogni sorgente.

### 5. Registri realmente presenti

| Riscontro corrente | Limite rispetto a Tavano |
|---|---|
| [actionLog.ts](../../progetto/acasystem/backend/src/services/devices/actionLog.ts) e [deviceModel.ts](../../progetto/acasystem/backend/src/models/deviceModel.ts) | Registro delle operazioni strumentate della facciata dispositivi, con utente/esito ma senza client/sessione di editing. Inserimenti best effort con errori assorbiti. Obiettivo10000righe, pulizia ogni500inserimenti, non una durata in giorni o un tetto esatto in ogni istante. |
| Elenco autenticato /api/dispositivi/registro in [deviceService.ts](../../progetto/acasystem/backend/src/services/devices/deviceService.ts) | Vista globale del registro, non filtrata per singolo utente; nessun consumatore frontend individuato. Non copre tutte le azioni dell'app. |
| [ActivityLog.tsx](../../progetto/acasystem/frontend/src/components/widgets/controls/shared/ActivityLog.tsx) e [useEntityHistory.ts](../../progetto/acasystem/frontend/src/components/widgets/controls/shared/useEntityHistory.ts) | Storico degli stati HA; non è audit della persona. L'eventuale stato iniziale di ripiego con timestamp di inizio intervallo non prova un'azione umana in quell'istante. |
| [settingsService.ts](../../progetto/acasystem/backend/src/services/settingsService.ts) e [settingsModel.ts](../../progetto/acasystem/backend/src/models/settingsModel.ts) | Snapshot di ripristino per utente/dispositivo, default50versioni, limite configurabile5–500: quantità, non giorni; distinto dal registro. Casa3D mantiene una cronologia propria. |
| [logger.ts](../../progetto/acasystem/frontend/src/utils/logger.ts) | Console tecnica, non archivio persistente consultabile/esportabile; debug/info/warn solo in sviluppo, error sempre. Non tutti gli altri log backend passano da questo modulo. |

I filtri restrittivi di actionLog non dimostrano che ogni console tecnica sia già depurata. Non sono stati esportati, letti o trasmessi log reali di utenti durante la riflessione.

### 6. Spazio e conservazione: fino a sette giorni, entro una quota

La cancellazione settimanale completa perderebbe anche eventi appena prodotti prima del giorno di pulizia. Proposta iniziale: finestra mobile fino a7giorni, rimozione periodica dei soli eventi più vecchi e recupero della pulizia all'avvio se la centrale era spenta. Un tetto aggiuntivo di righe/byte limita le raffiche: una cifra come50MB per il registro è soltanto un budget esemplificativo da misurare, non un requisito accettato né una garanzia sul disco totale dell'app.

Se si raggiunge prima la quota, escono prima gli eventi più vecchi; l'interfaccia deve mostrare l'intervallo effettivamente disponibile ed eventuali lacune. Nessuna promessa di sette giorni completi sotto qualunque carico. Per ordine di grandezza ipotetico:1000eventi/giorno da1kB per7giorni sono circa7MB di soli contenuti, esclusi indici, metadati, file temporanei e journal del database; nessuna misura sul prodotto è stata eseguita.

Il limite riguarda archivio sul disco della centrale; paginazione/cache limitata riguardano RAM dei client. In SQLite cancellare righe può lasciare spazio interno riutilizzabile senza restringere subito il file: la gestione del file e l'eventuale compattazione vanno valutate separatamente, secondo [documentazione SQLite VACUUM](https://www.sqlite.org/lang_vacuum.html). Nessuna operazione sul database eseguita.

La regola non cancella profili correnti, account, bozze irrisolte o copie per il ripristino. Non modifica la conservazione di HA: [Recorder](https://www.home-assistant.io/integrations/recorder/) ha una politica propria per storia dell'impianto. Esportazioni e backup hanno ciclo di vita distinto; pulire Tavano non ritira un file già condiviso. Sette giorni è una proposta operativa, non una certificazione normativa.

### 7. Consultazione e condivisione

Le viste devono rispettare casa, account e profili cui l'accesso è autorizzato. La visibilità fra membri dello storico domestico e dei dettagli personali va chiarita come scelta di prodotto; non si introduce una gerarchia installatore/amministratore in contrasto con le indicazioni precedenti.

Per «questo tool» si considerano entrambe le letture: Tavano può mostrare il registro nell'app; per analizzarlo qui in chat occorre un'esportazione volontaria con intervallo/categorie, anteprima e file condiviso dall'utente. Non è implicito un collegamento di lettura automatico di questa chat alla centrale, un upload permanente o l'invio a terzi.

Si raccomanda esportazione strutturata con versione ACA/HA/client, dati necessari e identificatori di correlazione non segreti; esclusione di password, token, chiavi, codici d'invito e payload sensibili, evitando intere configurazioni, foto o cronologie private per default. Le raccomandazioni di selezione dei campi, controllo accessi e rimozione dei segreti sono coerenti con [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html), consultata2026-11-02. La rimozione di campi specifici non rende automaticamente anonimo l'intero archivio. Nessuna esportazione o condivisione realmente effettuata.

## Fonti esterne

Consultazione2026-11-02. Fonti primarie; le durate e i budget proposti non derivano da obblighi stabiliti da queste fonti.

- RFC4918, giugno2007, §6.5–6.6: token e durata dei lock, riferimento concettuale senza adozione WebDAV.
- RFC9110, giugno2022, §13.1.1: controllo condizionale della versione contro sovrascritture concorrenti.
- OWASP Logging Cheat Sheet, pagina corrente senza revisione fissata: contenuto/segreti, accesso e ciclo di vita dei registri.
- SQLite VACUUM, documentazione corrente senza versione fissata: riuso dello spazio e dimensione del file dopo cancellazione.
- Home Assistant Recorder, pagina corrente: conservazione separata di stati/eventi HA. Nessuna configurazione reale verificata o modificata.

## Verifiche ed evidenze

| Controllo | Procedura | Esito | Limiti |
|---|---|---|---|
| Ispezione sorgenti e fonti | Letture mirate e ricerche, senza eseguire l'app | Eseguito | Non è una prova di concorrenza o di durata su dispositivi reali. |
| Collegamenti locali | Verifica dei target nei5documenti interessati | Riesame finale758target, nessun percorso mancante | Corretto un percorso al primo passaggio; controllo esistenza file, non validazione automatica di ogni ancora o sito esterno. |
| Sorgenti prodotto prima/dopo | SHA256 cumulativo di1845file progetto, Git ls-files cached/others exclude-standard, contenuto e nome ordinati | Invariati | Impronta18ebfb4d4451922ef7a4de5a35edbd09c269bcb7f4d0849e4c12b2cafe27b3c5 identica; HEAD5c321b9 invariato. File ignorati/runtime non inclusi. |
| Spazi e diff | git diff --check sui documenti interessati e controllo diretto del nuovo report | Superato, codice0; nessuno spazio finale nel nuovo report, newline finale presente | Solo avviso normalizzazione CRLF del registro report. |
| Lock, riconciliazione, Tavano e crescita disco | Prove di prodotto | Non eseguito | Funzionalità proposte, non implementate da questo incarico. |

## Controllo del diff e decisioni

Riflessione e riscontri registrati in ISSUE-137, diario U50, indice dei report e punto di ripresa. Nessun nuovo ADR accettato o ampliamento esecutivo autorizzato. Il controllo finale dei documenti e dell'impronta sorgenti viene registrato nella tabella delle verifiche.

## Chiusura e punto di ripresa

Riflessione completata. La proposta del widget evidenziato è utilizzabile come esperienza, ma la conservazione del lavoro richiede anche controlli della centrale, salvataggi coerenti e bozze separate. Tavano è una proposta di registro, non una funzione già disponibile. Durate/quota, ammissione/visibilità dei membri e dettagli di riconciliazione rimangono scelte da discutere. Nessun incarico esecutivo attivo; proseguire dalle domande umane. La prontezza espressa in U49 non ha avviato un piano: in U50 non ne è stato redatto uno.
