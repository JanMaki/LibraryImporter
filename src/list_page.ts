//各種データ用の型
interface Data {
    name: String
    visibility: String
    sortBy: String
    items: Item[]
}

interface Item {
    boothItemId: String
    order: Number
    tags: string[]
    date: Number
}


//インポート進行中かを確認
let isProcessRunning = false
chrome.storage.local.get("IsProcessRunning", function (value) {
    if (value && "IsProcessRunning" in value) {
        isProcessRunning = value["IsProcessRunning"]
    }
    //進行中の時はアイテムを登録する
    if (isProcessRunning) importItems()
})

//インポートするボタンを作成
const importElement = document.createElement("button") as HTMLButtonElement
importElement.className = "button has-background-light"
importElement.id = "import-button"
importElement.onclick = startImport
const textElement = document.createElement("span") as HTMLSpanElement
textElement.textContent = "BOOTHのライブラリをインポート"
importElement.appendChild(textElement)

/**
 * アイテムをインポートする
 */
function importItems() {
    //幕を出す
    drawMask()

    //データから読み込み
    chrome.storage.local.get("LibraryItems", async function (value) {
        //現在のユーザーのデータを取得
        const getDataRequest = new XMLHttpRequest()
        getDataRequest.open("GET", `https://motteruyo.com/api/lists/${location.href.replace(/https:\/\/motteruyo.com\/lists\//, "")}`)
        getDataRequest.responseType = "json"
        getDataRequest.onload = function () {
            //jsonのデータから必要な物だけ取得
            const listData = getDataRequest.response
            const data: Data = {
                name: listData["name"],
                visibility: listData["visibility"],
                sortBy: listData["sortBy"],
                items: []
            }
            const dataItems = listData["items"] as any[]
            dataItems.forEach((dataItem) => {
                const item: Item = {
                    boothItemId: dataItem["boothItemId"],
                    order: dataItem["order"],
                    tags: dataItem["tags"],
                    date: dataItem["createdAt"],
                }
                data.items.push(item)
            })

            //アイテムの登録へ
            registerItems(value["LibraryItems"], data)
        }
        getDataRequest.send()
    })
}

/**
 * アイテムを登録する
 *
 * @param items 登録するアイテムの配列
 * @param data 登録先のデータ
 */
function registerItems(items: string[], data: Data) {
    const missingItems: string[][] = []
    //既にあるデータのかず
    let dataCount = data.items.length
    let count = 0
    items.forEach((item) => {
        //アイテムのIDと並び替え用の番号を取得
        const itemData = item.split(":")
        const itemId = itemData[0]
        const itemFindNumber = Number(itemData[1])

        //アイテムをもってるよリストに登録or登録情報を取得
        const postItemRequest = new XMLHttpRequest()
        postItemRequest.open("POST", `https://motteruyo.com/api/items/${itemId}`, true)
        postItemRequest.responseType = "json"
        postItemRequest.onload = function () {
            //登録成功時
            if (postItemRequest.status == 200) {
                //アイテムのデータを作成
                const item: Item = {
                    boothItemId: postItemRequest.response["id"],
                    date: Date.now(),
                    order: dataCount + (items.length + itemFindNumber),
                    tags: []
                }
                //データに追加
                data.items.push(item)
            } else {
                missingItems.push(itemData)
            }
            count += 1;

            //進捗メッセージを更新
            const modalText = document.querySelector("#modal-text")
            if (modalText != null) modalText.textContent = `データの登録中・・・(${count}/${items.length})`

            //全てのアイテムのリクエストが終了したかを確認
            if (count >= items.length) {
                //データを保存する
                const saveDataRequest = new XMLHttpRequest()
                saveDataRequest.open("PATCH", `https://motteruyo.com/api/lists/${location.href.replace(/https:\/\/motteruyo.com\/lists\//, "")}`)
                saveDataRequest.responseType = "json"
                saveDataRequest.onload = function () {
                    //終了
                    finishRegister(missingItems)
                }
                saveDataRequest.send(JSON.stringify(data))
            }
        }
        postItemRequest.send()
    })
}

/**
 * 登録の終了処理
 *
 * @param missingItems 不明なアイテムの一覧
 */
function finishRegister(missingItems: string[][]) {
    //メッセージを作成
    let message = "インポートを終了しました"
    if (missingItems.length > 0) {
        //見つからなかったアイテムの一覧をくっつける
        const missingItemUrls = missingItems.map((value) => {
            return `【商品名】 ${value[2]}\n【URL】 https://booth.pm/ja/items/${value[0]}\n`
        }).join("\n")
        message += "\n\n以下の商品が無効でした。シークレットページに設定されているか消された商品、販売URLが変更された可能性があります。\n\n" + missingItemUrls
    }

    //各種データを削除
    chrome.storage.local.set({"IsProcessBegin": false}, function () {
        chrome.storage.local.set({"IsProcessRunning": false}, function () {
            chrome.storage.local.set({"TargetListPageUrl": ""}, function () {
                chrome.storage.local.set({"LibraryItems": []}, function () {
                    //通知
                    alert(message)

                    location.reload()
                })
            })
        })
    })
}

/**
 * インポート作業の開始
 */
function startImport() {
    //各種データを初期化
    chrome.storage.local.set({"IsProcessBegin": true}, function () {
        chrome.storage.local.set({"IsProcessRunning": false}, function () {
            chrome.storage.local.set({"TargetListPageUrl": location.href}, function () {
                chrome.storage.local.set({"LibraryItems": []}, function () {
                    //ライブラリに飛ばす
                    location.href = "https://accounts.booth.pm/library"
                })
            })
        })
    })
}

/**
 * 幕を出す
 */
function drawMask() {
    document.querySelector(".modal")?.remove()
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
    modalSection.id = "modal-text"
    modalSection.textContent = "データの登録中・・・"
    modalCard.appendChild(modalSection)
    modal.appendChild(modalCard)
}

//backgroundからのメッセージを受け取る
chrome.runtime.onMessage.addListener(async (message) => {
    console.log(message)
    if (message === "updatePage") {
        //ボタンを挿入
        const buttonPosition = document.querySelector("body > div > div.MuiBox-root > main > div")
        buttonPosition?.appendChild(importElement)

        //インポートが動いている時は幕を出す
        if (isProcessRunning) {
            drawMask()
        }
    }
})
