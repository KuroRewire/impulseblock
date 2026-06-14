# ImpulseBlock Day 3: Renewal Ladder + Burst Visualization 実装ハンドオフ

> 作業フォルダ: `/Users/shotaebi/Desktop/projects/personal/vibecoding/pd-extension`
> 所要時間: Claude Code実行 10〜20分 + 動作確認 15分

---

## Day 3 方向転換の背景

### 当初の計画(廃止)
Override reason tags(bored / procrastinating / lonely / tired / research / break)を「5分だけ許可」を押す前に選ばせる仕組み。

### 廃止理由(GeminiとGPTのDeep Research両方が結論)
- **Satisficing現象**: 衝動状態のユーザーは認知的努力を最小化し、機械的にタグを選択する。データが「broken mirror(故障した鏡)」になる
- **Introspection limit**: Nisbett & Wilson 1977以来の研究で、人は自分の行動の真の動機にリアルタイムでアクセスできないことが示されている
- **Burden cascade**: 衝動のたびにタグ選択を要求すると、最も観察したいヘビーユーザーほど離脱する選択バイアス
- **Shame loop**: 「procrastinating」を50回タグすると自己嫌悪を増幅し、LYS思想と真逆になる
- **Reactivity**: タグ収集自体が観察対象を変えてしまい、「中立な観察」ではなくなる

### 新方向: Passive Mirror強化 + Renewal Ladder
**タグを取らずに、行動データだけで「衝動の波」を可視化する**。GPT推奨の "v0 minimum: passive mirror without reasons" を採用。

ユーザー体感フィードバックも一致:
> 「5分が短い、でも辛かった何度も閉じるのが。もう一回入ったら10分にする?どれだけ我慢できなかったのか可視化できる」

これがそのまま設計に転写される。

---

## Day 3 仕様(確定)

### 機能1: Renewal Ladder(段階的延長)

**動作:**
- 1回目のoverride: 5分許可
- 5分タイマー切れて静かにblockedに戻る → 同じホストをまた開く → blocked画面再表示
- 「5分だけ許可」ボタンを押す → 今度は **10分許可**(自動延長)
- 3回目: **15分許可**
- 4回目以降: **20分許可で固定**(ただしキャップに到達するまで)

**1日累計60分キャップ:**
- 同じホストの1日累計許可時間が60分に達したら、それ以降は許可ボタンを押せない(または「今日は十分見ました」表示)
- 翌日0時(ローカル時刻)にリセット
- ladderも翌日0時にリセット(翌日は再び5分から始まる)

**ボタンの文言変化:**
- 1回目: 「5分だけ許可」
- 2回目: 「10分だけ許可」
- 3回目: 「15分だけ許可」
- 4回目以降: 「20分だけ許可」
- 60分到達後: 「今日は十分見ました」(non-clickable)

### 機能2: Burst可視化(7日ログ画面)

**Burstの定義:**
- 同じホストへの連続したoverride(60分以内に発生)を1つのburstとしてグループ化
- 60分以上経過したら次のburstとして区切る

**表示形式:**
```
Twitter
14:00–15:30 · 4 overrides · 5→10→15→15min · 累計45分

YouTube  
20:15–20:35 · 2 overrides · 5→10min · 累計15分
```

**現状の単純カウントを維持しつつburstを追加:**
- 既存の「今日のYes回数: 13」表示はそのまま残す
- その下にBurst詳細セクションを新設
- 7日全体ではburstをホスト別・時系列で表示

### 機能3: タグは作らない

GPT推奨の通り、Day 3ではタグ機能は実装しない。後日passive mirrorを十分使い込んだ後、optional post-hocタグを検討する余地は残す(ただし強制しない)。

---

## 技術要件

### chrome.storage.localスキーマ拡張

既存:
```js
blockedHosts: [...]
openCountByDate: { "2026-05-03": 13, ... }
lastOpenedAt: 1714780800000
tempAllowedHosts: { "twitter.com": 1714781100000 }  // Day 2で追加
```

Day 3で追加:
```js
// 各ホストへの今日のoverride履歴
overrideHistoryByDate: {
  "2026-05-03": {
    "twitter.com": [
      { startedAt: 1714780800000, durationMs: 300000 },  // 5min
      { startedAt: 1714781400000, durationMs: 600000 },  // 10min
      { startedAt: 1714782300000, durationMs: 900000 }   // 15min
    ],
    "youtube.com": [...]
  }
}
```

