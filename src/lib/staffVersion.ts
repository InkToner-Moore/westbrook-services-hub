// Each device picks which staff app it uses. No key means the current app.
export const STAFF_VERSION_KEY = "staff-app-version";

// The deploy sets VITE_OFFER_V2 to "true" once the new app is ready for staff.
export const offerV2 = import.meta.env.VITE_OFFER_V2 === "true";

export const switchToV2 = () => {
  try {
    localStorage.setItem(STAFF_VERSION_KEY, "v2");
  } catch {
    // storage blocked; the redirect below still opens the new version once
  }
  window.location.assign("/v2/staff/ai");
};
