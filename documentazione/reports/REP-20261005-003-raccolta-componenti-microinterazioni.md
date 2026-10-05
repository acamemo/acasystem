# REP-20261005-003 — Raccolta componenti e microinterazioni

| Campo | Valore |
|---|---|
| Stato | Completato |
| Data | 2026-10-05, Europe/Rome |
| Autore / modello | Codex; identificativo esatto del modello non disponibile. |
| Commit di partenza | `7f877e66c67c7b2d69a3c4b7604505ef1909d356` |
| Richiesta | Implementare il piano «Raccolta dei componenti e microinterazioni ACA SYSTEM». |
| Autorizzazione | Raccolta di sette reference, catalogo, aggiornamento della specifica e documenti pertinenti, verifiche documentali e commit locale. Nessuna installazione o modifica dei componenti. |

## Obiettivo e perimetro

Conservare sei esempi nel messaggio e lo switch Wi-Fi nell'allegato, come reference testuali separate. Il primo switch è il riferimento principale; quello Wi-Fi guida feedback luminoso e animazioni. Aggiornare il design con tema chiaro/scuro, accento arancione, microinterazioni prioritarie, luminosità in tempo reale, attività animate e stato stabile, alternativa al trascinamento e movimento ridotto.

Working tree iniziale pulita. Non sono assegnati installazione HA, UI, adattamenti, nuove dipendenze o collaudi applicativi. Archivio originale e report chiusi non vengono modificati.

## Criteri di completamento

- Sette originali distinti, nessuna correzione del codice; provenienza e limiti dell'acquisizione espliciti.
- Catalogo con ID, descrizione, file, dipendenze dichiarate, ruolo e osservazioni; autore, fonte e licenza sconosciuti se non forniti.
- Hash e verifica dell'integrità dalla prima acquisizione; allegato copiato byte per byte e Git senza conversioni degli originali.
- design.md rispecchia le indicazioni umane, mantenendo separate le future scelte tecniche e le verifiche Non eseguite.
- Link validi, stato e storico aggiornati, nessuna modifica a progetto/ o installazione; commit pertinente.

## Avanzamento e modifiche

Creati il [catalogo](../design/componenti/README.md), sette file originali .jsx.txt e il [registro di integrità](../design/componenti/integrita.json). UI-001 è principale, UI-007 è il riferimento aggiuntivo luminoso. Autore, URL e licenza restano sconosciuti; C-10/ISSUE-014 registrano il limite prima dell'uso applicativo. Gli import dichiarati non sono dipendenze installate.

Per UI-001–UI-006 è conservata la cattura del codice nel messaggio, UTF-8/LF, senza modifiche di import, nomi, CSS, colori o spazi. I singoli file sono segmenti contigui della cattura, non adattamenti. Non esiste un file esterno del testo inline per attestare terminazioni o byte antecedenti alla cattura. UI-007 è copiato byte per byte dall'allegato Testo incollato.txt, identificativo 6f856bb7-5772-433d-947c-20d4046d43f7.

Aggiornati design.md, PRD e pilota con temi chiaro/scuro, accento arancione, microinterazioni prioritarie e comportamento progettuale della luminosità. Il riferimento scuro resta #222222; base chiara, geometria dei gesti, frequenza degli invii e meccanismi HA restano da definire nella fase UI/integrazione. Aggiornati indici, stato, verifiche, conformità, istruzioni di conservazione e attributi Git delle fonti.

## Verifiche ed evidenze

| Controllo | Comando / procedura e ambiente | Esito ed evidenza |
|---|---|---|
| DOC-17 | PowerShell: Copy-Item per l'allegato; node in memoria per hash SHA-256, byte/intervalli, concatenazione e confronto allegato; git check-attr e git show :percorso per i blob staged | Superato: sette originali, sei segmenti ricostruiscono i 14.602 byte della cattura; Wi-Fi identico ai 5.027 byte dell'allegato. 19.629 byte complessivi negli originali. Otto blob staged, incluse le fonti inline, identici ai file acquisiti; text: unset. |
| DOC-18 | Validatore Markdown temporaneo con node; verifica ID e copertura del catalogo, revisione di design.md e collegamenti | Superato: 30 Markdown e collegamenti locali validi; sette ID/file/hash, ruoli principali distinti, provenienza sconosciuta esplicita, specifiche confermate separate da dettagli futuri. |
| DOC-19 | Confronti con git show del commit iniziale; archivio e cinque report precedenti; righe REQ/stati; ispezione progetto/backup; diff e git diff --cached --check con esclusione dei soli originali/fonti testuali | Superato: archivio di 20.910 byte e hash invariati, cinque report storici identici, 18 righe REQ e stati conservati, progetto/backup invariati. Diff limitato a raccolta e documenti pertinenti. Gli spazi della fonte sono conservati, non corretti. |

SHA-256 UI-007: `ED2211C5FEFB80790E06767A5D5204A23301B059ACCF0835448797287A6227F1`. Le altre impronte e gli intervalli sono nel registro di integrità. Il test di identità inline riguarda la cattura conservata; non dimostra byte di un file sorgente esterno inesistente.

Gli script sono eseguiti in memoria e non aggiungono test permanenti o CI. Non vengono eseguiti componenti, build, browser, benchmark o comandi HA. Il controllo dei link non attesta siti esterni o rendering. Verifiche applicative Non eseguite; registro comune in [verification.md](../verification.md#raccolta-componenti-e-microinterazioni--2026-10-05).

## Controllo del diff e decisioni

Revisione completata: reference originali preservate, catalogo e specifiche coerenti con il piano umano, nessun adattamento o installazione. Colori grigi/gialli/blu, ID fissi e animazioni infinite degli originali sono osservazioni per il futuro lavoro, conservate senza correzioni. Il piano approvato è la fonte umana dei nuovi vincoli; l'archiviazione del codice non adotta React o styled-components come nuove dipendenze.

Consultate il 2026-10-05 le fonti primarie W3C su [alternativa al trascinamento](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html) e [animazioni da interazione](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html); riportate in design.md come riferimenti progettuali, senza attestare conformità.

## Chiusura e punto di ripresa

Incarico completato: sette reference raccolte e documentazione verificata; nessun incarico resta attivo. Si possono aggiungere nuovi campioni con nuovi ID preservando le fonti, su richiesta. La sequenza successiva confermata è preparazione HA, poi UI, entrambe con incarichi dedicati. Nessuna installazione o integrazione viene avviata da questo report.

Punto di ripresa: catalogo e design.md; acquisire provenienza/licenze e, per HA, inventario reale e metodo di installazione. Per il commit usare `git log -- documentazione/reports/REP-20261005-003-raccolta-componenti-microinterazioni.md`.
