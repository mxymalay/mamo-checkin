export const isWindows = /Win/i.test(globalThis.navigator?.userAgentData?.platform || globalThis.navigator?.platform || '');
export const installerName = isWindows ? 'Install Windows OCR.exe' : '安装Mac识别服务.command';
export const ocrEngine = isWindows ? 'Tesseract' : 'Apple Vision';
