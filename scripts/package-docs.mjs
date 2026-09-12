import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('..',import.meta.url));

function withoutLanguageHeading(value,heading){return value.replace(new RegExp(`^## ${heading}\\s*\\n`,'m'),'').trim()+'\n';}

function splitBilingual(value,marker){
 const index=value.indexOf(marker);
 if(index<0)throw new Error(`Missing language marker: ${marker}`);
 return {english:value.slice(0,index).trim()+'\n',chinese:value.slice(index+marker.length).trim()+'\n'};
}

function companionPlatformSection(value,platform){
 const marker=platform==='mac'?'### macOS 12+':'### Windows 10/11 x64';
 const start=value.indexOf(marker);
 if(start<0)throw new Error(`Missing platform section: ${marker}`);
 const next=value.indexOf('\n### ',start+marker.length);
 const tailMarker=value.indexOf(platform==='mac'?'\nDownloads must come':'\n请从',start);
 const boundaries=[next,tailMarker].filter(index=>index>=0);
 const end=boundaries.length?Math.min(...boundaries):value.length;
 const first=value.slice(0,start).trim();
 const selected=value.slice(start,end).trim();
 const tail=tailMarker<0?'':value.slice(tailMarker).trim();
 return [first,selected,tail].filter(Boolean).join('\n\n')+'\n';
}

export async function packageDocs({platform,kind}){
 if(!['mac','windows'].includes(platform)||kind!=='ocr')throw new Error('Unsupported package docs target');
 const source=await readFile(path.join(root,'OCR-INSTALL.md'),'utf8');
 const parts=splitBilingual(source,'\n## 中文');
 if(platform==='mac'){
  const english=parts.english.replace(/^# Mamo OCR companion \/ 马莫本机识别服务$/m,'# Mamo OCR companion');
  const chinese='# 马莫本机识别服务\n\n'+parts.chinese.replace(/^# 马莫本机识别服务\s*\n/m,'').trim()+'\n';
  return {readme:companionPlatformSection(withoutLanguageHeading(english,'English'),'mac'),chinese:companionPlatformSection(chinese,'mac')};
 }
 const english=parts.english.replace(/^# Mamo OCR companion \/ 马莫本机识别服务$/m,'# Mamo OCR companion');
 const chinese='# 马莫本机识别服务\n\n'+parts.chinese.replace(/^# 马莫本机识别服务\s*\n/m,'').trim()+'\n';
 return {readme:companionPlatformSection(withoutLanguageHeading(english,'English'),'windows'),chinese:companionPlatformSection(chinese,'windows')};
}

export async function writePackageDocs(outputDir,target){
 const docs=await packageDocs(target);await mkdir(outputDir,{recursive:true});
 await writeFile(path.join(outputDir,'README.md'),docs.readme);await writeFile(path.join(outputDir,'说明.md'),docs.chinese);
 return docs;
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
 const [platform,kind,outputDir]=process.argv.slice(2);
 if(!platform||!kind||!outputDir)throw new Error('Usage: node scripts/package-docs.mjs <mac|windows> ocr <output-dir>');
 await writePackageDocs(path.resolve(outputDir),{platform,kind});
}
