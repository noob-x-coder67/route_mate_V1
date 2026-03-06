import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import messageRoutes from "./routes/messageRoutes";
import helmet from 'helmet';
import routes from './routes';
import adminRoutes from './routes/adminRoutes';

const app = express();




// --- 1. Security & Configuration Middleware ---
app.use(helmet()); // Adds security headers (good for deployment)
app.use(cors({
    origin: '*', // Allow all connections for now (dev mode)
    methods: ['GET', 'POST', 'PUT', 'DELETE']
}));

app.use(express.json()); // Parses incoming JSON requests
app.use(express.urlencoded({ extended: true })); // Parses URL-encoded data

// --- 2. Health Check Routes ---
// Simple check to see if server is alive
app.get('/status', (req: Request, res: Response) => {
    res.json({ message: "RouteMate Backend is Live! 🚀", uptime: process.uptime() });
});

// --- 3. API Routes ---
// All authentication routes will start with /api/auth
app.use('/api', routes);
app.use('/api/admin', adminRoutes);
app.use("/api/messages", messageRoutes);

// --- 4. Global Error Handler ---
// This catches any errors that happen in your routes


// app.use((err: any, req: Request, res: Response, next: NextFunction) => {
//     console.error(err.stack);
//     res.status(500).json({
//         status: 'error',
//         message: err.message || 'Internal Server Error'
//     });
// });

export default app;

// Add this at the bottom of your main app file (e.g., app.ts)
// after app.use('/api/auth', authRoutes);

app.use((err: any, req: any, res: any, next: any) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    // Only show stack trace in development mode
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});