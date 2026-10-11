import { useEffect, useState } from 'react';
import { TOOL_TILES } from '@/components/shell/tiles';

const KEY = 'shell-hidden-tiles';
const EVENT = 'shell-hidden-tiles-change';

function readHiddenTiles(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(value)
      ? value.filter((key): key is string => TOOL_TILES.some((tile) => tile.key === key))
      : [];
  } catch {
    return [];
  }
}

export function useHiddenTiles() {
  const [hiddenTiles, setHiddenTiles] = useState(readHiddenTiles);
  useEffect(() => {
    const refresh = () => setHiddenTiles(readHiddenTiles());
    window.addEventListener('storage', refresh);
    window.addEventListener(EVENT, refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener(EVENT, refresh);
    };
  }, []);

  const setVisible = (key: string, visible: boolean) => {
    if (!TOOL_TILES.some((tile) => tile.key === key)) return;
    const current = readHiddenTiles().filter((item) => item !== key);
    const next = visible ? current : [...current, key];
    setHiddenTiles(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(EVENT));
    } catch {
      // Keep the choice on this page when storage is unavailable.
    }
  };
  return { hiddenTiles, setVisible };
}
