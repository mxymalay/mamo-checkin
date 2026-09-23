export function ruleWasTested(rule,state,course){
 const key=rule.key||rule.id,proof=state.tests?.[key]?.[course];
 return Boolean(rule.digest&&proof?.digest===rule.digest&&proof.source===rule.source&&!proof.skipped);
}
export function ruleCanMatch(rule,state,course){const proof=state.tests?.[rule.key||rule.id]?.[course];return ruleWasTested(rule,state,course)||Boolean(rule.digest&&proof?.digest===rule.digest&&proof.source===rule.source&&proof.skipped);}
export function ruleHasTest(rule,state){return rule.courses.some(course=>ruleWasTested(rule,state,course));}

export function approvedTestRules(report){
 if(report.busy||report.phase!=='complete'||report.truncated||!report.course||!report.images?.length)throw new Error('rule-test-not-passed');
 if(report.images.some(image=>!['downloaded','recognized'].includes(image.state)))throw new Error('rule-test-not-passed');
 const rules=(report.rules||[]).filter(rule=>!rule.id.startsWith('builtin.'));
 if((!rules.length&&report.mode!=='builtin')||rules.some(rule=>!report.images.some(image=>(image.matches||[]).some(match=>(match.key||match.id)===(rule.key||rule.id)))))throw new Error('rule-test-not-passed');
 return rules;
}
