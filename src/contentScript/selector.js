/**
 * 选择器生成器
 * 为页面元素生成稳定、可靠的 CSS 选择器
 */

// CSS-in-JS 生成的类名前缀（不稳定，应避免使用）
const UNSTABLE_CLASS_PREFIXES = [
  /^css-/,
  /^styled-/,
  /^sc-/,
  /^emotion-/,
  /^jss/,
  /^Mui/,
  /^ant-/,
  /^el-/,
  /^van-/,
  /^weui-/,
  /^t-/,
  /^arco-/,
]

// 稳定的属性列表
const STABLE_ATTRIBUTES = [
  'id',
  'name',
  'data-testid',
  'data-id',
  'data-test',
  'role',
  'aria-label',
  'aria-labelledby',
  'aria-describedby',
  'type',
  'placeholder',
  'title',
  'alt',
  'href',
  'src',
]

/**
 * 检查类名是否稳定
 * @param {string} className - 类名
 * @returns {boolean}
 */
function isStableClassName(className) {
  if (!className) return false
  return !UNSTABLE_CLASS_PREFIXES.some((prefix) => prefix.test(className))
}

/**
 * 转义 CSS 选择器中的特殊字符
 * @param {string} str - 需要转义的字符串
 * @returns {string}
 */
function escapeSelector(str) {
  return str.replace(/([!"#$%&'()*+,\/.:;<=>?@[\\\]^`{|}~])/g, '\\$1')
}

/**
 * 获取元素的属性选择器
 * @param {Element} element - DOM 元素
 * @returns {string|null}
 */
function getAttributeSelector(element) {
  for (const attr of STABLE_ATTRIBUTES) {
    const value = element.getAttribute(attr)
    if (value) {
      // 对于 data-* 属性，使用精确匹配
      if (attr.startsWith('data-')) {
        return `[${attr}="${escapeSelector(value)}"]`
      }
      // 对于 id 和 name，使用精确匹配
      if (attr === 'id' || attr === 'name') {
        return `[${attr}="${escapeSelector(value)}"]`
      }
      // 对于其他属性，如果值较短，使用精确匹配
      if (value.length < 50) {
        return `[${attr}="${escapeSelector(value)}"]`
      }
    }
  }
  return null
}

/**
 * 获取元素的类名选择器
 * @param {Element} element - DOM 元素
 * @returns {string|null}
 */
function getClassSelector(element) {
  if (!element.classList?.length) return null

  const stableClasses = Array.from(element.classList).filter(isStableClassName).map(escapeSelector)

  if (stableClasses.length === 0) return null

  // 优先使用单个类名
  if (stableClasses.length === 1) {
    return `.${stableClasses[0]}`
  }

  // 尝试组合类名，但限制数量
  return `.${stableClasses.slice(0, 3).join('.')}`
}

/**
 * 获取元素的文本内容选择器
 * @param {Element} element - DOM 元素
 * @returns {string|null}
 */
function getTextSelector(element) {
  const text = element.textContent?.trim()
  if (!text || text.length === 0 || text.length > 50) return null

  const tagName = element.tagName.toLowerCase()

  // 对于按钮和链接，使用文本内容
  if (tagName === 'button' || tagName === 'a') {
    return `${tagName}:contains("${escapeSelector(text)}")`
  }

  return null
}

/**
 * 获取元素的路径选择器
 * @param {Element} element - DOM 元素
 * @param {number} maxDepth - 最大深度
 * @returns {string}
 */
function getPathSelector(element, maxDepth = 5) {
  const path = []
  let current = element
  let depth = 0

  while (current && current !== document.body && depth < maxDepth) {
    let selector = current.tagName.toLowerCase()

    // 如果有 id，直接使用 id 并停止
    if (current.id) {
      selector = `#${escapeSelector(current.id)}`
      path.unshift(selector)
      break
    }

    // 添加 nth-child 以提高精确度
    const siblings = Array.from(current.parentNode?.children || [])
    const sameTagSiblings = siblings.filter((s) => s.tagName === current.tagName)
    if (sameTagSiblings.length > 1) {
      const index = sameTagSiblings.indexOf(current) + 1
      selector += `:nth-child(${index})`
    }

    path.unshift(selector)
    current = current.parentNode
    depth++
  }

  return path.join(' > ')
}

/**
 * 生成元素的唯一选择器
 * @param {Element} element - DOM 元素
 * @returns {string}
 */
export function generateSelector(element) {
  if (!element || element === document.body) return 'body'

  // 1. 优先使用 data-testid 等测试属性
  const attrSelector = getAttributeSelector(element)
  if (attrSelector) {
    // 检查是否唯一
    if (document.querySelectorAll(attrSelector).length === 1) {
      return attrSelector
    }
  }

  // 2. 使用稳定的类名
  const classSelector = getClassSelector(element)
  if (classSelector) {
    // 检查是否唯一
    if (document.querySelectorAll(classSelector).length === 1) {
      return classSelector
    }
  }

  // 3. 使用标签 + 属性组合
  const tagName = element.tagName.toLowerCase()
  if (attrSelector) {
    const combined = `${tagName}${attrSelector}`
    if (document.querySelectorAll(combined).length === 1) {
      return combined
    }
  }

  // 4. 使用标签 + 类名组合
  if (classSelector) {
    const combined = `${tagName}${classSelector}`
    if (document.querySelectorAll(combined).length === 1) {
      return combined
    }
  }

  // 5. 使用文本内容（针对按钮和链接）
  const textSelector = getTextSelector(element)
  if (textSelector) {
    return textSelector
  }

  // 6. 使用路径选择器
  return getPathSelector(element)
}

/**
 * 验证选择器是否有效且唯一
 * @param {string} selector - CSS 选择器
 * @returns {{ valid: boolean, unique: boolean, count: number }}
 */
export function validateSelector(selector) {
  try {
    const elements = document.querySelectorAll(selector)
    return {
      valid: true,
      unique: elements.length === 1,
      count: elements.length,
    }
  } catch (e) {
    return {
      valid: false,
      unique: false,
      count: 0,
      error: e.message,
    }
  }
}

/**
 * 为选择器生成更稳定的版本
 * @param {string} selector - 原始选择器
 * @returns {string|null}
 */
export function optimizeSelector(selector) {
  const validation = validateSelector(selector)

  if (!validation.valid) return null
  if (validation.unique) return selector

  // 如果选择器不唯一，尝试添加更多限定
  const elements = document.querySelectorAll(selector)
  if (elements.length === 0) return null

  const element = elements[0]

  // 尝试添加父元素限定
  let parent = element.parentElement
  let depth = 0
  const maxDepth = 3

  while (parent && parent !== document.body && depth < maxDepth) {
    const parentSelector = generateSelector(parent)
    const combined = `${parentSelector} > ${selector}`

    const combinedValidation = validateSelector(combined)
    if (combinedValidation.unique) {
      return combined
    }

    parent = parent.parentElement
    depth++
  }

  // 如果还是无法唯一，使用路径选择器
  return getPathSelector(element)
}

/**
 * 获取元素的 XPath
 * @param {Element} element - DOM 元素
 * @returns {string}
 */
export function generateXPath(element) {
  if (!element) return ''
  if (element.id) {
    return `//*[@id="${element.id}"]`
  }

  const parts = []
  let current = element

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let index = 1
    let sibling = current.previousSibling

    while (sibling) {
      if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === current.nodeName) {
        index++
      }
      sibling = sibling.previousSibling
    }

    const tagName = current.nodeName.toLowerCase()
    const part = index > 1 ? `${tagName}[${index}]` : tagName
    parts.unshift(part)

    current = current.parentNode
  }

  return '/' + parts.join('/')
}

/**
 * 获取元素的完整信息
 * @param {Element} element - DOM 元素
 * @returns {Object}
 */
export function getElementInfo(element) {
  return {
    tagName: element.tagName.toLowerCase(),
    id: element.id || null,
    className: element.className || null,
    textContent: element.textContent?.trim().slice(0, 100) || null,
    selector: generateSelector(element),
    xpath: generateXPath(element),
    attributes: Array.from(element.attributes).reduce((acc, attr) => {
      acc[attr.name] = attr.value
      return acc
    }, {}),
  }
}

// 默认导出
export default {
  generateSelector,
  validateSelector,
  optimizeSelector,
  generateXPath,
  getElementInfo,
}
