package it.acasystem.client;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

import org.junit.After;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

/** Il server locale con un finto mini PC: HTTP con corpo, WebSocket grezzo, file e sicurezza. */
public class LocalServerTest {
    @Rule
    public TemporaryFolder folder = new TemporaryFolder();

    private File bundle;
    private ServerSocket upstream;
    private final List<String> seen = new CopyOnWriteArrayList<>();
    private LocalServer server;

    @Before
    public void setUp() throws IOException {
        bundle = folder.newFolder("bundle");
        Files.write(new File(bundle, "index.html").toPath(), "<title>Aca</title>".getBytes(StandardCharsets.UTF_8));
        assertTrue(new File(bundle, "assets").mkdirs());
        Files.write(new File(bundle, "assets/app.js").toPath(), "console.log(1)".getBytes(StandardCharsets.UTF_8));
        assertTrue(new File(bundle, "casa3d").mkdirs());
        Files.write(new File(bundle, "casa3d/index.html").toPath(), "casa".getBytes(StandardCharsets.UTF_8));

        upstream = new ServerSocket(0, 50, InetAddress.getByName("127.0.0.1"));
        Thread thread = new Thread(this::fakeMiniPc);
        thread.setDaemon(true);
        thread.start();

        server = new LocalServer(0);
        server.start();
    }

    @After
    public void tearDown() throws IOException {
        server.stop();
        upstream.close();
    }

    /** Finto mini PC: registra la testata, risponde JSON, oppure fa eco dopo l'upgrade. */
    private void fakeMiniPc() {
        while (!upstream.isClosed()) {
            try {
                Socket socket = upstream.accept();
                Thread thread = new Thread(() -> {
                    try (Socket s = socket) {
                        InputStream in = s.getInputStream();
                        OutputStream out = s.getOutputStream();
                        String head = readUntilBlankLine(in);
                        seen.add(head);
                        if (head.toLowerCase().contains("upgrade: websocket")) {
                            out.write("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n".getBytes(StandardCharsets.ISO_8859_1));
                            out.flush();
                            byte[] buffer = new byte[64];
                            int read = in.read(buffer);
                            out.write(("eco:" + new String(buffer, 0, read, StandardCharsets.UTF_8)).getBytes(StandardCharsets.UTF_8));
                            out.flush();
                            in.read();
                            return;
                        }
                        String body = "";
                        int length = contentLength(head);
                        if (length > 0) body = new String(in.readNBytes(length), StandardCharsets.UTF_8);
                        seen.add("BODY:" + body);
                        byte[] json = "{\"status\":\"ok\",\"version\":\"0.9.28\"}".getBytes(StandardCharsets.UTF_8);
                        out.write(("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: " + json.length + "\r\nConnection: close\r\n\r\n").getBytes(StandardCharsets.ISO_8859_1));
                        out.write(json);
                        out.flush();
                    } catch (IOException ignored) {
                        // fine della prova
                    }
                });
                thread.setDaemon(true);
                thread.start();
            } catch (IOException ignored) {
                return;
            }
        }
    }

    private static int contentLength(String head) {
        for (String line : head.split("\r\n")) {
            if (line.toLowerCase().startsWith("content-length:")) return Integer.parseInt(line.substring(15).trim());
        }
        return 0;
    }

    private static String readUntilBlankLine(InputStream in) throws IOException {
        ByteArrayOutputStream head = new ByteArrayOutputStream();
        while (!head.toString(StandardCharsets.ISO_8859_1.name()).endsWith("\r\n\r\n")) {
            int value = in.read();
            if (value == -1) break;
            head.write(value);
        }
        return head.toString(StandardCharsets.ISO_8859_1.name());
    }

    private int port() {
        return URI.create(server.origin()).getPort();
    }

