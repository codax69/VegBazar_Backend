import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { chatWithAI } from "../controller/ai.controller.js";

const router = Router();

router.post("/chat", verifyJWT, chatWithAI);

export default router;
