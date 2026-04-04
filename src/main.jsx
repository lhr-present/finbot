import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import FINBOT9000 from "./finbot-v3.jsx";
import { ErrorBoundary } from "./ErrorBoundary.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <FINBOT9000 />
    </ErrorBoundary>
  </StrictMode>
);
