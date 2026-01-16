import express from "express";
import {
  registerTourist,
  verifyTourist,
  getTourist,
} from "../controllers/blockchain.controller.js";

const router = express.Router();

router.post("/register", registerTourist);
router.post("/verify", verifyTourist);
router.get("/get-tourist/:touristId", getTourist);

export default router;
