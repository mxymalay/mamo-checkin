const modes={email:['email'],moodle:['moodle'],ed:['ed'],'email-moodle':['email','moodle'],'email-ed':['email','ed'],'moodle-ed':['moodle','ed'],all:['email','moodle','ed']};

export function courseSourceMode(settings,course){
 const explicit=settings.sourceModes?.[course];
 if(explicit!==undefined)return Object.hasOwn(modes,explicit)?explicit:'';
 // Older configurations did not save the source selector separately.
 const sources=[...(settings.senders?.[course]?['email']:[]),...(settings.moodleUrls?.[course]?.length?['moodle']:[]),...(settings.edUrls?.[course]?.length?['ed']:[])];
 return sources.length===3?'all':sources.join('-');
}

export function courseUsesSource(settings,course,source){
 return modes[courseSourceMode(settings,course)]?.includes(source)||false;
}
