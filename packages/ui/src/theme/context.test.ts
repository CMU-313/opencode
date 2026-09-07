import { describe, it, expect, mock, beforeEach } from 'bun:test'

// --- Types & Constants from context.tsx ---
type ColorScheme = 'light' | 'dark' | 'system'
type SystemMode = 'light' | 'dark'

interface DesktopTheme {
  id: string
  name?: string
  dark: Record<string, unknown>
  light: Record<string, unknown>
}

const STORAGE_KEYS = {
  THEME_ID: 'opencode-theme-id',
  COLOR_SCHEME: 'opencode-color-scheme',
  THEME_CSS_LIGHT: 'opencode-theme-css-light',
  THEME_CSS_DARK: 'opencode-theme-css-dark',
} as const

interface Store {
  themeId: string
  colorScheme: ColorScheme
  mode: SystemMode
  themes: Record<string, DesktopTheme>
}

const clear = mock(() => {})
const knownThemes = mock(() => new Set<string>(['cyberpunk', 'nord', 'dracula', 'corrupted']))
const getSystemMode = mock((): SystemMode => 'dark')
const load = mock(async (themeId: string): Promise<DesktopTheme | undefined> => {
  if (themeId === 'corrupted') return undefined
  return {
    id: themeId,
    name: themeId.toUpperCase(),
    dark: {},
    light: {},
  }
})
const cacheThemeVariants = mock((_theme: DesktopTheme, _themeId: string) => {})

let store: Store = {
  themeId: 'oc-2',
  colorScheme: 'system',
  mode: 'dark',
  themes: {
    'oc-2': { id: 'oc-2', name: 'OC-2', dark: {}, light: {} },
    custom_cached: { id: 'custom_cached', dark: {}, light: {} },
  },
}

const setStore = mock((key: keyof Store, value: unknown) => {
  store = { ...store, [key]: value }
})

