require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { list } = require("postcss");

// Gemini 2.0 Flash ကို သုံးပါ (gemini-1.5-flash ဆိုတာ လက်ရှိမှာ မရှိသေးပါဘူး)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

module.exports = async function (data) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      Analyze this requirement: "${data}"
      Return ONLY a valid JSON object. Do not include markdown formatting.
      Structure:
      {
        "summary": "Short description of the project",
        "services": [
          { "id": "auth", "name": "Service Name", "price": 200, "description": "Short description" },
          { "id": "db", "name": "Database Setup", "price": 400, "description": "Short description" }
        ]
      }
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response
      .text()
      .replace(/```json|```/g, "")
      .trim();

    // String ကို JavaScript Object အဖြစ် ပြောင်းလဲပြီးမှ ပြန်ပို့ရပါမယ်
    return JSON.parse(responseText);
  } catch (error) {
    console.error("Analyst Error:", error);
    throw new Error("Failed to analyze requirements: " + error.message);
  }
};
