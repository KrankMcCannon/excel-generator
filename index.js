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

  // Use the helper function for reading the file
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

  const fileExtension = path.extname(currentOpenedFilePath);

  // Use the appropriate helper function based on the file extension
  if (fileExtension === ".xlsx") {
    await updateExcelFile(currentOpenedFilePath, tableData);
  } else if (fileExtension === ".csv") {
    await handleCSVFile(currentOpenedFilePath, tableData);
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
    // Use the appropriate helper function based on the file extension
    if (fileExtension === ".xlsx") {
      await createExcelFile(saveDialog.filePath, tableData);
    } else if (fileExtension === ".csv") {
      await handleCSVFile(saveDialog.filePath, tableData);
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
    icon: path.join(app.getAppPath(), "iconForDragAndDrop.png"),
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
  return jsonData;
};

// TODO: fix helper functions
const updateExcelFile = async (filePath, tableData) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.getWorksheet(1);
  tableData.forEach((rowData, rowIndex) => {
    const row = worksheet.getRow(rowIndex + 1);
    rowData.forEach((cellData, cellIndex) => {
      row.getCell(cellIndex + 1).value = cellData;
    });
    row.commit();
  });
  await workbook.xlsx.writeFile(filePath);
};

const handleCSVFile = async (filePath, tableData) => {
  const csvData = tableData.map(row => row.join(";")).join("\n");
  fs.writeFileSync(filePath, csvData);
};

const createExcelFile = async (filePath, tableData) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Dogs");
  tableData.forEach((rowData, rowIndex) => {
    const row = worksheet.getRow(rowIndex + 1);
    rowData.forEach((cellData, cellIndex) => {
      row.getCell(cellIndex + 1).value = cellData;
    });
    row.commit();
  });
  await workbook.xlsx.writeFile(filePath);
};