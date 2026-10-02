/** Minimal assertion helper shared by the Node test scripts. */
let passed = 0;
const failures = [];

export function check(condition, message) {
	if (condition) {
		passed += 1;
		return;
	}
	failures.push(message);
}

export function equal(actual, expected, message) {
	const a = JSON.stringify(actual);
	const b = JSON.stringify(expected);
	check(a === b, `${message} (expected ${b}, received ${a})`);
}

export function close(actual, expected, tolerance, message) {
	check(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
		`${message} (expected ~${expected}, received ${actual})`);
}

export function finish(title) {
	if (failures.length > 0) {
		console.error(`${title} failed (${failures.length} issue${failures.length === 1 ? "" : "s"}):`);
		for (const failure of failures) console.error(`- ${failure}`);
		process.exit(1);
	}
	console.log(`${title} passed (${passed} assertions).`);
}
