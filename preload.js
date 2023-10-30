const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  startDrag: (fileName) => {
    ipcRenderer.send("ondragstart", fileName);
  },
  readExcel: (filePath) => {
    ipcRenderer.send("read-excel", filePath);
  },
  onExcelData: (callback) => {
    ipcRenderer.on("excel-data", (event, data) => callback(data));
  },
});

contextBridge.exposeInMainWorld("darkMode", {
  toggle: () => ipcRenderer.invoke("dark-mode:toggle"),
  system: () => ipcRenderer.invoke("dark-mode:system"),
});
