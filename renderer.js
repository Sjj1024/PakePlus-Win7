// renderer.js

const tabBar = document.getElementById('tab-bar')
const tabContent = document.getElementById('tab-content')
let tabIdCounter = 0

/**
 * 添加新的标签页
 * @param {string} url - 默认加载的 URL
 */
// renderer.js (更新 addNewTab 函数)

function addNewTab(url) {
    console.log('addNewTab-----', url)
    tabIdCounter++
    const tabId = `tab-${tabIdCounter}`
    console.log('tabId-----', tabId)
    // 1. 创建标签页元素容器
    const tabEl = document.createElement('div')
    tabEl.className = 'tab'
    tabEl.id = `header-${tabId}`

    // 创建标题文本
    const titleSpan = document.createElement('span')
    titleSpan.textContent = '新标签页' // 初始标题
    titleSpan.className = 'tab-title'
    // 点击标题时激活标签页
    titleSpan.onclick = () => activateTab(tabId)

    // 创建关闭按钮
    const closeBtn = document.createElement('span')
    closeBtn.textContent = '×' // 使用 '×' 作为关闭符号
    closeBtn.className = 'close-btn'
    // 阻止点击关闭按钮时触发标签页激活
    closeBtn.onclick = (event) => {
        event.stopPropagation() // 阻止事件冒泡到 tabEl 的 onclick
        closeTab(tabId)
    }

    // 将标题和关闭按钮添加到标签页元素中
    tabEl.appendChild(titleSpan)
    tabEl.appendChild(closeBtn)

    tabBar.insertBefore(tabEl, document.getElementById('new-tab-btn'))

    // ... (WebView 创建逻辑保持不变) ...

    const webview = document.createElement('webview')
    webview.className = 'tab-webview'
    webview.id = tabId
    webview.src = url
    webview.setAttribute('allowpopups', 'on')

    // 关键：监听 webview 事件
    setupWebviewListeners(webview, titleSpan) // 注意：现在传入的是 titleSpan

    tabContent.appendChild(webview)

    // 3. 激活新标签
    activateTab(tabId)
}

/**
 * 激活指定的标签页
 * @param {string} targetId - 要激活的 webview ID
 */
function activateTab(targetId) {
    // 移除所有激活状态
    document
        .querySelectorAll('.tab')
        .forEach((t) => t.classList.remove('active'))
    document
        .querySelectorAll('.tab-webview')
        .forEach((w) => w.classList.remove('active'))

    // 设置目标激活状态
    document.getElementById(`header-${targetId}`).classList.add('active')
    document.getElementById(targetId).classList.add('active')
}

// 初始创建一个默认标签页
addNewTab('https://juejin.cn/')

// renderer.js (接着上面的代码)

/**
 * 设置 webview 的事件监听器
 * @param {HTMLElement} webview - webview 元素
 * @param {HTMLElement} tabEl - 对应的标签头元素
 */
function setupWebviewListeners(webview, tabEl) {
    // 监听页面请求新窗口事件 (例如：target="_blank" 的链接)
    webview.addEventListener('new-window', (e) => {
        // e.preventDefault()
        console.log('new-window----', e)
        // 在新标签页中打开新窗口的 URL
        addNewTab(e.detail.url)
    })

    webview.addEventListener('webview-home', () => {
        console.log('webview-home-----111')
        // 当前激活的标签页加载主页
        const activeTab = document.querySelector('.tab.active')
        if (activeTab) {
            // 找到当前激活的标签页的 webview
            const targetId = activeTab.id.replace('header-', '')
            const webviewEl = document.getElementById(targetId)
            if (webviewEl) {
                webviewEl.src = 'https://www.csdn.net/'
            } else {
                console.log('webviewEl not found-----')
            }
        } else {
            console.log('activeTab not found-----')
        }
    })

    // 监听页面加载完成，获取标题
    webview.addEventListener('dom-ready', () => {
        // 也可以在这里执行一些脚本，例如自定义右键菜单
        console.log('dom-ready-----')
    })

    // 监听页面导航，更新标签标题
    webview.addEventListener('page-title-updated', (e) => {
        console.log('page-title-updated-----', e.title)
        tabEl.textContent = e.title.substring(0, 10) + '...' // 截断标题，防止过长
    })
}

// renderer.js (新增 closeTab 函数)

/**
 * 关闭指定的标签页和 webview
 * @param {string} targetId - 要关闭的 webview ID
 */
function closeTab(targetId) {
    const tabEl = document.getElementById(`header-${targetId}`)
    const webviewEl = document.getElementById(targetId)

    if (!tabEl || !webviewEl) return

    // 检查是否是当前激活的标签页
    const wasActive = tabEl.classList.contains('active')

    // 1. 移除元素
    tabEl.remove()
    webviewEl.remove()

    // 2. 如果关闭的是当前激活的标签页，则需要激活另一个标签页
    if (wasActive) {
        // 尝试激活下一个标签页
        const nextTab = tabBar.querySelector('.tab')
        if (nextTab) {
            // 从 header ID 获取 webview ID (例如: "header-tab-1" -> "tab-1")
            const nextTabId = nextTab.id.replace('header-', '')
            activateTab(nextTabId)
        } else {
            // 如果所有标签页都关闭了，则自动新建一个默认标签页
            addNewTab('https://www.google.com')
        }
    }
}
