// Event listeners

const toggleDarkModeButton = document.getElementById("toggle-dark-mode");
if (toggleDarkModeButton) {
  toggleDarkModeButton.addEventListener("click", async () => {
    const isDarkMode = await window.darkMode.toggle();
    document.getElementById("theme-source").innerText = isDarkMode
      ? "Dark"
      : "Light";
  });
}

const openFileButton = document.getElementById('open-file');
if (openFileButton) {
  openFileButton.addEventListener('click', () => {
    window.electron.openFile();
  });
}

const dropZone = document.getElementById("drag");
if (dropZone) {
  ["dragover", "dragenter", "drop"].forEach((eventType) => {
    dropZone.addEventListener(eventType, preventDefaultActions);
  });

  dropZone.addEventListener("drop", (e) => {
    const filePath = e.dataTransfer.files[0].path;
    window.electron.readExcel(filePath);
  });
}

const removeRowButton = document.getElementById('excel-data');
if (removeRowButton) {
  removeRowButton.addEventListener('click', (event) => {
    if (event.target && event.target.classList.contains('remove-row')) {
      const rowElement = event.target.closest('tr');
      if (rowElement) {
        rowElement.remove();
      }
    }
  });
}

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

const prepareTableButton = document.getElementById("prepare-table");
if (prepareTableButton) {
  prepareTableButton.addEventListener("click", () => {
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
}

const addRowButton = document.getElementById("add-row");
if (addRowButton) {
  addRowButton.addEventListener("click", () => {
    const table = document.getElementById("excel-data").querySelector("tbody");
    const newRow = table.insertRow();

    for (let i = 0; i < table.parentElement.rows[0].cells.length; i++) {
      const cell = newRow.insertCell(i);
      if (i !== table.parentElement.rows[0].cells.length - 1) {
        cell.contentEditable = "true";
      } else {
        cell.innerHTML = `<button class="remove-row">Rimuovi</button>`;
      }
    }
  });
}

const updateTableButton = document.getElementById("update-table");
if (updateTableButton) {
  updateTableButton.addEventListener("click", () => {
    const table = document.getElementById("excel-data");
    const data = processTableData(table);
    window.electron.updateExcelFile(data);
  });
}

const createTableButton = document.getElementById("create-table");
if (createTableButton) {
  createTableButton.addEventListener("click", () => {
    const table = document.getElementById("excel-data");
    const data = processTableData(table);
    window.electron.createExcelFile(data);
  });
}

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
  let tableHTML = "<thead><tr>";

  headers.forEach((header) => {
    tableHTML += `<th>${header}</th>`;
  });
  tableHTML += '<th>Azioni</th>';
  tableHTML += "</tr></thead><tbody>";

  if (data.length > 0) {
    data.forEach((row) => {
      tableHTML += "<tr>";
      headers.forEach((header) => {
        tableHTML += `<td contenteditable='true'>${row[header] || ""}</td>`;
      });
      tableHTML += `<td><button class="remove-row">Rimuovi</button></td>`;
      tableHTML += "</tr>";
    });
  } else {
    tableHTML += "<tr>";
    headers.forEach(() => {
      tableHTML += `<td contenteditable='true'></td>`;
    });
    tableHTML += `<td><button class="remove-row">Rimuovi</button></td>`;
    tableHTML += "</tr>";
  }

  tableHTML += "</tbody>";
  return tableHTML;
}

function processTableData(table) {
  if (table.innerHTML) {
    const tableBody = table.innerHTML.match(/<tbody>(.*)<\/tbody>/);
    const tableRows = tableBody[1].match(/<tr>(.*?)<\/tr>/g);
    const tableHeaders = table.innerHTML.match(/<thead>(.*?)<\/thead>/);
    const tableHeadersRows = tableHeaders[1].match(/<th>(.*?)<\/th>/g);
    const tableHeadersText = tableHeadersRows.map((item) => item.replace(/<th>|<\/th>/g, ''));
    const tableObject = tableRows.map((row) => {
      const rowCells = row.match(/<td.*?>(.*?)<\/td>/g);
      const rowCellsText = rowCells.map((item) => item.replace(/<td.*?>|<\/td>/g, ''));
      const rowObject = {};
      rowCellsText.forEach((item, index) => {
        if (tableHeadersText[index] !== 'Actions') {
          rowObject[tableHeadersText[index]] = item;
        }
      });
      return rowObject;
    });
    return tableObject;
  } else {
    return table;
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
