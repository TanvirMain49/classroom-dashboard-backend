import express from "express";
import cors from "cors";
import subjectRoutes from "./routes/subjects.routes";

const app = express();

app.use(express.json());
app.use(cors({
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
}));


app.use("/api/v1/subjects", subjectRoutes);

export default app;
