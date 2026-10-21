/**
 * Messages that /auth/callback can ask the auth pages to show. The URL only ever carries one of these codes, never
 * the text itself: showing raw query text would let anyone craft a link that puts their own words ("your account is
 * locked, call ...") inside a trusted-looking box on our login page.
 */
export const authErrors = {
  cancelled: "Sign-in was cancelled or didn't complete. Please try again.",
  "missing-code": "That sign-in link is incomplete. Please try again.",
  "reset-link": "That reset link has expired or was opened in a different browser. Request a new one below.",
} as const;

export const authNotices = {
  "email-confirmed": "Your email is confirmed. Log in with your email and password.",
} as const;

export type AuthErrorCode = keyof typeof authErrors;
export type AuthNoticeCode = keyof typeof authNotices;

/** Looks up the message for a code from the URL; unknown codes show nothing rather than echoing input. */
export function messageFor<T extends Record<string, string>>(messages: T, code: string | null) {
  return code && Object.hasOwn(messages, code) ? messages[code as keyof T] : "";
}
