# Obiettivi ACA multipiattaforma

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261030-002 |
| Stato | Completato |
| Data | 2026-10-30, Europe/Rome |
| Autore / modello | Codex; nome esatto del modello non disponibile. |
| Commit di partenza | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta di riferimento | «Poi ti aggiungo anche che non si tratta di un'applicazione che deve essere eseguita solo su Android. L'obiettivo sarebbe eseguirla anche su Windows al 100% con Electron, ma cercare un modo di farla eseguire su iOS. Ma per quello ci possiamo pensare pure un'altra volta.» |
| Autorizzazione | Registrare il perimetro di prodotto nella documentazione già richiesta; nessuna implementazione, installazione o analisi iOS assegnata. |

## Obiettivo e perimetro

Conservare Android e Windows/Electron come obiettivi dell'applicazione, iOS come obiettivo futuro da studiare. Il Lenovo resta il primo dispositivo dell'approfondimento in corso. Non trasformare il “100%” in certificazione di compatibilità o trasferimento automatico del runtime HA tra sistemi.

Il working tree contiene modifiche applicative e documentali preesistenti. Copie iniziali degli otto documenti da aggiornare, stato Git e censimenti SHA256 di codice/materiali conservati in directory temporanea; il lavoro estraneo va preservato.

## Criteri di completamento

Fonte umana U18 integrale e ADR con ambito chiaro; ingresso, indicazioni, PRD, stato e indici coerenti; nessuna modifica al codice o ricerca iOS. Controllare collegamenti, diff e integrità dei materiali.

## Avanzamento e modifiche

Registrati [U18 e sintesi A18 nel diario](../riprogettazione/diario/2026-10-30.md#u18-obiettivi-android-windows-e-ios) e [ADR-0028](../decisions/ADR-0028-obiettivi-multipiattaforma.md). Aggiornati ingresso/indicazioni della riprogettazione, PRD, stato, LEGGIMI e indici report/decisioni: dieci documenti interessati, due nuovi. Il Lenovo è indicato come primo target dello studio tecnico; obiettivo Windows e rinvio iOS sono distinti dalle prove ancora mancanti.

## Verifiche ed evidenze

| Controllo | Procedura | Esito | Limiti |
|---|---|---|---|
| Stato iniziale | git status --short; git rev-parse HEAD; censimenti SHA256 | Superato | Modifiche preesistenti acquisite. |
| Interpretazione | Revisione indipendente della richiesta U18 da parte di un altro agente | Superato | L'obiettivo Windows non seleziona automaticamente un host HA; iOS rinviato senza ricerca o tecnologia adottata. |
| Integrità documenti | UTF-8 rigoroso, confronto con copie iniziali, risoluzione link/ancore, git -c core.safecrlf=false diff --check -- documentazione | Superato | 29 link introdotti e 7 ancore locali validi; nessuno spazio finale introdotto. |
| Codice e lavoro preesistente | rg --files --hidden progetto con esclusioni node_modules/.git/dist/.tmp; Get-FileHash SHA256; confronto stato Git fuori documentazione/ | Superato | 1.643 file censiti, zero differenze; stato Git esterno ai documenti invariato. |
| Materiali congelati U11 | Get-FileHash SHA256 e confronto con censimento iniziale | Superato | Tre materiali invariati; pin conservati. |
| Windows/Android/iOS | Esecuzione e prove delle piattaforme | Non eseguito | Il messaggio precisa gli obiettivi e non assegna il porting. |

## Controllo del diff e decisioni

Diff confrontato con la richiesta: solo documenti pertinenti, nessuna modifica di codice, dipendenze, archivi o report chiusi. ADR-0028 registra il perimetro umano; nessun percorso tecnico iOS o host HA Windows adottato. Nessun commit o deploy.

## Chiusura e punto di ripresa

Registrazione completata. Windows/Electron è un obiettivo pieno insieme ad Android; iOS resta da studiare successivamente. Runtime, distribuzione e continuità richiederanno valutazioni specifiche per sistema operativo, senza considerare lo studio M11 una prova multipiattaforma.

Nessun incarico esecutivo resta attivo. Proseguire dalle domande dell'utente; non avviare automaticamente sviluppo Windows, ricerca iOS, preparazione Linux o prove.

