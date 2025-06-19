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
project/
├── index.html
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
├── script.js         ← メインロジック（変更なし）
├── logic.js
├── ui.js
├── toggle-table.js   ←hexagram.html内の六十四卦 
├── heagrams.json     ←卦と爻のデータベース
├── styles/
│   ├── base.css      ←HeaderとFooter 
│   ├── style.css     ←index.htmlのmain 
│   ├── spinner.css   ←スピナーの挙動  
|   |__ modal.css　　　←モーダル表示
│   ├── note-style.css←index.html以外のページ
|   ├── bagua.css　　　←bagua.htmlの表
|
├── assets/
│   ├── images/
│   ├── icons/
│   └── animations/     ←スピナーのlottieAnimation
|

## 🔐 Security

Please **do not expose your OpenAI API key** in public repositories.  
Backend integration is recommended for production use.

## 📄 License

This project is currently intended for personal or non-commercial use.  
Please contact the author for reuse or collaboration.

---

*Created and maintained by Akiko Shimoyama*


