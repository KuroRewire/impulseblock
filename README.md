# PD Blocker（Chrome拡張・Manifest V3）

ポルノ/オナニー衝動管理のためのブロッカーMVP。ビルド不要・HTML/CSS/JavaScriptのみの最小構成。

---

## 権限について（方針）

**現状は MVP のため、暫定で `host_permissions: ["<all_urls>"]` を使用している。**

方針としては**最小権限**を目指し、将来は次のいずれかへ移行する前提で設計している。

- **a) declarativeNetRequest（動的ルール）** でブロックし、`<all_urls>` をやめる
- **b) permissions.request** で、ユーザーがブロックしたホストのみ許可する

移行しやすくするため、**URL 判定ロジックとブロック対象の管理は `block-core.js` に集約**している。将来はこのモジュールの実装だけを差し替え（例: ストレージの代わりに動的ルールや許可ホスト一覧を参照する）すればよい。

---

## 1. フォルダ構成

```
pd-extension/
├── manifest.json    # 拡張の設定（MV3）
├── block-core.js    # ブロック判定・ブロック対象管理の集約（差し替え用）
├── popup.html       # ツールバーアイコンクリックで開くUI
├── popup.js         # 「このサイトをブロック」→ block-core 経由で追加
├── background.js    # サービスワーカー（URL監視・block-core で判定してリダイレクト）
├── blocked.html     # ブロック時の確認画面（今日のYes回数・最終記録時刻表示）
├── blocked.js       # Yes/No・カウント・タブ閉じる・表示更新
└── README.md        # このファイル
```

---

## 2. 各ファイルの役割

| ファイル | 役割 |
|----------|------|
| **manifest.json** | 拡張の名前・バージョン・権限（storage, tabs, webNavigation）と host_permissions（\<all_urls\>・暫定）、popup、background の指定。 |
| **block-core.js** | ブロック対象の取得・判定・追加を1箇所に集約。`getBlockedHosts` / `addBlockedHost` / `isHostBlocked` を提供。background は importScripts、popup は script で読み込み。将来の declarativeNetRequest 等への差し替え用。 |
| **popup.html / popup.js** | アイコンクリックで表示。現在タブの hostname を取得し、「このサイトをブロック」で `PDBlockCore.addBlockedHost` によりストレージに追加。 |
| **background.js** | `importScripts('block-core.js')` のうえで、`webNavigation.onCommitted` で遷移を監視。`PDBlockCore.isHostBlocked(hostname)` で判定し、一致時のみ `blocked.html?url=...` にリダイレクト。 |
| **blocked.html / blocked.js** | ブロック時の確認画面。「今日のYes回数」「最終記録時刻」を表示し、Yes 押下後に即更新。「Yes」→ 今日のカウント+1・lastOpenedAt 更新・表示更新→元URLへ。「No」→ タブを閉じる（不可なら前のページへ）。シークレットモードでの許可手順・ヘルプリンクを表示。 |

**保存データ（chrome.storage.local）**

- `blockedHosts`: `string[]` — ブロックするホスト（完全一致）
- `openCountByDate`: `{ [YYYY-MM-DD]: number }` — 日別の「開いた」回数
- `lastOpenedAt`: `number` — 最後に「開く」を選んだ時刻（ミリ秒）

### (1) blocked でカウント確認できるようにした変更

| ファイル | 変更内容 |
|----------|----------|
| **blocked.html** | 「今日のYes回数」「最終記録時刻」を表示する `.stats` ブロック（`#today-count`, `#last-opened`）とスタイルを追加。 |
| **blocked.js** | `getTodayKey` に加え、`formatLastOpened(ms)`（最終記録を日時文字列に）、`refreshStats(data)`（DOM に反映）、`loadAndShowStats()`（表示用にストレージ取得）を追加。ページ読み込み時に `loadAndShowStats()` を実行。Yes 押下時はストレージ更新コールバック内で `refreshStats` に新しい値（counts, lastOpenedAt）を渡して即表示を更新してから、`chrome.tabs.update` で元URLへ遷移。 |

### (2) 権限設計・ブロックロジック集約の変更

| ファイル | 変更内容 |
|----------|----------|
| **block-core.js**（新規） | ブロック対象の取得・判定・追加を集約。`getBlockedHosts` / `setBlockedHosts` / `addBlockedHost` / `isHostBlocked` を提供。ストレージキーはここだけに定義。 |
| **background.js** | 先頭で `importScripts('block-core.js')`。リダイレクト判定を `chrome.storage.local.get` ではなく `PDBlockCore.isHostBlocked(hostname, callback)` に変更。 |
| **popup.html** | `block-core.js` を popup.js より前に読み込み。 |
| **popup.js** | ストレージ直接参照をやめ、`PDBlockCore.addBlockedHost(hostname, callback)` で追加。追加済み時は callback(false) で「すでにブロック済み」表示。 |
| **README.md** | 上記「権限について」を追加。フォルダ構成・各ファイルの役割を更新。本節「(1)(2) の変更」を追加。 |

---

## 3. Chrome で「Load unpacked」する手順

1. Chrome で `chrome://extensions` を開く。
2. 右上の **「デベロッパーモード」** を ON にする。
3. **「パッケージ化されていない拡張機能を読み込む」** をクリック。
4. このプロジェクトの **`pd-extension` フォルダ** を選択して「選択」。
5. 一覧に「PD Blocker」が表示されれば読み込み完了。必要ならピン留めする。
   - `assets/` 以下に画像などを追加・変更したときは、`chrome://extensions` でこの拡張の「再読み込み」を押して反映させる。

---

## 4. example.com でテストする手順

1. **ブロックリストに追加**
   - ブラウザで `https://www.example.com` を開く。
   - 拡張アイコン（パズルアイコン → PD Blocker）をクリック。
   - **「このサイトをブロック」** を押す。「ブロックしました: www.example.com」と出ればOK。

2. **ブロック動作の確認**
   - 別タブで再度 `https://www.example.com` を開く（または F5）。
   - ブロック画面（blocked.html）にリダイレクトされ、「本当に開く？」と表示されればOK。

3. **No の動作**
   - 「No（閉じる）」を押す → そのタブが閉じる（または前のページに戻る）。

4. **Yes の動作**
   - もう一度 example.com に移動してブロック画面を出し、**「Yes（開く）」** を押す。
   - example.com が表示され、ストレージの「今日のカウント」が +1、`lastOpenedAt` が更新されている想定。
   - 再度 example.com にアクセスすると、またブロック画面になる（1回の Yes で「そのときだけ」開く仕様）。

5. **シークレットモード**
   - シークレットウィンドウで同じ URL を開き、ブロックされない場合は拡張の「シークレットモードで許可」が OFF の可能性。
   - `chrome://extensions` で PD Blocker の **「シークレットモードで許可」** を ON にして、再度シークレットで example.com を開き、ブロック画面になるか確認。

---

以上で最小構成の動作確認ができます。
