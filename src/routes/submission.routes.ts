import { Router } from "express";
import * as submissionController from "../controllers/submission.controller";
import { authenticate } from "../middleware/auth";
import { executeRateLimit } from "../middleware/rateLimit";

const router = Router();

router.use(authenticate);
router.get("/", submissionController.list);
router.post("/execute", executeRateLimit, submissionController.execute);
router.get("/:id", submissionController.getStatus);

export default router;
