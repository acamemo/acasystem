package it.acasystem.client;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class BrowserResetTest {
    @Test
    public void cancellaSoloQuandoIlMiniPcCambia() {
        assertTrue(BrowserReset.needed("http://192.168.1.183:3002", "http://192.168.1.19:3002"));
        assertTrue(BrowserReset.needed("http://127.0.0.1:3006", "http://192.168.1.19:3002"));
        assertFalse(BrowserReset.needed("http://192.168.1.19:3002", "http://192.168.1.19:3002"));
        assertFalse(BrowserReset.needed(null, "http://192.168.1.19:3002"));
    }
}
