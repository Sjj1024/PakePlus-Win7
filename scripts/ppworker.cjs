const fs = require('fs-extra')
const path = require('path')
const { execSync } = require('child_process')
const ppconfig = require('./ppconfig.json')

// Main execution
const main = async () => {
    console.log('🚀 worker start')
    const { name, version, url, password } = ppconfig
    console.log('name:', name)
    console.log('version:', version)
    console.log('url:', url)
    console.log('password:', password)
}

// run worker
main()
