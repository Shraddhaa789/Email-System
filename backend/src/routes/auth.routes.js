import express from "express";
import {
  changePassword,
  forgotPassword,
  getMailPreferences,
  getProfile,
  listDirectory,
  register,
  login,
  seedDemoWorkspace,
  updateProfile,
} from "../controllers/auth.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/demo-seed", seedDemoWorkspace);
router.post("/forgot-password", forgotPassword);
router.get("/me", authMiddleware, getProfile);
router.get("/directory", authMiddleware, listDirectory);
router.get("/mail-preferences", authMiddleware, getMailPreferences);
router.patch("/me", authMiddleware, updateProfile);
router.patch("/change-password", authMiddleware, changePassword);

export default router;
