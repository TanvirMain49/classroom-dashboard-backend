import express from "express";
import cors from "cors";
import securityMiddleware from "./middleware/security";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./utils/auth";

// routes
import subjectRoutes from "./routes/subjects.routes";
import userRoutes from "./routes/users.routes";
import classRoutes from "./routes/classes.routes";
import departmentRoutes from "./routes/departments.routes";


const app = express();

const frontendUrl = process.env.FRONTEND_URL;
if (!frontendUrl) {
  throw new Error("FRONTEND_URL is required for CORS configuration");
}
app.use(cors({
    origin: frontendUrl,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
}));

app.all("/api/v1/auth/*splat", toNodeHandler(auth));
app.use(express.json());
// app.use(securityMiddleware);


app.use("/api/v1/subjects", subjectRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/classes", classRoutes);
app.use("/api/v1/departments", departmentRoutes);

export default app;
