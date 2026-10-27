# REP-20261027-001 — Assistenza a distanza e verifica dei dispositivi: ricerca

| Campo | Valore |
|---|---|
| ID / incarico | REP-20261027-001, ricerca su assistenza a distanza e abbinamento dei dispositivi |
| Stato | Completato (ricerca); nessuna decisione presa |
| Data | 2026-10-27, Europe/Rome |
| Autore / modello | Claude Code, `claude-opus-5-5`; raccolta delle fonti con un subagente dello stesso modello |
| Commit di partenza | `603b023` (locale) |
| Richiesta di riferimento | «trovata la soluzione al problema della tv Samsung passa poi a punto "assistenza a distanza", cercando su internet potenziali competitor e lo stesso HA come si comportano riguardo al collegare dispositivi e verifica se il dispositivo è in casa ecc» |
| Autorizzazione | Solo ricerca. L'assistenza a distanza è esclusa dall'approvazione di F4 («L'assistenza a distanza la decidiamo dopo», [REP-20261026-006](REP-20261026-006-rileva-dispositivi.md)). |

**Legenda:** [F] fatto con fonte (consultata il 2026-10-27); [V] valutazione; [NV] non verificato.

**Perché serve.** L'obiettivo dell'utente è evitare le uscite dal cliente per configurazioni che il cliente potrebbe fare da solo con un aiuto.

## A. Assistenza a distanza

### A.1 Home Assistant

- **[F] Home Assistant Cloud (Nabu Casa)**
  - Costo: 7,50 €/mese oppure 75 €/anno, IVA esclusa (https://www.nabucasa.com/pricing/).
  - Accesso remoto cifrato da un capo all'altro con un proxy SNI: la richiesta si decifra solo nella casa (https://support.nabucasa.com/hc/en-us/articles/26469707849629).
  - L'indirizzo remoto è pubblico ed espone tutta l'API a chi ha credenziali valide. Critica di una terza parte: https://learn.homeway.io/blog/tags/vpn.
- **[F] Indicazioni di HA**
  - HA sconsiglia di esporre l'istanza direttamente su Internet; le strade proposte sono Cloud, DuckDNS con Let's Encrypt, VPN o SSH.
  - Admin solo a chi serve, MFA consigliata (https://www.home-assistant.io/docs/configuration/securing/, https://www.home-assistant.io/docs/authentication/).
- **[F] Permessi:** di fatto due livelli, amministratore e non amministratore (https://github.com/orgs/home-assistant/discussions/1171).
- **[F] Installatori:** «Works with Home Assistant» certifica i dispositivi, non gli installatori (https://works-with.home-assistant.io/). Non risulta un programma ufficiale per installatori.
- **[F] Tailscale:** l'app di HA OS fa da subnet router e con «Serve» rende HA raggiungibile nella rete privata (https://github.com/hassio-addons/addon-tailscale/blob/main/tailscale/DOCS.md).
- **[NV] Assistenza nativa:** in HA non risulta una «sessione di assistenza» con consenso del cliente.

### A.2 Concorrenti

| Sistema | Portale installatore | Consenso del cliente | Cosa permette | Costo | Fonte |
|---|---|---|---|---|---|
| Control4 / Snap One | OvrC (installatore) e OvrC Home (cliente) | Il cliente abilita «Remote Service» | Programmazione, aggiornamenti, diagnostica | OvrC gratuito, Pro con licenza | https://www.control4.com/help/c4/software/cpro/dealer-composer-help/content/composerpro_gettingstarted/setting_up_remote_access.htm |
| Crestron XiO Cloud | Sì | [NV] | Monitoraggio, configurazione | Gratuito e Premium a dispositivo | https://www.crestron.com/News/Blog/January-2025/XiO-Cloud-Platform-Now-Offers-Free-and-Premium |
| Savant | Sì | Approvazione dall'app, da 1 ora a tutto il progetto | Diagnostica, configurazione | [NV] | https://www.ravepubs.com/new-savant-central-management-savant-studio-app-debut |
| Loxone | Utente «Loxone Partner» | Il cliente lo abilita, anche a tempo | Configurazione completa | Remote Connect gratuito | https://www.loxone.com/dede/blog/einfache-fernwartung-ihrer-projekte/ |
| Fibaro | Installer App (installatori certificati) | Accesso di 24 ore, revocabile | Monitoraggio, backup | [NV] | https://www.telecompaper.com/news/fibaro-lanceert-app-voor-smart-home--1258440 |
| Vimar View Pro | Credenziali installatore MyVIMAR | [NV] | Diagnostica e riprogrammazione via cloud | [NV] | https://apps.apple.com/app/id1326139654 |
| SmartThings, Hubitat | Nessun portale: invito come membro o accesso con l'account del proprietario | Invito | Pieni poteri | — | https://docs2.hubitat.com/en/services/remote-admin |

**[V] Schema ricorrente:**
- portale dell'installatore;
- accesso concesso dal cliente, a tempo e revocabile;
- registro con data e ora;
- accesso alla configurazione, non allo schermo.

### A.3 Condivisione dello schermo

- **[F] Android chiede il consenso a ogni sessione** di cattura dello schermo; da Android 14 il consenso non si riusa (https://developer.android.com/media/grow/media-projection).
- **[F] Costi:**
  - TeamViewer: in abbonamento, il supporto ai dispositivi mobili è un componente extra (https://www.costbench.com/software/remote-desktop/teamviewer/);
  - RustDesk Server Pro: installabile su un server proprio, da 9,90 $/mese (https://rustdesk.com/pricing).

### A.4 GDPR

- **[F] Esenzione domestica:** non vale per chi fornisce i mezzi del trattamento (considerando 18, https://gdpr-info.eu/recitals/no-18/).
- **[F] Ruoli:** titolare e responsabile secondo le Linee guida EDPB 07/2020 v2.1. Nella prassi italiana chi fa assistenza remota viene nominato responsabile ex art. 28.
- **[V] Cosa servirebbe a MeMo:**
  - informativa;
  - una base giuridica: contratto oppure consenso per ogni sessione;
  - accesso a tempo e nominativo, con MFA;
  - registro degli accessi;
  - telecamere escluse salvo richiesta;
  - valutazione dei fornitori esterni e dei trasferimenti fuori UE.
  - **Serve un parere legale.**

## B. Abbinamento: «il dispositivo è davvero in casa?»

| Integrazione o sistema | Prova di possesso | Fonte |
|---|---|---|
| HomeKit Controller | Codice stampato sul dispositivo | https://www.home-assistant.io/integrations/homekit_controller/ |
| Philips Hue | Pulsante del bridge | https://github.com/home-assistant/core/blob/dev/homeassistant/components/hue/strings.json |
| Android TV Remote | Codice sullo schermo | https://github.com/home-assistant/core/blob/dev/homeassistant/components/androidtv_remote/strings.json |
| LG webOS | Accettazione sulla TV | https://github.com/home-assistant/core/blob/dev/homeassistant/components/webostv/strings.json |
| Samsung TV | «Consenti» sulla TV; PIN per i modelli H/J | https://www.home-assistant.io/integrations/samsungtv/ |
| ESPHome | Chiave solo se la cifratura è attiva | https://www.home-assistant.io/integrations/esphome/ |
| Matter | Codice o QR (PASE) e certificato del dispositivo | https://docs.silabs.com/matter/2.7.0/matter-overview-guides/matter-commissioning |
| Cast, WiZ, Yeelight, Shelly senza password | Nessuna [NV, da verificare una per una] | — |
| Control4, Savant, Loxone | Configurazione solo dell'installatore | fonti in A.2 |

**[V] Rischio «dispositivo del vicino».** Esiste solo quando il vicino è sulla stessa rete (condominio con rete condivisa, B&B). In una rete domestica separata, un dispositivo visibile è quasi sempre in casa.

**[F] Samsung in HA** (codice `dev`, `homeassistant/components/samsungtv`):
- la scoperta avviene via SSDP (`RemoteControlReceiver`, con produttore Samsung letto dalla scheda descrittiva), DHCP (`tizen*`) e zeroconf (`_airplay`);
- il flusso si interrompe per `not_supported`, `cannot_connect`, `already_configured` o `already_in_progress`.

La prova di casa (REP-20261026-006) ha confermato il caso: la TV UE50J6200 si annuncia, ma non serve la scheda sulla porta 7676.

## C. Implicazioni per Acasystem [tutta valutazione, nessuna decisione]

**Opzioni per l'assistenza a distanza:**
1. **Sessione di assistenza dentro Acasystem (consigliata).**
   - Come funziona: «Richiedi assistenza» genera un codice; l'accesso è a tempo (per esempio 2 ore) e revocabile, con un banner «Assistenza attiva» e un registro.
   - Pro: è lo schema di Savant, Loxone e Fibaro, e non costa licenze.
   - Contro: va sviluppata e serve un canale di trasporto.
2. **Canale VPN con Tailscale, oppure Headscale su un server proprio.**
   - Pro: nessuna porta aperta sul router; le regole di accesso permettono di raggiungere solo quella casa.
   - Contro: un nodo per ogni casa; il servizio cloud di Tailscale è un sub-fornitore.
3. **Nabu Casa per ogni cliente (75 €/anno).**
   - Pro: già pronto, utile al cliente fuori casa.
   - Contro: niente sessioni a tempo né consenso per sessione.
4. **RustDesk su un server proprio** per vedere lo schermo del tablet.
   - Pro: su Android il consenso a ogni sessione lo impone già il sistema.
   - Contro: per il controllo, non solo la vista, serve il servizio di Accessibilità.
5. **TeamViewer o AnyDesk.**
   - Pro: subito disponibili.
   - Contro: licenze annuali e dati presso terzi.
6. **Vista nativa dello schermo di Acasystem** sul canale dell'opzione 1.
   - Pro: nessun software esterno.
   - Contro: costo di sviluppo maggiore.

**Raccomandazione [V]:** opzione 1 con il canale dell'opzione 2; l'opzione 4 solo se serve vedere lo schermo.

**Abbinamento senza limitare il cliente** (coerente con la decisione dell'utente, ADR-0024):
- accompagnare il cliente nella prova fisica quando c'è (accetta sulla TV, premi il pulsante, inserisci il codice);
- per i dispositivi senza prova, «Identifica» (lampeggio, suono) prima di confermare, e «Non è mio», che usa `ignore_flow`;
- avvisi che informano senza bloccare;
- spiegare le interruzioni (`already_configured`, `not_supported`) invece di nascondere il dispositivo;
- segnalare nella diagnostica quando la rete non fa passare gli annunci (VM, VLAN, isolamento dell'access point);
- aggiungere per indirizzo i dispositivi che non si fanno scoprire, come la Samsung J del 2015 (F4).

## Chiusura e punto di ripresa

Nessuna decisione presa. **Prossimo passo:** l'utente sceglie se e come procedere con l'assistenza a distanza (opzioni 1-6). Per l'abbinamento, le proposte confluiscono in F4 di REP-20261026-006.
