#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const { execSync } = require('child_process')

// 解析命令行参数
function parseArgs() {
    const args = process.argv.slice(2)
    const config = {
        icon: null,
        round: false,
        roundRadius: 0,
        padding: 0,
        format: 'ico',
        output: null,
    }

    for (let i = 0; i < args.length; i++) {
        const arg = args[i]

        if (arg === '-icon' || arg === '--icon') {
            config.icon = args[++i]
        } else if (arg === '-round' || arg === '--round') {
            config.round = true
            // 检查下一个参数是否是数字（圆角半径）
            if (
                i + 1 < args.length &&
                !isNaN(parseFloat(args[i + 1])) &&
                !args[i + 1].startsWith('-')
            ) {
                config.roundRadius = parseFloat(args[++i])
            } else {
                // 默认圆角半径（约为图片尺寸的20%）
                config.roundRadius = null // 稍后根据图片尺寸计算
            }
        } else if (arg === '-padding' || arg === '--padding') {
            config.padding = parseFloat(args[++i]) || 0
        } else if (arg === '-format' || arg === '--format') {
            config.format = args[++i] || 'ico'
        } else if (
            arg === '-output' ||
            arg === '--output' ||
            arg === '-o' ||
            arg === '--o'
        ) {
            config.output = args[++i]
        } else if (arg === '-h' || arg === '--help') {
            console.log(`
用法: node createIcon.cjs [选项]

选项:
  -icon <路径>        输入图片路径（必填）
  -round [半径]       添加圆角，可选指定圆角半径（像素），不指定则使用默认值
  -padding <像素>     四周透明内边距（像素）
  -format <格式>      输出格式：ico 或 icns（默认：ico）
  -output <路径>      输出文件路径（可选，默认根据输入文件名生成）
  -h, --help         显示帮助信息

示例:
  node createIcon.cjs -icon icon.png -round -format ico
  node createIcon.cjs -icon icon.png -round 20 -padding 10 -format icns
  node createIcon.cjs -icon icon.png -round -padding 15 -format ico -output myicon.ico
            `)
            process.exit(0)
        }
    }

    // 验证必填参数
    if (!config.icon) {
        console.error('❌ 错误：必须指定 -icon 参数')
        console.error('使用 -h 或 --help 查看帮助信息')
        process.exit(1)
    }

    // 验证格式
    if (config.format !== 'ico' && config.format !== 'icns') {
        console.error(
            `❌ 错误：不支持的输出格式 "${config.format}"，仅支持 ico 和 icns`
        )
        process.exit(1)
    }

    return config
}

