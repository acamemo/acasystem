# Acasystem

Acasystem è l'interfaccia di MeMo Srl per Home Assistant. Questa app installa sul mini PC il server di Acasystem; si usa dai client **Acasystem** per Windows e Android oppure dal browser sulla stessa rete locale.

## Come si usa

1. Con HAOS già installato sul mini PC, installa e avvia questa app. La release 0.9.34 comprende uno script di prima installazione per la console host di HAOS 18.4; non installa HAOS sul disco e non aggiorna versioni precedenti. Un'app già installata si aggiorna dal Supervisor dopo il backup.
2. Sul tablet o sul PC apri il nuovo client Acasystem e scrivi l'indirizzo IP del mini PC, porta 3002. In alternativa apri `http://IP:3002/` nel browser.
3. Se la casa è nuova, crea il primo proprietario dalla webapp ACA, accedi e completa il nome della casa. Sulla centrale pronta scegli **Crea un nuovo utente della casa** oppure **Accedi al mio account**; la creazione di nuovi membri richiede il servizio tecnico ACA pronto. Ogni dispositivo usa un proprio accesso e un nome riconoscibile.
4. In **Sistema → QR Code** mostra il QR di collegamento per un altro dispositivo. Android può scansionarlo dal client; su iPhone o senza app si apre il browser. Il QR contiene soltanto l'indirizzo della centrale: l'accesso rimane necessario.

Gli inviti **Collega account** e **Importa layout** sono separati dal QR di collegamento: il primo collega la stessa casa/account, il secondo copia il layout. Durano cinque minuti e sono monouso.

## Profili, attività e account

Lo stesso account può aprire un profilo su PC e telefono: l'ordine dei widget è comune, mentre la griglia si adatta allo schermo. La selezione del profilo resta locale. Alla prima migrazione scegli una fonte fra le configurazioni conservate; i vecchi client non possono sovrascrivere i profili migrati.

Le modifiche allo stesso widget sono riservate temporaneamente; Salva attende la centrale, Annulla abbandona la bozza. Le bozze offline rimangono sul dispositivo fino alla riconciliazione o allo scarto esplicito, entro10MiB; i comandi fisici non vengono accodati offline.

Tavano mostra le attività di tutti i membri, senza concedere modifica dei profili altrui. La copia testo e l'esportazione JSON rimuovono segreti e sostituiscono i nomi per la condivisione volontaria; nessun invio automatico. Conservazione fino a sette giorni entro50MiB logici, di cui10MiB diagnosi: lo spazio fisico del database può essere maggiore. Un comando accettato da HA non è una conferma fisica del dispositivo.

In Sistema premi l'icona account per scegliere colore o foto con ritaglio e rotazione. La foto sostituisce il cerchio colorato; lo sfondo account appare soltanto nella vista account.

La versione0.9.34 è verificata con test software, browser PC/telefono e HA simulato. Installazione HAOS su mini PC fisico, scanner Android e Safari/iPhone fisici restano da collaudare.

## Dettagli

- **Porta:** 3002 sulla rete locale. Non serve aprirla verso Internet.
- **Dati:** layout, profili e Casa 3D sono nella cartella dell'app ed entrano nei backup di Home Assistant (backup a freddo).
- **Home Assistant:** l'app lo raggiunge sulla rete interna di HA OS e legge da sola la porta.
- **Aggiornamenti:** quando esce una versione nuova, Home Assistant la mostra tra gli aggiornamenti.
- **Rete:** il collegamento IP/QR è locale; non abilita l'accesso remoto da Internet.

## Licenza

GPL-3.0. I sorgenti di ogni versione sono allegati alla release corrispondente in <https://github.com/acamemo/acasystem-releases/releases>.
