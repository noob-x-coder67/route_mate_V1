import { Router } from "express";
// Use named imports to avoid "undefined" errors
import { login, register } from "../controllers/authController";
import { protect } from "../middleware/authMiddleware";

const router = Router();

// Public routes
router.post("/register", register);
router.post("/login", login);

// Public: fetch universities for signup form domain detection
router.get("/universities", async (req, res, next) => {
  try {
    const { prisma } = await import("../lib/prisma");
    const universities = await prisma.university.findMany({
      where: { isActive: true },
      select: { id: true, name: true, shortName: true, emailDomain: true },
    });
    res.status(200).json({ status: "success", data: { universities } });
  } catch (error) {
    next(error);
  }
});

// Protected routes
// router.get('/me', protect, getMe);

export default router;
