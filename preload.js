const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  startDrag: (fileName) => {
    ipcRenderer.send("ondragstart", fileName);
  },
  readExcel: (filePath) => {
    ipcRenderer.send("read-excel", filePath);
  },
  openFile: () => {
    ipcRenderer.send('open-file-dialog');
  },
  onExcelData: (callback) => {
    ipcRenderer.on("excel-data", (event, data) => callback(data));
  },
  updateExcelFile: (data) => {
    ipcRenderer.send("update-excel", data);
  },
  createExcelFile: (data) => {
    ipcRenderer.send("create-new-excel", data);
  },
  onUpdateResponse: (callback) => {
    ipcRenderer.on("update-response", (event, data) => callback(data));
  },
  onCreateResponse: (callback) => {
    ipcRenderer.on("create-response", (event, data) => callback(data));
  },
});
