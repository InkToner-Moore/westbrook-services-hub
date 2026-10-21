import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { STAFF_VERSION_KEY } from './lib/staffVersion'

// Devices that chose the new staff app are sent to it before anything renders.
// Requests has no page in the new app, so it stays here.
// If this app is showing a /v2 URL, the new app is not served on this host (the
// GitHub Pages rollback): drop the choice and go back to the same page here.
let redirecting = false;
try {
  const { pathname, search, hash } = window.location;
  if (pathname === "/v2" || pathname.startsWith("/v2/")) {
    localStorage.setItem(STAFF_VERSION_KEY, "v1");
    window.location.replace((pathname.slice(3) || "/") + search + hash);
    redirecting = true;
  } else if (
    localStorage.getItem(STAFF_VERSION_KEY) === "v2" &&
    pathname.startsWith("/staff") &&
    !pathname.startsWith("/staff/requests")
  ) {
    window.location.replace("/v2" + pathname + search + hash);
    redirecting = true;
  }
} catch {
  // storage blocked: stay on this version
}

if (!redirecting) createRoot(document.getElementById("root")!).render(<App />);
