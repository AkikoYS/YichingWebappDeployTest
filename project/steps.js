// ✅ steps.js（フォーム進行と送信処理）

import { showToast, sendAdviceToServer } from "./ai-advice.js";
import { db } from "./firebase/firebase.js";
import {
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
    // ✅ 要素取得
    const introBox = document.getElementById("intro-text");
    const steps = document.querySelectorAll(".question-step");
    const chatLog = document.getElementById("chat-log");
    const nextButtons = document.querySelectorAll(".next-btn");
    const testSendButton = document.getElementById("testSendButton");
    const paymentButton = document.getElementById("paymentButton");
    const notesStep = document.getElementById("user-notes")?.closest(".question-step");
    const emailInput = document.getElementById("user-email");
    const formWarning = document.getElementById("formWarning");

    if (!introBox || !chatLog || steps.length === 0) return;

    // ✅ 初期化
    let currentIndex = 0;
    let userName = "";

    // ✅ 占い内容の取得と表示
    const userQuestion = localStorage.getItem("userQuestion") || "（未入力）";
    const originalHexagram = JSON.parse(localStorage.getItem("originalHexagram") || "{}");
    const changedHexagram = JSON.parse(localStorage.getItem("changedHexagram") || "{}");
    const reverseHexagram = JSON.parse(localStorage.getItem("reverseHexagram") || "{}");
    const souHexagram = JSON.parse(localStorage.getItem("souHexagram") || "{}");
    const goHexagram = JSON.parse(localStorage.getItem("goHexagram") || "{}");
    const changedLineIndex = localStorage.getItem("changedLineIndex") || "0";


    const summaryText = `あなたの占いたい内容は<strong>「${userQuestion}」</strong>でした。<br>あなたが得たのは、本卦は<strong>${originalHexagram.name || "（不明）"}</strong>、変爻は<strong>${Number(changedLineIndex) + 1}爻</strong>でした。<br>（裏卦:<strong>${reverseHexagram.name || "不明"}</strong>、総卦:<strong>${souHexagram.name || "不明"}</strong>、互卦:<strong>${goHexagram.name || "不明"}</strong>、変卦:<strong>${changedHexagram.name || "不明"}</strong>）`;
    introBox.innerHTML = `${summaryText}<br>これらの情報に鑑みて5000字程度の具体的な助言をさしあげますので、<br>よろしければ、状況をもう少し詳しく教えてください。`;
    sessionStorage.setItem("summaryText", summaryText);

    //eメールを記入したらwarningが消える
    if (emailInput && formWarning) {
        emailInput.addEventListener("input", () => {
            if (isFormComplete()) {
                formWarning.style.display = "none";
            }
        });
    }
    console.log(emailInput, formWarning);
    //バリデーション関数
    function isFormComplete() {
        const userName = document.getElementById("user-name")?.value?.trim();
        const userTopic = document.getElementById("user-background")?.value?.trim();
        const userSituation = document.getElementById("user-situation")?.value?.trim();
        const userEmail = document.getElementById("user-email")?.value?.trim();

        return userName && userTopic && userSituation && userEmail;
    }
    // ✅ ステップ切り替え
    function showNextStep() {
        if (currentIndex < steps.length - 1) {
            steps[currentIndex].classList.add("hidden");
            currentIndex++;
            steps[currentIndex].classList.remove("hidden");
            steps[currentIndex].querySelector("input, textarea")?.focus();
        } else {
            steps[currentIndex].classList.add("hidden");
        }
    }

    // ✅ 入力処理
    function handleStepInput() {
        const currentStep = steps[currentIndex];
        const input = currentStep.querySelector("input, textarea");
        if (!input.value.trim()) {
            input.focus();
            return;
        }

        const label = currentStep.querySelector("label").textContent;
        const value = input.value.trim();

        const response = document.createElement("div");
        response.className = "chat-log";
        response.innerHTML = `<strong>${label}</strong><br>${value}`;
        chatLog.appendChild(response);

        switch (currentIndex) {
            case 0:
                userName = value;
                document.getElementById("label-topic").textContent = `${userName}さん、占いたい内容の背景を教えてください。`;
                document.getElementById("label-situation").textContent = `${userName}さん、現在、どのような状況・お気持ちですか？`;
                sessionStorage.setItem("userName", value);
                break;
            case 1:
                sessionStorage.setItem("userBackground", value);
                break;
            case 2:
                sessionStorage.setItem("userSituation", value);
                break;
            case 3:
                sessionStorage.setItem("userEmail", value);
                break;
            case 4:
                sessionStorage.setItem("userNotes", value);
                console.log("✅ userNotes saved:", value);
                break;
        }

        showNextStep();
    }

    nextButtons.forEach((btn) => {
        btn.addEventListener("click", handleStepInput);
    });

    // ✅ 共通：userNotesを保存し、chat-logに出す
    function saveAndRenderUserNotes() {
        const notesInput = document.getElementById("user-notes");
        const notes = notesInput?.value.trim();

        if (!notes) return; // 内容が空なら処理しない

        sessionStorage.setItem("userNotes", notes);

        // すでに chat-log.notes がある場合は何もしない
        if (document.querySelector(".chat-log.notes")) return;

        const div = document.createElement("div");
        div.className = "chat-log notes";
        div.innerHTML = `<strong>その他の伝えたいこと</strong><br>${notes.replace(/\n/g, "<br>")}`;
        document.getElementById("chat-log")?.appendChild(div);

        // notes ステップを非表示にする
        document.querySelector("#user-notes")?.closest(".question-step")?.classList.add("hidden");
    }

    // ✅ テスト送信ボタン
    testSendButton.addEventListener("click", async () => {
        saveAndRenderUserNotes(); // ✅ メモを先に保存

        if (!isFormComplete()) {
            if (formWarning) formWarning.style.display = "block";
            return;
        } else {
            if (formWarning) formWarning.style.display = "none";
        }

        // ✅ ボタンUI更新
        testSendButton.textContent = "✔ 送信済";
        testSendButton.disabled = true;
        testSendButton.classList.add("sent");
        sessionStorage.setItem("testAdviceSent", "true");

        // ✅ ステータス表示
        document.getElementById("sendingStatus").style.display = "block";

        try {
            // 🔑 毎回ユニークなuidで送信（Firestore保存 + PDF生成）
            const { uid } = await sendAdviceToServer({
                uid: `log_${Date.now()}`,
                isTest: true,
            });
            showToast("✅ テスト送信が完了しました（メールをご確認ください）");
        } catch (err) {
            console.error("❌ テスト送信エラー:", err);
            showToast("❌ テスト送信に失敗しました。もう一度お試しください。");
        } finally {
            document.getElementById("sendingStatus").style.display = "none";
        }
    });

    // ✅ 決済送信ボタン
    paymentButton.addEventListener("click", async () => {
        saveAndRenderUserNotes();

        if (!isFormComplete()) {
            if (formWarning) formWarning.style.display = "block";
            return;
        }

        // ✅ UIを送信中に変更
        paymentButton.textContent = "✔ 送信済";
        paymentButton.disabled = true;
        paymentButton.classList.add("sent");

        // ✅ 統一形式でuid生成（例: log_1751789401234）
        const uid = `log_${Date.now()}`;

        // ✅ Firestoreに保存（有料扱い）
        try {
            await sendAdviceToServer({ isTest: false, uid });
        } catch (err) {
            showToast("保存に失敗しました");
            return;
        }

        // ✅ Stripe決済セッション作成
        try {
            const stripeRes = await fetch("https://us-central1-yichingapp-a5f90.cloudfunctions.net/stripe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ uid })
            });

            if (!stripeRes.ok) throw new Error("Stripeセッション生成失敗");

            const { url } = await stripeRes.json();

            // ✅ ページ遷移直前：UI変更せずそのまま
            window.location.href = url;

            // ✅ ここに何も書かない（ページが遷移するので）
        } catch (err) {
            console.error("❌ Stripe遷移失敗:", err);
            showToast("決済ページへの遷移に失敗しました");

            // ❌ 失敗したときだけUIを元に戻す（ここだけ）
            paymentButton.disabled = false;
            paymentButton.textContent = "100円で助言を受ける";
            paymentButton.classList.remove("sent");
        }
    });
})