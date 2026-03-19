import express from "express";
import { requireAuth } from "../middlewares/authMiddleware.ts";
import {
  getProfile,
  updateProfile,
  uploadAvatar,
  deleteAvatar,
  avatarUpload,
} from "../controllers/profileController.ts";

const router = express.Router();

// All routes here require a valid access token
router.use(requireAuth);

router.get("/me", getProfile);
router.patch("/profile", updateProfile);
router.post("/avatar", avatarUpload.single("avatar"), uploadAvatar);
router.delete("/avatar", deleteAvatar);

export default router;
