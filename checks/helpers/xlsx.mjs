// Test-only reader for uncompressed ZIP entries; the workbook is independently checked with openpyxl too.
export function xlsxParts(bytes){
 const buffer=Buffer.from(bytes),parts={};let offset=0;
 while(buffer.readUInt32LE(offset)===0x04034b50){
  if(buffer.readUInt16LE(offset+8)!==0)throw new Error('Expected stored ZIP entry');
  const size=buffer.readUInt32LE(offset+18),length=buffer.readUInt16LE(offset+26),extra=buffer.readUInt16LE(offset+28),name=buffer.subarray(offset+30,offset+30+length).toString(),start=offset+30+length+extra;
  parts[name]=buffer.subarray(start,start+size).toString();offset=start+size;
 }return parts;
}
