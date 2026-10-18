import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { exclusiveSettings, registerEnabledBrand } from "../src/client/settings/exclusive.js";
import { createThemeExclusion } from "../src/host/exclusive.js";
import { xiaoBackgroundPresentation } from "../src/client/background/presentation.js";
import { getXiaoThemeTokens } from "../src/client/theme/tokens.js";
import { xiaoPhaseMutationRelevant } from "../src/client/scene/phase-model.js";
import { deriveXiaoSessionPhase, readCompletionSignal, classifySettledRun, selectXiaoPendingInteraction } from "../src/client/session/compat.js";
import { installInteractionBridge } from "../src/client/interaction/interaction-bridge.js";

function scope(enabled, events = [], id = "scope") {
 let snapshot = { writable: true, value: { enabled, image: "retain" } };
 const listeners = new Set();
 return {
  getSnapshot: () => snapshot,
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  publish(value) { snapshot = { ...snapshot, value: { ...snapshot.value, ...value } }; for (const fn of listeners) fn(); },
  async mutate(ops) { events.push(id); for (const op of ops) this.publish({ [op.path[0]]: op.value }); return true; },
  listeners
 };
}
const events = [], a = scope(false, events, "xiao"), b = scope(true, events, "kinich");
const xiao = exclusiveSettings(a, b), kinich = exclusiveSettings(b, a, { winsTie: true });
let updates = 0; const unsubscribe = xiao.subscribe(() => updates++);
assert.equal(await xiao.set("enabled", true), true);
assert.deepEqual(events, ["kinich", "xiao"], "Peer must be off before enabling self");
assert.equal(b.getSnapshot().value.enabled, false);
assert.equal(xiao.getSnapshot().value.enabled, true);
assert.equal(kinich.getSnapshot().value.enabled, false);
assert.equal(b.getSnapshot().value.image, "retain");
assert.equal(updates, 2); unsubscribe(); assert.equal(a.listeners.size + b.listeners.size, 0);
await kinich.set("enabled", true);
assert.equal(xiao.getSnapshot().value.enabled, false);
assert.equal(kinich.getSnapshot().value.enabled, true);
// Legacy conflict: only one theme may render, even before Host repair.
a.publish({ enabled: true }); b.publish({ enabled: true });
assert.equal(xiao.getSnapshot().value.enabled, false);
assert.equal(kinich.getSnapshot().value.enabled, true);
assert.equal(xiao.getSnapshot(), xiao.getSnapshot(), "External store snapshots must be stable");
const reject = scope(true); reject.mutate = async () => false;
const off = scope(false); const guarded = exclusiveSettings(off, reject);
await assert.rejects(guarded.set("enabled", true), /could not be disabled/);
assert.equal(off.getSnapshot().value.enabled, false);
const oldPeer = scope(true); oldPeer.publish({ enabled: undefined, visualStyle: 'jungle' });
const oldGuard = exclusiveSettings(scope(true), oldPeer);
assert.equal(oldGuard.getSnapshot().value.enabled, false);
await assert.rejects(oldGuard.set('enabled', true), /Update the peer theme/);
const loadingPeer = {getSnapshot:()=>({status:'loading'}), subscribe:()=>()=>{}};
const loadingGuard = exclusiveSettings(scope(true),loadingPeer);
assert.equal(loadingGuard.getSnapshot().value.enabled,false);
await assert.rejects(loadingGuard.set('enabled',true),/still loading/);
const missingPeer = {getSnapshot:()=>({status:'unavailable',value:{enabled:true,visualStyle:'jungle'}}),subscribe:()=>()=>{}};
assert.equal(exclusiveSettings(scope(true),missingPeer).getSnapshot().value.enabled,true,'Unavailable peer must not retain ownership through a cached value');
const independent = exclusiveSettings(scope(false),scope(false));
await independent.set('enabled',true);
assert.equal(off.getSnapshot().value.enabled,false,'Independent Profile controls do not affect another Profile');
const legacy = scope(true); delete legacy.mutate; legacy.set = async (key, value) => { legacy.publish({ [key]: value }); return true; };
await exclusiveSettings(scope(false), legacy).set("enabled", true);
assert.equal(legacy.getSnapshot().value.enabled, false);
await Promise.all([xiao.set("enabled", true), kinich.set("enabled", true)]);
assert.ok(Number(xiao.getSnapshot().value.enabled) + Number(kinich.getSnapshot().value.enabled) <= 1);

