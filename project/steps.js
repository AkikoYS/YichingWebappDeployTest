// ✅ steps.js（フォーム進行と送信処理）

import { showToast, sendAdviceToServer } from "./ai-advice.js";

document.addEventListener("DOMContentLoaded", () => {
    // ✅ 要素取得
    const introBox = document.getElementById("intro-text");
    const steps = document.querySelectorAll(".question-step");
    const chatLog = document.getElementById("chat-log");
    const nextButtons = document.querySelectorAll(".next-btn");
    const paymentButton = document.getElementById("paymentButton");
    const notesStep = document.getElementById("user-notes")?.closest(".question-step");

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
    localStorage.setItem("summaryText", summaryText);

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
                localStorage.setItem("userName", value);
                break;
            case 1:
                localStorage.setItem("userBackground", value);
                break;
            case 2:
                localStorage.setItem("userSituation", value);
                break;
            case 3:
                localStorage.setItem("userEmail", value);
                break;
            case 4:
                localStorage.setItem("userNotes", value);
                console.log("✅ userNotes saved:", value);
                break;
        }

        showNextStep();
    }

    nextButtons.forEach((btn) => {
        btn.addEventListener("click", handleStepInput);
    });

    function renderUserNotesIfAny() {
        const notes = localStorage.getItem("userNotes");
        const chatLog = document.getElementById("chat-log");
        if (notes && !document.querySelector(".chat-log.notes")) {
            const div = document.createElement("div");
            div.className = "chat-log notes";
            div.innerHTML = `<strong>その他の伝えたいこと</strong><br>${notes.replace(/\n/g, "<br>")}`;
            chatLog.appendChild(div);
        }
    }

    // ✅ 共通：userNotesを保存し、chat-logに出す
    function saveAndRenderUserNotes() {
        const notesInput = document.getElementById("user-notes");
        const notes = notesInput?.value.trim();

        if (!notes) return; // 内容が空なら処理しない

        localStorage.setItem("userNotes", notes);

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
    if (testSendButton) {
        testSendButton.addEventListener("click", async () => {
            saveAndRenderUserNotes();
            // ✅ ボタン状態変更（文言と色）
            testSendButton.textContent = "✔ 送信済";
            testSendButton.disabled = true;
            testSendButton.classList.add("sent"); // CSSクラスで色変更
            
            const notesStep = document.querySelector("#user-notes")?.closest(".question-step");
            if (notesStep) {
                notesStep.style.display = "none";
                console.log("✅ notesのstepを直接 display:none で非表示にしました");
            } else {
                console.warn("⚠️ notesStep が取得できませんでした");
            }
            try {
                document.getElementById("sendingStatus").style.display = "block";
                await sendAdviceToServer({ isTest: true });
                showToast("✅ テスト送信が完了しました（メールをご確認ください）");
            } catch (err) {
                console.error(err);
                showToast("❌ テスト送信に失敗しました。もう一度お試しください。");
            } finally {
                document.getElementById("sendingStatus").style.display = "none";
            }
        });
    }

    // ✅ 決済送信ボタン
    if (paymentButton) {
        paymentButton.addEventListener("click", async () => {
            const notesStep = document.getElementById("user-notes")?.closest(".question-step");
            saveAndRenderUserNotes();

            if (notesStep) notesStep.style.display = "none";

            await new Promise(requestAnimationFrame);

            const button = paymentButton;
            button.disabled = true;
            button.textContent = "送信中...";

            const uid = crypto.randomUUID();

            // ✅ Firestoreに素材だけ保存（PDFはまだ生成しない）
            try {
                const firestoreRes = await fetch("https://us-central1-yichingapp-a5f90.cloudfunctions.net/saveUserData", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        uid,
                        userName: localStorage.getItem("userName") || "",
                        userEmail: localStorage.getItem("userEmail") || "",
                        userQuestion: localStorage.getItem("userQuestion") || "",
                        topic: localStorage.getItem("userBackground") || "",
                        situation: localStorage.getItem("userSituation") || "",
                        notes: localStorage.getItem("userNotes") || "",
                        fortunesSummary: localStorage.getItem("summaryText") || "",
                        hexagrams: {
                            original: JSON.parse(localStorage.getItem("originalHexagram") || "{}"),
                            changed: JSON.parse(localStorage.getItem("changedHexagram") || "{}"),
                            reverse: JSON.parse(localStorage.getItem("reverseHexagram") || "{}"),
                            sou: JSON.parse(localStorage.getItem("souHexagram") || "{}"),
                            go: JSON.parse(localStorage.getItem("goHexagram") || "{}"),
                            changedLineIndex: localStorage.getItem("changedLineIndex") || "0",
                        }
                    }),
                });

                if (!firestoreRes.ok) throw new Error("Firestore保存に失敗");
            } catch (err) {
                console.error("❌ Firestore保存エラー:", err);
                showToast("情報の保存に失敗しました。もう一度お試しください。");
                return;
            }

            // ✅ Stripe決済処理（uidをmetadataとsuccess_urlに含める）
            try {
                const stripeRes = await fetch("https://us-central1-yichingapp-a5f90.cloudfunctions.net/stripe", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ uid })
                });

                if (!stripeRes.ok) throw new Error("Stripeセッション生成失敗");

                const { url } = await stripeRes.json();
                window.location.href = url;
            } catch (err) {
                console.error("❌ 決済送信エラー:", err);
                showToast("送信に失敗しました。もう一度お試しください。");
            } finally {
                button.disabled = false;
                button.textContent = "100円で助言を受ける";
            }
        });
    }})