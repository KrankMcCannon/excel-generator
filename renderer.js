// Event listeners

document
  .getElementById("toggle-dark-mode")
  .addEventListener("click", async () => {
    const isDarkMode = await window.darkMode.toggle();
    document.getElementById("theme-source").innerText = isDarkMode
      ? "Dark"
      : "Light";
  });

const dropZone = document.getElementById("drag");
["dragover", "dragenter", "drop"].forEach((eventType) => {
  dropZone.addEventListener(eventType, preventDefaultActions);
});

dropZone.addEventListener("drop", (e) => {
  const filePath = e.dataTransfer.files[0].path;
  window.electron.readExcel(filePath);
});

window.electron.onExcelData((data) => {
  const table = processTableData(data);
  const headers = Object.keys(table[0]);
  document.getElementById("excel-data").innerHTML = generateTableHTML(
    headers,
    table
  );
  ["update-table", "prepare-table", "create-table"].forEach((id) => {
    document.getElementById(id).style.display =
      id === "update-table" ? "block" : "none";
  });
  document.getElementById("add-row").style.display = "block";
});

document.getElementById("prepare-table").addEventListener("click", () => {
  const headers = [
    "cane",
    "proprietario",
    "telefono",
    "razza",
    "data_ultimo_taglio",
    "data_prossimo_taglio",
    "servizio",
    "prezzo",
    "note",
  ].map((header) =>
    header
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  );

  document.getElementById("excel-data").innerHTML = generateTableHTML(headers);
  ["add-row", "create-table"].forEach((id) => {
    document.getElementById(id).style.display = "block";
  });
  document.getElementById("prepare-table").style.display = "none";
});

document.getElementById("add-row").addEventListener("click", () => {
  const table = document.getElementById("excel-data").querySelector("tbody");
  const newRow = table.insertRow();

  for (let i = 0; i < table.parentElement.rows[0].cells.length; i++) {
    const cell = newRow.insertCell(i);
    cell.contentEditable = "true";
  }
});

document.getElementById("update-table").addEventListener("click", () => {
  const table = document.getElementById("excel-data");
  const data = processTableData(table);
  window.electron.updateExcelFile(data);
});

document.getElementById("create-table").addEventListener("click", () => {
  const table = document.getElementById("excel-data");
  const data = processTableData(table);
  window.electron.createExcelFile(data);
});

["onUpdateResponse", "onCreateResponse"].forEach((eventType) => {
  window.electron[eventType]((response) => {
    showMessage(response.message);
  });
});

// Utility functions

function preventDefaultActions(e) {
  e.preventDefault();
  e.stopPropagation();
}

function generateTableHTML(headers, data = []) {
  console.log(headers, data);
  let tableHTML = "<thead><tr>";

  headers.forEach((header) => {
    tableHTML += `<th>${header}</th>`;
  });
  tableHTML += "</tr></thead><tbody>";

  if (data.length > 0) {
    data.forEach((row) => {
      tableHTML += "<tr>";
      headers.forEach((header) => {
        tableHTML += `<td contenteditable='true'>${row[header] || ""}</td>`;
      });
      tableHTML += "</tr>";
    });
  } else {
    tableHTML += "<tr>";
    headers.forEach(() => {
      tableHTML += `<td contenteditable='true'></td>`;
    });
    tableHTML += "</tr>";
  }

  tableHTML += "</tbody>";
  return tableHTML;
}

function processTableData(table) {
  if (table.rows?.length > 0) {
    const headers = Array.from(table.rows[0].cells).map(
      (cell) => cell.textContent
    );
    const rows = Array.from(table.rows).slice(1);

    return rows.map((row) => {
      const rowData = {};
      headers.forEach((header, index) => {
        rowData[header] = row.cells[index].textContent;
      });
      return rowData;
    });
  } else {
    const headers = table[0];
    const rows = table.slice(1);

    return rows.map((row) => {
      const rowData = {};
      headers.forEach((header, index) => {
        rowData[header] = row[index];
      });
      return rowData;
    });
  }
}

function showMessage(message) {
  const messageBox = document.getElementById("app-message");
  messageBox.textContent = message;
  messageBox.classList.toggle("app-message-hidden", false);
  messageBox.classList.toggle("app-message-visible", true);

  setTimeout(() => {
    messageBox.classList.toggle("app-message-visible", false);
    messageBox.classList.toggle("app-message-hidden", true);
  }, 5000);
}