これで:
- Renewal Ladderの計算: 同日同ホストのoverride回数 → ladderの段階決定
- 1日キャップ: 同日同ホストのdurationMs合計 → 60分超えたか判定
- Burst可視化: startedAtのソート + 60分gap判定でgrouping

### 関数追加

`background.js`:
- `getNextDurationMs(host)`: 今日のladder段階に応じた次のduration返す(5/10/15/20分)
- `getRemainingDayCapMs(host)`: 60分 - 今日の累計duration
- `recordOverrideStart(host, durationMs)`: storageに履歴を追加

`blocked.js`:
- TEMP_ALLOWメッセージ送信前に `getNextDurationMs` をbackgroundに問い合わせ
- ボタン文言を動的に変更
- 60分到達時はボタンをdisabled + 文言変更

`popup.js` または `blocked.js`(7日ログ表示部分):
- `groupIntoBursts(overrides)` ユーティリティ関数
- Burst一覧をDOM生成

### 既存機能の保持

- ✅ Hard-expiry timer(Day 2の機能)はそのまま動作
- ✅ Re-block now機能はそのまま
- ✅ 「今すぐ再ブロック」popupからのforce-blockもそのまま
- ✅ 既存storageキー(blockedHosts / openCountByDate / lastOpenedAt / tempAllowedHosts)は破壊的変更なし

---

## Phase A: 事前準備

```bash
cd /Users/shotaebi/Desktop/projects/personal/vibecoding/pd-extension

git status
git add -A
git commit -m "chore: snapshot before Day 3 renewal ladder implementation" || true

claude
```

---

## Phase B: Claude Code向けプロンプト

以下をコピーしてClaude Codeに貼り付け:

````markdown
ImpulseBlock の Renewal Ladder + Burst可視化を実装してください。

## 背景

Day 2 で Hard-expiry timer (5分固定) を実装済み。Day 3 ではこれを段階的に拡張し、衝動の強さを行動データで可視化する。タグ機能は実装しない方針が確定している。

## 仕様

### 機能1: Renewal Ladder(段階的延長)

**動作:**
- 同じホストへのoverrideは、その日の何回目かによって長さが変わる
  - 1回目: 5分
  - 2回目: 10分
  - 3回目: 15分
  - 4回目以降: 20分(固定)
- ladderは1日(ローカル時刻の0時〜23:59)単位でリセット
- 翌日は再び1回目=5分から始まる

**1日累計60分キャップ:**
- 同じホストへのその日の累計override時間が60分に達したら、追加のoverrideを禁止
- ボタンを disabled にして文言を変更

**ボタン文言の動的変化:**
- 1回目: 「5分だけ許可」/ "Allow for 5 min"
- 2回目: 「10分だけ許可」/ "Allow for 10 min"
- 3回目: 「15分だけ許可」/ "Allow for 15 min"
- 4回目以降: 「20分だけ許可」/ "Allow for 20 min"
- 60分到達後: 「今日は十分見ました」/ "Enough for today" (disabled)

### 機能2: Burst可視化

**Burstの定義:**
- 同じホストへの連続overrideで、各overrideのstartedAtが前のoverrideのstartedAtから60分以内にあるものを1つのburstとしてグループ化
- 60分以上空いたら次のburstとして区切る

**表示形式:**
blocked.html の既存「衝動ログ(7日)」セクションの下に新しいセクションを追加:

```
直近のbursts:
  
  Twitter
  14:00–15:30 · 4 overrides · 5→10→15→15min · 累計45分
  
  YouTube
  20:15–20:35 · 2 overrides · 5→10min · 累計15分
```

英語UIの場合は同等の英訳:
```
Recent bursts:

  Twitter
  14:00–15:30 · 4 overrides · 5→10→15→15min · 45min total
```

### 機能3: タグなし

タグ選択UIは実装しない。reason / mood / category / 自由記述などの付加情報は一切要求しない。純粋な行動ログのみ。

## 技術要件

### Storage Schema追加

既存storageを破壊せず、新キーとして:

