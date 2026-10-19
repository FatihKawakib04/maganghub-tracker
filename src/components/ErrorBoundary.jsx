import { Component } from "react";

// Menjaga app tetap tampil (bukan layar putih) bila ada error render.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info?.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="empty">
          <h2>Terjadi kesalahan</h2>
          <p className="muted">{String(this.state.error?.message || this.state.error)}</p>
          <button className="primary" onClick={() => this.setState({ error: null })}>Coba lagi</button>
        </div>
      );
    }
    return this.props.children;
  }
}
