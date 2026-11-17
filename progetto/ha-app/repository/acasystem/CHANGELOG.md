# Novità

## 0.9.34

- Account personali con registrazione libera sulla centrale pronta e dispositivi nominati, con accessi indipendenti e revoca del singolo dispositivo.
- Profili sincronizzati con ordine comune dei widget, griglia adattiva e recupero delle configurazioni precedenti.
- Modifiche protette fra dispositivi, bozze offline conservate e conflitti visibili.
- Tavano a schermo intero con attività della casa, persona/dispositivo, filtri, dettagli e copia o esportazione depurata.
- Comandi tracciati con esito incerto esplicito e senza reinvio automatico dopo timeout.
- Foto account con ritaglio oppure colore; copertina visibile soltanto nella vista account.
- Richiede il bundle web0.9.34 incluso nel server; i client legacy ricevono richiesta di aggiornamento per i vecchi salvataggi globali. Hardware Android/iPhone resta da collaudare.

## 0.9.33

- Registrazione del primo proprietario, accesso e completamento della casa nella webapp ACA condivisa.
- Client Windows e Android collegati al mini PC tramite IP; QR di collegamento in Sistema, distinto dagli inviti account e copia layout.
- Bundle web della stessa versione incluso nel server, disponibile anche prima dell'accesso.
- Bootstrap ACA per HAOS già installato, con verifica della versione e QR di collegamento. Materiali e istruzioni nella release.
- Esperimento VM desktop accantonato; il nuovo client Windows non include o avvia il motore VM.

## 0.9.30.1

- Acasystem 0.9.30, pacchetto corretto: se il Supervisor risponde lento, l'app riprova per circa un minuto e poi cerca Home Assistant sulle porte 8123 e 80, invece di usare sempre la 8123.

## 0.9.30

- Prima versione di Acasystem come app di Home Assistant OS.
