require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

module.exports = async function (analysis, selectedServices) {
  // Model နာမည်ကို အမှန်ပြင်ပါ (gemini-2.0-flash သို့မဟုတ် 2.5-flash)
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `
        You are a Senior Software Architect. 
        Context Analysis: "${JSON.stringify(analysis)}"
        Confirmed Services to Build: "${JSON.stringify(selectedServices)}"
        
        Task: Design a complete technical blueprint for a production-ready system.
        Return ONLY a JSON object with this exact structure:
        {
            "database_schema": "Detailed SQL table definitions with relationships",
            "api_endpoints": ["List of all necessary RESTful routes"],
            "folders": ["Standard project directory structure"],
            "tech_stack": "Detailed list of libraries and tools needed"
        }
        Do NOT include any markdown formatting or extra text.
    `;

  try {
    const result = await model.generateContent(prompt);
    let text = result.response.text();

    // Safety: Markdown blocks များကို ရှင်းထုတ်ပြီး JSON သန့်စင်ခြင်း
    text = text.replace(/```json|```/g, "").trim();

    const blueprint = JSON.parse(text);

    console.log("📐 Architect: System blueprint generated successfully.");
    return blueprint;
  } catch (error) {
    console.error("🚨 ARCHITECT ERROR:", error.message);
    throw new Error(`Architectural Design Failed: ${error.message}`);
  }
};
