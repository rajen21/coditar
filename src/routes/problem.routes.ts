import { Router } from "express";
import * as problemController from "../controllers/problem.controller";
import { authenticate, requireAdmin } from "../middleware/auth";

const router = Router();

router.get("/", authenticate, problemController.listProblems);
router.get("/:id", authenticate, problemController.getProblem);
router.post("/", authenticate, requireAdmin, problemController.createProblem);
router.delete("/:id", authenticate, requireAdmin, problemController.deleteProblem);

export default router;
