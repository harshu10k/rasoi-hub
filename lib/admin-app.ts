"use client";

// The Android admin app (admin-app/) is a Capacitor shell that loads this site. Capacitor injects its native bridge into
// the page as window.Capacitor, so the site can call the app's plugins without bundling Capacitor into the website.

type Bridge = {
  nativePromise: <T>(plugin: string, method: string, options?: object) => Promise<T>;
  addListener: (plugin: string, event: string, callback: (data: { url?: string }) => void) => { remove: () => Promise<void> };
};

const bridge = () => (window as unknown as { Capacitor?: Bridge }).Capacitor;

/** True inside the Android admin app. Client-only. */
export const isAdminApp = () => Boolean(bridge());

/**
 * Where Google sign-in returns to in the app. Google refuses to sign in inside WebViews ("disallowed_useragent"), so the
 * app runs it in a Chrome tab, and Android hands this link back to the app (see the intent filter in AndroidManifest.xml).
 * It must be listed under Supabase > Authentication > URL Configuration > Redirect URLs.
 */
export const APP_AUTH_CALLBACK = "com.rasoihub.admin://auth-callback";

/**
 * Opens `url` in a Chrome tab over the app. If the Browser plugin isn't there (an older build of the app), falls back to
 * navigating the WebView: Capacitor sends links outside allowNavigation to the phone's browser app instead.
 */
export async function openInSystemBrowser(url: string) {
  const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000));
  try { await Promise.race([bridge()!.nativePromise("Browser", "open", { url }), timeout]); }
  catch { window.location.href = url; }
}

/**
 * Calls `handle` with the sign-in return link, whether the app was still open (appUrlOpen) or Android restarted it while
 * the user was in Chrome (launch URL). Each link is handled once, even across reloads. Returns a cleanup function.
 */
export function onAppAuthReturn(handle: (url: URL) => void) {
  const app = bridge();
  if (!app) return () => {};
  const accept = (raw?: string) => {
    if (!raw?.startsWith(APP_AUTH_CALLBACK)) return;
    try {
      if (sessionStorage.getItem("rasoi-app-auth-return") === raw) return;
      sessionStorage.setItem("rasoi-app-auth-return", raw);
    } catch { /* storage blocked: handle it anyway */ }
    app.nativePromise("Browser", "close").catch(() => {});
    handle(new URL(raw));
  };
  try {
    const listener = app.addListener("App", "appUrlOpen", (data) => accept(data.url));
    app.nativePromise<{ url?: string } | undefined>("App", "getLaunchUrl").then((data) => accept(data?.url)).catch(() => {});
    return () => { listener.remove(); };
  } catch { return () => {}; } // an older build of the app without the App plugin
}
