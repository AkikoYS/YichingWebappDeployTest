const OpenAI = require("openai");
const { jsPDF } = require("jspdf");
const nodemailer = require("nodemailer");
const { NotoSansJP } = require("./fonts/NotoSansJP-Regular.js");

const { defineSecret } = require("firebase-functions/params");

// 🔐 Secrets
const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");
const SMTP_USER = defineSecret("SMTP_USER");
const SMTP_PASS = defineSecret("SMTP_PASS");
const SMTP_HOST = defineSecret("SMTP_HOST");
const SMTP_PORT = defineSecret("SMTP_PORT");

// 🌐 メイン関数（index.jsから呼び出される）
async function sendAdviceEmail(req, res) {
    // ✅ CORS プリフライト処理
    if (req.method === "OPTIONS") {
        res.set("Access-Control-Allow-Origin", "*");
        res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
        res.set("Access-Control-Allow-Headers", "Content-Type");
        return res.status(204).send("");
    }

    res.set("Access-Control-Allow-Origin", "*");

    if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
    }

    try {
        console.log("🧪 OPENAI_API_KEY (先頭5文字):", OPENAI_API_KEY.value()?.slice(0, 5) || "未定義");
        console.log("🧪 SMTP_USER:", SMTP_USER.value() || "未定義");
        console.log("🧪 SMTP_HOST:", SMTP_HOST.value() || "未定義");
        console.log("🧪 SMTP_PORT:", SMTP_PORT.value() || "未定義");

        const {
            userName = "匿名",
            userEmail = "",
            userQuestion = "（未入力）",
            topic = "",
            situation = "",
            notes = "",
            fortunesSummary = "総合的な易断がありません。",
            hexagrams = {}
        } = req.body || {};

        const {
            original = {},
            changed = {},
            reverse = {},
            sou = {},
            go = {},
            changedLineIndex = "0"
        } = hexagrams;

        if (!userEmail || !userEmail.includes("@")) {
            return res.status(400).json({ error: "メールアドレスが不正です" });
        }

        const prompt = `あなたは熟練の易者であり、相談者に誠実で深い助言を与えるAIです。相談者 ${userName} さんに対して、日本語で約5,000字のエッセイ方式のアドバイスを作成してください。形式的な箇条書きではなく、論理的かつ有機的に流れる文章にしてください。

【0. 総合的な易断（前提）】
${fortunesSummary}

【1. 重視する構成比と観点】
- 本卦と変爻の解釈を全体の7割に充て、現在の状況とその変化の兆しを深く掘り下げてください。
- 残りの3割で、以下の補助的観点（裏卦・総卦・互卦）を使って、視野を広げたり内面を照らしたりしてください。

【2. 相談内容】
- 相談者: ${userName}
- 質問内容: ${userQuestion}
- 背景: ${topic}
- 状況: ${situation}
- メモ: ${notes}

【3. 占断対象の卦】
- 本卦: ${original.name || "不明"}
- 変卦: ${changed.name || "不明"}
- 裏卦: ${reverse.name || "不明"}
- 総卦: ${sou.name || "不明"}
- 互卦: ${go.name || "不明"}
- 変爻: 第${Number(changedLineIndex) + 1}爻`;

        const openai = new OpenAI({ apiKey: OPENAI_API_KEY.value() });
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [{ role: "user", content: prompt }]
        });

        const advice = completion.choices[0]?.message?.content || "アドバイスの生成に失敗しました。";

        const pdf = new jsPDF();
        pdf.addFileToVFS("NotoSansJP-Regular.ttf", NotoSansJP);
        pdf.addFont("NotoSansJP-Regular.ttf", "NotoSansJP", "normal");
        pdf.setFont("NotoSansJP");
        pdf.setFontSize(10);

        const lines = pdf.splitTextToSize(advice, 180);
        lines.forEach((line, i) => {
            pdf.text(line, 10, 20 + i * 7);
        });

        const pdfBuffer = pdf.output("arraybuffer");

        const transporter = nodemailer.createTransport({
            host: SMTP_HOST.value(),
            port: parseInt(SMTP_PORT.value(), 10),
            secure: true,
            auth: {
                user: SMTP_USER.value(),
                pass: SMTP_PASS.value()
            }
        });

        await transporter.sendMail({
            from: `"易経AI" <${SMTP_USER.value()}>`,
            to: userEmail,
            subject: "【易経AI】あなたへの助言PDFをお届けします",
            text: "ご依頼のAI助言PDFを添付いたします。ご確認ください。",
            attachments: [
                {
                    filename: "advice.pdf",
                    content: Buffer.from(pdfBuffer)
                }
            ]
        });

        return res.status(200).json({ success: true });

    } catch (err) {
        console.error("❌ 全体エラー:", err);
        return res.status(500).json({ error: err.message });
    }
}

// ✅ index.jsで使うためにエクスポート
module.exports = sendAdviceEmail;
