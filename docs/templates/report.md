# Modello di incarico e report

Duplicare in `docs/reports/REP-YYYYMMDD-NNN-titolo.md` per un intervento significativo. Questo modello non è un incarico autorizzato. All'avvio compilare richiesta, perimetro e criteri; durante il lavoro aggiornare l'avanzamento; alla chiusura registrare gli esiti.

| Campo | Da compilare |
|---|---|
| ID / incarico | Numero progressivo nella data e identificativo dell'incarico, se distinto. |
| Stato | In corso / Completato / In attesa di input / Interrotto. |
| Data | Data ISO; eventuali orari con fuso Europe/Rome. |
| Autore / modello | Autore disponibile; nome esatto del modello solo se noto, altrimenti non disponibile. |
| Commit di partenza | SHA reale; se Git assente, scriverlo esplicitamente. |
| Richiesta di riferimento | Testo fedele della richiesta e riferimento consultabile se disponibile. |
| Autorizzazione | Cosa è autorizzato; decisioni umane di ampliamento con fonte. |

## Obiettivo e perimetro

Definire il risultato richiesto, le modifiche ammesse e le esclusioni necessarie. Collegare requisiti e ADR. Elencare le modifiche preesistenti individuate con Git e come vengono preservate.

## Criteri di completamento

Elencare risultati osservabili e controlli pertinenti. Distinguere ciò che il task deve realizzare dalle proposte future.

## Avanzamento e modifiche

Registrare cosa è stato realizzato, i file o comportamenti interessati e le scelte esecutive necessarie. Una proposta fuori perimetro va nel registro dei problemi e resta non applicata.

## Verifiche ed evidenze

| Controllo | Comando/procedura e ambiente | Esito | Evidenza e limiti |
|---|---|---|---|
| Da compilare | Comando realmente eseguito o scenario previsto | Superato / Fallito / Non eseguito | Output selezionato e anonimizzato; fonte o riferimento. |

Non riportare un esito positivo prima dell'esecuzione. I comandi futuri restano indicati come pianificati. Non inserire credenziali, token o dati personali non necessari.

## Controllo del diff e decisioni

Confrontare richiesta, modifiche e criteri. Riportare il risultato della revisione, le discrepanze e gli ADR creati o aggiornati. L'agente non approva autonomamente nuove funzionalità o cambi di architettura.

## Chiusura e punto di ripresa

Indicare il lavoro ancora aperto, il prossimo passo dentro l'incarico e gli input necessari. Se completato, dichiarare che nessun incarico resta attivo e distinguere il backlog dal lavoro autorizzato. Aggiornare indice dei report e stato del progetto.

Per il commit che include il report usare `git log -- <percorso-del-report>`: non inventare un hash futuro o creare un autoriferimento impossibile. Un commit successivo può riportare il riferimento già esistente.

## Rettifiche successive

Dopo la chiusura, aggiungere data, motivo e nuova evidenza della rettifica preservando le affermazioni storiche. Le rettifiche non costituiscono autorizzazioni retroattive.