```js
// 各日付・各ホストごとのoverride履歴(配列)
overrideHistoryByDate: {
  "YYYY-MM-DD": {
    "host.com": [
      { startedAt: <timestamp>, durationMs: <number> },
      ...
    ]
  }
}
```

このキーが既存ユーザーで存在しない場合、空オブジェクトとして初期化(既存openCountByDateとは独立)。

### background.js 追加関数

- `getOverrideHistoryToday(callback)`: 今日(ローカル時刻基準)の `overrideHistoryByDate[today]` を返す
- `getNextDurationMs(host, callback)`: 今日の同ホストへのoverride回数に応じた次のdurationを返す
  - 0回目 → 5分
  - 1回目 → 10分
  - 2回目 → 15分
  - 3回目以降 → 20分
- `getRemainingDayCapMs(host, callback)`: 今日の同ホストへの累計durationMsを計算し、`60 * 60 * 1000 - 累計` を返す
- `recordOverrideStart(host, durationMs, callback)`: 履歴に新しいエントリを追加

### TEMP_ALLOW ハンドラの拡張

- 既存処理に加えて、`getNextDurationMs(host)` でその日の段階に応じたdurationを取得
- `getRemainingDayCapMs(host)` でキャップ到達してないかチェック
- 到達してたらエラー応答(blocked.js側でボタンdisabled処理)
- 到達してなければ、次のdurationでchrome.alarmsを設定 + recordOverrideStartで履歴を追加

### blocked.js / blocked-i18n.js の拡張

**ボタンの動的文言:**
- ページロード時に `chrome.runtime.sendMessage({ type: 'GET_NEXT_DURATION', host: ... })` でbackgroundに問い合わせ
- レスポンスに応じてボタンテキスト変更:
  - 5min/10min/15min/20min → それぞれの文言
  - キャップ到達 → 「今日は十分見ました」/ "Enough for today" (disabled)

**Burst可視化セクション:**
- 既存「衝動ログ(7日)」のすぐ下に追加
- `chrome.storage.local.get('overrideHistoryByDate')` で全日付・全ホストの履歴を取得
- ホストごとにグループ化 → startedAtでソート → 60分gap判定でburstに分割
- 各burstを上記の表示形式でレンダリング
- 表示する範囲は直近7日分

### Burst grouping ロジック

```
function groupIntoBursts(overrides) {
  // overrides は startedAt 昇順でソート済みと仮定
  const bursts = [];
  let current = null;
  for (const ov of overrides) {
    if (!current || ov.startedAt - lastOf(current).startedAt > 60*60*1000) {
      current = [ov];
      bursts.push(current);
    } else {
      current.push(ov);
    }
  }
  return bursts.map(burst => ({
    startedAt: burst[0].startedAt,
    endedAt: lastOf(burst).startedAt + lastOf(burst).durationMs,
    count: burst.length,
    durations: burst.map(o => o.durationMs),
    totalMs: burst.reduce((sum, o) => sum + o.durationMs, 0)
  }));
}
```

### i18n追加

`_locales/en/messages.json` と `_locales/ja/messages.json` に以下追加:

- `allow_5min`: "Allow for 5 min" / "5分だけ許可"
- `allow_10min`: "Allow for 10 min" / "10分だけ許可"
- `allow_15min`: "Allow for 15 min" / "15分だけ許可"
- `allow_20min`: "Allow for 20 min" / "20分だけ許可"
- `daily_cap_reached`: "Enough for today" / "今日は十分見ました"
- `recent_bursts`: "Recent bursts" / "直近のbursts"
- `burst_summary`: "$COUNT$ overrides · $LADDER$ · $TOTAL$ total" / "$COUNT$ overrides · $LADDER$ · 累計$TOTAL$"
  (placeholderはchrome.i18n.getMessageの引数で動的に挿入)
- `min_unit`: "min" / "分"

### Manifest更新

- バージョンを 1.2.0 → 1.3.0 にバンプ(機能追加なのでminor)
- permissions変更なし(alarms / storage / tabs / webNavigationのまま)

## 制約事項

