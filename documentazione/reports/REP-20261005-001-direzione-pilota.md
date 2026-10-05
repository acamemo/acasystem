# REP-20261005-001 — Direzione di prodotto e primo pilota in ufficio

| Campo | Valore |
|---|---|
| Stato | Completato |
| Data | 2026-10-05, riferimento Europe/Rome |
| Autore | Codex; identificativo esatto del modello non disponibile. |
| Commit di partenza | `f258bc7c22baa27d47fb0f37e21df3d43d60c7ab` |
| Richiesta di riferimento | Continuare la progettazione; risposte alle sette domande sul pilota e successive precisazioni. |
| Autorizzazione | Consolidare le indicazioni umane nella documentazione e nello storico locale. Nessun incarico di sviluppo, installazione, acquisto o configurazione di servizi. |

## Richiesta ed evidenze umane

- Pilota: «Ufficio».
- Distribuzione: «fornire mini pc o raspberry nelle case, uffici o aziende in cui installeremo il sistema».
- Funzioni: l'elenco di stati/comandi, luci, clima, consumi, scenari, piantina, remoto e AI è indicato come interesse; viene aggiunta la personalizzazione grafica. Non è assegnata una priorità distinta a ciascuna funzione.
- Obiettivo operativo: sistema locale, «offrire il massimo possibile anche offline»; online permette la gestione da remoto, fuori casa.
- Admin: configurazione completa e associazione dei dispositivi; il sistemista trova l'admin già collegato, configura, esce ed entra con account cliente.
- Amministratore di condominio: può configurare i dispositivi comuni, come la caldaia condominiale, escludendo la configurazione di quelli nelle singole case. Visibilità, letture e comandi non sono ancora precisati.
- Hardware: mini PC o Raspberry, Linux, sistema cablato con componente Wi-Fi; valutare una macchina condivisa da molti utenti. Modelli, inventario e significato della «scheda ritornante wi-fi» non sono precisati.
- Base: «Home assistant base è irrinunciabile»; riferimento frontend React confermato come «È Tunet: github.com/oyvhov/Tunet».
- Cloud: «Hetzner è inutile».
- Primo risultato: «L'obiettivo minimo, che per me sarebbe ideale come fase 1, è home assistant personalizzato graficamente».
- Precisazione hardware: «Linux a 64 bit: ARM64 o x86-64».
- Precisazione setup: «Sessione admin aperta solo per il primo setup».

## Obiettivo e perimetro

Definire il pilota e aggiornare PRD, stato, architettura, infrastruttura e verifiche secondo le nuove indicazioni. Registrare una decisione di prodotto e conservare i requisiti originali, compresi quelli ritirati o non inclusi nella fase 1. La working tree iniziale è pulita.

## Criteri di completamento

- Fase 1 identificata come personalizzazione grafica locale di Home Assistant, con Tunet confermato come punto di partenza.
- Hetzner rimosso dalle dipendenze correnti e conservato nello storico del requisito originale.
- Linux a 64 bit, ruoli, primo setup e isolamento condominiale documentati senza inventare una soluzione implementata.
- Obiettivi futuri e criteri proposti distinti dalla fase minima e dalle verifiche eseguite.
- Originale integro, ID e collegamenti validi; soltanto documentazione modificata.

## Avanzamento e modifiche

Letti documenti e regole; acquisite le precisazioni e verificate le fonti pubbliche.

- Creati [pilot-scope.md](../pilot-scope.md) e [ADR-0003](../decisions/ADR-0003-home-assistant-locale-fase1.md), distinguendo minimo grafico, direzione di prodotto, dettagli aperti e sviluppo non autorizzato.
- Allineati PRD, stato, architettura, infrastruttura, vincoli e scenari. Conservati REQ-00–REQ-16 e priorità originali; REQ-01 Ritirato, REQ-00/02/03/06 approvati nei vincoli/comportamenti specificati, aggiunto REQ-17 Approvato per il ruolo condominiale.
- Aggiunti AC-17/V-17 e ISSUE-015 per la valutazione di molti utenti su hardware condiviso. Gli altri problemi restano aperti: chiarire un obiettivo non dimostra una soluzione.
- Aggiornati indici, README e percorso di lettura AGENTS. Archivio, ADR e report chiusi non modificati; cartelle progetto/backup con il solo README.

## Fonti verificate il 2026-10-05

