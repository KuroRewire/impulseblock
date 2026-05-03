# ImpulseBlock Day 2: Hard-Expiry Timer 実装ハンドオフ

> 作業フォルダ: `/Users/shotaebi/Desktop/projects/personal/vibecoding/pd-extension`
> 所要時間: Claude Code実行 5〜15分 + 動作確認 10分

---

## 全体方針

### LYS思想を反映した仕様確定事項

- **5分固定**(選択肢なし) — 迷いを負わせない、選択疲労ゼロ
- **右上小さくオーバーレイ** — 邪魔しない、見たい人だけ見る
- **タイマー終了時は静かにタブをblocked画面に戻す** — 予告なし、淡々と。「裁かない」哲学

### 既存コードからの差分

現在のコード(おそらく):
- 「5分だけ許可」ボタンを押す → タブが解放されるが、**実際には5分経っても何も起きない**(タイマー機能が動いていない)

Day 2でやること:
- `chrome.alarms` で正確な5分タイマーを設定
- 一時許可中、画面右上に控えめなカウントダウンオーバーレイを表示
- 5分経過時、対象タブを自動的にblocked.htmlに戻す
- 早めに戻したい人のために「Re-block now」リンクをオーバーレイに含める(既存の Re-block機能を流用)

---

## Phase A: 事前準備

```bash
cd /Users/shotaebi/Desktop/projects/personal/vibecoding/pd-extension

# 念のためコミット(Day 1完了状態のスナップショット)
git status
git add -A
git commit -m "chore: snapshot before Day 2 timer implementation" || true

# Claude Code起動
claude
```

---

## Phase B: Claude Code向けプロンプト

以下をコピーしてClaude Codeに貼り付け:

````markdown
ImpulseBlockのHard-expiry timer機能を実装してください。

## 仕様

### 5分固定タイマー
- 「5分だけ許可」ボタンを押すと、5分間その対象ホストへのアクセスが許可される
- 5分経過後、対象のタブが自動的にblocked.htmlに戻る
- ユーザーが選択する時間オプションはなし(固定5分)

### タイマーオーバーレイ(右上に控えめに表示)
- 一時許可中、対象ホストのページの右上に小さなオーバーレイを表示
- 内容: `4:32 · ImpulseBlock` のような最小限のカウントダウンと小さなブランドラベル
- 「Re-block now」リンクを含む(既存のre-block機能と同じ動作 = 即座にblocked画面に戻す)
- 大きさ: 控えめ。Notion/Linear系のミニマルなトースト程度
- 邪魔にならず、必要なら見える程度の存在感

### 終了時の振る舞い
- 5分経過時、対象タブを静かにblocked.htmlに戻す
- カウントダウン警告や音などはなし
- 既存の「allowed sessionで他のタブも対象ホストを開いている場合」も全て戻す

## 技術要件

### Manifest更新
- `manifest.json` の `permissions` に `"alarms"` を追加
- バージョンを 1.1.0 → 1.2.0 にバンプ(機能追加なのでminor)

### chrome.alarms 使用
- `chrome.alarms.create()` でユニークなalarm名(例: `expire:${host}:${timestamp}`)を設定
- `chrome.alarms.onAlarm` で時間切れを検知
- background.js (service worker) 内で処理

### 一時許可状態の保存
- `chrome.storage.local` に `tempAllowedHosts` のような構造で `{ host: expiresAt }` を保存
- 既存のkeyを壊さない(blockedHosts / openCountByDate / lastOpenedAt は触らない)
- service workerが寝てから起きた時にも、storage参照で残り時間を復元できる設計

### オーバーレイ実装
- content script (overlay.js) に追加
- 一時許可状態のホストでページが開かれた時のみ表示
- `chrome.storage.onChanged` でリアルタイムに残り時間を更新
- 1秒ごとにカウントダウンを再描画

### スタイル(LYS思想 = 控えめ)
- 位置: `top: 16px; right: 16px;` 程度
- サイズ: 横幅最大200px程度、高さ最小限
- 背景: 半透明白 `rgba(255, 255, 255, 0.95)` + 微弱なシャドウ
- フォント: system-ui (`-apple-system, BlinkMacSystemFont, 'Segoe UI'`)
- 文字: `#1A1A1A`
- ボーダー: なし、または極薄(`1px solid rgba(0,0,0,0.06)`)
- 装飾要素なし(emojiやアイコンを足さない)
- Z-indexは既存のre-blockオーバーレイと衝突しないように

### コピー(LYS思想 = 裁かない、煽らない)

