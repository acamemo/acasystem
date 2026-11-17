package it.acasystem.client;

import android.Manifest;
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
import com.getcapacitor.PermissionState;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.journeyapps.barcodescanner.ScanIntentResult;
import com.journeyapps.barcodescanner.ScanOptions;
import androidx.activity.result.ActivityResult;

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
@CapacitorPlugin(name = "AcaShell", permissions = {
        @Permission(alias = "camera", strings = {Manifest.permission.CAMERA})
})
public class AcaShellPlugin extends Plugin {
    static final int LOCAL_PORT = 47_320;
    private static final String PREFERENCES = "acasystem";
    private static final String CONFIG_KEY = "config";
    private static final String LAST_SERVER_KEY = "lastServerOrigin";
    private static final String RESET_PENDING_KEY = "browserResetPending";

    static void browserResetComplete(Context context) {
        context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE).edit().putBoolean(RESET_PENDING_KEY, false).apply();
    }

    private static LocalServer server;
    private PairingStore pairingStore;
    private volatile boolean scanning;

    @Override
    public void load() {
        pairingStore = new PairingStore(preferences());
        server().setPairingMailbox(pairingStore);
    }

    @PluginMethod
    public synchronized void scanPairingCode(PluginCall call) {
        if (scanning) { call.reject("La fotocamera è già aperta.", "SCAN_BUSY"); return; }
        if (!getContext().getPackageManager().hasSystemFeature(PackageManager.FEATURE_CAMERA_ANY)) {
            call.reject("Questo dispositivo non ha una fotocamera disponibile.", "CAMERA_UNAVAILABLE");
            return;
        }
        scanning = true;
        if (getPermissionState("camera") != PermissionState.GRANTED) {
            requestPermissionForAlias("camera", call, "cameraPermissionResult");
        } else openScanner(call);
    }

    @PermissionCallback
    private void cameraPermissionResult(PluginCall call) {
        if (call == null) { scanning = false; return; }
        if (getPermissionState("camera") != PermissionState.GRANTED) {
            scanning = false;
            call.reject("Consenti la fotocamera per leggere il codice QR. Puoi abilitarla nelle impostazioni dell'app.", "CAMERA_DENIED");
        } else openScanner(call);
    }

    private void openScanner(PluginCall call) {
        ScanOptions options = new ScanOptions().setDesiredBarcodeFormats(ScanOptions.QR_CODE)
                .setPrompt("Inquadra il codice QR mostrato da ACA.")
                .setBeepEnabled(false).setBarcodeImageEnabled(false).setOrientationLocked(false);
        getActivity().runOnUiThread(() -> {
            try { startActivityForResult(call, options.createScanIntent(getContext()), "pairingScanResult"); }
            catch (RuntimeException error) {
                scanning = false;
                call.reject("Non riesco ad aprire la fotocamera.", "CAMERA_UNAVAILABLE");
            }
        });
    }

    @ActivityCallback
    private void pairingScanResult(PluginCall call, ActivityResult activityResult) {
        scanning = false;
        if (call == null) return;
        if (activityResult.getData() == null) { call.reject("Scansione annullata.", "SCAN_CANCELLED"); return; }
        ScanIntentResult scan = ScanIntentResult.parseActivityResult(activityResult.getResultCode(), activityResult.getData());
        if (scan.getContents() == null) { call.reject("Scansione annullata.", "SCAN_CANCELLED"); return; }
        JSObject result = new JSObject();
        result.put("value", scan.getContents());
        call.resolve(result);
    }

    @PluginMethod
    public void savePairing(PluginCall call) {
        String value = call.getString("value");
        if (value == null) { call.reject("Dati mancanti"); return; }
        try { pairingStore.save(value); call.resolve(); }
        catch (JSONException | IllegalArgumentException error) { call.reject("Dati di collegamento non validi"); }
    }

    @PluginMethod
    public void pairingState(PluginCall call) {
        JSObject result = new JSObject();
        result.put("configurationPending", pairingStore.hasConfiguration());
        call.resolve(result);
    }

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
            boolean reset = preferences().getBoolean(RESET_PENDING_KEY, false)
                    || BrowserReset.needed(preferences().getString(LAST_SERVER_KEY, null), serverOrigin);
            intent.putExtra(UiActivity.EXTRA_RESET_BROWSER_DATA, reset);
            preferences().edit().putString(LAST_SERVER_KEY, serverOrigin).putBoolean(RESET_PENDING_KEY, reset).apply();
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
