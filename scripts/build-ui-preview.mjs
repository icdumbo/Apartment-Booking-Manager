import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {dirname,posix} from 'node:path';
// Package the real app into one offline preview, without introducing demo data.
const cache=new Map();
async function moduleURL(path){
 if(cache.has(path))return cache.get(path);
 let source=await readFile(path.split('?')[0],'utf8');
 const imports=[...source.matchAll(/from\s+(['"])(\.[^'"]+)\1/g)];
 for(const match of imports){const target=posix.normalize(posix.join(posix.dirname(path.split('?')[0]),match[2]));source=source.replace(match[0],`from ${JSON.stringify(await moduleURL(target))}`);}
 const url='data:text/javascript;base64,'+Buffer.from(source).toString('base64');cache.set(path,url);return url;
}
let html=await readFile('index.html','utf8');
const photo=await readFile('src/assets/welcome-seaside.jpg');
const styles=(await readFile('src/styles.css','utf8')).replace('url("./assets/welcome-seaside.jpg")',`url("data:image/jpeg;base64,${photo.toString('base64')}")`);
html=html.replace(/<link rel="stylesheet" href="src\/styles.css[^\"]*">/,`<style>${styles}</style>`);
html=html.replace(/<script type="module" src="src\/app.js[^\"]*"><\/script>/,`<script type="module" src="${await moduleURL('src/app.js')}"></script>`);
const output=process.argv[2]??'ui-preview/Apartment-Booking-Manager-UI.html';await mkdir(dirname(output),{recursive:true});await writeFile(output,html);console.log(output);
