# YiChingApp – Interactive I Ching Fortune App

**YiChingApp** is an interactive fortune-telling app based on the ancient Chinese classic, the *I Ching* (Book of Changes).  
Using a spinning animation and six rounds of yin-yang determination, it generates one of 64 hexagrams and provides detailed interpretations.

🌐 **Live Demo**: [https://akikoys.github.io/YichingWebapp/](https://akikoys.github.io/YichingWebapp/)

## 🔮 Features

- Click-based spinner animation (Lottie) for an engaging I Ching experience
- Full hexagram analysis: original, changing line, resulting hexagram, reversed, mutual, and overarching hexagram
- Text-based explanations for each variation
- PDF export of your personal fortune result
- Log function with timestamp and question

## 🧑‍💻 How to Use

1. Enter your question or situation (optional)
2. Click the spinner six times to generate your yin-yang sequence
3. View the resulting hexagram and its variants
4. Get a comprehensive summary of your reading
5. Save your result as a PDF

## 🛠 Tech Stack

- HTML, CSS, JavaScript
- Lottie animation (Bodymovin)
- GitHub Pages for static hosting
- OpenAI API (planned future integration)

## 📁 Project Structure
iching-production/
├── .firebase/                  # Firebase キャッシュ情報
├── functions/                 # Cloud Functions 関連
│   ├── .env                   # 環境変数（APIキーなど）
│   ├── index.js               # Cloud Functions エントリポイント
│   ├── sendAdviceEmail.js     # AI助言メール送信処理
│   ├── stripe.js              # Stripe 決済関連
│   ├── storeAdvicePdf.js      # PDF生成・保存処理
│   ├── fonts/
│   │   └── NotoSansJP-Regular.js
│   └── quotes.json            # ランダム名言データ
├── project/                   # フロントエンドソース
│   ├── index.html             # メイン画面
│   ├── about-iching.html      # 易経の説明
│   ├── hexagrams.html         # 六十四卦一覧
│   ├── log.html               # ログページ
│   ├── feedback.html          # お問い合わせページ
│   ├── manifest.json          # PWA設定
│   ├── service-worker.js      # PWAキャッシュ設定
│   ├── firebase/
│   │   ├── firebase.js        # Firebase初期化
│   │   └── auth.js            # ログインUI制御
│   ├── styles/
│   │   ├── base.css
│   │   ├── style.css
│   │   ├── spinner.css
│   │   ├── modal.css
│   │   └── note-style.css
│   ├── assets/
│   │   ├── images/
│   │   └── animations/        # Lottieアニメーション
│   ├── script.js              # メインロジック
│   ├── logic.js
│   ├── ui.js
│   ├── toggle-table.js
│   ├── success.html           # 決済完了後ページ
│   ├── success.js
│   ├── payment.js
│   └── hexagrams.json         # 卦データベース
├── firebase.json              # Firebase 設定ファイル
├── .firebaserc                # Firebase プロジェクトID指定
├── README.md                  # ※これから追加
└── .gitignore
## 🔐 Security

Please **do not expose your OpenAI API key** in public repositories.  
Backend integration is recommended for production use.

## 📄 License

This project is currently intended for personal or non-commercial use.  
Please contact the author for reuse or collaboration.

---

*Created and maintained by Akiko Shimoyama*

# 易経くじ Web App

このアプリは、古代中国の占い書『易経』をもとにしたデジタル占いサービスです。

## 機能
- 本卦・変卦・裏卦など六卦を自動生成
- Lottieアニメーションによるスピナー表示
- Firebase を用いたログイン・決済・PDF送信機能
- AIによる2000字〜5000字の助言生成

## 技術スタック
- HTML / CSS / JavaScript
- Firebase (Hosting, Auth, Functions, Firestore)
- Stripe 決済
- OpenAI GPT API
- jsPDF によるPDF生成

## 今後の予定
- モバイル最適化（PWA対応）
- ユーザー管理と履歴共有機能
- 多言語対応（英語／日本語）

---

**制作・運営**: Akiko Shimoyama  
**リポジトリ**: https://github.com/AkikoYS/YichingWebappDeployTest


