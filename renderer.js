// Event listeners

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

const addColumnButton = document.getElementById('excel-data');
if (addColumnButton) {
  addColumnButton.addEventListener('click', (event) => {
    if (event.target && event.target.classList.contains('add-column-btn')) {
      addColumn(event);
    }
  });
}

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
    ["add-row", "create-table", "return-home"].forEach((id) => {
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

const returnHomeButton = document.getElementById("return-home");
if (returnHomeButton) {
  returnHomeButton.addEventListener("click", () => {
    document.getElementById("excel-data").innerHTML = '';
    ["prepare-table", "return-home", "create-table", "update-table", "add-row"].forEach((id) => {
      document.getElementById(id).style.display = id === "prepare-table" ? "block" : "none";
    });
  });
}

// After the table is generated and added to the DOM:
document.querySelectorAll('.add-column-btn').forEach(btn => {
  btn.addEventListener('click', addColumn);
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
  document.getElementById("return-home").style.display = "block";
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
  let tableHTML = "<thead><tr>";

  headers.forEach((header) => {
    tableHTML += `<th>${header} <button class="add-column-btn">+</button></th>`;
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
  if (table instanceof HTMLElement && table.innerHTML) {
    const headers = Array
    .from(table.querySelectorAll("thead th"))
    .slice(0, -1) // Exclude the 'Actions' column
    .map(th => th.childNodes[0].nodeValue.trim()); // Get only the text, excluding the button

  return Array
    .from(table.querySelectorAll("tbody tr"))
    .map(row => {
      const rowData = {};
      const cells = Array
        .from(row.cells)
        .slice(0, -1); // Exclude the 'Actions' column

      cells.forEach((cell, index) => {
        rowData[headers[index]] = cell.textContent.trim(); // Get text content of each cell
      });

      return rowData;
    });
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

function addColumn(event) {
  const clickedButton = event.target;
  const clickedHeader = clickedButton.closest('th');
  const headersRow = clickedHeader.parentNode;
  const table = headersRow.closest('table');
  const bodyRows = table.querySelectorAll("tbody tr");
  const columnIndex = Array.from(headersRow.children).indexOf(clickedHeader);

  // Insert new header cell
  const newHeaderCell = document.createElement("th");
  newHeaderCell.contentEditable = "true"; // Make it editable for naming
  newHeaderCell.innerText = "Nuova Colonna"; // Placeholder text, user can change it
  headersRow.insertBefore(newHeaderCell, clickedHeader.nextSibling);

  // Insert new cells in body rows
  bodyRows.forEach(row => {
    const newCell = document.createElement("td");
    newCell.contentEditable = "true";
    row.insertBefore(newCell, row.children[columnIndex + 1]);
  });
}

function createAddColumnButton() {
  const button = document.createElement("button");
  button.className = "add-column-btn";
  button.textContent = "+";
  button.addEventListener("click", addColumn);
  return button;
}

function updateDateAndTime() {
  const now = new Date();

  // Update Date
  const dateString = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  document.getElementById('date-display').textContent = dateString;

  // Update Time
  const timeString = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  document.getElementById('clock-display').textContent = timeString;
}

// Initialize and set the interval to update every second
updateDateAndTime();
setInterval(updateDateAndTime, 60000);
