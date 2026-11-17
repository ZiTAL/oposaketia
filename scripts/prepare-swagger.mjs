import {createRequire} from 'node:module';
import {mkdir,copyFile} from 'node:fs/promises';
import {join} from 'node:path';
const require=createRequire(import.meta.url);
const directory=require('swagger-ui-dist').getAbsoluteFSPath();
await mkdir('public/swagger-ui',{recursive:true});
for(const name of ['swagger-ui-bundle.js','swagger-ui.css','LICENSE'])await copyFile(join(directory,name),join('public/swagger-ui',name));
