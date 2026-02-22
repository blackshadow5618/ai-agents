let selectedMode = "auto";
window.currentBuildId = null; // Build ID ကို သိမ်းရန်

// Mode Switching (Auto vs Manual)
document.getElementById("autoMode").onclick = () => {
  selectedMode = "auto";
  updateModeUI("autoMode", "manualMode");
};

document.getElementById("manualMode").onclick = () => {
  selectedMode = "manual";
  updateModeUI("manualMode", "autoMode");
};

function updateModeUI(activeId, inactiveId) {
  document.getElementById(activeId).classList.add("bg-blue-600", "text-white");
  document
    .getElementById(inactiveId)
    .classList.remove("bg-blue-600", "text-white");
  document.getElementById(inactiveId).classList.add("text-gray-400");
}

// --- အဆင့် (၁) Analyst ဆီသို့ ပေးပို့ခြင်း ---
async function startAnalysis() {
  const clientData = document.getElementById("clientInput").value;
  if (!clientData) return alert("Please enter your requirements.");

  addLog(`Analyst is studying your input...`, "blue");

  try {
    const response = await fetch("/api/analyze-options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientData: clientData }),
    });

    const data = await response.json();

    if (data.success) {
      window.currentBuildId = data.buildId; // Backend ကပေးတဲ့ ID ကို သိမ်းဆည်းသည်
      renderServices(data.services);
      addLog("Analysis complete. Custom services generated.", "emerald");
    } else {
      addLog("Error from Analyst: " + data.error, "red");
    }
  } catch (error) {
    addLog(
      "Failed to connect to server. Check if server.js is running.",
      "red",
    );
  }
}

// Render Checkboxes
function renderServices(services) {
  const list = document.getElementById("serviceList");
  list.innerHTML = "";

  services.forEach((svc) => {
    const itemHtml = `
      <div class="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg border border-gray-600 hover:border-blue-500 transition">
          <div class="flex items-center space-x-4">
              <input type="checkbox" value="${svc.price}" data-id="${svc.id}" data-name="${svc.name}" class="svc-checkbox w-5 h-5 accent-blue-500" onchange="updateTotal()">
              <div>
                  <p class="font-bold text-white">${svc.name}</p>
                  <p class="text-xs text-gray-400">${svc.description}</p>
              </div>
          </div>
          <p class="font-mono text-emerald-400">+$${svc.price}</p>
      </div>
    `;
    list.insertAdjacentHTML("beforeend", itemHtml);
  });

  document.getElementById("dynamicServices").classList.remove("hidden");
}

function updateTotal() {
  let total = 0;
  document.querySelectorAll(".svc-checkbox:checked").forEach((cb) => {
    total += parseInt(cb.value);
  });
  document.getElementById("totalPrice").innerText = `$${total}`;
}

// --- အဆင့် (၂) Architect, Planner, Builder တို့ကို စတင်စေခြင်း ---
document.getElementById("confirmBuildBtn").onclick = async () => {
  if (!window.currentBuildId) return alert("Please run analysis first!");

  const selectedCheckboxes = document.querySelectorAll(".svc-checkbox:checked");
  if (selectedCheckboxes.length === 0)
    return alert("Please select at least one service.");

  const selectedServices = Array.from(selectedCheckboxes).map((cb) => ({
    id: cb.dataset.id,
    name: cb.dataset.name,
  }));

  addLog("Confirmed! Forwarding to Architect Agent...", "yellow");

  try {
    const response = await fetch("/api/final-build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buildId: window.currentBuildId,
        selectedServices: selectedServices,
        // Project သိမ်းမည့် folder အမည် (Build ID သုံးခြင်းက ပိုစိတ်ချရသည်)
        projectPath: `./clients_projects/project_${window.currentBuildId}`,
      }),
    });

    const result = await response.json();

    if (result.success) {
      addLog("BUILD SUCCESS! All agents finished their tasks.", "emerald");
      addLog(`Folder: ${result.path}`, "blue");
      alert("Congratulations! Your project is ready.");
    } else {
      addLog("Build Error: " + result.error, "red");
    }
  } catch (error) {
    addLog("Critical error during the build process.", "red");
  }
};

function addLog(msg, color) {
  const logOutput = document.getElementById("logOutput");
  const div = document.createElement("p");
  div.className = `text-${color}-400`;
  div.innerText = `> ${new Date().toLocaleTimeString()}: ${msg}`;
  logOutput.appendChild(div);
  logOutput.scrollTop = logOutput.scrollHeight;
}

document.getElementById("startBtn").onclick = startAnalysis;
