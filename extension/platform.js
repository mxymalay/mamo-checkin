export const isWindows = /Win/i.test(globalThis.navigator?.userAgentData?.platform || globalThis.navigator?.platform || '');
export const installerName = isWindows ? 'Install Windows OCR.exe' : 'Install Mac Recognition.command';
export const ocrEngine = isWindows ? 'Tesseract' : 'Apple Vision';
