import { Router } from "express";
import { sendOtp, verifyOtp,resendOtp } from "../controller/otp.controller.js";

const router = Router();           

router.post("/send", sendOtp);
router.post("/verify", verifyOtp); 
router.post("/resend", resendOtp);                 

export default router;