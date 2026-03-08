// --- Enums & Literals (Matching Prisma Schema) ---
export type UserRole = "STUDENT" | "UNIVERSITY_ADMIN" | "SUPER_ADMIN";
export type Gender = "MALE" | "FEMALE";
export type RideStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "COMPLETED"
  | "CANCELLED";
export type VehicleType = "BIKE" | "CAR";

// --- University Model ---
export interface University {
  id: string;
  name: string;
  shortName: string;
  emailDomain: string;
  logo?: string;
  isActive: boolean;
  createdAt: string;
  userCount?: number;
  rideCount?: number;
  co2Saved?: number;
}

// --- User Types ---
export interface User {
  id: string;
  universityId: string;
  university?: University;
  name: string;
  email: string;
  gender: Gender;
  role: UserRole;
  department?: string;
  rating: number;
  totalRatings: number;
  ridesOffered: number;
  ridesTaken: number;
  co2Saved: number;
  fuelSaved: number;
  token?: string;
  preferences?: UserPreferences;
  createdAt: string;
}

export interface UserPreferences {
  noSmoking: boolean;
  musicAllowed: boolean;
  petsAllowed: boolean;
}

// Fixed: This interface was missing and causing the roleService error
export interface UserRoleAssignment {
  userId: string;
  role: UserRole;
  universityId?: string;
}

// --- Location & Schedule Helpers ---
export interface Location {
  lat: number;
  lng: number;
  address: string;
}

export interface RecurringSchedule {
  enabled: boolean;
  type: "daily" | "weekdays" | "weekly";
  days: number[];
  endDate?: string;
}

// --- Route Types ---
export interface Route {
  id: string;
  driverId: string;
  driver?: User;
  originLat: number; // Aligned with Prisma float fields
  originLng: number;
  originAddress: string;
  destLat: number;
  destLng: number;
  destAddress: string;
  pickup?: Location; // For backward compatibility with UI
  dropoff?: Location; // For backward compatibility with UI
  stops?: Location[] | any;
  distance: number; // Added for CO2 calculations
  datetime: string;
  vehicle: VehicleType;
  availableSeats: number;
  totalSeats: number;
  womenOnly: boolean;
  status: RideStatus; // Changed from 'active' literal to use the enum
  createdAt: string;
  recurring?: RecurringSchedule;
}

// --- Ride Types ---
export interface Ride {
  id: string;
  routeId: string;
  route?: Route;
  passengerId: string;
  passenger?: User;
  status: RideStatus;
  feedback?: Feedback;
  createdAt: string;
}

// --- Messaging & Social ---
export interface Feedback {
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  read: boolean;
  createdAt: string;
}

export interface Conversation {
  id: string;
  participantId: string;
  participant?: User;
  lastMessage?: Message;
  unreadCount: number;
}

export interface Notification {
  id: string;
  type:
    | "ride_request"
    | "ride_accepted"
    | "ride_rejected"
    | "new_message"
    | "ride_reminder";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
  relatedId?: string;
}

// --- Auth & Registration ---
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  gender: Gender;
  department: string;
  universityId: string; // Added to ensure registration links to a uni
}

// --- Sustainability & Analytics ---
export interface SustainabilityStats {
  totalCo2Saved: number;
  totalFuelSaved: number;
  totalRides: number;
  treesEquivalent: number;
  moneySaved: number;
}
// --- Ride Search Filters ---
export interface RideSearchFilters {
  minSeats?: number;
  femaleDriverOnly?: boolean;
  maleDriverOnly?: boolean;
  sameDepartment?: boolean;
  ratedDriversOnly?: boolean;
  noSmoking?: boolean;
}
