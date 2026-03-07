import express from "express";
import { protect } from "../middleware/authMiddleware";

import {
  offerRide,
  requestRide,
  manageRideRequest,
  completeRide,
  getAvailableRides,
  getMyRideRequests,
  getRideById,
  getDriverHistory,
  getPassengerHistory,
  getMyBookings,
  getMyRequests,
  cancelRoute,
  cancelRequest,
} from "../controllers/rideController";

const router = express.Router();

router.post("/", protect, offerRide);
router.get("/", protect, getAvailableRides);
router.get("/requests", protect, getMyRideRequests);
router.get("/history/driver", protect, getDriverHistory);
router.get("/history/passenger", protect, getPassengerHistory);
router.get("/my-bookings", protect, getMyBookings);
router.post("/request", protect, requestRide);
router.patch("/:rideId/manage", protect, manageRideRequest);
router.patch("/:routeId/complete", protect, completeRide);
router.get("/my-requests", protect, getMyRequests);
router.patch("/:routeId/cancel-route", protect, cancelRoute);
router.patch("/:routeId/cancel-request", protect, cancelRequest);
router.get("/:id", protect, getRideById);

export default router;
