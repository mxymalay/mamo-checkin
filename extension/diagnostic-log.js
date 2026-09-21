let writing=Promise.resolve();
// Metadata only: never persist image bytes, full message bodies or credentials.
export function appendDiagnostic(storage,event){
  const entry={at:new Date().toISOString(),...event};
  writing=writing.catch(()=>{}).then(async()=>{
    const {diagnosticLog=[]}=await storage.get(['diagnosticLog']);
    await storage.set({diagnosticLog:[...diagnosticLog,entry].slice(-500)});
  });
  return writing.catch(error=>{console.warn('[mamo] Diagnostic storage unavailable:',error.message);});
}
