package ro.icdapps.apartmentbookingmanager;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.IOException;
/** Fixed working buffer, no total-file size ceiling or whole-file byte array. */
final class BackupInput {
    interface SpaceCheck { void require(long bytes) throws IOException; }
    static long copy(InputStream input,OutputStream output,SpaceCheck space) throws IOException {
        if(input==null)throw new IOException("No readable backup");
        byte[] buffer=new byte[64*1024];long total=0;int count;
        while((count=input.read(buffer))!=-1){if(count==0){int single=input.read();if(single==-1)break;space.require(1);output.write(single);total++;}else{space.require(count);output.write(buffer,0,count);total+=count;}}
        if(total==0)throw new IOException("Empty backup");return total;
    }
}
