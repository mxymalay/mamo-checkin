import {readFile} from 'node:fs/promises';
import {loadBuiltinRules} from '../../extension/source-rules/builtins.js';
import {installSourceRuleRuntime} from '../../extension/source-rules/runtime.js';
export const builtins=await loadBuiltinRules({readJson:async url=>JSON.parse(await readFile(url,'utf8'))});
installSourceRuleRuntime(builtins);
