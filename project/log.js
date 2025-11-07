console.log("✅ log.js 読み込み完了");

import { auth, db } from './firebase/firebase.js';
import { collection, query, where, getDocs, deleteDoc, doc, orderBy } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const tbody = document.querySelector("#log-table tbody");

  // ★ 行内の個別 addEventListener をやめ、tbody 1本の委譲に統一
  if (tbody) {
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
  }

  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      console.warn("未ログイン状態です。ログを表示できません。");
      if (tbody) tbody.innerHTML = "";
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
      console.log(entry);
      console.log("✅ originalHexagram inside:", entry.originalHexagram);
      // ★ 防御的に展開（無ければ空オブジェクト）

      const orig = entry.originalHexagram ?? {};
      const changed = entry.cachedChangedHexagram ?? {};
      const reverse = entry.reverseHexagram ?? {};
      const sou = entry.souHexagram ?? {};
      const go = entry.goHexagram ?? {};
      const changedLine = entry.cachedChangedLineIndex != null
        ? Number(entry.cachedChangedLineIndex)
        : null;

      const ts = entry.timestamp?.toDate?.() ?? null;
      const tsText = ts
        ? ts.toLocaleString("ja-JP", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
        : "(日時なし)";

      const tr = document.createElement("tr");
      tr.dataset.id = docSnap.id; // ★ 削除に使う

      tr.innerHTML = `
        <td>${tsText}</td>
        <td>${entry.question || "(質問なし)"}</td>

   <td>
  <span class="hex-symbol">${orig.unicode || ""}</span><br>
  ${orig.name ?? "不明"}
  ${orig.reading ? `<br><small>${orig.reading}</small>` : ""}
</td>

        <td>
          ${(changedLine.label || "不明")}<br>
          ${(changedLine.yaoText ?? "")}
        </td>

      <td>
  <span class="hex-symbol">${changed.unicode || ""}</span><br>
  ${changed.name ?? "不明"}
  ${changed.reading ? `<br><small>${changed.reading}</small>` : ""}
</td>

   <td>
  <span class="hex-symbol">${reverse.unicode || ""}</span><br>
  ${reverse.name ?? "不明"}
  ${reverse.reading ? `<br><small>${reverse.reading}</small>` : ""}
</td>
<td>
  <span class="hex-symbol">${sou.unicode || ""}</span><br>
  ${sou.name ?? "不明"}
  ${sou.reading ? `<br><small>${sou.reading}</small>` : ""}
</td>
<td>
  <span class="hex-symbol">${go.unicode || ""}</span><br>
  ${go.name ?? "不明"}
  ${go.reading ? `<br><small>${go.reading}</small>` : ""}
</td>

        <td class="delete-cell">
          <span class="delete-button" role="button" tabindex="0" aria-label="このログを削除">✖</span>
        </td>
      `;

      frag.appendChild(tr);
    });

    // ★ 一括で差し替え（重複appendをやめる）
    if (tbody) {
      tbody.innerHTML = "";
      tbody.appendChild(frag);
    }
  });
});
