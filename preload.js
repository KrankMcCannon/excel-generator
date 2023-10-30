const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  startDrag: (fileName) => {
    ipcRenderer.send("ondragstart", fileName);
  },
  readExcel: (filePath) => {
    ipcRenderer.send("read-excel", filePath);
  },
  readOpenExcel: () => {
    ipcRenderer.send("read-open-excel");
  },
  onExcelData: (callback) => {
    ipcRenderer.on("excel-data", (event, data) => callback(data));
  },
  createExcelFile: (data) => {
    ipcRenderer.send("create-excel", data);
  },
});

contextBridge.exposeInMainWorld("darkMode", {
  toggle: () => ipcRenderer.invoke("dark-mode:toggle"),
  system: () => ipcRenderer.invoke("dark-mode:system"),
});
