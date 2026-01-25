const { app, BrowserWindow, Menu } = require('electron')
const path = require('path')
const config = require('./config')

const WEBSITE_URL = config.websiteUrl

let mainWindow

function createWindow() {
    mainWindow = new BrowserWindow({
        width: config.windowWidth,
        height: config.windowHeight,
        minWidth: config.minWidth,
        minHeight: config.minHeight,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: true,
        },
        // Windows 7 兼容性设置
        show: false,
        backgroundColor: '#ffffff',
    })

    // 加载网站
    mainWindow.loadURL(WEBSITE_URL)

    // 窗口准备好后显示
    mainWindow.once('ready-to-show', () => {
        mainWindow.show()

        // 根据配置决定是否打开开发者工具
        if (config.openDevTools) {
            mainWindow.webContents.openDevTools()
        }
    })

    // 当窗口被关闭时
    mainWindow.on('closed', () => {
        mainWindow = null
    })

    // 处理外部链接
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        require('electron').shell.openExternal(url)
        return { action: 'deny' }
    })
}

// 创建应用菜单
function createMenu() {
    const template = [
        {
            label: '文件',
            submenu: [
                {
                    label: '刷新',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.reload()
                        }
                    },
                },
                {
                    label: '强制刷新',
                    accelerator: 'CmdOrCtrl+Shift+R',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.reloadIgnoringCache()
                        }
                    },
                },
                { type: 'separator' },
                {
                    label: '退出',
                    accelerator:
                        process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                    click: () => {
                        app.quit()
                    },
                },
            ],
        },
        {
            label: '视图',
            submenu: [
                {
                    label: '实际大小',
                    accelerator: 'CmdOrCtrl+0',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.setZoomLevel(0)
                        }
                    },
                },
                {
                    label: '放大',
                    accelerator: 'CmdOrCtrl+Plus',
                    click: () => {
                        if (mainWindow) {
                            const currentZoom =
                                mainWindow.webContents.getZoomLevel()
                            mainWindow.webContents.setZoomLevel(
                                currentZoom + 0.5
                            )
                        }
                    },
                },
                {
                    label: '缩小',
                    accelerator: 'CmdOrCtrl+-',
                    click: () => {
                        if (mainWindow) {
                            const currentZoom =
                                mainWindow.webContents.getZoomLevel()
                            mainWindow.webContents.setZoomLevel(
                                currentZoom - 0.5
                            )
                        }
                    },
                },
                { type: 'separator' },
                {
                    label: '开发者工具',
                    accelerator: 'F12',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.toggleDevTools()
                        }
                    },
                },
            ],
        },
        {
            label: '帮助',
            submenu: [
                {
                    label: '关于',
                    click: () => {
                        require('electron').dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: '关于',
                            message: config.appTitle,
                            detail: '跨平台桌面应用\n支持 Windows 7',
                        })
                    },
                },
            ],
        },
    ]

    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)
}

// 当 Electron 完成初始化并准备创建浏览器窗口时调用
app.whenReady().then(() => {
    createWindow()
    // createMenu()

    app.on('activate', () => {
        // 在 macOS 上，当点击 dock 图标并且没有其他窗口打开时，
        // 通常在应用程序中重新创建一个窗口
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

// 当所有窗口都被关闭时退出应用
app.on('window-all-closed', () => {
    // 在 macOS 上，除非用户用 Cmd + Q 确定地退出，
    // 否则绝大部分应用程序及其菜单栏会保持激活
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

// 处理证书错误（某些网站可能需要）
app.on(
    'certificate-error',
    (event, webContents, url, error, certificate, callback) => {
        // 在生产环境中，你可能想要更严格地处理证书错误
        // 这里为了兼容性，允许所有证书
        event.preventDefault()
        callback(true)
    }
)
