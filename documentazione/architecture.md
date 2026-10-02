# Architettura proposta e decisioni

Aggiornato: 2026-10-02. Fonte dell'intento: [product.md](product.md). Stato reale e questioni aperte: [project-status.md](project-status.md).

## Stato e confini

Nel repository sono realizzati soltanto documentazione e versionamento locale. Nessun componente applicativo o servizio è implementato. [ADR-0001](decisions/ADR-0001-documentazione-e-storico.md) approva la gestione documentale; tutte le scelte applicative seguenti restano proposte.

La visione del PRD separa automazioni locali, controllo utente e servizi centrali. L'indipendenza delle automazioni da internet è un obiettivo da verificare; il controllo dal tablet offline richiede una soluzione propria. Le dipendenze fisiche sono segnalate senza definirne qui la conformità di installazione.

## Componenti e responsabilità previste

| Componente | Responsabilità prevista | Soluzione candidata / decisione aperta |
|---|---|---|
| Client web/tablet | Dashboard, stati, comandi, piantina e personalizzazione | React/Vite/TypeScript/Tailwind; versioni, HAKit e riuso Tunet da decidere (ISSUE-001/002/003). |
| Gateway locale | Collegamenti ai dispositivi, stato, esecuzione delle automazioni locali | Home Assistant Container candidato; servizi complementari e disponibilità locale da progettare (ISSUE-004/007). |
| Backend centrale | Account, associazioni utente-impianto, moduli e catalogo | Node.js/NestJS candidato; confini dell'Identity Provider e autorizzazioni da progettare (ISSUE-006/008). |
| Trasporto remoto | Connessione iniziata dal gateway e instradamento autorizzato | WireGuard oppure Rathole/WSS proposti, nessuna alternativa selezionata (ISSUE-013). |
| Persistenza | Account, configurazioni, decisioni di pubblicazione e dati necessari | PostgreSQL candidato; necessità di TimescaleDB e confini cloud/edge da dimostrare. |
| Servizio AI | Generazione di bozze di scenari, accessibile dal backend | Ollama/vLLM e modelli citati sono candidati; licenze e prestazioni da verificare (ISSUE-010/014). |
| Distribuzione configurazioni | Versione approvata, consegna, conferma e ripristino | Processo da definire; il pulsante client non realizza l'intero ciclo (ISSUE-009). |

## Flussi funzionali proposti

1. **Controllo locale:** client → endpoint locale autorizzato → Home Assistant → dispositivo; stati ritornano al client. Hosting degli asset, sessioni locali, TLS e disponibilità al riavvio offline sono questioni aperte.
2. **Controllo remoto:** client → accesso centrale e verifica impianto → trasporto remoto → gateway → dispositivo. Il gateway avvia la connessione in uscita. La sede dei controlli e della terminazione TLS deve risultare dal progetto approvato.
3. **Automazione locale:** evento del dispositivo → logica installata sul gateway → azione locale. Il percorso operativo deve essere provato anche senza cloud; i dispositivi dipendenti da servizi esterni vanno identificati.
4. **Scenario AI:** richiesta → contesto autorizzato dell'impianto → bozza → validazione strutturale e funzionale → revisione amministrativa → versione pubblicabile. Consegna al gateway e attivazione sono fasi distinte da progettare e verificare.
5. **Configurazione client:** modifica autorizzata → configurazione versionata → sincronizzazione → conferma client/gateway. Definire cosa accade con versioni discordanti o consegne parziali.

Sono flussi logici, non API già implementate. Nessuno schema di database, formato di token o protocollo di distribuzione ACA è stato scelto.

## Interfacce da progettare nel relativo incarico

| Confine | Decisione necessaria | Verifica prevista |
|---|---|---|
| Identità centrale ↔ HA | Associazione utenti/impianti, credenziali accettate, rinnovo, revoca e modalità offline | V-04/V-05/V-06 |
| Client ↔ gateway/broker | Endpoint, autenticazione, permessi sulle entità, trasporto e riconnessione | V-02/V-03/V-07 |
| Catalogo ↔ automazioni locali | Versioni, validazione, attivazione e ripristino | V-08/V-13/V-14 |
| Backend ↔ AI | Dati ammessi, disponibilità, validazione e budget di risposta | V-11/V-12/V-13 |
| Configurazioni ↔ dispositivi client | Personalizzazione, associazione, sincronizzazione e comportamento offline | V-09/V-10/V-15 |

Home Assistant documenta [token e autenticazione](https://developers.home-assistant.io/docs/auth_api/) e [controlli di permesso](https://developers.home-assistant.io/docs/auth_permissions/). Queste API sono un riferimento; non attestano l'esistenza del collegamento ACA proposto. La [modalità Container](https://www.home-assistant.io/installation/) richiede di gestire separatamente servizi non inclusi. Fonti consultate il 2026-10-02, dettagli nell'[audit](reports/REP-20261002-001-audit-product.md).

## Come aggiornare il progetto

Una scelta significativa viene proposta con un ADR e accettata sulla base di una richiesta umana identificabile. Dopo l'approvazione aggiornare i componenti/contratti interessati, i requisiti e le verifiche. Dopo l'implementazione collegare manifest, configurazioni e risultati reali. Lo stato corrente resta nel registro dedicato; le proposte alternative non diventano sostituzioni implicite.
