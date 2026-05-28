// lib/themeManager.js

import {
  loadThemeFile
} from './themeLoader.js'

import {
  setThemeCache,
  getThemeCache
} from './themeCache.js'

import {
  setRuntimeTheme
} from './boxRuntime.js'

const activeThemes = new Map()

export async function initializeTheme(
  botSettings = {}
) {
  try {
    const instanceId =
      botSettings?.instance_id

    if (!instanceId) {
      throw new Error(
        'instance_id missing'
      )
    }

    const selectedTheme =
      botSettings?.theme_name ||
      process.env.BOT_THEME ||
      'default'

    const loaded =
      await loadThemeFile(
        selectedTheme
      )

    if (!loaded) {
      throw new Error(
        'theme failed to load'
      )
    }

    activeThemes.set(
      instanceId,
      loaded
    )

    setThemeCache(instanceId, loaded)

    setRuntimeTheme(loaded.theme)

    console.log(
      `[THEME] ${instanceId} -> ${loaded.name}`
    )

    return loaded.theme

  } catch (err) {
    console.log(
      '[THEME MANAGER]',
      err.message
    )

    return {}
  }
}

export function getTheme(
  instanceId = ''
) {
  const live =
    activeThemes.get(instanceId)

  if (live) {
    return live.theme || {}
  }

  const cached =
    getThemeCache(instanceId)

  return cached?.theme || {}
}

export function getThemeMeta(
  instanceId = ''
) {
  return (
    activeThemes.get(instanceId) ||
    getThemeCache(instanceId) ||
    null
  )
}

export async function reloadTheme(
  botSettings = {}
) {
  return initializeTheme(
    botSettings
  )
}