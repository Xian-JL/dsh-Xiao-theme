import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { check, equal, finish } from "./test-helpers.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** A React stub is enough: the built bundle only touches hooks inside components. */
function reactStub() {
	const missing = name => () => { throw new Error(`component hook ${name} must not run at registration time`); };
	return new Proxy({ createElement: () => null, useCallback: fn => fn, useRef: value => ({ current: value }),
		useState: value => [typeof value === "function" ? value() : value, () => {}],
		useEffect: () => {}, useLayoutEffect: () => {}, useSyncExternalStore: () => ({}) }, {
		get(target, property) {
			if (property in target) return target[property];
			return missing(String(property));
		}
	});
}

// --- client bundle registration --------------------------------------------
const clientSource = await readFile(resolve(ROOT, "lib/client.js"), "utf8");
let registration = null;
const windowStub = {
	__ModuleLoader__: {
		load(entry) { registration = entry; }
	},
	matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} })
};
const requireStub = name => {
	if (name === "react" || name === "react/jsx-runtime") return reactStub();
	throw new Error(`unexpected external module in the client bundle: ${name}`);
};

// A minimal DOM stub lets the built bundle exercise its real mount/teardown paths.
const listeners = new Set();
let styleTag = null;
let styleTagRemoved = false;
const documentStub = {
	activeElement: null,
	addEventListener(type, handler) { listeners.add(`${type}:${typeof handler}`); },
	body: { dataset: {} },
	createElement() {
		styleTag = {
			dataset: {},
			remove() { styleTagRemoved = true; },
			textContent: ""
		};
		return styleTag;
	},
	head: { appendChild(tag) { check(tag === styleTag, "the stylesheet tag is appended to head"); } },
	querySelector: () => null,
	removeEventListener(type, handler) { listeners.delete(`${type}:${typeof handler}`); },
	visibilityState: "visible"
};
class MutationObserverStub {
	constructor(callback) { this.callback = callback; this.observed = null; }
	disconnect() { this.disconnected = true; }
	observe(target, options) { this.observed = { options, target }; }
}

// eslint-disable-next-line no-new-func
new Function("window", "document", "MutationObserver", "requestAnimationFrame", "cancelAnimationFrame", clientSource)(
	windowStub, documentStub, MutationObserverStub, () => 0, () => {}
);
check(registration !== null, "the client bundle must register itself with the module loader");
equal(registration?.id, "dsh-xiao-theme", "the client module id is the package name");

const clientModule = registration.factory(requireStub);
equal(typeof clientModule.apply, "function", "the client module must export apply()");
equal(clientModule.inject, ["theme", "slots", "locale", "connection", "remote"], "the client must declare its services");

const slots = [];
const localeRegistrations = [];
const effectLabels = [];
const disposers = [];
const scopeBinds = [];
const fakeSettingsScope = {
	bind(options) { scopeBinds.push(options); return { getSnapshot: () => ({}), subscribe: () => () => {} }; },
	getSnapshot: () => ({}),
	subscribe: () => () => {}
};
const clientCtx = {
	effect(fn, label) {
		effectLabels.push(String(label));
		const dispose = fn();
		if (typeof dispose === "function") disposers.push(dispose);
		return typeof dispose === "function" ? dispose : () => {};
	},
	get(name) {
		if (name === "configForms") return undefined;
		if (name === "settingsScope") return fakeSettingsScope;
		return undefined;
	},
	locale: { register(namespace, dictionary) { localeRegistrations.push({ dictionary, namespace }); } },
	slots: {
		inject(name, register) { slots.push(name); register(); },
		register(definition, component) {
			check(typeof component === "function", `slot ${definition.name} must be given a component`);
			return () => {};
		}
	},
	theme: { overrideTokens: () => () => {} }
};

clientModule.apply(clientCtx);
equal(slots.sort(), [
	"conversation.composer.dock",
	"conversation.hero.brand.mark",
	"settings.section",
	"shell.overlay",
	"sidebar.brand.mark",
	"sidebar.brand.name"
], "every required client slot is registered");
equal(localeRegistrations.length, 1, "exactly one locale dictionary is registered");
equal(localeRegistrations[0].namespace, "settings.xiao-theme", "the locale namespace is xiao-scoped");
check(Object.keys(localeRegistrations[0].dictionary).sort().join() === "en,zh", "both interface languages are provided");
check(Object.keys(localeRegistrations[0].dictionary.zh).length > 90, "the Chinese dictionary is complete");
const missingEnglish = Object.keys(localeRegistrations[0].dictionary.zh)
	.filter(key => !(key in localeRegistrations[0].dictionary.en));
