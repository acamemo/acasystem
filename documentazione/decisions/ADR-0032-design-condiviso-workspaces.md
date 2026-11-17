# ADR-0032 Design ACA condiviso fra workspace e distribuzioni

| Campo | Valore |
|---|---|
| ID | ADR-0032 |
| Stato | Accettata nel perimetro U42; implementazione e verifiche in REP-20261102-005 |
| Data e autore | 2026-11-02; scheda redatta da Codex |
| Decisore e fonte umana | Utente, [U42](../riprogettazione/diario/2026-11-02.md#u42-css-neumorfico-condiviso-per-tutto-il-progetto): estrarre il CSS neumorfico della webapp e condividerlo con distribuzioni, launcher e futuri workspace |
| Collegamenti | [ADR-0004](ADR-0004-principi-frontend.md), [ADR-0005](ADR-0005-typescript-italiano-icone.md), [ADR-0029](ADR-0029-desktop-centrale-qr-design-condiviso.md), [report](../reports/REP-20261102-005-design-aca-condiviso-workspaces.md) |
| Relazione con decisioni precedenti | Estende la condivisione grafica di ADR-0029 spostando la fonte fuori dal frontend; non modifica le decisioni su mini PC/client o VM |

## Contesto

La prima condivisione distribuiva font, reset e token dal frontend ai client. Il look di pulsanti/campi/pannelli rimaneva duplicato nelle shell; Casa 3D usa Shadow DOM e token UI propri. La skin neumorfica Kit2 dipende dai materiali ACA: estrarre soltanto le variabili colore non basta a condividere la presentazione.

## Decisione e scelte esecutive

1. Fonte canonica in `progetto/acasystem/design/`, fuori dal workspace frontend e dentro il contesto Docker/sorgenti esistente. Contiene font/licenza, reset, token, materiali, tipografia, componenti ACA e skin Kit2. Palette e valori esistenti sono conservati; il nuovo token `--aca-color-scheme` espone il tema agli adattatori.
2. `index.css` carica il design completo; `base.css` la fondazione. I vecchi percorsi frontend restano shim. Nessun nuovo package/framework; le primitive React restano dove sono e consumano le stesse classi.
3. Windows e Android ricevono copie generate autonome attraverso `copy-assets.mjs`; i loro pulsanti, campi e pannelli usano classi e struttura MaterialLayers della webapp. `shell.css` conserva composizione e stati specifici. Le copie generate non si modificano manualmente.
4. Casa 3D eredita i token ACA nello Shadow DOM tramite gli override previsti. Fallback standalone, layout, scene, Three.js e originali upstream sono preservati; i controlli del canvas conservano il materiale piatto previsto per quel contesto.
5. Le future interfacce HTML/CSS importano l'entrypoint o generano gli asset con lo stesso copier. Pagine/widget mantengono il CSS specifico di composizione e usano le primitive comuni per la presentazione. Gli elementi HTML senza il relativo markup/classi non acquisiscono automaticamente i materiali composti.

## Conseguenze e limiti

Una modifica alla fonte comune entra nelle nuove build dei consumatori; non aggiorna automaticamente applicazioni già installate o release pubbliche. Il build Docker include la fonte comune, e i sorgenti ACA includono la cartella perché parte del perimetro già distribuito.

Il CSS richiede un renderer web. La console HAOS e un eventuale visualizzatore nativo rimangono decisioni separate; questa richiesta non ne autorizza l'implementazione. Test host, confronto visivo e packaging non equivalgono a collaudo Android/iPhone fisico o accettazione generale dell'app.

**Annotazione 2026-11-02, U44:** [ADR-0033](ADR-0033-ui-movimento-layout-condivisi.md) estende la fonte comune ai componenti React, movimento e layout; aggiorna la collocazione delle primitive del punto2 senza modificare il resto della decisione CSS. [Report006](../reports/REP-20261102-006-ui-movimento-layout-condivisi.md).
