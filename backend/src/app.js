import express from "express";
import cookieParser from "cookie-parser";
import "dotenv/config";
import cors from "cors";
import connectDB from "./db/db.js";
import routes from "./routes/index.js";
import blockchainRoutes from "./routes/blockchain.route.js";

const app = express();

connectDB();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "Set-Cookie", "Cookie"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/", routes);
app.use("/api/blockchain", blockchainRoutes);

export default app;
