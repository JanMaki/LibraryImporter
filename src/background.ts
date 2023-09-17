//ページが更新された時のリスナー
chrome.tabs.onUpdated.addListener((tabId, _, __) => {
    //コンテンツスクリプトにメッセージを送信
    chrome.tabs.sendMessage(tabId, "updatePage").then(_ => {
    }).catch(_ => {
    })
})