// 生成圆角掩码
function createRoundedMask(width, height, radius) {
    return sharp({
        create: {
            width,
            height,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
    })
        .toColourspace('srgb') // 确保使用 sRGB 颜色空间
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
async function processImage(
    inputPath,
    round = false,
    roundRadius = null,
    padding = 0
) {
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
    if (round) {
        const finalSize = padding > 0 ? size + 2 * padding : size
        // 如果没有指定圆角半径，使用默认值（约为尺寸的20%）
        const radius =
            roundRadius !== null ? roundRadius : Math.floor(finalSize * 0.2)
        const maskSharp = createRoundedMask(finalSize, finalSize, radius)
        const maskBuffer = await maskSharp.toBuffer()

        // 确保源图片有 alpha 通道和正确的颜色空间
        processed = processed
            .ensureAlpha() // 确保有 alpha 通道
            .toColourspace('srgb') // 确保使用 sRGB 颜色空间

        // 应用圆角掩码
        processed = processed.composite([
            {
                input: maskBuffer,
                blend: 'dest-in',
            },
        ])

        // composite 操作后，重新确保格式正确
        // 通过转换为 buffer 再重新创建 sharp 对象来重置状态
        const processedBuffer = await processed
            .ensureAlpha()
            .toColourspace('srgb')
            .png()
            .toBuffer()
        processed = sharp(processedBuffer)
    } else {
        // 即使没有圆角，也确保格式正确
        processed = processed.ensureAlpha().toColourspace('srgb')
    }

    return processed
}

// 生成ICNS文件（macOS专用）
async function generateICNS(processedImg, outputPath) {
    // macOS iconset 标准尺寸配置
    // 格式: { size: 尺寸, has2x: 是否有@2x版本 }
    const iconSizes = [
        { size: 16, has2x: true }, // 16x16 和 32x32@2x
        { size: 32, has2x: true }, // 32x32 和 64x64@2x
        { size: 128, has2x: true }, // 128x128 和 256x256@2x
        { size: 256, has2x: true }, // 256x256 和 512x512@2x
        { size: 512, has2x: true }, // 512x512 和 1024x1024@2x
        { size: 1024, has2x: false }, // 1024x1024 (无@2x)
    ]

    const tempDir = path.join(__dirname, `.icns-temp-${Date.now()}`)

    try {
        fs.mkdirSync(tempDir, { recursive: true })

        // 创建 iconset 目录结构
        const iconsetDir = path.join(tempDir, 'icon.iconset')
        fs.mkdirSync(iconsetDir, { recursive: true })

        // 先获取处理后的图片 buffer，避免重复使用同一个 sharp 对象
        // 确保使用sRGB颜色空间和RGBA格式（支持透明度）
        const sourceBuffer = await processedImg
            .toColourspace('srgb')
            .ensureAlpha() // 确保有alpha通道（透明度）
            .png()
            .toBuffer()

        // 生成所有尺寸的PNG
        for (const { size, has2x } of iconSizes) {
            // 生成标准尺寸
            const pngPath = path.join(iconsetDir, `icon_${size}x${size}.png`)
            await sharp(sourceBuffer)
                .resize(size, size, {
                    kernel: sharp.kernel.lanczos3, // 使用高质量重采样
                })
                .ensureAlpha() // 确保有alpha通道（透明度）
                .toColourspace('srgb') // 确保使用sRGB颜色空间（在png之前）
                .png({
                    compressionLevel: 9, // 最高压缩
                    palette: false, // 不使用调色板，保持全彩
                    quality: 100, // 最高质量
                })
                .toFile(pngPath)

            // 生成 @2x 版本（如果需要）
            if (has2x) {
                const size2x = size * 2
                const pngPath2x = path.join(
                    iconsetDir,
                    `icon_${size}x${size}@2x.png`
                )
                await sharp(sourceBuffer)
                    .resize(size2x, size2x, {
                        kernel: sharp.kernel.lanczos3,
                    })
                    .ensureAlpha() // 确保有alpha通道（透明度）
                    .toColourspace('srgb') // 确保使用sRGB颜色空间（在png之前）
                    .png({
                        compressionLevel: 9,
                        palette: false,
                        quality: 100,
                    })
                    .toFile(pngPath2x)
            }
        }

        // 验证iconset目录中的文件
        const files = fs.readdirSync(iconsetDir)
        console.log(`📦 已生成 ${files.length} 个图标文件`)

        // 验证所有PNG文件是否有效
        console.log('🔍 验证生成的PNG文件...')
        for (const file of files) {
            const filePath = path.join(iconsetDir, file)
            const stats = fs.statSync(filePath)
            if (stats.size === 0) {
                throw new Error(`图标文件为空：${file}`)
            }
            // 验证是否为有效的PNG文件
            try {
                const img = sharp(filePath)
                const metadata = await img.metadata()
                if (!metadata.width || !metadata.height) {
                    throw new Error(`无效的PNG文件：${file}`)
                }
                // 验证颜色空间
                if (metadata.space && metadata.space !== 'srgb') {
                    console.warn(
                        `⚠️  警告：${file} 的颜色空间是 ${metadata.space}，建议使用 sRGB`
                    )
                }
                // 验证通道数（应该支持透明度）
                if (metadata.channels < 4) {
                    console.warn(
                        `⚠️  警告：${file} 只有 ${metadata.channels} 个通道，建议使用 RGBA (4通道)`
                    )
                }
            } catch (err) {
                throw new Error(`PNG文件验证失败 ${file}：${err.message}`)
            }
        }
        console.log('✅ 所有PNG文件验证通过')

        // 使用iconutil生成ICNS（需macOS环境）
        console.log('🔄 正在使用 iconutil 生成 ICNS 文件...')
        try {
            // 使用绝对路径确保iconutil能找到文件
            const absoluteIconsetDir = path.resolve(iconsetDir)
            const absoluteOutputPath = path.resolve(outputPath)

            // 如果输出文件已存在，先删除
            if (fs.existsSync(absoluteOutputPath)) {
                fs.unlinkSync(absoluteOutputPath)
            }

            const result = execSync(
                `iconutil -c icns -o "${absoluteOutputPath}" "${absoluteIconsetDir}" 2>&1`,
                {
                    encoding: 'utf8',
                }
            )

            // 如果有输出，显示它（可能是警告信息）
            if (result && result.trim()) {
                console.log('iconutil 输出：', result.trim())
            }

            // 验证生成的ICNS文件是否存在且有效
            if (fs.existsSync(absoluteOutputPath)) {
                const stats = fs.statSync(absoluteOutputPath)
                if (stats.size > 0) {
                    console.log(`✅ ICNS文件已生成：${absoluteOutputPath}`)
                    console.log(
                        `   文件大小：${(stats.size / 1024).toFixed(2)} KB`
                    )

                    // 验证ICNS文件格式
                    try {
                        const fileCheck = execSync(
                            `file "${absoluteOutputPath}"`,
                            { encoding: 'utf8' }
                        )
                        console.log(`   文件类型：${fileCheck.trim()}`)
                    } catch (e) {
                        // 忽略file命令错误
                    }
                } else {
                    throw new Error('生成的ICNS文件为空')
                }
            } else {
                throw new Error('ICNS文件生成失败：文件不存在')
            }
        } catch (err) {
            if (err.code === 'ENOENT' || err.message.includes('iconutil')) {
                console.error(
                    '❌ 错误：生成ICNS需要macOS环境（依赖iconutil工具）'
                )
            } else {
                // 输出iconutil的错误信息
                if (err.stdout) {
                    console.error('iconutil 输出：', err.stdout)
                }
                if (err.stderr) {
                    console.error('iconutil 错误：', err.stderr)
                }
                if (err.message) {
                    console.error(`❌ 生成ICNS失败：${err.message}`)
                }
            }
            throw err
        }
    } finally {
        // 清理临时文件
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true })
        }
    }
}

