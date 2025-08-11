# YiChingApp – Interactive I Ching Fortune App 易経くじアプリ – インタラクティブ易占い

**YiChingApp** is an interactive fortune-telling app based on the ancient Chinese classic, the *I Ching* (Book of Changes).  
Using a spinning animation and six rounds of yin-yang determination, it generates one of 64 hexagrams and provides detailed interpretations.
易経くじアプリは、中国古典『易経』をもとにしたインタラクティブ占いアプリです。
スピナー（回転アニメーション）を6回クリックして陰陽を決定し、64卦のいずれかを生成します。
生成された卦に基づいて、詳細な解説や今後の展開を表示します。

🌐 **Live Demo 体験版URL**: [https://akikoys.github.io/YichingWebapp/](https://akikoys.github.io/YichingWebapp/)

## 🔮 Features 主な特徴
- Click-based spinner animation (Lottie) for an engaging I Ching experience
スピナーアニメーション（Lottie）で楽しく占える
- Full hexagram analysis:
本卦・変卦・裏卦・総卦・互卦など完全な卦のバリエーションを表示
    Original hexagram
    Changing line & resulting hexagram
    Reversed, mutual, and overarching hexagram
- Text-based explanations for each variation　卦ごとの詳細な説明と易断
- PDF export of your personal fortune result　占い結果を PDF として保存可能
- Log function with timestamp and question　占った履歴を時刻・質問付きでログに記録（PC版）
- Mobile-optimized mode:　モバイル版
    Automatic UI adjustments when accessed via index-mobile.html or ?mobile=1
　　モバイルでは自動的にindex-mobile.hmtlが表示される
    Login UI hidden in mobile mode
    ログイン機能、ログ記録機能、AI有料易断モードはモバイル版ではスキップ

    Smooth navigation between PC and mobile pages　PC版とモバイル版のスムーズな遷移

## 🧑‍💻 How to Use　使い方
## モバイル版
 - Open Mobile version (/index-mobile.html) モバイル版のフロントページを開く
- Click the spinner six times to generate your yin-yang sequence　スピナーを６回回して卦を得る
- View the resulting hexagram and its variants　本卦などの結果を見る
- Click the spinner again once to generate your changed line スピナーを最後に１回クリックして変爻を出し、変爻と変卦の結果を見る
- Get a comprehensive summary of your reading　総合的な易断を見る

## PC版
- Open PC version(/index.html) PC版のフロントページを開く
- Enter your question 占いたい内容を入力
- Follow the same steps as Mobile verson モバイル版と同じ手順で進んでいく
- After the comprehensive fortune result is displayed, click the "AI Fortune" button to proceed to ai-advice.html 総合的な易断が出た後、そのページから「AI易断」ボタンを押し、ai-advice.html へ進む
- Enter the details of what you want to explore in depth 詳しく占いたい内容を入力
- Upon completing the payment, a detailed AI-generated fortune will be created in PDF format and sent to your registered email address決済を完了すると、AI による詳細な易断が PDF 形式で生成され、登録したメールアドレスに送信される
- The fortune result will also be saved in the history log, allowing you to review it later 占い結果は履歴（ログ）として保存され、後から再閲覧可能



## 🛠 Tech Stack 技術仕様

- HTML, CSS, JavaScript
- Lottie animation (Bodymovin)
- GitHub Pages for static hosting
- OpenAI API (planned future integration)
- Firebase Authentication (Google Sign-In)


## 📁 Project Structure　プロジェクト構造
project/
├── index.html
├── index-mobile.html
├── about-iching.html
├── bagua.html
├── hexagrams.html
├── how-to-read.html
├── how-to.html
├── log.html
├── feedback.html     ←お問い合わせ関係
├── service-worker.js ←PWA化
├── manifest.json     ←PWA化
├── firebase/
│   ├── firebase.js   ← Firebaseの初期化
│   └── auth.js       ← ログインUIと処理
├── mobile-view.js
├── script.js         ← メインロジック（変更なし）
├── logic.js
├── ui.js
├── toggle-table.js   ←hexagram.html内の六十四卦 
├── heagram.json     ←卦と爻のデータベース
├── styles/
│   ├── base.css      ←HeaderとFooter 
│   ├── style.css     ←index.htmlのmain 
│   ├── spinner.css   ←スピナーの挙動  
|   |__ modal.css　　　←モーダル表示
│   ├── note-style.css←index.html以外のページ
|   ├── bagua.css　　　←bagua.htmlの表
|   ├── sucess.css
|   ├── style-mobile.css
|   ├── log.css
|
├── assets/
│   ├── images/
│   ├── icons/
│   └── animations/     ←スピナーのlottieAnimation
|

## 🔐 Security　セキュリティ

Please **do not expose your OpenAI API key** in public repositories.  
Backend integration is recommended for production use.

## 📄 License　ライセンス

This project is currently intended for personal or non-commercial use.  
Please contact the author for reuse or collaboration.

---

*Created and maintained by Akiko Shimoyama*


