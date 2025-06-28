// ✅ Firebase + Secrets 初期化（ESM + v2 対応）
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import admin from "firebase-admin";
import { jsPDF } from "jspdf";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import cors from "cors";
import express from "express";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { NotoSansJP } from "./fonts/NotoSansJP-Regular.js";

// ✅ __dirname代替
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ✅ グローバルスコープ
const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

// ✅ Firebase 初期化
if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();
const bucket = admin.storage().bucket();

// ✅ 名言データ取得
const quotesPath = path.join(process.cwd(), "quotes.json");
const quotes = JSON.parse(fs.readFileSync(quotesPath, "utf-8"));

// ✅ Express + CORS
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// ✅ メイン関数（v2 + ESM形式）
export const generateAndSavePDF = onRequest(
    {
        secrets: [OPENAI_API_KEY],
        timeoutSeconds: 120,
        cors: ["https://yichingapp-a5f90.web.app"]
    },
    async (req, res) => {

        // ✅ CORS対応（OPTIONSリクエスト処理）
        if (req.method === "OPTIONS") {
            res.set("Access-Control-Allow-Origin", "*");
            res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
            res.set("Access-Control-Allow-Headers", "Content-Type");
            res.set("Access-Control-Max-Age", "3600");
            res.status(204).send(""); // No Content
            return;
        }

        res.set("Access-Control-Allow-Origin", "*"); // ← 重要：本リクエストへの対応

        try {
            // ✅ secrets
            const apiKey = OPENAI_API_KEY.value(); // ✅ onRequest内で初めて.value()する
            const openai = new OpenAI({ apiKey });
            // const fullData = req.body;
            // const {
            //     uid,
            //     userName = "匿名",
            //     userEmail = "",
            //     userQuestion = "",
            //     topic = "",
            //     situation = "",
            //     notes = "",
            //     fortunesSummary = "",
            //     hexagrams = {},
            // } = fullData;
            const { uid } = req.body;
            if (!uid) throw new Error("UIDがありません");

            console.log("📥 generateAndSavePDF 受け取った uid:", uid);

            const doc = await db.collection("adviceRequests").doc(uid).get();
            if (!doc.exists) throw new Error("指定されたUIDのFirestoreデータが存在しません");

            const {
                userName = "匿名",
                userEmail = "",
                userQuestion = "",
                topic = "",
                situation = "",
                notes = "",
                fortunesSummary = "",
                originalHexagram = "{}",
                changedHexagram = "{}",
                reverseHexagram = "{}",
                souHexagram = "{}",
                goHexagram = "{}",
                changedLineIndex = "0",
            } = doc.data();

            const hexagrams = {
                original: JSON.parse(originalHexagram),
                changed: JSON.parse(changedHexagram),
                reverse: JSON.parse(reverseHexagram),
                sou: JSON.parse(souHexagram),
                go: JSON.parse(goHexagram),
                changedLineIndex,
            };

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
            const prompt = `あなたは熟練の易者で人生相談に対して真摯で実践的な助言を文章で提供する日本語の長文エッセイを専門とするライターAIです。相談者 ${userName} さんに対して、最低でも4000字、できれば5000字のエッセイ方式のアドバイスを作成してください。形式は、見出しをつけない**自然なエッセイスタイル**で、文章が論理的に展開されるようにしてください。
**箇条書きや命令口調は避け**、親身でありながらも冷静な語り口で、読者が状況を多角的に捉え、前向きに行動を起こせるように導いてください。

--前提情報（要解釈）--
${fortunesSummary}

--- 執筆の指針（構成の割合） ---
- 本卦と変爻（全体の約7割）：
　現在の状況と、そこから見えてくる変化の兆しや対応のヒントを掘り下げてください。
- 補助的な卦（約3割）：
　裏卦・総卦・互卦を通じて、心の奥にある想い、他者との関係、物事の本質を補完的に照らしてください。

--- 相談内容 ---
- 相談者: ${userName}
- 質問: ${userQuestion}
- 背景: ${topic}
- 状況: ${situation}
- その他メモ: ${notes}

【3. 占断対象の卦】
- 本卦: ${hexagrams.original?.name || "不明"}
- 変卦: ${hexagrams.changed?.name || "不明"}
- 裏卦: ${hexagrams.reverse?.name || "不明"}
- 総卦: ${hexagrams.sou?.name || "不明"}
- 互卦: ${hexagrams.go?.name || "不明"}
- 変爻: 第${Number(hexagrams.changedLineIndex) + 1}爻

この内容を踏まえ、相談者の状況を理解し、心を整理し、次の一歩を踏み出す力になるような助言文をお願いします。`;

            const completion = await openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    { role: "system", content: "あなたは易経に精通した専門家であり、5000文字の日本語の実用的な助言文を書くことが得意です。" },
                    { role: "user", content: prompt },
                ],
                max_tokens: 4000, // 必要に応じて調整
                temperature: 0.8, // 創造性を少し上げるのも可
            });

            const adviceText = completion.choices[0]?.message?.content || "";

            // ✅ PDF 作成
            const pdf = new jsPDF();
            pdf.addFileToVFS("NotoSansJP-Regular.ttf", NotoSansJP);
            pdf.addFont("NotoSansJP-Regular.ttf", "NotoSansJP", "normal");
            pdf.setFont("NotoSansJP");
            pdf.setFontSize(10);

            let y = 30;
            const quoteObj = quotes[Math.floor(Math.random() * quotes.length)];
            const quoteText = `${quoteObj.text}\n— ${quoteObj.author}`;
            const quoteLines = pdf.splitTextToSize(quoteText, 160);

            // 飾り枠線と中央配置（名言）
            const quotePadding = 10;
            const quoteLineHeight = 7;
            const quoteHeight = quoteLines.length * quoteLineHeight + quotePadding * 2;

            const quoteBoxTop = y;
            pdf.setDrawColor(150, 150, 200);
            pdf.setLineWidth(0.5);
            pdf.roundedRect(15, quoteBoxTop, 180, quoteHeight, 4, 4, 'D');

            let quoteY = quoteBoxTop + quotePadding;
            quoteLines.forEach((line) => {
                const textWidth = pdf.getTextWidth(line);
                const x = (210 - textWidth) / 2;
                pdf.text(line, x, quoteY);
                quoteY += quoteLineHeight;
            });
            y = quoteBoxTop + quoteHeight + 15; // 次の内容の描画位置

            const lines = pdf.splitTextToSize(adviceText, 170);
            lines.forEach((line) => {
                if (y > 280) {
                    pdf.addPage();
                    y = 20;
                }
                // 禁則処理（句点・読点が行頭に来ないよう調整）
                let adjustedLine = line;
                if (/^[、。]/.test(line)) {
                    line = "　" + line;
                }
                pdf.text(line, 20, y);
                y += 7;
            });

            const pdfBuffer = pdf.output("arraybuffer");
            // ✅ Storage にアップロード
            const buffer = Buffer.from(pdf.output("arraybuffer"));
            const file = bucket.file(`pdfs/${uid}.pdf`);
            await file.save(buffer, {
                metadata: { contentType: "application/pdf" },
            });
            // ✅ FirestoreにpdfPathを書き戻し（これが sendSavedPDF.js のトリガー条件）
            await db.collection("adviceRequests").doc(uid).set({
                pdfPath: `pdfs/${uid}.pdf`
            }, { merge: true });

            console.log("📤 Firestore に pdfPath を書き込んだ uid:", uid); // ← ここにも

            return res.status(200).json({ success: true });
        } catch (err) {
            console.error("❌ PDF生成エラー:", err);
            return res.status(500).json({ error: err.message });
        }
    }
);
