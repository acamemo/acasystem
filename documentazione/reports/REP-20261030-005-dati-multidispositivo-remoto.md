# Dati ACA su più dispositivi e accesso fuori casa

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261030-005 |
| Stato | Completato |
| Data | 2026-10-30, Europe/Rome |
| Autore / modello | Codex; nome esatto del modello non disponibile. |
| Commit di partenza | 5c321b92b140f08bc5efe8d3c2fbaa6e2356cc69 |
| Richiesta di riferimento | «Altra domanda che ti pongo, se poi l'utenza vuole avere i propri dati dell'app su qualsiasi dispositivo e poter controllare anche da fuori casa? In quel caso come si fa?» |
| Autorizzazione | Analisi e memoria della riprogettazione nel perimetro corrente; nessuna installazione, modifica applicativa, servizio cloud, account o accesso remoto da attivare. |

## Obiettivo e perimetro

Distinguere dati comuni, preferenze dei client, accesso remoto e backup. Valutare una casa con hub autorevole e più client rispetto a istanze HA indipendenti; confrontare Nabu Casa, VPN e possibile relay ACA senza approvarne l'adozione. Verificare ciò che esiste già nei sorgenti e ciò che manca al contratto dei client.

Preservare modifiche applicative/documentali preesistenti. Copie iniziali di otto documenti, censimenti SHA256 e stato Git in directory temporanea. Se confermata, correggere l'assunzione sulla porta HA nello studio VM e annotare il report chiuso mantenendone lo storico, secondo AGENTS.md.

## Criteri di completamento

- Modello comprensibile con dipendenze da disponibilità domestica e Internet.
- Mappa dei dati attuali e proposte di condivisione/conflitto, senza affermare che tutto sia già sincronizzato.
- Alternative remote con fonti primarie e distinzione tra endpoint HA e server ACA.
- Identità, nuovi dispositivi e vincolo UI HA non mostrata mantenuti.
- Diario, indici e punto di ripresa aggiornati; diff/link/integrità verificati, nessuna attivazione o prova.

## Avanzamento e modifiche

Creato lo [studio multidispositivo e remoto](../riprogettazione/blocchi/01-dati-multidispositivo-remoto.md): hub/client proposti, mappa dei dati, condivisione parziale esistente, trasporto remoto e identità, comportamento offline e prove future. Confrontati Nabu Casa, VPN e relay ACA senza adottare un servizio o modello di account.

Aggiornati [diario U21/A21](../riprogettazione/diario/2026-10-30.md#u21-dati-su-ogni-dispositivo-e-controllo-fuori-casa), ingresso/indicazioni, stato, LEGGIMI e indice report. Corretta la porta nello studio di provisioning e aggiunta una rettifica datata a [REP-20261030-004](REP-20261030-004-provisioning-vm-haos.md), preservandone esiti e chiusura storici. Dieci documenti interessati, due nuovi.

La rettifica distingue nuove installazioni HA OS normalmente su 80, configurazioni migrate e Container su 8123, con rilevamento della porta effettiva. Non cambia il provisioning o le porte reali. Nessun nuovo ADR/REQ, provider o architettura approvati.

## Verifiche ed evidenze

| Controllo | Procedura | Esito | Limiti |
|---|---|---|---|
| Stato iniziale | git status --short; git rev-parse HEAD; censimenti SHA256 | Superato | Lavoro preesistente preservato. |
| Dati e contratti correnti | Get-Content/rg e revisione dei sorgenti database, snapshot, impostazioni, appearance, URL e client config | Superato | Condivisione parziale e dati locali distinti; nessun test di sincronizzazione o collegamento esterno. |
| Fatti remoti | Fonti primarie HA/Nabu Casa/Tailscale e sorgenti Core 2026.10.4 consultati il 2026-10-30 | Superato | Tunnel e API distinti da replica; nessun prezzo, contratto o disponibilità ACA certificati. |
| Rettifica porta HA | HTTP ufficiale e GitHub fetch di homeassistant/components/http/config.py, tag 2026.10.4 | Superato | Default nel contesto Supervisor osservato; override/configurazione effettiva da leggere in una futura prova. Nessuna API locale contattata. |
| Revisione indipendente | Rilettura dello studio da parte di un altro agente | Superato | Nessun problema sostanziale rilevato su dati, remoto, identità, UI HA e disponibilità. Non è un collaudo. |
| Documenti e collegamenti | UTF-8 rigoroso, confronto con copie iniziali, link locali/ancore, git -c core.safecrlf=false diff --check -- documentazione | Superato | 32 link introdotti e 4 ancore locali validi; nessuno spazio finale introdotto. |
| Codice e lavoro preesistente | rg --files --hidden progetto con esclusioni node_modules/.git/dist/.tmp; Get-FileHash SHA256; confronto stato Git fuori documentazione/ | Superato | 1.643 file censiti, zero differenze; stato Git esterno ai documenti invariato. |
| Materiali U11 | Get-FileHash SHA256 e confronto con censimento iniziale | Superato | Tre materiali invariati, pin conservati. |
| Condivisione/controllo remoto | Prove tra dispositivi e reti differenti | Non eseguito | Nessun account, VPN, cloud o endpoint attivato. |

## Controllo del diff e decisioni

Diff confrontato con richiesta e criteri: soltanto documenti pertinenti; l'unico intervento su un report chiuso è un'annotazione datata di rettifica, conforme ad AGENTS.md, senza riscriverne lo storico. Nessun servizio remoto, nuovo modello di identità o fallback alla UI HA adottati. Nessuna installazione, modifica applicativa/configurazione, commit o deploy.

## Chiusura e punto di ripresa

Analisi completata. Per il modello proposto un hub domestico autorevole offre la stessa casa a più client; dati condivisi, dati personali/locali, autenticazione e trasporto remoto richiedono scelte separate. Un relay non sostituisce un hub spento per i dispositivi locali. Restano la disponibilità richiesta, i dati da condividere, il percorso remoto e il login ACA completo.

Nessun incarico esecutivo resta attivo. Proseguire dalle domande dell'utente, senza attivare cloud/VPN, registrare account, installare o eseguire prove. Pin e materiali invariati; percorso tecnico iOS rinviato.

