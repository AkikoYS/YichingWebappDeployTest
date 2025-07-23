import { showToast, sendAdviceToServer } from "./ai-advice.js";

document.addEventListener("DOMContentLoaded", () => {
    const introBox = document.getElementById("intro-text");
    const steps = document.querySelectorAll(".question-step");
    const chatLog = document.getElementById("chat-log");
    const nextButtons = document.querySelectorAll(".next-btn");
    const testSendButton = document.getElementById("testSendButton");
    const paymentButton = document.getElementById("paymentButton");
    const formWarning = document.getElementById("formWarning");

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
    introBox.innerHTML = `${summaryText}<br>これらの情報に鑑みて具体的な助言をさしあげますので、<br>よろしければ、状況をもう少し詳しく教えてください。`;
    sessionStorage.setItem("summaryText", summaryText);

    function isFormComplete() {
        const userName = document.getElementById("user-name")?.value?.trim();
        const userTopic = document.getElementById("user-background")?.value?.trim();
        const userSituation = document.getElementById("user-situation")?.value?.trim();
        const userEmail = document.getElementById("user-email")?.value?.trim();
        const userNotes = document.getElementById("user-notes")?.value?.trim();
        return userName && userTopic && userSituation && userEmail&&userNotes;
    }

    function updateButtonState() {
        const isComplete = isFormComplete();
        if (testSendButton) testSendButton.disabled = !isComplete;
        if (paymentButton) paymentButton.disabled = !isComplete;
    }

    // 入力イベントでボタン状態更新
    ["user-name", "user-background", "user-situation", "user-email", "user-notes"].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("input", updateButtonState);
        }
    });

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
                saveAndRenderUserNotes();
                break;
        }

        showNextStep();
    }

    function showNextStep() {
        if (currentIndex < steps.length - 1) {
            steps[currentIndex].classList.add("hidden");
            currentIndex++;
            steps[currentIndex].classList.remove("hidden");
            const input = steps[currentIndex].querySelector("input, textarea");
            input?.focus();

            // ✅ user-notes が表示されるタイミングでイベントを追加
            if (input?.id === "user-notes") {
                input.addEventListener("input", updateButtonState);
            }
        } else {
            steps[currentIndex].classList.add("hidden");
        }
    }

    function saveAndRenderUserNotes() {
        const notesInput = document.getElementById("user-notes");
        const notes = notesInput?.value.trim();

        if (!notes) return;

        sessionStorage.setItem("userNotes", notes);

        const chatLogContainer = document.getElementById("chat-log");
        const existing = chatLogContainer.querySelector(".chat-log.notes");
        if (existing) chatLogContainer.removeChild(existing);

        const div = document.createElement("div");
        div.className = "chat-log notes";
        div.innerHTML = `<strong>その他の伝えたいこと</strong><br>${notes.replace(/\n/g, "<br>")}`;
        chatLogContainer.appendChild(div);

        notesInput.closest(".question-step")?.classList.add("hidden");
    }

    nextButtons.forEach((btn) => btn.addEventListener("click", handleStepInput));
//テストボタン
    testSendButton?.addEventListener("click", async () => {
        console.log("✅ [クリック] テスト送信ボタンが押された");
        saveAndRenderUserNotes();
        console.log("✅ フォーム判定:", isFormComplete());
        if (!isFormComplete()) {
            if (formWarning) formWarning.style.display = "block";
            return;
        } else {
            formWarning.style.display = "none";
        }

        testSendButton.textContent = "✔ 送信済";
        testSendButton.disabled = true;
        testSendButton.classList.add("sent");
        sessionStorage.setItem("testAdviceSent", "true");
        document.getElementById("sendingStatus").style.display = "block";

        try {
            const { uid } = await sendAdviceToServer({ uid: `log_${Date.now()}`, isTest: true });
            showToast("✅ テスト送信が完了しました（メールをご確認ください）");
        } catch (err) {
            console.error("❌ テスト送信エラー:", err);
            showToast("❌ テスト送信に失敗しました。もう一度お試しください。");
        } finally {
            document.getElementById("sendingStatus").style.display = "none";
        }
    });
//決済ボタン
    paymentButton?.addEventListener("click", async () => {
        console.log("✅ [クリック] テスト送信ボタンが押された");
        saveAndRenderUserNotes();
        console.log("✅ フォーム判定:", isFormComplete());
        if (!isFormComplete()) {
            if (formWarning) formWarning.style.display = "block";
            return;
        }

        paymentButton.textContent = "✔ 送信済";
        paymentButton.disabled = true;
        paymentButton.classList.add("sent");

        const uid = `log_${Date.now()}`;

        try {
            await sendAdviceToServer({ isTest: false, uid });
        } catch (err) {
            showToast("保存に失敗しました");
            return;
        }

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
            console.error("❌ Stripe遷移失敗:", err);
            showToast("決済ページへの遷移に失敗しました");
            paymentButton.disabled = false;
            paymentButton.textContent = "100円で助言を受ける";
            paymentButton.classList.remove("sent");
        }
    });
    // DOMが完全に構築されたあと、強制的に全要素にinputイベントをバインド
    function bindInputEvents() {
        ["user-name", "user-background", "user-situation", "user-email", "user-notes"].forEach(id => {
            const el = document.getElementById(id);
            if (el && !el.dataset.bound) {
                el.addEventListener("input", () => {
                    console.log(`✏️ input detected on #${id}`);
                    updateButtonState();
                });
                el.dataset.bound = "true"; // 二重バインド防止
            }
        });
    }
    bindInputEvents();
});
