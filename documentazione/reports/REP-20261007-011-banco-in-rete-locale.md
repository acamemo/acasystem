# REP-20261007-011 — Banco raggiungibile dai tablet in rete locale

| Campo | Valore |
|---|---|
| Stato | Completato; prova dal tablet da fare |
| Data | 2026-10-07, Europe/Rome |
| Autore / modello | Claude Code, Opus 5.5 (`claude-opus-5-5`) |
| Richiesta | Chat del 2026-10-07: «puoi fare un container docker per provare già il frontend su un tablet senza dover scaricare niente e collegandomi da browser??» |
| Autorizzazione | Pubblicazione del container esistente sull'indirizzo Wi-Fi del PC. Esclusi: firewall, HTTPS, accesso da Internet. |

## Modifica

`progetto/compose.tunet.yaml`: oltre a `127.0.0.1:3002`, la porta 3002 è pubblicata su `192.168.1.42`, l'indirizzo Wi-Fi del PC. Nessun nuovo container: il banco esistente serve frontend e proxy di Home Assistant.

## Verifiche

`docker port` mostra entrambe le pubblicazioni. Da `http://192.168.1.42:3002`: `/api/health` ok, `/auth/providers` 200. Firewall, solo in lettura: la rete Wi-Fi ha profilo Pubblico e Docker Desktop ha due regole in ingresso «Allow» su quel profilo. Non eseguito: prova da un tablet.

## Limiti

- L'indirizzo è fisso nel file: se il router assegna al PC un altro indirizzo, il container non si avvia finché non si aggiorna il file (o si fissa l'indirizzo nel router).
- Il collegamento è HTTP in chiaro sulla rete Wi-Fi: chiunque sia sulla stessa rete può raggiungere la pagina di accesso, e la password viaggia senza cifratura fino al PC. Va bene per la prova in ufficio o a casa, non come configurazione definitiva (ISSUE-027).
- In HTTP il browser non attiva il service worker (installazione come app); l'interfaccia funziona comunque.

Annotazione del 2026-10-07: il PC è passato alla rete con indirizzo `172.20.10.6`; il file è stato aggiornato (REP-20261007-020).
