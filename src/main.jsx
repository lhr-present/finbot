import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import FINBOT9000 from "./finbot-v3.jsx";
import { ErrorBoundary } from "./ErrorBoundary.jsx";

// ─── SENTRY: lazy error tracking (only loads when VITE_SENTRY_DSN is set) ─────
const SENTRY_DSN = import.meta.env?.VITE_SENTRY_DSN;
if (SENTRY_DSN) {
  import("@sentry/react").then(({ init, browserTracingIntegration }) => {
    init({
      dsn: SENTRY_DSN,
      integrations: [browserTracingIntegration()],
      tracesSampleRate: 0.1,
      environment: import.meta.env?.MODE || "production",
    });
  });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <FINBOT9000 />
    </ErrorBoundary>
  </StrictMode>
);
