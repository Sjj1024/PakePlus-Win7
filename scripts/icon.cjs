#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')

// 使用yargs解析参数（原生支持长参数，无需手动处理拆分）
const argv = yargs(hideBin(process.argv))
    .option('icon', {
        alias: 'i',
        describe: '输入图片路径（必填）',
        type: 'string',
        demandOption: true, // 强制要求-icon参数
    })
    .option('round', {
        alias: 'r',
        describe: '圆角半径（像素）',
        type: 'number',
        default: 0,
    })
    .option('padding', {
        alias: 'p',
        describe: '四周透明内边距（像素）',
        type: 'number',
        default: 0,
    })
    .option('format', {
        alias: 'f',
        describe: '输出格式（ico/icns）',
        type: 'string',
        default: 'ico',
        choices: ['ico', 'icns'], // 限制可选值
    })
    .option('output', {
        alias: 'o',
        describe: '输出文件路径',
        type: 'string',
    })
    .help('h')
    .alias('h', 'help')
    .parse()

// 调试用：打印解析后的参数
console.log('解析后的参数：', argv)

// 校验文件是否存在
if (!fs.existsSync(argv.icon)) {
    console.error(`❌ 错误：图片文件不存在 - ${argv.icon}`)
    process.exit(1)
}

// 生成圆角掩码（解决sharp圆角不支持透明背景的问题）
const createRoundedMask = (width, height, radius) => {
    return sharp({
        create: {
            width,
            height,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
    })
        .composite([
            {
                input: Buffer.from(`
        <svg width="${width}" height="${height}">
          <rect x="0" y="0" width="${width}" height="${height}" 
                rx="${radius}" ry="${radius}" 
                fill="white" />
        </svg>
      `),
                blend: 'dest-in',
            },
        ])
        .png()
}

// 处理图片（圆角+内边距）
const processImage = async (inputPath, round = 0, padding = 0) => {
    const img = sharp(inputPath)
    const metadata = await img.metadata()

    // 1. 先裁剪为正方形（图标标准）
    const size = Math.min(metadata.width, metadata.height)
    let processed = img.extract({
        left: Math.floor((metadata.width - size) / 2),
        top: Math.floor((metadata.height - size) / 2),
        width: size,
        height: size,
    })

    // 2. 添加内边距（透明）
    if (padding > 0) {
        const newSize = size + 2 * padding
        processed = processed.extend({
            top: padding,
            bottom: padding,
            left: padding,
            right: padding,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
    }

    // 3. 添加圆角
    if (round > 0) {
        const finalSize = padding > 0 ? size + 2 * padding : size
        const mask = await createRoundedMask(finalSize, finalSize, round)
        processed = processed.composite([
            {
                input: mask,
                blend: 'dest-in',
            },
        ])
    }

    return processed
}

// 生成ICNS文件（macOS专用）
const generateICNS = async (processedImg, outputPath) => {
    const icnsSizes = [16, 32, 64, 128, 256, 512, 1024]
    const tempDir = path.join(__dirname, `.icns-temp-${Date.now()}`)
    fs.mkdirSync(tempDir, { recursive: true })

    try {
        // 生成所有尺寸的PNG
        for (const size of icnsSizes) {
            const pngPath = path.join(tempDir, `icon_${size}x${size}.png`)
            await processedImg.resize(size, size).png().toFile(pngPath)
        }

        // 使用iconutil生成ICNS（需macOS环境）
        const { execSync } = require('child_process')
        execSync(`iconutil -c icns -o ${outputPath} ${tempDir}`, {
            stdio: 'ignore',
        })
        console.log(`✅ ICNS文件已生成：${outputPath}`)
    } catch (err) {
        if (err.message.includes('iconutil')) {
            console.error('❌ 错误：生成ICNS需要macOS环境（依赖iconutil工具）')
        } else {
            console.error(`❌ 生成ICNS失败：${err.message}`)
        }
        throw err
    } finally {
        // 清理临时文件
        fs.rmSync(tempDir, { recursive: true, force: true })
    }
}

// 生成ICO文件（Windows专用）
const generateICO = async (processedImg, outputPath) => {
    const icoSizes = [16, 32, 48, 64, 128, 256]
    const pngBuffers = []

    // 生成所有尺寸的PNG缓冲
    for (const size of icoSizes) {
        const buffer = await processedImg.resize(size, size).png().toBuffer()
        pngBuffers.push(buffer)
    }

    // 合并为ICO
    await sharp(pngBuffers).ico().toFile(outputPath)
    console.log(`✅ ICO文件已生成：${outputPath}`)
}

// 主函数
const main = async () => {
    try {
        // 默认参数
        const { icon, round, padding, format, output } = argv
        const inputName = path.basename(icon, path.extname(icon))
        const outputPath =
            output || path.join(process.cwd(), `${inputName}.${format}`)

        // 处理图片
        console.log(`🔄 正在处理图片：${icon}`)
        const processedImg = await processImage(icon, round, padding)

        // 生成对应格式的图标
        if (format === 'icns') {
            await generateICNS(processedImg, outputPath)
        } else if (format === 'ico') {
            await generateICO(processedImg, outputPath)
        }
    } catch (err) {
        console.error(`❌ 执行失败：${err.message}`)
        process.exit(1)
    }
}

// 启动脚本
main()
