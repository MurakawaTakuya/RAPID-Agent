# Cloud Run Python App

シンプルな Hello World Flask アプリケーション。

## ファイル構成

```
cloudrun/
├── main.py           # Flaskアプリ
├── requirements.txt  # Python依存パッケージ
├── Dockerfile        # コンテナ設定
└── README.md         # このファイル
```

## デプロイ

```bash
cd cloudrun
gcloud run deploy hello-world --source . --region asia-northeast1 --project $PROJECT_ID --allow-unauthenticated --timeout=300
```

## サービス情報

| 項目 | 値 |
|-----|-----|
| サービス名 | hello-world |
| リージョン | asia-northeast1（東京） |

## ローカル実行（オプション）

```bash
pip install -r requirements.txt
python main.py
```

http://localhost:8080 でアクセス可能。
