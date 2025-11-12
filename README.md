# PakePlus - Cross-Platform Desktop Application

Package any website into a cross-platform desktop app using Electron, with support for **Windows 7**.

## System Requirements

-   **Windows**: Windows 7 or later (Windows 7 SP1 or higher recommended)
-   **macOS**: macOS 10.10 or later
-   **Linux**: Major Linux distributions

> **Note**: Windows XP Support
>
> -   Electron 22.x does **not** support Windows XP
> -   To support Windows XP, you must use Electron 2.x or earlier versions (not recommended due to serious security vulnerabilities)
> -   Windows XP users are strongly encouraged to upgrade to Windows 7 or later

## Install Dependencies

```bash
npm install
```

## Development

```bash
npm start
```

## Configure Website URL

Edit the `config.js` file and modify the `websiteUrl` to the site you want to package:

```javascript
module.exports = {
    websiteUrl: 'https://www.example.com', // Modify this
    // ... other configurations
}
```

You can also configure window size, app title, and more options in `config.js`.

## Build Application

### Build for All Platforms

```bash
npm run build
```

### Build for Windows (32-bit & 64-bit)

```bash
npm run build:win
```

### Build for Windows 32-bit

```bash
npm run build:win32
```

### Build for Windows 64-bit

```bash
npm run build:win64
```

### Build for macOS

```bash
npm run build:mac
```

### Build for Linux

```bash
npm run build:linux
```

The packaged files will be generated in the `dist` directory.

## Windows 7 Compatibility Notice

This project uses **Electron 22.3.27**, which is the **last version that supports Windows 7**.
Main features:

-   ✅ Supports Windows 7 SP1 and later
-   ✅ Supports Windows 8/8.1
-   ✅ Supports Windows 10/11
-   ❌ Does **not** support Windows XP (requires Electron 2.x, not recommended)

## Project Structure

```
PakePlus-Win7/
├── main.js          # Electron main process
├── preload.js       # Preload script
├── package.json     # Project configuration
├── README.md        # Documentation
└── dist/            # Output directory after build
```

## Custom Configuration

### Change Application Icon

1. Prepare the icon files:

    - Windows: `build/icon.ico` (256x256)
    - macOS: `build/icon.icns`
    - Linux: `build/icon.png` (512x512)

2. Place the files in the `build` directory.

### Modify Application Information

Edit the `build` section in `package.json`:

```json
{
    "build": {
        "appId": "com.yourcompany.app",
        "productName": "Your App Name"
    }
}
```

## Common Issues

### 1. Website Not Loading

-   Check your network connection
-   Ensure the website URL is correct
-   Verify that the website supports HTTPS (some sites may require certificate handling)

### 2. Errors on Windows 7

-   Make sure you’re using **Windows 7 SP1**
-   Install the latest Windows updates
-   Install the **Visual C++ Redistributable**

### 3. Build Failures

-   Ensure all dependencies are installed: `npm install`
-   Check your Node.js version (recommended 16.x or 18.x)
-   Clear cache and retry: delete `node_modules` and `package-lock.json`, then reinstall
-   If you’re on an Apple Silicon Mac, make sure you’re using **Electron 22+** (already configured)

## License

MIT
