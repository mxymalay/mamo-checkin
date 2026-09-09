export const STORE_ID='mneachaobiledakoicnkinfdpcjkbnmm';
export function installCompanionDownload(box,{doc=document,isWindows=false,extensionId=globalThis.chrome?.runtime?.id}={}){
 const section=box.querySelector('[data-setup="install"]');
 const fullPackage=section.querySelector('a[href="https://github.com/mxymalay/mamo-checkin/releases/latest"]');
 const download=extensionId===STORE_ID?fullPackage:fullPackage.cloneNode(true);
 download.id='download-companion';download.className='identity-check companion-download';
 download.href='https://github.com/mxymalay/mamo-checkin/releases/latest/download/mamo-ocr-'+(isWindows?'windows':'mac')+'.zip';
 download.textContent=isWindows?'下载 Windows OCR 配套程序':'下载 Mac OCR 配套程序';
 section.querySelector('h2').after(download);
 const hint=doc.createElement('p');hint.className='muted';hint.textContent='此下载仅包含本机识别服务。无需开启开发者模式或再次安装扩展。';download.after(hint);
 const status=doc.createElement('p');status.id='companion-download-status';status.setAttribute('role','status');hint.after(status);
 download.addEventListener('click',()=>{status.textContent='请在浏览器下载列表确认下载完成，解压并运行安装程序。若下载失败，请重试；随后返回此页检测安装。';});
}
