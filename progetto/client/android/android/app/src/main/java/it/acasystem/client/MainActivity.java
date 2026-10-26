package it.acasystem.client;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

/**
 * Guscio Android (ADR-0023, C6): ospita la pagina locale con procedura guidata ed errori.
 * La scorciatoia «Cambia indirizzo» apre questa attività con l'indirizzo acasystem://change-address.
 */
public class MainActivity extends BridgeActivity {
    static boolean isChangeAddress(Intent intent) {
        Uri data = intent.getData();
        return data != null && "acasystem".equals(data.getScheme()) && "change-address".equals(data.getHost());
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AcaShellPlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        // Prima setIntent: il plugin avvisato da super legge l'intent nuovo con consumeIntent.
        setIntent(intent);
        super.onNewIntent(intent);
    }
}
