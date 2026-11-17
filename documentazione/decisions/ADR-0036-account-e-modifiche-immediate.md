# ADR-0036 — Account comune e modifiche immediate

| Campo | Valore |
|---|---|
| Stato | Accettata dalla richiesta umana; implementata e verificata localmente, banco PC aggiornato su autorizzazione distinta |
| Data / autore | 2026-11-02, Codex; nome esatto del modello non disponibile |
| Fonte umana | Critica al percorso blocco/modifica/Salva durante il collaudo REP015; reference sign-in/sign-up e richiesta di rimuovere il nome dispositivo; chiarimento «indipendentemente dal dispositivo in uso, perché tutto quanto è basato sull'account». |
| Rapporto con decisioni precedenti | Sostituisce in parte ADR-0035 per denominazione obbligatoria, selezione per client e conferma Salva globale. Conserva identità, proprietà, revisioni, riserve, bozze e Tavano. |
| Evidenze | [REP016](../reports/REP-20261102-016-modifica-immediata-e-ingresso-profilo.md), [UI-013](../design/componenti/originali/UI-013-sign-in-sign-up.jsx.txt). |

## Decisione umana

**Precisazione umana, 2026-11-04:** [ADR-0040](ADR-0040-nome-unico-accesso-personale.md) approva un unico campo «Nome utente» per nuove iscrizioni/proprietario e il ritiro dell’opzione token manuale. Conserva account e nomi esistenti, tentativi pendenti, sessioni personali e identità tecnica. L’aggiornamento del banco PC con pill colore è autorizzato dalla stessa richiesta; risultati in REP-20261104-004.

**Precisazione umana successiva, 2026-11-03:** [ADR-0037](ADR-0037-uso-esclusivo-profilo-e-posizioni.md) sostituisce l'uso simultaneo dello stesso profilo con uso esclusivo, mantenuto in secondo piano fino alla chiusura di ACA/scheda. Configurazione personale comune e checkpoint automatici rimangono; la nuova preferenza di posizione corregge il ritorno dopo il trascinamento in uno spazio vuoto.

Registrazione crea un account personale ACA autenticato da HA; accesso riapre l'account e la sua configurazione su PC, telefono o tablet. La schermata alterna Accedi e Crea account con la composizione della reference e il materiale ACA, italiano, username e password visibile su richiesta. Nessun campo obbligatorio per denominare il dispositivo. I client tecnici mantengono identità e sessioni separate, con denominazione automatica, senza obbligare l'utente a gestirli durante l'accesso.

La configurazione selezionata appartiene all'account. Una scelta esplicita si propaga ai dispositivi dello stesso account; un nuovo accesso la eredita. Le configurazioni già esistenti e gli eventuali duplicati restano conservati. Nella migrazione si riusa una selezione valida concorde o un unico profilo; selezioni divergenti richiedono una scelta, senza scegliere per ultima modifica o cancellare alternative.

Le modifiche concluse si pubblicano automaticamente con un breve raggruppamento degli input. Modifica è l'ingresso intenzionale, senza un preliminare sblocco della disposizione. Fatto/Fine aspetta gli ultimi cambi e termina la sessione; non occorre un secondo Salva globale. Undo agisce soltanto sulla modifica interessata e verifica le revisioni. Gli aggiornamenti remoti non provocano nuove scritture.

## Garanzie conservate

La centrale rimane autorevole: riserve esclusive e revisioni evitano sovrascritture silenziose. Ogni checkpoint ha un identificativo idempotente; un input durante un invio viene conservato e applicato sulla base confermata. Offline conserva bozze entro quota; conflitti e risposte incerte richiedono recupero visibile. I comandi HA restano personali e immediati, senza accodamento offline o invio automatico dopo esito incerto. Nessuna nuova funzione remota o modifica dei permessi HA.

La richiesta autorizza questa evoluzione dell'applicativo, non una nuova pubblicazione o una riattivazione dell'esperimento VM. Verifiche software, browser isolato e collaudo fisico restano evidenze distinte nel report.
