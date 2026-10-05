# ADR-0003 — Home Assistant locale e fase 1 grafica in ufficio

| Campo | Valore |
|---|---|
| Stato | Accettata |
| Data | 2026-10-05 |
| Decisore | Utente committente nella chat di progetto |
| Autorizzazione | Risposte alle domande progettuali e successive precisazioni riportate in [REP-20261005-001](../reports/REP-20261005-001-direzione-pilota.md). |
| Citazioni determinanti | «Home assistant base è irrinunciabile»; «Hetzner è inutile»; «L'obiettivo minimo, che per me sarebbe ideale come fase 1, è home assistant personalizzato graficamente». |
| Precisazioni | Tunet confermato; Linux 64 bit ARM64/x86-64; sessione admin aperta solo per il primo setup. |
| Collegamenti | [Perimetro del pilota](../pilot-scope.md), REQ-00/01/02/03/06/17, ISSUE-005/006/007/008/012/015. |
| Sostituisce / sostituita da | Nessuna ADR precedente; aggiorna le proposte iniziali del PRD. ADR-0001 e ADR-0002 restano valide. |

## Contesto

Il PRD proponeva un hub obbligatorio Hetzner, identità centrale e numerose estensioni. Nessun componente è stato implementato. Le risposte umane scelgono un prodotto installato su hardware locale e restringono il primo risultato alla personalizzazione grafica di Home Assistant, con prova in ufficio.

## Decisione

1. Mantenere Home Assistant come base obbligatoria, privilegiando il funzionamento locale e il massimo uso possibile senza internet.
2. Usare Tunet come punto di partenza React per progettare il frontend personalizzato. Revisione da integrare e condizioni della distribuzione devono essere verificate prima dell'incarico applicativo.
3. Definire il pilota in ufficio e la fase 1 minima grafica. Le funzioni aggiuntive conservano la loro visione e richiedono successivi perimetri.
4. Ritirare il provisioning Hetzner (REQ-01) e i suoi servizi obbligatori dalla direzione corrente. Conservare l'accesso remoto come obiettivo online da progettare, senza scegliere un fornitore sostitutivo.
5. Approvare Linux a 64 bit ARM64 o x86-64 come vincolo hardware; modelli e metodo HA restano aperti.
6. Registrare il flusso admin iniziale → configurazione → logout → cliente. La sessione amministrativa aperta è limitata al primo setup.
7. Registrare il ruolo condominiale limitato ai dispositivi comuni e la valutazione di molti utenti su una macchina. Il progetto dell'isolamento e l'ambito di implementazione restano aperti.

Questa decisione approva la direzione di prodotto. L'incarico corrente aggiorna la documentazione; non avvia sviluppo, installazione o acquisti.

## Alternative e motivazioni

L'hub Hetzner del PRD viene abbandonato per scelta esplicita dell'utente. Il frontend React di riferimento è Tunet; HAKit resta un candidato eventuale e non è reso necessario dalla conferma di Tunet. Metodo HA, modalità di accesso remoto e macchina condivisa non sono scelti attraverso questo ADR.

## Conseguenze e limiti

PRD, stato e scenari devono distinguere requisiti approvati, opzioni future e realizzazione non iniziata. Gli ID originali restano consultabili; REQ-17 aggiunge il ruolo condominiale senza riutilizzare un ID precedente. Le licenze e l'isolamento richiedono evidenze sul prodotto concreto; la direzione accettata non certifica compatibilità o conformità.

L'offline dipende anche da integrazioni, rete locale, alimentazione e disponibilità degli asset/sessioni. Fonti e verifiche documentali sono nel report. Gli esiti dei vecchi report rimangono storici.

## Revisione

Una successiva richiesta umana può sostituire questa direzione, preservando la motivazione e collegando il nuovo ADR. Stato corrente in [project-status.md](../project-status.md), criteri e prove in [verification.md](../verification.md).
