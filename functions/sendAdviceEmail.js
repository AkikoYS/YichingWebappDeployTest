require("dotenv").config();
const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const { jsPDF } = require("jspdf");
const OpenAI = require("openai");
const nodemailer = require("nodemailer");
const { NotoSansJP } = require("./fonts/NotoSansJP-Regular.js");
const fs = require("fs");
const path = require("path");

const quotesPath = path.join(__dirname, "quotes.json");
const quotes = JSON.parse(fs.readFileSync(quotesPath, "utf-8"));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// ✅ PDF生成+メール送信関数
async function sendAdviceEmailWithPDF({ userName, userEmail, userQuestion, topic, situation, notes, hexagrams, fortunesSummary }) {
    if (!hexagrams?.original?.name) {
        throw new Error("hexagrams.original.name が不明です");
      }
      
    const prompt = `あなたは熟練の易者であり、相談者に誠実な助言を与えるAIです。相談者 ${userName} さんに対して、日本語で約5,000字のエッセイ方式のアドバイスを作成してください。箇条書きではなく、有機的に流れる文章にしてください。

【0. 総合的な易断（前提）】
以下は、相談者に対する全体的な状況診断です。  
この内容を**易断の出発点**として扱い、それを土台に分析やアドバイスを行ってください。
${fortunesSummary}

【1. 重視する構成比と観点】
- 本卦と変爻の解釈を全体の8割に充て、現在の状況とその変化の兆しを深く掘り下げてください。
- 残りの2割で、以下の補助卦を必要に応じて補完的に解釈してください。
  - 裏卦：別の側面から同じ問題を捉えたらこうである。
  - 総卦：他者の気持ち、客観情勢、自分がどう見られているか
  - 互卦：隠された問題、深層心理、本質的な構造
  - 変卦：中長期的な未来像の暗示
※ 補助卦は**羅列しない**でください。補助卦は全て言及する必要はありません。重要なものだけ説明してください。

【2. 文章の構成】
- 導入：相談者の状況を要約
- 展開：本卦の詳細分析 → 変爻を軸にした状況の変化
- 補足：補助卦について（必要に応じて）
- 提言：人生・人間関係・行動の具体的指針（ずばりという）
- 結論：今後に向けた希望とまとめ

【3. 執筆スタイル】
※ 上記の構成は出力には含めず、自然な日本語の文章として展開してください。
※ 導入と結論は短く簡潔に書いてください。
※ 「1. 導入」などの番号付き見出しや、項目立て（箇条書き）は使わず、論理的かつ有機的に流れる読み物のようにしてください。
※ 補助卦は解釈のみに使い、卦名を使って説明する必要はありません。
※ 悪いこと、厳しいことも誠実に伝えてください。

【4. 占断に用いる卦】
- 本卦: ${hexagrams.original.name}
- 変爻: 第${Number(hexagrams.changedLineIndex) + 1}爻
- 変卦: ${hexagrams.changed.name}
- 裏卦: ${hexagrams.reverse.name}
- 総卦: ${hexagrams.sou.name}
- 互卦: ${hexagrams.go.name}

【5. 相談内容】
- テーマ: ${userQuestion}
- 背景: ${topic}
- 感情: ${situation}
- 補足: ${notes}`;

    const aiResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
    });

    const adviceText = aiResponse.choices[0].message.content;
    const pdf = new jsPDF();
    pdf.addFileToVFS("NotoSansJP-Regular.ttf", NotoSansJP);
    pdf.addFont("NotoSansJP-Regular.ttf", "NotoSansJP", "normal");
    pdf.setFont("NotoSansJP");
    pdf.setFontSize(10);

    const randomQuoteObj = quotes[Math.floor(Math.random() * quotes.length)];
    let y = 30;
    const quoteLines = pdf.splitTextToSize(randomQuoteObj.text, 170);
    quoteLines.forEach(line => { pdf.text(line, 20, y); y += 6; });
    pdf.text(`― ${randomQuoteObj.author}`, 195, y, { align: "right" });
    y += 12;

    const cleanText = adviceText.replace(/^#+\s*/gm, "").replace(/\n{2,}/g, "\n\n");
    const bodyLines = pdf.splitTextToSize(cleanText, 160);
    pdf.setFontSize(11.5);
    bodyLines.forEach(line => {
        if (y > 270) { pdf.addPage(); y = 20; }
        pdf.text(line, 15, y);
        y += 6.5;
    });

    const pdfBase64 = pdf.output("datauristring").split(',')[1];
    const transporter = nodemailer.createTransport({
        service: "Gmail",
        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASSWORD },
    });

    await transporter.sendMail({
        from: `"易経くじAI" <${process.env.GMAIL_USER}>`,
        to: userEmail,
        subject: `${userName}さんへのAI助言PDF`,
        html: `${userName}さま<br><br>易経AIアドバイスを添付しました。<br><br>`,
        attachments: [{
            filename: "advice.pdf",
            content: Buffer.from(pdfBase64, "base64"),
            encoding: "base64",
            contentType: "application/pdf",
        }],
    });
}

console.log("📦 受信したbody.original:", body.original);
console.log("📦 受信したbody:", body);
// ✅ Cloud Function ルートは "/" に対応
app.post("/", async (req, res) => {
    try {
        const body = req.body;

        await sendAdviceEmailWithPDF({
            userName: body.userName,
            userEmail: body.userEmail,
            userQuestion: body.userQuestion,
            topic: body.topic,
            situation: body.situation,
            notes: body.notes,
            hexagrams: {
                original: body.original,
                changed: body.changed,
                reverse: body.reverse,
                sou: body.sou,
                go: body.go,
                changedLineIndex: body.changedLineIndex
            },
            fortunesSummary: body.summaryText
        });

        res.status(200).json({ message: "送信成功" });
    } catch (error) {
        console.error("送信エラー:", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = functions.https.onRequest(app); // ✅ 関数名は index.js 側で付ける
