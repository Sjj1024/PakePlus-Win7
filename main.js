// main.js

const { app, BrowserWindow } = require('electron')
const path = require('path')

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            // 启用 nodeIntegration 以便在渲染进程中使用 require
            nodeIntegration: true,
            // 确保 contextIsolation 为 false，以便 webview 正常工作
            contextIsolation: false,
            // 启用 webview 标签
            webviewTag: true,
            webSecurity: false,
            preload: path.join(__dirname, 'preload.js'),
        },
    })

    mainWindow.loadFile('index.html')
    // mainWindow.webContents.openDevTools(); // 开发调试用
}

app.whenReady().then(createWindow)
