// ✅ 新構成の概要：
// generateAndSavePDF.js: 決済前にAI助言とPDFを生成し、Firestore + Storage に保存
// webhook.js: 決済完了後、uidを受け取り、StorageからPDFを読み出してメール送信
// ✅ Firebase + Secrets 初期化（ESM + v2 対応）
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import admin from "firebase-admin";
import OpenAI from "openai";
import nodemailer from "nodemailer";
import { jsPDF } from "jspdf";
import { NotoSansJP } from "./fonts/NotoSansJP-Regular.js";
import fs from "fs";
import path from "path";

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();
const bucket = admin.storage().bucket();

// ✅ データ取得
const quotesPath = path.join(process.cwd(), "quotes.json");
const quotes = JSON.parse(fs.readFileSync(quotesPath, "utf-8"));

// ✅ メイン関数（v2 + ESM形式）
export const generateAndSavePDF = onRequest(
    {
        secrets: [OPENAI_API_KEY],
        timeoutSeconds: 120,
        memory: "1GiB"
    },
    async (req, res) => {
        try {
            const fullData = req.body;
            const {
                uid,
                userName = "匿名",
                userEmail = "",
                userQuestion = "",
                topic = "",
                situation = "",
                notes = "",
                fortunesSummary = "",
                hexagrams = {},
            } = fullData;

            if (!uid) throw new Error("UIDがありません");

            // ✅ Firestore 保存
            await db.collection("adviceRequests").doc(uid).set({
                uid,
                userName,
                userEmail,
                userQuestion,
                topic,
                situation,
                notes,
                fortunesSummary,
                hexagrams,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // ✅ OpenAI に送信するプロンプトの作成
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
- 本卦: ${hexagrams.original.name}
- 変卦: ${hexagrams.changed?.name || "不明"}
- 裏卦: ${hexagrams.reverse?.name || "不明"}
- 総卦: ${hexagrams.sou?.name || "不明"}
- 互卦: ${hexagrams.go?.name || "不明"}
- 変爻: 第${Number(hexagrams.changedLineIndex) + 1}爻

この構成をもとに、現実に根ざした誠実で実用的なアドバイスをお願いします。`;



            const openai = new OpenAI({ apiKey: OPENAI_API_KEY.value() });
            const completion = await openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    { role: "system", content: "あなたは易経に精通した専門家であり、5000文字の日本語の実用的な助言文を書くことが得意です。" },
                    { role: "user", content: prompt }
                ]
            });

            const adviceText = completion.choices[0]?.message?.content || "";

            // ✅ PDF 作成
            const pdf = new jsPDF();
            pdf.addFileToVFS("NotoSansJP-Regular.ttf", NotoSansJP);
            pdf.addFont("NotoSansJP-Regular.ttf", "NotoSansJP", "normal");
            pdf.setFont("NotoSansJP");
            pdf.setFontSize(12);

            const lines = pdf.splitTextToSize(adviceText, 180);
            let y = 10;
            for (const line of lines) {
                if (y > 280) {
                    pdf.addPage();
                    y = 10;
                }
                pdf.text(line, 10, y);
                y += 7;
            }

            // ✅ Storage にアップロード
            const buffer = Buffer.from(pdf.output("arraybuffer"));
            const file = bucket.file(`pdfs/${uid}.pdf`);
            await file.save(buffer, {
                metadata: { contentType: "application/pdf" },
            });

            return res.status(200).json({ success: true });
        } catch (err) {
            console.error("❌ PDF生成エラー:", err);
            return res.status(500).json({ error: err.message });
        }
    }
);