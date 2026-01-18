export const chromeStorage = {
  set: async (payload: any) => {
    await chrome.storage.sync.set(payload)
  },
  get: async (data: string[]) => {
    return await chrome.storage.sync.get(data)
  },
  clear: async () => {
    return await chrome.storage.sync.clear()
  },
}
