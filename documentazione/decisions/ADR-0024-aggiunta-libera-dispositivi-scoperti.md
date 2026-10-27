# ADR-0024 — Aggiunta libera dei dispositivi scoperti da Home Assistant

| Campo | Valore |
|---|---|
| ID e titolo | ADR-0024, aggiunta libera dei dispositivi scoperti da Home Assistant |
| Stato | Accettata |
| Data e autore | 2026-10-26, Claude Code (`claude-opus-5-5`) |
| Decisore e autorizzazione | Utente, risposta alla domanda del piano «Rileva dispositivi» del 2026-10-26: «Chi può usare "Rileva dispositivi"?» → «Tutti, aggiunta libera» (opzione descritta come «Anche il cliente può aggiungere qualunque dispositivo scoperto: cambia ADR-0022 e va deciso a parte»). Piano approvato lo stesso giorno. |
| Collegamenti | REQ-18, REQ-19, [REP-20261026-006](../reports/REP-20261026-006-rileva-dispositivi.md), [REP-20261023-003](../reports/REP-20261023-003-piano-aggiungi-dispositivi.md) (tappa D4), ISSUE-120 |
| Sostituisce / sostituita da | Supera in parte [ADR-0022](ADR-0022-identita-di-servizio-dispositivi.md), punto «lista degli handler avviabili» (decisione D-D22 b1), solo per i flussi scoperti da HA. Estende [ADR-0021](ADR-0021-configurazione-dispositivi-da-acasystem.md). |

## Contesto ed evidenze

- **Lista chiusa di ADR-0022 (b1).** Il cliente vede tutto il catalogo, ma avvia solo i gestori in lista: in D1 solo `webostv` (`config/devices.ts`, `CUSTOMER_STARTABLE_HANDLERS`). Gli altri dicono «Richiede l'installatore».
- **Da dove arriva la scoperta.** È solo di HA: zeroconf, SSDP, DHCP, USB, Bluetooth, HomeKit, MQTT. I dispositivi trovati restano flussi in attesa di conferma (`config_entries/flow/progress`, riservato agli amministratori) e si confermano dall'interfaccia di HA.
- **Prova del 2026-10-26** (copia della VM sulla rete di casa): la TV Samsung non compare in Acasystem perché `samsungtv` non si aggiunge da solo e non è nella lista (ISSUE-120).
- **Richiesta dell'utente:** un widget che trovi i dispositivi intorno e faccia nascere il widget giusto, da usare anche al cliente (REQ-19).

## Decisione

1. Il cliente, attraverso la facciata `/api/dispositivi` e l'identità di servizio di ADR-0022, può **leggere e confermare qualunque flusso scoperto da HA**:
   - ammessi: i flussi con origine `zeroconf`, `ssdp`, `dhcp`, `usb`, `bluetooth`, `homekit`, `mqtt`;
   - esclusi: i flussi aperti da altri con origine `user` o `reauth`.
2. Il cliente può anche dire «Non mi interessa» (`config_entries/ignore_flow`) su un dispositivo scoperto.
3. Restano invariati:
   - l'identità di servizio dichiarata;
   - il registro di ogni azione (persona, azione, gestore, esito, ora, senza segreti né indirizzi);
   - la revoca con la sospensione dell'utente di servizio;
   - il divieto di ripiegare sul token dell'utente.
4. Acasystem **rifiuta i passi che non sa mostrare** con «Richiede l'installatore»: `external` / OAuth, codici di messa in servizio Matter, menu non gestiti.
5. L'avvio libero di gestori **non scoperti** (catalogo, D3) resta regolato da ADR-0022 b1: questa decisione non lo cambia.

## Alternative e motivazioni

| Opzione | Esito |
|---|---|
| Aggiunta limitata alla lista chiusa, anche per i dispositivi scoperti | Proposta dall'agente come consigliata, non scelta dall'utente. |
| Funzione riservata all'installatore | Non scelta. |
| **Aggiunta libera dei dispositivi scoperti** | **Scelta dall'utente.** |

Motivazione [lettura dell'agente]: il cliente deve poter completare da solo l'aggiunta dei dispositivi che la casa già annuncia, senza l'interfaccia di HA.

## Conseguenze

- **Rischio accettato.** Un cliente può aggiungere a HA qualunque dispositivo scoperto sulla rete di casa, compresi quelli di un vicino visibili sulla stessa rete. Il registro delle azioni ne tiene traccia.
- **Codice:**
  - `config/devices.ts` riceve la regola «flussi scoperti: tutti»;
  - nuove operazioni nella lista: `scoperti.leggi`, `scoperti.aggiungi`, `scoperti.ignora`.
- **AC-18 (2):** non vale più per i flussi scoperti; vale ancora per l'avvio dal catalogo. Annotazione in `product.md` con REQ-19/AC-19.
- **Mini PC.** Serve l'identità di servizio, che sul mini PC con l'app di HA OS si crea in S6 (REP-20261026-005). Senza identità attiva la funzione risponde «servizio non attivo», come in ADR-0022.

## Verifiche e revisione

**Da verificare** (REP-20261026-006):
- test del server con l'HA finto: lettura, conferma e ignora dei flussi scoperti, rifiuto di `external`, registro;
- prova reale con la TV Samsung sulla rete di casa.

**Rivedere se:**
- un'aggiunta indesiderata (per esempio dispositivi di vicini) diventa un problema;
- HA cambia i permessi di `config_entries/flow/progress`;
- si decide la sessione dell'installatore di REQ-06.

**Annotazione 2026-10-27 (Claude Code, `claude-opus-5-5`): decisione dell'utente sull'ampiezza.** L'agente aveva proposto di limitare il cliente ai dispositivi con conferma fisica (TV, Hue, HomeKit…) e di affidare all'installatore quelli che si aggiungono con un tocco (Cast, WiZ, Shelly senza password…). L'utente ha risposto:

> «Io non voglio che [Acasystem] sia limitato, anche perché se ci sta la richiesta di un tecnico per operare su una specifica funzionalità e un utente non se lo può configurare da solo, questo implica che noi dobbiamo raggiungere questa persona a casa […] Quindi bisogna pianificare un modo per poter permettere all'utente a casa, tramite gli stessi passaggi che fa il sistemista, di poter fare tutte le configurazioni che vuole, sperando nel buon senso della persona.»

**Lettura dell'agente:**
- nessun limite per famiglia o per conferma fisica;
- l'obiettivo è la parità con il sistemista per la configurazione dei dispositivi, compresi il catalogo (D3) e i gestori oggi «Richiede l'installatore»;
- il rischio dei dispositivi di altre case sulla stessa rete è accettato dall'utente; resta mitigato dal registro e dalla separazione delle reti fatta dal sistemista.

Il piano di realizzazione è in [REP-20261026-006](../reports/REP-20261026-006-rileva-dispositivi.md), fase F4. È stato approvato dall'utente il 2026-10-27, tranne l'assistenza a distanza, che si decide dopo.
