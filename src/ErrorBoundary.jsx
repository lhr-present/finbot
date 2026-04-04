// ─── ERROR BOUNDARY ───────────────────────────────────────────────────────────
// Catches render/effect crashes and shows a recovery UI instead of blank screen.

import { Component } from "react";
import { st, initialState } from "./engine/store.js";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Log to console — could POST to an error tracking service here
    console.error("[FINBOT-9000] Unhandled render error:", error, info.componentStack);
  }

  handleReset = () => {
    // Reset Zustand store to initial state, then clear the error
    try {
      const { apiKey, soundOn } = { ...initialState };
      st({ ...initialState, apiKey, soundOn });
    } catch {}
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    const msg = this.state.error?.message || "Unknown error";

    return (
      <div style={{ background: "#0a0a0a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace" }}>
        <div style={{ maxWidth: 480, padding: "40px 32px", border: "1px solid #ff2222", boxShadow: "0 0 32px #ff222244" }}>
          <div style={{ fontSize: 10, color: "#ff2222", letterSpacing: 5, marginBottom: 20 }}>
            ⚠ SYSTEM FAULT
          </div>
          <div style={{ fontSize: 18, color: "#e0e0e0", marginBottom: 12 }}>
            FINBOT-9000 CRASHED
          </div>
          <div style={{ fontSize: 11, color: "#555", lineHeight: 1.7, marginBottom: 24, fontFamily: "monospace", background: "#0d0d0d", padding: "10px 14px", borderLeft: "2px solid #ff2222" }}>
            {msg}
          </div>
          <div style={{ fontSize: 10, color: "#444", marginBottom: 28, lineHeight: 1.8 }}>
            Your session data has been cleared.<br />
            The error has been logged to the console.
          </div>
          <button
            onClick={this.handleReset}
            style={{ background: "none", border: "1px solid #ff2222", color: "#ff2222", padding: "10px 24px", cursor: "pointer", fontFamily: "monospace", fontSize: 12, letterSpacing: 2, width: "100%" }}
          >
            REINITIALIZE SYSTEM →
          </button>
        </div>
      </div>
    );
  }
}
