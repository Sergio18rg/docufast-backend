import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "node:path";
import routes from "./routes";

const app = express();
const BASE_FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

app.use(cors({ origin: BASE_FRONTEND_URL, credentials: true }));
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(express.json());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use("/api", routes);

export default app;