    /** Richiesta grezza: restituisce tutta la risposta fino alla chiusura. */
    private String raw(String request) throws IOException {
        try (Socket socket = new Socket("127.0.0.1", port())) {
            socket.setSoTimeout(5_000);
            socket.getOutputStream().write(request.getBytes(StandardCharsets.UTF_8));
            socket.getOutputStream().flush();
            return new String(socket.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private String get(String path) throws IOException {
        return raw("GET " + path + " HTTP/1.1\r\nHost: 127.0.0.1:" + port() + "\r\n\r\n");
    }

    private void target() {
        server.setTarget(bundle, URI.create("http://127.0.0.1:" + upstream.getLocalPort()));
    }

    @Test
    public void rispondeNonProntoSenzaVersione() throws IOException {
        assertTrue(get("/").startsWith("HTTP/1.1 503"));
    }

    @Test
    public void serveFileERipiegoSpa() throws IOException {
        target();
        String index = get("/");
        assertTrue(index.startsWith("HTTP/1.1 200"));
        assertTrue(index.contains("Content-Security-Policy: default-src 'self'"));
        assertTrue(index.contains("Cache-Control: no-cache"));
        assertTrue(get("/assets/app.js").contains("text/javascript"));
        assertTrue(get("/sistema/aspetto").endsWith("<title>Aca</title>"));
        assertTrue(get("/assets/missing.js").startsWith("HTTP/1.1 404"));
        assertTrue(get("/casa3d/").endsWith("casa"));
        assertTrue(get("/casa3d/editor").startsWith("HTTP/1.1 404"));
        assertTrue(raw("POST / HTTP/1.1\r\nHost: 127.0.0.1:" + port() + "\r\nContent-Length: 0\r\n\r\n").startsWith("HTTP/1.1 405"));
    }

    @Test
    public void nonEsceDallaCartellaERifiutaHostEstranei() throws IOException {
        target();
        String escaped = get("/%2e%2e/%2e%2e/secret.txt");
        assertTrue(escaped.startsWith("HTTP/1.1 400") || escaped.startsWith("HTTP/1.1 404"));
        assertTrue(raw("GET / HTTP/1.1\r\nHost: attacker.example\r\n\r\n").startsWith("HTTP/1.1 421"));
    }

    @Test
    public void inoltraApiEHaConCorpoEHostGiusto() throws IOException {
        target();
        String health = get("/api/health");
        assertTrue(health.startsWith("HTTP/1.1 200"));
        assertTrue(health.endsWith("{\"status\":\"ok\",\"version\":\"0.9.28\"}"));
        String body = "grant_type=refresh_token";
        String token = raw("POST /ha/auth/token?x=1 HTTP/1.1\r\nHost: 127.0.0.1:" + port() + "\r\nConnection: keep-alive\r\nContent-Length: " + body.length() + "\r\n\r\n" + body);
        assertTrue(token.startsWith("HTTP/1.1 200"));
        String head = seen.get(seen.size() - 2);
        assertTrue(head.startsWith("POST /ha/auth/token?x=1 HTTP/1.1"));
        assertTrue(head.contains("Host: 127.0.0.1:" + upstream.getLocalPort()));
        assertTrue(head.contains("Connection: close"));
        assertTrue(!head.contains("keep-alive"));
        assertEquals("BODY:" + body, seen.get(seen.size() - 1));
        assertTrue(!LocalServer.isProxiedPath("/apix") && !LocalServer.isProxiedPath("/hacker"));
    }

    @Test
    public void dice502SeIlMiniPcNonRisponde() throws IOException {
        server.setTarget(bundle, URI.create("http://127.0.0.1:1"));
        String response = get("/api/health");
        assertTrue(response.startsWith("HTTP/1.1 502"));
        assertTrue(response.endsWith("MINI_PC_UNREACHABLE\"}"));
    }

    @Test
    public void inoltraIlWebSocketDiHaERifiutaGliAltri() throws IOException {
        target();
        try (Socket socket = new Socket("127.0.0.1", port())) {
            socket.setSoTimeout(5_000);
            OutputStream out = socket.getOutputStream();
            out.write(("GET /ha/api/websocket HTTP/1.1\r\nHost: 127.0.0.1:" + port() + "\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n").getBytes(StandardCharsets.UTF_8));
            out.flush();
            InputStream in = socket.getInputStream();
            assertTrue(readUntilBlankLine(in).startsWith("HTTP/1.1 101"));
            out.write("ciao".getBytes(StandardCharsets.UTF_8));
            out.flush();
            byte[] buffer = new byte[16];
            int read = in.read(buffer);
            assertEquals("eco:ciao", new String(buffer, 0, read, StandardCharsets.UTF_8));
        }
        assertTrue(raw("GET /api/socket HTTP/1.1\r\nHost: 127.0.0.1:" + port() + "\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n").startsWith("HTTP/1.1 403"));
    }

    @Test
    public void segnalaLaPortaOccupata() {
        try {
            new LocalServer(port()).start();
            throw new AssertionError("Porta occupata accettata");
        } catch (IOException expected) {
            // atteso
        }
    }
}
