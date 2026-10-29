package ro.icdapps.apartmentbookingmanager;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.IOException;
final class BackupInput {
    static final int MAX_BYTES = 24 * 1024 * 1024;
    static byte[] read(InputStream input) throws IOException {
        if (input == null) throw new IOException("No readable backup");
        ByteArrayOutputStream out = new ByteArrayOutputStream();byte[] buffer = new byte[16384];int total=0,count;
        while ((count=input.read(buffer,0,Math.min(buffer.length,MAX_BYTES-total+1)))!=-1) {
            if(count==0){int value=input.read();if(value==-1)break;if(++total>MAX_BYTES)throw new IOException("Backup too large");out.write(value);}
            else{total+=count;if(total>MAX_BYTES)throw new IOException("Backup too large");out.write(buffer,0,count);}
        }
        if(total==0)throw new IOException("Empty backup");return out.toByteArray();
    }
}
