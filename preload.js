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
    // 非常重要，不懂代码不要动，这里可以解决80%的问题，也可以生产1000+的bug
    const hookClick = (e) => {
        const origin = e.target.closest('a')
        const isBaseTargetBlank = document.querySelector(
            'head base[target="_blank"]'
        )
        console.log('origin', origin, isBaseTargetBlank)
        if (
            (origin && origin.href && origin.target === '_blank') ||
            (origin && origin.href && isBaseTargetBlank)
        ) {
            e.preventDefault()
            console.log('handle origin', origin)
            location.href = origin.href
        } else {
            console.log('not handle origin', origin)
        }
    }

    window.open = function (url, target, features) {
        console.log('open', url, target, features)
        location.href = url
    }

    document.addEventListener('click', hookClick, { capture: true })
})
