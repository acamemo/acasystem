# Apertura e chiusura ripetute del catalogo

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261109-008 |
| Stato | Completata correzione del difetto riprodotto e banco .53; sequenza umana esatta non attribuita |
| Data | 2026-11-09, Europe/Rome |
| Autore / modello | Codex; nome esatto del modello non disponibile |
| Commit di partenza | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta di riferimento | «come mai dopo 2 volte che lo faccio smette di funzionare?», dopo installazione .52 con ritorno da trackpad. |
| Autorizzazione | Diagnosi e correzione del ciclo ripetuto nella stessa funzionalità/consegna banco PC già autorizzata; account/profili conservati. Nessuna pubblicazione o nuova funzione. |

## Obiettivo e perimetro

Riprodurre e correggere il blocco dopo ripetuti gesti di apertura/chiusura del catalogo. Distinguere mancata apertura, chiusura e stato inerte residuo; prove lente, rapide, con inerzia e durante il rientro. Preservare transizioni, scroll interni e orizzontali, controlli, touch, storia e permessi. Correzione minima soltanto nel percorso dimostrato dalle prove.

Baseline .52/r99 in [REP007](REP-20261109-007-ritorno-catalogo-trackpad.md),1816file/SHA5259d73c. Worktree621voci preesistenti da conservare, checkpoint in `backup/rep065/`. Requisito [REQ-32](../funzionalita/product.md) e [brief](../design/componenti/catalogo-widget.md). La prova precedente di un singolo ritorno non dimostrava l'affidabilità su cicli ravvicinati.

## Criteri di completamento

- Individuare un arresto riproducibile con dati di fase/input e senza credenziali reali.
- Correggere la causa, verificando almeno15cicli lenti e15ravvicinati con riapertura dopo il rientro; richieste temporaneamente rifiutate non devono rendere inutilizzabile il gesto successivo.
- Nessun overlay/inert/lock o storia residui; nessuna doppia azione, aggiunta o comando accidentale. Scroll/campi/zoom e movimento ridotto conservati.
- Regressione mirata, strict/build e browser privato; diff contro checkpoint. Se aggiornato il banco, backup e dati/identità/HA/D1 conservati con audit separati.

## Avanzamento e modifiche

Prima lettura indipendente: nessun limite intenzionale a due cicli. Ipotesi concreta nel hook Home: `wheelAttempted` viene impostato prima del risultato di apertura; un rifiuto transitorio può consumare il burst e gli eventi ravvicinati ne mantengono il blocco. Da confrontare con prove ripetute; non ancora attribuito al caso umano. Nessuna modifica al codice prima del checkpoint.

Precisazione umana: il catalogo **rimane aperto e non si chiude**; dopo la prova suggerita di un clic sul titolo, l'utente riferisce che ora sembra funzionare e ipotizza la velocità.60cicli nativi di solo wheel (lenti/rapidi/burst e superfici diverse) sulla .52 non hanno riprodotto un arresto permanente. L'ipotesi Home rimane separata, non viene corretta o presentata come causa.

Difetto circoscritto riprodotto sia unit sia nel browser: pointerdown sull'intestazione, rilascio in un altro target privato, ritorno al catalogo e wheel inverso con nessun tasto premuto. La mancanza del rilascio nel pannello lascia `drag.current` non trascinato ma pendente: la guardia rifiuta ogni wheel. Un clic completo sul titolo lo libera. Eventi nativi/isTrusted, fonte .52 esatta; nel browser headless non è stato emesso blur sul target originale, quindi non si attribuisce alla prova un comportamento OS non osservato. Il legame con la precisa sequenza umana resta non dimostrato; non è stata identificata la velocità come causa.

Correzione autorizzata sul percorso riprodotto: liberare il candidato non ancora trascinato su rilascio/cancel globale dello stesso puntatore o blur. Per un candidato mouse con nessun movimento, il wheel che conferma `buttons=0` può inoltre recuperare un rilascio perso del tutto; distinguere esplicitamente mouse/touch e preservare pulsanti premuti e drag riconosciuti. Nessuna modifica a Home, CSS, tempi o storia.

Correzione implementata in17righe logiche della primitiva e nel relativo test; fonte1816/SHA256 `0f7a0c0bbe279dd93326cf6ee7b179b12a84352bb2aab1fb633dd623f782faf7`, soli2delta, nessun file aggiunto/rimosso o estraneo. Review indipendente senza blocker, terminatori originali conservati.42/42test mirati e strict frontend/UI superati,3test contratto UI superati; quattro nuove regressioni falliscono prima del fix e passano dopo.

