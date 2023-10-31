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

// No file opened by default
let currentOpenedFilePath = null;

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

ipcMain.handle("dark-mode:toggle", () => {
  if (nativeTheme.shouldUseDarkColors) {
    nativeTheme.themeSource = "light";
  } else {
    nativeTheme.themeSource = "dark";
  }
  return nativeTheme.shouldUseDarkColors;
});

ipcMain.handle("dark-mode:system", () => {
  nativeTheme.themeSource = "system";
});

ipcMain.on("read-excel", async (event, filePath) => {
  if (!filePath) return;

  // Store the opened file path
  currentOpenedFilePath = filePath;

  const fileExtension = path.extname(currentOpenedFilePath);

  if (fileExtension === ".xlsx") {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];
    const jsonData = [];
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      // `.slice(1)` because exceljs includes an extra empty item at the start of the array
      jsonData.push(row.values.slice(1));
    });
    // Assuming date is in column 4
    const dateColumn = worksheet.getColumn(4);
    dateColumn.numFmt = "dd-mm-yyyy";
    event.reply("excel-data", jsonData);
  } else if (fileExtension === ".csv") {
    const jsonData = [];
    const isFirstRow = true;
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on("data", (row) => {
        if (isFirstRow) {
          const keys = Object.keys(row)[0].split(";");
          const values = Object.values(row)[0].split(";");

          jsonData.push(keys);
          jsonData.push(values);
        }

        jsonData.push(Object.values(row)[0].split(";"));
      })
      .on("end", () => {
        event.reply("excel-data", jsonData);
      });
  }
});

ipcMain.on("read-open-excel", async (event) => {
  const { filePaths } = await dialog.showOpenDialog({
    filters: [{ name: "Excel", extensions: ["xlsx", "csv"] }],
  });

  // User canceled the dialog
  if (!filePaths && filePaths.length === 0) return;

  // Store the opened file path
  currentOpenedFilePath = filePaths[0];

  const fileExtension = path.extname(currentOpenedFilePath);

  if (fileExtension === ".xlsx") {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePaths[0]);
    const worksheet = workbook.worksheets[0];
    const jsonData = [];
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      // `.slice(1)` because exceljs includes an extra empty item at the start of the array
      jsonData.push(row.values.slice(1));
    });
    // Assuming date is in column 4
    const dateColumn = worksheet.getColumn(4);
    dateColumn.numFmt = "dd-mm-yyyy";

    // Sending data to renderer process
    event.sender.send("file-data", jsonData);
  } else if (fileExtension === ".csv") {
    const jsonData = [];
    const isFirstRow = true;
    fs.createReadStream(filePaths[0])
      .pipe(csvParser())
      .on("data", (row) => {
        if (isFirstRow) {
          const keys = Object.keys(row)[0].split(";");
          const values = Object.values(row)[0].split(";");

          jsonData.push(keys);
          jsonData.push(values);
        }

        jsonData.push(Object.values(row)[0].split(";"));
      })
      .on("end", () => {
        // Sending data to renderer process
        event.sender.send("file-data", jsonData);
      });
  }
});

// Existing File Update
ipcMain.on("update-excel", async (event, tableData) => {
  let filePath = currentOpenedFilePath;

  if (!filePath) {
    event.reply("update-response", {
      status: "error",
      message: "Create the file before update it",
    });
    return;
  }

  const tableValues = tableData.every(
    (data) => !Object.values(data).every((value) => value === "")
  );

  const fileExtension = path.extname(filePath);

  if (tableValues) {
    if (fileExtension === ".xlsx") {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.worksheets[0];
      worksheet.columns = Object.keys(tableData[0]).map((key) => ({
        header: key,
        key,
      }));
      tableData.forEach((item) => {
        worksheet.addRow(item);
      });
      // Assuming date is in column 4
      const dateColumn = worksheet.getColumn(4);
      dateColumn.numFmt = "dd-mm-yyyy";
      await workbook.xlsx.writeFile(filePath);
      event.reply("update-response", {
        status: "success",
        message: "File updated successfully",
      });
    } else if (fileExtension === ".csv") {
      const jsonData = [];
      const isFirstRow = true;
      fs.createReadStream(filePath)
        .pipe(csvParser())
        .on("data", (row) => {
          if (isFirstRow) {
            const keys = Object.keys(row)[0].split(";");
            const values = Object.values(row)[0].split(";");

            jsonData.push(keys);
            jsonData.push(values);
          }

          jsonData.push(Object.values(row)[0].split(";"));
        })
        .on("end", () => {
          // Sending data to renderer process
          event.reply("update-response", {
            status: "success",
            message: "File updated successfully",
          });
        });
    }
  } else {
    event.reply("update-response", {
      status: "error",
      message: "Don't remove all data from the table",
    });
  }
});

// New File Creation
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
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Dogs");
      worksheet.columns = Object.keys(tableData[0]).map((key) => ({
        header: key,
        key,
      }));
      tableData.forEach((item) => {
        worksheet.addRow(item);
      });
      // Assuming date is in column 4
      const dateColumn = worksheet.getColumn(4);
      dateColumn.numFmt = "dd-mm-yyyy";
      await workbook.xlsx.writeFile(filePath);
      event.reply("create-response", {
        status: "success",
        message: "File created successfully",
      });
    } else if (fileExtension === ".csv") {
      const header = Object.keys(tableData[0]).join(";");
      const rows = tableData.map(row => Object.values(row).join(";"));
      const csvData = [header, ...rows].join("\n");
      fs.writeFileSync(filePath, csvData);
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

const createMenu = () => {
  const recentFiles = [];
  const openMenuItem = new MenuItem({
    label: "Open...",
    click: async () => {
      const { filePaths } = await dialog.showOpenDialog({
        filters: [{ name: "Excel", extensions: ["xlsx", "csv"] }],
      });
      if (filePaths.length) {
        const fileExtension = path.extname(filePaths[0]);

        if (fileExtension === ".xlsx") {
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.readFile(filePaths[0]);
          const worksheet = workbook.worksheets[0];
          const jsonData = [];
          worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            // `.slice(1)` because exceljs includes an extra empty item at the start of the array
            jsonData.push(row.values.slice(1));
          });
          // Assuming date is in column 4
          const dateColumn = worksheet.getColumn(4);
          dateColumn.numFmt = "dd-mm-yyyy";
          // Send data to the renderer process or handle it
          const allWindows = BrowserWindow.getAllWindows();
          for (const window of allWindows) {
            window.webContents.send("excel-data", jsonData);
          }
        } else if (fileExtension === ".csv") {
          const jsonData = [];
          const isFirstRow = true;
          fs.createReadStream(filePaths[0])
            .pipe(csvParser())
            .on("data", (row) => {
              if (isFirstRow) {
                const keys = Object.keys(row)[0].split(";");
                const values = Object.values(row)[0].split(";");

                jsonData.push(keys);
                jsonData.push(values);
              }

              jsonData.push(Object.values(row)[0].split(";"));
            })
            .on("end", () => {
              // Send data to the renderer process or handle it
              const allWindows = BrowserWindow.getAllWindows();
              for (const window of allWindows) {
                window.webContents.send("excel-data", jsonData);
              }
            });
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

ipcMain.on("ondragstart", (event, filePath) => {
  event.sender.startDrag({
    file: path.join(app.getAppPath(), filePath),
    icon: path.join(app.getAppPath(), "iconForDragAndDrop.png"),
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
