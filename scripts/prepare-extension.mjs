import {mkdir,copyFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {VENDOR} from './ocr-vendor.mjs';

const root=new URL('../',import.meta.url);
export async function prepareExtension(target=new URL('extension/',root)){
 await mkdir(new URL('vendor/',target),{recursive:true});
 for(const [destination,source] of VENDOR)await copyFile(new URL(source,root),new URL(destination,target));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 await prepareExtension();console.log('Local OCR assets prepared in extension/vendor.');
}