const waitFor = async (assertion: () => void, timeout = 1000) => {
  const startTime = Date.now()
  while (true) {
    try {
      assertion()
      return
    } catch (err) {
      if (Date.now() - startTime > timeout) throw err
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
  }
}

function normalize(id: string | null | undefined): string | null | undefined {
  return id === 'oc-1' ? 'oc-2' : id
}

const handleThemeChange = (rawValue: string) => {
  const next = normalize(rawValue)
  if (!next) return

  if (next === 'oc-2') {
    setStore('themeId', next)
    clear()
    return
  }

  const isKnown = knownThemes().has(next) || Boolean(store.themes[next])
  if (!isKnown) return

  setStore('themeId', next)

  void load(next).then((theme) => {
    if (theme && store.themeId === next) {
      cacheThemeVariants(theme, next)
    }
  })
}

const handleColorSchemeChange = (rawValue: string) => {
  const colorScheme = rawValue as ColorScheme
  const mode = colorScheme === 'system' ? getSystemMode() : (colorScheme as 'light' | 'dark')

  setStore('colorScheme', colorScheme)
  setStore('mode', mode)
}

const onStorage = (e: Partial<StorageEvent>) => {
  if (!e.newValue) return

  switch (e.key) {
    case STORAGE_KEYS.THEME_ID:
      handleThemeChange(e.newValue)
      break
    case STORAGE_KEYS.COLOR_SCHEME:
      handleColorSchemeChange(e.newValue)
      break
  }
}

describe('onStorage Event Handler Suite (SolidJS context logic)', () => {
  beforeEach(() => {
    clear.mockClear()
    knownThemes.mockClear()
    getSystemMode.mockClear()
    load.mockClear()
    cacheThemeVariants.mockClear()
    setStore.mockClear()

    getSystemMode.mockImplementation((): SystemMode => 'dark')
    load.mockImplementation(async (themeId: string): Promise<DesktopTheme | undefined> => {
      if (themeId === 'corrupted') return undefined
      return { id: themeId, dark: {}, light: {} }
    })

    store = {
      themeId: 'oc-2',
      colorScheme: 'system',
      mode: 'dark',
      themes: {
        'oc-2': { id: 'oc-2', name: 'OC-2', dark: {}, light: {} },
        custom_cached: { id: 'custom_cached', dark: {}, light: {} },
      },
    }
  })

  describe('onStorage Router', () => {
    it('should ignore storage events with null or empty newValue', () => {
      onStorage({ key: STORAGE_KEYS.THEME_ID, newValue: null })
      onStorage({ key: STORAGE_KEYS.COLOR_SCHEME, newValue: '' })

      expect(setStore).not.toHaveBeenCalled()
      expect(clear).not.toHaveBeenCalled()
    })

    it('should ignore unrecognized storage keys', () => {
      onStorage({ key: 'unrelated-key', newValue: 'nord' })

      expect(setStore).not.toHaveBeenCalled()
      expect(load).not.toHaveBeenCalled()
    })

    it('should route THEME_ID key to handleThemeChange', () => {
      onStorage({ key: STORAGE_KEYS.THEME_ID, newValue: 'dracula' })

      expect(setStore).toHaveBeenCalledWith('themeId', 'dracula')
      expect(load).toHaveBeenCalledWith('dracula')
    })

    it('should route COLOR_SCHEME key to handleColorSchemeChange', () => {
      onStorage({ key: STORAGE_KEYS.COLOR_SCHEME, newValue: 'light' })

      expect(setStore).toHaveBeenCalledWith('colorScheme', 'light')
      expect(setStore).toHaveBeenCalledWith('mode', 'light')
    })
  })

  describe('handleThemeChange Logic', () => {
    it('should normalize legacy "oc-1" input to "oc-2"', () => {
      onStorage({ key: STORAGE_KEYS.THEME_ID, newValue: 'oc-1' })

      expect(setStore).toHaveBeenCalledWith('themeId', 'oc-2')
      expect(clear).toHaveBeenCalledTimes(1)
      expect(load).not.toHaveBeenCalled()
    })

    it('should handle default "oc-2" theme by invoking clear() and updating themeId', () => {
      onStorage({ key: STORAGE_KEYS.THEME_ID, newValue: 'oc-2' })

      expect(setStore).toHaveBeenCalledWith('themeId', 'oc-2')
      expect(clear).toHaveBeenCalledTimes(1)
      expect(load).not.toHaveBeenCalled()
    })

    it('should ignore unknown themes not present in knownThemes or store.themes', () => {
      onStorage({ key: STORAGE_KEYS.THEME_ID, newValue: 'non-existent-theme' })

      expect(setStore).not.toHaveBeenCalled()
      expect(load).not.toHaveBeenCalled()
    })

    it('should load and cache valid theme from knownThemes', async () => {
      onStorage({ key: STORAGE_KEYS.THEME_ID, newValue: 'nord' })

      expect(setStore).toHaveBeenCalledWith('themeId', 'nord')
      expect(load).toHaveBeenCalledWith('nord')

      await waitFor(() => {
        expect(cacheThemeVariants).toHaveBeenCalledWith(
          { id: 'nord', dark: {}, light: {} },
          'nord'
        )
      })
    })

    it('should load theme if present in local store.themes', async () => {
      onStorage({ key: STORAGE_KEYS.THEME_ID, newValue: 'custom_cached' })

      expect(setStore).toHaveBeenCalledWith('themeId', 'custom_cached')
      expect(load).toHaveBeenCalledWith('custom_cached')
    })

    it('should NOT cache variants if store.themeId changes before load resolves (race condition guard)', async () => {
      let resolveLoad: (val: DesktopTheme | undefined) => void = () => {}
      load.mockImplementationOnce(
        () => new Promise((resolve) => { resolveLoad = resolve })
      )

      onStorage({ key: STORAGE_KEYS.THEME_ID, newValue: 'nord' })
      expect(store.themeId).toBe('nord')

      // User rapidly switches theme while loading 'nord'
      store.themeId = 'dracula'

      resolveLoad({ id: 'nord', dark: {}, light: {} })

      await waitFor(() => {
        expect(cacheThemeVariants).not.toHaveBeenCalled()
      })
    })

    it('should NOT cache variants if load() returns undefined', async () => {
      onStorage({ key: STORAGE_KEYS.THEME_ID, newValue: 'corrupted' })

      await waitFor(() => {
        expect(load).toHaveBeenCalledWith('corrupted')
        expect(cacheThemeVariants).not.toHaveBeenCalled()
      })
    })
  })

  describe('handleColorSchemeChange Logic', () => {
    it('should set colorScheme and mode for explicit "light" mode', () => {
      onStorage({ key: STORAGE_KEYS.COLOR_SCHEME, newValue: 'light' })

      expect(setStore).toHaveBeenCalledWith('colorScheme', 'light')
      expect(setStore).toHaveBeenCalledWith('mode', 'light')
      expect(getSystemMode).not.toHaveBeenCalled()
    })

    it('should set colorScheme and mode for explicit "dark" mode', () => {
      onStorage({ key: STORAGE_KEYS.COLOR_SCHEME, newValue: 'dark' })

      expect(setStore).toHaveBeenCalledWith('colorScheme', 'dark')
      expect(setStore).toHaveBeenCalledWith('mode', 'dark')
      expect(getSystemMode).not.toHaveBeenCalled()
    })

    it('should query system mode when colorScheme is set to "system"', () => {
      getSystemMode.mockImplementationOnce((): SystemMode => 'dark')

      onStorage({ key: STORAGE_KEYS.COLOR_SCHEME, newValue: 'system' })

      expect(getSystemMode).toHaveBeenCalledTimes(1)
      expect(setStore).toHaveBeenCalledWith('colorScheme', 'system')
      expect(setStore).toHaveBeenCalledWith('mode', 'dark')
    })
  })
})