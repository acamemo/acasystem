# Contratti API comuni

`devices.ts` è la fonte dei tipi di trasporto della facciata `/api/dispositivi` per backend
e frontend. Contiene soltanto tipi/interfacce: nessun import di server, React, HA, storage o
componenti. Le sedi precedenti riesportano i tipi per mantenere gli import compatibili.

I tipi interni di sessione, lookup HA e controller restano nei rispettivi moduli. In particolare
`FlowCreatedStepDto` descrive il risultato normalizzato di HA; `FlowCreatedDto` aggiunge i campi
`entry` e `pending` che l'API ACA manda al browser. `TvInReteDto` permette al server di conservare
il proprio insieme ristretto di chiavi marca, senza duplicare la struttura del trasporto.

Modificare un contratto qui e verificare entrambi i consumatori con typecheck e test della
facciata. Una modifica TypeScript non valida i dati runtime e non autorizza da sola a cambiare
l'API. I controlli di input/output restano nelle funzioni esistenti. Non importare modelli di
presentazione o implementazioni server in questa cartella.