- **既存storageキーは絶対変更禁止**(blockedHosts / openCountByDate / lastOpenedAt / tempAllowedHosts)
- **Day 2の hard-expiry timer 機能は壊さない** — Renewal Ladder は既存のtimerメカニズムの上に乗せる(durationだけ可変にする)
- **Re-block now機能は壊さない** — 早めに止めたらduration途中でもokだが、その分の経過時間はrecordOverrideStartに記録する(or 簡略化のため割り当てたduration全体を記録、判断はClaude Codeに委ねる)
- **manifest.json の id 関連は触らない**
- **既存 chrome.i18n.getMessage 参照キーは破壊しない** — 追加のみ
- **タグ機能・mood記録・自由記述は一切実装しない** — 行動データのみ

## 出力してほしいもの

1. 変更したファイルの一覧
2. 各ファイルの主要なdiff(全文ではなく要点)
3. 新規作成したファイル(あれば)
4. テスト手順(僕が手動で動作確認するための具体的な操作手順)
5. 既知の制約・将来の改善余地(あれば)
````

---

## Phase C: 動作確認

### 0. 拡張再読み込み

- `chrome://extensions` → ImpulseBlockの再読み込み
- バージョン `1.3.0`
- エラーバッジなし

### 1. Renewal Ladder基本動作

テスト用に短縮タイマーを使う(Claude Codeに依頼):
```
テスト用に各ladder段階を 30s / 60s / 90s / 120s に一時短縮してください
```

または5/10/15/20分のままで実時間テスト。

**期待動作:**
1. ブロック対象サイト → blocked画面 → ボタンに「5分だけ許可」
2. 押す → 5分許可、タブ右上にカウントダウン
3. 5分後静かにblockedに戻る
4. 同じホストをもう一度開く → blocked画面 → ボタンに「**10分**だけ許可」 ✨
5. 押す → 10分許可
6. 10分後再びblocked
7. もう一度 → 「**15分**だけ許可」 ✨
8. もう一度 → 「**20分**だけ許可」 ✨
9. 4回目以降は20分のまま固定

### 2. 60分キャップ動作

ladderを進めて累計60分に到達したら:
- ボタンが「今日は十分見ました」/ "Enough for today" になり、disabled

### 3. Burst可視化

- 何度かoverrideした後、blocked画面の下部「直近のbursts」セクションを確認
- 期待: `Twitter · 14:00–15:30 · 4 overrides · 5→10→15→15min · 累計45分` のような表示
- 別のホストのoverrideは別行で表示
- 60分以上空いたoverrideは別burstとして区切られる

### 4. 翌日リセット動作

- システム時刻を翌日に変更(macOSの「日付と時刻」設定)してテスト、または
- Claude Codeに「テスト用に日付判定ロジックを30秒単位の擬似日に変更」依頼

期待: 翌日になるとladderがリセットされ、再び「5分だけ許可」から始まる。

### 5. 既存機能の保持確認

- 7日間の衝動ログ(既存)が消えていないか
- blocklistが消えていないか
- Re-block now機能が動作するか
- popupの「今すぐ再ブロック」が動作するか

---

## Phase D: コミット

```bash
git status
git add -A
git commit -m "feat: renewal ladder (5→10→15→20min) with daily cap and burst visualization"
git push origin main
```

---

## このDay 3が完了したら

次はDay 4(CWSメタデータ最終版作成):
- 新しいlong description(Renewal Ladder + Burst可視化を含む)
- スクリーンショット仕様の確定
- プライバシーポリシー更新(新スキーマ反映)

---

## 補足: LYS思想チェックポイント

実装後、以下を自問:

- [ ] ladderは「失敗の累積」ではなく「衝動の自然な記録」として表示されているか?
- [ ] 「今日は十分見ました」は責めるトーンになっていないか?(疲れた身体に休息を渡すような優しさ)
- [ ] Burstの表示は数字とハイフンだけのドライなフォーマットか?(感情的な装飾を入れていないか)
- [ ] streakやfailure countなど、ゲーミフィケーション要素を入れていないか?
- [ ] ユーザーが自分のパターンを見つけるためのデータが、嘘なくそこにあるか?

すべてYESなら、Day 3の思想と実装が整合しています。

---

## 哲学的一言

**この機能は「我慢できなかった証拠」ではない。**
**衝動の強さの自然な記録。波が来た日もある、来なかった日もある。それだけ。**
