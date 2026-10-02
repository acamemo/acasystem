# REP-20261002-003 — Separazione di documentazione, backup e progetto

| Campo | Valore |
|---|---|
| Stato | Completato |
| Data | 2026-10-02, riferimento Europe/Rome |
| Autore | Codex; identificativo esatto del modello non disponibile. |
| Commit di partenza | `212ae76f8b3cccc386309f68b392f999ba9ab56a` |
| Richiesta di riferimento | «la cartella in cui siamo, vogliamo fare una cartella di documentazione, una cartella di backup e una cartella di progetto effettivo?» |
| Autorizzazione | Organizzare le tre aree nella cartella corrente, preservando la documentazione e lo storico Git locale già richiesti. |
| Decisione | [ADR-0002](../decisions/ADR-0002-organizzazione-cartelle.md); separazione richiesta dall'utente, nomi e percorsi scelti come dettagli esecutivi. |

## Obiettivo e perimetro

Raccogliere i documenti in `documentazione/`, predisporre `backup/` per copie locali e `progetto/` per il futuro codice. Mantenere `README.md`, `AGENTS.md` e Git nella radice. Aggiornare collegamenti e percorsi correnti, senza sviluppare l'applicazione o configurare servizi.

La working tree iniziale è pulita. Non ci sono modifiche preesistenti da preservare oltre ai due commit già presenti. La copia originale resta versionata e il suo contenuto non viene modificato.

## Criteri di completamento

- Tre cartelle chiaramente descritte, con un unico punto d'ingresso in radice.
- PRD e documenti trasferiti con link e identificativi validi.
- Archivio originale identico ai byte acquisiti nel primo commit.
- Contenuti di backup esclusi da Git, con il solo README della cartella versionato.
- Nessun codice, manifest applicativo, deployment o backup dichiarato disponibile senza evidenza.
- Regole agenti, stato e storico aggiornati; nuovo commit locale senza alterare i precedenti.

## Avanzamento e modifiche

1. Verificati working tree pulita e i due commit iniziali; aperto il report prima del trasferimento.
2. Trasferiti `docs/` in `documentazione/` e il PRD in `documentazione/product.md` tramite `Move-Item`, dopo controllo dei percorsi assoluti interni al workspace e dell'assenza della destinazione.
3. Mantenuti README, AGENTS e Git in radice; aggiunto l'indice documentale e predisposti backup/progetto con il solo README.
4. Aggiornati link, percorsi nelle regole e nei modelli, attributi dell'archivio e stato effettivo. Le sole variazioni del PRD sono i percorsi dei collegamenti.
5. Registrata ADR-0002; aggiunte annotazioni datate ad ADR-0001 e ai due report chiusi, preservandone tutto il contenuto precedente.
6. Verificati documenti, esclusioni, archivio e diff staged; creato il commit locale di riorganizzazione e controllati storico, working tree e archivio versionato.

## Verifiche ed evidenze

Esiti collegati in [verification.md](../verification.md#riorganizzazione-delle-cartelle--2026-10-02).

| Controllo | Comando/procedura e ambiente | Esito ed evidenza |
|---|---|---|
| DOC-07 | Windows/PowerShell; `Get-FileHash`, `python -` con confronto dei blob del primo commit, file Markdown, link/ancore e ID | Superato: originale di 20.910 byte identico ai due blob iniziali; SHA-256 invariato; 21 Markdown, 121 link locali, 17 REQ/AC/V e 14 ISSUE validi, zero errori. |
| DOC-08 | `python -` con confronto del PRD rispetto a `212ae76`, inventario delle cartelle e verifica dei percorsi AGENTS; lettura README → AGENTS → stato → report/ADR | Superato: PRD identico salvo link relativi; tre aree reperibili, backup/progetto con il solo README. Revisione documentale, senza un secondo agente/modello. |
| DOC-09 | `git diff --cached --check`, `--stat`, `--name-status -M`; `git check-ignore --no-index`, `git check-attr`, `git show :documentazione/archive/product-original-2026-10-02.md`; controlli Python | Superato: 23 file versionati di documentazione/configurazione Git; sei casi di esclusione verificati senza creare copie; solo `backup/README.md` versionabile nell'area backup, attributo dell'archivio `text: unset`, blob staged uguale all'originale. Nessuna firma comune di segreti rilevata. |
| DOC-10 | `python -` con `git rev-parse HEAD^`/`HEAD^^`, `git rev-list --count HEAD`, `git ls-files`, `git status --porcelain`, `git remote`, `git show HEAD:documentazione/archive/product-original-2026-10-02.md` | Superato: 3 commit, 23 file versionati, i due commit iniziali preservati come antenati diretti, working tree pulita, 0 remote e archivio versionato identico all'originale. |

SHA-256 dell'archivio: `C0B3D5D9E7B291481C9ADC9BC110D66265A328CF578D3A0437D9283FC39CE383`.

Il primo controllo dei percorsi AGENTS ha prodotto un falso positivo: la stringa `docs/` compariva nell'URL della documentazione ufficiale. Limitato il controllo ai percorsi locali tra backtick, la verifica è passata. Nessun link locale era errato. Due tentativi di generazione della patch erano falliti per codifica dell'output e troncamento del risultato; non avevano modificato file, e la patch successiva è stata applicata e verificata.

I controlli Python sono stati eseguiti in memoria con `python -`, senza introdurre script permanenti o CI. Non verificano il rendering Markdown, la futura applicazione o il recupero da backup. Nessuna copia di backup, prova di ripristino o configurazione infrastrutturale è stata creata.

## Controllo del diff e decisioni

Revisione completata: il diff corrisponde alla separazione richiesta. Git rileva il trasferimento dell'archivio come `R100`, senza variazioni dei byte. I tre documenti storici annotati mantengono integralmente il testo precedente. I nomi e il mantenimento delle istruzioni nella radice sono scelte esecutive; requisiti, priorità, stack e decisioni applicative restano invariati. Nessun remote configurato.

## Chiusura e punto di ripresa

DOC-07–DOC-10 superati entro i limiti descritti. Incarico completato: tre cartelle predisposte, documentazione trasferita, originale preservato e storico locale aggiornato. Nessun incarico resta attivo; il backlog di prodotto resta proposto e non assegnato. Backup effettivi e sviluppo applicativo richiedono incarichi successivi.

Per individuare il commit che include questo report usare `git log --follow -- documentazione/reports/REP-20261002-003-organizzazione-cartelle.md`.
