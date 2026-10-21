import type { NavigateFunction } from 'react-router-dom';

export const V1_STAFF_URL = import.meta.env.VITE_V1_STAFF_URL as string | undefined;

export function canSwitchToV1(): boolean {
  return typeof V1_STAFF_URL === 'string' && V1_STAFF_URL.trim().length > 0;
}

export function switchToV1() {
  if (!canSwitchToV1()) return;
  try {
    localStorage.setItem('staff-app-version', 'v1');
  } catch { /* Continue if this browser cannot save the choice. */ }
  window.location.assign(V1_STAFF_URL);
}

export function publicSiteRoot() {
  return '/';
}

export function leaveToPublicSite(navigate: NavigateFunction) {
  // Router navigation stays inside the base path, so leave it for the public site.
  if (import.meta.env.BASE_URL !== '/') window.location.assign(publicSiteRoot());
  else navigate('/');
}
