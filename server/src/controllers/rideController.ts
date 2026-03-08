import { Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/error";

// NEW CODE FOR AVAILABLE RIDES

/**
 * GET AVAILABLE RIDES
 */
// In-memory wait timers: routeId -> NodeJS.Timeout
const waitTimers = new Map<string, ReturnType<typeof setTimeout>>();

export const getAvailableRides = async (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  try {
    const routes = await prisma.route.findMany({
      where: {
        status: "PENDING",
        availableSeats: { gt: 0 },
        departureTime: { gt: new Date() },
      },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            gender: true,
            rating: true,
            department: true,
          },
        },
        rides: { where: { status: "ACCEPTED" }, select: { id: true } },
      },
      orderBy: { departureTime: "asc" },
    });
    res.status(200).json({ status: "success", data: { routes } });
  } catch (error) {
    next(error);
  }
};

// Driver cancels their route
export const cancelRoute = async (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { routeId } = req.params;
    const route = await prisma.route.findUnique({ where: { id: routeId } });
    if (!route || route.driverId !== req.user.id) {
      return next(new AppError("Unauthorized", 403));
    }
    await prisma.route.update({
      where: { id: routeId },
      data: { status: "CANCELLED" },
    });
    res.status(200).json({ status: "success" });
  } catch (error) {
    next(error);
  }
};

// Driver closes seats (stops new requests, keeps existing passengers)
export const closeSeats = async (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { routeId } = req.params;
    const route = await prisma.route.findUnique({ where: { id: routeId } });
    if (!route || route.driverId !== req.user.id) {
      return next(new AppError("Unauthorized", 403));
    }
    await prisma.route.update({
      where: { id: routeId },
      data: { availableSeats: 0 },
    });
    const io = req.app.get("io");
    if (io) io.emit("routeUpdated", { routeId, availableSeats: 0 });
    res.status(200).json({ status: "success" });
  } catch (error) {
    next(error);
  }
};

// Passenger cancels their request - restore reserved seats
export const cancelRequest = async (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { routeId } = req.params;
    const pendingRide = await prisma.ride.findFirst({
      where: {
        routeId,
        passengerId: req.user.id,
        status: { in: ["PENDING", "ACCEPTED"] },
      },
    });
    if (pendingRide) {
      await prisma.ride.delete({ where: { id: pendingRide.id } });
      // Restore seat (seats were pre-decremented on request)
      await prisma.route.update({
        where: { id: routeId },
        data: { availableSeats: { increment: 1 } },
      });
    }
    res.status(200).json({ status: "success" });
  } catch (error) {
    next(error);
  }
};

