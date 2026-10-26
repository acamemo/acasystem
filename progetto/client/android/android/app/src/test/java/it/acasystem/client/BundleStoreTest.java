package it.acasystem.client;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

public class BundleStoreTest {
    @Rule
    public TemporaryFolder folder = new TemporaryFolder();

    static byte[] zip(String... nameAndContent) throws IOException {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(bytes)) {
            for (int index = 0; index < nameAndContent.length; index += 2) {
                zip.putNextEntry(new ZipEntry(nameAndContent[index]));
                zip.write(nameAndContent[index + 1].getBytes(StandardCharsets.UTF_8));
                zip.closeEntry();
            }
        }
        return bytes.toByteArray();
    }

    private static String manifest(String version) {
        return "{\"schema\":1,\"version\":\"" + version + "\"}";
    }

    @Test
    public void installaElencaETieneLeUltimeTre() throws IOException {
        BundleStore store = new BundleStore(folder.newFolder("bundles"));
        for (String version : new String[] {"0.9.27", "0.9.28", "0.10.0", "0.9.30"}) {
            store.install(version, manifest(version), zip("index.html", version, "assets/app.js", "x"));
        }
        List<String> versions = new ArrayList<>();
        for (File child : store.directoryOf("0.10.0").getParentFile().listFiles()) versions.add(child.getName());
        Collections.sort(versions);
        assertEquals(List.of("0.10.0", "0.9.28", "0.9.30"), versions);
        assertEquals(3, store.listManifests().size());
        assertEquals("0.10.0", new String(Files.readAllBytes(new File(store.directoryOf("0.10.0"), "index.html").toPath()), StandardCharsets.UTF_8));
        assertTrue(new File(store.directoryOf("0.10.0"), "assets/app.js").isFile());
    }

    @Test
    public void rifiutaPercorsiPericolosi() throws IOException {
        BundleStore store = new BundleStore(folder.newFolder("bundles"));
        for (String name : new String[] {"../evil.js", "/etc/passwd", "C:/x.dll", "a\\..\\b", "a/../../b"}) {
            try {
                store.install("0.9.30", manifest("0.9.30"), zip("index.html", "x", name, "y"));
                fail("Accettato: " + name);
            } catch (IOException expected) {
                assertFalse(store.directoryOf("0.9.30").exists());
            }
        }
    }

    @Test
    public void rifiutaArchiviSenzaIndexOVociDoppieOVersioniStrane() throws IOException {
        BundleStore store = new BundleStore(folder.newFolder("bundles"));
        try {
            store.install("0.9.30", manifest("0.9.30"), zip("other.html", "x"));
            fail();
        } catch (IOException expected) {
            assertTrue(store.listManifests().isEmpty());
        }
        try {
            store.install("0.9.30", manifest("0.9.30"), zip("index.html", "x", "A.js", "1", "a.js", "2"));
            fail();
        } catch (IOException expected) {
            assertTrue(expected.getMessage().contains("doppia"));
        }
        try {
            store.install("../0.9.30", manifest("x"), zip("index.html", "x"));
            fail();
        } catch (IOException expected) {
            assertTrue(store.listManifests().isEmpty());
        }
        try {
            store.install("0.9.30", manifest("0.9.30"), "non è uno zip".getBytes(StandardCharsets.UTF_8));
            fail();
        } catch (IOException expected) {
            assertTrue(store.listManifests().isEmpty());
        }
    }

    @Test
    public void ignoraCartelleAMeta() throws IOException {
        File root = folder.newFolder("bundles");
        assertTrue(new File(root, "0.9.30").mkdirs());
        assertTrue(new File(root, ".staging-0.9.31").mkdirs());
        assertTrue(new BundleStore(root).listManifests().isEmpty());
    }

    @Test
    public void confrontaLeVersioniComeNumeri() {
        assertTrue(BundleStore.compareVersions("0.10.0", "0.9.30") > 0);
        assertFalse(BundleStore.isVersion("v0.9.30"));
    }
}
