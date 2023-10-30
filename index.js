const { app, BrowserWindow, ipcMain, nativeTheme } = require("electron");
const path = require("path");
const XLSX = require("xlsx");
const dataExcel = require("./data.json");
const { beautifyHeaders } = require("./helpers.js");
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

ipcMain.on("read-excel", (event, filePath) => {
  const workbook = XLSX.readFile(filePath);
  const sheetNames = workbook.SheetNames;
  const firstSheet = sheetNames[0];
  const worksheet = workbook.Sheets[firstSheet];
  const data = XLSX.utils.sheet_to_json(worksheet);
  event.reply("excel-data", data);
});

ipcMain.on("create-excel", () => {
  const beautifiedData = dataExcel.map((entry) => {
    let newObj = {};
    for (let key in entry) {
      newObj[beautifyHeaders(key)] = entry[key];
    }
    return newObj;
  });
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(beautifiedData);
  XLSX.utils.book_append_sheet(wb, ws, "Dogs");
  XLSX.writeFile(wb, "dog_grooming_database.xlsx");
});

app.whenReady().then(() => {
  createWindow();

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
