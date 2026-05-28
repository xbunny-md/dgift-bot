// lib/boxRuntime.js

let runtimeTheme = null

export function setRuntimeTheme(theme) {
  runtimeTheme = theme || null
}

export function getRuntimeTheme() {
  return runtimeTheme || {}
}

export function formatRuntimeBox(
  type = 'default',
  data = {}
) {
  try {
    if (
      runtimeTheme &&
      typeof runtimeTheme[type] === 'function'
    ) {
      return runtimeTheme[type](data)
    }

    if (
      runtimeTheme &&
      typeof runtimeTheme.box === 'function'
    ) {
      return runtimeTheme.box(type, data)
    }

    return data?.text || ''

  } catch {
    return data?.text || ''
  }
}