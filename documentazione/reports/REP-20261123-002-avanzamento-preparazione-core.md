# Avanzamento affidabile del primo avvio di Home Assistant

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261123-002 |
| Stato | Completato localmente |
| Data | 2026-11-23, Europe/Rome |
| Autore / modello | Codex, modello esatto non documentato |
| Commit di partenza | `22eca26cce781caaebb51a420fe83bf940665e5a` |
| Richiesta di riferimento | «Il codice lo hai a disposizione, fammi tu queste correzioni», riferito alla preparazione indeterminata quando il Supervisor resta a zero e all'uso dei byte disponibili per distinguere progresso e stallo. |
| Autorizzazione | Correzione locale nel client Windows, verifiche e documentazione. |

## Obiettivo e perimetro

Correggere il monitoraggio di Home Assistant Core nel primo avvio del client Windows, in base a ISSUE-169 e alle misure in [REP-20261123-001](REP-20261123-001-diagnosi-installazione-pc.md). Riutilizzare la vista del setup registrata in [REP-20261120-001](REP-20261120-001-finestra-unica-installazione.md) e il confine del guscio di [ADR-0023](../decisions/ADR-0023-app-client-a-ibrida.md). Il report diagnostico e i suoi aggiornamenti di stato, indice e verifiche erano già presenti nel working tree e sono stati preservati.

## Criteri di completamento

- Avanzamento indeterminato con «Preparazione di Home Assistant in corso» quando il progresso di Core non è disponibile o è zero.
- Usare i byte solo entro il significato del segnale disponibile e distinguere attività da inattività anche con percentuale piatta, quando i dati lo permettono.
- Conservare il passaggio alla percentuale affidabile, i controlli di disponibilità e la ripresa del monitoraggio. Verificare con le regressioni del client Windows.

## Avanzamento e modifiche

- Il tracker presenta «Preparazione di Home Assistant in corso» con la barra indeterminata esistente quando manca la prima misura o quando il job riporta zero o un valore che si arrotonderebbe a zero. A zero esplicito scarta la precedente percentuale e la stima. Con misure positive mostra la percentuale e la stima già previste. Un nuovo incremento sotto il massimo precedente rinnova il rilevamento di attività.
- Con il job di Core ancora attivo, `VBoxManage debugvm … statistics --pattern=/Public/NetAdapter/0/BytesReceived` legge in sola lettura i byte complessivi ricevuti dalla prima scheda della VM. Dopo due intervalli consecutivi con almeno 4 KiB/s, il tracker considera rilevata attività e rinnova la finestra di inattività. Con barra indeterminata appare «Dati in ricezione». La soglia filtra picchi isolati e traffico di fondo leggero. Il contatore misura tutta la scheda e non permette di attribuire i byte a un layer o di ricavare una percentuale di Core. Lettura indisponibile, singolo picco e azzeramento non valgono come attività.
- La finestra resta di 20 minuti dall'ultimo segnale. Il messaggio parla di progressi non rilevati, quindi resta corretto anche quando VirtualBox non espone il contatore al client. «Riprova» riprende il monitoraggio in corso. La vista spiega che la durata dipende dalla connessione, al posto della previsione fissa di 15–30 minuti.

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Contatore VirtualBox | `VBoxManage debugvm … statistics --pattern=/Public/NetAdapter/0/BytesReceived`, VirtualBox 7.2.22, VM usa e getta senza disco, adattatore 82540EM | Superato | Risposta XML reale `<Counter c="0" unit="bytes" name="/Public/NetAdapter/0/BytesReceived"/>`. Dopo l'arresto la registrazione era ancora temporaneamente bloccata. Al secondo controllo la VM era spenta e la sua registrazione e la sua cartella sono state rimosse. [Comando documentato da Oracle](https://docs.oracle.com/en/virtualization/virtualbox/7.2/user/vboxmanage.html), consultato il 2026-11-23. |
| Typecheck, test e build del client | `npm run typecheck`, `npm test`, `npm run build` in `progetto/client/windows` | Superato | 184 test su 12 file. Regressioni su 0%, ripartenza, 20 minuti con ricezione simulata alla velocità del PC lento, traffico di fondo, azzeramento, job terminato e lettura non accessibile. Il primo giro aveva un'asserzione con il vecchio messaggio di stallo, aggiornata prima della nuova esecuzione. |
| Renderer compilato | Chrome headless con Playwright sulla shell generata e stati simulati, 1.000 e 390 px | Superato | Barra indeterminata senza `aria-valuenow` o percentuale visibile, dettaglio di ricezione, tempo trascorso, passaggio a 44% e ritorno indeterminato. Nessun errore di pagina o scorrimento orizzontale a 390 px. |
| Installazione completa sul PC lento | Centrale esistente | Non eseguito | Il PC lento non è raggiungibile da questa sessione. La lettura VirtualBox è stata provata localmente e la sequenza lenta è coperta da test simulati. |

## Controllo del diff e chiusura

Diff limitato al tracciamento del client Windows, al messaggio della vista, alle regressioni e ai riferimenti di progetto. Correzione completata localmente il 2026-11-23. Nessuna modifica alla VM distribuita, nessun commit o pubblicazione. La velocità del bridge e il confronto con NAT restano aperti in ISSUE-169.
