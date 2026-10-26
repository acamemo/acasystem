package it.acasystem.client;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * Interfacce scaricate su disco (ADR-0023, C6), come il fileStore di Windows:
 * {@code bundles/<versione>/} con il manifesto, installazione atomica, al massimo tre versioni.
 * L'archivio arriva già verificato con lo SHA-256 dal nucleo; qui si difende comunque da
 * percorsi fuori cartella e da archivi che si gonfiano oltre il previsto. Java puro: si prova
 * con JUnit sul PC.
 */
public final class BundleStore {
    static final String MANIFEST_FILE = "acasystem-manifest.json";
    static final int KEPT_BUNDLES = 3;
    static final long MAX_UNPACKED_BYTES = 500L * 1024 * 1024;
    static final int MAX_ENTRIES = 20_000;
    private static final Pattern VERSION = Pattern.compile("^\\d{1,6}\\.\\d{1,6}\\.\\d{1,6}$");

    private final File root;

    public BundleStore(File root) {
        this.root = root;
    }

    public static boolean isVersion(String value) {
        return value != null && VERSION.matcher(value).matches();
    }

    public File directoryOf(String version) {
        if (!isVersion(version)) throw new IllegalArgumentException("Versione non valida");
        return new File(root, version);
    }

    /** Manifesti grezzi delle versioni complete; il nucleo li valida. */
    public List<String> listManifests() {
        List<String> manifests = new ArrayList<>();
        File[] children = root.listFiles();
        if (children == null) return manifests;
        for (File child : children) {
            File manifest = new File(child, MANIFEST_FILE);
            if (!child.isDirectory() || !isVersion(child.getName()) || !manifest.isFile()) continue;
            try {
                manifests.add(new String(Files.readAllBytes(manifest.toPath()), StandardCharsets.UTF_8));
            } catch (IOException ignored) {
                // cartella rimasta a metà: non è una versione
            }
        }
        return manifests;
    }

    /** Percorso sicuro: relativo, senza {@code ..}, {@code \}, unità o caratteri di controllo. */
    static String safeEntryPath(String name) throws IOException {
        if (name == null || name.isEmpty() || name.startsWith("/") || name.contains("\\")
                || name.matches("^[a-zA-Z]:.*") || name.chars().anyMatch(c -> c < 0x20)) {
            throw new IOException("Percorso non ammesso: " + name);
        }
        List<String> parts = new ArrayList<>();
        for (String part : name.split("/")) {
            if (part.isEmpty() || part.equals(".")) continue;
            if (part.equals("..")) throw new IOException("Percorso non ammesso: " + name);
            parts.add(part);
        }
        if (parts.isEmpty()) throw new IOException("Percorso non ammesso: " + name);
        return String.join("/", parts);
    }

    public synchronized void install(String version, String manifestJson, byte[] archive) throws IOException {
        if (!isVersion(version)) throw new IOException("Versione non valida");
        if (!root.isDirectory() && !root.mkdirs()) throw new IOException("Cartella non creata");
        File staging = new File(root, ".staging-" + version);
        deleteRecursively(staging);
        try {
            unzip(archive, staging);
            if (!new File(staging, "index.html").isFile()) throw new IOException("L'archivio non contiene index.html");
            // Il manifesto si scrive per ultimo: senza di lui la cartella non conta come installata.
            Files.write(new File(staging, MANIFEST_FILE).toPath(), manifestJson.getBytes(StandardCharsets.UTF_8));
            File target = directoryOf(version);
            deleteRecursively(target);
            if (!staging.renameTo(target)) throw new IOException("Spostamento non riuscito");
        } finally {
            deleteRecursively(staging);
        }
        prune(version);
    }

    private static void unzip(byte[] archive, File destination) throws IOException {
        Set<String> seen = new HashSet<>();
        long unpacked = 0;
        int entries = 0;
        byte[] buffer = new byte[64 * 1024];
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(archive))) {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                if (++entries > MAX_ENTRIES) throw new IOException("Troppe voci");
                if (entry.isDirectory()) continue;
                String path = safeEntryPath(entry.getName());
                if (!seen.add(path.toLowerCase(Locale.ROOT))) throw new IOException("Voce doppia: " + path);
                File target = new File(destination, path.replace('/', File.separatorChar));
                if (!target.getCanonicalPath().startsWith(destination.getCanonicalPath() + File.separator)) {
                    throw new IOException("Percorso fuori cartella: " + path);
                }
                File parent = target.getParentFile();
                if (parent != null && !parent.isDirectory() && !parent.mkdirs()) throw new IOException("Cartella non creata");
                // ZipInputStream controlla il CRC di ogni voce alla fine della lettura.
                try (OutputStream out = new FileOutputStream(target)) {
                    int read;
                    while ((read = zip.read(buffer)) != -1) {
                        unpacked += read;
                        if (unpacked > MAX_UNPACKED_BYTES) throw new IOException("Archivio troppo grande una volta estratto");
                        out.write(buffer, 0, read);
                    }
                }
            }
        }
    }

    private void prune(String current) {
        File[] children = root.listFiles(file -> file.isDirectory() && isVersion(file.getName()));
        if (children == null) return;
        Arrays.sort(children, Comparator.comparing(File::getName, BundleStore::compareVersions).reversed());
        int kept = 0;
        for (File child : children) {
            if (child.getName().equals(current) || kept < KEPT_BUNDLES) {
                kept++;
                continue;
            }
            deleteRecursively(child);
        }
    }

    static int compareVersions(String a, String b) {
        String[] left = a.split("\\.");
        String[] right = b.split("\\.");
        for (int index = 0; index < 3; index++) {
            int diff = Integer.compare(Integer.parseInt(left[index]), Integer.parseInt(right[index]));
            if (diff != 0) return diff;
        }
        return 0;
    }

    static void deleteRecursively(File file) {
        if (!file.exists()) return;
        File[] children = file.listFiles();
        if (children != null) for (File child : children) deleteRecursively(child);
        //noinspection ResultOfMethodCallIgnored
        file.delete();
    }
}
