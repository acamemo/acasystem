# Compatibilità della base grafica ACA

La fonte comune è ora [progetto/acasystem/design](../../../design/README.md), condivisa fra
webapp, distribuzioni e interfacce HTML. I file CSS di questa cartella rimandano a quella
fonte; font, token e reset si modificano lì.

I materiali e la tipografia delle primitive React rimandano alla stessa fonte attraverso gli
ingressi di compatibilità in `src/themes`. Le copie dei client sono generate, mentre il CSS di
composizione di ciascuna schermata rimane nel relativo workspace.
