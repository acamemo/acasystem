# Blocco 1 Definizione del preflight host cryptography

Data e consultazione fonti: 2026-10-29. Richiesta: [U13](../diario/2026-10-29.md#u13-definizione-del-preflight). Evidenze della definizione: [REP-20261029-015](../../reports/REP-20261029-015-definizione-preflight-cryptography.md). Riferimenti: [compatibilità U12](01-pycparser-223-python314-cffi.md), [host U11](01-host-linux-build-riproducibile.md), [distinta congelata](../materiali/u11-build-m11-materiali.json).

## Perimetro e stato

**È definita la procedura; il preflight non è stato eseguito.** Nessun ambiente predisposto, pacchetto installato/importato, file C generato o compilatore avviato. I comandi, fixture e risultati attesi sotto sono specifiche per un futuro incarico, non script aggiunti al progetto.

Il preflight verifica la catena **host Linux CPython 3.14.10 GIL → CFFI 2.0.0 e backend host 2.0.0 → pycparser 2.23 → generatore cryptography 50.0.1**. Mantiene Core 2026.10.4, orjson 3.11.9 e tutti i pin/hash U11. Non comprende build di estensioni, collegamento, import Rust cryptography o prove Android.

## P0 Materiali e ambiente di partenza

Prerequisiti di una futura esecuzione:

- Host Debian linux/amd64 e Python PBS **3.14.10+20261026** identificati nella distinta U11, già predisposti in un incarico distinto. Il suffisso PBS non compare in `sys.version_info`: si verifica con nome/hash dell'archivio e con le evidenze della preparazione.
- Venv host dedicato con le wheel U11, comprese CFFI 2.0.0, backend Linux, pycparser 2.23 e setuptools 84.0.0. Non installare o aggiornare dipendenze durante il preflight.
- Sdist `cryptography-50.0.1.tar.gz` verificato, SHA256 **`5dd9bda1c12b4162f6ff568eeb5e0ff956c28d14406e875cfe8a63a2d414ff20`**, estratto senza modifiche. Nessuna importazione del pacchetto runtime cryptography richiesta per leggerne la versione.
- Sorgenti e venv conservati in sola lettura; directory di evidenze/output separata, con due directory inizialmente vuote `run-1` e `run-2`. Inventario dei file prima/dopo per rilevare scritture inattese. Il flag `-B` impedisce la scrittura dei `.pyc`, ma non la lettura di cache già presenti né eventuale rigenerazione delle tabelle PLY.

Se manca un prerequisito, la futura esecuzione si ferma come **NON ESEGUIBILE** e non installa nulla per proseguire. Per sola generazione non occorrono NDK, Rust, header/libssl OpenSSL o libffi Android. Il backend CFFI **host** deve invece essere già importabile: è una libreria nativa acquisita con la wheel Linux fissata, non compilata dal preflight.

### Identificazione dei file importati

Per CFFI/backend e pycparser distinguere tre evidenze: hash dell'archivio wheel verificato, corrispondenza dei file critici installati ai membri di quella wheel e loro integrità installata. Le versioni di `importlib.metadata` da sole non provano la provenienza.

Per verificare file mancanti leggere il CSV `Distribution.read_text('RECORD')` grezzo, non soltanto `Distribution.files()`: [CPython v3.14.10](https://github.com/python/cpython/blob/v3.14.10/Lib/importlib/metadata/__init__.py) filtra in quest'ultimo metodo le voci senza file. Confrontare esistenza, dimensioni e digest disponibili; i digest RECORD sono base64 URL-safe senza padding, diversi dall'hex SHA256 della distinta. Hash/size vuoti di RECORD e bytecode possono essere legittimi. Per un file critico senza riscontro affidabile la provenienza resta **NON VERIFICABILE**, non automaticamente corrotta. La verifica della wheel originale rimane distinta da RECORD locale.

## P1 Import e configurazione host

Eseguire le verifiche nel venv dedicato prima di applicare la simulazione Android di cibuildwheel. Registrare interpreter, prefissi, `sys.path` e soli override rilevanti. Non alterare l'ambiente soltanto per nascondere una divergenza: ogni differenza rispetto alla successiva generazione va riportata.

| Controllo | Criterio per superarlo |
|---|---|
| Python | `sys.implementation.name == 'cpython'`; `sys.version_info == (3, 14, 10, 'final', 0)`. |
| Venv/runtime | `sys.executable` è il percorso host previsto; prefissi del venv/base riconosciuti. Il symlink verso il runtime PBS è ammesso: distinguere invocazione e destinazione canonica. |
| Piattaforma | Linux x86_64 e sysconfig host GNU/Linux. Assenti override cross non previsti come `_PYTHON_HOST_PLATFORM`, `_PYTHON_SYSCONFIGDATA_NAME`, `_PYTHON_SYSCONFIGDATA_PATH` e `CIBW_HOST_TRIPLET`. Registrare SOABI/EXT_SUFFIX, senza confonderli con l'ABI Android. |
| GIL della baseline | Build ordinaria: `Py_GIL_DISABLED` non abilitato (0 o valore assente previsto dal runtime standard), SOABI senza variante `t` e `sys._is_gil_enabled()` vero. Il solo GIL runtime attivo non esclude una build free-threaded che lo abbia riattivato. |
| Ottimizzazione | `sys.flags.optimize == 0`; docstring grammaticali effettivamente presenti. Sentinelle: `CParser.p_translation_unit_or_empty.__doc__` e `CLexer.t_NEWLINE.__doc__`, confrontate con il tag 2.23. |
| Versioni importate | `cffi.__version__ == _cffi_backend.__version__ == '2.0.0'`; `pycparser.__version__ == '2.23'`; metadata delle distribuzioni coerenti. |
| Provider e percorsi | `__file__`/`__spec__.origin` riconducono al venv e ai materiali verificati; backend Linux e provider pycparser esterno atteso. Nessun modulo estraneo dal progetto, user-site o installazione di sistema. |
| PLY e tabelle | `lex`, `yacc`, `lextab` e `yacctab` provengono dalla stessa pycparser. Controllare i rispettivi formati tabella, senza usare la stringa storica `pycparser.ply.__version__ == '3.9'` come errore: i moduli lex/yacc dichiarano 3.10. Niente PLY esterno o rigenerazione implicita per ottenere un verde. |

Fonti delle API: [sys](https://github.com/python/cpython/blob/v3.14.10/Doc/library/sys.rst), [sysconfig](https://github.com/python/cpython/blob/v3.14.10/Doc/library/sysconfig.rst), [FFI 2.0.0](https://github.com/python-cffi/cffi/blob/v2.0.0/src/cffi/api.py). L'host GIL è una scelta fissata per uniformità della ricetta, non un'affermazione di incompatibilità universale fra altri host/target.

## P2 Corpus di parsing con esiti attesi

Usare oggetti `CParser` e `FFI` nuovi per ciascuna fixture, anche dopo un errore. Controllare AST, nomi, categorie e relazioni dei tipi; non misurare dimensioni, offset o layout Android. I risultati della tabella sono **aspettative**, non prove già passate.

| ID | Input | Parser diretto 2.23 | `FFI.cdef()` 2.0.0 e controllo essenziale |
|---|---|---|---|
| A1 | `typedef unsigned int UInt; typedef UInt UIntReally; UInt foo(void);` | Accetta: due typedef e una dichiarazione `foo`. | Accetta; entrambi gli alias risolvono al medesimo tipo `unsigned int`. |
| A2 | `typedef struct { int a, b; } foo_t, *foo_p; int foo(foo_p[]);` | Accetta struct, alias diretto, alias puntatore e funzione. | Accetta; il tipo puntato da `foo_p` corrisponde a `foo_t`, senza confrontare dimensioni. |
| A3 | `union value_u { int i; double d; }; enum mode_e { OFF=0, ON=1 }; typedef int (*handler_t)(double); void reg(handler_t);` | Accetta i nodi union, enum, typedef puntatore a funzione e dichiarazione `reg`. | Accetta e mantiene nomi/categorie. Nessuna callback o funzione viene chiamata. |
| A4 | `short foo(int, ...);` | Accetta la variadica ordinaria con primo parametro. | Accetta la firma; non eseguire chiamate variadiche. |
| E1 | `typedef ... handle_t;` | Rifiuta con `ParseError`. | Accetta il tipo opaco dopo il preprocessing CFFI. Non richiedere allocazione o layout. |
| E2 | `struct partial_s { int known; ...; }; enum partial_e { AA, BB, ... };` | Rifiuta le ellissi CFFI con `ParseError`. | Accetta i due tipi parziali; valori dell'header, layout e dimensioni restano ignoti. |
| N1 | `x y z` | Rifiuta con `ParseError`. | Rifiuta con `CDefError`, con motivo di parsing riconoscibile. |
| N2 | `void foo(void) {}` | Accetta e produce `FuncDef`. | Rifiuta con `CDefError`: è C valido, ma non una dichiarazione ammessa da `cdef()`. |
| N3 | `int foo(...);` | Non richiesto in questo caso discriminante. | Rifiuta con `CDefError`, secondo il contratto specifico CFFI 2.0.0. Non generalizzare a ogni revisione dello standard C. |

Le ellissi E1/E2 sono **estensioni CFFI**, non C ordinario: il rifiuto raw è parte dell'esito corretto. Per i negativi verificare classe e motivo essenziale, evitando di dipendere dall'intero testo diagnostico. Un `ImportError`, `TypeError` interno o crash non vale come rifiuto atteso. Un positivo respinto o un negativo accettato impedisce il superamento del preflight.

A2 esercita anche l'accoppiamento AST/cache debole. Come diagnosi facoltativa si può verificare una weak reference a un nodo Struct mantenuto vivo; non dedurne assenza di leak o tempi di garbage collection.

Fonti del corpus: [test_parsing.py v2.0.0](https://github.com/python-cffi/cffi/blob/v2.0.0/testing/cffi0/test_parsing.py), [test_recompiler.py](https://github.com/python-cffi/cffi/blob/v2.0.0/testing/cffi1/test_recompiler.py), [contratto cdef](https://github.com/python-cffi/cffi/blob/v2.0.0/doc/source/cdef.rst). Non eseguire indiscriminatamente questi file: molti test e helper `verify/_verify` avviano compilatori. Il futuro harness dovrà limitarsi ai controlli sopra definiti; nessun harness è stato scritto ora.

## P3 Generazione C upstream, senza compilazione

La futura chiamata usa direttamente `src/_cffi_src/build_openssl.py`, con host Python esplicito e cwd `src/rust/cryptography-cffi`, come il [build.rs 50.0.1](https://github.com/pyca/cryptography/blob/50.0.1/src/rust/cryptography-cffi/build.rs). Non invocare Cargo per arrivarvi. `PYO3_PYTHON` non seleziona l'interprete di questa chiamata diretta: conta l'eseguibile realmente invocato.

Esempio per il futuro host Linux; variabili e directory devono essere già state validate e predisposte. **Non è stato eseguito né salvato come script operativo:**

```sh
cd "$ACA_CRYPTO_SRC/src/rust/cryptography-cffi"
env -u PYTHONPATH -u PYTHONHOME \
  -u _PYTHON_HOST_PLATFORM -u _PYTHON_SYSCONFIGDATA_NAME \
  -u _PYTHON_SYSCONFIGDATA_PATH -u CIBW_HOST_TRIPLET \
  PYTHONDONTWRITEBYTECODE=1 PYTHONOPTIMIZE=0 PYTHONHASHSEED=0 \
  LC_ALL=C.UTF-8 TZ=UTC SOURCE_DATE_EPOCH=1793232000 \
  OUT_DIR="$ACA_PREFLIGHT_OUT/run-1" \
  "$ACA_HOST_PYTHON" -s -B ../../_cffi_src/build_openssl.py
```

`ACA_CRYPTO_SRC` identifica l'estrazione verificata 50.0.1, `ACA_HOST_PYTHON` il Python del venv host e `ACA_PREFLIGHT_OUT` l'area separata di evidenze. Questa prova usa il profilo host prima della simulazione cross: non prova automaticamente il venv Android simulato che userà successivamente cibuildwheel. Registrare i flag d'import effettivi e confrontarli con la futura catena di build.

Lo [script originale](https://github.com/pyca/cryptography/blob/50.0.1/src/_cffi_src/build_openssl.py) aggiunge `src` al proprio `sys.path`, importa utils e **22 moduli** `_cffi_src.openssl.*`, poi chiama `ffi.emit_c_code()`. [Utils](https://github.com/pyca/cryptography/blob/50.0.1/src/_cffi_src/utils.py) legge `src/cryptography/__about__.py` direttamente: la versione deve essere 50.0.1, senza importare `cryptography.__init__`, `_rust` o binding runtime.

Il parsing riguarda le stringhe di dichiarazioni; INCLUDES/CUSTOMIZATIONS vengono incollati nel C. Non si leggono gli header OpenSSL e non si carica libssl. L'[API emit_c_code 2.0.0](https://github.com/python-cffi/cffi/blob/v2.0.0/src/cffi/api.py#L686) passa `call_c_compiler=False` e `uses_ffiplatform=False`.

Per ogni esecuzione registrare exit code, stdout/stderr e questi controlli:

| Controllo | Esito richiesto |
|---|---|
| Completamento | Exit code 0, senza eccezioni; warning classificati e spiegati. Non imporre stderr vuoto come criterio generale. |
| File | Esiste soltanto nell'area prevista `$OUT_DIR/_openssl.c`, è non vuoto; registrare numero di byte e SHA256. Non è noto anticipatamente un hash corretto dell'output. |
| Versione e inizializzazione | Definizione `CRYPTOGRAPHY_PACKAGE_VERSION` con valore `"50.0.1"`, funzione `PyInit__openssl`, contesti `_cffi_types`, `_cffi_globals`, `_cffi_type_context` e codice di import `_cffi_backend`. |
| Profilo di emissione | Sul profilo CPython GIL scelto, assenti le direttive di definizione emesse `_CFFI_USE_EMBEDDING` e `_CFFI_NO_LIMITED_API`. Riconoscere le direttive, non cercare soltanto sottostringhe: riferimenti e guardie nei template possono contenere gli stessi nomi. |
| Integrità | Sorgenti e file del venv invariati rispetto agli inventari iniziali. Tabelle mancanti o rigenerazioni inattese non diventano automaticamente un esito positivo. |

Questi controlli sono strutturali sul testo, non un preprocessore C. Non dedurre che un ramo `CRYPTOGRAPHY_OPENSSL_*` sia stato selezionato o che le relative API esistano realmente nella libreria target.

## P4 Ripetizione, evidenze e verdetto

Ripetere P3 in **un nuovo processo**, con identici ingressi/ambiente e `OUT_DIR` impostato a `run-2`, inizialmente vuota. I due file devono superare indipendentemente P3; confrontare SHA256 e byte **senza normalizzare o riscrivere il C**. Due directory evitano di scambiare un messaggio “already up-to-date” o un mtime invariato per una seconda prova riuscita. Nel [recompiler 2.0.0](https://github.com/python-cffi/cffi/blob/v2.0.0/src/cffi/recompiler.py) il PID serve al nome temporaneo di scrittura, non a riempire il contenuto C.

Una differenza non dimostra da sola incompatibilità del parser: conservare i due output e diagnosticare il determinismo. Non modificare pin, sorgenti o output per far passare il confronto.

La futura scheda di esecuzione deve conservare: identificativo/data della prova; distinta U11 e hash degli ingressi; interpreter/versioni/GIL/flag; provenienza moduli/tabelle; risultato di ogni fixture; argv/cwd e ambiente rilevante selezionato; exit code/stdout/stderr delle due generazioni; hash/dimensioni/output e confronto byte; inventari prima/dopo. Non fare un dump indiscriminato di variabili d'ambiente o log sensibili.

| Verdetto | Criterio |
|---|---|
| **NON ESEGUITO** | Nessuna esecuzione iniziata. È lo stato attuale di tutte le fasi. |
| **NON ESEGUIBILE** | Prerequisiti mancanti o identità/provenienza non verificabile: fermarsi senza installazioni automatiche. |
| **FALLITO** | Una verifica obbligatoria contraddice l'atteso: indicare fase, fatto osservato e se il problema riguarda ambiente, parsing, generazione o confronto. |
| **SUPERATO** | P0/P1 e tutte le fixture P2 soddisfatti, entrambe le generazioni P3 corrette e confronto P4 identico, con evidenze complete. |

Nel futuro report riportare separatamente ogni fase: un mancato import non è già prova di incompatibilità pycparser, e una generazione riuscita non rende verde la verifica di determinismo se il secondo file diverge.

### Confini del risultato

Non usare `ffi.verify()`, `ffi.compile()`, `ffi.dlopen()`, `ffi.new()`, chiamate C, `sizeof/alignof/offsetof`, `pip wheel`, `python -m build`, maturin, cibuildwheel o Cargo per eseguire questo preflight. Non usare il comando `cffi-gen-src`, introdotto dopo il pin 2.0.0. Nessun test crittografico o import del backend Rust è compreso.

Un futuro **SUPERATO** attesterebbe import della terna host, parsing del corpus e delle dichiarazioni effettive, generazione C ripetibile nelle due esecuzioni. Non attesterebbe validità del C dopo preprocessing, correttezza OpenSSL/libffi, ABI/linking Android, wheel riproducibili, import sul M11 o HA funzionante. Le eventuali compilazioni/test successivi restano incarichi distinti.

**Punto di ripresa:** procedura definita e revisionabile, tutte le fasi NON ESEGUITE. Nessuno script operativo o artefatto di esecuzione creato, nessuna installazione, import, generazione C o modifica al codice. L'incarico corrente non autorizza ad avviare il preflight.

**Seguito U14, 2026-10-29:** [definita la preparazione Linux isolata](01-preparazione-ambiente-preflight.md), con acquisizione selettiva, bootstrap del venv e profilo di esecuzione. Preparazione non avviata e P0-P4 ancora NON ESEGUITI; nessun cambiamento ai pin o ai criteri sopra.
