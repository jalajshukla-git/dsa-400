/* Shared registry so [MM:SS] timestamps can seek every embedded YouTube player
   on the page at once — via window event AND direct postMessage seekTo. */

const registry = new Set();

export function registerVideo(el) {
  if (el) registry.add(el);
  return () => { registry.delete(el); };
}

/* Dispatch a window event and seek all registered players to `seconds`. */
export function seekAllVideos(seconds) {
  window.dispatchEvent(new CustomEvent('dsa400:seek', { detail: { seconds } }));
  registry.forEach(el => {
    try {
      el.contentWindow && el.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: 'seekTo', args: [seconds] }), '*');
    } catch { /* cross-origin player not ready — ignore */ }
  });
}
