# ADR-0028 Obiettivi ACA Android Windows e iOS

| Campo | Valore |
|---|---|
| ID e titolo | ADR-0028: ACA multipiattaforma, Windows con Electron e iOS da studiare successivamente. |
| Stato | Accettata |
| Data e autore | 2026-10-30; Codex, nome esatto del modello non disponibile. |
| Decisore e autorizzazione | Utente, [U18](../riprogettazione/diario/2026-10-30.md#u18-obiettivi-android-windows-e-ios): «non si tratta di un'applicazione che deve essere eseguita solo su Android»; «eseguirla anche su Windows al 100% con Electron»; per iOS «ci possiamo pensare pure un'altra volta». Testo integrale nel diario. |
| Collegamenti | [ADR-0027](ADR-0027-app-normale-senza-kiosk.md), [ingresso della riprogettazione](../riprogettazione/README.md), [PRD](../funzionalita/product.md), [report](../reports/REP-20261030-002-obiettivi-multipiattaforma.md). |
| Sostituisce / sostituita da | Nessuna. Precisa l'ambito della riprogettazione senza annullare gli studi Android o modificare gli ADR storici. |

## Contesto ed evidenze

La discussione si è concentrata sul Lenovo Tab M11 per valutare Python, dipendenze e continuità di HA sullo stesso dispositivo. L'utente chiarisce che questo è un percorso di approfondimento del prodotto, non il suo unico sistema operativo di destinazione.

## Decisione

- Android resta un obiettivo di ACA e il Lenovo il primo dispositivo dello studio attuale.
- Windows è un obiettivo pieno dell'applicazione, con Electron esplicitamente indicato dall'utente.
- iOS è un obiettivo futuro: fattibilità e percorso tecnico vengono rinviati a una successiva discussione.

“Al 100%” esprime l'obiettivo di funzionamento completo su Windows. Non è un risultato di collaudo né dimostra la disponibilità di ogni integrazione HA o l'eseguibilità del runtime Android su Windows.

## Alternative e motivazioni

Limitare il prodotto ad Android non rispetterebbe la precisazione umana. La soluzione iOS non viene scelta adesso: il rinvio è esplicito. Non sono introdotti framework sostitutivi o altri sistemi operativi per iniziativa dell'agente.

## Conseguenze

Nelle prossime valutazioni distinguere l'esperienza ACA comune dalle parti dipendenti dal sistema operativo, come installazione, avvio del motore, processi e continuità. È un criterio per evitare di generalizzare il laboratorio Android, non un nuovo incarico di sviluppo.

L'uso di Electron su Windows è confermato come obiettivo; incorporamento e gestione di HA su Windows restano da valutare separatamente. La precisazione non sceglie runtime, librerie, modalità di distribuzione o architettura iOS.

Restano esperienza da app ordinaria e interfaccia HA non mostrata secondo le indicazioni già registrate. Nessuna installazione, modifica al codice o prova viene autorizzata da questa registrazione.

## Verifiche e revisione

Fonte umana registrata; nessun test multipiattaforma o studio iOS eseguito. Prima di dichiarare supporto verificato serviranno evidenze specifiche per piattaforma e perimetro funzionale. Proseguire dalle domande dell'utente senza avviare automaticamente porting o ricerche iOS.

