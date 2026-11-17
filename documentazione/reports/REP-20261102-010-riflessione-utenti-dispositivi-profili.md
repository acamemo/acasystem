# Riflessione su persone, dispositivi e profili della casa

| Campo | Valore |
|---|---|
| ID | REP-20261102-010 |
| Stato | Riflessione completata; piano non redatto |
| Data | 2026-11-02, Europe/Rome |
| Autore / modello | Codex; nome esatto del modello non disponibile |
| Commit iniziale | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta U49 | Popup dopo QR con scelta nuovo utente della casa oppure altro dispositivo sullo stesso account, profili collegati su più dispositivi. «fai una riflessione, dopo aver fatto tutta la riflessione magari prepariamo il piano, ma solo quando mi dirai \"sono pronto per il piano\"» |
| Perimetro | Riflessione di prodotto basata sui sorgenti e fonti primarie. Nessun piano tecnico/esecutivo, codice, dipendenza, installazione, test/build, VM o pubblicazione. |

## Obiettivo e criterio di completamento della riflessione

Distinguere le entità e le scelte di esperienza da chiarire prima di pianificare: iscrizione alla casa, stesso account su più dispositivi, significato dei profili collegati, dati comuni/locali, accessi e conflitti. I suggerimenti seguenti non sono un ADR accettato o una sequenza di sviluppo. Le decisioni umane già confermate restano: account/accesso nella webapp, centrale mini PC, funzioni ordinarie accessibili a tutti secondo le precedenti indicazioni e copia layout distinta dalla sincronizzazione dell'account.

## Modello concettuale raccomandato

Il QR individua una casa. Un nuovo dispositivo diventa un accesso a quella casa; la scelta della persona determina se creare una nuova identità o usare quella esistente. L'utente non dovrebbe essere creato prima della scelta nel popup.

| Concetto | Significato raccomandato |
|---|---|
| Casa | Centrale e impianto HA/ACA: dispositivi domotici, stanze, automazioni, informazioni condivise. Identità stabile indipendente dall'IP. |
| Account/utente | Identità della persona in questa casa, con autenticazione e dati personali. Un account può usare più dispositivi. Non implica oggi identità cloud globale. |
| Dispositivo client | Installazione/browser usato per accedere. Nome leggibile, impostazioni locali e accessi propri; l'IP non identifica la persona. Browser diverso/reinstallazione possono costituire un nuovo accesso. |
| Sessione | Accesso autenticato revocabile del client. Stesso account non significa copiare lo stesso token fra telefoni e PC. |
| Profilo | Configurazione dell'interfaccia: pagine, widget, nomi, organizzazione e preferenze. Non è un'altra identità con credenziali proprie. |

Esempio: Mario usa PC e telefono con lo stesso account; Anna usa un account diverso nella stessa casa. La luce accesa da Mario cambia stato anche per Anna perché appartiene all'impianto. Le preferenze personali di Mario non dovrebbero cambiare il profilo di Anna senza una condivisione esplicita.

## Significato del popup

Le due scelte suggerite sono «Crea un nuovo utente della casa» e «Collega questo dispositivo al mio account». La prima riguarda una persona nuova nella casa esistente, non una nuova installazione dell'impianto; la seconda porta all'accesso dell'account esistente e collega una sessione indipendente. Scegliere il proprio profilo può essere successivo, senza trasformare questa finestra in un catalogo di opzioni.

Il primo proprietario rimane un caso diverso: inizializza una centrale ancora senza account. Un account valido su un dispositivo già riconosciuto può rientrare direttamente; il popup riguarda il nuovo collegamento o una scelta esplicita di cambio account, non ogni avvio.

Il QR generico esposto dalla centrale contiene un indirizzo. Come valutazione, per ammettere una persona nuova suggeriamo invito o conferma da un account della casa già collegato: vedere il QR da solo non prova appartenenza alla casa. La modalità di autorizzazione resta da confermare; non introduce autonomamente un ruolo installatore o una nuova gerarchia di funzioni. Il secondo dispositivo della stessa persona si autentica con il suo account; un futuro abbinamento rapido richiederebbe comunque un'autorizzazione personale temporanea, senza password/token persistenti nel QR pubblico.

La copia di un layout fra amici/case rimane il flusso separato già confermato. Non va confusa con nuovo membro della casa o secondo dispositivo personale.

