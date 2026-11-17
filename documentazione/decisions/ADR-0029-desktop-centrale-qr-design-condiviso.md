# ADR-0029 Desktop centrale avvio VM e associazione QR

**Estensione grafica U42, 2026-11-02:** [ADR-0032](ADR-0032-design-condiviso-workspaces.md) sposta la fonte CSS comune fuori dal frontend e la condivide con workspace, distribuzioni e launcher. Questa nota non riattiva la decisione VM accantonata; conserva la motivazione e gli esiti storici seguenti.

| Campo | Valore |
|---|---|
| ID e titolo | ADR-0029 Desktop centrale, QR account/layout e design condiviso |
| Stato | Parzialmente superata da ADR-0031 il 2026-11-02 per il desktop centrale VM; QR/account/layout e design conservati |
| Data e autore | 2026-10-30; scheda redatta da Codex |
| Decisore e autorizzazione | Utente, [U26-U30 e U29a](../riprogettazione/diario/2026-10-30.md#u26-secondo-lavoro-design-condiviso). U27: «Mi basta che domani posso già eseguire un applicativo sul pc con la vm in background che viene avviata in automatico». U30 distingue account del computer sul tablet con modifiche in tempo reale da copia dell'interfaccia fra amici su case diverse. |
| Collegamenti | REQ-20/REQ-21 e REQ-03; [report esecutivo](../reports/REP-20261030-009-windows-vm-automatica-design-condiviso.md); ADR-0004, ADR-0026, ADR-0027, ADR-0028 |
| Sostituisce / sostituita da | Integra gli ADR citati. [ADR-0031](ADR-0031-ritorno-mini-pc-client.md) supera la direzione desktop centrale VM, conservando il punto di ripresa. Non decide il servizio remoto. |

## Contesto ed evidenze

U25 chiede di iniziare lavoro concreto. U26 indica come secondo lavoro CSS/design base/primitive condivisi fra distribuzioni e launcher. U27 assegna ora il risultato Windows con VM automatica; supera il precedente limite di sola analisi entro questo incarico. U28-U30 precisano l'avvio Android e due modalità QR. Il codice precedente richiedeva un server già avviato; ricognizione e prove sono nel report.

## Decisione umana

1. Per il primo risultato il desktop Windows avvia la centrale in VM in background, con ACA come app normale e senza mostrare l'interfaccia HA.
2. Sistema contiene **QR Code**. Tablet e telefono acquisiscono il codice dall'app Android, il cui avvio è distinto dal desktop.
3. **Collega account:** collega il nuovo dispositivo alla stessa casa e all'account usato sul computer, con modifiche condivise in tempo reale. Associazione e accesso rispettano le autorizzazioni; non significa copiare password o privilegi indiscriminatamente.
4. **Importa layout/configurazione:** copia l'interfaccia anche da un utente diverso e su una casa diversa, senza collegare il destinatario all'account o ai dispositivi dell'amico. U29a conferma la copia, senza sincronizzazione continuativa con il mittente. I widget devono essere ricollegabili ai dispositivi propri.
5. Base di design e primitive visive condivise fra frontend e launcher, secondo ADR-0004. Restano componenti specifici delle schermate e contenitori tecnici distinti.

## Alternative e motivazioni

Cloud e relay sono stati confrontati, non scelti. La prima realizzazione locale non li richiede. Tablet esecutore HA resta una possibilità studiata e non dimostrata; il porting non serve al primo flusso Android client del PC. Non è adottata un'elezione automatica del master in base alla rete.

## Conseguenze

Servono lifecycle VM, onboarding ACA e distribuzione del codice corrente, scanner/permessi Android, associazione, sincronizzazione e copia portabile. Le scelte esecutive del banco non sono garanzie universali: VirtualBox già installato, quattro CPU virtuali sul PC attuale e collegamento LAN sono il primo lotto, non impegni per ogni macchina.

Il solo QR non fornisce accesso da Internet. Trasporto locale iniziale e login personale sono limiti da riportare; eventuale delega senza reinserire credenziali o condivisione a distanza richiedono lavoro ulteriore. Nessun porting HA Android o iOS assegnato.

## Verifiche e revisione

Primo lotto locale concluso in REP-20261030-009: app Windows e avvio della propria VM anche da spenta verificati sul PC attuale, design condiviso e APK prodotti. Account temporaneo rimosso, creazione del proprio account pronta. QR/API e sincronizzazione fra due sessioni Electron provati; Android fisico/camera, H24 e altri PC non collaudati. Firma Windows e lentezze del guest rimangono limiti. L'accettazione della direzione non equivale al collaudo generale del prodotto. Riesaminare dopo prove reali e decisioni future su remoto e hardware.
