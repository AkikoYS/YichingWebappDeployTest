
console.log("✅ log.js 読み込み完了");

import { auth, db } from './firebase/firebase.js';
import { collection, query, where, getDocs, deleteDoc, doc, orderBy } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
    const tbody = document.querySelector("#log-table tbody");

    // ★ 行内の個別 addEventListener をやめ、tbody 1本の委譲に統一
    tbody.addEventListener("click", async (e) => {
        const del = e.target.closest(".delete-button");
        if (!del) return;

        const tr = del.closest("tr");
        const id = tr?.dataset?.id;
        if (!id) return;

        if (confirm("このログを削除してもよろしいですか？")) {
            try {
                await deleteDoc(doc(db, "logs", id));
                tr.remove();
            } catch (error) {
                console.error("削除失敗:", error);
            }
        }
    });

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

        // まとめて描画（1件ずつでもOKだけど、このままでも十分速い）
        const frag = document.createDocumentFragment();

        querySnapshot.forEach((docSnap) => {
            const entry = docSnap.data() ?? {};
            // ★ 防御的に展開（無ければ空オブジェクト）
            const orig = entry.original ?? {};
            const changed = entry.changed ?? {};
            const reverse = entry.reverse ?? {};
            const sou = entry.sou ?? {};
            const go = entry.go ?? {};
            const changedLine = entry.changedLine ?? {};

            const ts = entry.timestamp?.toDate?.() ?? null;
            const tsText = ts
                ? ts.toLocaleString("ja-JP", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true
                })
                : "(日時なし)";

            const tr = document.createElement("tr");
            tr.dataset.id = docSnap.id; // ★ 削除に使う

            tr.innerHTML = `
        <td>${tsText}</td>
        <td>${entry.question || "(質問なし)"}</td>

        <td>
          ${orig.name ?? "不明"}<br>
          ${orig.image ? `<img src="./assets/images/hexagrams/${orig.image}" alt="">` : ""}
        </td>

        <td>
          ${(changedLine.label ?? "不明")}<br>
          ${(changedLine.yaoText ?? "")}
        </td>

        <td>
          ${changed.name ?? "不明"}<br>
          ${changed.image ? `<img src="./assets/images/hexagrams/${changed.image}" alt="">` : ""}
        </td>

        <td>
          ${reverse.name ?? "不明"}<br>
          ${reverse.image ? `<img src="./assets/images/hexagrams/${reverse.image}" alt="">` : ""}
        </td>

        <td>
          ${sou.name ?? "不明"}<br>
          ${sou.image ? `<img src="./assets/images/hexagrams/${sou.image}" alt="">` : ""}
        </td>

        <td>
          ${go.name ?? "不明"}<br>
          ${go.image ? `<img src="./assets/images/hexagrams/${go.image}" alt="">` : ""}
        </td>

        <td class="delete-cell">
          <span class="delete-button" role="button" tabindex="0" aria-label="このログを削除">✖</span>
        </td>
      `;

            frag.appendChild(tr);
        });

        // ★ 一括で差し替え（重複appendをやめる）
        tbody.innerHTML = "";
        tbody.appendChild(frag);
    });
});
