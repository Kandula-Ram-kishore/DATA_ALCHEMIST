// app.js
let clients = [];
let clientHeaders = [];
let rules = {
  coRun: [],
  slotRestrictions: [],
  prioritization: {}
};

document.getElementById("clientInput").addEventListener("change", handleClientUpload);
document.getElementById("priorityWeight").addEventListener("input", () => {
  document.getElementById("priorityValue").innerText = document.getElementById("priorityWeight").value;
  updatePrioritization();
});
document.getElementById("fulfillmentWeight").addEventListener("input", () => {
  document.getElementById("fulfillmentValue").innerText = document.getElementById("fulfillmentWeight").value;
  updatePrioritization();
});

function handleClientUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  const isExcel = file.name.endsWith(".xlsx");

  reader.onload = function (event) {
    const data = event.target.result;
    if (isExcel) {
      const workbook = XLSX.read(data, { type: "binary" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      displayClientTable(json);
    } else {
      Papa.parse(file, {
        complete: (results) => displayClientTable(results.data)
      });
    }
  };

  isExcel ? reader.readAsBinaryString(file) : reader.readAsText(file);
}

function displayClientTable(data) {
  if (!data.length) return;

  clientHeaders = data[0];
  clients = data.slice(1);

  validateClients();

  let html = "<h3>Clients Table</h3><table><thead><tr>";
  clientHeaders.forEach(h => html += `<th>${h}</th>`);
  html += "</tr></thead><tbody>";

  clients.forEach((row, rowIndex) => {
    html += "<tr>";
    clientHeaders.forEach((_, colIndex) => {
      const value = row[colIndex] || "";
      html += `<td contenteditable="true" oninput="updateClientCell(${rowIndex}, ${colIndex}, this.innerText)">${value}</td>`;
    });
    html += "</tr>";
  });

  html += "</tbody></table>";
  document.getElementById("tablesContainer").innerHTML = html;
}

function updateClientCell(row, col, value) {
  clients[row][col] = value;
}

function validateClients() {
  const errors = [];
  const idIndex = clientHeaders.indexOf("ClientID");
  const priorityIndex = clientHeaders.indexOf("PriorityLevel");

  if (idIndex === -1) errors.push("Missing 'ClientID' column.");
  else {
    const idSet = new Set();
    clients.forEach(row => {
      const id = row[idIndex];
      if (idSet.has(id)) errors.push(`Duplicate ClientID: ${id}`);
      idSet.add(id);
    });
  }

  if (priorityIndex !== -1) {
    clients.forEach((row, i) => {
      const priority = parseInt(row[priorityIndex]);
      if (isNaN(priority) || priority < 1 || priority > 5) {
        errors.push(`Row ${i + 2}: Invalid PriorityLevel: ${row[priorityIndex]}`);
      }
    });
  }

  document.getElementById("validationSummary").innerText = errors.join("\\n");
}

function exportClients() {
  const fullData = [clientHeaders, ...clients];
  const ws = XLSX.utils.aoa_to_sheet(fullData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Clients");
  XLSX.writeFile(wb, "cleaned_clients.xlsx");
}

function addCoRunRule() {
  const input = document.getElementById("coRunTasks").value.trim();
  if (!input) return;
  const tasks = input.split(",").map(x => x.trim()).filter(x => x);
  if (tasks.length > 1) {
    rules.coRun.push({ type: "coRun", tasks });
    displayRules();
  }
}

function addSlotRestrictionRule() {
  const group = document.getElementById("groupName").value.trim();
  const minSlots = parseInt(document.getElementById("minCommonSlots").value);
  if (group && !isNaN(minSlots)) {
    rules.slotRestrictions.push({
      type: "slotRestriction",
      group,
      minCommonSlots: minSlots
    });
    displayRules();
  }
}

function updatePrioritization() {
  rules.prioritization = {
    priorityWeight: parseInt(document.getElementById("priorityWeight").value),
    fulfillmentWeight: parseInt(document.getElementById("fulfillmentWeight").value)
  };
  displayRules();
}

function displayRules() {
  document.getElementById("rulesOutput").innerText = JSON.stringify(rules, null, 2);
}

function downloadRules() {
  const blob = new Blob([JSON.stringify(rules, null, 2)], {
    type: "application/json"
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "rules.json";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
