# Acasystem

Acasystem è l'interfaccia di MeMo Srl per Home Assistant. Questa app installa sul mini PC il server di Acasystem; si usa dalle app **Acasystem** per Windows e Android.

## Come si usa

1. Installa e avvia questa app.
2. Sul tablet o sul PC apri l'app Acasystem e scrivi l'indirizzo IP del mini PC.
3. Accedi con utente e password di Home Assistant.

## Dettagli

- **Porta:** 3002 sulla rete locale. Non serve aprirla verso Internet.
- **Dati:** layout, profili e Casa 3D sono nella cartella dell'app ed entrano nei backup di Home Assistant (backup a freddo).
- **Home Assistant:** l'app lo raggiunge sulla rete interna di HA OS e legge da sola la porta.
- **Aggiornamenti:** quando esce una versione nuova, Home Assistant la mostra tra gli aggiornamenti.

## Licenza

GPL-3.0. I sorgenti di ogni versione sono allegati alla release corrispondente in <https://github.com/acamemo/acasystem-releases/releases>.
