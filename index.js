const {
  app,
  BrowserWindow,
  ipcMain,
  nativeTheme,
  dialog,
} = require("electron");
const path = require("path");
const fs = require("fs");
const ExcelJS = require("exceljs");
const csvParser = require("csv-parser");

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(app.getAppPath(), "preload.js"),
    },
  });

  win.loadFile("index.html");
};

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Event listeners

let currentOpenedFilePath = "";

ipcMain.on("open-file-dialog", async (event) => {
  const { filePaths } = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "Excel", extensions: ["xlsx", "csv"] }],
  });

  if (filePaths && filePaths.length > 0) {
    currentOpenedFilePath = filePaths[0];
    const fileContent = await readFileContent(filePaths[0]);
    event.sender.send("excel-data", fileContent);
  }
});

ipcMain.on("read-excel", async (event, filePath) => {
  const jsonData = await readFileContent(filePath);
  currentOpenedFilePath = filePath;
  event.reply("excel-data", jsonData);
});

ipcMain.on("update-excel", async (event, tableData) => {
  if (!currentOpenedFilePath) {
    event.reply("update-response", {
      status: "error",
      message: "C'è stato un errore nel caricamento del file",
    });
    return;
  }

  const tableValues = tableData.every(
    (data) => !Object.values(data).every((value) => value === "")
  );

  const fileExtension = path.extname(currentOpenedFilePath);

  if (tableValues) {
    if (fileExtension === ".xlsx") {
      await updateExcelFile(currentOpenedFilePath, tableData);
      event.reply("update-response", {
        status: "success",
        message: "File aggiornato con successo",
      });
    } else if (fileExtension === ".csv") {
      await handleCSVFile(currentOpenedFilePath, tableData);
      event.reply("update-response", {
        status: "success",
        message: "File aggiornato con successo",
      });
    }
  } else {
    event.reply("update-response", {
      status: "error",
      message: "Inserisci i dati prima di aggiornare il file",
    });
  }
});

ipcMain.on("create-new-excel", async (event, tableData) => {
  const tableValues = tableData.every(
    (data) => !Object.values(data).every((value) => value === "")
  );

  if (tableValues) {
    const saveDialog = await dialog.showSaveDialog({
      filters: [{ name: "Excel", extensions: ["xlsx", "csv"] }],
    });
    let filePath = saveDialog.filePath;

    if (!filePath) return;

    const fileExtension = path.extname(filePath);
    if (fileExtension === ".xlsx") {
      await createExcelFile(saveDialog.filePath, tableData);
      event.reply("create-response", {
        status: "success",
        message: "File creato con successo",
      });
    } else if (fileExtension === ".csv") {
      await handleCSVFile(saveDialog.filePath, tableData);
      event.reply("create-response", {
        status: "success",
        message: "File creato con successo",
      });
    }
  } else {
    event.reply("create-response", {
      status: "error",
      message: "Inserisci i dati prima di creare il file",
    });
  }
});

ipcMain.on("ondragstart", (event, filePath) => {
  event.sender.startDrag({
    file: path.join(app.getAppPath(), filePath),
  });
});

// Helper functions

const readFileContent = async (filePath) => {
  try {
    const fileExtension = path.extname(filePath);
    const jsonData = [];

    if (fileExtension === ".xlsx") {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      const worksheet = workbook.worksheets[0];

      let headers = [];
      let isHeaderProcessed = false;

      worksheet.eachRow((row) => {
        if (!isHeaderProcessed) {
          // Assuming the first row contains headers
          headers = row.values.slice(1); // Remove the first empty element
          isHeaderProcessed = true;
        } else {
          const rowObject = {};
          row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            rowObject[headers[colNumber - 1]] = cell.value;
          });
          jsonData.push(rowObject);
        }
      });
    } else if (fileExtension === ".csv") {
      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csvParser({ separator: ";" }))
          .on("data", (row) => {
            jsonData.push(row);
          })
          .on("end", resolve)
          .on("error", reject);
      });
    }

    return jsonData;
  } catch (error) {
    console.log(error);
    throw new Error("Error while reading the file");
  }
};

const updateExcelFile = async (filePath, tableData) => {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    workbook.removeWorksheet(workbook.worksheets[0].id);

    const worksheet = workbook.addWorksheet("Dogs");

    const headers = Object.keys(tableData[0]);
    worksheet.columns = headers.map((header) => ({
      header: header,
      key: header,
    }));

    // Write new rows with updated data
    tableData.forEach((rowData) => {
      worksheet.addRow(rowData).commit(); // rowData is an object where key is column header
    });

    // Save the workbook to the file
    await workbook.xlsx.writeFile(filePath);
  } catch (error) {
    console.log(error);
    throw new Error("Error while updating the file");
  }
};

const handleCSVFile = async (filePath, tableData) => {
  try {
    const header = Object.keys(tableData[0]).join(";");
    const rows = tableData.map((row) => Object.values(row).join(";"));
    const csvData = [header, ...rows].join("\n");
    fs.writeFileSync(filePath, csvData);
  } catch (error) {
    console.log(error);
    throw new Error("Error while updating the file");
  }
};

const createExcelFile = async (filePath, tableData) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Dogs");
    worksheet.columns = Object.keys(tableData[0]).map((key) => ({
      header: key,
      key,
    }));
    tableData.forEach((item) => {
      worksheet.addRow(item);
    });
    await workbook.xlsx.writeFile(filePath);
  } catch (error) {
    console.log(error);
    throw new Error("Error while creating the file");
  }
};