// Real brand contribution ownership: toggles and teardown release registrations.
const brand = scope(true); let registrations = 0;
const dispose = registerEnabledBrand({ slots: { register() { registrations++; return () => registrations--; } } }, brand, {}, () => {});
assert.equal(registrations, 1); brand.publish({ enabled: false }); assert.equal(registrations, 0);
brand.publish({ enabled: true }); assert.equal(registrations, 1); dispose(); assert.equal(registrations, 0);
assert.equal(brand.listeners.size, 0);

// Host repair runs without a UI, persists across restart, and never edits data.
const rows = new Map([['dsh-kinich-theme', { enabled: true, background: "keep-a" }], ['dsh-xiao-theme', { enabled: true, background: "keep-b" }]]);
const errors = []; let mutations = 0, policy;
const settings = {
 describe: () => [...rows].map(([ns, value]) => ({ ns, value: { ...value }, revision: mutations })),
 async mutate(ns, ops, revision) { assert.equal(revision, mutations); mutations++; rows.set(ns, { ...rows.get(ns), enabled: ops[0].value }); policy.notify(ns); }
};
policy = createThemeExclusion(settings, error => errors.push(error));
await policy.flush(); assert.equal(rows.get('dsh-xiao-theme').enabled, false);
assert.equal(rows.get('dsh-kinich-theme').enabled, true);
rows.get('dsh-xiao-theme').enabled = true; await policy.flush();
assert.equal(rows.get('dsh-kinich-theme').enabled, false, "Latest explicit enable wins");
assert.equal(rows.get('dsh-xiao-theme').enabled, true);
assert.equal(rows.get('dsh-xiao-theme').background, "keep-b");
assert.equal(rows.get('dsh-kinich-theme').background, "keep-a");
policy.dispose(); const restarted = createThemeExclusion(settings, error => errors.push(error));
const beforeRestart = mutations; await restarted.flush(); assert.equal(mutations, beforeRestart);
restarted.dispose(); await restarted.flush(); assert.deepEqual(errors, []);
const failure = createThemeExclusion({ describe: () => ['dsh-kinich-theme','dsh-xiao-theme'].map(ns=>({ns,value:{enabled:true}})), mutate: async()=>{throw Error('disk full');} }, error=>errors.push(error));
await failure.flush(); assert.equal(errors.length, 1); failure.dispose();

