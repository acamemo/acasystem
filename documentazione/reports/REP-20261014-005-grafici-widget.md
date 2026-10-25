# Grafici nelle card del kit

| Campo | Valore |
|---|---|
| ID | REP-20261014-005 |
| Stato | Completato |
| Data | 2026-10-14 |
| Autore | Codex |
| Commit di partenza | 7298d4df0d33bc92123517776d9ebc7c12ecefa6 |
| Richiesta | Ogni card mostra un grafico adatto nella metà superiore, espandibile con la dimensione, e i controlli sotto. |
| Autorizzazione | Richiesta umana corrente; correzione della galleria simulata del report 004. |

## Obiettivo e perimetro

Ripristinare una visualizzazione per tutti i 20 concept. Conservare configurazione, gesti, dettagli e componenti operativi. Il diff preesistente comprende numerose modifiche e file non tracciati: viene preservato. Nessun commit, deploy, dipendenza o aggiornamento Docker.

## Criteri di completamento

Grafico accessibile in ogni card, metà superiore stabile nelle quattro dimensioni; controlli nella metà inferiore. Visualizzazioni coerenti con stato locale e capacità simulate. Verificare test, controlli statici e geometria a 390, 1280 e 1920 px con browser software separato dai test.

## Avanzamento e modifiche

`WidgetDesignChart.tsx` aggiunge curve (temperatura, luminosità, prezzi), barre (volume, velocità, costi, spaziatura), anelli (batteria, apertura, attività) e sequenze di stato (sicurezza, movimento). SVG accessibili, valori condivisi con i controlli, serie temporali esplicitamente simulate; fallback alle capacità del profilo scelto.

`WidgetDesignSpecimen.tsx` conserva controlli e pannelli, misurando lo spazio inferiore per ridurre i controlli quando necessario. `widgetDesigns.css` divide il contenuto in due righe uguali, grafico sopra e controlli sotto. Dimensioni della card invariate; nella modalità Pagina il contenuto inferiore può scorrere. Serratura compatta in disposizione orizzontale; letture lunghe possono andare a capo.

## Verifiche ed evidenze

| Controllo | Procedura | Esito |
|---|---|---|
| Test | Vitest galleria, modello, gesti e MetalKit, massimo quattro worker | 26/26 superati prima delle correzioni geometriche; riesecuzione finale galleria/modello/gesti: 15/15 superati. |
| Statici | typecheck, lint, lint:typography, lint:theme-colors, Prettier sui quattro file | Superati; zero violazioni tipografia/colori. |
| Build | npm run build nel workspace frontend | Superata; warning preesistente del chunk hls superiore a 500 kB. |
| Browser | Chromium senza GPU, separato dai test; backup/check-grafici.cjs | 240 combinazioni: 20 widget × quattro dimensioni × tre larghezze. Aree grafico/controlli uguali (96/164/244/284 px), nessuna differenza di altezza. Overflow iniziali serratura compatta e fascia Nordpool corretti; controllo mirato Nordpool finale senza overflow. Scorrimento verticale Pagina previsto. |
| Interazioni | backup/check-adattivi-interazioni.cjs | Luminosità 65→40, tonalità 250→70 indipendente; dettagli sincronizzati, ordine e visibilità salvati, profilo bianco, indisponibilità, focus e 20 pannelli verificati. Movimento ridotto: transizione 0 s; nessun errore browser. |

Il primo tentativo di rilancio Vitest dalla radice è stato interrotto dopo che npx ha proposto una versione esterna al workspace; rilanciato dalla directory frontend. Nessuna dipendenza del progetto modificata.

## Controllo del diff e decisioni

Perimetro limitato alla galleria, test pertinenti e documentazione. Modifiche preesistenti preservate. Nessuna nuova API operativa; Copertina e HA invariati.

## Chiusura e punto di ripresa

Intervento completato. Anteprima su http://127.0.0.1:5173/#/ui-kit?tab=widgets. Le serie rappresentano esempi grafici, non uno storico HA reale. Nessun commit o aggiornamento Docker; la valutazione estetica resta all'utente.
