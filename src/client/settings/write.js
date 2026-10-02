/**
 * Serialized settings writer.
 *
 * Rapid adjustments must not race: every write is appended to a single chain so
 * the last user action always wins, and a failure rolls back only the fields it
 * actually changed.
 */
let chain = Promise.resolve();

async function commitXiaoSettings(settings, patch, previous) {
	const entries = Object.entries(patch);
	if (entries.length === 0) return;
	if (typeof settings.mutate === "function") {
		const accepted = await settings.mutate(entries.map(([field, value]) => ({ op: "set", path: [field], value })));
		if (accepted === false) throw new Error("Xiao settings mutation refused by DSH");
		return;
	}
	const applied = [];
	try {
		for (const [field, value] of entries) {
			if (await settings.set(field, value) === false) throw new Error("Xiao setting write refused by DSH");
			applied.push(field);
		}
	} catch (cause) {
		let partial = false;
		for (const field of applied.reverse()) {
			if (!Object.hasOwn(previous ?? {}, field)) { partial = true; continue; }
			try {
				if (await settings.set(field, previous[field]) === false) partial = true;
			} catch { partial = true; }
		}
		throw Object.assign(new Error("Xiao settings write failed", { cause }), { partial });
	}
}

export function writeXiaoSettings(settings, patch, previous = {}) {
	const run = () => commitXiaoSettings(settings, patch, previous);
	const next = chain.then(run, run);
	chain = next.catch(() => {});
	return next;
}

/** Test seam: wait for every queued write to settle. */
export function drainXiaoSettingsWrites() {
	return chain;
}
