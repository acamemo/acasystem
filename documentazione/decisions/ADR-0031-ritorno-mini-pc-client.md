# ADR-0031 Ritorno al mini PC come centrale, esperimento VM conservato

| Campo | Valore |
|---|---|
| ID | ADR-0031 |
| Stato | Accettata per mini PC/client e accantonamento VM; U37 conferma prima configurazione/accesso nella webapp e HA/ACA predisposti |
| Data e autore | 2026-11-02; scheda redatta da Codex |
| Decisore e autorizzazione | Utente, [U36](../riprogettazione/diario/2026-11-02.md#u36-ritorno-al-mini-pc-e-domanda-sullaccesso): «accantonarla o perlomeno salvare questo stato se in futuro si vuole riprendere»; «desktop e android che si collegano all'ip del mini pc e l'app che lavora sulle api di HA come era in origine» |
| Collegamenti | [REP-20261102-001](../reports/REP-20261102-001-ritorno-mini-pc-e-accesso.md), ADR-0023, ADR-0029, ADR-0030, REQ-20/21, ISSUE-129/130 |
| Sostituisce / sostituita da | Supera il desktop come centrale VM di ADR-0029 limitatamente alla direzione corrente; conserva la decisione precedente come esperimento riprendibile. Riattiva il riferimento mini PC/client di ADR-0023, senza imporre in blocco tutti i dettagli storici |

## Contesto ed evidenze

Le prove VirtualBox U31-U34 non hanno eliminato i ritardi dei timer. U35 autorizzava un confronto separato VMware: clone VMDK creato e verificato, poi accesso Broadcom necessario; nessuna installazione o prova VMware osservata. L'utente preferisce ora la flessibilità di una centrale mini PC e chiede di conservare il punto raggiunto. I dati di benchmark e il codice non vengono dichiarati inutilizzabili o risolti.

## Decisione umana

1. La centrale torna sul mini PC: Home Assistant gestisce dispositivi e automazioni; desktop Electron e Android sono client collegati al suo indirizzo. ACA usa le API di HA.
2. Il filone desktop con HA OS in VM e il confronto VMware sono accantonati, con checkpoint locale e istruzioni di ripresa. Non proseguire l'installazione VMware o richiedere l'accesso Broadcom per questa direzione.
3. Conservare sorgenti, dati e artefatti prima di un eventuale ripristino applicativo. Non cancellare o sovrascrivere il lavoro per tornare a un vecchio commit.
4. U36 lasciava aperta la collocazione dell'accesso. **U37** la conferma: «mettiamo registrazione e accesso nella webapp, con HA e ACA già predisposti sul mini PC. Procedi a riportare desktop e Android al collegamento tramite IP, magari usando un QR code in impostazioni di sistema di aca». Fonte in [diario U37](../riprogettazione/diario/2026-11-02.md#u37-registrazione-e-accesso-web-client-ip-e-proposta-bootstrap-mini-pc).

Il ritorno al mini PC non ritira automaticamente design condiviso, QR web, account condiviso o copia layout fra case. L'avvio Android dovrà poter collegarsi alla centrale secondo il percorso IP richiesto; l'attuale avvio solo QR non equivale a un ripristino già eseguito. Non sono assegnati Cloud/relay, discovery automatica o un account cloud ACA.

## Registrazione/accesso: proposta U36, confermata da U37

Concentrare le schermate di prima configurazione e accesso nella webapp condivisa, mostrata dentro entrambe le distribuzioni e nel browser; mantenere nelle shell scelta/salvataggio della centrale e funzioni native. HA rimane l'autorità per utenti, credenziali, permessi e token. Il prerequisito è ACA disponibile prima del primo proprietario. L'implementazione U37 aggiunge API ristrette per stato/owner/completamento e il gate web, senza aprire genericamente il proxy o installare addon dal client.

L'alternativa storica del bootstrap nelle dist rimane nei sorgenti/checkpoint ma non nel flusso corrente. U37 propone inoltre un bootstrap da GitHub sul mini PC: preparato uno script per HAOS già installato, senza scrivere dischi. Installazione HAOS su hardware, pubblicazione e prova fisica restano passaggi distinti.

## Conseguenze e verifiche

REQ-20/AC-20 rimangono storici accantonati, ID conservati; REQ-21 distingue collegamento e invito, REQ-22 descrive prima configurazione web/client IP. Codice e pacchetti locali ripristinati in [REP-20261102-002](../reports/REP-20261102-002-ripristino-client-mini-pc-e-onboarding-web.md), senza avvio VM. Checkpoint immutato in REP-20261102-001; ISSUE-129 accantonata senza correzione. La verifica con HA Container reale e finestre Electron non equivale al collaudo HAOS/mini PC fisico, rete mobile o H24; pubblicazione/installazione non eseguite.
