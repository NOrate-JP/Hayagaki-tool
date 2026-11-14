# 早書き回答ツール

## ファイル構成
- `index.html` / `app.js` / `favicon.svg` … 本体（更新ではこれらを置き換える）
- `config.js` … **自分のFirebase設定（初回だけ作る。更新ファイルには含まれない）**
- `config.example.js` … config.js の雛形
- `database.rules.json` … Firebaseのルール（更新で変わったときだけ貼り替える）

## 初回セットアップ
1. Firebaseでプロジェクト作成 → Authentication で「匿名」を有効化
2. Authentication → 設定 → 承認済みドメインに `ユーザー名.github.io` を追加
3. Realtime Database を作成 → 「ルール」に `database.rules.json` の中身を貼って公開
4. `config.example.js` をコピーして `config.js` を作り、Firebaseの設定値（databaseURL必須）を貼る
5. GitHubにpush → Settings → Pages で公開

## 更新のしかた
更新zipを展開し、`config.js` 以外をそのまま上書きしてpushするだけです（config.jsは触らない）。
