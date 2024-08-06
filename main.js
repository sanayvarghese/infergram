import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";
dotenv.config();

function fileToGenerativePart(path, mimeType) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(path)).toString("base64"),
      mimeType,
    },
  };
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function run() {
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction:
      'Analyze the image and give a discription for that image. Make the response shorter and in simpler words that are used commonly. DONT INCLUDE COMMAS SO ANY OTHER SYMBOLS. Make the description in 4 to 8 words. With the image the user also will gave a sample discription. Make our response similar to that. The given discription can contain words like "ariel photography of" or like "...long angle..." like that words descibring the image capturing technique, Dont include that words in our response. ',
  });

  const prompt = "aerial photography of mountains";
  const images = [fileToGenerativePart("2.jpeg", "image/jpeg")];
  const result = await model.generateContent([prompt, ...images]);
  const resp = await result.response;
  const text = resp.text();
  console.log(text);
}

run();
