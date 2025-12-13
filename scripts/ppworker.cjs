const fs = require('fs-extra')
const path = require('path')
const { execSync } = require('child_process')
const ppconfig = require('./ppconfig.json')

// update package.json build productName
const updatePackageJson = async (appName) => {
    const packageJson = await fs.readJson(path.join(__dirname, 'package.json'))
    packageJson.build.productName = appName
    await fs.writeJson(path.join(__dirname, 'package.json'), packageJson)
}

// update renderer.js DEFAULT_HOME_URL
const updateRendererJs = async (url) => {
    const rendererJs = await fs.readFile(
        path.join(__dirname, 'renderer.js'),
        'utf8'
    )
    const newRendererJs = rendererJs.replace(
        /'const DEFAULT_HOME_URL = ".*"/, // 匹配任意字符串
        `const DEFAULT_HOME_URL = "${url}"`
    )
    await fs.writeFile(path.join(__dirname, 'renderer.js'), newRendererJs)
}

// update main.js defaultExitPassword
const updateMainJs = async (password) => {
    const mainJs = await fs.readFile(path.join(__dirname, 'main.js'), 'utf8')
    const newMainJs = mainJs.replace(
        /const defaultExitPassword = ".*"/,
        `const defaultExitPassword = "${password}"`
    )
    await fs.writeFile(path.join(__dirname, 'main.js'), newMainJs)
}

// create icon
const createIcnsIcon = async () => {
    try {
        execSync(
            `node scripts/createIcon.cjs -icon icon.png -padding 1 -format icns`
        )
        console.log('🚀 icns icon created')
    } catch (error) {
        console.error('🚨 error creating icns icon:', error)
    }
}

const createIcoIcon = async () => {
    try {
        execSync(
            `node scripts/createIcon.cjs -icon icon.png -padding 1 -format ico`
        )
        console.log('🚀 ico icon created')
    } catch (error) {
        console.error('🚨 error creating ico icon:', error)
    }
}

// Main execution
const main = async () => {
    console.log('🚀 worker start')
    const { name, version, url, password } = ppconfig
    console.log('name:', name)
    console.log('version:', version)
    console.log('url:', url)
    console.log('password:', password)
    await updatePackageJson(name)
    await updateRendererJs(url)
    await updateMainJs(password)
    console.log('🚀 worker end')
}

// run worker
main()
