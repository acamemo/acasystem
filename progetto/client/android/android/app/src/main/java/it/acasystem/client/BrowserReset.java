package it.acasystem.client;

/**
 * Come needsBrowserReset del nucleo (core/src/browserReset.ts): i dati del browser
 * dell'interfaccia (sessione, localStorage, cache) si cancellano solo se il mini PC cambia
 * rispetto all'avvio precedente. Senza un avvio ricordato non si cancella nulla.
 */
final class BrowserReset {
    private BrowserReset() {}

    static boolean needed(String previousOrigin, String nextOrigin) {
        return previousOrigin != null && !previousOrigin.equals(nextOrigin);
    }
}
