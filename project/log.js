console.log("✅ log.js 読み込み完了");

import { auth, db } from './firebase/firebase.js';
import { collection, query, where, getDocs, deleteDoc, doc, orderBy } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
    const tbody = document.querySelector("#log-table tbody");

    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            console.warn("未ログイン状態です。ログを表示できません。");
            return;
        }

        const q = query(
            collection(db, "logs"),
            where("uid", "==", user.uid),
            orderBy("timestamp", "desc")
        );

        const querySnapshot = await getDocs(q);

        console.log("📦 ログ件数:", querySnapshot.size);

        querySnapshot.forEach((docSnap) => {
            const entry = docSnap.data();
            const tr = document.createElement("tr"); // ✅ これが必要！

            try {
                tr.innerHTML = `
                <td>${(entry.timestamp?.toDate?.()?.toLocaleString("ja-JP", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true
                })) || "(日時なし)"
                    }</td>
                <td>${entry.question || '(質問なし)'}</td>
                <td>${entry.original.name || '不明'}<br><img src="/assets/images/hexagrams/${entry.original.image || ''}" alt=""></td>
                <td>${entry.changedLine.label || '不明'}<br>${entry.changedLine.yaoText}</td>
                <td>${entry.changed.name || '不明'}<br><img src="/assets/images/hexagrams/${entry.changed.image || ''}" alt=""></td>
                <td>${entry.reverse?.name || "不明"}<br><img src="/assets/images/hexagrams/${entry.reverse?.image || ""}" alt=""></td>
                <td>${entry.sou?.name || "不明"}<br><img src="/assets/images/hexagrams/${entry.sou?.image || ""}" alt=""></td>
                <td>${entry.go?.name || "不明"}<br><img src="/assets/images/hexagrams/${entry.go?.image || ""}" alt=""></td>
                <td class="delete-cell"><span class="delete-button">✖</span></td>
            `;
                tbody.appendChild(tr);
            } catch (e) {
                console.error("描画エラー:", e, entry);
            }

            // 🔴 Firestore削除処理（doc.id を使う）
            tr.querySelector(".delete-button").addEventListener("click", async () => {
                if (confirm("このログを削除してもよろしいですか？")) {
                    try {
                        await deleteDoc(doc(db, "logs", docSnap.id)); // ✅ 正しいコレクションパス
                        tr.remove(); // 表からも削除
                    } catch (error) {
                        console.error("削除失敗:", error);
                    }
                }
            });

            tbody.appendChild(tr);
        });
    });
});