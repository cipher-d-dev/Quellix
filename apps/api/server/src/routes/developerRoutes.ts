import express from "express";
import { requireAuth } from "../middlewares/authMiddleware.ts";
import {
  getProfile,
  updateProfile,
  uploadAvatar,
  deleteAvatar,
  avatarUpload,
  changePassword,
  deleteAccount,
} from "../controllers/profileController.ts";
import { validateBody } from "../middlewares/validateBody.ts";
import {
  developerUpdateSchema,
  changePasswordSchema,
  deleteAccountSchema,
} from "../schema/developerValidationSchema.ts";

const router = express.Router();

// All routes here require a valid access token
router.use(requireAuth);

router.get("/me", getProfile);
router.patch("/profile", validateBody(developerUpdateSchema), updateProfile);
router.post("/avatar", avatarUpload.single("avatar"), uploadAvatar);
router.delete("/avatar", deleteAvatar);
router.post(
  "/change-password",
  validateBody(changePasswordSchema),
  changePassword,
);
router.delete("/account", validateBody(deleteAccountSchema), deleteAccount);

export default router;
