import { doubleCsrf } from "csrf-csrf";

// Configure CSRF protection
const csrfConfig = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || "csrf_secret_change_me_in_production",
  cookieName: "psifi.x-csrf-token",
  cookieOptions: {
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  },
  size: 64,
  ignoredMethods: ["GET", "HEAD", "OPTIONS"],
  getTokenFromRequest: (req) => req.headers["x-csrf-token"],
});

// Export the CSRF protection middleware
export const csrfProtection = csrfConfig.doubleCsrfProtection;

// Export the token generation middleware (already creates token in response)
export const generateCsrfToken = csrfConfig.generateCsrfToken;

// Export the token validation function for manual checks
export const validateCsrfToken = csrfConfig.validateRequest;

