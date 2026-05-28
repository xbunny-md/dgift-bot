// lib/themeValidator.js

export function validateTheme(theme = {}) {
  try {
    if (!theme || typeof theme !== 'object') {
      return false
    }

    const allowedExports = [
      'name',
      'box',
      'default',
      'menu',
      'reply',
      'error',
      'success',
      'warning',
      'info'
    ]

    const keys = Object.keys(theme)

    if (!keys.length) {
      return false
    }

    for (const key of keys) {
      if (!allowedExports.includes(key)) {
        continue
      }

      if (
        key !== 'name' &&
        typeof theme[key] !== 'function'
      ) {
        return false
      }
    }

    return true

  } catch {
    return false
  }
}