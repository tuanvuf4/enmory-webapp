export const chromeStorage = {
  set: async (palyload: any) => {
    await chrome.storage.sync.set(palyload)
  },
  get: async (data: string[]) => {
    return await chrome.storage.sync.get(data)
  },
  clear: async () => {
    return await chrome.storage.sync.clear()
  },
}
