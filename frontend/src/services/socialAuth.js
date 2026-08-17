/**
 * Google + Apple sign-in helpers for the browser.
 *
 * Both providers are loaded lazily from their official CDN scripts, so nothing
 * is downloaded until the user actually taps a social button, and the app still
 * works normally when neither provider is configured.
 *
 * Public (safe to ship in the bundle) env values:
 *   REACT_APP_GOOGLE_CLIENT_ID   e.g. 1234-abc.apps.googleusercontent.com
 *   REACT_APP_APPLE_CLIENT_ID    your Apple "Services ID", e.g. com.markpro.web
 *   REACT_APP_APPLE_REDIRECT_URI defaults to <site origin>/login
 */
export const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';
export const APPLE_CLIENT_ID = process.env.REACT_APP_APPLE_CLIENT_ID || '';

const loaded = {};
function loadScript(src) {
  if (loaded[src]) return loaded[src];
  loaded[src] = new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    el.async = true;
    el.defer = true;
    el.onload = resolve;
    el.onerror = () => reject(new Error('Could not load ' + src));
    document.head.appendChild(el);
  });
  return loaded[src];
}

/**
 * Opens Google's account chooser and resolves with the signed id_token.
 * We use the popup-based OAuth2 "id_token" flow so no page redirect is needed.
 */
export async function signInWithGoogle() {
  if (!GOOGLE_CLIENT_ID) throw new Error('Google sign-in is not configured yet.');
  await loadScript('https://accounts.google.com/gsi/client');

  return new Promise((resolve, reject) => {
    try {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => {
          if (response?.credential) resolve(response.credential);
          else reject(new Error('Google sign-in was cancelled.'));
        },
        ux_mode: 'popup',
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      // Prompt() shows the One Tap / account chooser overlay.
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed?.() || notification.isSkippedMoment?.()) {
          reject(new Error('Google sign-in could not be shown. Allow pop-ups and third-party cookies, then try again.'));
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Opens Apple's sign-in popup and resolves with { credential, name }.
 * Apple only sends the user's name on their FIRST authorization.
 */
export async function signInWithApple() {
  if (!APPLE_CLIENT_ID) throw new Error('Apple sign-in is not configured yet.');
  await loadScript('https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js');

  window.AppleID.auth.init({
    clientId: APPLE_CLIENT_ID,
    scope: 'name email',
    redirectURI: process.env.REACT_APP_APPLE_REDIRECT_URI || `${window.location.origin}/login`,
    usePopup: true,
  });

  const res = await window.AppleID.auth.signIn();
  const credential = res?.authorization?.id_token;
  if (!credential) throw new Error('Apple sign-in was cancelled.');
  const first = res?.user?.name?.firstName || '';
  const last = res?.user?.name?.lastName || '';
  return { credential, name: `${first} ${last}`.trim() };
}
