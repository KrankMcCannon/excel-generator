// Event listeners

const openFileButton = document.getElementById("open-file");
if (openFileButton) {
  openFileButton.addEventListener("click", () => {
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

const addRowButton = document.getElementById("add-row");
if (addRowButton) {
  addRowButton.addEventListener("click", () => {
    const table = document.getElementById("excel-data").querySelector("tbody");
    const newRow = table.insertRow();

    for (let i = 0; i < table.parentElement.rows[0].cells.length; i++) {
      const cell = newRow.insertCell(i);
      if (i === 0) {
        cell.innerHTML = `<button type="checkbox" class="pin-row-btn" />`;
      } else if (
        i !== table.parentElement.rows[0].cells.length - 2 &&
        i !== table.parentElement.rows[0].cells.length - 1
      ) {
        cell.contentEditable = "true";
      } else if (i !== table.parentElement.rows[0].cells.length - 1) {
        cell.innerHTML = `<td><button class="three-dot-btn">...</button></td>`;
      } else {
        cell.innerHTML = `<td><button class="remove-row hidden">Remove</button></td>`;
      }
    }

    attachPinButtonListeners();
    attachThreeDotButtonListeners();
  });
}

const removeRowButton = document.getElementById("excel-data");
if (removeRowButton) {
  removeRowButton.addEventListener("click", (event) => {
    if (event.target && event.target.classList.contains("remove-row")) {
      const rowElement = event.target.closest("tr");
      if (rowElement) {
        rowElement.remove();
      }
    }
  });
}

const addColumnButton = document.getElementById("excel-data");
if (addColumnButton) {
  addColumnButton.addEventListener("click", (event) => {
    if (event.target && event.target.classList.contains("add-column-btn")) {
      addColumn(event.target);
    }
  });
}

const removeColumnButton = document.getElementById("excel-data");
if (removeColumnButton) {
  removeColumnButton.addEventListener("click", (event) => {
    if (event.target && event.target.classList.contains("remove-column-btn")) {
      removeColumn(event);
    }
  });
}

const prepareTableButton = document.getElementById("prepare-table");
if (prepareTableButton) {
  prepareTableButton.addEventListener("click", () => {
    const headers = [
      "preferito",
      "cane",
      "proprietario",
      "telefono",
      "razza",
      "data_ultimo_appuntamento",
      "data_prossimo_appuntamento",
      "servizio",
      "prezzo",
      "note",
    ].map((header) =>
      header
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    );

    document.getElementById("excel-data").innerHTML =
      generateTableHTML(headers);
    ["add-row", "create-table", "return-home"].forEach((id) => {
      document.getElementById(id).style.display = "block";
    });
    document.getElementById("prepare-table").style.display = "none";
    attachPinButtonListeners();
    attachThreeDotButtonListeners();
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

const updateTableButton = document.getElementById("update-table");
if (updateTableButton) {
  updateTableButton.addEventListener("click", () => {
    const table = document.getElementById("excel-data");
    const data = processTableData(table);
    window.electron.updateExcelFile(data);
  });
}

const returnHomeButton = document.getElementById("return-home");
if (returnHomeButton) {
  returnHomeButton.addEventListener("click", () => {
    document.getElementById("excel-data").innerHTML = "";
    [
      "prepare-table",
      "return-home",
      "create-table",
      "update-table",
      "add-row",
    ].forEach((id) => {
      document.getElementById(id).style.display =
        id === "prepare-table" ? "block" : "none";
    });
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
  document.getElementById("return-home").style.display = "block";
  attachSortButtonListeners();
  attachPinButtonListeners();
  attachThreeDotButtonListeners();
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
  let tableHTML = "<thead>";
  tableHTML += "<tr>";

  if (!headers.find((header) => header === "Preferito")) {
    headers.unshift("Preferito");
  }

  headers.forEach((header, index) => {
    if (header === "Preferito" || header === "Azioni") {
      tableHTML += `<th>${header}</th>`;
      return;
    }

    if (header === "") {
      tableHTML += "<th></th>";
      return;
    }

    tableHTML += `<th><div contenteditable='true'>${header}</div><button class="sort-btn" data-column-index="${index}">↕</button><div><button class="add-column-btn">+</button><button class="remove-column-btn">-</button></div></th>`;
  });

  tableHTML += "<th>Azioni</th>";
  tableHTML += "<th></th>";
  tableHTML += "</tr>";
  tableHTML += "</thead>";

  tableHTML += "<tbody>";
  if (data.length > 0) {
    data.forEach((row) => {
      tableHTML += `<tr ${row.Preferito ? "class='pinned-row'" : ""} >`;
      tableHTML += `<td><button type='checkbox' class='pin-row-btn' /></td>`;
      headers.forEach((header) => {
        if (header === "Preferito") return;
        tableHTML += `<td contenteditable='true'>${row[header] || ""}</td>`;
      });
      tableHTML += `<td><button class="three-dot-btn">...</button></td>`;
      tableHTML += `<td><button class="remove-row hidden">Rimuovi</button></td>`;
      tableHTML += "</tr>";
    });
  } else {
    tableHTML += "<tr>";
    tableHTML += `<td><button type="checkbox" class="pin-row-btn" /></td>`;
    headers.forEach(() => {
      tableHTML += `<td contenteditable='true'></td>`;
    });
    tableHTML += `<td><button class="three-dot-btn">...</button></td>`;
    tableHTML += `<td><button class="remove-row hidden">Rimuovi</button></td>`;
    tableHTML += "</tr>";
  }

  tableHTML += "</tbody>";
  return tableHTML;
}

function processTableData(table) {
  if (table instanceof HTMLElement && table.innerHTML) {
    // Get headers excluding the 'Preferito' and 'Azioni' columns
    const headers = Array.from(table.querySelectorAll("thead th"))
      .slice(1, -2) // Slice to exclude 'Preferito' and 'Azioni' columns
      .map((th) => {
        // Assuming your header text is in the first <div> directly under <th>
        const headerTextElement = th.querySelector("div:first-child");
        return headerTextElement
          ? headerTextElement.textContent.trim()
          : th.textContent.trim();
      });

    return Array.from(table.querySelectorAll("tbody tr")).map((row) => {
      const rowData = { Preferito: row.classList.contains("pinned-row") };
      const cells = Array.from(row.cells).slice(1, -2); // Slice to exclude 'Preferito' and 'Azioni' cells

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

function addColumn(clickedButton) {
  const clickedHeader = clickedButton.closest("th");
  const headersRow = clickedHeader.parentNode;
  const columnIndex = Array.from(headersRow.children).indexOf(clickedHeader);

  // Create new header cell
  const newHeaderCell = document.createElement("th");
  newHeaderCell.contentEditable = "true";
  newHeaderCell.innerText = "Nuova Colonna";

  // Create and append add and remove column buttons to the new header
  newHeaderCell.appendChild(createAddColumnButton());
  newHeaderCell.appendChild(createRemoveColumnButton());

  // Insert the new header cell after the clicked header
  if (clickedHeader.nextSibling) {
    headersRow.insertBefore(newHeaderCell, clickedHeader.nextSibling);
  } else {
    headersRow.appendChild(newHeaderCell);
  }

  // Insert new cells in body rows at the corresponding index
  const table = headersRow.closest("table");
  Array.from(table.querySelectorAll("tbody tr")).forEach((row) => {
    const newCell = document.createElement("td");
    newCell.contentEditable = "true";
    if (row.children[columnIndex + 1]) {
      row.insertBefore(newCell, row.children[columnIndex + 1]);
    } else {
      row.appendChild(newCell);
    }
  });
}

function removeColumn(event) {
  const clickedButton = event.target;
  const clickedHeader = clickedButton.closest("th");
  const headersRow = clickedHeader.parentNode;
  const table = headersRow.closest("table");
  const columnIndex = Array.from(headersRow.children).indexOf(clickedHeader);

  // Remove the header cell
  headersRow.removeChild(clickedHeader);

  // Remove the corresponding cells in body rows
  Array.from(table.querySelectorAll("tbody tr")).forEach((row) => {
    row.removeChild(row.children[columnIndex]);
  });
}

function createAddColumnButton() {
  const button = document.createElement("button");
  button.className = "add-column-btn";
  button.textContent = "+";
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    addColumn(button);
  });
  return button;
}

function createRemoveColumnButton() {
  const button = document.createElement("button");
  button.className = "remove-column-btn";
  button.textContent = "-";
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    removeColumn(event);
  });
  return button;
}

function updateDateAndTime() {
  const now = new Date();

  // Update Date
  const dateString = now.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  document.getElementById("date-display").textContent = dateString;

  // Update Time
  const timeString = now.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  document.getElementById("clock-display").textContent = timeString;
}

function attachSortButtonListeners() {
  const sortButtons = document.querySelectorAll(".sort-btn");
  sortButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const columnIndex = button.getAttribute("data-column-index");
      sortColumn(columnIndex);
    });
  });
}

let sortState = {};

function sortColumn(columnIndex) {
  // Get the current sort order or set default to 'none'
  let sortOrder = sortState[columnIndex] || "none";

  // Toggle sort order
  sortOrder =
    sortOrder === "asc" ? "desc" : sortOrder === "desc" ? "none" : "asc";
  sortState = { [columnIndex]: sortOrder };

  // Get table data
  const table = document.getElementById("excel-data");
  const rows = Array.from(table.querySelectorAll("tbody tr"));

  // Separate pinned rows
  const pinnedRows = rows.filter((row) => row.classList.contains("pinned-row"));
  const regularRows = rows.filter(
    (row) => !row.classList.contains("pinned-row")
  );

  if (sortOrder !== "none") {
    regularRows.sort((rowA, rowB) => {
      let valA = rowA.cells[parseInt(columnIndex)].textContent.trim();
      let valB = rowB.cells[parseInt(columnIndex)].textContent.trim();

      // Check if the values are dates or prices, and parse them
      if (isDateTime(valA) && isDateTime(valB)) {
        // Parse both values as dates with time
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      } else if (isDate(valA) && isDate(valB)) {
        // Parse both values as dates
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      } else if (isPrice(valA) && isPrice(valB)) {
        // Parse as float for price comparison
        valA = parseFloat(valA);
        valB = parseFloat(valB);
      } else {
        // Compare as lowercase strings
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      // Sorting logic
      if (valA < valB) {
        return sortOrder === "asc" ? -1 : 1;
      }
      if (valA > valB) {
        return sortOrder === "asc" ? 1 : -1;
      }
      return 0;
    });

    // Append sorted rows back to the table
    pinnedRows.forEach((row) => table.querySelector("tbody").prepend(row)); // Keep pinned rows at the top
    regularRows.forEach((row) => table.querySelector("tbody").appendChild(row)); // Append sorted regular rows
  }

  // Update UI arrows to reflect the new sort order
  updateSortArrows();
}

function updateSortArrows() {
  document.querySelectorAll(".sort-btn").forEach((button) => {
    const columnIndex = button.getAttribute("data-column-index");
    const sortOrder = sortState[columnIndex] || "none";
    switch (sortOrder) {
      case "none":
        button.textContent = "↕"; // or any neutral symbol
        break;
      case "asc":
        button.textContent = "↑";
        break;
      case "desc":
        button.textContent = "↓";
        break;
    }
  });
}

function isDateTime(value) {
  // Check for date-time format like "12/02/2022 14:53"
  const dateTimeRegex = /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/;
  return dateTimeRegex.test(value);
}

function isDate(value) {
  // Check for date format like "12/02/2022"
  const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
  return dateRegex.test(value);
}

function isPrice(value) {
  // Removing common currency symbols and commas
  const cleanedValue = value.replace(/[,$€£]/g, "").replace(/,/g, ".");
  return !isNaN(cleanedValue) && cleanedValue.trim() !== "";
}

function attachPinButtonListeners() {
  const pinButtons = document.querySelectorAll(".pin-row-btn");
  pinButtons.forEach((button) => {
    button.addEventListener("click", () => {
      pinRow(button);
    });
  });
}

function pinRow(clickedButton) {
  const row = clickedButton.closest("tr");
  const tableBody = row.closest("tbody");
  const allRows = Array.from(tableBody.querySelectorAll("tr"));
  const firstUnpinnedRow = allRows.find(r => !r.classList.contains("pinned-row"));

  tableBody.prepend(row); // Move the row to the top
  if (row.classList.contains("pinned-row")) {
    row.classList.remove("pinned-row");

    // Move row down under all pinned rows
    if (firstUnpinnedRow) {
      tableBody.insertBefore(row, firstUnpinnedRow);
    } else {
      tableBody.appendChild(row); // Append at the end if all rows are pinned
    }

    return;
  }

  row.classList.add("pinned-row");
  tableBody.prepend(row);
}

function attachThreeDotButtonListeners() {
  const threeDotButtons = document.querySelectorAll(".three-dot-btn");
  threeDotButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      const removeButtonTD = event.target.closest("tr").lastElementChild;
      const removeButton = removeButtonTD.firstElementChild;
      if (removeButton.classList.contains("hidden")) {
        removeButton.classList.toggle("hidden", false);
        return;
      }

      removeButton.classList.toggle("hidden", true);
    });
  });
}

// Initialize and set the interval to update every second
updateDateAndTime();
setInterval(updateDateAndTime, 60000);
