import { useSyncExternalStore } from 'react';

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
let pending: InstallPromptEvent | null = null;
let appInstalled = false;
let users = 0;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());
const displayMode = window.matchMedia('(display-mode: standalone)');
export const isStandalone = () => displayMode.matches ||
  !!(navigator as Navigator & { standalone?: boolean }).standalone;
const onPrompt = (event: Event) => {
  event.preventDefault();
  pending = event as InstallPromptEvent;
  notify();
};
const onInstalled = () => { appInstalled = true; pending = null; notify(); };
export const startInstallListening = () => {
  if (users++ === 0) {
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    displayMode.addEventListener('change', notify);
  }
  return () => {
    if (--users === 0) {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      displayMode.removeEventListener('change', notify);
      pending = null;
      notify();
    }
  };
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
const snapshot = () => `${!!pending}:${appInstalled || isStandalone()}`;
export const useInstallState = () => {
  useSyncExternalStore(subscribe, snapshot);
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return {
    canPrompt: !!pending,
    installed: appInstalled || isStandalone(),
    isIos: ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua),
    prompt: async () => {
      const event = pending;
      if (!event) return;
      pending = null;
      notify();
      try { await event.prompt(); await event.userChoice; } catch { /* Menu install still works. */ }
    },
  };
};
