// lib/themeWatcher.js

import fs from 'fs'

import {
  reloadTheme
} from './themeManager.js'

const watchers = new Map()

export function startThemeWatcher(
  botSettings = {},
  themeMeta = {}
) {
  try {
    const instanceId =
      botSettings?.instance_id

    const themePath =
      themeMeta?.path

    if (
      !instanceId ||
      !themePath
    ) {
      return
    }

    if (watchers.has(instanceId)) {
      return
    }

    const watcher = fs.watch(
      themePath,
      async eventType => {
        if (
          eventType !== 'change'
        ) {
          return
        }

        console.log(
          `[THEME WATCH] Reloading ${instanceId}`
        )

        await reloadTheme(
          botSettings
        )
      }
    )

    watchers.set(
      instanceId,
      watcher
    )

    console.log(
      `[THEME WATCH] Active for ${instanceId}`
    )

  } catch (err) {
    console.log(
      '[THEME WATCHER]',
      err.message
    )
  }
}

export function stopThemeWatcher(
  instanceId = ''
) {
  try {
    const watcher =
      watchers.get(instanceId)

    if (!watcher) {
      return
    }

    watcher.close()

    watchers.delete(instanceId)

  } catch {}
}