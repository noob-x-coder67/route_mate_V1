import { Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";

export const getConversations = async (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user.id;

    // Get distinct users this person has chatted with
    const sentTo = await prisma.message.findMany({
      where: { senderId: userId },
      select: { receiverId: true },
      distinct: ["receiverId"],
    });

    const receivedFrom = await prisma.message.findMany({
      where: { receiverId: userId },
      select: { senderId: true },
      distinct: ["senderId"],
    });

    // Get unique other user IDs
    const otherUserIds = new Set([
      ...sentTo.map((m) => m.receiverId),
      ...receivedFrom.map((m) => m.senderId),
    ]);

    const conversations = await Promise.all(
      Array.from(otherUserIds).map(async (otherId) => {
        // Get last message
        const lastMessage = await prisma.message.findFirst({
          where: {
            OR: [
              { senderId: userId, receiverId: otherId },
              { senderId: otherId, receiverId: userId },
            ],
          },
          orderBy: { createdAt: "desc" },
          include: {
            sender: { select: { id: true, name: true, department: true } },
            receiver: { select: { id: true, name: true, department: true } },
          },
        });

        // Count only unread messages FROM other user TO me
        const unreadCount = await prisma.message.count({
          where: {
            senderId: otherId,
            receiverId: userId,
            read: false,
          },
        });

        const otherUser =
          lastMessage?.senderId === userId
            ? lastMessage?.receiver
            : lastMessage?.sender;

        return {
          userId: otherId,
          user: otherUser,
          lastMessage: lastMessage?.content || "",
          lastMessageTime: lastMessage?.createdAt,
          unreadCount,
        };
      }),
    );

    // Sort by last message time
    conversations.sort(
      (a, b) =>
        new Date(b.lastMessageTime || 0).getTime() -
        new Date(a.lastMessageTime || 0).getTime(),
    );

    res.status(200).json({
      status: "success",
      data: { conversations },
    });
  } catch (error) {
    next(error);
  }
};

export const getMessages = async (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user.id;
    const otherUserId = req.params.userId;

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
      },
      orderBy: { createdAt: "asc" },
    });

    res.status(200).json({ status: "success", data: { messages } });
  } catch (error) {
    next(error);
  }
};

export const sendMessage = async (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  try {
    const senderId = req.user.id;
    const { receiverId, content } = req.body;

    if (!receiverId || !content) {
      res.status(400).json({ message: "receiverId and content are required" });
      return;
    }

    const message = await prisma.message.create({
      data: { senderId, receiverId, content },
    });

    res.status(201).json({ status: "success", data: { message } });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user.id;
    const otherUserId = req.params.userId;

    await prisma.message.updateMany({
      where: { senderId: otherUserId, receiverId: userId, read: false },
      data: { read: true },
    });

    res.status(200).json({ status: "success" });
  } catch (error) {
    next(error);
  }
};
