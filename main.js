// main.js

const { app, BrowserWindow, Menu, ipcMain } = require('electron')
const path = require('path')

let mainWindow = null

// 创建右键菜单
let contextMenu = Menu.buildFromTemplate([
    { label: 'Item 1', role: 'reload' },
    { role: 'editMenu' },
])

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minimizable: false, // 禁用最小化按钮
        closable: true, // 禁用关闭按钮
        resizable: false, // 禁用调整大小
        kiosk: true, // 全屏模式
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

    // 监听 webview 标签的加载完成事件
    mainWindow.webContents.on('did-attach-webview', (event, wc) => {
        console.log('did-attach-webview-----', wc)
        // 监听 webview 标签的窗口打开事件
        wc.setWindowOpenHandler((details) => {
            console.log('setWindowOpenHandler-----', details)
            // 发送事件到渲染进程
            mainWindow.webContents.send('webview-new-window', wc.id, details)
            // 阻止窗口打开
            return { action: 'deny' }
        })
    })

    mainWindow.webContents.on('context-menu', (e, params) => {
        contextMenu.popup()
    })

    mainWindow.loadFile('index.html')
    // mainWindow.webContents.openDevTools(); // 开发调试用
}

// 监听右键菜单事件
ipcMain.on('context-menu', (e, params) => {
    contextMenu.popup()
})

// 创建应用菜单
function createMenu() {
    const template = [
        {
            label: '主页',
            click: () => {
                if (mainWindow) {
                    // 发送事件到渲染进程
                    mainWindow.webContents.send('webview-home')
                }
            },
        },
        {
            label: '刷新',
            accelerator: 'CmdOrCtrl+R',
            click: () => {
                if (mainWindow) {
                    // 发送事件到渲染进程，刷新当前激活的webview
                    mainWindow.webContents.send('webview-reload')
                }
            },
        },
        // 开启开发者工具
        {
            label: '开发者工具',
            accelerator: 'CmdOrCtrl+I',
            click: () => {
                mainWindow.webContents.openDevTools()
            },
        },
        {
            label: '退出',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => {
                app.quit()
            },
        },
    ]

    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)
}

// 禁止打开任务管理器
function autoStart() {
    // 禁用Ctrl+Shift+Esc
    app.setLoginItemSettings({
        openAtLogin: true, // 设置应用为开机自启动
        openAsHidden: false, // 应用启动时是否隐藏
    })
}

app.whenReady().then(() => {
    createWindow()
    createMenu()
    autoStart()
})

// 阻止应用退出（可选，如果需要完全阻止退出）
// app.on('before-quit', (event) => {
//     // 如果需要完全阻止退出，取消注释下面这行
//     // event.preventDefault()
// })
