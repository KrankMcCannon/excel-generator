const {
  app,
  BrowserWindow,
  ipcMain,
  nativeTheme,
  dialog,
  Menu,
  MenuItem,
} = require("electron");
const path = require("path");
const fs = require("fs");
const ExcelJS = require("exceljs");
const csvParser = require("csv-parser");
// require('update-electron-app')(); // uncomment to enable auto-updates

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

const createMenu = () => {
  const recentFiles = [];
  const openMenuItem = new MenuItem({
    label: "Open...",
    click: async () => {
      const { filePaths } = await dialog.showOpenDialog({
        filters: [{ name: "Excel", extensions: ["xlsx", "csv"] }],
      });
      if (filePaths.length) {
        // Read the file
        const jsonData = await readFileContent(filePaths[0]);
        // Send the data to the renderer process
        const allWindows = BrowserWindow.getAllWindows();
        for (const window of allWindows) {
          window.webContents.send("excel-data", jsonData);
        }
        // Additionally, store this file in recentFiles and update the menu
        // Add to the start
        recentFiles.unshift(filePaths[0]);
        // Keep recent 5 files
        if (recentFiles.length > 5) recentFiles.pop();
        // Recreate the menu
        createMenu();
      }
    },
  });

  const recentMenuItems = recentFiles.map((file) => ({
    label: `Open Recent: ${path.basename(file)}`,
    click: async () => {
      ipcMain.emit("read-excel", null, file);
    },
  }));

  const devToolsMenuItem = new MenuItem({
    label: "Toggle DevTools",
    // Common shortcut for DevTools
    accelerator: process.platform === "darwin" ? "Cmd+Alt+I" : "Ctrl+Shift+I",
    click: () => {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) focusedWindow.webContents.toggleDevTools();
    },
  });

  const reloadMenuItem = new MenuItem({
    label: "Reload",
    // Common shortcut for reloading
    accelerator: process.platform === "darwin" ? "Cmd+R" : "Ctrl+R",
    click: () => {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) focusedWindow.reload();
    },
  });

  const template = [
    {
      label: "File",
      submenu: [openMenuItem, { type: "separator" }, ...recentMenuItems],
    },
    {
      label: "View",
      submenu: [devToolsMenuItem, reloadMenuItem],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
};

app.whenReady().then(() => {
  createWindow();
  createMenu();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Event listeners

let currentOpenedFilePath = "";

ipcMain.on("read-excel", async (event, filePath) => {
  const jsonData = await readFileContent(filePath);
  currentOpenedFilePath = filePath;
  event.reply("excel-data", jsonData);
});

ipcMain.on("read-open-excel", async (event) => {
  const { filePaths } = await dialog.showOpenDialog({
    filters: [{ name: "Excel", extensions: ["xlsx", "csv"] }],
  });

  // User canceled the dialog
  if (!filePaths && filePaths.length === 0) return;

  const jsonData = await readFileContent(filePaths[0]);
  currentOpenedFilePath = filePaths[0];
  event.sender.send("file-data", jsonData);
});

ipcMain.on("update-excel", async (event, tableData) => {
  if (!currentOpenedFilePath) {
    event.reply("update-response", {
      status: "error",
      message: "Create the file before update it",
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
        message: "File updated successfully",
      });
    } else if (fileExtension === ".csv") {
      await handleCSVFile(currentOpenedFilePath, tableData);
      event.reply("update-response", {
        status: "success",
        message: "File updated successfully",
      });
    }
  } else {
    event.reply("update-response", {
      status: "error",
      message: "Insert data before update it",
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
        message: "File created successfully",
      });
    } else if (fileExtension === ".csv") {
      await handleCSVFile(saveDialog.filePath, tableData);
      event.reply("create-response", {
        status: "success",
        message: "File created successfully",
      });
    }
  } else {
    event.reply("create-response", {
      status: "error",
      message: "Insert data before create it",
    });
  }
});

ipcMain.handle("dark-mode:toggle", () => {
  if (nativeTheme.shouldUseDarkColors) {
    nativeTheme.themeSource = "light";
  } else {
    nativeTheme.themeSource = "dark";
  }
  return nativeTheme.shouldUseDarkColors;
});

ipcMain.on("ondragstart", (event, filePath) => {
  event.sender.startDrag({
    file: path.join(app.getAppPath(), filePath),
  });
});

// Helper functions

const readFileContent = async (filePath) => {
  const fileExtension = path.extname(filePath);
  const jsonData = [];

  if (fileExtension === ".xlsx") {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];
    worksheet.eachRow({ includeEmpty: false }, (row) => {
      jsonData.push(row.values.slice(1));
    });
  } else if (fileExtension === ".csv") {
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csvParser())
        .on("data", (row) => {
          jsonData.push(Object.values(row)[0].split(";"));
        })
        .on("end", resolve)
        .on("error", reject);
    });
  }

  console.log("jsonData", jsonData);
  return jsonData;
};

// TODO: fix error when update excel file the updates are saved at the end of the file and not overwrites the data
const updateExcelFile = async (filePath, tableData) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.worksheets[0];
  // Assuming the first row contains headers
  // Remove the first empty value which is an artifact of the library
  const headers = worksheet.getRow(1).values.slice(1);

  // Map the incoming data by a unique identifier (like an ID),
  // assuming the first column in your data is a unique id.
  const dataMap = new Map(tableData.map((item) => [item[headers[0]], item]));

  // Start processing from the second row, since the first row contains headers
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // skip header row

    const rowId = row.getCell(1).value; // Unique identifier in the first cell
    if (dataMap.has(rowId)) {
      // Retrieve the data for this row ID
      const dataObject = dataMap.get(rowId);
      // Loop through each header and set the corresponding cell value
      headers.forEach((header, index) => {
        row.getCell(index + 1).value = dataObject[header]; // +1 as Excel rows are 1-indexed
      });
      dataMap.delete(rowId); // Remove the item from the map to avoid adding it later as a new row
    }
  });

  // Add new rows for any remaining items in the data map
  dataMap.forEach((dataObject) => {
    const newRowValues = headers.map((header) => dataObject[header]);
    worksheet.addRow(newRowValues).commit(); // Add and commit the new row
  });

  await workbook.xlsx.writeFile(filePath);
};

const handleCSVFile = async (filePath, tableData) => {
  const header = Object.keys(tableData[0]).join(";");
  const rows = tableData.map((row) => Object.values(row).join(";"));
  const csvData = [header, ...rows].join("\n");
  fs.writeFileSync(filePath, csvData);
};

const createExcelFile = async (filePath, tableData) => {
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
};
