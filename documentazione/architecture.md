# Architettura proposta e decisioni

Aggiornato: 2026-10-05. Fonte dell'intento: [product.md](product.md). Stato reale e questioni aperte: [project-status.md](project-status.md).

## Stato e confini

Sono realizzati soltanto documentazione e Git locale. [ADR-0003](decisions/ADR-0003-home-assistant-locale-fase1.md) approva Home Assistant come base, Tunet come riferimento React e fase 1 grafica in ufficio. Linux a 64 bit ammette ARM64/x86-64; Hetzner è escluso. Il [perimetro del pilota](pilot-scope.md) delimita il primo risultato e le estensioni.

La direzione è locale, con massimo uso possibile senza internet e obiettivo remoto online. Metodo HA, hosting concreto, versioni, sessioni e trasporto restano aperti. Le dipendenze fisiche sono segnalate senza definirne la conformità di installazione.

## Componenti e responsabilità previste

| Componente | Responsabilità | Decisione / questione aperta |
|---|---|---|
| Client e frontend locale | Personalizzazione grafica, stati e comandi del perimetro concordato | Riferimento React Tunet confermato; schermate, asset, revisione, condizioni di riuso e servizi richiesti da analizzare. |
| Host locale e Home Assistant | Collegamento ai dispositivi ed esecuzione locale | Base HA e Linux 64 bit approvati; macchina, metodo HA e protocolli da scegliere. |
| Account e sessioni | Login, primo setup e consegna al cliente | Integrazione con HA da progettare; nessun Identity Provider centrale obbligatorio. |
| Configurazioni e dati | Conservazione locale delle informazioni necessarie al funzionamento | Persistenza del frontend e backup da progettare rispetto alla base Tunet; PostgreSQL/TimescaleDB non sono prerequisiti scelti. |
| Accesso remoto | Gestione online da fuori casa | Meccanismo da scegliere; nessun broker Hetzner o fornitore sostitutivo selezionato. |
| Estensioni | Piantina, moduli, catalogo e AI | Fuori dal minimo grafico; sedi di esecuzione, versioni e limiti da definire nei relativi incarichi. |
| Più utenze e condominio | Dispositivi comuni e ambiti privati | Requisito di isolamento approvato; una o più istanze su hardware condiviso sono alternative da valutare. |

## Flussi richiesti e proposti

1. **Uso locale:** client → frontend/endpoint locale autorizzato → HA → dispositivo; stati ritornano al client. Asset, sessioni e riavvio offline vanno progettati e provati.
2. **Primo setup richiesto:** sessione admin aperta solo inizialmente → configurazione/associazione dispositivi → logout admin → login cliente. Attivazione e chiusura della sessione sono ancora da progettare.
3. **Automazione locale:** evento → logica HA → azione sul dispositivo locale. Identificare integrazioni dipendenti dal cloud; distinguere guasto WAN da guasto LAN/alimentazione.
4. **Remoto futuro:** client esterno → accesso autenticato da definire → impianto autorizzato → dispositivo. Il percorso e i confini TLS non sono selezionati.
5. **Condominio futuro:** amministratore condominiale → configurazione autorizzata sul dispositivo comune; configurazione dei dispositivi privati rifiutata. Letture/comandi seguono una policy ancora da precisare.
6. **Estensioni future:** configurazioni/scenari approvati → distribuzione/versione → attivazione e conferma. AI genera bozze da validare; nessun motore, database o protocollo ACA è scelto.

Sono flussi funzionali, non API implementate. La fase 1 non richiede la realizzazione implicita di tutte le estensioni.

## Interfacce da progettare

| Confine | Informazioni da definire | Verifica prevista |
|---|---|---|
| Frontend ↔ HA | Asset, API, autenticazione, sessioni, stati/comandi e riconnessione | V-02/V-03/V-05 |
| Admin ↔ cliente | Primo setup, logout, assegnazione/revoca e account cliente | V-06 |
| Ambiti comuni ↔ privati | Identità, entità, dati, configurazioni e isolamento anche su API | V-17; valutazione ISSUE-015 |
| Remoto ↔ locale | Percorso, accessi, TLS e assenza di dipendenza operativa WAN per il locale | V-02 e progetto remoto |
| Catalogo/AI ↔ automazioni | Dati ammessi, versioni, validazione, consegna e ripristino | V-08/V-11/V-12/V-13/V-14 |
| Configurazioni ↔ client | Personalizzazione e comportamento offline | V-09/V-10/V-15 quando assegnati |

HA distingue controlli sulle entità e controlli amministrativi nella [documentazione dei permessi](https://developers.home-assistant.io/docs/auth_permissions/), consultata il 2026-10-05. L'esistenza delle API non prova il ruolo condominiale ACA: configurazione limitata ai soli beni comuni richiede un progetto e prove dei percorsi effettivi. [Autenticazione HA](https://developers.home-assistant.io/docs/auth_api/) e [metodi d'installazione](https://www.home-assistant.io/installation/) restano riferimenti; nessun metodo è scelto. Fonti ed evidenze nel [report](reports/REP-20261005-001-direzione-pilota.md).

## Come aggiornare il progetto

Una scelta significativa viene proposta con un ADR e accettata sulla base di una richiesta umana identificabile. Dopo l'approvazione aggiornare i componenti/contratti interessati, i requisiti e le verifiche. Dopo l'implementazione collegare manifest, configurazioni e risultati reali. Lo stato corrente resta nel registro dedicato; le proposte alternative non diventano sostituzioni implicite.
