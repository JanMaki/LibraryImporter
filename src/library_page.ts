//インポートのプロセス開始するか
chrome.storage.local.get("IsProcessBegin", function (value) {
    let isProcessBegin = value["IsProcessBegin"]
    //インポートのプロセスが動いているか
    chrome.storage.local.get("IsProcessRunning", function (value) {
        let isProcessRunning = value["IsProcessRunning"]

        //処理開始をしてよいかを確認
        if (isProcessBegin && !isProcessRunning) {
            startProcess()
        }
        //プロセス動作中かを確認
        if (isProcessRunning) {
            runProcess()
        }
    });
});

/**
 * インポートの処理を開始
 */
function startProcess() {
    //Modalを作成
    const modal = document.createElement("div")
    modal.className = "modal is-active"

    //背景
    const modalBackGround = document.createElement("div")
    modalBackGround.className = "modal-background"
    modal.appendChild(modalBackGround)

    //Modalの本体
    const modalCard = document.createElement("div")
    modalCard.className = "modal-card"
    //ヘッダー
    const modalHeader = document.createElement("header")
    modalHeader.className = "modal-card-head is-size-4"
    modalHeader.textContent = "ライブラリインポーター"
    modalCard.appendChild(modalHeader)
    //本文
    const modalSection = document.createElement("section")
    modalSection.className = "modal-card-body"
    modalSection.textContent = "ライブラリのデータを読み取り、『BOOTH持ってるよリスト』にインポートをしてよろしいですか？"
    const firstText = document.createElement("p")
    firstText.className = "mt-2 mb-0 has-text-danger"
    firstText.style.fontWeight = "bold"
    firstText.textContent = "*インポート中はブラウザの操作をしないでください。"
    modalSection.appendChild(firstText)
    modalCard.appendChild(modalSection)
    //フッター
    const modalFooter = document.createElement("footer")
    modalFooter.className = "modal-card-foot"
    const okButton = document.createElement("button") as HTMLButtonElement
    okButton.className = "button is-success"
    okButton.textContent = "OK"
    okButton.onclick = onPushOkButton
    modalFooter.appendChild(okButton)
    const cancelButton = document.createElement("button") as HTMLButtonElement
    cancelButton.className = "button"
    cancelButton.textContent = "Cancel"
    cancelButton.onclick = onPushCancelButton
    modalFooter.appendChild(cancelButton)
    modalCard.appendChild(modalFooter)
    modal.appendChild(modalCard)

    //Modalを追加
    document.querySelector("body")?.appendChild(modal)
}

/**
 * 処理中の動作
 */
function runProcess() {
    //黒背景用Modalを作成
    const modal = document.createElement("div")
    modal.className = "modal is-active"
    //背景
    const modalBackGround = document.createElement("div")
    modalBackGround.className = "modal-background"
    modal.appendChild(modalBackGround)
    document.querySelector("body")?.appendChild(modal)
    //テキスト
    const modalCard = document.createElement("div")
    modalCard.className = "modal-card"
    const modalSection = document.createElement("section")
    modalSection.className = "modal-card-body has-text-info-dark"
    modalSection.textContent = "ライブラリデータの収集中・・・"
    modalCard.appendChild(modalSection)
    modal.appendChild(modalCard)


    //データから読み込み
    chrome.storage.local.get("LibraryItems", function (value) {
        //ライブラリのアイテム一覧
        const libraryItems: string[] = []
        libraryItems.push(...value["LibraryItems"])

        //現在のドキュメント内のアイテムを取得
        document.querySelectorAll(".l-col-auto").forEach((element) => {
            //URLを取得
            const anchorElement = element.children[0] as HTMLAnchorElement
            const itemUrl = anchorElement.href
            //アイテムIDを取得
            const itemId = itemUrl.replace(/https:\/\/.*booth.pm\/.*items\//, "")
            console.log(itemId)
            //商品名を取得
            const titleElement = element.parentElement?.querySelector(".u-tpg-title3")
            const title = titleElement ? titleElement.textContent : "null"
            //一覧に追加
            libraryItems.push(itemId + ":" + libraryItems.length + ":" + title)
        })

        //データを保存
        chrome.storage.local.set({"LibraryItems": libraryItems}, function () {
            //現在のURLを取得
            const url = document.location.href;
            const isGiftLibrary = url.indexOf("/gifts") >= 0
            //URL内のページ番号を取得 ない場合は1ページに
            const nowPage = Number(url.indexOf("page=") > 0 ? url.split("page=")[1] : 1)

            //最大ページ数を取得
            //最後のページまで送る要素を取得
            const lastPageLinkElement = document.querySelector(".pager .last-page") as HTMLAnchorElement
            //リンクから最大ページを取得 要素がないときは1ページに
            const lastPageNumber = Number(lastPageLinkElement ? lastPageLinkElement.href.split("page=")[1] : 1)

            //最終ページじゃないかを確認
            if (nowPage < lastPageNumber) {
                //次のページへ
                if (isGiftLibrary) {
                    location.href = "https://accounts.booth.pm/library/gifts?".split("page=")[0] + "page=" + (nowPage + 1);
                } else {
                    location.href = "https://accounts.booth.pm/library?".split("page=")[0] + "page=" + (nowPage + 1);
                }
            }
            //ギフトページじゃないかを確認
            else if (!isGiftLibrary) {
                //次はギフトページに移動
                location.href = "https://accounts.booth.pm/library/gifts?"
            } else {
                //処理終了
                finishProcess()
            }
        })
    })
}

/**
 * 読み込み処理を終了する
 */
function finishProcess() {
    //追加先のリストのURLを取得
    chrome.storage.local.get("TargetListPageUrl", function (value) {
        //移動
        location.href = value["TargetListPageUrl"]
    })
}

/**
 * OKボタンを押した時
 */
function onPushOkButton() {
    //処理中のフラグを立てる
    chrome.storage.local.set({"IsProcessRunning": true}, function () {
        //最初のページに移動
        location.href = "https://accounts.booth.pm/library"
    })
}

/**
 * キャンセルのボタンを押したとき
 */
function onPushCancelButton() {
    //まず全部の値を空にする
    chrome.storage.local.set({"IsProcessBegin": false}, function () {
        chrome.storage.local.set({"IsProcessRunning": false}, function () {
            chrome.storage.local.set({"TargetListPageUrl": ""}, function () {
                chrome.storage.local.set({"LibraryItems": []}, function () {
                    //Modalを閉じる
                    document.querySelector(".modal")?.remove()
                })
            })
        })
    })
}
