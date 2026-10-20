import { GAMES } from '../games.jsx';
import { BRAND } from '../brand.js';

/* A real 404. Rendering home under /nonexistent-page meant the URL and the page
   disagreed, which confuses a person who mistyped and confuses a crawler more. */
export default function NotFound({ path, onHome, onPlayGame }) {
  return (
    <div className="card notfound">
      <p className="bigemo" aria-hidden="true">🧭</p>
      <h2>That page does not exist</h2>
      {path && <p className="stubtext"><code>{path}</code> is not a {BRAND.name} page.</p>}
      <button className="btn btn-primary wide" onClick={onHome}>Go to today’s set</button>
      <p className="shead" style={{ marginTop: 18 }}>Or try one game</p>
      <div className="nfgames">
        {Object.entries(GAMES).map(([id, g]) => (
          <button key={id} className="btn btn-ghost" onClick={() => onPlayGame(id)}>{g.name}</button>
        ))}
      </div>
    </div>
  );
}