export const getMyBookings = async (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  try {
    const rides = await prisma.ride.findMany({
      where: { passengerId: req.user.id, status: "ACCEPTED" },
      include: {
        route: {
          include: {
            driver: {
              select: { id: true, name: true, rating: true, department: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json({ status: "success", data: { rides } });
  } catch (error) {
    next(error);
  }
};

/**
 * OFFER A RIDE (Driver creates a Route)
 */
export const offerRide = async (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  try {
    const {
      originLat,
      originLng,
      originAddress,
      destLat,
      destLng,
      destAddress,
      distance,
      vehicle,
      totalSeats,
      departureTime,
      womenOnly,
    } = req.body;

    const newRoute = await prisma.route.create({
      data: {
        driverId: req.user.id,
        originLat,
        originLng,
        originAddress,
        destLat,
        destLng,
        destAddress,
        distance,
        vehicle,
        totalSeats,
        availableSeats: totalSeats,
        departureTime: new Date(departureTime),
        womenOnly: womenOnly || false,
        status: "PENDING",
      },
    });

    res.status(201).json({ status: "success", data: { route: newRoute } });
  } catch (error) {
    next(error);
  }
};

/**
 * REQUEST TO JOIN (Passenger creates a Ride)
 */
export const requestRide = async (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { routeId, seatsRequested = 1 } = req.body;

    const route = await prisma.route.findUnique({ where: { id: routeId } });
    if (!route) {
      return next(new AppError("Ride not found", 404));
    }
    if (route.availableSeats < seatsRequested) {
      return next(
        new AppError(`Only ${route.availableSeats} seat(s) available`, 400),
      );
    }

    const rideRequest = await prisma.ride.create({
      data: {
        routeId,
        passengerId: req.user.id,
        status: "PENDING",
        // seatsRequested stored in-memory via notification; no DB migration needed
      },
    });

    // Reserve the seats immediately at request time (prevents overbooking)
    // We'll release them if driver rejects
    await prisma.route.update({
      where: { id: routeId },
      data: { availableSeats: { decrement: seatsRequested } },
    });

    const newAvailableSeats = route.availableSeats - seatsRequested;
    const io = req.app.get("io");
    if (io) {
      const seatMsg =
        seatsRequested > 1 ? ` (needs ${seatsRequested} seats)` : "";
      // Notify driver
      io.to(route.driverId).emit("newNotification", {
        type: "ride_request",
        message: `${req.user.name} requested your ride${seatMsg}`,
        rideId: route.id,
        seatsRequested,
      });
      // Broadcast seat count change to ALL viewers in real-time
      io.emit("routeUpdated", { routeId, availableSeats: newAvailableSeats });
    }

    res.status(201).json({ status: "success", data: { ride: rideRequest } });
  } catch (error) {
    next(error);
  }
};

/**
 * MANAGE REQUEST (Driver Accepts/Rejects)
 */
export const manageRideRequest = async (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { rideId } = req.params;
    const { status } = req.body; // 'ACCEPTED' or 'REJECTED'

    const ride = (await prisma.ride.findUnique({
      where: { id: rideId },
      include: { route: true },
    })) as any;

    if (!ride || ride.route.driverId !== req.user.id) {
      return next(new AppError("Unauthorized access", 403));
    }

    const updatedRide = await prisma.$transaction(async (tx) => {
      const updated = await tx.ride.update({
        where: { id: rideId },
        data: { status },
      });

      // Notify passenger instantly
      const io = req.app.get("io");
      if (io) {
        io.to(ride.passengerId).emit("rideStatusUpdate", {
          routeId: ride.routeId,
          status: status,
        });
        io.to(ride.passengerId).emit("newNotification", {
          type: status === "ACCEPTED" ? "ride_accepted" : "ride_rejected",
          message:
            status === "ACCEPTED"
              ? "Your ride request was accepted!"
              : "Your ride request was declined.",
          rideId: ride.routeId,
        });
      }

      // Seats were already reserved at request time
      // On REJECT: restore seats. On ACCEPT: nothing to change.
      if (status === "REJECTED") {
        const restoredRoute = await tx.route.update({
          where: { id: ride.routeId },
          data: { availableSeats: { increment: 1 } },
        });
        const io = req.app.get("io");
        if (io)
          io.emit("routeUpdated", {
            routeId: ride.routeId,
            availableSeats: restoredRoute.availableSeats,
          });
      }
      return updated;
    });

    res.status(200).json({ status: "success", data: { ride: updatedRide } });
  } catch (error) {
    next(error);
  }
};

/**
 * COMPLETE RIDE (Driver only)
 */
export const completeRide = async (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  const { routeId } = req.params;
  const userId = req.user.id;

  try {
    const route = await prisma.route.findUnique({
      where: { id: routeId },
      include: { rides: { where: { status: "ACCEPTED" } } },
    });

    if (!route || route.driverId !== userId) {
      return next(new AppError("Unauthorized or route not found.", 403));
    }

    if (route.status === "COMPLETED") {
      return next(new AppError("Ride is already completed.", 400));
    }

    const distance = route.distance;
    const passengerCount = route.rides.length;
    const co2SavedPerPerson = distance * 0.19;
    const fuelSavedPerPerson = distance * 0.08;

    await prisma.$transaction([
      prisma.route.update({
        where: { id: routeId },
        data: { status: "COMPLETED" },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          ridesOffered: { increment: 1 },
          co2Saved: { increment: co2SavedPerPerson * passengerCount },
          fuelSaved: { increment: fuelSavedPerPerson * passengerCount },
        },
      }),
      ...route.rides.map((ride) =>
        prisma.user.update({
          where: { id: ride.passengerId },
          data: {
            ridesTaken: { increment: 1 },
            co2Saved: { increment: co2SavedPerPerson },
            fuelSaved: { increment: fuelSavedPerPerson },
          },
        }),
      ),
      prisma.ride.updateMany({
        where: { routeId, status: "ACCEPTED" },
        data: { status: "COMPLETED" },
      }),
    ]);

    // Fetch driver name for the rating notification
    const driver = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    // Notify all passengers that the ride is completed via socket
    const io = req.app.get("io");
    if (io) {
      route.rides.forEach((ride) => {
        io.to(ride.passengerId).emit("newNotification", {
          type: "ride_completed",
          message: "Your ride has been completed! 🎉",
          routeId,
          rideId: ride.id,
          driverName: driver?.name || "Your driver",
        });
      });
    }

    res.status(200).json({
      status: "success",
      impact: {
        totalCo2Saved: co2SavedPerPerson * (passengerCount + 1),
        totalFuelSaved: fuelSavedPerPerson * (passengerCount + 1),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getDriverHistory = async (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  try {
    const routes = await prisma.route.findMany({
      where: {
        driverId: req.user.id,
        departureTime: { lt: new Date() },
      },
      orderBy: { departureTime: "desc" },
    });
    res.status(200).json({ status: "success", data: { routes } });
  } catch (error) {
    next(error);
  }
};

export const getPassengerHistory = async (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  try {
    const rides = await prisma.ride.findMany({
      where: { passengerId: req.user.id },
      include: {
        route: {
          include: {
            driver: { select: { id: true, name: true, rating: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json({ status: "success", data: { rides } });
  } catch (error) {
    next(error);
  }
};
/**
 * GET SINGLE RIDE BY ID
 */
export const getRideById = async (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  try {
    const route = await prisma.route.findUnique({
      where: { id: req.params.id },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            gender: true,
            rating: true,
            department: true,
          },
        },
      },
    });
    if (!route) return next(new AppError("Ride not found", 404));
    res.status(200).json({ status: "success", data: { route } });
  } catch (error) {
    next(error);
  }
};
/**
 * GET PENDING REQUESTS FOR DRIVER
 */
export const getMyRideRequests = async (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  try {
    const requests = await prisma.ride.findMany({
      where: {
        route: { driverId: req.user.id },
        status: "PENDING",
      },
      include: {
        passenger: {
          select: {
            id: true,
            name: true,
            gender: true,
            rating: true,
            department: true,
          },
        },
        route: true,
      },
    });
    res.status(200).json({ status: "success", data: { requests } });
  } catch (error) {
    next(error);
  }
};
export const getMyRequests = async (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  try {
    const rides = await prisma.ride.findMany({
      where: { passengerId: req.user.id },
      include: { route: true },
    });
    res.status(200).json({ status: "success", data: { rides } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET DRIVER'S OWN UPCOMING ROUTES (no seat filter — even fully-booked routes show)
 */
export const getMyDriverRoutes = async (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  try {
    const routes = await prisma.route.findMany({
      where: {
        driverId: req.user.id,
        status: "PENDING",
        departureTime: { gt: new Date() },
      },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            gender: true,
            rating: true,
            department: true,
          },
        },
        rides: { where: { status: "ACCEPTED" }, select: { id: true } },
      },
      orderBy: { departureTime: "asc" },
    });
    res.status(200).json({ status: "success", data: { routes } });
  } catch (error) {
    next(error);
  }
};

/**
 * START WAIT TIMER — driver waits up to 2 minutes for more passengers
 */
export const startWaitTimer = async (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { routeId } = req.params;
    const route = await prisma.route.findUnique({ where: { id: routeId } });
    if (!route || route.driverId !== req.user.id) {
      return next(new AppError("Unauthorized", 403));
    }

    const WAIT_MS = 120_000; // 2 minutes
    const endTime = Date.now() + WAIT_MS;
    const io = req.app.get("io");

    // Broadcast to ALL connected clients (driver + all passengers viewing this route)
    if (io) io.emit("driverWaiting", { routeId, endTime });

    // Clear any pre-existing timer for this route
    if (waitTimers.has(routeId)) clearTimeout(waitTimers.get(routeId)!);

    // Auto-fire after 2 min
    const timer = setTimeout(async () => {
      waitTimers.delete(routeId);
      // Close seats so no new requests come in after time expires
      await prisma.route.update({
        where: { id: routeId },
        data: { availableSeats: 0 },
      });
      if (io) {
        io.emit("routeUpdated", { routeId, availableSeats: 0 });
        io.emit("waitTimerExpired", { routeId });
      }
    }, WAIT_MS);

    waitTimers.set(routeId, timer);
    res.status(200).json({ status: "success", data: { endTime } });
  } catch (error) {
    next(error);
  }
};

/**
 * RATE A RIDE - passenger rates the driver after completion
 */
export const rateRide = async (req: any, res: Response, next: NextFunction) => {
  const { rideId } = req.params;
  const { rating } = req.body;
  const passengerId = req.user.id;

  if (!rating || rating < 1 || rating > 5) {
    return next(new AppError("Rating must be between 1 and 5", 400));
  }

  try {
    // Verify this passenger was on this ride
    const ride = await prisma.ride.findFirst({
      where: { id: rideId, passengerId, status: "COMPLETED" },
      include: { route: { select: { driverId: true } } },
    });

    if (!ride) {
      return next(new AppError("Ride not found or not completed", 404));
    }

    const driverId = ride.route.driverId;

    // Get current driver stats
    const driver = await prisma.user.findUnique({
      where: { id: driverId },
      select: { rating: true, totalRatings: true },
    });

    if (!driver) return next(new AppError("Driver not found", 404));

    // Weighted average
    const newTotal = driver.totalRatings + 1;
    const newRating = (driver.rating * driver.totalRatings + rating) / newTotal;

    await prisma.user.update({
      where: { id: driverId },
      data: { rating: newRating, totalRatings: newTotal },
    });

    res.status(200).json({ status: "success", message: "Rating submitted!" });
  } catch (error) {
    next(error);
  }
};
