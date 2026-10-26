package it.acasystem.client;

import android.annotation.SuppressLint;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebStorage;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatActivity;

import org.json.JSONArray;
import org.json.JSONException;

/**
 * Interfaccia di Acasystem scaricata, servita dal server locale (ADR-0023, C6). WebView senza
 * il ponte di Capacitor: il codice scaricato non può chiamare il plugin del guscio. Niente kiosk
 * (Q-A9): attività normale a schermo intero.
 */
public class UiActivity extends AppCompatActivity {
    static final String EXTRA_NOTICES = "notices";
    /** Mini PC diverso dall'avvio precedente: sessione e dati del browser vanno cancellati. */
    static final String EXTRA_RESET_BROWSER_DATA = "resetBrowserData";
    private WebView webView;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Dopo la chiusura del processo il server non c'è più: si riparte dal guscio.
        if (!AcaShellPlugin.server().isRunning()) {
            startActivity(new Intent(this, MainActivity.class));
            finish();
            return;
        }
        boolean debuggable = (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        WebView.setWebContentsDebuggingEnabled(debuggable);

        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportMultipleWindows(false);
        // L'interfaccia riconosce l'app dallo user agent e mostra «Cambia indirizzo» (utils/clientShell.ts).
        settings.setUserAgentString(settings.getUserAgentString() + " AcasystemShell/" + shellVersion() + " (Android)");
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (isLocal(uri)) return false;
                if (MainActivity.isChangeAddress(new Intent().setData(uri))) {
                    // Pulsante «Cambia indirizzo» di Acasystem: come la scorciatoia dell'icona.
                    startActivity(new Intent(Intent.ACTION_VIEW, uri, UiActivity.this, MainActivity.class));
                    return true;
                }
                openOutside(uri);
                return true;
            }

            @Override
            public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                // Il motore della pagina si è chiuso (per esempio per la memoria): si ricarica da capo.
                recreate();
                return true;
            }
        });
        setContentView(webView);

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (webView.canGoBack()) webView.goBack();
                else finishAffinity();
            }
        });

        if (savedInstanceState == null && getIntent().getBooleanExtra(EXTRA_RESET_BROWSER_DATA, false)) {
            // Altro mini PC: sessione, localStorage, cache e service worker del precedente non servono.
            WebStorage.getInstance().deleteAllData();
            CookieManager.getInstance().removeAllCookies(null);
            CookieManager.getInstance().flush();
            webView.clearCache(true);
        }
        showNotices(getIntent());
        if (savedInstanceState == null) webView.loadUrl(AcaShellPlugin.server().origin() + "/");
        else webView.restoreState(savedInstanceState);
    }

    private String shellVersion() {
        try {
            return getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
        } catch (PackageManager.NameNotFoundException error) {
            return "0.0.0";
        }
    }

    private boolean isLocal(Uri uri) {
        String origin = AcaShellPlugin.server().origin();
        return uri.toString().startsWith(origin + "/") || uri.toString().equals(origin);
    }

    private void openOutside(Uri uri) {
        String scheme = uri.getScheme();
        if (!"http".equals(scheme) && !"https".equals(scheme)) return;
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (ActivityNotFoundException ignored) {
            // nessun browser installato
        }
    }

    private void showNotices(Intent intent) {
        String raw = intent.getStringExtra(EXTRA_NOTICES);
        if (raw == null) return;
        try {
            JSONArray notices = new JSONArray(raw);
            for (int index = 0; index < notices.length(); index++) {
                Toast.makeText(this, notices.getString(index), Toast.LENGTH_LONG).show();
            }
        } catch (JSONException ignored) {
            // avvisi non leggibili: si ignorano
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (webView != null) webView.saveState(outState);
    }

    @Override
    protected void onDestroy() {
        if (webView != null) webView.destroy();
        super.onDestroy();
    }
}
