require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

module.exports = async function (blueprint) {
  // Model နာမည်ကို အမှန်ပြင်ပါ (gemini-2.0-flash သို့မဟုတ် 1.5-flash)
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `
        You are an expert Project Manager & Lead Developer.
        Analyze this Technical Blueprint: "${JSON.stringify(blueprint)}"
        
        Your Goal: Break it down into a granular file-by-file development plan.
        
        Requirements:
        1. Identify every necessary file (server, models, controllers, routes, public assets).
        2. For each file, provide a clear, detailed technical description for the Builder Agent.
        
        Return ONLY a JSON array of objects. Do NOT include any markdown or explanation.
        Format:
        [
            { "file": "path/filename.js", "action": "create", "description": "Detailed logic and requirements for this file" },
            ...
        ]
    `;

  try {
    const result = await model.generateContent(prompt);
    let text = result.response.text();

    // Safety: Markdown backticks များကို ဖယ်ရှားပြီး JSON သန့်စင်ခြင်း
    text = text.replace(/```json|```/g, "").trim();

    const tasks = JSON.parse(text);

    if (!Array.isArray(tasks)) {
      throw new Error("AI output is not an array of tasks.");
    }

    console.log(`📋 Planner: Generated ${tasks.length} development tasks.`);
    return tasks;
  } catch (error) {
    console.error("🚨 PLANNER ERROR:", error.message);
    throw new Error(`Planning Phase Failed: ${error.message}`);
  }
};
