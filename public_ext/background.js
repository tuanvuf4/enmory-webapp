const ENMORY_QUICK_ADD_MENU_ID = 'enmory-quick-add'
const WORD_CATEGORY_ID = 1
const PHRASE_CATEGORY_ID = 2

const normalizeSelection = (value = '') => value.replace(/\s+/g, ' ').trim()

const getCategoryIdFromSelection = (value = '') =>
  normalizeSelection(value).split(' ').filter(Boolean).length > 1
    ? PHRASE_CATEGORY_ID
    : WORD_CATEGORY_ID

const createQuickAddContextMenu = async () => {
  await chrome.contextMenus.removeAll()
  chrome.contextMenus.create({
    id: ENMORY_QUICK_ADD_MENU_ID,
    title: 'Add to enmory',
    type: 'normal',
    contexts: ['selection'],
  })
}

chrome.runtime.onInstalled.addListener(() => {
  createQuickAddContextMenu()
})

chrome.contextMenus.onClicked.addListener(async (item, tab) => {
  if (item.menuItemId === ENMORY_QUICK_ADD_MENU_ID) {
    const origin = normalizeSelection(item.selectionText)
    const catId = getCategoryIdFromSelection(origin)

    await chrome.storage.sync.set({ origin, catId })
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
    const origin = normalizeSelection(request.value)
    await chrome.storage.sync.set({
      origin,
      catId: getCategoryIdFromSelection(origin),
    })
  }
})
