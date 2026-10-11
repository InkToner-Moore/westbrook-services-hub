import { useLayoutEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { startInstallListening } from '@/lib/installPrompt';

let mounts = 0;
let restore: (() => void) | null = null;
const attach = () => {
  const cleanups: (() => void)[] = [];
  const set = (selector: string, tag: 'link' | 'meta', attributes: Record<string, string>) => {
    const existing = document.head.querySelector(selector);
    const element = existing || document.createElement(tag);
    const previous = Object.keys(attributes).map((key) => [key, element.getAttribute(key)]);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    if (!existing) document.head.appendChild(element);
    cleanups.push(() => {
      if (!existing) element.remove();
      else previous.forEach(([key, value]) => {
        if (value === null) element.removeAttribute(key);
        else element.setAttribute(key, value);
      });
    });
  };
  const base = import.meta.env.BASE_URL;
  set('link[rel="manifest"]', 'link', { rel: 'manifest', href: `${base}staff.webmanifest` });
  set('link[rel="apple-touch-icon"]', 'link', {
    rel: 'apple-touch-icon', href: `${base}icons/apple-touch-icon.png`,
  });
  Object.entries({
    'apple-mobile-web-app-capable': 'yes',
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-title': 'ITM Dashboard',
    'apple-mobile-web-app-status-bar-style': 'default',
  }).forEach(([name, content]) => set(`meta[name="${name}"]`, 'meta', { name, content }));
  const title = document.title;
  document.title = 'ITM Dashboard';
  cleanups.push(() => { document.title = title; });
  const theme = document.head.querySelector('meta[name="theme-color"]');
  const previousTheme = theme?.getAttribute('content');
  cleanups.push(() => {
    if (previousTheme === null) theme?.removeAttribute('content');
    else if (previousTheme !== undefined) theme?.setAttribute('content', previousTheme);
  });
  cleanups.push(startInstallListening());
  return () => cleanups.reverse().forEach((cleanup) => cleanup());
};
export const useStaffAppMeta = () => {
  const { isDarkMode } = useTheme();
  useLayoutEffect(() => {
    if (mounts++ === 0) restore = attach();
    return () => {
      if (--mounts === 0) { restore?.(); restore = null; }
    };
  }, []);
  useLayoutEffect(() => {
    document.head.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content', isDarkMode ? '#0e1014' : '#f6f5f2',
    );
  }, [isDarkMode]);
};