Anche il QR pubblico della centrale è distinto dall'invito account esistente: quest'ultimo vincola l'identità del mittente. Creare un altro membro della casa non deve ereditare quell'identità; richiede un'ammissione propria e credenziali personali. Il popup generico proposto non autorizza da solo a riutilizzare un invito per uno scopo diverso.

## Due dispositivi e profili collegati

Raccomandazione da discutere: libreria di profili comune all'account, con selezione del profilo attivo per dispositivo. PC e telefono che usano lo stesso profilo ricevono le modifiche a quel profilo. PC sul profilo Lavoro e telefono sul profilo Personale conservano la propria selezione, pur vedendo la stessa libreria dell'account. Una copia indipendente di un profilo è diversa dal rimanervi collegati.

Contenuto e preferenze personali possono seguire il profilo; colonne, dimensioni e resa si adattano allo schermo. Un collegamento non dovrebbe imporre sul telefono le misure del PC, cambiare la pagina che l'altro sta leggendo o aprire su entrambi lo stesso popup. La scelta esatta fra ordine comune e geometrie per classe di dispositivo rimane una decisione di prodotto; il codice ha già layout per classi che vanno rispettati.

| Ambito | Dati da considerare |
|---|---|
| Casa | Stato reale dei dispositivi, stanze, integrazioni e automazioni. La centrale continua indipendentemente dalla chiusura del client. |
| Account/profilo | Libreria profili, contenuti e configurazione dell'interfaccia, eventuali preferenze personali condivise. Nessuna associazione automatica con un altro utente. |
| Client | Profilo selezionato, pagina aperta, popup, orientamento, permessi, qualità grafica, endpoint di collegamento e credenziali della propria sessione. Foto e altri contenuti locali richiedono una scelta esplicita di condivisione. |

Comandi domotici, configurazione della casa e personalizzazione UI sono flussi distinti: il ritorno di stato HA non è sincronizzazione dei profili. Se la centrale è irraggiungibile non si può promettere controllo effettivo dell'impianto; eventuali modifiche UI offline non equivalgono ad accodare comandi fisici da eseguire più tardi.

## Concorrenza, sessioni e ciclo di vita

La centrale dovrebbe essere la fonte delle versioni confermate. Due modifiche simultanee non devono cancellarsi senza informare la persona; modifiche compatibili e modifiche dello stesso elemento sono casi diversi. Occorre distinguere confermato, in attesa e conflitto, preservando la modifica locale o permettendo una scelta comprensibile. Questa è una regola di prodotto proposta, non la scelta di un algoritmo/schema dati.

Ogni dispositivo dovrebbe avere la sua sessione: uscire dal telefono lascia valido l'accesso del PC, mentre scollegare un telefono smarrito deve impedirgli nuovi accessi senza cancellare l'account o i profili. Eliminare un profilo, cambiare account, disconnettere il solo dispositivo e rimuovere una persona dalla casa hanno effetti differenti. Togliere un account non dovrebbe eliminare implicitamente automazioni o dispositivi dell'impianto. Le implicazioni del primo proprietario, del recupero e di una casa con un solo accesso disponibile rimangono da trattare esplicitamente.

Su un tablet condiviso è importante evitare che preferenze e sessione dell'utente precedente diventino quelle del successivo. Anche senza funzioni avanzate di cambio rapido, cache e impostazioni devono rispettare casa/account correnti. Il riconoscimento del client non va confuso con autenticazione o autorizzazione.

Mi orienterei a riusare le identità/autenticazione HA già alla base di ACA, aggiungendo ad ACA l'organizzazione di profili e collegamenti client. Non emerge una necessità di un secondo archivio di password o di un account cloud globale per usare due dispositivi in LAN. Modalità remota e più case restano ambiti distinti.

## Evidenze attuali, non garanzie del funzionamento desiderato

