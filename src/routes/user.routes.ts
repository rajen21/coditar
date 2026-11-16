import { Router } from "express";
import * as userController from "../controllers/user.controller";
import { authenticate, requireAdmin } from "../middleware/auth";

const router = Router();

router.use(authenticate);
router.get("/", requireAdmin, userController.listUsers);
router.get("/:id", userController.getUser);
router.put("/:id", userController.updateUser);
router.delete("/:id", userController.deleteUser);

export default router;
