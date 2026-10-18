/** Hiding a background never erases the stored image or the sampled accent. */
export function xiaoBackgroundPresentation(value) {
 const visibility = typeof value.backgroundVisibility === "number" && Number.isFinite(value.backgroundVisibility)
  ? Math.min(100, Math.max(0, value.backgroundVisibility)) : 75;
 const image = typeof value.customBackgroundImage === "string" ? value.customBackgroundImage : "";
 return {
  visible: value.enabled === true && value.backgroundEnabled !== false && Boolean(image) && visibility > 0,
  visibility,
  accent: value.enabled === true && image && value.backgroundAutoPalette === true ? value.customBackgroundAccent : ""
 };
}
