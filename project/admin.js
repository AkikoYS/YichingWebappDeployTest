import { db } from "./firebase/firebase.js"; // ✅ db, auth, firebaseReadyなども使える
import { collection, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const dashboardBody = document.getElementById("dashboard-body");

function formatDate(timestamp) {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes()}`;
}

function getStatusColor(status) {
    switch (status) {
        case "completed": return "text-green-600";
        case "error": return "text-red-600";
        case "waiting": return "text-yellow-600";
        case "pdfGenerating": return "text-blue-600";
        default: return "text-gray-700";
    }
}

async function loadDashboard() {
    const snapshot = await getDocs(collection(db, "adviceRequests"));
    dashboardBody.innerHTML = "";

    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const uid = docSnap.id;
        const row = document.createElement("tr");

        row.innerHTML = `
      <td class="px-4 py-2 font-mono text-xs">${uid}</td>
      <td class="px-4 py-2">${data.userEmail || "-"}</td>
      <td class="px-4 py-2 font-semibold ${getStatusColor(data.status)}">${data.status || "-"}</td>
      <td class="px-4 py-2">${formatDate(data.createdAt)}</td>
      <td class="px-4 py-2">${formatDate(data.pdfSentAt)}</td>
      <td class="px-4 py-2">
        ${data.status === "error" ? `<button class="retry-btn text-sm text-blue-600 underline" data-uid="${uid}">再送</button>` : "-"}
      </td>
    `;

        dashboardBody.appendChild(row);
    });

    document.querySelectorAll(".retry-btn").forEach(button => {
        button.addEventListener("click", async (e) => {
            const uid = e.target.getAttribute("data-uid");
            const docRef = doc(db, "adviceRequests", uid);
            await updateDoc(docRef, {
                status: "waiting",
                lastTriedAt: new Date(),
                retryCount: (data.retryCount || 0) + 1
            });
            alert(`再送信をキューに追加しました：${uid}`);
            loadDashboard();
        });
    });
}

loadDashboard();
