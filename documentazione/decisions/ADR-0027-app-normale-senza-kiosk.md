# ADR-0027 ACA come app normale senza kiosk

| Campo | Valore |
|---|---|
| ID e titolo | ADR-0027: apertura e chiusura ordinarie di ACA, senza modalità kiosk e senza mostrare HA. |
| Stato | Accettata |
| Data e autore | 2026-10-30; Codex, nome esatto del modello non disponibile. |
| Decisore e autorizzazione | Utente, [U17 nel diario](../riprogettazione/diario/2026-10-30.md#u17-app-normale-senza-kiosk): «il tablet non deve avere l'applicativo in modalita kiosk»; «l'applicazione si apre come un'applicazione normale e si chiude come un'applicazione normale»; «senza che mostra l'interfaccia di Home Assistant». Testo integrale conservato nel diario. |
| Collegamenti | [ADR-0026](ADR-0026-frontend-ha-presente-nascosto.md), [continuità Android](../riprogettazione/blocchi/01-continuita-android.md), [PRD](../funzionalita/product.md), [report](../reports/REP-20261030-001-app-normale-senza-kiosk.md). |
| Sostituisce / sostituita da | Nessuna. Integra ADR-0026 e rende non applicabile il precedente presupposto kiosk al nuovo scenario Android allo studio. |

## Contesto ed evidenze

L'utente valuta ACA e HA sullo stesso tablet senza mini PC. Dopo lo studio U16 sulla continuità con schermate chiuse/display spento, precisa che il dispositivo non deve restare bloccato su ACA. Il PRD conserva il precedente tablet a muro kiosk, REQ-15 e AC-15 proposti: quel modello non deve essere imposto al nuovo scenario.

Il kiosk Android e il servizio foreground sono meccanismi distinti: il primo limita l'uso del dispositivo; il secondo rappresenta lavoro percepibile dall'utente anche fuori dalla UI. Fonti primarie consultate il 2026-10-30: [lock task mode](https://developer.android.com/work/dpc/dedicated-devices/lock-task-mode), [foreground services](https://developer.android.com/develop/background-work/services/fgs).

## Decisione

ACA deve presentarsi e comportarsi come un'app ordinaria: apertura dall'icona, uscita dalle schermate con la normale navigazione Android e possibilità di usare altre app. Nessuna modalità kiosk o obbligo di tenere ACA visibile.

Nel percorso utente compare l'interfaccia ACA; l'interfaccia Home Assistant non deve essere un passaggio necessario o mostrarsi durante avvio e uso. Si conserva il componente HA secondo ADR-0026: non sono approvati rimozione del frontend o blocco delle route.

La frase «si chiude come un'applicazione normale» riguarda l'esperienza di uscita. Non autorizza lo spegnimento automatico di HA a ogni uscita né revoca l'obiettivo di continuità U16. Modalità concreta del servizio, tipo FGS, gestione energetica e recupero restano da definire e collaudare.

L'utente ipotizza un avvio un po' più lento. Non è una misura o un'approvazione di attese indefinite: non sono stabiliti secondi, dimensioni del pacchetto, timeout o SLA.

## Alternative e motivazioni

Il precedente modello kiosk/tablet esclusivo non corrisponde alla precisazione umana. Uno stile visivo a schermo intero non coincide da solo con kiosk; questa decisione non assegna un ridisegno delle schermate di ADR-0016 o un refactor dei gesti.

Come proposta tecnica ancora da realizzare, distinguere avvio iniziale del motore e riapertura della UI: se HA è già attivo, ACA si ricollega; altrimenti l'attesa resta nel linguaggio visivo ACA. Non è approvata una sequenza di bootstrap o una durata precisa.

## Conseguenze

Il futuro risultato va verificato con apertura, Home/Indietro, altre app, display spento e riapertura. Non si può risolvere la continuità imponendo kiosk, display sempre acceso o ACA sempre in primo piano.

L'indicazione non elimina la notifica prevista da un eventuale foreground service né i limiti di Stop da App attive e Arresto forzato descritti nello studio U16. Non autorizza installazioni, modifica del client, nuovi permessi o prove.

## Verifiche e revisione

Fonte umana esplicita registrata; implementazione e prove non eseguite. Verificare in futuro che nessun percorso ordinario richieda la UI HA, che la chiusura delle schermate sia normale e che la continuità del motore sia misurata separatamente. Conservare lo storico in caso di ulteriori decisioni.

