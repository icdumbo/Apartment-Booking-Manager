// Streaming JSON envelope reader. Metadata is parsed as before; photos are consumed one at a time.
export async function* byteChunks(source){
 if(source instanceof Uint8Array){yield source;return;}
 if(source?.stream)source=source.stream();
 if(source?.getReader){const reader=source.getReader();try{for(;;){const {value,done}=await reader.read();if(done)break;yield value;}}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}return;}
 for await(const chunk of source)yield chunk;
}
export async function readBackupEnvelope(source,onPhoto){
 const iterator=byteChunks(source)[Symbol.asyncIterator](),decoder=new TextDecoder('utf-8',{fatal:true});let buffer='',position=0,ended=false;
 async function peek(){while(position===buffer.length&&!ended){const next=await iterator.next();buffer=decoder.decode(next.value??new Uint8Array(),{stream:!next.done});position=0;ended=Boolean(next.done);}return position<buffer.length?buffer[position]:'';}
 async function char(){const c=await peek();position++;return c;}
 async function space(){for(;;){if(await peek()==='')return;while(position<buffer.length&&/\s/.test(buffer[position]))position++;if(position<buffer.length)return;}}
 async function expect(c){await space();if(await char()!==c)throw Error('backupInvalid');}
 async function value(){
  await space();const parts=[];let depth=0,string=false,escape=false,started=false,stop=false;
  while(!stop){if(await peek()==='')break;const start=position;
   for(;position<buffer.length;position++){
    const c=buffer[position];
    if(started&&!string&&depth===0&&(c===','||c==='}'||c===']'||c===':'||/\s/.test(c))){stop=true;break;}
    started=true;
    if(string){if(escape)escape=false;else if(c==='\\')escape=true;else if(c==='"')string=false;}
    else if(c==='"')string=true;else if(c==='{'||c==='[')depth++;else if(c==='}'||c===']')depth--;
    if(depth<0)throw Error('backupInvalid');
   }
   parts.push(buffer.slice(start,position));
  }
  if(!started||depth||string)throw Error('backupInvalid');return JSON.parse(parts.join(''));
 }
 async function object(handler){
  await expect('{');const seen=new Set();await space();if(await peek()==='}'){await char();return;}
  for(;;){const key=await value();if(typeof key!=='string'||seen.has(key))throw Error('backupInvalid');seen.add(key);await expect(':');await handler(key);await space();const separator=await char();if(separator==='}')break;if(separator!==',')throw Error('backupInvalid');}
 }
 const root={},data={};
 try{
  await object(async key=>{
   if(!['format','version','createdAt','data'].includes(key))throw Error('backupInvalid');
   if(key!=='data'){root[key]=await value();return;}
   await object(async field=>{
    if(!['business','maintenance','drafts','preferences','photos'].includes(field))throw Error('backupInvalid');
    if(field!=='photos'){data[field]=await value();return;}
    data.photos=[];await expect('[');await space();if(await peek()===']'){await char();return;}
    for(;;){data.photos.push(await onPhoto(await value()));await space();const separator=await char();if(separator===']')break;if(separator!==',')throw Error('backupInvalid');}
   });root.data=data;
  });await space();if(await peek()!=='')throw Error('backupInvalid');return root;
 }finally{await iterator.return?.();}
}
