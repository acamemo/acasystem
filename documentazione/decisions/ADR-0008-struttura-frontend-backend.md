# ADR-0008 — Struttura frontend/backend, TypeScript completo e processo con istantanee

| Campo | Valore |
|---|---|
| ID e titolo | ADR-0008 — Struttura frontend/backend, TypeScript completo e processo con istantanee |
| Stato | Accettata |
| Data e autore | 2026-10-06; scheda redatta da Claude Code (Opus 5.5) |
| Decisore e autorizzazione | Utente committente, chat del 2026-10-06 e piano approvato. «Andrei innanzitutto a impostare come linguaggio Typescript al posto di Javascript». Immagine «Frontend / Backend — two parts, one application», con il principio «avere tutto diviso nelle primitive e stabilire una gerarchia». «Ti raccomando l'uso di subagenti per lavorare in parallelo […] infine si struttura una review finale». Risposte alle domande: «Due pacchetti frontend/ + backend/»; strumenti «Nessuno per ora»; TypeScript «Nucleo TS subito, UI durante il redesign»; versioni «Copie di versione» nella cartella usa-come-git. |
| Collegamenti | REQ-03; ADR-0002, ADR-0004, ADR-0005, [ADR-0007](ADR-0007-acasystem-os.md); [REP-20261006-001](../reports/REP-20261006-001-acasystem-os.md); ISSUE-017, ISSUE-018 |
| Sostituisce / sostituita da | Integra ADR-0002 (cartelle del repository) e ADR-0005 (migrazione progressiva, che diventa completa). Nessuna sostituta. |

## Contesto ed evidenze

Tunet 1.22.1 è un unico pacchetto: frontend in `src/` (circa 213 file JS/JSX e 63 mila righe), server Express in `server/` (11 file) e un solo package.json. ADR-0004 chiede primitive con gerarchia; ADR-0005 aveva avviato TypeScript solo sulla HOME.

## Decisione umana

1. **Monorepo** `progetto/acasystem` con npm workspaces `frontend/` e `backend/` e le cartelle dell'immagine. Frontend: `@types`, `api`, `assets`, `components`, `hooks`, `pages`, `routes`, `templates`, `themes`, `utils`, `validators`. Backend: `@types`, `config`, `controllers`, `helpers`, `middlewares`, `models`, `routes`, `services`, `validators`, `server.ts`.
2. **Gerarchia** `components/primitives` → `components/system` → `components/widgets` → `templates` → `pages`, verificata dal lint. Le primitive non conoscono Home Assistant.
3. **TypeScript ovunque.** Il nucleo si porta subito; l'interfaccia si riscrive in TSX durante il redesign; a fine lavoro niente più JavaScript applicativo e strict su tutto.
4. **Nessun nuovo strumento:** niente Prisma né Biome; restano better-sqlite3, ESLint e Prettier.
5. **Versioni senza commit** nel repository di progetto: istantanee in `usa-come-git/vNNN`, esclusa da Git, ciascuna con una nota di versione.
6. **Lavoro a ondate** con subagenti in parallelo sullo stesso working tree. Ogni agente ha proprietà esclusiva di cartelle definite; l'orchestratore integra e verifica; revisione finale con agenti dedicati.

## Alternative e motivazioni

Alternative scartate dall'utente:

| Tema | Alternativa |
|---|---|
| Struttura | Un solo pacchetto con cartelle riordinate |
| Strumenti | Prisma e/o Biome subito |
| TypeScript | Conversione integrale prima del redesign |
| Versioni | Commit con worktree; repository separato |

## Conseguenze

- **Percorsi:** cambiano quelli di sorgenti, Docker e Compose. I report storici conservano i percorsi del loro tempo.
- **Server in TypeScript senza dipendenze nuove:** Node con stripping dei tipi (verificato sull'host: `process.features.typescript` = strip) e sintassi solo cancellabile.
- **Commit:** lo storico Git resta fermo a e192121 finché l'utente non chiede commit. Il ripristino passa dalle istantanee.
- **Rischio del lavoro in parallelo:** conflitti mitigati da confini rigidi e da integrazione e verifica dopo ogni ondata.
- **Licenza:** la licenza GPL-3.0 di Tunet e la provenienza restano conservate nel pacchetto (ISSUE-002).

## Verifiche e revisione

Esiti in REP-20261006-001 per ogni ondata:
- typecheck strict;
- lint, compresa la gerarchia e la tipografia;
- suite dei due pacchetti;
- build e immagine Docker con health.

Revisione se l'utente adotta Prisma o Biome, o chiede commit.
