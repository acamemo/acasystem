# ADR-0033 UI, movimento e layout condivisi

| Campo | Valore |
|---|---|
| ID | ADR-0033 |
| Stato | Accettata nel perimetro U44; verifiche in REP-20261102-006 |
| Data e autore | 2026-11-02; scheda redatta da Codex |
| Decisore e autorizzazione | Utente, [U44](../riprogettazione/diario/2026-11-02.md#u44-condivisione-della-ui-e-valutazione-dei-rischi): «io condividerei tutto per snellire il progetto della webapp, ma lascio a te valutazione rischi e pericoli» |
| Collegamenti | [ADR-0004](ADR-0004-principi-frontend.md), [ADR-0005](ADR-0005-typescript-italiano-icone.md), [ADR-0032](ADR-0032-design-condiviso-workspaces.md), [report](../reports/REP-20261102-006-ui-movimento-layout-condivisi.md) |
| Relazione con decisioni precedenti | Estende ADR-0032 al codice UI; aggiorna il suo punto 2 che conservava le primitive React nel frontend. Nessuna variazione all'architettura mini PC/client. |

## Contesto ed evidenze

U42 ha condiviso il CSS. U43 ha chiarito che popup interattivi, toast, focus/scroll, movimento e layout React erano ancora locali. U44 autorizza la condivisione con valutazione tecnica dei confini: spostare anche controller della casa renderebbe il livello comune dipendente dall'applicazione.

## Decisione e scelte esecutive

1. Fonte canonica in `progetto/acasystem/ui/`, nello stesso contesto Docker/sorgenti del design. Primitive, popup, presenza/movimento, toast, AppShell e navigazione Pager/PageIndicator sono condivisi. Il CSS relativo risiede in `design/components` e `design/layout`.
2. Vecchi import frontend conservati come re-export. React, provider, context, contatori di scroll e stage mantengono un'unica istanza. Nessun nuovo pacchetto o dipendenza; TypeScript strict autonomo e controlli di confine verificano l'indipendenza dal frontend.
3. PageShell, WidgetGrid, composizioni e controller legati ad account, dispositivi, configurazione e HA restano nel frontend e compongono la UI comune. Questa è la valutazione esecutiva dei rischi delegata dall'utente, non una nuova funzione.
4. Componenti destinati al DOM in browser, WebView ed Electron. HTML semplice continua a usare il CSS senza React. Casa3D mantiene l'adattatore Lit/Shadow DOM di U42; la console HAOS non acquisisce un renderer grafico.
5. Import dai sottopercorsi per il riuso mirato; ingresso aggregato `ui/index.ts`, helper `ui/motion.ts` e CSS completo facoltativo `ui/styles.css`. Il frontend conserva l'ordine di caricamento precedente; Grid/Flex e testo accessibile funzionano anche senza Tailwind.

## Alternative e motivazioni

Condividere soltanto i token lasciava duplicabile la logica interattiva. Trasferire tutte le pagine nel livello comune sposterebbe anche le dipendenze applicative senza creare riuso. Una nuova libreria npm o un altro framework non sono necessari per questo perimetro: la raccolta interna usa strumenti e dipendenze già presenti.

## Conseguenze e revisione

Si semplifica la fonte dei sorgenti; il browser continua a eseguire i componenti richiesti dall'app. Nella build confrontata JS+CSS compressi variano di +12 byte complessivi, senza una riduzione significativa del download. Una modifica comune richiede nuove build dei consumatori e non aggiorna release installate automaticamente.

Focus, scroll annidato, context duplicati, scan Tailwind e ordine CSS sono i rischi verificati con regressioni e banco autonomo. Test host non equivalgono al collaudo Android/iPhone fisico o di ogni schermata applicativa. Esiti, comandi e limiti nel report. Nuovi consumatori o modifiche ai contratti interattivi richiedono riesame dei controlli pertinenti.
