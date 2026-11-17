# Serrature per dispositivo

Modo: **Operate**. Richiesta umana2026-11-11 «FAI serrature, poi allarme e videocamere», [REP001](../../reports/REP-20261111-001-serrature-allarme-videocamere.md). Prima fase sul design [ACA Vetro Bianco](../design.md), con primitive e transizioni esistenti.

## Home e dettagli

Una tessera per esatto dispositivo HA. Stato reale del singolo accesso e comando essenziale, con conferma dello sblocco; il multicanale riassume accessi bloccati/indisponibili senza un comando collettivo. Nuovo prodotto minimo2×2, configurazioni storiche conservate.

Console centrata con accessi indipendenti. Blocca e Sblocca dipendono da disponibilità e servizi; Apri anche dalla capacità OPEN. «Sbloccata» e «Aperta» sono stati diversi: l'accettazione del comando o lo sblocco non attestano che la porta si sia aperta. Stati di movimento, inceppamento, sconosciuto e indisponibilità restano espliciti.

Sblocco e apertura richiedono conferma prima dell'invio. Se HA richiede un codice, campo password transitorio che rispetta anche passphrase testuali e spazi, senza imporre la tastiera numerica o troncare a12caratteri. Nessun codice nel profilo, nella bozza, nei log o nel registro; chiusura/annullamento/riassociazione puliscono la conferma. Errori generici senza riportare il codice. Nessun comando automatico, retry ambiguo o accodamento offline.

Misure d'uso e Tecnica e manutenzione sono separate secondo il registro. Nomi e azioni accessibili univoci per canale, testi a capo e controlli nei bordi320/390/desktop. Nessun blur annidato, nuovo sfondo o animazione per riga. Dati simulati, prove software e dispositivi fisici sono evidenze distinte.

## Associazione

Trova o selezione manuale condividono il risolutore per device_id, con lockId, nome e metadati atomici. Anteprima inerte e creazione dopo Conferma/ACK; raggiungimento dei widget già presenti, scelta dei duplicati storici, pile e pagine nascoste conservate. Entità nascoste/disabilitate non attivate, nessuna unione per hub, marca o stanza.
