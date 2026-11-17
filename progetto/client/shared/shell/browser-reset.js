// Eseguito soltanto dal contenitore su una pagina trusted della propria origine locale.
// Le bozze restano in IndexedDB e richiedono il successivo login casa/utente corretto.
(async () => {
  let timer;
  try {
    const cleanup = async () => {
      localStorage.clear();
      sessionStorage.clear();
      if (typeof caches !== 'undefined') await Promise.all((await caches.keys()).map((key) => caches.delete(key)));
      if (navigator.serviceWorker) await Promise.all((await navigator.serviceWorker.getRegistrations()).map((worker) => worker.unregister()));
      await new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase('aca-appearance');
        request.onsuccess = resolve;
        request.onerror = request.onblocked = () => reject(new Error('Archivio foto occupato.'));
      });
    };
    await Promise.race([cleanup(), new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Preparazione scaduta.')), 10_000);
    })]);
    document.title = 'aca-storage-reset-ready';
    return true;
  } catch {
    document.body.textContent = 'Preparazione del collegamento non completata. Chiudi ACA e riprova. Le bozze sono conservate.';
    document.title = 'aca-storage-reset-error';
    return false;
  } finally { clearTimeout(timer); }
})()
