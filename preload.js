// 预加载脚本
// 这个脚本在网页内容加载之前运行，可以安全地暴露一些 API 给网页
const { ipcRenderer } = require('electron')
const { contextBridge } = require('electron')

// 暴露受保护的方法给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
    // 可以在这里添加需要暴露给网页的 API
    platform: process.platform,
    versions: {
        node: process.versions.node,
        chrome: process.versions.chrome,
        electron: process.versions.electron,
    },
    send: (channel, data) => {
        ipcRenderer.send(channel, data)
    },
})

// 页面加载完成后的初始化
window.addEventListener('DOMContentLoaded', () => {
    console.log('Preload script loaded')
})

ipcRenderer.on('webview-new-window', (e, webContentsId, details) => {
    console.log('webview-new-window', webContentsId, details)
    // 创建一个新的事件，并将 details 作为事件的 detail 属性
    const newEvent = new CustomEvent('new-window', { detail: details })
    document.getElementById('tab-1').dispatchEvent(newEvent)
})

ipcRenderer.on('webview-home', () => {
    console.log('webview-home-----222')
    // 发送全局事件到document，让renderer.js处理
    const newEvent = new CustomEvent('webview-home')
    document.dispatchEvent(newEvent)
})

ipcRenderer.on('webview-reload', () => {
    console.log('webview-reload-----222')
    // 发送全局事件到document，让renderer.js处理
    const newEvent = new CustomEvent('webview-reload')
    document.dispatchEvent(newEvent)
})

ipcRenderer.on('exit-app', () => {
    console.log('exit-app-----222')
    document.getElementById('password-dialog').style.display = 'flex'
    document.getElementById('password-input').value = ''
    document.getElementById('error-message').style.display = 'none'
    document.getElementById('password-input').focus()
    document
        .getElementById('password-input')
        .addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('password-confirm-btn').click()
            }
        })
    document
        .getElementById('password-confirm-btn')
        .addEventListener('click', () => {
            const password = document.getElementById('password-input').value
            ipcRenderer.send('verify-password', password)
        })
    document
        .getElementById('password-cancel-btn')
        .addEventListener('click', () => {
            document.getElementById('password-dialog').style.display = 'none'
        })
})

ipcRenderer.on('password-verify-error', (e, error) => {
    console.log('password-verify-error-----', error)
    document.getElementById('error-message').style.display = 'block'
})

ipcRenderer.on('password-verify-success', () => {
    console.log('password-verify-success-----')
    // 关闭密码对话框
    const passwordDialog = document.getElementById('password-dialog')
    if (passwordDialog) {
        passwordDialog.style.display = 'none'
    }
})