Sul candidato, la stessa sequenza nativa di rilascio perso chiude al primo wheel senza clic aggiuntivo. Preservati mouse con tasto premuto, drag riconosciuto e touch. Ripetuti gli stessi60cicli della baseline: tutti superati, inclusi piccoli delta, card, rientro anticipato e nuova apertura dopo uscita. Questo dimostra recupero del difetto riprodotto e assenza di regressioni nel campione; non dimostra la causa esatta della sequenza umana né un problema legato alla sola velocità.

## Verifiche ed evidenze

| Controllo | Procedura | Esito | Limiti |
|---|---|---|---|
| Checkpoint | `node backup/rep065/checkpoint.mjs`, fonte .52 e copie7file | Superato |1816/SHA5259d73c, prima delle modifiche |
| Baseline ripetizioni | Browser privato sul ZIP .52 esatto |60cicli senza arresto | Nessuna prova di un limite a due; lenti/rapidi/burst/card |
| Rilascio perso | Test privato e sequenza nativa su due target privati | Difetto riprodotto | Catalogo aperto, candidato nonmoved, wheel non consumato; clic titolo recupera |
| Ripetizioni candidate | Browser privato, stessa matrice60cicli .52 |60/60 superati | Nessun account, comando, errore JS o rete; stessa pagina e stato finale |
| Rilascio perso candidato | Identici eventi nativi sui due target privati | Superato | Primo wheel chiude senza clic di recupero; held/moved conservati |
| Regressioni | BottomDrawer/WidgetScene/Pager/HomeCatalogScroll |42/42 superati | RED4/4 falliti prima del fix conservati; niente PASS globale |
| TypeScript/UI | Strict frontend/UI e contratto UI | Superato,3test UI | Nessuna modifica di dipendenze |

## Controllo del diff e decisioni

Preservare tutte le modifiche precedenti. Non sostituire il motore di animazione né attribuire una causa al trackpad fisico senza evidenza. Il ripristino di un gesto rifiutato e i confini fra cicli devono rimanere distinguibili dalla prevenzione dei duplicati nello stesso gesto.

## Chiusura e punto di ripresa

Installata ACA0.9.53/r99 sul banco, [PC](http://127.0.0.1:3002/) e [LAN](http://192.168.1.37:3002/) healthy/casa ready. Recuperato il rilascio perso senza clic aggiuntivo; gli stessi60cicli dopo il fix sono passati. Le prove con close a160ms attendono poi il completamento dell'uscita: non dimostrano una frequenza continua sub240ms. Il singolo percorso umano non è stato identificato con certezza e la velocità da sola non è risultata causa nelle prove.

Fonte1816/SHA0f7a0c0b, solo2delta; wrapper `sha256:6ee3562eece307737a9085c230d4ddcc8f8c8791003e8bd72248cc582052e3e7`. Build frontend/Casa3D e strict, ricetta congelata/runtime .46 identico;180fonti backend/contratti/manifeste invariate. Audit7checksum/127web/117runtime,5marker e4hash sorgente PASS,7versioni e19APK identici alla .52. Nessuna dipendenza o installazione runtime nuova.

Pacchetto3372697byte/SHA33b6f6ac46484688b79a98a7d1549c254d2c10e04615c1f66bdda55c88945d38: replay nativa del rilascio perso e normale secondo ciclo superati;0comandi. Backup freddo `backup/rep065/cold-bank-pre-0.9.53/aca-data-pre-0.9.53.tgz`,204098byte/SHA3b6e5c2ccdcc2a661878a44513cc4fb5160ad54363949e06916801fb459bc4bc, estratto e SQLite integro.27tabelle immediate e successive identiche, audit operativo6/6PASS; audit ristretto aggiuntivo conferma27tabelle esatte e nessun timestamp diverso. Identità/account/profili e mount conservati; HA/D1 stessi container/immagini/avvii, solo ACA ricreato. Compose effettivo `config --quiet`17file superato senza stampare segreti; rollback .52 con dati correnti in [infrastruttura](../infrastructure.md).

QA anonima del banco distinta dal collaudo autenticato umano; hardware fisico/trackpad/Safari/Android/M11 non dichiarati provati. Nessun commit/push, pubblica .34 invariata. Le osservazioni Home/altre aree drag rimangono ISSUE-151/150, non implementate. Non restano interventi software impliciti; il riscontro umano dovrà verificare l'uso reale dopoCtrl+F5.

Sigillo `backup/rep065/final-validation.json` superato: fonte0f7a/1816 e2delta,42test/3UI,60cicli candidato e replay del rilascio perso, pacchetto/entry reali .53 e PC/LAN ready. Backup/hash,27tabelle immediate e successive identiche e audit6/6; identità/profili/mount e HA/D1 conservati.11documenti/1558collegamenti locali validi, nessun nuovo whitespace; storico product.md identico a HEAD conservato. Server privati64278/63070/59118 arrestati e browser chiusi,4185 intatta. Nel sigillo sono esplicitamente false le attribuzioni certe alla sequenza umana e alla sola velocità.
