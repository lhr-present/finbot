import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import FINBOT9000 from "./finbot-v3.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <FINBOT9000 />
  </StrictMode>
);
