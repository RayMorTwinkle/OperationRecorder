import crx3 from 'crx3'
import { createRequire } from 'module'
import { existsSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const require = createRequire(import.meta.url)

// 读取 manifest.json 获取版本号和名称
const manifestPath = resolve(__dirname, '../build/manifest.json')
const manifest = require(manifestPath)
const { name, version } = manifest

// 配置路径
const buildDir = resolve(__dirname, '../build')
const packageDir = resolve(__dirname, '../package')
const privateKeyPath = resolve(__dirname, '../private.pem')

// 确保 package 目录存在
if (!existsSync(packageDir)) {
  mkdirSync(packageDir, { recursive: true })
}

async function buildCrx() {
  try {
    console.log('🚀 开始打包 CRX 文件...')
    console.log(`📦 扩展名称: ${name}`)
    console.log(`📌 版本号: ${version}`)
    console.log(`📁 构建目录: ${buildDir}`)

    // 生成 CRX 文件名
    const crxFileName = `${name.replaceAll(' ', '-')}-${version}.crx`
    const crxFilePath = resolve(packageDir, crxFileName)
    const zipFilePath = resolve(packageDir, `${name.replaceAll(' ', '-')}-${version}.zip`)
    const xmlFilePath = resolve(packageDir, 'update.xml')

    // 使用 crx3 生成 CRX 文件
    await crx3([`${buildDir}/manifest.json`], {
      keyPath: privateKeyPath,
      crxPath: crxFilePath,
      zipPath: zipFilePath,
      xmlPath: xmlFilePath,
      crxURL: `https://example.com/${crxFileName}`,
    })

    console.log(`✅ CRX 文件已生成: ${crxFilePath}`)
    console.log(`📦 ZIP 文件已生成: ${zipFilePath}`)
    console.log(`📄 更新清单已生成: ${xmlFilePath}`)

    if (existsSync(privateKeyPath)) {
      console.log(`🔑 私钥文件: ${privateKeyPath}`)
      console.log('⚠️  请妥善保管私钥文件，用于后续更新版本！')
    }

    console.log('🎉 打包完成！')
  } catch (error) {
    console.error('❌ 打包失败:', error)
    process.exit(1)
  }
}

buildCrx()
