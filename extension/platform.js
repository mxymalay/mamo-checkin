export const isWindows = /Win/i.test(globalThis.navigator?.userAgentData?.platform || globalThis.navigator?.platform || '');
export const installerName = 'Install Mac Recognition.command';
export const ocrEngine = isWindows ? 'Browser OCR' : 'Apple Vision';
