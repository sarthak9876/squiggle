import { href, go } from '../lib/router.js';

/* Internal navigation that is actually a link.

   The footer used <button onClick={() => go(...)}>. Those destinations are real
   pages with real URLs — /about, /privacy, /terms, /archive — and a button has
   no href, so none of them could be middle-clicked, cmd-clicked, copied with
   "copy link address", opened in a new tab, or followed by a crawler. Screen
   readers announced four buttons where the user was looking for four links.

   The onClick only takes over for a PLAIN left click. A modified click (cmd,
   ctrl, shift, alt) or a middle click falls through to the browser, which is
   the entire reason for using an anchor instead of a button. */
export default function Lnk({ route, children, ...rest }) {
  const url = href(route);
  const onClick = e => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    go(route);
  };
  return <a href={url} onClick={onClick} {...rest}>{children}</a>;
}
