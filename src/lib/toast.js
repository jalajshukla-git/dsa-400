/* tiny toast bus — App binds a state setter; anything can call toast('…') */
let setter = null;
let timer = null;
export function bindToast(fn) { setter = fn; }
export function toast(html) {
  if (!setter) return;
  setter({ html, key: Date.now() });
  clearTimeout(timer);
  timer = setTimeout(() => setter(null), 2600);
}
