// Minimal offline OOXML writer: numeric cells, inline text, stored ZIP (no network/dependencies).
const encoder=new TextEncoder();
export function xml(value){return String(value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').slice(0,32767).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));}
function crc32(bytes){let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
function header(size,values){const bytes=new Uint8Array(size),view=new DataView(bytes.buffer);for(const [offset,value,length] of values)length===2?view.setUint16(offset,value,true):view.setUint32(offset,value,true);return bytes;}
export function zipFiles(files){
 const chunks=[],directory=[];let offset=0,centralSize=0;
 for(const [name,content] of Object.entries(files)){
  const path=encoder.encode(name),data=encoder.encode(content),crc=crc32(data);
  const local=header(30,[[0,0x04034b50,4],[4,20,2],[12,33,2],[14,crc,4],[18,data.length,4],[22,data.length,4],[26,path.length,2]]);
  chunks.push(local,path,data);
  const central=header(46,[[0,0x02014b50,4],[4,20,2],[6,20,2],[14,33,2],[16,crc,4],[20,data.length,4],[24,data.length,4],[28,path.length,2],[42,offset,4]]);
  directory.push(central,path);centralSize+=central.length+path.length;offset+=local.length+path.length+data.length;
 }
 const count=Object.keys(files).length,end=header(22,[[0,0x06054b50,4],[8,count,2],[10,count,2],[12,centralSize,4],[16,offset,4]]);
 const parts=[...chunks,...directory,end],output=new Uint8Array(offset+centralSize+22);let position=0;for(const part of parts){output.set(part,position);position+=part.length;}return output;
}
export function cell(ref,value,style=0){
 if(value===undefined||value===null)return `<c r="${ref}" s="${style}"/>`;
 if(typeof value==='number'){if(!Number.isFinite(value))throw new Error('reportExportFailed');return `<c r="${ref}" s="${style}"><v>${value}</v></c>`;}
 return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
}
export function createXlsx(sheet,styles,name,{filterRange,filterHeaders}={}){
 const declaration='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
 const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
 const table=filterHeaders?.length?filterRange.replace(/\$/g,''):null;
 if(table){
  // A native table owns its filter; do not also declare an overlapping sheet filter.
  sheet=sheet.replace(/<autoFilter\b[^>]*>[\s\S]*?<\/autoFilter>|<autoFilter\b[^>]*\/>/,'');
  sheet=sheet.replace('<worksheet ', '<worksheet xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ');
  sheet=sheet.replace('</worksheet>','<tableParts count="1"><tablePart r:id="rIdTable1"/></tableParts></worksheet>');
 }
 const buttons=Array.from({length:filterHeaders?.length||10},(_,i)=>`<filterColumn colId="${i}" hiddenButton="0" showButton="1"/>`).join('');
 return zipFiles({
  '[Content_Types].xml':declaration+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+(table?'<Override PartName="/xl/tables/table1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"/>':'')+'</Types>',
  '_rels/.rels':declaration+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
  'xl/workbook.xml':declaration+`<workbook xmlns="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets><sheet name="${xml(name)}" sheetId="1" r:id="rId1"/></sheets>${filterRange&&!table?`<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">${xml("'"+name.replace(/'/g,"''")+"'!"+filterRange)}</definedName></definedNames>`:''}</workbook>`,
  'xl/_rels/workbook.xml.rels':declaration+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
  ...(table?{
   'xl/worksheets/_rels/sheet1.xml.rels':declaration+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdTable1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/table" Target="../tables/table1.xml"/></Relationships>',
   'xl/tables/table1.xml':declaration+`<table xmlns="${ns}" id="1" name="ReservationsReportData" displayName="ReservationsReportData" ref="${table}" headerRowCount="1" totalsRowCount="0" totalsRowShown="0"><autoFilter ref="${table}">${buttons}</autoFilter><tableColumns count="${filterHeaders.length}">${filterHeaders.map((header,i)=>`<tableColumn id="${i+1}" name="${xml(header)}"/>`).join('')}</tableColumns><tableStyleInfo showFirstColumn="0" showLastColumn="0" showRowStripes="0" showColumnStripes="0"/></table>`
  }:{}),
  'xl/styles.xml':declaration+styles,'xl/worksheets/sheet1.xml':declaration+sheet
 });
}
