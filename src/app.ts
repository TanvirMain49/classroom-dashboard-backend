import express from "express";
import cors from "cors";
import subjectRoutes from "./routes/subjects.routes";
import securityMiddleware from "./middleware/security";

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

app.use(express.json());
app.use(securityMiddleware);


app.use("/api/v1/subjects", subjectRoutes);

export default app;
