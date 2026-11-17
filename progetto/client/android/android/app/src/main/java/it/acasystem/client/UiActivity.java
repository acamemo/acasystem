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
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatActivity;

import org.json.JSONArray;
import org.json.JSONException;
import java.io.InputStream;
import java.util.Scanner;

/**
 * Interfaccia di Acasystem scaricata, servita dal server locale (ADR-0023, C6). WebView senza
 * il ponte di Capacitor: il codice scaricato non può chiamare il plugin del guscio. Niente kiosk
 * (Q-A9): attività normale a schermo intero.
 */
public class UiActivity extends AppCompatActivity {
    static final String EXTRA_NOTICES = "notices";
    /** Mini PC diverso: pulisce accessi/cache, preservando le bozze per casa e utente. */
    static final String EXTRA_RESET_BROWSER_DATA = "resetBrowserData";
    private WebView webView;
    private boolean resetting;
    private boolean clearResetHistory;

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
            public void onPageFinished(WebView view, String url) {
                if (clearResetHistory && (AcaShellPlugin.server().origin() + "/").equals(url)) {
                    clearResetHistory = false;
                    view.clearHistory();
                }
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (isLocal(uri)) return false;
                if (MainActivity.isChangeAddress(new Intent().setData(uri))) {
                    // Pulsante «Cambia indirizzo» di Acasystem: come la scorciatoia dell'icona.
                    startActivity(new Intent(Intent.ACTION_VIEW, uri, UiActivity.this, MainActivity.class));
                    finish();
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
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onReceivedTitle(WebView view, String title) {
                if (!resetting || view.getUrl() == null || !isLocal(Uri.parse(view.getUrl()))) return;
                if ("aca-storage-reset-ready".equals(title)) {
                    resetting = false;
                    getIntent().removeExtra(EXTRA_RESET_BROWSER_DATA);
                    AcaShellPlugin.browserResetComplete(UiActivity.this);
                    showNotices(getIntent());
                    clearResetHistory = true;
                    view.loadUrl(AcaShellPlugin.server().origin() + "/");
                }
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

        if (getIntent().getBooleanExtra(EXTRA_RESET_BROWSER_DATA, false)) {
            // Pagina trusted locale prima della webapp: cancella accessi/foto, conserva bozze.
            resetting = true;
            webView.postDelayed(() -> {
                if (resetting && !isFinishing() && !isDestroyed()) {
                    resetting = false;
                    webView.loadData("<html lang=\"it\"><body>Preparazione scaduta. Chiudi ACA e riprova. Le bozze sono conservate.</body></html>", "text/html", "UTF-8");
                }
            }, 15_000);
            webView.clearCache(true);
            CookieManager.getInstance().removeAllCookies(ignored -> {
                if (!resetting || isFinishing() || isDestroyed()) return;
                CookieManager.getInstance().flush();
                try (InputStream input = getAssets().open("public/browser-reset.js");
                     Scanner reader = new Scanner(input, "UTF-8").useDelimiter("\\A")) {
                    String script = reader.next();
                    webView.loadDataWithBaseURL(AcaShellPlugin.server().origin() + "/",
                            "<!doctype html><html lang=\"it\"><meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; script-src 'unsafe-inline'\"><title>Preparazione collegamento</title><body>Preparazione del collegamento…<script>" + script + "</script></body></html>",
                            "text/html", "UTF-8", AcaShellPlugin.server().origin() + "/__acasystem/storage-reset");
                } catch (Exception error) {
                    webView.loadData("<html lang=\"it\"><body>Preparazione non completata. Chiudi ACA e riprova. Le bozze sono conservate.</body></html>", "text/html", "UTF-8");
                }
            });
            return;
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
