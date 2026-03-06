import express from "express";
import { protect } from "../middleware/authMiddleware";
import {
  getConversations,
  getMessages,
  sendMessage,
  markAsRead,
} from "../controllers/messageController";

const router = express.Router();

router.use(protect);
router.get("/conversations", getConversations);
router.get("/:userId", getMessages);
router.post("/", sendMessage);
router.patch("/:userId/read", markAsRead);

export default router;
