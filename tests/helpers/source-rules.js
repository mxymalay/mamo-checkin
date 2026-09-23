export const fixtureRule=(overrides={})=>({schemaVersion:1,id:'community.example.images',version:'1.0.0',name:{en:'Demo images'},source:'moodle',courses:['DEMO1000'],images:{selectors:['.attendance img']},...overrides});
export function memoryStorage(initial={}){
  const values=structuredClone(initial);
  return {values,get:async keys=>Object.fromEntries(keys.map(k=>[k,structuredClone(values[k])])),set:async patch=>Object.assign(values,structuredClone(patch))};
}
