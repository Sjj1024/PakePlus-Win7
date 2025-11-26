// main.js

const { app, BrowserWindow } = require('electron')
const path = require('path')

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minimizable: false, // 禁用最小化按钮
        closable: true, // 禁用关闭按钮
        resizable: false, // 禁用调整大小
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

    // 确保窗口始终保持全屏状态
    mainWindow.setFullScreen(true)

    // 监听窗口试图退出全屏的事件，强制保持全屏
    mainWindow.on('leave-full-screen', () => {
        mainWindow.setFullScreen(true)
    })

    // 监听窗口试图最小化的事件，防止最小化
    mainWindow.on('minimize', () => {
        mainWindow.restore()
        mainWindow.setFullScreen(true)
    })

    // 监听窗口试图关闭的事件，阻止关闭
    // mainWindow.on('close', (event) => {
    //     event.preventDefault()
    //     mainWindow.setFullScreen(true)
    // })

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

// 阻止应用退出（可选，如果需要完全阻止退出）
// app.on('before-quit', (event) => {
//     // 如果需要完全阻止退出，取消注释下面这行
//     // event.preventDefault()
// })
