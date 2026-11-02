import Groq from "groq-sdk";

export const getGroqClient = () => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured in process.env");
  }
  return new Groq({ apiKey });
};

export const GROQ_MODEL = (process.env.GROQ_MODEL || "llama-3.3-70b-versatile").replace(/['"]/g, "").trim();
