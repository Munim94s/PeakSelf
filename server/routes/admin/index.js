import express from "express";
import { requireAdmin } from "../../middleware/auth.js";
import dashboardRouter from "./dashboard.js";
import usersRouter from "./users.js";
import trafficRouter from "./traffic.js";
import sessionsRouter from "./sessions.js";

const router = express.Router();

// Apply admin authentication middleware to all admin routes
router.use(requireAdmin);

// Mount subroutes
router.use('/', dashboardRouter);
router.use('/users', usersRouter);
router.use('/traffic', trafficRouter);
router.use('/sessions', sessionsRouter);

export default router;
