import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function harness(ga='',meta='') {
 let consent=false; const requests=[], effects=[], cleanup=[],calls=[];
 const window={location:{pathname:'/vuelos'}};
 const document={createElement:()=>({remove(){this.removed=true;}}),head:{appendChild:s=>requests.push(s)}};
 function module(file,mocks={}) { const exports={}; const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText; vm.runInNewContext(code,{exports,window,document,process:{env:{NEXT_PUBLIC_GA4_ID:ga,NEXT_PUBLIC_META_PIXEL_ID:meta}},require:n=>mocks[n]||{},console,Date});return exports; }
 const helper=module('src/lib/analytics.ts');
 const jsx=(type,props)=>({type,props});
 const component=module('src/components/analytics.tsx',{'react':{useEffect:fn=>effects.push(fn)},'react/jsx-runtime':{jsx,jsxs:jsx},'next/navigation':{usePathname:()=>'/vuelos'},'@/components/cookie-consent':{useCookieConsent:()=>({canTrack:consent}),ConsentGate:({children})=>consent?children:null}});
 function render(node){if(!node)return;if(typeof node.type==='function')render(node.type(node.props));}
 function mount(value){consent=value;render({type:component.Analytics,props:{}});while(effects.length){const fn=effects.shift()();if(fn)cleanup.push(fn)}}
 return {window,requests,calls,helper,mount,revoke(){window.viatourAnalytics.consent=false;while(cleanup.length)cleanup.pop()();},ready(){requests.filter(s=>!s.removed).forEach(s=>s.onload?.());window.gtag=(...args)=>calls.push(['ga',...args]);window.fbq=(...args)=>calls.push(['meta',...args]);}};
}
test('empty IDs never create vendor requests, even after acceptance',()=>{const h=harness();h.mount(false);assert.equal(h.requests.length,0);h.mount(true);assert.equal(h.requests.length,0);h.helper.trackEvent('quote_submit',{status:'saved'});assert.equal(h.calls.length,0)});
test('configured vendors load only after consent; events require loaded vendors; revocation blocks events',()=>{const h=harness('G-TESTONLY','123456789');h.mount(false);h.helper.trackEvent('quote_submit');assert.equal(h.requests.length,0);h.mount(true);assert.equal(h.requests.length,2);assert.ok(h.requests[0].src.startsWith('https://www.googletagmanager.com/gtag/js?id='));assert.ok(h.requests[1].src.startsWith('https://connect.facebook.net/'));h.helper.trackEvent('quote_submit');assert.equal(h.calls.length,0);h.ready();h.helper.trackEvent('quote_submit',{service:'Vuelos',status:'saved',email:'must-never-send'});assert.equal(h.calls.length,2);assert.equal(h.calls[0][3].service,'vuelos');assert.equal(h.calls[0][3].email,undefined);h.revoke();const count=h.calls.length;h.helper.trackEvent('quote_submit');assert.equal(h.calls.length,count)});
test('late script loads cannot initialize vendors after consent is withdrawn',()=>{const h=harness('G-TESTONLY','123456789');h.mount(true);const callbacks=h.requests.map(s=>s.onload);h.revoke();callbacks.forEach(fn=>fn());assert.equal(h.window.viatourAnalytics.ga,false);assert.equal(h.window.viatourAnalytics.meta,false)});
test('invalid IDs are ignored',()=>{const h=harness('invalid','invalid');h.mount(true);assert.equal(h.requests.length,0)});
