# Rete di dispositivi ACA discovery e ruolo del master

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261030-006 |
| Stato | Completato: analisi e documentazione, nessuna implementazione. |
| Data | 2026-10-30, Europe/Rome |
| Autore / modello | Codex; nome esatto del modello non disponibile. |
| Commit di partenza | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta di riferimento | Proposta umana [U22](../riprogettazione/diario/2026-10-30.md#u22-ricerca-dispositivi-aca-e-master), testo integrale conservato nel diario: ricerca fra dispositivi ACA in casa, almeno tablet fornito o mini PC richiesto, appoggio a nodi domestici da remoto e dispositivo in uso sulla rete rilevato come master; paragone con Alexa. |
| Autorizzazione | Analisi e registrazione della proposta nel percorso corrente. Nessuna installazione, discovery attiva, modifica applicativa, elezione o attivazione remota. |

## Obiettivo e perimetro

Valutare l'idea senza trasformarla in decisione approvata. Distinguere controllo dalla UI, percorso locale/remoto e nodo che esegue HA; analizzare ricerca LAN, identità e limiti del subentro automatico. Conservare tablet e mini PC come possibilità della proposta, con rispettiva fattibilità ancora da verificare.

Modifiche preesistenti in progetto/ e documentazione/ preservate. Copie iniziali di sette documenti, stato Git e censimenti SHA256 in directory temporanea. Non modificare report chiusi o componenti del prodotto.

## Criteri di completamento

- Proposta umana registrata fedelmente e distinta dall'affinamento dell'assistente.
- Significati di master e scenari locale/remoto/guasto confrontati in modo comprensibile.
- Fonti primarie per Alexa, discovery e comportamento HA; deduzioni e limiti dichiarati.
- Piano futuro non eseguito; diario, indici e punto di ripresa aggiornati.
- Controlli documentali e integrità di codice/materiali verificati, nessuna attivazione.

## Avanzamento e modifiche

- Creato lo [studio rete ACA e master](../riprogettazione/blocchi/01-rete-aca-discovery-master.md): proposta umana distinta dall'affinamento dell'assistente, ruoli UI/percorso/esecutore, scenari tablet/mini PC e più client.
- Valutate ricerca DNS-SD/mDNS, identità e limiti LAN, passaggio locale/remoto, trasferimento controllato e subentro automatico. Fonti primarie Android, Microsoft, IETF, HA e Amazon consultate il 2026-10-30; riferimenti HA Core 2026.10.4 mantenuti. Le deduzioni sono dichiarate.
- Salvato U22 integralmente e A22 come sintesi; aggiornati ingresso, decisioni, stato progetto, LEGGIMI e indice report. Aggiunto collegamento al seguito nel precedente studio U21, senza riscriverne i risultati.
- Nove documenti interessati: due nuovi e sette aggiornati. Nessun ADR o requisito prodotto aggiunto; proposta tablet/mini PC e raccomandazione su esecutore assegnato non promosse ad approvate.

## Verifiche ed evidenze

| Controllo | Procedura | Esito | Limiti |
|---|---|---|---|
| Stato iniziale | git status --short; git rev-parse HEAD; censimenti SHA256 | Superato | Lavoro preesistente preservato. |
| Coerenza della proposta | Revisione del nuovo studio e di A22, anche con agente indipendente | Superato | Nessun rilievo sostanziale; valutazione documentale, non verifica di un prodotto. |
| Link, UTF-8 e spazi | Script PowerShell sui nove documenti; confronto con copie iniziali; git -c core.safecrlf=false diff --check -- documentazione | Superato | 21 collegamenti locali introdotti e 4 ancore verificati; UTF-8 rigoroso e nessuno spazio finale introdotto. |
| Integrità applicativa | rg --files --hidden progetto con esclusione node_modules/.git/dist/.tmp; Get-FileHash SHA256 e Compare-Object | Superato | 1643 file visibili, zero differenze rispetto all'inizio di U22. Non è una suite di test applicativi. |
| Pin/materiali e perimetro | Confronto SHA256 dei tre materiali U11 e git status --porcelain=v1 --untracked-files=all fuori documentazione | Superato | Tre materiali invariati; stato Git esterno ai documenti invariato. |
| Discovery/elezione/migrazione | Prove fra dispositivi | Non eseguito | Nessun runtime, scan o collegamento attivato. |

## Controllo del diff e decisioni

Diff incrementale rispetto alle copie di inizio U22 controllato: solo lo studio, il report e i sette documenti di memoria/ingresso pertinenti. Modifiche preesistenti conservate, report chiusi e archivio non modificati. Nessun ruolo master, algoritmo di elezione, servizio remoto o requisito hardware approvato dalla sola proposta.

## Chiusura e punto di ripresa

Analisi completata. La rete ACA e la ricerca locale sono plausibili; suggerito dall'assistente un esecutore domestico assegnato e più client con percorso locale/remoto, distinguendolo dal trasferimento di HA. Fattibilità Android, collegamento remoto, associazione e necessità di una riserva restano aperti. Tutte le prove elencate nello studio sono NON ESEGUITE.

Proseguire dalle domande dell'utente. Nessun incarico esecutivo assegnato: nessuna installazione, discovery attiva, configurazione cloud/VPN, migrazione o modifica al codice; nessun commit. Pin/materiali invariati, iOS rinviato.

