import {mkdir,cp,copyFile,rm} from 'node:fs/promises';
// Copy the unchanged BASIC app, never browser data or remote URLs.
await rm('www',{recursive:true,force:true});
await mkdir('www',{recursive:true});
await copyFile('index.html','www/index.html');
await cp('src','www/src',{recursive:true});
console.log('Offline BASIC assets prepared in www/');
