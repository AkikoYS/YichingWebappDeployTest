// ✅ steps.js（フォーム進行と送信処理）

import { showToast, sendAdviceToServer } from "./ai-advice.js";

document.addEventListener("DOMContentLoaded", () => {
    const introBox = document.getElementById("intro-text");
    const steps = document.querySelectorAll(".question-step");
    const chatLog = document.getElementById("chat-log");
    const paymentButton = document.getElementById("paymentButton");
    const testSendButton = document.getElementById("testSendButton");

    if (!introBox || !chatLog || steps.length === 0) return;

    let currentIndex = 0;
    let userName = "";

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

    function showNextStep() {
        if (currentIndex < steps.length - 1) {
            steps[currentIndex].classList.add("hidden");
            currentIndex++;
            steps[currentIndex].classList.remove("hidden");
            const input = steps[currentIndex].querySelector("input, textarea");
            input?.focus();
        } else {
            // ✅ 最後のステップなら、もう新たなステップは出さない
            steps[currentIndex].classList.add("hidden");
        }
    }

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
                // ✅ 表示用ログとして追加（他と同じスタイル）
                if (value) {
                    // ✅ 表示用ログとして追加（空でなければ）
                    const notesResponse = document.createElement("div");
                    notesResponse.className = "chat-log";
                    notesResponse.innerHTML = `<strong>その他の伝えたいこと</strong><br>${value}`;
                    chatLog.appendChild(notesResponse);
                }

                break;
        }

        showNextStep();
    }

    const nextButtons = document.querySelectorAll(".next-btn");
    nextButtons.forEach((btn) => {
        btn.addEventListener("click", handleStepInput);
    });


    if (testSendButton) {
        testSendButton.addEventListener("click", async () => {

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
});
