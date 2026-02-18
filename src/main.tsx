import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// One-time cache buster: clears stale data from previous broken versions
const CACHE_VERSION = "3";
if (localStorage.getItem("app_cache_version") !== CACHE_VERSION) {
  const keysToKeep = ["app_cache_version"];
  const saved: Record<string, string> = {};
  keysToKeep.forEach(k => { const v = localStorage.getItem(k); if (v) saved[k] = v; });
  localStorage.clear();
  sessionStorage.clear();
  Object.entries(saved).forEach(([k, v]) => localStorage.setItem(k, v));
  localStorage.setItem("app_cache_version", CACHE_VERSION);
  // Force fresh page load after clearing
  window.location.reload();
} else {
  createRoot(document.getElementById("root")!).render(<App />);
}
