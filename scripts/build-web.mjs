import {mkdir,cp,readFile,writeFile,rm} from 'node:fs/promises';
// Package the Android commercial model without changing the published web app.
await rm('www',{recursive:true,force:true});
await mkdir('www',{recursive:true});
await writeFile('www/index.html',(await readFile('index.html','utf8')).replace('<html ','<html data-commercial-release="true" '));
await cp('src','www/src',{recursive:true});
console.log('Offline Android assets prepared in www/');
