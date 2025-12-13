// main.js
const { app, BrowserWindow, Menu, ipcMain } = require('electron')
const path = require('path')

let mainWindow = null
// 标记是否是 webview 的全屏操作
let isWebviewFullscreen = false
// 标记密码是否已验证
let passwordVerified = false
// 默认退出密码
const defaultExitPassword = '222222'

// 创建右键菜单
let contextMenu = Menu.buildFromTemplate([
    {
        label: '退出',
        click: () => {
            mainWindow.webContents.send('exit-app')
        },
    },
])

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minimizable: false, // 禁用最小化按钮
        closable: true, // 禁用关闭按钮
        resizable: false, // 禁用调整大小
        kiosk: true, // 全屏模式
        autoHideMenuBar: true, // 自动隐藏菜单栏
        frame: false, // 无边框窗口（隐藏标题栏）
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
        // 如果是 webview 的全屏操作导致的退出，不强制窗口重新进入全屏
        // 使用 setImmediate 确保 webview 事件已经处理
        setImmediate(() => {
            if (isWebviewFullscreen) {
                isWebviewFullscreen = false
                return
            }
            // 否则强制保持全屏
            mainWindow.setFullScreen(true)
        })
    })

    // 监听窗口试图最小化的事件，防止最小化
    mainWindow.on('minimize', () => {
        mainWindow.restore()
        mainWindow.setFullScreen(true)
    })

    // 监听窗口试图关闭的事件，阻止 Alt+F4 等关闭操作
    mainWindow.on('close', (event) => {
        // 如果密码已验证，允许关闭
        if (passwordVerified) {
            passwordVerified = false // 重置标志
            return
        }
        // 否则阻止关闭并显示密码对话框
        event.preventDefault()
        mainWindow.webContents.send('exit-app')
    })

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

        // 监听 webview 进入全屏事件
        wc.on('enter-full-screen', () => {
            console.log('webview enter-full-screen')
            isWebviewFullscreen = true
        })

        // 监听 webview 退出全屏事件
        wc.on('leave-full-screen', () => {
            console.log('webview leave-full-screen')
            isWebviewFullscreen = true // 标记为 webview 全屏操作
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

// 监听切换开发者工具事件
ipcMain.on('toggle-devtools', () => {
    if (mainWindow) {
        if (mainWindow.webContents.isDevToolsOpened()) {
            mainWindow.webContents.closeDevTools()
        } else {
            mainWindow.webContents.openDevTools()
        }
    }
})

// 监听密码验证请求
ipcMain.on('verify-password', (event, password) => {
    console.log('verify-password-----', password)
    if (password === defaultExitPassword) {
        // 设置密码验证标志
        passwordVerified = true
        // 关闭密码对话框
        event.sender.send('password-verify-success')
        // 延迟退出，确保消息已发送
        setTimeout(() => {
            app.quit()
        }, 100)
    } else {
        event.sender.send('password-verify-error', '密码错误')
    }
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
                mainWindow.webContents.send('exit-app')
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
    // createMenu() // 不再需要菜单栏，按钮已移到 tab 栏
    autoStart()
    // 初始化密码验证标志
    passwordVerified = false
})

// 阻止应用退出（可选，如果需要完全阻止退出）
// app.on('before-quit', (event) => {
//     // 如果需要完全阻止退出，取消注释下面这行
//     // event.preventDefault()
// })
