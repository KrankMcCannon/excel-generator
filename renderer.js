document
  .getElementById("toggle-dark-mode")
  .addEventListener("click", async () => {
    const isDarkMode = await window.darkMode.toggle();
    document.getElementById("theme-source").innerHTML = isDarkMode
      ? "Dark"
      : "Light";
  });

document
  .getElementById("reset-to-system")
  .addEventListener("click", async () => {
    await window.darkMode.system();
    document.getElementById("theme-source").innerHTML = "System";
  });

const dropZone = document.getElementById("drag");
const fileContentDiv = document.getElementById("file-content");

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
});

document.getElementById("create-excel").addEventListener("click", () => {
  window.electron.createExcelFile();
});
