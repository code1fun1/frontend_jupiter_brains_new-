import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import jupiterBrainsLogo from "./assets/jupiter-brains-logo.png";

const setFavicon = (href: string) => {
  if (typeof document === 'undefined') return;

  const existing = document.querySelector('link#app-favicon') as HTMLLinkElement | null;
  if (existing) {
    existing.href = href;
    existing.type = 'image/png';
    return;
  }

  const link = document.createElement('link');
  link.id = 'app-favicon';
  link.rel = 'icon';
  link.type = 'image/png';
  link.href = href;
  document.head.appendChild(link);
};

setFavicon(jupiterBrainsLogo);

createRoot(document.getElementById("root")!).render(<App />);
