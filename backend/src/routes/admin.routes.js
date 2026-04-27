import express from "express";
import {
  createGroup,
  createDomain,
  createUser,
  deleteUser,
  deleteDomain,
  deleteGroup,
  getOverview,
  getPreferences,
  listDomains,
  listGroups,
  listUsers,
  permanentlyDeleteUser,
  restoreUser,
  updateUser,
  updateGroup,
  updatePreferences,
} from "../controllers/admin.controller.js";
import { authMiddleware, requireAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authMiddleware, requireAdmin);
router.get("/overview", getOverview);
router.get("/users", listUsers);
router.post("/users", createUser);
router.patch("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);
router.patch("/users/:id/restore", restoreUser);
router.delete("/users/:id/permanent", permanentlyDeleteUser);
router.get("/groups", listGroups);
router.post("/groups", createGroup);
router.patch("/groups/:id", updateGroup);
router.delete("/groups/:id", deleteGroup);
router.get("/domains", listDomains);
router.post("/domains", createDomain);
router.delete("/domains/:id", deleteDomain);
router.get("/preferences", getPreferences);
router.patch("/preferences", updatePreferences);

export default router;
