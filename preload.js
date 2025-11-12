// 预加载脚本
// 这个脚本在网页内容加载之前运行，可以安全地暴露一些 API 给网页

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
})

// 页面加载完成后的初始化
window.addEventListener('DOMContentLoaded', () => {
    console.log('Preload script loaded')
})
