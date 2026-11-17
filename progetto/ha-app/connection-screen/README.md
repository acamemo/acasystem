# Anteprima collegamento ACA

Proposta visiva per approvazione, senza integrazione nell'avvio HAOS. Card centrata,
QR con il solo URL della centrale e indirizzo selezionabile, senza pulsanti o form.
Materiali e font provengono dal design ACA condiviso, con il relativo copier esistente.

Dalla radice del repository:

```powershell
node progetto/ha-app/connection-screen/build-preview.mjs
node progetto/ha-app/connection-screen/serve-preview.mjs
```

Aprire http://127.0.0.1:4178/. La pagina generata è anche apribile direttamente da
`progetto/ha-app/out/connection-screen-preview/index.html` mantenendo gli asset accanto.
Il server espone solo l'anteprima generata su loopback; non usa il backend o gli account ACA.

Il valore predefinito dello script, `http://192.168.1.11:3002/`, è un esempio storico.
Al 2026-11-04 il banco risponde a `http://192.168.1.19:3002/`; l'anteprima è stata
rigenerata con `--origin http://192.168.1.19:3002/`. Passare sempre l'indirizzo
effettivo della centrale con `--origin` quando cambia la rete.
Questo è un dato di presentazione: la pagina non scopre la rete o installa servizi sul sistema.

Stato e verifica nel [report](../../../documentazione/reports/REP-20261104-001-anteprima-collegamento-haos.md).
