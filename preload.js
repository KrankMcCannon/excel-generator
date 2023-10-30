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
  createExcelFile: () => {
    ipcRenderer.send("create-excel");
  },
});

contextBridge.exposeInMainWorld("darkMode", {
  toggle: () => ipcRenderer.invoke("dark-mode:toggle"),
  system: () => ipcRenderer.invoke("dark-mode:system"),
});
