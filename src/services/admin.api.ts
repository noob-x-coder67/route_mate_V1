import axios from "axios";

// Assuming your API base URL is defined in your environment variables
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

/**
 * Configure axios instance with auth headers
 */
const api = axios.create({
  baseURL: API_URL,
});

// Add interceptor to include token from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const adminService = {
  /**
   * Fetches global metrics for the Super Admin
   */
  getGlobalStats: async () => {
    try {
      const response = await api.get(`/admin/global-stats`);
      // Returns { totalUsers, totalUniversities, totalRides, totalCo2Saved, totalFuelSaved }
      return response.data.data;
    } catch (error) {
      console.error("Error fetching global stats:", error);
      throw error;
    }
  },

  /**
   * Fetches specific metrics for a University Admin
   * @param universityId - The UUID of the university
   */
  getUniversityMetrics: async (universityId: string) => {
    try {
      const response = await api.get(`/admin/university-stats`);
      /* Returns { 
           stats: { totalStudents, activeRides, totalCO2, avgRating, fuelSaved },
           departmentDistribution: [...],
           weeklyRides: [...],
           students: [...]
         }
      */
      return response.data.data;
    } catch (error) {
      console.error("Error fetching university metrics:", error);
      throw error;
    }
  },

  /**
   * Optional: Fetch list of all universities (for Super Admin management)
   */
  getUniversities: async () => {
    const response = await api.get("/admin/universities");
    return response.data.data;
  },
};
