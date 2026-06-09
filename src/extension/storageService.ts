// Chrome storage helper. Type definitions live in ./chrome.d.ts so other
// modules (e.g. authService) can use the chrome.* APIs too.

export const chromeStorage = {
  set: async (payload: Record<string, unknown>) => {
    await chrome.storage.sync.set(payload)
  },
  get: async (data: string[]) => {
    return await chrome.storage.sync.get(data)
  },
  clear: async () => {
    return await chrome.storage.sync.clear()
  },
}