| Fonte | Evidenza acquisita | Limite |
|---|---|---|
| [Tunet README](https://github.com/oyvhov/Tunet/blob/5dec99587b4fcc2fb1f831a0a0002c9b90e6958e/README.md) e [LICENSE](https://github.com/oyvhov/Tunet/blob/5dec99587b4fcc2fb1f831a0a0002c9b90e6958e/LICENSE) | Dashboard React; GPL-3.0. `git ls-remote https://github.com/oyvhov/Tunet.git refs/heads/main` restituisce `5dec99587b4fcc2fb1f831a0a0002c9b90e6958e`, uguale alla revisione precedente. | Identificato il riferimento, senza clone o integrazione. Nessuna prova di compatibilità, avvio, condizioni per l'uso concreto o analisi completa del codice. |
| [FAQ Home Assistant offline](https://www.home-assistant.io/faq/works-without-internet) | HA e dispositivi locali possono operare senza internet; integrazioni cloud, remoto e aggiornamenti possono dipendere dalla connettività. | Non dimostra l'offline del frontend ACA/Tunet o degli apparati ancora non inventariati. |
| [Permessi HA](https://developers.home-assistant.io/docs/auth_permissions/) | Distingue operazioni sulle entità e controlli amministrativi sulla configurazione; owner ha accesso completo. Pagina aggiornata il 2026-09-17. | Inferenza progettuale: il ruolo condominiale limitato richiede progettazione e prove dei percorsi reali; non è dichiarato già disponibile o collaudato. |
| [Specifiche Raspberry Pi 5](https://www.raspberrypi.com/products/raspberry-pi-5/) | CPU Arm a 64 bit, distinta da x86-64. | Esempio per chiarire l'architettura; nessun acquisto o modello selezionato. L'utente approva entrambe le architetture Linux 64 bit. |

## Verifiche ed evidenze

Esiti in [verification.md](../verification.md#direzione-del-pilota--2026-10-05).

| Controllo | Comando/procedura e ambiente | Esito ed evidenza |
|---|---|---|
| DOC-11 | Windows/PowerShell; `python -` per link/ancore, REQ/AC/V/ISSUE, priorità, stati e confronto byte/hash con i due blob del primo commit | Superato: 24 Markdown, 153 link locali, 18 REQ/AC/V e 15 ISSUE validi, 5 requisiti approvati, 1 ritirato; tutti Non iniziati. Originale di 20.910 byte integro. |
| DOC-12 | Revisione di diff e percorso README → AGENTS → pilota → PRD/stato/ADR; ricerca dei riferimenti Hetzner e delle vecchie approvazioni | Superato: direzione tracciabile nelle risposte umane; Hetzner soltanto storico/ritirato, fase minima grafica distinta dalle estensioni, nessun sistema o test applicativo dichiarato realizzato. |
| DOC-13 | `git diff --cached --check`, `--stat`, `--name-only`, `git ls-files`, `git check-attr`, `git check-ignore --no-index`; dopo commit `git rev-parse HEAD^`, `git rev-list --count HEAD`, `git status --porcelain`, `git remote`, confronto del blob archivio | Superato: 15 file Markdown modificati/aggiunti, 26 file versionati, 4 commit con i tre preesistenti preservati, working tree pulita, 0 remote. Archivio versionato integro con `text: unset`; esclusioni dei backup conservate. |

SHA-256 dell'originale invariato: `C0B3D5D9E7B291481C9ADC9BC110D66265A328CF578D3A0437D9283FC39CE383`.

Il validatore è stato eseguito in memoria tramite `python -`, senza aggiungere codice o CI al repository. Non esegue controlli sulle API, sul rendering Markdown o sul frontend; la ricerca di firme comuni di segreti non certifica la sicurezza. I 17 scenari applicativi attivi restano Non eseguiti; V-01 è Non applicabile per il ritiro di Hetzner, non Superato.

## Controllo del diff e decisioni

Revisione completata: modifiche documentali coerenti con le risposte, senza sviluppo, installazione o acquisti. Modi d'installazione, versioni, condizioni di distribuzione, rete e accesso remoto restano aperti. Non viene scelta una combinazione obbligatoria Tunet/HAKit né un cloud sostitutivo. I tre commit preesistenti e i documenti storici restano preservati.

## Chiusura e punto di ripresa

Allineamento documentale e DOC-11–DOC-13 completati entro i limiti descritti, con commit locale e storico preservato. Nessun incarico resta attivo. Nessuna applicazione, installazione o prova funzionale è stata realizzata; il lavoro successivo richiede un incarico con perimetro identificabile.

Punto di ripresa proposto, non assegnato: analisi tecnica Tunet e definizione delle schermate della fase 1. Servono inventario dell'ufficio, dispositivi/client, materiale grafico, metodo HA e vincoli pratici. Ruolo condominiale, remoto e hardware condiviso mantengono i loro problemi aperti e non sono aggiunti implicitamente al minimo grafico.

Per il commit del report usare `git log -- documentazione/reports/REP-20261005-001-direzione-pilota.md`.
