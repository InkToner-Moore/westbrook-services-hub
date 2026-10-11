import { loadShopSettings } from './lib/shopSettings'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

void loadShopSettings();

createRoot(document.getElementById("root")!).render(<App />);
