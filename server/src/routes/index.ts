import express from "express";
import authRoutes from "./authRoutes";
import rideRoutes from "./rideRoutes";
import messageRoutes from "./messageRoutes";
import userRoutes from "./userRoutes";

const router = express.Router();

const defaultRoutes = [
  { path: "/auth", route: authRoutes },
  { path: "/rides", route: rideRoutes },
  { path: "/messages", route: messageRoutes },
  { path: "/users", route: userRoutes },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;
