# ADR-0026 Frontend HA presente ma non mostrato nello studio Android

| Campo | Valore |
|---|---|
| ID e titolo | ADR-0026: mantenere il frontend HA presente ma non mostrarlo nel percorso ACA sul tablet. |
| Stato | Accettata |
| Data e autore | 2026-10-29; assistente Codex, identificativo esatto del modello non disponibile. |
| Decisore e autorizzazione | Utente, chat corrente: «Ok, lasciamo il frontend HA presente ma nascosto. Partiamo dalla compatibilità di Python e delle dipendenze con il Lenovo Tab M11, per ora senza installare nulla né modificare il codice.» Testo conservato in [U7](../riprogettazione/diario/2026-10-29.md#u7-scelta-sul-frontend-e-studio-python-sul-m11). |
| Collegamenti | [REP-20261029-009](../reports/REP-20261029-009-compatibilita-python-m11.md), [piano Android](../riprogettazione/blocchi/01-fattibilita-tablet-android.md), [ADR-0023](ADR-0023-app-client-a-ibrida.md). |
| Sostituisce / sostituita da | Nessuna. La rimozione completa del frontend era un'ipotesi di studio, non una precedente decisione accettata. |

## Contesto ed evidenze

L'utente sta valutando ACA e Home Assistant Core sullo stesso tablet Android, senza mini PC. La ricerca ha distinto usare soltanto l'interfaccia ACA dal rimuovere il componente frontend HA. Nel tag [Core 2026.10.4](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/bootstrap.py) il bootstrap carica il frontend e lo considera fra le integrazioni critiche; fonte consultata il 2026-10-29.

## Decisione

Conservare il componente frontend HA e le relative dipendenze nello scenario allo studio. Il percorso utente previsto presenta ACA, senza richiedere la rimozione del frontend dal motore.

La decisione non specifica un intervento per disabilitare o rendere inaccessibili le route HA: non mostrare l'interfaccia nel flusso ACA e bloccarne tecnicamente l'accesso sono questioni diverse. Non sono assegnate modifiche a schermate, configurazione o rete in questo incarico.

## Alternative e motivazioni

La rimozione completa del componente richiederebbe modifiche o verifiche aggiuntive del bootstrap e del recovery. L'utente ha scelto di conservarlo, consentendo di concentrare la valutazione sulla compatibilità del motore e delle dipendenze con Android. Non è stata scelta una toolchain né dimostrata l'esecuzione di Core sul tablet.

## Conseguenze

La matrice di compatibilità deve considerare il Core completo delle dipendenze frontend richieste, senza sottrarle per ipotesi. La scelta non autorizza installazioni, porting, aggiornamenti o sostituzioni di librerie. L'applicazione attuale resta invariata.

## Verifiche e revisione

La fonte umana è esplicita; la decisione è registrata documentalmente. Nessun risultato di implementazione o prova sul dispositivo viene dichiarato. Una futura richiesta di rimuovere il componente o di bloccarne le route richiederà una nuova indicazione umana e una valutazione pertinente, mantenendo questo storico.