// 生成ICO文件（Windows专用）
async function generateICO(processedImg, outputPath) {
    const icoSizes = [16, 32, 48, 64, 128, 256]

    // 尝试使用 png-to-ico 库生成多尺寸ICO
    let pngToIco
    try {
        // 先尝试 CommonJS require
        const pngToIcoModule = require('png-to-ico')
        pngToIco = pngToIcoModule.default || pngToIcoModule
    } catch (err) {
        // 如果 require 失败，尝试动态 import（Node.js 14+）
        try {
            const module = await import('png-to-ico')
            pngToIco = module.default || module
        } catch (importErr) {
            console.error('❌ 错误：无法加载 png-to-ico 库')
            console.error('   请运行: npm install png-to-ico')
            throw new Error('缺少 png-to-ico 依赖包')
        }
    }

    // 先获取处理后的图片 buffer，避免重复使用同一个 sharp 对象
    const sourceBuffer = await processedImg.png().toBuffer()

    // 生成所有尺寸的PNG缓冲
    const buffers = []
    for (const size of icoSizes) {
        const buffer = await sharp(sourceBuffer)
            .resize(size, size)
            .png()
            .toBuffer()
        buffers.push(buffer)
    }

    // 生成ICO文件
    const icoBuffer = await pngToIco(buffers)
    fs.writeFileSync(outputPath, icoBuffer)
    console.log(`✅ ICO文件已生成：${outputPath}`)
}

// 主函数
async function main() {
    try {
        const config = parseArgs()

        // 校验文件是否存在
        if (!fs.existsSync(config.icon)) {
            console.error(`❌ 错误：图片文件不存在 - ${config.icon}`)
            process.exit(1)
        }

        // 确定输出路径
        const inputName = path.basename(config.icon, path.extname(config.icon))
        const outputPath =
            config.output ||
            path.join(process.cwd(), `${inputName}.${config.format}`)

        // 处理图片
        console.log(`🔄 正在处理图片：${config.icon}`)
        if (config.round) {
            console.log(
                `   - 圆角：${
                    config.roundRadius !== null
                        ? config.roundRadius + 'px'
                        : '自动'
                }`
            )
        }
        if (config.padding > 0) {
            console.log(`   - 内边距：${config.padding}px`)
        }
        console.log(`   - 输出格式：${config.format.toUpperCase()}`)

        const processedImg = await processImage(
            config.icon,
            config.round,
            config.roundRadius,
            config.padding
        )

        // 生成对应格式的图标
        if (config.format === 'icns') {
            await generateICNS(processedImg, outputPath)
        } else if (config.format === 'ico') {
            await generateICO(processedImg, outputPath)
        }
    } catch (err) {
        console.error(`❌ 执行失败：${err.message}`)
        if (err.stack) {
            console.error(err.stack)
        }
        process.exit(1)
    }
}

// 启动脚本
main()
