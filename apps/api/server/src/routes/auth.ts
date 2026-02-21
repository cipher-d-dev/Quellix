import { developerSigninSchema, developerSignupSchema } from './../schema/developerValidationSchema.ts';
import express from 'express';
import { login, logout, register } from '../controllers/authController.ts';
import { validateBody } from '../middlewares/validateBody.ts';

const router = express.Router();

// TODO: Implement authentication routes (e.g., login, register, logout)

router.post("/register", validateBody(developerSignupSchema), register);
router.post("/login", validateBody(developerSigninSchema), login);
router.post("/logout", logout);

export default router;