import express from "express";
import { requireAdmin } from "../../middleware/auth.js";
import dashboardRouter from "./dashboard.js";
import usersRouter from "./users.js";
import trafficRouter from "./traffic.js";
import sessionsRouter from "./sessions.js";
import blogRouter from "./blog.js";
import tagsRouter from "./tags.js";
import nichesRouter from "./niches.js";
import performanceRouter from "./performance.js";

const router = express.Router();

// Apply admin authentication middleware to all admin routes
router.use(requireAdmin);

// Mount subroutes
router.use('/', dashboardRouter);
router.use('/users', usersRouter);
router.use('/traffic', trafficRouter);
router.use('/sessions', sessionsRouter);
router.use('/blog', blogRouter);
router.use('/tags', tagsRouter);
router.use('/niches', nichesRouter);
router.use('/performance', performanceRouter);

export default router;
