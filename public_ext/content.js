document.addEventListener('mouseup', async (event) => {
  if (document.getSelection().toString().length) {
    let exactText = document.getSelection().toString()
    chrome.runtime.sendMessage({ addOrigin: 'addOrigin', value: exactText })
  }
})

// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//   if (request.showPopup === 'showPopup') {
//     chrome.action.openPopup().then((resp) => {
//       console.log(`openPopup: `, resp)
//     })
//   }
// })
