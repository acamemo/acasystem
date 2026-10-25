# Documentazione — ACA SYSTEM 2.0

Direzione corrente: Home Assistant locale con frontend personalizzato a partire da Tunet; pilota in ufficio e fase 1 minima grafica, secondo ADR-0003. Il repository contiene documentazione, Git locale e sorgenti ACA derivati da Tunet 1.22.1. Al 2026-10-14 il banco locale è `aca-system:0.9.7`, con UI kit e pagine di categoria, verifiche sul Tab M11 e limiti di collaudo registrati. Stato corrente in [project-status.md](project-status.md), passaggio di consegne in [LEGGIMI.md](LEGGIMI.md), avvio in [progetto/README.md](../progetto/README.md).

## Da dove iniziare

1. Leggere [le regole di lavoro](../AGENTS.md).
2. Per una nuova chat leggere [LEGGIMI.md](LEGGIMI.md); consultare [lo stato effettivo](project-status.md) e il report dell'incarico da riprendere.
3. Leggere il [modulo funzionalità](funzionalita/README.md) per requisiti e comportamenti e il [modulo design](design/README.md) per presentazione e interazione, secondo l'incarico.
4. Verificare [le decisioni approvate](decisions/README.md). Le proposte non autorizzano modifiche.

## Mappa dei documenti

La documentazione è divisa in due moduli: **funzionalità**, con product.md e pilot-scope.md, e **design**, con design.md. I documenti seguenti su stato, aspetti tecnici, verifiche e storico sono comuni: ciascuno mantiene una sola responsabilità e non viene copiato nei due moduli.

| Fonte | Responsabilità |
|---|---|
| [LEGGIMI.md](LEGGIMI.md) | Sintesi datata per una nuova chat, distinzione kit/HA e collegamenti alle fonti correnti. |
| [product.md](funzionalita/product.md) | Visione, requisiti proposti/approvati/ritirati, priorità storiche e criteri di accettazione proposti. |
| [Pilota e fase 1](funzionalita/pilot-scope.md) | Indicazioni umane, perimetro minimo grafico, obiettivi successivi e informazioni mancanti. |
| [design.md](design/design.md) | Stile Neumorphism, colori confermati, spiegazione, proposte sui componenti e verifiche visive previste. |
| [Catalogo componenti](design/componenti/README.md) | Sette reference originali, provenienza, dipendenze dichiarate, ruoli e integrità; nessuna integrazione applicativa. |
| [Stato del progetto](project-status.md) | Stato reale dei requisiti, problemi e punto di ripresa. |
| [Architettura](architecture.md) | Responsabilità e flussi proposti, decisioni tecniche aperte. |
| [Infrastruttura](infrastructure.md) | Ambienti previsti, inventario verificato e procedure operative da definire. |
| [Verifiche](verification.md) | Scenari previsti, controlli eseguiti ed evidenze. |
| [Conformità](compliance.md) | Vincoli software/cloud, evidenze e verifiche mancanti. |
| [Decisioni](decisions/README.md) | Motivazioni e ciclo di vita delle scelte significative. |
| [Report](reports/README.md) | Storico degli incarichi e risultati; informazioni per il passaggio ad altri agenti. |
| [Modello di decisione](templates/decision.md) | Scheda riutilizzabile per una proposta o decisione autorizzata. |
| [Modello di report](templates/report.md) | Incarico, perimetro, progressi, verifiche e chiusura. |
| [Originale conservato](archive/product-original-2026-10-02.md) | Copia immutata del PRD acquisita il 2026-10-02. |

## Fonti e storico

La richiesta umana corrente determina il perimetro autorizzato. Il PRD descrive il prodotto desiderato; gli ADR documentano le decisioni; lo stato e i controlli descrivono quanto effettivamente realizzato. Le discrepanze vanno registrate e risolte senza riscrivere silenziosamente la storia.

Il registro dei problemi e lo stato degli incarichi sono mantenuti in [project-status.md](project-status.md). Gli altri documenti collegano quel registro senza duplicarne gli stati. Ogni fatto esterno significativo riporta fonte, data e versione/revisione quando disponibile.

Git conserva i diff esatti. Report e ADR conservano motivazioni, autorizzazioni e risultati. La prima base è il commit `912ec16b818f2446c77b844b6ff24f44e30a5fa9`; il secondo commit introduce la struttura documentale. Il trasferimento in `documentazione/` è registrato in [REP-20261002-003](reports/REP-20261002-003-organizzazione-cartelle.md). Il repository è locale, senza remote configurati.

Comandi di consultazione dalla radice:

```powershell
git status --short
git log --oneline
git show --stat HEAD
git diff
Get-FileHash -LiteralPath '.\documentazione\archive\product-original-2026-10-02.md' -Algorithm SHA256
```

SHA-256 dell'originale: `C0B3D5D9E7B291481C9ADC9BC110D66265A328CF578D3A0437D9283FC39CE383`.

La copia archiviata non viene modificata. I report chiusi ricevono eventuali rettifiche datate. Gli ADR superati restano consultabili e rimandano alla decisione sostitutiva. Non esiste ancora una pipeline CI o un controllo automatico permanente del perimetro.
