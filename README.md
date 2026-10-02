# ACA SYSTEM 2.0

Piattaforma domotica proposta con automazioni locali, gestione centrale e interfaccia proprietaria. Il repository contiene attualmente documentazione e storico Git locale; non contiene applicazione, configurazioni di deployment o test di prodotto.

## Da dove iniziare

1. Leggere [le regole di lavoro](AGENTS.md).
2. Consultare [lo stato effettivo](docs/project-status.md) e il report dell'incarico da riprendere.
3. Leggere [la specifica evolutiva](product.md) e i documenti pertinenti al lavoro richiesto.
4. Verificare [le decisioni approvate](docs/decisions/README.md). Le proposte non autorizzano modifiche.

## Mappa dei documenti

| Fonte | Responsabilità |
|---|---|
| [product.md](product.md) | Visione, requisiti, priorità e criteri di accettazione proposti. |
| [Stato del progetto](docs/project-status.md) | Stato reale dei requisiti, problemi e punto di ripresa. |
| [Architettura](docs/architecture.md) | Responsabilità e flussi proposti, decisioni tecniche aperte. |
| [Infrastruttura](docs/infrastructure.md) | Ambienti previsti, inventario verificato e procedure operative da definire. |
| [Verifiche](docs/verification.md) | Scenari previsti, controlli eseguiti ed evidenze. |
| [Conformità](docs/compliance.md) | Vincoli software/cloud, evidenze e verifiche mancanti. |
| [Decisioni](docs/decisions/README.md) | Motivazioni e ciclo di vita delle scelte significative. |
| [Report](docs/reports/README.md) | Storico degli incarichi e risultati; informazioni per il passaggio ad altri agenti. |
| [Modello di decisione](docs/templates/decision.md) | Scheda riutilizzabile per una proposta o decisione autorizzata. |
| [Modello di report](docs/templates/report.md) | Incarico, perimetro, progressi, verifiche e chiusura. |
| [Originale conservato](docs/archive/product-original-2026-10-02.md) | Copia immutata del PRD acquisita il 2026-10-02. |

## Fonti e storico

La richiesta umana corrente determina il perimetro autorizzato. Il PRD descrive il prodotto desiderato; gli ADR documentano le decisioni; lo stato e i controlli descrivono quanto effettivamente realizzato. Le discrepanze vanno registrate e risolte senza riscrivere silenziosamente la storia.

Il registro dei problemi e lo stato degli incarichi sono mantenuti in [project-status.md](docs/project-status.md). Gli altri documenti collegano quel registro senza duplicarne gli stati. Ogni fatto esterno significativo riporta fonte, data e versione/revisione quando disponibile.

Git conserva i diff esatti. Report e ADR conservano motivazioni, autorizzazioni e risultati. La prima base è il commit `912ec16b818f2446c77b844b6ff24f44e30a5fa9`; il secondo commit introduce la struttura documentale. Il repository è locale, senza remote configurati.

Comandi di consultazione dalla radice:

```powershell
git status --short
git log --oneline
git show --stat HEAD
git diff
Get-FileHash -LiteralPath '.\docs\archive\product-original-2026-10-02.md' -Algorithm SHA256
```

SHA-256 dell'originale: `C0B3D5D9E7B291481C9ADC9BC110D66265A328CF578D3A0437D9283FC39CE383`.

La copia archiviata non viene modificata. I report chiusi ricevono eventuali rettifiche datate. Gli ADR superati restano consultabili e rimandano alla decisione sostitutiva. Non esiste ancora una pipeline CI o un controllo automatico permanente del perimetro.
