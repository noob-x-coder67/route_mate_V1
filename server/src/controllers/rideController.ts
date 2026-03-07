import { Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/error";

// NEW CODE FOR AVAILABLE RIDES

/**
 * GET AVAILABLE RIDES
 */
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
      },
      orderBy: { departureTime: "asc" },
    });
    res.status(200).json({ status: "success", data: { routes } });
  } catch (error) {
    next(error);
  }
};

// Driver cancels their route
export const cancelRoute = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { routeId } = req.params;
    const route = await prisma.route.findUnique({ where: { id: routeId } });
    if (!route || route.driverId !== req.user.id) {
      return next(new AppError('Unauthorized', 403));
    }
    await prisma.route.update({
      where: { id: routeId },
      data: { status: 'CANCELLED' }
    });
    res.status(200).json({ status: 'success' });
  } catch (error) { next(error); }
};

// Passenger cancels their request
export const cancelRequest = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { routeId } = req.params;
    await prisma.ride.deleteMany({
      where: { routeId, passengerId: req.user.id }
    });
    res.status(200).json({ status: 'success' });
  } catch (error) { next(error); }
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
    const { routeId } = req.body;

    const route = await prisma.route.findUnique({ where: { id: routeId } });
    if (!route || route.availableSeats < 1) {
      return next(new AppError("No seats available or ride not found", 400));
    }

    const rideRequest = await prisma.ride.create({
      data: {
        routeId,
        passengerId: req.user.id,
        status: "PENDING",
      },
    });
    // After prisma.ride.create(...)
    const io = req.app.get("io");
    if (io) {
      io.to(route.driverId).emit("newNotification", {
        type: "ride_request",
        message: `${req.user.name} requested your ride`,
        rideId: route.id,
      });
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

    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: { route: true },
    });

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

      // Decrement seats only if accepted
      if (status === "ACCEPTED") {
        await tx.route.update({
          where: { id: ride.routeId },
          data: { availableSeats: { decrement: 1 } },
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