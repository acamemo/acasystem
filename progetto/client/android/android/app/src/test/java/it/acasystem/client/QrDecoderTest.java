package it.acasystem.client;

import static org.junit.Assert.assertEquals;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.BinaryBitmap;
import com.google.zxing.DecodeHintType;
import com.google.zxing.MultiFormatReader;
import com.google.zxing.RGBLuminanceSource;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.common.HybridBinarizer;
import com.google.zxing.qrcode.QRCodeWriter;
import java.util.Collections;
import org.junit.Test;

/** Prova il decoder realmente incluso, senza fotocamera, dispositivi o servizi esterni. */
public class QrDecoderTest {
    @Test
    public void decodesPairingQrLocally() throws Exception {
        for (String value : new String[] {
                "acasystem://pair?v=1&endpoint=http%3A%2F%2F192.168.1.50%3A3002&house=test&invite=opaque-example-only",
                "http://192.168.1.50:3002/#/collega?v=1&house=345dd32e-56bd-46ef-89ad-98afaa69c091&invite=" + "a".repeat(43)
        }) assertDecoded(value);
    }

    private void assertDecoded(String value) throws Exception {
        int size = 320;
        BitMatrix matrix = new QRCodeWriter().encode(value, BarcodeFormat.QR_CODE, size, size);
        int[] pixels = new int[size * size];
        for (int y = 0; y < size; y++) for (int x = 0; x < size; x++) {
            pixels[y * size + x] = matrix.get(x, y) ? 0xff000000 : 0xffffffff;
        }
        BinaryBitmap bitmap = new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(size, size, pixels)));
        assertEquals(value, new MultiFormatReader().decode(bitmap,
                Collections.singletonMap(DecodeHintType.POSSIBLE_FORMATS, Collections.singletonList(BarcodeFormat.QR_CODE))).getText());
    }
}
