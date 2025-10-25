import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import session from "express-session";
import cookieParser from "cookie-parser";
import passport from "passport";
import helmet from "helmet";
import morgan from "morgan";
import logger from "./utils/logger.js";
import validateEnv from "./utils/validateEnv.js";
import { COOKIE_SESSION_MAX_AGE, DEFAULT_SESSION_SECRET } from "./constants.js";
import { 
  authGeneralLimiter, 
  subscribeLimiter, 
  adminLimiter, 
  trackingLimiter,
  globalLimiter 
} from "./middleware/rateLimiter.js";
import { generateCsrfToken, csrfProtection } from "./middleware/csrf.js";

// Load environment variables first
dotenv.config();

// Validate environment variables before starting the server
validateEnv();

const app = express();
const PORT = process.env.PORT || 5000;
const ORIGIN = process.env.CLIENT_URL || "http://localhost:5173";

// Apply Helmet security headers early in middleware chain
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding resources
}));

app.use(cors({
  origin: ORIGIN,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// HTTP request logging
if (process.env.NODE_ENV === 'production') {
  // Production: log only errors and warnings
  app.use(morgan('combined', {
    skip: (req, res) => res.statusCode < 400,
    stream: logger.stream
  }));
} else {
  // Development: log all requests with concise format
  app.use(morgan('dev', { stream: logger.stream }));
}

// Trust proxy in production (required for secure cookies behind proxies)
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(session({
  secret: process.env.SESSION_SECRET || DEFAULT_SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_SESSION_MAX_AGE,
  },
}));
app.use(passport.initialize());
app.use(passport.session());

// CSRF token endpoint (must be before CSRF protection)
// The generateCsrfToken middleware automatically adds the token to res.locals
app.get('/api/csrf-token', (req, res) => {
  const token = generateCsrfToken(req, res);
  res.json({ csrfToken: token });
});

// Apply CSRF protection to state-changing requests (except multipart uploads)
app.use((req, res, next) => {
  // Skip CSRF for multipart/form-data uploads - they handle CSRF separately
  if (req.path.includes('/upload-image')) {
    return next();
  }
  return csrfProtection(req, res, next);
});

// Dynamic import to ensure environment variables are loaded before routes
async function setupRoutes() {
  const { default: authRouter } = await import("./routes/auth.js");
  const { default: subscribeRouter } = await import("./routes/subscribe.js");
  const { default: adminRouter } = await import("./routes/admin/index.js");
  const { default: trackRouter } = await import("./routes/track.js");
  
  // Apply specific rate limiters to routes
  // Note: auth routes have their own specific limiters (password, OAuth, general) applied per-endpoint
  app.use("/api/auth", authRouter);
  app.use("/api/subscribe", subscribeLimiter, subscribeRouter);
  app.use("/api/admin", adminLimiter, adminRouter);
  app.use("/api/track", trackingLimiter, trackRouter);
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Setup routes and start server
setupRoutes().then(() => {
  app.listen(PORT, () => {
    logger.info(`API listening on http://localhost:${PORT}`);
  });
}).catch((error) => {
  logger.error('Failed to setup routes:', error);
  process.exit(1);
});