equal(missingEnglish, [], "every Chinese key has an English counterpart");
equal(scopeBinds.length, 1, "the client binds one settings namespace");
equal(scopeBinds[0].namespace, "dsh-xiao-theme", "the settings namespace is xiao-scoped");
check(typeof scopeBinds[0].decode === "function", "the settings binding supplies a decoder");
check(effectLabels.some(label => label.includes("stylesheet")), "the stylesheet effect is registered");
check(effectLabels.some(label => label.includes("interaction feedback")), "the interaction effect is registered");
check(effectLabels.some(label => label.includes("credential changes")), "the credential watch is owned by the plugin");
equal(styleTag?.dataset?.plugin, "dsh-xiao-theme", "the mounted stylesheet is tagged with the plugin id");
equal(styleTag?.dataset?.pluginCss, "dsh-xiao-theme/xiao-layer.css", "the stylesheet has a stable identity");
check(styleTag?.textContent?.includes(".xiao-overlay") === true, "the mounted stylesheet carries the authored rules");
equal(listeners.size, 5, "the interaction bridge installs its five host listeners");

for (const dispose of disposers) dispose();
equal(listeners.size, 0, "disposing the plugin removes every host listener");
check(styleTagRemoved, "disposing the plugin removes its stylesheet");

// --- host bundle registration ----------------------------------------------
const hostModule = await import(pathToFileURL(resolve(ROOT, "lib/index.js")).href);
equal(hostModule.name, "dsh-xiao-theme", "the host module name is the package name");
check(typeof hostModule.Config === "function", "the host module exposes a Config schema");

let registeredSettings = null;
let registeredRoute = null;
const hostCtx = {
	fiber: {},
	inject(services, callback) {
		callback({
			credentials: { async resolve() { return undefined; } },
			connection: { fetch: { register(definition) { registeredRoute = definition; } } },
			effect(fn) { const dispose = fn(); return typeof dispose === "function" ? dispose : () => {}; },
			settings: {
				describe: () => [],
				get: () => ({}),
				register(namespace, schema, options) { registeredSettings = { namespace, options, schema }; }
			}
		});
	}
};

hostModule.apply(hostCtx);
equal(registeredSettings?.namespace, "dsh-xiao-theme", "the host registers the xiao settings namespace");
equal(registeredSettings?.options, { applies: "live" }, "settings apply live");
check(typeof registeredSettings?.schema === "function", "the host registers a schemastery schema");
equal(typeof registeredRoute?.fetch, "function", "the host registers the balance route");
equal(registeredRoute?.path, "/api/xiao-balance", "the balance route path is xiao-scoped");
equal(registeredRoute?.methods, ["GET"], "the balance route only accepts GET");

// Without a resolved credential the route must answer unbound instead of failing.
const unbound = await registeredRoute.fetch(new Request("http://localhost/api/xiao-balance"));
const unboundBody = await unbound.json();
equal(unbound.status, 200, "the balance route answers even without a credential");
equal(unboundBody.status, "unbound", "a missing credential is reported as unbound");
check(!JSON.stringify(unboundBody).includes("sk-"), "the route never echoes key material");
equal(unbound.headers.get("cache-control"), "private, no-store", "balance answers must not be cached by the browser");

// With a credential the route reaches the official endpoint only.
let fetchedURL = null;
const officialCtx = {
	fiber: {},
	inject(services, callback) {
		callback({
			credentials: { async resolve() { return { source: "env", value: "sk-test-value" }; } },
			connection: { fetch: { register(definition) { registeredRoute = definition; } } },
			effect(fn) { return fn() ?? (() => {}); },
			settings: {
				describe: () => [],
				get: key => (key === "llm-deepseek" ? { apiKeyEnv: "DEEPSEEK_API_KEY", baseURL: "https://api.deepseek.com" } : {}),
				register() {}
			}
		});
	}
};
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => {
	fetchedURL = { authorization: options?.headers?.authorization, url: String(url) };
	return new Response(JSON.stringify({ balance_infos: [{ currency: "CNY", granted_balance: "0", topped_up_balance: "5.00", total_balance: "5.00" }], is_available: true }), {
		headers: { "content-type": "application/json" },
		status: 200
	});
};
hostModule.apply(officialCtx);
const bound = await registeredRoute.fetch(new Request("http://localhost/api/xiao-balance?force=1"));
const boundBody = await bound.json();
globalThis.fetch = originalFetch;
equal(fetchedURL?.url, "https://api.deepseek.com/user/balance", "the host only queries the official balance endpoint");
equal(fetchedURL?.authorization, "Bearer sk-test-value", "the host authorises with the resolved credential");
equal(boundBody.status, "ready", "a successful read is reported as ready");
equal(boundBody.totalBalance, "5.00", "the balance amount is passed through");
check(typeof boundBody.bindingId === "string" && !boundBody.bindingId.includes("sk-test-value"),
	"the response identifies the credential binding without exposing the key");
check(!JSON.stringify(boundBody).includes("sk-test-value"), "the response never contains the secret");

finish("built bundles");
