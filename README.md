# 早書き回答ツール

## セットアップ
1. Firebaseコンソールでプロジェクト作成
2. Authentication → ログイン方法 → 「匿名」を有効化
3. Authentication → 設定 → 承認済みドメインに `ユーザー名.github.io` を追加
4. Realtime Database を作成 → 「ルール」に `database.rules.json` の中身を貼り付けて公開
5. プロジェクト設定 → ウェブアプリを登録し、`firebaseConfig` を `index.html` 冒頭の `firebaseConfig` に貼り付け（databaseURL必須）
6. GitHubにpush → Settings → Pages で公開

## 使い方
- 司会者: 「部屋を作る」→ メニューのURL/コードを共有
- 参加者: URLを開く or コード入力 → 名前登録
