const WORD_CATEGORY_ID = 1
const PHRASE_CATEGORY_ID = 2

const normalizeSelection = (value = '') => value.replace(/\s+/g, ' ').trim()

const getCategoryIdFromSelection = (value = '') =>
  normalizeSelection(value).split(' ').filter(Boolean).length > 1
    ? PHRASE_CATEGORY_ID
    : WORD_CATEGORY_ID

document.addEventListener('mouseup', async () => {
  const selectedText = normalizeSelection(document.getSelection()?.toString() || '')

  if (selectedText.length) {
    chrome.runtime.sendMessage({
      addOrigin: 'addOrigin',
      value: selectedText,
      catId: getCategoryIdFromSelection(selectedText),
    })
  }
})

// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//   if (request.showPopup === 'showPopup') {
//     chrome.action.openPopup().then((resp) => {
//       console.log(`openPopup: `, resp)
//     })
//   }
// })
