import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 定义需要生成的图片尺寸
const sizes = [
  { size: 16, filename: 'logo16.png' },
  { size: 32, filename: 'logo32.png' },
  { size: 48, filename: 'logo48.png' },
  { size: 64, filename: 'logo64.png' },
  { size: 168, filename: 'logo168.png' },
  { size: 256, filename: 'logo256.png' },
]

// 源图片路径和输出目录
const sourceImagePath = path.join(__dirname, '../public/logo.png')
const imgOutputDir = path.join(__dirname, '../public/img')
const iconsOutputDir = path.join(__dirname, '../public/icons')

async function generateLogos() {
  try {
    // 检查源图片是否存在
    if (!fs.existsSync(sourceImagePath)) {
      console.error(
        '❌ 源图片不存在！请将256px的logo图片重命名为 logo-source.png 并放置在 public 目录下',
      )
      console.log('📍 期望路径:', sourceImagePath)
      return
    }

    // 确保输出目录存在
    if (!fs.existsSync(imgOutputDir)) {
      fs.mkdirSync(imgOutputDir, { recursive: true })
      console.log('📁 创建img输出目录:', imgOutputDir)
    }

    if (!fs.existsSync(iconsOutputDir)) {
      fs.mkdirSync(iconsOutputDir, { recursive: true })
      console.log('📁 创建icons输出目录:', iconsOutputDir)
    }

    console.log('🚀 开始生成logo图片...')
    console.log('📂 源图片:', sourceImagePath)
    console.log('📂 img输出目录:', imgOutputDir)
    console.log('📂 icons输出目录:', iconsOutputDir)
    console.log('')

    // 生成各种尺寸的PNG图片到img目录
    console.log('📦 生成PNG图片到img目录:')
    for (const { size, filename } of sizes) {
      const outputPath = path.join(imgOutputDir, filename)

      await sharp(sourceImagePath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }, // 透明背景
        })
        .png()
        .toFile(outputPath)

      console.log(`✅ 生成 ${size}x${size} -> img/${filename}`)
    }

    // 生成ICO文件到icons目录
    console.log('\n📦 生成ICO文件到icons目录:')
    const icoPath = path.join(iconsOutputDir, 'logo.ico')
    await sharp(sourceImagePath)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(icoPath)
    console.log('✅ 生成 32x32 -> icons/logo.ico')

    // 生成SVG文件到icons目录（复制源文件如果是SVG，否则转换为PNG并重命名）
    console.log('\n📦 生成SVG文件到icons目录:')
    const svgPath = path.join(iconsOutputDir, 'logo.svg')

    // 检查源文件是否为SVG
    const sourceExt = path.extname(sourceImagePath).toLowerCase()
    if (sourceExt === '.svg') {
      // 如果源文件是SVG，直接复制
      fs.copyFileSync(sourceImagePath, svgPath)
      console.log('✅ 复制SVG文件 -> icons/logo.svg')
    } else {
      // 如果不是SVG，生成一个256px的PNG并命名为svg（实际还是PNG格式）
      await sharp(sourceImagePath)
        .resize(256, 256, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toFile(svgPath.replace('.svg', '.png'))

      // 重命名为.svg扩展名（虽然内容是PNG）
      if (fs.existsSync(svgPath.replace('.svg', '.png'))) {
        fs.renameSync(svgPath.replace('.svg', '.png'), svgPath)
      }
      console.log('✅ 生成 256x256 -> icons/logo.svg (PNG格式)')
    }

    console.log('\n🎉 所有logo文件生成完成！')
    console.log('📋 生成的文件:')
    console.log('   img目录:')
    sizes.forEach(({ filename }) => {
      console.log(`     - ${filename}`)
    })
    console.log('   icons目录:')
    console.log('     - logo.ico')
    console.log('     - logo.svg')
  } catch (error) {
    console.error('❌ 生成logo时出错:', error.message)

    if (error.message.includes('sharp')) {
      console.log('')
      console.log('💡 请先安装 sharp 依赖:')
      console.log('   pnpm add -D sharp')
    }
  }
}

// 运行脚本
generateLogos()
