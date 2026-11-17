package it.acasystem.client;

import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import java.util.UUID;

/** Handoff locale: una associazione e una copia, senza password o token HA. */
final class PairingStore implements LocalServer.PairingMailbox {
    private static final String KEY = "pendingPairing";
    private final SharedPreferences preferences;

    PairingStore(SharedPreferences preferences) { this.preferences = preferences; }

    private JSONArray read() throws JSONException {
        return new JSONArray(preferences.getString(KEY, "[]"));
    }

    synchronized void save(String value) throws JSONException {
        if (value.length() > 2 * 1024 * 1024) throw new JSONException("Configurazione troppo grande");
        JSONObject packet = new JSONObject(value);
        String mode = packet.getString("mode");
        UUID.fromString(packet.getString("pairingId"));
        if (packet.getInt("schema") != 1 || !(mode.equals("account") || mode.equals("configuration"))) {
            throw new JSONException("Dati di collegamento non validi");
        }
        JSONArray previous = read();
        JSONArray next = new JSONArray();
        if (mode.equals("account")) next.put(packet);
        for (int index = 0; index < previous.length(); index++) {
            JSONObject other = previous.getJSONObject(index);
            if (!other.getString("mode").equals(mode)) next.put(other);
        }
        if (mode.equals("configuration")) next.put(packet);
        preferences.edit().putString(KEY, next.toString()).apply();
    }

    @Override
    public synchronized String pending() {
        try {
            JSONArray packets = read();
            return packets.length() == 0 ? null : packets.getJSONObject(0).toString();
        } catch (JSONException error) { return null; }
    }

    @Override
    public synchronized boolean acknowledge(String pairingId) {
        try {
            JSONArray packets = read();
            if (packets.length() == 0 || !packets.getJSONObject(0).getString("pairingId").equals(pairingId)) return false;
            packets.remove(0);
            preferences.edit().putString(KEY, packets.toString()).apply();
            return true;
        } catch (JSONException error) { return false; }
    }

    synchronized boolean hasConfiguration() {
        try {
            JSONArray packets = read();
            for (int index = 0; index < packets.length(); index++) {
                if (packets.getJSONObject(index).getString("mode").equals("configuration")) return true;
            }
        } catch (JSONException ignored) { }
        return false;
    }
}
