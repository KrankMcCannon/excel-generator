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
const XLSX = require("xlsx");
// require('update-electron-app')(); // uncomment to enable auto-updates

let currentOpenedFilePath = null; // No file opened by default

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

  const workbook = XLSX.readFile(filePath);
  const sheetNames = workbook.SheetNames;
  const firstSheet = sheetNames[0];
  const worksheet = workbook.Sheets[firstSheet];
  const data = XLSX.utils.sheet_to_json(worksheet);
  event.reply("excel-data", data);
});

ipcMain.on("read-open-excel", async (event) => {
  const { filePaths } = await dialog.showOpenDialog({
    filters: [{ name: "Excel", extensions: ["xlsx"] }],
  });

  // User canceled the dialog
  if (!filePaths && filePaths.length === 0) return;

  // Store the opened file path
  currentOpenedFilePath = filePaths[0];

  const workbook = XLSX.readFile(filePaths[0]);
  const sheetNames = workbook.SheetNames;
  const firstSheet = sheetNames[0];
  const worksheet = workbook.Sheets[firstSheet];
  const data = XLSX.utils.sheet_to_json(worksheet);

  // Sending data to renderer process
  event.sender.send("file-data", data);
});

// Existing File Update
ipcMain.on("update-excel", async (event, tableData) => {
  let filePath = currentOpenedFilePath;

  if (!filePath) {
    event.reply("update-response", { status: "error", message: "Create the file before update it" });
    return;
  }

  if (tableData && tableData.length) {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(tableData);
    XLSX.utils.book_append_sheet(wb, ws, "Dogs");
    XLSX.writeFile(wb, filePath);
    event.reply("update-response", { status: "success", message: "File updated successfully" });
  }
});

// New File Creation
ipcMain.on("create-new-excel", async (event, tableData) => {
  const tableValues = tableData.every((data) => !Object.values(data).every(value => value === ''));

  if (tableValues) {
    const saveDialog = await dialog.showSaveDialog({
      filters: [{ name: "Excel", extensions: ["xlsx, csv"] }],
    });
    let filePath = saveDialog.filePath;

    if (!filePath) return;

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(tableData);
    XLSX.utils.book_append_sheet(wb, ws, "Dogs");
    XLSX.writeFile(wb, filePath);
    event.reply("create-response", { status: "success", message: "File created successfully" });
  }

  event.reply("create-response", { status: "error", message: "Insert data before create it" });
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
        const workbook = XLSX.readFile(filePaths[0]);
        const sheetNames = workbook.SheetNames;
        const firstSheet = sheetNames[0];
        const worksheet = workbook.Sheets[firstSheet];
        const data = XLSX.utils.sheet_to_json(worksheet);
        // Send data to the renderer process or handle it
        const allWindows = BrowserWindow.getAllWindows();
        for (const window of allWindows) {
          window.webContents.send("excel-data", data);
        }
        // Additionally, store this file in recentFiles and update the menu
        recentFiles.unshift(filePaths[0]); // Add to the start
        if (recentFiles.length > 5) recentFiles.pop(); // Keep recent 5 files
        createMenu(); // Recreate the menu
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
    accelerator: process.platform === "darwin" ? "Cmd+Alt+I" : "Ctrl+Shift+I", // Common shortcut for DevTools
    click: () => {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) focusedWindow.webContents.toggleDevTools();
    },
  });

  const reloadMenuItem = new MenuItem({
    label: "Reload",
    accelerator: process.platform === "darwin" ? "Cmd+R" : "Ctrl+R", // Common shortcut for reloading
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
