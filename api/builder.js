require("dotenv").config();
const { Octokit } = require("octokit");

module.exports = async function (tasks, genAI, repoName) {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const owner = process.env.GITHUB_USERNAME;
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  try {
    console.log(`🔍 Checking if repository '${repoName}' exists...`);

    // ၁။ Repository ရှိမရှိ အရင်စစ်မည်၊ မရှိလျှင် အသစ်ဆောက်မည်
    try {
      await octokit.request("GET /repos/{owner}/{repo}", {
        owner,
        repo: repoName,
      });
      console.log("📁 Repository already exists.");
    } catch (error) {
      if (error.status === 404) {
        console.log("🆕 Creating new repository...");
        await octokit.request("POST /user/repos", {
          name: repoName,
          private: false, // Public သို့မဟုတ် Private စိတ်ကြိုက်ပြောင်းနိုင်သည်
          auto_init: true, // README တစ်ခုနဲ့ အလိုအလျောက် Initialize လုပ်မည်
        });
        // Repo ဆောက်ပြီးလျှင် GitHub က ပေါ်လာဖို့ စက္ကန့်အနည်းငယ် စောင့်ရန်လိုအပ်နိုင်သည်
        await new Promise((resolve) => setTimeout(resolve, 3000));
      } else {
        throw error;
      }
    }

    // ၂။ AI ဆီက Code ယူပြီး တစ်ဖိုင်ချင်း Push လုပ်ခြင်း
    for (const task of tasks) {
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
      let code = result.response
        .text()
        .trim()
        .replace(/^```[a-z]*\n|```$/g, "");

      const base64Code = Buffer.from(code).toString("base64");

      // GitHub API သို့ File ပို့ခြင်း
      await octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", {
        owner: owner,
        repo: repoName,
        path: task.file,
        message: `AI Built: ${task.file}`,
        content: base64Code,
      });

      console.log(`✅ File pushed: ${task.file}`);
    }

    return `https://github.com/${owner}/${repoName}`;
  } catch (error) {
    console.error("🚨 GitHub Automation Error:", error.message);
    throw new Error(`Automation Protocol Failure: ${error.message}`);
  }
};
