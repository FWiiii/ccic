import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

import "./assets/template/mu/static/css/sm.css";
import "./assets/template/mu/static/css/index.css";
import "./assets/template/mu/static/css/ui-new.css";
import "./assets/template/mu/static/css/search.css";
import "./assets/template/mu/static/css/complaints.css";
import "./assets/template/mu/static/css/pc-media.css";
import "./styles/app.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
