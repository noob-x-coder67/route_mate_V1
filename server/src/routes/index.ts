import express from "express";
import authRoutes from "./authRoutes";
import rideRoutes from "./rideRoutes";
import adminRoutes from "./adminRoutes";
import messageRoutes from "./messageRoutes";

const router = express.Router();

const defaultRoutes = [
  { path: "/auth", route: authRoutes },
  { path: "/rides", route: rideRoutes },
  { path: "/admin", route: adminRoutes },
  { path: "/messages", route: messageRoutes },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;
