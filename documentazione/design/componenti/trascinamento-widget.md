# Vetro del widget in spostamento

Modalità: **Operate**. Fonte: proposta accettata dall'utente con «perfetto fallo», [REP002](../../reports/REP-20261105-002-vetro-trascinamento-widget.md). Il movimento deve mostrare dove va la tessera, mantenendo leggibile il suo contenuto.

La sola copia mobile usa blur2px e fondo bianco più trasparente, un bordo chiaro e ombra leggera. Testi e icone conservano nitidezza e stati propri; niente filtro sull'intero contenuto o animazione del blur a ogni movimento. Una sola rappresentazione del widget, senza pannello di ripiego sovrapposto quando esiste la copia.

Un contorno leggero segna la posizione iniziale; la destinazione mantiene un indicatore senza superficie lattiginosa. La destinazione non valida resta distinguibile tramite bordo e messaggio. Cestino, annullamento e ritorno mantengono i tempi attuali. Al termine, gli indicatori spariscono e la tessera torna al materiale normale del tema.

Durante il solo move anche il materiale delle celle libere viene reso trasparente e privo di filtro, per evitare che formi una scacchiera lattiginosa dietro alla tessera. La posizione iniziale e la destinazione restano indicate dai due contorni; geometria e possibilità di intercettare i gesti delle celle non cambiano. Il segnale viene rimosso al termine dello spostamento.

La correzione riguarda lo spostamento: vetro a riposo, aggiunta da vassoio, ridimensionamento e schermate dei widget hanno i loro comportamenti esistenti. Nessun cambio a ordine, dimensioni, comandi o persistenza. Verificare drag reale, cleanup e movimento ridotto; il collaudo sintetico non certifica prestazioni GPU sul tablet.
