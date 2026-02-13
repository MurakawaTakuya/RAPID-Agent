# Cloud Run Python App

Next.js API (`/api/cloud-run`) をプロキシとして経由し、Firebase IDトークンで認証

## ファイル構成

```
cloudrun/
├── main.py           # Flaskアプリ (Firebase Admin SDKで認証)
├── requirements.txt  # Python依存パッケージ
├── Dockerfile        # コンテナ設定
└── README.md         # このファイル
```

## デプロイ

```bash
# cloudrun ディレクトリに移動
cd cloudrun

# デプロイコマンド
# DATABASE_URL: Neon DB接続文字列

gcloud run deploy paper-agent-api --source . --region asia-northeast1 --project PROJECT_ID_HERE --allow-unauthenticated --timeout=60 --set-env-vars "DATABASE_URL=URL_HERE" --set-env-vars "GOOGLE_CLOUD_LOCATION=asia-northeast1"
```

## サービス情報

| 項目 | 値 |
|-----|-----|
| サービス名 | paper-agent-api |
| リージョン | asia-northeast1（東京） |
| Ingress | all (公開) ※ただしアプリレベルで認証必須 |

## セキュリティ構成

```
[クライアント] -> [/api/cloud-run] -> [Next.jsサーバー] -> [Python Cloud Run]
(URL隠蔽)          (Proxy)             (Token転送)        (Token検証)
```

1. **Proxy**: Next.js API (`src/app/api/cloud-run/route.ts`) がリクエストを受け、Authorizationヘッダーを付与してPythonサービスへ転送します。
2. **App Auth**: `main.py` 内で `firebase-admin` を使用してIDトークンを検証します。トークンがない場合は `401 Unauthorized` を返します。
3. **Public Network**: Cloud Run自体は `allow-unauthenticated` ですが、有効なFirebaseトークンを知らない限りアクセスできません。

## ローカル実行

```bash
pip install -r requirements.txt
python main.py
```
