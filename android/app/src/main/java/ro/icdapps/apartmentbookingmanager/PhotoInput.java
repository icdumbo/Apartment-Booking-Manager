package ro.icdapps.apartmentbookingmanager;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;

/** Bounded stream read: provider size and MIME metadata need not be reliable. */
final class PhotoInput {
    static final int MAX_BYTES = 20 * 1024 * 1024;
    static final class TooLarge extends IOException { }
    static byte[] read(InputStream input) throws IOException {
        if (input == null) throw new IOException("No readable image");
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        byte[] buffer = new byte[16384];
        int total = 0, count;
        while ((count = input.read(buffer, 0, Math.min(buffer.length, MAX_BYTES - total + 1))) != -1) {
            // Some provider streams return zero without reaching EOF.
            if (count == 0) {
                int single = input.read();
                if (single == -1) break;
                if (++total > MAX_BYTES) throw new TooLarge();
                output.write(single);
            } else {
                total += count;
                if (total > MAX_BYTES) throw new TooLarge();
                output.write(buffer, 0, count);
            }
        }
        if (total == 0) throw new IOException("Empty image");
        return output.toByteArray();
    }
}
