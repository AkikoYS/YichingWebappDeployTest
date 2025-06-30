import { showToast } from "./ai-advice.js";
import { db } from "./firebase/firebase.js"; // ここはプロジェクト内の firebase.js を参照
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";


const animation = lottie.loadAnimation({
    container: document.getElementById('lottie-background'),
    renderer: 'svg',
    loop: true,
    autoplay: true,
    path: 'assets/animations/loader.json' // ファイルパスに合わせて変更
});

// スピードを50%に設定
animation.setSpeed(0.5);