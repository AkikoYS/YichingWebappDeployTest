// ✅ Gen2 CORS完全対応版 Cloud Function
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const OpenAI = require("openai");

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

exports.sendAdviceEmail = onRequest({ secrets: [OPENAI_API_KEY] }, async (req, res) => {
    // ✅ CORSプリフライト対応（手動）
    if (req.method === "OPTIONS") {
        res.set("Access-Control-Allow-Origin", "*");
        res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
        res.set("Access-Control-Allow-Headers", "Content-Type");
        return res.status(204).send("");
    }

    // ✅ POST以外は拒否
    if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
    }

    res.set("Access-Control-Allow-Origin", "*");

    try {
        const { summaryText, userName } = req.body;
        const openai = new OpenAI({ apiKey: OPENAI_API_KEY.value() });

        const prompt = `ユーザー ${userName} に対するアドバイス。前提：${summaryText}`;
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [{ role: "user", content: prompt }],
        });

        const advice = completion.choices[0]?.message?.content || "アドバイスの生成に失敗しました。";
        return res.status(200).json({ advice });

    } catch (err) {
        console.error("OpenAIエラー:", err);
        return res.status(500).json({ error: err.message });
    }
});