const image = { enabled: true, backgroundEnabled: true, customBackgroundImage: "stored", customBackgroundAccent: "#229977", backgroundAutoPalette: true, backgroundVisibility: 75 };
assert.equal(xiaoBackgroundPresentation(image).visible, true);
for (const patch of [{ backgroundEnabled: false }, { backgroundVisibility: 0 }, { enabled: false }]) assert.equal(xiaoBackgroundPresentation({ ...image, ...patch }).visible, false);
assert.equal(xiaoBackgroundPresentation({ ...image, backgroundEnabled: false }).accent, "#229977");
assert.equal(xiaoBackgroundPresentation({ ...image, backgroundAutoPalette: false }).accent, "");
assert.equal(xiaoBackgroundPresentation({ ...image, enabled: false }).accent, "");
for (const visibility of [0, 5, 50, 75, 100]) for (const mode of ['light', 'dark']) {
 const tokens = getXiaoThemeTokens("#229977", true, visibility);
 for (const name of ['--dsw-alias-bg-overlay','--dsw-specific-menu','--dsw-specific-selector']) assert.match(tokens[name][mode], /^#[\da-f]{6}$/i);
 for (const [name, token] of Object.entries(tokens)) if (name.startsWith('--xiao-opaque-')) assert.match(token[mode], /^#[\da-f]{6}$/i);
 if (visibility === 0) assert.equal(tokens['--dsw-alias-bg-layer-1'][mode], mode === 'light' ? '#FAFCFB' : '#0E1B1E');
}
assert.equal(xiaoPhaseMutationRelevant([{type:'childList',addedNodes:[{nodeType:3}],removedNodes:[]}]), false);
assert.equal(xiaoPhaseMutationRelevant([{type:'childList',addedNodes:[{nodeType:1,matches:()=>false,querySelector:()=>null}],removedNodes:[]}]), false);
assert.equal(xiaoPhaseMutationRelevant([{type:'attributes',attributeName:'data-phase'}]), true);
assert.equal(xiaoPhaseMutationRelevant([{type:'childList',addedNodes:[],removedNodes:[{nodeType:1,matches:()=>true}]}]), true);
assert.equal(deriveXiaoSessionPhase({ running: true, pendingApproval: true }), 'awaiting-input');
const statuses = new Map([['main',{pendingInteraction:{kind:'question'}}],['background',{pendingInteraction:{kind:'approval'}}]]);
assert.equal(selectXiaoPendingInteraction(statuses,'main').kind,'question');
assert.equal(selectXiaoPendingInteraction(statuses,'missing'),undefined);
assert.equal(deriveXiaoSessionPhase({running:true}, selectXiaoPendingInteraction(statuses,'main')), 'awaiting-input');
assert.equal(deriveXiaoSessionPhase({error:true}, {kind:'question'}), 'failed');
assert.equal(deriveXiaoSessionPhase({running:true}, {kind:'answer-record'}), 'running');
assert.equal(classifySettledRun({stopReason: readCompletionSignal({finish_reason:'end_turn'}).reason}), 'completed');
assert.equal(classifySettledRun({}), 'ended');
const css = await readFile(new URL('../src/client/styles.css', import.meta.url), 'utf8');
assert.ok(css.includes("body[data-xiao-theme='on']:has(.xiao-welcome)"));
assert.ok(!css.includes("body:has([data-phase='hero'])"));
assert.ok(css.includes("[role='dialog']") && css.includes('--xiao-opaque-alias-bg-layer-2'));

// A click scheduled just before disabling cannot leave native DOM decoration.
const savedGlobals = Object.fromEntries(['document','window','Element','MutationObserver','CustomEvent'].map(key=>[key,globalThis[key]]));
try {
 const listeners = new Map(); let dispatched=0;
 class ElementStub { constructor(){this.dataset={};this.isConnected=true;} closest(selector){return selector.includes('button')?this:null;} }
 const action=new ElementStub();
 globalThis.Element=ElementStub;
 globalThis.CustomEvent=class {constructor(type,init){this.type=type;this.detail=init.detail;}};
 globalThis.MutationObserver=class {observe(){}disconnect(){}};
 globalThis.window={matchMedia:()=>({matches:false})};
 globalThis.document={body:{},visibilityState:'visible',addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener:type=>listeners.delete(type),dispatchEvent:()=>dispatched++};
 const release=installInteractionBridge();
 listeners.get('pointerdown')({button:0,pointerType:'mouse',clientX:1,clientY:2});
 listeners.get('click')({target:action,detail:1});
 release(); await new Promise(resolve=>setTimeout(resolve,5));
 assert.equal(dispatched,0);assert.equal(action.dataset.xiaoPressed,undefined);assert.equal(listeners.size,0);
 const releaseActive=installInteractionBridge();
 listeners.get('click')({target:action,detail:0});
 await new Promise(resolve=>setTimeout(resolve,5));
 assert.equal(action.dataset.xiaoPressed,'true');
 releaseActive();assert.equal(action.dataset.xiaoPressed,undefined);
} finally {for(const [key,value]of Object.entries(savedGlobals))if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
console.log('Upgrade behavior passed: exclusion, switching failure, startup/restart, branding, background zero/off, opaque surfaces, phase filtering, session fallback.');
