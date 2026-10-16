/* Tiny hash-free router over the History API.

   Hand-rolled rather than react-router: the whole app is five routes with no nested
   layouts or loaders, so a dependency would cost more bytes than it saves lines.

   Routes:
     /                 home
     /play             today's set
     /game/:id         one game, five questions
     /results          the last completed set
     /archive/:date    a past day (YYYY-MM-DD)
     anything else     notfound
*/
import { SLOTS } from './schedule.js';

/** The eight real game ids. `/game/bogus` used to render an empty shell because
 *  nothing validated the param — the page had chrome and no content. */
const GAME_IDS = new Set(SLOTS);

export function parse(pathname = location.pathname) {
  const p = pathname.replace(/\/+$/, '') || '/';
  if (p === '/' || p === '') return { name: 'home' };
  if (p === '/play') return { name: 'play' };
  if (p === '/results') return { name: 'results' };
  const g = p.match(/^\/game\/([a-z]+)$/i);
  if (g) return GAME_IDS.has(g[1].toLowerCase())
    ? { name: 'game', id: g[1].toLowerCase() }
    : { name: 'notfound', path: p };
  if (p === '/archive') return { name: 'archive' };
  if (p === '/about') return { name: 'about' };
  const a = p.match(/^\/archive\/(\d{4}-\d{2}-\d{2})$/);
  if (a) return { name: 'archive', date: a[1] };
  // Rendering home under /nonexistent-page is a lie: the URL says one thing and
  // the page says another, and a crawler indexes the wrong thing.
  return { name: 'notfound', path: p };
}

export function href(route) {
  switch (route.name) {
    case 'play': return '/play';
    case 'results': return '/results';
    case 'game': return '/game/' + route.id;
    case 'archive': return route.date ? '/archive/' + route.date : '/archive';
    case 'about': return '/about';
    default: return '/';
  }
}

/** Push a route and scroll to top. Replace when the URL should not stack — moving
 *  from a finished game to its results should not make Back re-enter the game. */
export function go(route, { replace = false } = {}) {
  const url = href(route);
  if (url !== location.pathname) {
    history[replace ? 'replaceState' : 'pushState']({}, '', url);
  }
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, behavior: 'auto' });
}

export function onRouteChange(fn) {
  const handler = () => fn(parse());
  window.addEventListener('popstate', handler);
  return () => window.removeEventListener('popstate', handler);
}
