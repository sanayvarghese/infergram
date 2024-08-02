import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function run() {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = "What is gemini ai";
  const result = await model.generateContent(prompt);
  const resp = result.response;
  const text = resp.text();
  console.log(text);
}

run();
