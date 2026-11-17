# Ventilatori per dispositivo

Modo: **Operate**. Direzione umana: «vai», 2026-11-10, dopo la proposta Ventilatori; [REP004](../../reports/REP-20261110-004-ventilatori-per-dispositivo.md). Primitive e [design ACA](../design.md) esistenti.

## Home

Una tessera per esatto dispositivo HA. Nome, icona, stato e velocità osservata soltanto quando presente. Accendi e Spegni sono azioni distinte, disponibili secondo feature e servizio. Il multicanale riassume canali accesi e indisponibili senza comando collettivo. Il nuovo prodotto richiede 2×2; i widget storici conservano il percorso precedente. Dato mancante o sconosciuto non viene mostrato come zero o Spento.

## Dettagli

Console comune con contenuto centrato e canali nominati separatamente. Velocità regolabile entro 0–100 con passo effettivo HA; valori frazionari del passo selezionano livelli hardware e il payload usa percentuali intere richieste dal servizio. L'invio attende 200 ms di quiete del gesto; uscita/offline annullano il timer locale, senza accodare comandi fisici. Preset, oscillazione e direzione compaiono soltanto se supportati e osservabili. Stato osservato e valore richiesto rimangono distinti.

Spegni supportato resta disponibile durante l'attesa di velocità/preset/Accendi. Annulla solo la regolazione locale non ancora inviata; una richiesta già ricevuta da HA mantiene il proprio riscontro. Non viene garantita priorità end-to-end sul gateway esistente (ISSUE-154). Nessun reinvio automatico dopo timeout o chiusura.

Misure d'uso, altre funzioni e Tecnica e manutenzione sono separate. Disclosure e selettori comuni, target e nomi accessibili distinti per canale. Nessun nuovo materiale annidato, animazione per riga o variazione dello sfondo. I testi lunghi vanno a capo, i dati mancanti sono espliciti. Test software/browser e apparecchi fisici costituiscono evidenze separate.

## Associazione e compatibilità

Trova → anteprima inerte → Conferma e riscontro autorevole, oppure raggiungimento del widget esistente. Selezione manuale sullo stesso risolutore e writer atomico; `bindingEntityId`, nome e metadati salvati insieme. Solo entità dello stesso dispositivo, visibili e abilitate; diagnostica e configurazione non diventano canali ordinari. Annullare il posizionamento non scollega HA. Nessuna migrazione automatica delle configurazioni esistenti.
