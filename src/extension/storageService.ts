// Chrome storage helper. Type definitions live in ./chrome.d.ts so other
// modules (e.g. authService) can use the chrome.* APIs too.

export const chromeStorage = {
  set: async (payload: Record<string, unknown>) => {
    if (typeof chrome !== 'undefined' && chrome?.storage?.sync) {
      await chrome.storage.sync.set(payload)
    }
  },
  get: async (data: string[]) => {
    if (typeof chrome !== 'undefined' && chrome?.storage?.sync) {
      return await chrome.storage.sync.get(data)
    }
    return {}
  },
  clear: async () => {
    if (typeof chrome !== 'undefined' && chrome?.storage?.sync) {
      return await chrome.storage.sync.clear()
    }
  },
}
