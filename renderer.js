document
  .getElementById("toggle-dark-mode")
  .addEventListener("click", async () => {
    const isDarkMode = await window.darkMode.toggle();
    document.getElementById("theme-source").innerHTML = isDarkMode
      ? "Dark"
      : "Light";
  });

const dropZone = document.getElementById("drag");

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  e.stopPropagation();
});

dropZone.addEventListener("dragenter", (e) => {
  e.preventDefault();
  e.stopPropagation();
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  e.stopPropagation();

  const filePath = e.dataTransfer.files[0].path;
  window.electron.readExcel(filePath);
});

window.electron.onExcelData((data) => {
  // This is your Excel data
  let tableHTML = "<thead><tr>";

  // Assume that the first row of your Excel file contains the headers
  for (let header in data[0]) {
    tableHTML += `<th>${header}</th>`;
  }
  tableHTML += "</tr></thead><tbody>";

  for (let row of data) {
    tableHTML += "<tr>";
    for (let header in row) {
      tableHTML += `<td>${row[header]}</td>`;
    }
    tableHTML += "</tr>";
  }
  tableHTML += "</tbody>";

  document.getElementById("excel-data").innerHTML = tableHTML;
  document.getElementById("update-table").style.display = "block";
  document.getElementById("create-table").style.display = "none";
});

document.getElementById("prepare-table").addEventListener("click", () => {
  let tableHTML = "<table id='excel-data'><thead><tr>";
  const headers = [
    "dog_name",
    "breed",
    "age",
    "last_grooming_date",
    "service_type",
    "notes",
  ];

  // Generating headers
  headers.forEach((header) => {
    tableHTML += `<th>${header
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")}</th>`;
  });

  tableHTML += "</tr></thead><tbody>";

  // Add one empty row
  tableHTML += "<tr>";
  headers.forEach(() => {
    tableHTML += `<td contenteditable='true'></td>`; // contenteditable allows user to input data
  });
  tableHTML += "</tr>";

  tableHTML += "</tbody></table>";

  // Inserting the table into the HTML
  const tableContainer = document.getElementById("excel-data");
  tableContainer.innerHTML = tableHTML;

  // Make 'Add New Row' and 'Create File' buttons visible and hide 'Prepare Table' and 'Update File' buttons
  document.getElementById("add-row").style.display = "block";
  document.getElementById("create-table").style.display = "block";
  document.getElementById("update-table").style.display = "none";
  document.getElementById("prepare-table").style.display = "none";
});

document.getElementById("add-row").addEventListener("click", () => {
  const table = document
    .getElementById("excel-data")
    .getElementsByTagName("tbody")[0];
  const newRow = table.insertRow(table.rows.length);

  for (let i = 0; i < table.parentElement.rows[0].cells.length; i++) {
    let cell = newRow.insertCell(i);
    cell.contentEditable = "true";
  }

  // Show the "Add New Row" button
  document.getElementById("add-row").style.display = "block";
});

document.getElementById("update-table").addEventListener("click", () => {
  const table = document.getElementById("excel-data");
  const headers = Array.from(table.rows[0].cells).map(
    (header) => header.textContent
  );
  // Exclude headers
  const rows = Array.from(table.rows).slice(1);

  const data = rows.map((row) => {
    let rowData = {};
    headers.forEach((header, index) => {
      rowData[header] = row.cells[index].textContent;
    });
    return rowData;
  });

  window.electron.updateExcelFile(data);
});

document.getElementById("create-table").addEventListener("click", () => {
  const table = document.getElementById("excel-data");
  const headers = Array.from(table.rows[0].cells).map(
    (header) => header.textContent
  );
  // Exclude headers
  const rows = Array.from(table.rows).slice(1);

  const data = rows.map((row) => {
    let rowData = {};
    headers.forEach((header, index) => {
      rowData[header] = row.cells[index].textContent;
    });
    return rowData;
  });

  window.electron.createNewExcelFile(data);
});

function showMessage(message) {
  const messageBox = document.getElementById('app-message');
  messageBox.textContent = message;
  messageBox.classList.remove('app-message-hidden');
  messageBox.classList.add('app-message-visible');

  // Optionally, hide the message after some time, e.g., 5 seconds
  setTimeout(() => {
      messageBox.classList.remove('app-message-visible');
      messageBox.classList.add('app-message-hidden');
  }, 5000); // 5 seconds
}

window.electron.onUpdateResponse((response) => {
  if (response.status === "error") {
    showMessage(response.message);
  } else if (response.status === "success") {
    showMessage(response.message);
  }
});

window.electron.onCreateResponse((response) => {
  if (response.status === "error") {
    showMessage(response.message);
  } else if (response.status === "success") {
    showMessage(response.message);
  }
});