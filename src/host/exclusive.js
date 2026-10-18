/** Reconcile legacy/raw config edits and other windows in the current Profile. */
export const EXCLUSIVE_THEMES = ["dsh-kinich-theme", "dsh-xiao-theme"];

export function createThemeExclusion(settings, report = () => {}) {
 let disposed = false, running = false, scheduled = false, dirty = false;
 let previous = new Map();
 const read = () => new Map(settings.describe().filter(row => EXCLUSIVE_THEMES.includes(row.ns))
  .map(row => [row.ns, { enabled: row.value?.enabled === true || (row.ns === EXCLUSIVE_THEMES[0] && row.value?.enabled === undefined), switchable: row.value?.enabled !== undefined, revision: row.revision }]));
 const flush = async () => {
  scheduled = false;
  if (disposed || running) return;
  running = true;
  try {
   do {
    dirty = false;
    const current = read();
    const active = EXCLUSIVE_THEMES.filter(ns => current.get(ns)?.enabled);
    if (active.length > 1) {
     // Explicit off -> on wins. Ambiguous startup or simultaneous edits have
     // a stable winner, independent of plugin registration order.
     const rising = active.filter(ns => previous.has(ns) && !previous.get(ns).enabled);
     const winner = active.find(ns => !current.get(ns).switchable) ?? (rising.length === 1 ? rising[0] : EXCLUSIVE_THEMES[0]);
     previous = current;
     const loser = active.find(ns => ns !== winner);
     const accepted = await settings.mutate(loser, [{ op: "set", path: ["enabled"], value: false }], current.get(loser).revision);
     if (accepted === false) throw new Error("Exclusive theme setting was refused");
    } else previous = current;
   } while (dirty && !disposed);
  } catch (error) { report(error); }
  finally { running = false; }
 };
 const notify = ns => {
  if (disposed || (ns !== undefined && !EXCLUSIVE_THEMES.includes(ns))) return;
  dirty = true;
  if (!running && !scheduled) { scheduled = true; queueMicrotask(flush); }
 };
 return { notify, flush, dispose() { disposed = true; } };
}

export function installThemeExclusion(ctx) {
 if (typeof ctx.settings.describe !== "function" || typeof ctx.settings.mutate !== "function") return () => {};
 const policy = createThemeExclusion(ctx.settings, error => ctx.logger?.error?.(error));
 const off = ctx.on("settings/document-updated", ns => policy.notify(ns));
 policy.notify();
 return () => { off?.(); policy.dispose(); };
}
