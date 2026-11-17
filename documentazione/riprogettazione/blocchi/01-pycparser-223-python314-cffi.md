# Blocco 1 Compatibilità pycparser 2.23, Python 3.14 e CFFI 2.0.0

Data e consultazione fonti: 2026-10-29. Fonte umana: [U12](../diario/2026-10-29.md#u12-compatibilita-pycparser-prima-della-compilazione). Controlli: [REP-20261029-014](../../reports/REP-20261029-014-pycparser-python314-cffi.md). Riferimenti: [host/distinta U11](01-host-linux-build-riproducibile.md) e [CFFI/header U10](01-cffi-libffi-openssl-header.md).

## Valutazione

**La scelta pycparser 2.23 può essere mantenuta nella baseline.** Sono emerse evidenze upstream positive su Python 3.14 con il medesimo codice parser/PLY della 2.23 e un contratto coerente con CFFI 2.0.0. Nei sorgenti e nelle segnalazioni selezionate non è emerso un blocco specifico che imponga un aggiornamento o una patch.

Questo supera la sola osservazione precedente “la CI del tag arriva a 3.13”, che rimane vera per quel tag ma non descrive tutta l'evidenza disponibile. **Non è ancora una prova della wheel fissata con CPython 3.14.10 GIL, CFFI 2.0.0 e cryptography 50.0.1**, né dell'esecuzione Android. Nessun pacchetto è stato importato, eseguito, installato o compilato in questo incarico.

Restano invariati i pin HA, pycparser **2.23**, i 20 artefatti host della [distinta U11](../materiali/u11-build-m11-materiali.json), CFFI **2.0.0**, cryptography **50.0.1** e runtime CPython **3.14.10 con GIL**. Le condizioni di esecuzione sotto riportate completano l'analisi, senza modificare configurazioni operative.

## Evidenze upstream: il tag non è tutta la storia

| Evidenza | Risultato osservato | Limite |
|---|---|---|
| [Release pycparser 2.23](https://github.com/eliben/pycparser/releases/tag/release_v2.23), 9 settembre 2025 | Metadata Python >=3.8, wheel `py3-none-any`, CI nel tag fino a 3.13. | Metadata e tag non provano da soli l'esecuzione 3.14. |
| [PR #581](https://github.com/eliben/pycparser/pull/581/files), integrata il 15 settembre 2025 | Aggiunge Python 3.14 a CI e classificatori; cambia soltanto workflow e setup.py. | Non è una nuova release 2.23 e non applica una patch alla wheel scelta. |
| [Confronto 2.23 → merge 31f0b8f](https://github.com/eliben/pycparser/compare/release_v2.23...31f0b8f6dcbbc90104abf121f217900c3be71bc2) | Solo CI, setup.py e TODO differiscono: parser, AST e PLY rimangono invariati. | Non equivale a ispezionare il contenuto binario della wheel pubblicata. |
| [CI Linux 3.14](https://github.com/eliben/pycparser/actions/runs/17708600529/job/50324099641), [macOS](https://github.com/eliben/pycparser/actions/runs/17708600529/job/50324099635), [Windows](https://github.com/eliben/pycparser/actions/runs/17708600529/job/50324099631), 14 settembre 2025 | I tre job risultano `success`, head `b933db7c3cc7227f5892dbb67cecbe10524890a8`. Il pacchetto al medesimo head dichiara 2.23. | Non sono prove eseguite da ACA, non coinvolgono Android e non dimostrano la terna CFFI/Python esatta. |
| [Workflow del run](https://github.com/eliben/pycparser/blob/b933db7c3cc7227f5892dbb67cecbe10524890a8/.github/workflows/ci.yml) | Esegue `python -m unittest discover`, senza installare dipendenze floating; selettore Python 3.14 con `allow-prereleases: true`. | Non attribuire ai job una patch Python precisa: la data precede il rilascio finale 3.14 e i log storici non sono disponibili. |
| [Changelog CFFI 2.0.0](https://github.com/python-cffi/cffi/blob/v2.0.0/doc/source/whatsnew.rst) | Dichiara supporto Python 3.14; PyPI pubblica anche la wheel host `cp314` già scelta. | CFFI 2.0.0 precede di un giorno pycparser 2.23: la sua release non dimostra da sola la coppia. |

Esiste anche un precedente con **CFFI 2.0.0 e pycparser 2.23 fissati insieme**: [cryptography PR #13416](https://github.com/pyca/cryptography/pull/13416), integrata il 10 settembre 2025. Il [file dei requisiti al merge](https://github.com/pyca/cryptography/blob/cee405bda6b05f7acac5cbedb644aab5b0b87fd2/.github/requirements/build-requirements.txt) contiene entrambi i pin con hash. È un'evidenza di adozione della coppia nella catena upstream, non una prova della nostra terna: la CI ordinaria e quella delle wheel non applicano necessariamente gli stessi vincoli, modalità GIL o versione Python.

**Inferenza sostenuta:** la mancata voce 3.14 nel tag 2.23 riflette soprattutto la cronologia della CI. L'aggiunta del supporto non richiese cambiamenti al parser/PLY e i successivi test upstream sul ramo 3.14 ebbero esito positivo. Non si deduce che tutto l'ambiente ACA sia già verificato.

## Interfaccia CFFI 2.0.0 → pycparser 2.23

Il [manifest CFFI](https://github.com/python-cffi/cffi/blob/v2.0.0/pyproject.toml) richiede `pycparser` su CPython senza limite di versione; il pin CFFI 2.0.0 resta quello di HA. La lettura del [cparser CFFI](https://github.com/python-cffi/cffi/blob/v2.0.0/src/cffi/cparser.py), del [parser 2.23](https://github.com/eliben/pycparser/blob/release_v2.23/pycparser/c_parser.py) e dei [nodi AST](https://github.com/eliben/pycparser/blob/release_v2.23/pycparser/c_ast.py) conferma:

| Contratto utilizzato | Corrispondenza statica |
|---|---|
| `pycparser.CParser()` | Costruttore disponibile senza argomenti obbligatori. |
| `parser.parse(fullcsource)` | Firma compatibile `parse(text, filename='', debug=False)`. |
| `c_parser.ParseError` e `__version__` | Nomi disponibili; versione 2.23, senza necessità del workaround CFFI per parser precedenti a 2.14. |
| `ast.ext`, nodi e relativi campi | Presenti le classi/attributi AST richiesti nel percorso esaminato. |
| Nodi usati nelle cache deboli | I nodi esaminati conservano `__weakref__`, necessario a `WeakKeyDictionary`. |

CFFI non accede a `CParser.clex`, `CParser.cparser` o `_scope_stack` e non manipola le tabelle PLY. Rimane un accoppiamento concreto con i nodi AST, quindi questo confronto non sostituisce il parsing di tutte le dichiarazioni effettive di cryptography.

CFFI tenta prima il provider `cffi._pycparser` e poi il pacchetto esterno; il primo non compare nei sorgenti ufficiali 2.0.0 esaminati. Nella futura prova occorrerà verificare anche il modulo effettivamente caricato e il suo percorso, non soltanto il numero versione installato.

## Python 3.14: API e condizioni effettive

Nei core pycparser/PLY letti e nei sorgenti CPython **v3.14.10**:

- Le API `inspect.getmodule`, `getsourcefile`, `getsourcelines` e gli attributi `__code__.co_argcount`/`co_firstlineno` utilizzati restano disponibili. Non emerge una dipendenza da `inspect.getargspec` o dall'introspezione delle annotazioni.
- `re.error` resta alias di `PatternError`; non è emerso uso di `\B` nelle regex core esaminate. Le novità 3.14 su annotazioni e regex non individuano qui una modifica necessaria.
- Le tabelle sono moduli Python con dati e nomi di funzioni, non bytecode fissato a Python 3.13. L'import consultato recupera i moduli da `sys.modules`; non dipende dall'effetto di `exec` sui locali impliciti.
- PLY è vendorizzato: non aggiungere un pacchetto `ply` indipendente. La stringa in `ply/__init__.py` e quella del README non coincidono, mentre l'hash della wheel pycparser congela i file effettivi.

Fonti: [lex.py](https://github.com/eliben/pycparser/blob/release_v2.23/pycparser/ply/lex.py), [yacc.py](https://github.com/eliben/pycparser/blob/release_v2.23/pycparser/ply/yacc.py), [inspect CPython](https://github.com/python/cpython/blob/v3.14.10/Lib/inspect.py), [re CPython](https://github.com/python/cpython/blob/v3.14.10/Lib/re/__init__.py), [note di porting 3.14](https://github.com/python/cpython/blob/v3.14.10/Doc/whatsnew/3.14.rst). È analisi statica delle aree selezionate, non una dimostrazione di assenza di ogni bug.

**Condizione concreta: conservare le docstring.** Il [README 2.23](https://github.com/eliben/pycparser/blob/release_v2.23/README.rst) segnala che configurazioni come `-OO`, che le eliminano, impediscono il normale uso del parser. Le regole grammaticali le utilizzano realmente. Per la futura generazione usare ottimizzazione **0**, `PYTHONOPTIMIZE` assente o `0`, senza rimuovere docstring, sorgenti o tabelle dal pacchetto. Non affidarsi al workaround delle tabelle pregenerate come modalità già collaudata.

**Scelta della baseline: usare il GIL anche sull'host.** [CFFI #267](https://github.com/python-cffi/cffi/issues/267) e [correzione #268](https://github.com/python-cffi/cffi/pull/268) documentano C generato diverso fra host GIL e free-threaded. Il ramo responsabile esiste nel [recompiler 2.0.0](https://github.com/python-cffi/cffi/blob/v2.0.0/src/cffi/recompiler.py), che legge `Py_GIL_DISABLED`. Questa differenza non dimostra che host free-threaded e target GIL siano necessariamente incompatibili: il [build.rs cryptography 50.0.1](https://github.com/pyca/cryptography/blob/50.0.1/src/rust/cryptography-cffi/build.rs) imposta già `Py_LIMITED_API` nel percorso abi3, escludendo il relativo automatismo dell'header CFFI. Per rendere uniforme la ricetta si fissano comunque **host GIL e target GIL**, senza presentarli come obbligo tecnico universale. La configurazione reale andrà letta nella futura prova: non basta il nome dell'archivio e nessun binario è stato eseguito qui. Non è un'incompatibilità dimostrata di pycparser.

## Dove il parser serve nella nostra catena

Il percorso esaminato di cryptography 50.0.1 è: Python host selezionato da maturin → `build_openssl.py` → CFFI `FFI()`/`cdef()` → pycparser → `set_source()` → `emit_c_code()` → compilazione C successiva.

La generazione usa dichiarazioni testuali predisposte da cryptography, senza `parse_file()`, preprocessore esterno o `fake_libc_include`. Gli header veri OpenSSL/CPython sono un requisito della compilazione successiva, già distinto nello studio U10. Anche l'uso di `ffi._assigned_source` da parte di cryptography corrisponde alla tupla prodotta da CFFI 2.0.0. Fonti: [utils.py](https://github.com/pyca/cryptography/blob/50.0.1/src/_cffi_src/utils.py), [build_openssl.py](https://github.com/pyca/cryptography/blob/50.0.1/src/_cffi_src/build_openssl.py), [CFFI api.py](https://github.com/python-cffi/cffi/blob/v2.0.0/src/cffi/api.py).

Nel normale percorso OpenSSL API-mode sul tablet, il binding usa il modulo generato e `_cffi_backend`; non ripete quel parsing Python. [Binding runtime](https://github.com/pyca/cryptography/blob/50.0.1/src/cryptography/hazmat/bindings/openssl/binding.py), [distinzione delle FFI](https://github.com/python-cffi/cffi/blob/v2.0.0/doc/source/cdef.rst). **Pycparser resta comunque nel pacchetto Android della baseline**, perché è una dipendenza dichiarata di CFFI su CPython. Altre integrazioni che chiamino `FFI().cdef()` sul tablet potrebbero usarlo effettivamente; non si autorizza la sua rimozione.

## Controllo successivo prima delle build native

Tutti i controlli seguenti sono **proposti, non eseguiti**. Richiedono prima un incarico che consenta di predisporre l'host:

1. Verificare la terna esatta, il backend CFFI host 2.0.0, i percorsi dei moduli, hash della wheel pycparser e delle tabelle, Python host 3.14.10 con GIL e ottimizzazione 0.
2. Provare il parser e `FFI().cdef()` con typedef, struct/union/enum, puntatori a funzione e costrutti parziali usati da CFFI; verificare AST/errori/cache deboli pertinenti.
3. Eseguire il generatore effettivo `build_openssl.py` di cryptography 50.0.1 ed emettere `_openssl.c`, senza avviare un compilatore. `emit_c_code()` separa già queste fasi. Verificare l'assenza di dipendenze involontarie dalla modalità free-threaded e la stabilità dell'output a input invariati.
4. Solo dopo distinguere build delle estensioni, import Android e test funzionali: il successo della generazione C non dimostra il backend nativo sul M11 o l'avvio HA.

**Punto di ripresa:** baseline e pin conservati; nessuna necessità documentata di passare a pycparser 3.x per questo motivo. L'evidenza è ora più solida della sola dichiarazione dei requisiti; la verifica del nostro ambiente e della wheel fissata rimane aperta. Nessuna installazione, import, generazione C, compilazione, acquisizione di archivi/binari, modifica al codice, commit o deploy.

**Seguito U13, 2026-10-29:** [definita la procedura di preflight](01-preflight-generazione-c-cryptography.md), con prerequisiti, nove fixture, comando del generatore e confronto di due output. Nessuna fase è stata eseguita; questo seguito non cambia i pin o la valutazione documentale sopra.