英語UI:
- カウントダウン本体: `4:32` のような数値のみ
- ラベル: `ImpulseBlock` または何もなし
- リンク: `Re-block now` (これは既存の re-block 機能と同じ動作)

日本語UI:
- カウントダウン本体: `4:32` のような数値のみ
- ラベル: `ImpulseBlock` または何もなし(日本語でも英ブランド名)
- リンク: `今すぐ再ブロック` (既存の文言と一致)

### blocked画面の更新
- 「5分だけ許可」ボタンを押した時、現状の `tempAllow` メッセージを送信する処理に加えて、`chrome.alarms.create` を呼ぶ
- ボタンの文言は既存のままでOK("Open for 5 min" / "5分だけ許可")

## 制約事項

- **既存の `chrome.storage.local` キーは絶対変更禁止**(blockedHosts / openCountByDate / lastOpenedAt 等)
- **既存のre-block機能は壊さない** — Day 2のタイマーオーバーレイから「Re-block now」を呼んだ時、既存の即時re-block処理を流用
- **manifest.json の id 関連は触らない**
- **i18nを壊さない** — 新規追加する文字列は `_locales/en/messages.json` と `_locales/ja/messages.json` の両方に追加し、`chrome.i18n.getMessage()` で参照

## 出力してほしいもの

1. 変更したファイルの一覧
2. 各ファイルの主要なdiff(全文ではなく要点)
3. 新規作成したファイル(あれば)
4. テスト手順(僕が手動で動作確認するための具体的な操作手順)
5. 既知の制約・将来の改善余地(あれば)
````

---

## Phase C: 動作確認

Claude Codeが完了したら以下を確認:

### 1. Chrome拡張を再読み込み
- `chrome://extensions` → ImpulseBlockの再読み込みボタン
- エラーバッジが出ていないか確認
- バージョンが 1.2.0 になっているか
- 権限が `webNavigation, storage, tabs, alarms` になっているか(`alarms` が追加されたか)

### 2. 基本動作テスト

ブロック対象サイトを開く → blocked画面が出る → 「5分だけ許可」を押す:

**期待動作:**
- 対象サイトが表示される ✅(既存動作)
- 画面右上に小さなカウントダウンオーバーレイが出る ✨(新規)
- カウントダウンが1秒ごとに減っていく ✨(新規)
- オーバーレイの「Re-block now」をクリック → blocked画面に戻る ✅(既存動作流用)

### 3. ハードタイマー終了テスト

- 5分間放置(or タイマー時間を一時的に短縮してテスト)
- 5分経過時、自動的にタブがblocked.htmlに戻る ✨(新規)

> ⚠️ 5分待つのが面倒な場合、Claude Codeに **「テスト用に一時的に30秒タイマーに変更できますか?」** と頼むと早く検証できる。検証後、Claude Codeに **「5分に戻して」** で復旧。

### 4. 複数タブのテスト

- 同じブロック対象サイトを2つのタブで開く(両方とも一時許可中になっているはず)
- 5分経過時、両方のタブが同時にblocked画面に戻ること

### 5. ブラウザ閉じても保持されるテスト

- 「5分だけ許可」を押した直後、Chromeを完全終了 → すぐに再起動
- もし5分以内なら残り時間がそのまま続いていること(`chrome.alarms` はChrome起動中のみ生きるので、これは仕様上動作しない可能性あり、要確認)
- 動作しない場合は、**それは仕様** として受け入れてOK(再起動 = 衝動も冷めている前提)

---

## Phase D: コミット

すべて動作確認できたら:

```bash
git add -A
git commit -m "feat: hard-expiry timer with countdown overlay (5min, top-right)"
git push origin main
```

KuroRewireアカウントでpushされる(Day 1で `git config` 済み)。

---

## このDay 2が完了したら

次のDay 3ハンドオフを作成:
- **Override reason tags 実装**(bored / procrastinating / lonely / tired / research / break)
- 「5分だけ許可」を押す前にreason選択を挟む or 押した直後にreasonを聞く UIの設計判断

---

## 補足: LYS思想を実装に反映するチェックポイント

実装後、以下を自問:

- [ ] オーバーレイは「裁かない」見た目か?(エラー風の赤色や警告アイコンを使っていないか)
- [ ] カウントダウンは「煽らない」か?(「あと○秒!」のような扇動的なコピーを使っていないか)
- [ ] 終了時は「淡々」としているか?(派手なアラートや音を出していないか)
- [ ] ユーザーの自律性を尊重しているか?(Re-block nowを目立たせすぎていないか)

これら全てYESなら、思想と実装が整合しています。
