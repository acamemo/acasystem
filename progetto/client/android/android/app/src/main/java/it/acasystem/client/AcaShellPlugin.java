package it.acasystem.client;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;

import java.io.File;
import java.io.IOException;
import java.net.URI;
import java.util.ArrayList;

/**
 * Ponte tra la pagina locale del guscio (www/, nucleo in TypeScript) e Android (ADR-0023, C6):
 * configurazione, archivio delle interfacce, avvio del server locale e dell'interfaccia.
 * L'interfaccia scaricata gira in {@link UiActivity}, senza Capacitor, quindi non vede questo plugin.
 */
@CapacitorPlugin(name = "AcaShell")
public class AcaShellPlugin extends Plugin {
    static final int LOCAL_PORT = 47_320;
    private static final String PREFERENCES = "acasystem";
    private static final String CONFIG_KEY = "config";
    private static final String LAST_SERVER_KEY = "lastServerOrigin";

    private static LocalServer server;

    static synchronized LocalServer server() {
        if (server == null) server = new LocalServer(LOCAL_PORT);
        return server;
    }

    static BundleStore store(Context context) {
        return new BundleStore(new File(context.getFilesDir(), "bundles"));
    }

    private SharedPreferences preferences() {
        return getContext().getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE);
    }

    @PluginMethod
    public void shellVersion(PluginCall call) {
        String version = "0.0.0";
        try {
            version = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0).versionName;
        } catch (PackageManager.NameNotFoundException ignored) {
            // non succede per il proprio pacchetto
        }
        JSObject result = new JSObject();
        result.put("version", version);
        call.resolve(result);
    }

    @PluginMethod
    public void loadConfig(PluginCall call) {
        JSObject result = new JSObject();
        result.put("value", preferences().getString(CONFIG_KEY, null));
        call.resolve(result);
    }

    @PluginMethod
    public void saveConfig(PluginCall call) {
        String value = call.getString("value");
        if (value == null) {
            call.reject("Configurazione mancante");
            return;
        }
        preferences().edit().putString(CONFIG_KEY, value).apply();
        call.resolve();
    }

    @PluginMethod
    public void listBundles(PluginCall call) {
        JSObject result = new JSObject();
        result.put("manifests", new JSArray(new ArrayList<>(store(getContext()).listManifests())));
        call.resolve(result);
    }

    @PluginMethod
    public void installBundle(PluginCall call) {
        String manifest = call.getString("manifest");
        String archive = call.getString("archive");
        if (manifest == null || archive == null) {
            call.reject("Dati mancanti");
            return;
        }
        try {
            String version = new JSObject(manifest).getString("version");
            store(getContext()).install(version, manifest, Base64.decode(archive, Base64.DEFAULT));
            call.resolve();
        } catch (JSONException | IOException | IllegalArgumentException error) {
            call.reject("Installazione non riuscita: " + error.getMessage(), error);
        }
    }

    @PluginMethod
    public void launch(PluginCall call) {
        String version = call.getString("version");
        String serverOrigin = call.getString("serverOrigin");
        if (!BundleStore.isVersion(version) || serverOrigin == null) {
            call.reject("Dati non validi");
            return;
        }
        try {
            File bundle = store(getContext()).directoryOf(version);
            if (!new File(bundle, "index.html").isFile()) throw new IOException("Versione non installata");
            LocalServer local = server();
            local.start();
            local.setTarget(bundle, URI.create(serverOrigin));
            Intent intent = new Intent(getContext(), UiActivity.class);
            boolean reset = BrowserReset.needed(preferences().getString(LAST_SERVER_KEY, null), serverOrigin);
            intent.putExtra(UiActivity.EXTRA_RESET_BROWSER_DATA, reset);
            preferences().edit().putString(LAST_SERVER_KEY, serverOrigin).apply();
            JSArray notices = call.getArray("notices", new JSArray());
            intent.putExtra(UiActivity.EXTRA_NOTICES, notices.toString());
            getActivity().startActivity(intent);
            call.resolve();
        } catch (IOException | IllegalArgumentException error) {
            call.reject("Avvio non riuscito: " + error.getMessage(), error);
        }
    }

    /** Scorciatoia «Cambia indirizzo» con il guscio già aperto: la pagina va avvisata. */
    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        if (MainActivity.isChangeAddress(intent)) notifyListeners("changeAddress", new JSObject());
    }

    /** Vero una sola volta se l'app è stata aperta con la scorciatoia «Cambia indirizzo». */
    @PluginMethod
    public void consumeIntent(PluginCall call) {
        boolean changeAddress = false;
        if (getActivity() != null) {
            Intent intent = getActivity().getIntent();
            changeAddress = intent != null && MainActivity.isChangeAddress(intent);
            if (changeAddress) getActivity().setIntent(new Intent(intent).setData(null));
        }
        JSObject result = new JSObject();
        result.put("changeAddress", changeAddress);
        call.resolve(result);
    }
}
