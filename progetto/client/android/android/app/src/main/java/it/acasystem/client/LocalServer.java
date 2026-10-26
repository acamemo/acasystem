package it.acasystem.client;

import java.io.BufferedInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.SocketTimeoutException;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Server locale del guscio Android, solo su 127.0.0.1 (ADR-0023, schema confermato per Windows
 * il 2026-10-26): serve l'interfaccia scaricata e inoltra {@code /api} e {@code /ha}, WebSocket
 * compreso, al server Acasystem sul mini PC. Stesse regole di windows/src/localServer.ts.
 * Ogni risposta chiude la connessione: sul loopback costa poco e tiene semplice l'inoltro.
 * Java puro: si prova con JUnit sul PC.
 */
public final class LocalServer {
    /** Copia della CSP del server (backend/src/config/security.ts): da tenere allineata. */
    static final String CONTENT_SECURITY_POLICY = String.join("; ",
            "default-src 'self'",
            "script-src 'self'",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: blob: http: https: https://cdn.jsdelivr.net https://cdn.simpleicons.org https://*.basemaps.cartocdn.com https://*.tile.openstreetmap.org",
            "connect-src 'self' ws: wss: http: https:",
            "frame-src https://www.openstreetmap.org",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'");

    private static final int MAX_HEAD_BYTES = 64 * 1024;
    private static final int CONNECT_TIMEOUT_MS = 5_000;
    private static final Map<String, String> CONTENT_TYPES = new HashMap<>();

    static {
        CONTENT_TYPES.put("html", "text/html; charset=utf-8");
        CONTENT_TYPES.put("js", "text/javascript; charset=utf-8");
        CONTENT_TYPES.put("mjs", "text/javascript; charset=utf-8");
        CONTENT_TYPES.put("css", "text/css; charset=utf-8");
        CONTENT_TYPES.put("json", "application/json; charset=utf-8");
        CONTENT_TYPES.put("webmanifest", "application/manifest+json");
        CONTENT_TYPES.put("map", "application/json; charset=utf-8");
        CONTENT_TYPES.put("txt", "text/plain; charset=utf-8");
        CONTENT_TYPES.put("svg", "image/svg+xml");
        CONTENT_TYPES.put("png", "image/png");
        CONTENT_TYPES.put("jpg", "image/jpeg");
        CONTENT_TYPES.put("jpeg", "image/jpeg");
        CONTENT_TYPES.put("webp", "image/webp");
        CONTENT_TYPES.put("gif", "image/gif");
        CONTENT_TYPES.put("ico", "image/x-icon");
        CONTENT_TYPES.put("woff", "font/woff");
        CONTENT_TYPES.put("woff2", "font/woff2");
        CONTENT_TYPES.put("ttf", "font/ttf");
        CONTENT_TYPES.put("wasm", "application/wasm");
        CONTENT_TYPES.put("glb", "model/gltf-binary");
        CONTENT_TYPES.put("gltf", "model/gltf+json");
    }

    /** Cartella dell'interfaccia e server Acasystem (solo http, Q-A10). */
    private static final class Target {
        final File bundleDir;
        final String host;
        final int port;

        Target(File bundleDir, URI serverOrigin) {
            if (!"http".equals(serverOrigin.getScheme()) || serverOrigin.getHost() == null) {
                throw new IllegalArgumentException("Indirizzo del server non valido");
            }
            this.bundleDir = bundleDir;
            this.host = serverOrigin.getHost();
            this.port = serverOrigin.getPort() == -1 ? 80 : serverOrigin.getPort();
        }
    }

    private final int requestedPort;
    private final ExecutorService workers = Executors.newCachedThreadPool(runnable -> {
        Thread thread = new Thread(runnable, "acasystem-local");
        thread.setDaemon(true);
        return thread;
    });
    private volatile ServerSocket serverSocket;
    private volatile Target target;
    private volatile int port;

    public LocalServer(int port) {
        this.requestedPort = port;
    }

    public synchronized void start() throws IOException {
        if (isRunning()) return;
        ServerSocket socket = new ServerSocket();
        socket.setReuseAddress(true);
        socket.bind(new InetSocketAddress(InetAddress.getByName("127.0.0.1"), requestedPort));
        serverSocket = socket;
        port = socket.getLocalPort();
        workers.execute(this::acceptLoop);
    }

    public boolean isRunning() {
        ServerSocket socket = serverSocket;
        return socket != null && !socket.isClosed();
    }

    public String origin() {
        return "http://127.0.0.1:" + port;
    }

    public void setTarget(File bundleDir, URI serverOrigin) {
        target = bundleDir == null ? null : new Target(bundleDir, serverOrigin);
    }

    public synchronized void stop() {
        try {
            if (serverSocket != null) serverSocket.close();
        } catch (IOException ignored) {
            // già chiuso
        }
        serverSocket = null;
    }

    static boolean isProxiedPath(String path) {
        return path.equals("/api") || path.startsWith("/api/") || path.equals("/ha") || path.startsWith("/ha/");
    }

    private void acceptLoop() {
        ServerSocket socket = serverSocket;
        while (socket != null && !socket.isClosed()) {
            try {
                Socket client = socket.accept();
                workers.execute(() -> handle(client));
            } catch (IOException ignored) {
                // chiusura del server o connessione rifiutata
            }
        }
    }

    private static final class Request {
        String method;
        String target;
        String version;
        final List<String[]> headers = new ArrayList<>();

        String header(String name) {
            for (String[] header : headers) if (header[0].equalsIgnoreCase(name)) return header[1];
            return null;
        }
    }

    /** Legge la testata fino a CRLFCRLF; il resto (corpo, frame WebSocket) resta nello stream. */
    static Request readHead(InputStream input) throws IOException {
        ByteArrayOutputStream head = new ByteArrayOutputStream();
        int matched = 0;
        while (matched < 4) {
            int value = input.read();
            if (value == -1) return null;
            head.write(value);
            if (head.size() > MAX_HEAD_BYTES) throw new IOException("Testata troppo lunga");
            matched = (value == (matched % 2 == 0 ? '\r' : '\n')) ? matched + 1 : (value == '\r' ? 1 : 0);
        }
        String[] lines = head.toString(StandardCharsets.ISO_8859_1.name()).split("\r\n");
        String[] requestLine = lines[0].split(" ");
        if (requestLine.length != 3) throw new IOException("Riga di richiesta non valida");
        Request request = new Request();
        request.method = requestLine[0];
        request.target = requestLine[1];
        request.version = requestLine[2];
        for (int index = 1; index < lines.length; index++) {
            int colon = lines[index].indexOf(':');
            if (colon <= 0) continue;
            request.headers.add(new String[] {lines[index].substring(0, colon).trim(), lines[index].substring(colon + 1).trim()});
        }
        return request;
    }

    private void handle(Socket client) {
        try {
            client.setSoTimeout(60_000);
            InputStream input = new BufferedInputStream(client.getInputStream());
            OutputStream output = client.getOutputStream();
            Request request = readHead(input);
            if (request == null) return;
            String host = request.header("Host");
            // Difesa dal DNS rebinding: una pagina esterna non può parlare con questo server.
            if (!("127.0.0.1:" + port).equals(host) && !("localhost:" + port).equals(host)) {
                sendText(output, 421, "Host non ammesso");
                return;
            }
            Target current = target;
            String path = request.target.split("\\?", 2)[0];
            boolean upgrade = "websocket".equalsIgnoreCase(request.header("Upgrade"));
            if (current == null) {
                sendText(output, 503, "Acasystem non è ancora pronto");
            } else if (isProxiedPath(path) && (!upgrade || path.startsWith("/ha/"))) {
                proxy(request, upgrade, input, output, current);
            } else if (upgrade) {
                sendText(output, 403, "Upgrade non ammesso");
            } else {
                serveStatic(request, path, output, current);
            }
        } catch (IOException ignored) {
            // connessione interrotta
        } finally {
            closeQuietly(client);
        }
    }

    private static void proxy(Request request, boolean upgrade, InputStream clientIn, OutputStream clientOut, Target target)
            throws IOException {
        Socket upstream = new Socket();
        try {
            upstream.connect(new InetSocketAddress(target.host, target.port), CONNECT_TIMEOUT_MS);
        } catch (IOException error) {
            closeQuietly(upstream);
            send(clientOut, 502, "application/json", "{\"error\":\"MINI_PC_UNREACHABLE\"}".getBytes(StandardCharsets.UTF_8), false);
            return;
        }
        try {
            StringBuilder head = new StringBuilder();
            head.append(request.method).append(' ').append(request.target).append(' ').append(request.version).append("\r\n");
            for (String[] header : request.headers) {
                String name = header[0].toLowerCase(Locale.ROOT);
                if (name.equals("host")) continue;
                if (!upgrade && (name.equals("connection") || name.equals("keep-alive") || name.equals("proxy-connection"))) continue;
                head.append(header[0]).append(": ").append(header[1]).append("\r\n");
            }
            head.append("Host: ").append(target.host).append(':').append(target.port).append("\r\n");
            if (!upgrade) head.append("Connection: close\r\n");
            head.append("\r\n");
            OutputStream upstreamOut = upstream.getOutputStream();
            upstreamOut.write(head.toString().getBytes(StandardCharsets.ISO_8859_1));
            upstreamOut.flush();

            Thread toUpstream = new Thread(() -> {
                pump(clientIn, upstreamOut);
                if (upgrade) closeQuietly(upstream);
            }, "acasystem-pump");
            toUpstream.setDaemon(true);
            toUpstream.start();
            upstream.setSoTimeout(upgrade ? 0 : 60_000);
            pump(upstream.getInputStream(), clientOut);
        } finally {
            closeQuietly(upstream);
        }
    }

    private static void pump(InputStream from, OutputStream to) {
        byte[] buffer = new byte[16 * 1024];
        try {
            int read;
            while ((read = from.read(buffer)) != -1) {
                to.write(buffer, 0, read);
                to.flush();
            }
        } catch (SocketTimeoutException ignored) {
            // inattività
        } catch (IOException ignored) {
            // un lato ha chiuso
        }
    }

    private static void serveStatic(Request request, String path, OutputStream output, Target target) throws IOException {
        if (!request.method.equals("GET") && !request.method.equals("HEAD")) {
            sendText(output, 405, "Metodo non ammesso");
            return;
        }
        File file = resolveInside(target.bundleDir, path);
        if (file == null) {
            sendText(output, 400, "Percorso non valido");
            return;
        }
        file = fileAt(file);
        // Ripiego SPA come il server: solo per percorsi senza estensione, non sotto /casa3d/.
        if (file == null && extension(path).isEmpty() && !path.startsWith("/casa3d/")) {
            file = fileAt(new File(target.bundleDir, "index.html"));
        }
        if (file == null) {
            sendText(output, 404, "Non trovato");
            return;
        }
        String type = CONTENT_TYPES.getOrDefault(extension(file.getName()), "application/octet-stream");
        boolean html = file.getName().endsWith(".html");
        StringBuilder head = new StringBuilder("HTTP/1.1 200 OK\r\n")
                .append("Content-Type: ").append(type).append("\r\n")
                .append("Content-Length: ").append(file.length()).append("\r\n")
                .append("Content-Security-Policy: ").append(CONTENT_SECURITY_POLICY).append("\r\n")
                .append("X-Content-Type-Options: nosniff\r\n")
                .append("Cache-Control: ").append(html ? "no-cache" : "public, max-age=31536000, immutable").append("\r\n")
                .append("Connection: close\r\n\r\n");
        output.write(head.toString().getBytes(StandardCharsets.ISO_8859_1));
        if (request.method.equals("GET")) {
            try (InputStream in = new FileInputStream(file)) {
                byte[] buffer = new byte[64 * 1024];
                int read;
                while ((read = in.read(buffer)) != -1) output.write(buffer, 0, read);
            }
        }
        output.flush();
    }

    /** File dentro la cartella o {@code null}: niente uscite con {@code ..} o percorsi codificati. */
    static File resolveInside(File root, String path) {
        try {
            String decoded = URLDecoder.decode(path.replace("+", "%2B"), StandardCharsets.UTF_8.name());
            if (decoded.indexOf('\0') >= 0) return null;
            String base = root.getCanonicalPath();
            File candidate = new File(root, decoded);
            String resolved = candidate.getCanonicalPath();
            return resolved.equals(base) || resolved.startsWith(base + File.separator) ? candidate : null;
        } catch (IOException | IllegalArgumentException error) {
            return null;
        }
    }

    private static File fileAt(File file) {
        if (file.isFile()) return file;
        if (file.isDirectory()) {
            File index = new File(file, "index.html");
            return index.isFile() ? index : null;
        }
        return null;
    }

    private static String extension(String name) {
        int slash = name.lastIndexOf('/');
        int dot = name.lastIndexOf('.');
        return dot > slash && dot >= 0 ? name.substring(dot + 1).toLowerCase(Locale.ROOT) : "";
    }

    private static void sendText(OutputStream output, int status, String text) throws IOException {
        send(output, status, "text/plain; charset=utf-8", text.getBytes(StandardCharsets.UTF_8), true);
    }

    private static void send(OutputStream output, int status, String type, byte[] body, boolean nosniff) throws IOException {
        String head = "HTTP/1.1 " + status + " " + reason(status) + "\r\n"
                + "Content-Type: " + type + "\r\n"
                + "Content-Length: " + body.length + "\r\n"
                + (nosniff ? "X-Content-Type-Options: nosniff\r\n" : "")
                + "Connection: close\r\n\r\n";
        output.write(head.getBytes(StandardCharsets.ISO_8859_1));
        output.write(body);
        output.flush();
    }

    private static String reason(int status) {
        switch (status) {
            case 400: return "Bad Request";
            case 403: return "Forbidden";
            case 404: return "Not Found";
            case 405: return "Method Not Allowed";
            case 421: return "Misdirected Request";
            case 502: return "Bad Gateway";
            case 503: return "Service Unavailable";
            default: return "OK";
        }
    }

    private static void closeQuietly(Socket socket) {
        try {
            socket.close();
        } catch (IOException ignored) {
            // già chiuso
        }
    }
}
