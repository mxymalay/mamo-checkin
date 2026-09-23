export const modulesView=`
<a id="back-settings" class="back-settings" href="#settings"><span aria-hidden="true">←</span> <span>rules.back-settings</span></a>
<nav class="module-tabs" role="tablist" aria-label="rules.page-title">
<button id="module-tab-recognition" type="button" role="tab" data-module-tab="recognition" aria-controls="module-recognition" aria-selected="true">rules.recognition-title</button>
<button id="module-tab-library" type="button" role="tab" data-module-tab="library" aria-controls="rule-manager" aria-selected="false" tabindex="-1">rules.library</button>
<button id="module-tab-test" type="button" role="tab" data-module-tab="test" aria-controls="module-test" aria-selected="false" tabindex="-1">rules.test-title</button>
<button id="module-tab-matching" type="button" role="tab" data-module-tab="matching" aria-controls="rule-bindings" aria-selected="false" tabindex="-1">rules.matching</button>
</nav>
<div id="modules-notice" role="status" hidden></div>
<section id="module-recognition" class="recognition-settings modules-section" data-module-panel="recognition" role="tabpanel" aria-labelledby="module-tab-recognition">
<div class="connection"><span class="dot" aria-hidden="true"></span><div><strong id="health" role="status">rules.engine-checking</strong><p class="muted" id="engine-desc"></p></div></div>
<div class="recognition-actions"><button id="check-health" type="button" class="primary">rules.engine-check</button><button id="prefer-companion" type="button" class="subtle" hidden>rules.install-vision</button></div>
</section>
<section id="rule-manager" class="modules-section" data-module-panel="library" role="tabpanel" aria-labelledby="module-tab-library" hidden></section>
<section id="rule-bindings" class="modules-section" data-module-panel="matching" role="tabpanel" aria-labelledby="module-tab-matching" hidden></section>
<section id="module-test" class="modules-section" data-module-panel="test" role="tabpanel" aria-labelledby="module-tab-test" hidden><div id="rule-test" hidden></div></section>`;
