# Blocco 1 Compatibilità di Python e dipendenze sul Tab M11

Data: 2026-10-29. Fonte umana: [U7](../diario/2026-10-29.md#u7-scelta-sul-frontend-e-studio-python-sul-m11). Scelta del frontend: [ADR-0026](../../decisions/ADR-0026-frontend-ha-presente-nascosto.md). [Piano di fattibilità](01-fattibilita-tablet-android.md). Comandi e limiti: [REP-20261029-009](../../reports/REP-20261029-009-compatibilita-python-m11.md).

## Risultato documentale

Python adatto al requisito di versione HA esiste per Android ARM64. Il gruppo di dipendenze richiesto da Core non è però disponibile come insieme di pacchetti Android già pronto nei repository esaminati. La situazione varia fra librerie: esistono riscontri positivi, percorsi Python senza acceleratori e ostacoli di porting concreti.

Non è una prova di funzionamento sul Tab M11. Il tablet non è risultato disponibile via ADB; ABI dell'ambiente Android, spazio e memoria attuali restano da leggere. Nessun runtime o pacchetto è stato installato, compilato o scaricato come binario; nessun codice ACA è stato modificato.

La decisione umana è di mantenere il frontend HA presente e non mostrarlo nel flusso ACA. Le sue dipendenze non vengono escluse dalla valutazione; nessun intervento per nasconderlo è stato implementato qui.

## Tablet e qualità dell'evidenza

| Aspetto | Dato disponibile | Limite |
|---|---|---|
| Dispositivo usato nelle prove precedenti | Tab M11 **TB330FU**, Android **15**, **4 GB**, rilevati il 2026-10-14. | Dati storici, non inventario attuale. Non è il tablet demo TB336ZU da 8 GB. |
| Memoria storica | Il 2026-10-20: MemTotal circa 3,9 GB e MemAvailable a riposo circa 1,47 GB. | Non misura Core insieme ad ACA. I precedenti 150 MB liberi non equivalgono a memoria disponibile. |
| Famiglia hardware | Lenovo indica Helio G88; MediaTek descrive CPU a 64 bit. Lenovo commercializza varianti con RAM e storage diversi. | La capacità della CPU non dimostra che Android esponga l'ABI applicativa `arm64-v8a`. |
| Stato attuale | `adb devices -l` tramite ADB già presente: zero dispositivi autorizzati individuati. | Nessuna proprietà del tablet letta e nessuna impostazione cambiata. ABI, API, memoria e spazio attuali non confermati. |

Fonti locali: [report del 2026-10-14](../../reports/REP-20261012-003-lag-tablet-prestazioni.md), righe 279-283; [misure del 2026-10-20](../../reports/REP-20261020-002-casa-3d-piano.md), righe 462-475 e 517. Fonti primarie esterne, consultate il 2026-10-29: [Lenovo PSREF](https://psref.lenovo.com/syspool/Sys/PDF/Lenovo_Tablets/Tab_M11/Tab_M11_Spec.html), scheda con ultima modifica dichiarata 2023-12-22, e [MediaTek Helio G88](https://www.mediatek.com/products/smartphones/mediatek-helio-g88).

Per il successivo inventario in sola lettura servono modello, versione Android/API, `ro.product.cpu.abilist`, `abilist64`, memoria disponibile, spazio su `/data` e dimensione delle pagine. Non è necessario installare un'app per leggere questi dati con ADB già autorizzato, quando il dispositivo sarà disponibile.

## Ipotesi tecnica usata nella matrice

La base studiata è **Core 2026.10.4**, con requisito **Python almeno 3.14.2**, e CPython 3.14 ordinario su Android ARM64. Non si assumono equivalenti Python 3.13, Python senza GIL `cp314t`, Linux ARM64 e Android ARM64.

Un nome file `cp314-cp314-android_24_arm64_v8a` documenta un artefatto per quella combinazione, non un'importazione riuscita. `py3-none-any` è favorevole alla distribuzione, ma il codice può ancora dipendere da API del sistema o da altre librerie native. La sola presenza di sorgenti o wheel Linux non dimostra compatibilità Android; la loro assenza non dimostra impossibilità.

Fonti: [pyproject Core 2026.10.4](https://github.com/home-assistant/core/blob/2026.10.4/pyproject.toml), [PEP 738](https://peps.python.org/pep-0738/) e [tag dei pacchetti Android](https://packaging.python.org/en/latest/specifications/platform-compatibility-tags/#android), consultati il 2026-10-29. Non è stato eseguito un resolver né prodotto un lock di installazione.

## Interprete e strumenti di incorporamento

| Elemento | Evidenza | Esito limitato |
|---|---|---|
| CPython ufficiale | [Python 3.14.10](https://www.python.org/downloads/release/python-31410/), rilasciato il 2026-10-25, offre un pacchetto Android aarch64. | Versione numericamente sufficiente; pacchetto non scaricato o eseguito. |
| Incorporamento nativo | La [documentazione Python 3.14](https://docs.python.org/3.14/using/android.html) descrive interprete, libreria standard e pacchetti privati nell'app, con collegamento JNI. | Percorso documentato per Python, non certificazione di HA. |
| Chaquopy | [17.2.0](https://chaquo.com/chaquopy/doc/current/changelog.html), del 2026-10-26; il runtime 3.14 è aggiornato a 3.14.8 nel changelog 17.1. | Altro candidato documentato, non toolchain scelta o aggiunta al progetto. |
| Limiti del candidato Chaquopy | [Matrice versioni](https://chaquo.com/chaquopy/doc/current/versions.html): API minima 24 e AGP 7.3-9.4; [documentazione Android](https://chaquo.com/chaquopy/doc/current/android.html): Python 3.12+ su ABI a 64 bit. | L'AGP ACA attuale 8.13.0 rientra nel range dichiarato e il client ha min SDK 26; l'ABI effettiva del tablet resta da confermare. |

L'AGP è letto da [build.gradle](../../../progetto/client/android/android/build.gradle), riga 10; SDK da [variables.gradle](../../../progetto/client/android/android/variables.gradle), righe 2-4. Il supporto del tool per Python 3.14 non significa supporto di tutte le dipendenze Core. Anche limitazioni della libreria standard, per esempio `multiprocessing`, restano da confrontare con il motore e le integrazioni scelte.

## Censimento dei requisiti diretti

Sono stati enumerati **48 requisiti base diretti**: **44 pin esatti e 4 intervalli**. I 44 metadati PyPI delle versioni fissate sono stati letti senza errori. Categorie esclusive nell'ordine A, P, D:

- **A:** wheel Android ARM64 per CPython 3.14 ordinario individuata: 1 pin.
- **P:** wheel universale `py3-none-any` individuata, senza precedente A: 30 pin.
- **D:** nessuno dei due artefatti precedenti individuato: 13 pin da approfondire.
- **R:** versione definita da intervallo, non risolta né scelta: 4 requisiti.

Anche `aiohttp` ha una wheel universale: il totale dei pin con `py3-none-any` è 31, mentre P come categoria esclusiva conta 30. Questi sono conteggi di artefatti, non percentuali di compatibilità o prove di avvio.

| Requisito | Categoria |
|---|---|
| `aiodns==4.0.4` | P |
| `aiogithubapi==26.0.0` | P |
| `aiohttp==3.14.5` | A, anche wheel universale |
| `aiohttp_cors==0.8.1` | P |
| `aiohttp-fast-zlib==0.3.0` | P |
| `aiohttp-asyncmdnsresolver==0.2.0` | P |
| `aiozoneinfo==0.2.3` | P |
| `annotatedyaml==1.0.2` | D |
| `astral==2.2` | P |
| `async-interrupt==1.2.2` | P |
| `attrs==26.1.0` | P |
| `atomicwrites-homeassistant==1.4.1` | P |
| `audioop-lts==0.2.2` | D |
| `awesomeversion==25.8.0` | P |
| `bcrypt==5.0.0` | D |
| `certifi>=2021.5.30` | R |
| `ciso8601==2.3.3` | D |
| `cronsim==2.7` | P |
| `fnv-hash-fast==2.0.3` | D |
| `hass-nabucasa==2.7.0` | P |
| `httpx==0.28.1` | P |
| `home-assistant-bluetooth==2.0.0` | P |
| `ifaddr==0.2.0` | P |
| `Jinja2==3.1.6` | P |
| `lru-dict==1.4.1` | D |
| `PyJWT==2.15.1` | P |
| `cryptography==50.0.1` | D |
| `Pillow==12.3.0` | D |
| `propcache==0.5.4` | P |
| `pyopenssl==26.4.0` | P |
| `orjson==3.11.9` | D |
| `packaging>=23.1` | R |
| `psutil-home-assistant==0.0.1` | P |
| `python-slugify==9.1.2` | P |
| `PyYAML==6.0.3` | D |
| `requests==2.34.2` | P |
| `securetar==2026.4.1` | P |
| `SQLAlchemy==2.0.54` | P |
| `standard-aifc==3.13.0` | P |
| `standard-telnetlib==3.13.0` | P |
| `typing-extensions>=4.16.0,<5.0` | R |
| `ulid-transform==2.2.9` | D |
| `urllib3>=2.0` | R |
| `uv==0.13.5` | D |
| `probatio==0.13.0` | P |
| `yarl==1.25.1` | P |
| `webrtc-models==0.3.0` | P |
| `zeroconf==0.151.5` | D |

L'elenco viene dal pyproject del tag; i filename e i requisiti pubblicati dai JSON ufficiali PyPI `https://pypi.org/pypi/<nome>/<versione>/json`. Non sono stati seguiti link ai pacchetti binari. I casi discriminanti hanno i collegamenti diretti sotto. D non implica necessariamente compilazione obbligatoria: una distribuzione sorgente può prevedere anche un percorso Python puro.

## Approfondimento delle librerie principali

| Pin | Evidenza pubblicata | Conseguenza per il percorso APK nativo |
|---|---|---|
| `orjson 3.11.9` | [Metadati](https://pypi.org/pypi/orjson/3.11.9/json): nessuna wheel Android. Il [README versionato](https://github.com/ijl/orjson/blob/3.11.9/README.md) esclude embedded Python Android/iOS. | Ostacolo di supporto e porting concreto; non pronto come dipendenza Android standard. |
| `cryptography 50.0.1` | [Metadati](https://pypi.org/pypi/cryptography/50.0.1/json): nessuna wheel Android. I [target testati](https://cryptography.io/en/50.0.1/installation/) non includono Android; build sorgente con C, Rust, OpenSSL e libffi. | Compilazione e collegamento Android da verificare, compresa `cffi`. |
| `bcrypt 5.0.0` | [Metadati](https://pypi.org/pypi/bcrypt/5.0.0/json): nessuna wheel Android; implementazione Rust. | Artefatto e porting Android da verificare; non dichiarato impossibile. |
| `Pillow 12.3.0` | [Metadati](https://pypi.org/pypi/Pillow/12.3.0/json): nessuna wheel Android; [piattaforme documentate](https://github.com/python-pillow/Pillow/blob/12.3.0/docs/installation/platform-support.rst). | Moduli nativi e librerie immagini da valutare. |
| `lru-dict 1.4.1` | [Metadati](https://pypi.org/pypi/lru-dict/1.4.1/json): wheel Android ARM64 presente, ma `cp313-cp313`, non `cp314`. | È un disallineamento di versione Python. Abbassare Python a 3.13 violerebbe il requisito Core studiato. |
| `aiohttp 3.14.5` | [Metadati](https://pypi.org/pypi/aiohttp/3.14.5/json): `aiohttp-3.14.5-cp314-cp314-android_24_arm64_v8a.whl`, oltre alla wheel universale. | Riscontro positivo sull'artefatto diretto, non sulla sua importazione o su tutte le transitive. |
| `PyYAML 6.0.3` | [Metadati](https://pypi.org/pypi/PyYAML/6.0.3/json): nessuna wheel Android; il [sorgente](https://github.com/yaml/pyyaml/blob/6.0.3/lib/yaml/__init__.py) rende facoltativa `cyaml`. | Esiste un percorso da studiare senza acceleratore C; il confezionamento resta da verificare. |
| `ciso8601 2.3.3` | [Metadati](https://pypi.org/pypi/ciso8601/2.3.3/json): nessuna wheel Android, modulo C. | Compilazione Android da verificare. |

Anche `uv`, `audioop-lts`, `fnv-hash-fast`, `ulid-transform`, `zeroconf` e `annotatedyaml` restano in D. Per `uv` i [metadati esatti](https://pypi.org/pypi/uv/0.13.5/json) non offrono una wheel Android; non va considerato puro soltanto perché il tag Python è generico. Nessuna scorciatoia di cambio versione è stata applicata.

## Verifica del repository Chaquopy

È stato controllato anche il [repository aggiuntivo ufficiale](https://chaquo.com/pypi-13.1/), documentato per Chaquopy 13.1 e successivi, leggendo gli indici e senza scaricare wheel. Per i pin critici richiesti:

- `orjson 3.11.9` e `ciso8601 2.3.3` non risultano negli indici; le directory richieste restituiscono 404.
- Gli indici di [cryptography](https://chaquo.com/pypi-13.1/cryptography/), [bcrypt](https://chaquo.com/pypi-13.1/bcrypt/), [Pillow](https://chaquo.com/pypi-13.1/pillow/) e [lru-dict](https://chaquo.com/pypi-13.1/lru-dict/) non contengono i rispettivi pin HA esaminati.
- [PyYAML 6.0.3](https://chaquo.com/pypi-13.1/pyyaml/) è presente, ma gli artefatti ARM64 esaminati arrivano a `cp313`, non `cp314` o `abi3`.

Questa ricognizione non autorizza a usare vecchie versioni offerte dal repository al posto dei pin HA. Il supporto dell'interprete nel tool non chiude il problema dei pacchetti.

## Fallback YAML e dipendenze transitive

La sola assenza di una wheel non rende tutti i casi equivalenti. In `annotatedyaml` **v1.0.2**, commit `1b70ae7b069b10da27ad46f1ba20c870d8f0d772`, [loader](https://github.com/home-assistant-libs/annotatedyaml/blob/v1.0.2/src/annotatedyaml/loader.py) e [dumper](https://github.com/home-assistant-libs/annotatedyaml/blob/v1.0.2/src/annotatedyaml/dumper.py) ripiegano esplicitamente dai loader C ai corrispondenti Python. Il [build](https://github.com/home-assistant-libs/annotatedyaml/blob/v1.0.2/build_ext.py) rende opzionale Cython. I percorsi YAML centrali esaminati di Core delegano a questa libreria: `CSafeLoader` non è obbligatorio in quei percorsi. Non è un collaudo generale di tutte le integrazioni o del confezionamento Android.

Le transitive restano un lavoro distinto dalla classificazione dei 48 requisiti:

| Vincolo osservato | Stato documentale |
|---|---|
| `cryptography 50.0.1` richiede `cffi>=2.0.0` su CPython. | Versione non risolta. Il candidato pubblico 2.1.1 esaminato non ha wheel Android; non è una versione adottata. |
| `aiohttp` richiede `frozenlist`, `multidict`, `propcache` e `yarl`. | Core fissa direttamente `propcache 0.5.4` e `yarl 1.25.1`, entrambi con wheel universale. `frozenlist` e `multidict` restano da risolvere. |
| `psutil-home-assistant 0.0.1` ha wheel universale. | Il suo [Requires-Dist](https://pypi.org/pypi/psutil-home-assistant/0.0.1/json) richiede `psutil` senza pin: l'involucro puro non prova la compatibilità del modulo sottostante. |
| `aiohttp-fast-zlib 0.3.0` ha wheel universale. | [Metadati](https://pypi.org/pypi/aiohttp-fast-zlib/0.3.0/json): acceleratori `isal` e `zlib_ng` sono extra opzionali, non automaticamente dipendenze base attive. |

Sono stati letti anche i metadati di [cffi 2.1.1](https://pypi.org/pypi/cffi/2.1.1/json), [frozenlist 1.8.0](https://pypi.org/pypi/frozenlist/1.8.0/json) e [multidict 7.2.1](https://pypi.org/pypi/multidict/7.2.1/json), come candidati pubblici alla data della ricerca, non come lock. Gli ultimi due hanno wheel universali; la wheel Android `cp314` di multidict osservata è x86_64, non ARM64. Non è stato verificato l'intero grafo transitivo o quello delle integrazioni aggiuntive.

## Frontend conservato

Il [manifest del componente](https://github.com/home-assistant/core/blob/2026.10.4/homeassistant/components/frontend/manifest.json) richiede `home-assistant-frontend==20260930.5`, fuori dai 48 requisiti diretti del pyproject. I [metadati PyPI](https://pypi.org/pypi/home-assistant-frontend/20260930.5/json) pubblicano una wheel `py3-none-any`, Python almeno 3.14.0 e nessun Requires-Dist.

È un riscontro favorevole sul confezionamento rispetto all'ABI. L'archivio wheel dichiarato misura 110.686.791 byte; non è stato scaricato e tale misura non è RAM occupata né spazio installato. Conservare il frontend non appare il problema binario principale in questa ricognizione.

## Conclusione e punto di ripresa

**Approfondimento successivo del 2026-10-29:** lo [studio orjson/cryptography](01-orjson-cryptography-android.md) esamina i tag esatti e la produzione di wheel proprie. Ha individuato meccanismi cross e una strada di build documentata, senza eseguirla. L'assenza di artefatti pronti riportata qui non è stata trasformata in un'impossibilità tecnica né in una prova di porting riuscito.

- **Favorevole sul piano documentale:** esistenza di Python 3.14 Android ARM64, riscontro diretto `aiohttp`, molti pacchetti universali e frontend HA conservabile come pacchetto universale.
- **Non pronto come insieme standard:** versioni native non disponibili per questa combinazione nei repository esaminati, disallineamento `lru-dict`, esclusione di supporto `orjson` e ulteriori transitive da verificare.
- **Non accertato sul dispositivo:** ABI reale, stato aggiornato di Android, memoria/spazio attuali e importazione dei pacchetti. Nessun giudizio di prestazioni o affidabilità.

Il lavoro corrente prosegue dallo [studio dei due pin](01-orjson-cryptography-android.md), con ABI del tablet e transitive ancora da verificare. Non cambiare silenziosamente i pin né considerare un pacchetto Linux un binario Android. Nessuna toolchain, compilazione, sostituzione o installazione è assegnata da questi studi documentali.
