package it.acasystem.client;

import static org.junit.Assert.*;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URI;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayDeque;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.junit.After;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

public class PairingHandoffTest {
    @Rule public TemporaryFolder folder = new TemporaryFolder();
    private LocalServer server;
    private static final String FIRST = "345dd32e-56bd-46ef-89ad-98afaa69c091";
    private static final String SECOND = "345dd32e-56bd-46ef-89ad-98afaa69c092";

    @Before public void start() throws Exception { server = new LocalServer(0); server.start(); }
    @After public void stop() { server.stop(); }

    private HttpURLConnection request(String method, String path, String body, String type) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(server.origin() + path).openConnection();
        connection.setRequestMethod(method);
        connection.setConnectTimeout(2000);
        connection.setReadTimeout(2000);
        if (body != null) {
            byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
            connection.setDoOutput(true);
            connection.setRequestProperty("Content-Type", type);
            connection.setFixedLengthStreamingMode(bytes.length);
            try (OutputStream output = connection.getOutputStream()) { output.write(bytes); }
        }
        return connection;
    }

    private String get() throws Exception {
        HttpURLConnection connection = request("GET", "/__acasystem/pairing", null, null);
        try { return new String(connection.getInputStream().readAllBytes(), StandardCharsets.UTF_8); }
        finally { connection.disconnect(); }
    }

    @Test public void onlyMatchingJsonAckConsumesTheFirstPacket() throws Exception {
        ArrayDeque<String> queue = new ArrayDeque<>();
        queue.add(FIRST); queue.add(SECOND);
        server.setPairingMailbox(new LocalServer.PairingMailbox() {
            public String pending() { return queue.isEmpty() ? null : "{\"pairingId\":\"" + queue.peek() + "\"}"; }
            public boolean acknowledge(String id) {
                if (!id.equals(queue.peek())) return false;
                queue.remove(); return true;
            }
        });
        assertTrue(get().contains(FIRST));
        HttpURLConnection wrongType = request("POST", "/__acasystem/pairing/ack", "{\"pairingId\":\"" + FIRST + "\"}", "text/plain");
        assertEquals(400, wrongType.getResponseCode()); wrongType.disconnect();
        HttpURLConnection wrongId = request("POST", "/__acasystem/pairing/ack", "{\"pairingId\":\"" + SECOND + "\"}", "application/json");
        assertEquals(409, wrongId.getResponseCode()); wrongId.disconnect();
        assertTrue(get().contains(FIRST));
        for (String id : new String[] {FIRST, SECOND}) {
            HttpURLConnection ack = request("POST", "/__acasystem/pairing/ack", "{\"pairingId\":\"" + id + "\"}", "application/json");
            assertEquals(200, ack.getResponseCode());
            assertEquals("no-store", ack.getHeaderField("Cache-Control"));
            ack.disconnect();
        }
        assertEquals("null", get());
    }

    @Test public void endpointShowsOnlyTheConfiguredCentralWithoutNetworkOrPairing() throws Exception {
        HttpURLConnection empty = request("GET", "/__acasystem/endpoint", null, null);
        assertEquals("{\"endpoint\":null}", new String(empty.getInputStream().readAllBytes(), StandardCharsets.UTF_8));
        empty.disconnect();
        server.setTarget(folder.newFolder("endpoint-bundle"), new URI("http://192.168.1.50:3002"));
        HttpURLConnection configured = request("GET", "/__acasystem/endpoint", null, null);
        assertEquals("no-store", configured.getHeaderField("Cache-Control"));
        assertEquals("{\"endpoint\":\"http://192.168.1.50:3002\"}", new String(configured.getInputStream().readAllBytes(), StandardCharsets.UTF_8));
        configured.disconnect();
        HttpURLConnection wrongMethod = request("POST", "/__acasystem/endpoint", "{}", "application/json");
        assertEquals(405, wrongMethod.getResponseCode());
        wrongMethod.disconnect();
    }

    @Test public void proxyDeliversEventStreamBeforeTheSourceFinishes() throws Exception {
        try (ServerSocket source = new ServerSocket(0, 1, InetAddress.getByName("127.0.0.1"))) {
            CountDownLatch releaseSecond = new CountDownLatch(1);
            Thread producer = new Thread(() -> {
                try (Socket socket = source.accept()) {
                    BufferedReader request = new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.ISO_8859_1));
                    String line; while ((line = request.readLine()) != null && !line.isEmpty()) { }
                    OutputStream output = socket.getOutputStream();
                    output.write(("HTTP/1.1 200 OK\r\nContent-Type: text/event-stream\r\nConnection: close\r\n\r\ndata: first\n\n").getBytes(StandardCharsets.UTF_8));
                    output.flush();
                    if (!releaseSecond.await(5, TimeUnit.SECONDS)) return;
                    output.write("data: second\n\n".getBytes(StandardCharsets.UTF_8)); output.flush();
                } catch (Exception ignored) { }
            });
            producer.setDaemon(true); producer.start();
            server.setTarget(folder.newFolder("bundle"), new URI("http://127.0.0.1:" + source.getLocalPort()));
            HttpURLConnection connection = request("GET", "/api/pairing/events", null, null);
            try (BufferedReader stream = new BufferedReader(new InputStreamReader(connection.getInputStream(), StandardCharsets.UTF_8))) {
                assertEquals("data: first", stream.readLine());
                assertEquals("", stream.readLine());
                releaseSecond.countDown();
                assertEquals("data: second", stream.readLine());
            } finally { releaseSecond.countDown(); connection.disconnect(); }
        }
    }
}
