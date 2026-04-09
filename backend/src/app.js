import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

import authRoutes from "./routes/auth.routes.js";
import emailRoutes from "./routes/email.routes.js";


const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    message: "Outlook backend is running",
  });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/email", emailRoutes);

app.use("/api/auth", authRoutes);

export default app;