- Casa UUID locale e configurazione condivisa per HA user: [pairing.ts:92](../../progetto/acasystem/backend/src/pairing.ts:92). L'invito account fissa l'utente atteso ma richiede login. Il canale può già attivarsi senza invito se lo stesso utente entra e non è in modalità copia: [qrAccountSync.ts:49](../../progetto/acasystem/frontend/src/hooks/qrAccountSync.ts:49).
- Ulteriori persone non vengono registrate dalla UI ACA attuale. [homeAssistantSetup.ts:88](../../progetto/acasystem/backend/src/services/homeAssistantSetup.ts:88) gestisce soltanto il primo proprietario; gli endpoint di creazione dell'identità tecnica del servizio non sono registrazione di persone.
- I profili salvati appartengono all'utente autenticato, con controlli sull'identità: [profileValidators.ts:33](../../progetto/acasystem/backend/src/validators/profileValidators.ts:33). Caricare il profilo applica uno snapshot, senza conservare un legame attivo al suo ID: [useProfiles.ts:229](../../progetto/acasystem/frontend/src/hooks/useProfiles.ts:229).
- La configurazione corrente dell'account ha notifiche SSE/revisioni e rilevazione locale ogni500ms; il catalogo dei profili salvati non ha lo stesso abbonamento live. La modalità copia esclude il canale account. Coesiste il salvataggio per dispositivo: [useSnapshotSetters.ts:86](../../progetto/acasystem/frontend/src/hooks/launcher/useSnapshotSetters.ts:86), [useSettingsSync.ts:123](../../progetto/acasystem/frontend/src/hooks/useSettingsSync.ts:123). Non sono oggi un modello unico di profilo attivo condiviso.
- Il server rifiuta revisioni obsolete, ma il client dopo409 legge la revisione e può riprovare il proprio snapshot intero: rischio di sostituire modifiche altrui, nessun merge garantito. [qrAccountSync.ts:80](../../progetto/acasystem/frontend/src/hooks/qrAccountSync.ts:80). I profili salvati non hanno CAS equivalente: [profileModel.ts:93](../../progetto/acasystem/backend/src/models/profileModel.ts:93).
- Le code/revisioni del canale account sono in memoria; la riapertura può applicare il server. Non è una coda offline persistente con conservazione garantita delle modifiche.
- ID client locale: [useSettingsSync.ts:69](../../progetto/acasystem/frontend/src/hooks/useSettingsSync.ts:69). Eliminare il dispositivo salvato rimuove dati/cronologia e non il suo accesso: [settingsService.ts:312](../../progetto/acasystem/backend/src/services/settingsService.ts:312).
- Logout dimentica credenziali locali e tenta la revoca della sessione: [useConnectionSetup.ts:78](../../progetto/acasystem/frontend/src/hooks/useConnectionSetup.ts:78), [haSession.ts:90](../../progetto/acasystem/frontend/src/api/haSession.ts:90). Errori di revoca assorbiti, token manuale dimenticato senza revoca e assenza di una UI ACA per revocare sessioni di un telefono sono limiti concreti. Nessuna sessione reale ispezionata o modificata.

## Fonti primarie

Consultate il2026-11-02, senza eseguire chiamate su un impianto:

- [HA Authentication API](https://contributors.home-assistant.io/core/internals/auth-api/): accesso, refresh e revoca dei token. La revoca del token di rinnovo invalida i relativi access token; il progetto deve gestire sessioni distinte per client se vuole revoca indipendente.
- [HA2026.10.4 config/auth](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/config/auth.py): creazione/gestione utenti richiede autorizzazione amministrativa.
- [HA2026.10.4 provider homeassistant](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/config/auth_provider_homeassistant.py): credenziali collegate agli utenti tramite operazioni autorizzate. Creare una persona e creare/collegare le sue credenziali sono responsabilità distinte.
- [HA permessi](https://contributors.home-assistant.io/core/internals/permissions/): identità e controlli effettivi delle operazioni. Questi vincoli tecnici non ridefiniscono da soli i ruoli UX già richiesti dall'utente ACA.

## Chiusura della riflessione

La direzione del popup è valida. Il modello raccomandato è account personale con più sessioni/client, profili come configurazioni persistenti e selezione locale, dati dell'impianto comuni. Da confermare in conversazione: ammissione dei nuovi membri, semantica del profilo attivo e politica di conflitto/offline; sono decisioni di prodotto, non un piano già scritto.

La riflessione è sufficiente per dichiarare «sono pronto per il piano» nella risposta. Questa frase non avvia automaticamente un piano o il codice. Nessuna sequenza di implementazione, task tecnico o migrazione assegnata; nessun ADR nuovo accettato. Memoria in ISSUE-136 e diario U49, preservando le indicazioni U47/U48. Solo documenti modificati; nessun test/build/installazione o app/VM avviati.
