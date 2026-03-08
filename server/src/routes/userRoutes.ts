import express from "express";
import { protect } from "../middleware/authMiddleware";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/error";
import bcrypt from "bcryptjs";

const router = express.Router();

// GET /api/users/me
router.get("/me", protect, async (req: any, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { university: true },
    });
    if (!user) return next(new AppError("User not found", 404));
    res.status(200).json({ status: "success", data: { user } });
  } catch (error) {
    next(error);
  }
});

// PUT /api/users/profile
router.put("/profile", protect, async (req: any, res, next) => {
  try {
    const { name, gender, department, currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return next(new AppError("User not found", 404));

    // Handle password change
    if (newPassword) {
      if (!currentPassword)
        return next(new AppError("Current password is required", 400));
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch)
        return next(new AppError("Current password is incorrect", 401));
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(name && { name }),
        ...(gender && { gender }),
        ...(department && { department }),
        ...(newPassword && { password: await bcrypt.hash(newPassword, 12) }),
      },
      include: { university: true },
    });

    res.status(200).json({ status: "success", data: { user: updatedUser } });
  } catch (error) {
    next(error);
  }
});

export default router;
