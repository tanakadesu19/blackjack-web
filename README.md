# Blackjack

Node.js と Express で動く、プレイヤー対ディーラーの1人用ブラックジャックです。

## ローカルで起動

Node.js 24 と npm をインストールし、このディレクトリで実行します。

```sh
npm ci
npm start
```

ブラウザで <http://localhost:3000> を開きます。待ち受けポートは環境変数 `PORT` で変更できます。

## 遊び方

画面を開くと、通常の52枚の山札から双方に2枚ずつ配られます。Hitで1枚引き、Standでディーラーと勝負します。ディーラーはソフト17を含む17以上で止まります。最初の2枚での21はブラックジャックとして扱い、通常の21より優先します。結果が出たら New Game で次のラウンドを始められます。

配札と判定はサーバーが担当します。プレイ中にブラウザへ返すのは、プレイヤーの手札とディーラーの公開カードなど、画面表示に必要な情報だけです。勝敗の集計は同じブラウザのセッションで共有されます。セッションは作成から2時間で期限切れになり、サーバーの再起動時にもリセットされます。

## Render の無料枠で公開

1. このプロジェクトを GitHub などの Git リポジトリへプッシュします。`package-lock.json` も含めてください。
2. Render ダッシュボードで **New → Web Service** を選び、リポジトリを接続します。
3. **Runtime** を **Node**、**Instance Type** を **Free** に設定します。
4. **Build Command** に `npm ci`、**Start Command** に `npm start` を設定します。
5. 環境変数に `NODE_ENV=production` を設定します。本番環境ではセッション Cookie に `Secure` 属性が付きます。ポートは Render が設定する `PORT` を使用します。
6. **Deploy Web Service** を実行し、発行された HTTPS URL を開きます。

無料サービスがアイドル状態で停止すると、次のアクセス時に起動を待つ場合があり、メモリ上のゲーム状態と集計はリセットされます。[Express の公開手順](https://render.com/docs/deploy-node-express-app) · [無料枠の詳細](https://render.com/docs/free)
