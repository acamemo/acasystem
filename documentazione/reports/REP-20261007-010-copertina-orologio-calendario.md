# REP-20261007-010 — Copertina: orologio analogico e calendario in due card

| Campo | Valore |
|---|---|
| Stato | Completato; banco aggiornato |
| Data | 2026-10-07, Europe/Rome |
| Autore / modello | Claude Code, Opus 5.5 (`claude-opus-5-5`) |
| Richiesta | Chat del 2026-10-07, con l'icona di un calendario (giorno della settimana rosso, numero grande nero) e la schermata della copertina attuale: «dividiamo l'interfaccia in una riga flexbox, al cui interno ci saranno 2 card: nella card di destra, calendario con nome giorno colorato, numero giorno colore scuro (riprendi design immagine) invece card di sinistra orologio analogico e sotto l'orologio l'orario con lo stesso colore scuro del numero calendario». |
| Autorizzazione | Copertina dell'app. Esclusi: rimozione del calendario a strappo (resta nel codice), nuove dipendenze, commit. |

Nota: tema e accento sono registrati in REP-20261007-008 («Passo 4»); il numero 009 non è assegnato.

## Modifiche

- `components/system/cover/CoverCards.tsx` e `coverCards.css` (nuovi):
  - `CoverClock`: card con quadrante incassato del kit, SVG con 60 tacche (più marcate ogni 5 minuti), lancette di ore e minuti scure, lancetta dei secondi d'accento; sotto, l'ora digitale nello stesso inchiostro scuro del numero.
  - `CoverCalendar`: card con il giorno della settimana nel colore d'accento e il numero del giorno grande, leggero e scuro, come nell'icona di riferimento. Nome accessibile con la data completa.
- `pages/cover/CoverPage.tsx`: riga flex con le due card, orologio a sinistra e calendario a destra.
  - Le card sono quadrate e si dimensionano sulla pagina con le unità del contenitore, arrotondate a 4 px.
  - Si impilano quando la pagina è più alta che larga.
  - Il calendario a strappo (`TearCalendar`) resta nel codice ma non è più mostrato.
- `pages/ui-kit`: la copertina vera compare anche nei prototipi, in una cornice 16:9, così si vede senza accedere.
- Test: `LauncherIndicatorCover.test.tsx` aggiornato. Verifica le due card, la data, il nome accessibile e l'ora che avanza.
- `.claude/launch.json` (nuovo): anteprima locale della build sulla porta 4173.

## Verifiche

Typecheck, lint, lint dei colori, lint tipografico, vitest 1333/1333 e build verdi. Controllo visivo nel browser integrato su `vite preview` (`localhost:4173/#/ui-kit`), dopo aver corretto la centratura del contenuto della card (la regola `display: block` delle card del kit prevaleva). Non eseguito: banco Docker (il demone non risponde, `docker ps` in timeout), formato verticale e tablet fisico.


## Banco (2026-10-07)

Su richiesta dell'utente («riavvia tu Docker e ricostruisci il banco»), Docker Desktop è stato chiuso e riavviato; i container `homeassistant` e `aca-tunet-tunet-1` sono ripartiti. Banco ricostruito: `sha256:fd61376f73e6cb44795a3d3e4f26be230c0098fb4579433de2ce2389bfbb5ed6`, healthy, `/api/health` ok, `/auth/providers` 200 attraverso il proxy; il bundle servito contiene la gestione di `aca_appearance`.
