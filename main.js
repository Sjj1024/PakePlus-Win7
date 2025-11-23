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
            contextIsolation: true,
            // 启用 webview 标签
            webviewTag: true,
            webSecurity: false,
            preload: path.join(__dirname, 'preload.js'),
        },
    })

    mainWindow.webContents.on('did-attach-webview', (event, wc) => {
        console.log('did-attach-webview-----', wc)
        wc.setWindowOpenHandler((details) => {
            console.log('setWindowOpenHandler-----', details)
            mainWindow.webContents.send('webview-new-window', wc.id, details)
            return { action: 'deny' }
        })
    })

    mainWindow.loadFile('index.html')
    // mainWindow.webContents.openDevTools(); // 开发调试用
}

app.whenReady().then(createWindow)
