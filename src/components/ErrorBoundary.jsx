import { Component } from 'react';

/** Without this, one thrown render error unmounts the entire tree and the player
 *  sees a blank page with no way back. A game should always offer an exit. */
export default class ErrorBoundary extends Component {
  state = { err: null };
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) { console.error('Squiggle crashed:', err, info); }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="card crashcard">
        <p className="bigemo" aria-hidden="true">🛟</p>
        <h2 className="shead">Something broke</h2>
        <p className="stubtext">Sorry — this one is on us. Your progress and streak are safe.</p>
        <button className="btn btn-primary wide"
          onClick={() => { this.setState({ err: null }); this.props.onReset?.(); }}>
          Back to home
        </button>
      </div>
    );
  }
}
