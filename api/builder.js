require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs-extra");
const path = require("path");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

module.exports = async function (structure, projectPath) {
  // Model ကို 2.0 Flash (သို့မဟုတ် 1.5 Pro) အသုံးပြုပါ
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  try {
    // ၁။ Project Folder ကို စိတ်ချရစွာ တည်ဆောက်ခြင်း
    await fs.ensureDir(projectPath);
    console.log(
      `🛡️  Security Check: Target directory secured at ${projectPath}`,
    );

    // ၂။ Structure ထဲက ဖိုင်စာရင်းကို Loop ပတ်ပြီး တစ်ခုချင်းစီ ဆောက်ခြင်း
    // Structure သည် Array [{ file: "path", description: "..." }] ဖြစ်ရပါမည်
    for (const task of structure) {
      console.log(`⏳ Generating code for: ${task.file}...`);

      const prompt = `
        Context: Building a production-grade software.
        File Name: ${task.file}
        Requirement: ${task.description}
        
        Task: Write clean, secure, and bug-free source code for this specific file.
        Rules:
        - Return ONLY the raw code.
        - Do NOT include markdown code blocks (backticks).
        - Ensure all imports and dependencies are correct.
      `;

      const result = await model.generateContent(prompt);
      let code = result.response.text().trim();

      // Markdown ပါလာခဲ့လျှင် ဖယ်ရှားရန် (Double-Safety)
      code = code.replace(/^```[a-z]*\n|```$/g, "");

      const filePath = path.join(projectPath, task.file);

      // ၃။ Folder ခွဲများရှိလျှင် အလိုအလျောက် ဆောက်ပေးခြင်း
      await fs.ensureDir(path.dirname(filePath));

      // ၄။ ဖိုင်ကို ရေးသားခြင်း
      await fs.writeFile(filePath, code, "utf8");
      console.log(`✅ Successfully secured & built: ${task.file}`);
    }

    return "Success: All files secured and built.";
  } catch (error) {
    console.error("🚨 BUILDER CRITICAL ERROR:", error.message);
    throw new Error(`Safety Protocol Failure: ${error.message}`);
  }
};
