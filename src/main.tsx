import React from "react";
import ReactDOM from "react-dom/client";
import { AppShell } from "./components/AppShell";
import "./index.css";

// Fix viewport height on mobile (especially Android WebView)
function setViewportHeight() {
  const vh = window.visualViewport
    ? window.visualViewport.height * 0.01
    : window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

// Set initial viewport height
setViewportHeight();

// Update on resize (keyboard open/close, orientation change)
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', setViewportHeight);
  window.visualViewport.addEventListener('scroll', setViewportHeight);
} else {
  window.addEventListener('resize', setViewportHeight);
}

// Also update on orientation change
window.addEventListener('orientationchange', () => {
  setTimeout(setViewportHeight, 100);
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AppShell />
  </React.StrictMode>
);
