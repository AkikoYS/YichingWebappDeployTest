export async function sendAdviceToServer({ userName, userEmail, userQuestion, topic, situation, notes, hexagrams, fortunesSummary, uid }) {
    const payload = {
        uid,
        userName,
        userEmail,
        userQuestion,
        topic,
        situation,
        notes,
        hexagrams,
        fortunesSummary
    };

    const res = await fetch("https://us-central1-yichingapp-a5f90.cloudfunctions.net/storeAdvicePdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error("PDF保存エラー: " + text);
    }

    return { uid }; // Stripeで使用
}