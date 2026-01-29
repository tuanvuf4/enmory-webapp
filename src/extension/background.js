chrome.contextMenus.create({
  id: 'enmory-quick-add',
  title: 'Quick add | Enmory',
  type: 'normal',
  contexts: ['selection'],
})

chrome.contextMenus.onClicked.addListener(async (item, tab) => {
  if (item.menuItemId === 'enmory-quick-add') {
    await chrome.storage.sync.set({ origin: item.selectionText })
    chrome.windows.create(
      {
        url: 'index.html',
        type: 'popup',
        focused: true,
        width: 530,
        height: 750,
        top: 0,
      },
      (window) => {
        console.log('Extension popup opened!')
      },
    )
  }
})

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.addOrigin === 'addOrigin') {
    await chrome.storage.sync.set({ origin: request.value })
  }
})
