
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getFirestore,
    collection,
    getDocs,
    deleteDoc,
    doc,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDlyCmdke-eRYcPhsAsXGMmO6Cooy_6caI",
    authDomain: "yichingapp-a5f90.firebaseapp.com",
    projectId: "yichingapp-a5f90",
    storageBucket: "yichingapp-a5f90.appspot.com",
    messagingSenderId: "294471771058",
    appId: "1:294471771058:web:b7baf7525c131a39cbbaab",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log("✅ ログイン済み:", user.email);
        await loadAdviceRequests();
    } else {
        alert("⚠️ このページはログインユーザー専用です。");
        location.href = "/";
    }
});

async function loadAdviceRequests() {
    const tableBody = document.getElementById("requestsTableBody");
    tableBody.innerHTML = "";

    const q = query(collection(db, "adviceRequests"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const row = document.createElement("tr");

        row.innerHTML = `
        
        <td>${data.createdAt?.toDate
                ? data.createdAt.toDate().toLocaleString("ja-JP")
                : "-"}</td>
        <td>${data.emailSentAt?.toDate
                ? data.emailSentAt.toDate().toLocaleString("ja-JP")
                : "-"}</td>
        <td>${docSnap.id}</td>
        <td>${data.userEmail || "-"}</td>
        <td>${data.status || "-"}</td>
        <td>${data.pdfURL ? `<a href="${data.pdfURL}" target="_blank">📥 PDF</a>` : "-"}</td>
        <td><input type="checkbox" class="row-check" data-uid="${docSnap.id}"></td>
    `;

        tableBody.appendChild(row);
    });

    document.querySelectorAll(".delete-btn").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
            const uid = e.currentTarget.dataset.uid;
            if (confirm(`UID ${uid} を削除しますか？`)) {
                await deleteDoc(doc(db, "adviceRequests", uid));
                alert("✅ 削除しました");
                loadAdviceRequests();
            }
        });
    });
}
//全削除ボタン
document.getElementById("deleteAllBtn")?.addEventListener("click", async () => {
    if (!confirm("⚠️ 本当に全データを削除しますか？")) return;
    const snapshot = await getDocs(collection(db, "adviceRequests"));
    for (const docSnap of snapshot.docs) {
        await deleteDoc(doc(db, "adviceRequests", docSnap.id));
    }
    alert("✅ 全データを削除しました");
    loadAdviceRequests();
});
//選択削除ボタン
document.getElementById("deleteSelectedBtn")?.addEventListener("click", async () => {
    const checkedBoxes = document.querySelectorAll(".row-check:checked");
    if (checkedBoxes.length === 0) {
        alert("⚠️ 削除する行が選択されていません");
        return;
    }

    if (!confirm(`⚠️ ${checkedBoxes.length} 件のデータを削除しますか？`)) return;

    for (const box of checkedBoxes) {
        const uid = box.dataset.uid;
        await deleteDoc(doc(db, "adviceRequests", uid));
    }

    alert("✅ 選択されたデータを削除しました");
    loadAdviceRequests();
});