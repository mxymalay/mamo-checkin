export const STORE_ID='mneachaobiledakoicnkinfdpcjkbnmm';
export function installCompanionDownload(box,{doc=document,isWindows=false,extensionId=globalThis.chrome?.runtime?.id}={}){
 if(extensionId!==STORE_ID)return;
 const section=box.querySelector('[data-setup="install"]');
 const fullPackage=section.querySelector('a[href="https://github.com/mxymalay/mamo-checkin/releases/latest"]');
 const download=fullPackage;
 download.id='download-companion';download.className='identity-check companion-download';
 download.href='https://github.com/mxymalay/mamo-checkin/releases/latest/download/mamo-ocr-'+(isWindows?'windows':'mac')+'.zip';
 download.textContent=isWindows?'下载 Windows OCR 配套程序':'下载 Mac OCR 配套程序';
 section.querySelector('h2').after(download);
 const hint=doc.createElement('p');hint.className='muted';hint.textContent='请下载后解压。随后进行以下步骤。';download.after(hint);
 const status=doc.createElement('p');status.id='companion-download-status';status.setAttribute('role','status');hint.after(status);
 download.addEventListener('click',()=>{status.textContent='请下载后解压，随后按下方步骤操作。';});
}
