// ✅ Firebase v2 + jsPDF + OpenAI（uid = 助言ID）構成
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import admin from "firebase-admin";
import OpenAI from "openai";
import { jsPDF } from "jspdf";
import { NotoSansJP } from "./fonts/NotoSansJP-Regular.js";
import { generatePrompt } from "./prompt.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { stripHtml } from "string-strip-html";


const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();
const bucket = admin.storage().bucket();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const quotesPath = path.join(__dirname, "quotes.json");
const quotes = JSON.parse(fs.readFileSync(quotesPath, "utf-8"));

export const generateAndSavePDF = onRequest(
    {
        secrets: [OPENAI_API_KEY],
        timeoutSeconds: 120,
        memory: "512MiB",
    },
    async (req, res) => {
        res.set("Access-Control-Allow-Origin", "*");
        if (req.method === "OPTIONS") {
            res.set("Access-Control-Allow-Methods", "POST");
            res.set("Access-Control-Allow-Headers", "Content-Type");
            return res.status(204).send("");
        }

        try {
            const { uid } = req.body || {};
            if (!uid) {
                logger.error("❌ リクエストにuidが含まれていません");
                return res.status(400).send("uidは必須です");
            }

            const docRef = db.doc(`adviceRequests/${uid}`);

            await db.runTransaction(async (t) => {
                const snapshot = await t.get(docRef);
                const data = snapshot.data();
                if (data?.status === "processing" || data?.status === "completed") {
                    throw new Error("⛔ すでに処理済または処理中（再送防止）");
                }
                t.set(docRef, { status: "processing" }, { merge: true });
            });

            const snapshot = await docRef.get();
            const data = snapshot.data();
            const {
                userName = "匿名",
                userQuestion = "",
                topic = "",
                situation = "",
                notes = "",
                fortunesSummary = "",
            } = data;
            // ✅ HTMLを除去
            const strippedSummary = stripHtml(fortunesSummary).result.trim();

            logger.info("🧾 Prompt に渡されるデータ:", {
                userName,
                userQuestion,
                topic,
                situation,
                notes,
                fortunesSummary,
            });

            const prompt = generatePrompt({
                userName,
                userQuestion,
                topic,
                situation,
                notes,
                fortunesSummary: strippedSummary,
            });

            const openai = new OpenAI({ apiKey: OPENAI_API_KEY.value() });
            const completion = await openai.chat.completions.create({
                model: "gpt-4",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 2000,
            });
            const adviceText = completion.choices[0].message.content;

            const randomQuoteObj = quotes[Math.floor(Math.random() * quotes.length)];
            const quoteText = `${randomQuoteObj.text}\n— ${randomQuoteObj.author}`;

            const pdf = new jsPDF();
            pdf.addFileToVFS("NotoSansJP-Regular.ttf", NotoSansJP);
            pdf.addFont("NotoSansJP-Regular.ttf", "NotoSansJP", "normal");
            pdf.setFont("NotoSansJP");
            pdf.setFontSize(10);

            let y = 30;
            const quoteLines = pdf.splitTextToSize(quoteText, 170);
            quoteLines.forEach((line) => {
                pdf.text(line, 20, y);
                y += 7;
            });

            y += 10; // 名言と本文の間隔

            const lines = pdf.splitTextToSize(adviceText, 170);
            lines.forEach((line) => {
                pdf.text(line, 20, y);
                y += 7;
            });

            const buffer = pdf.output("arraybuffer");
            const filePath = `pdfs/${uid}.pdf`;
            await bucket.file(filePath).save(Buffer.from(buffer));

            const [url] = await bucket.file(filePath).getSignedUrl({
                action: "read",
                version: "v4",
                expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
            });

            await docRef.update({
                status: "completed",
                pdfPath: filePath,
                pdfURL: url,
                completedAt: new Date(),
            });

            res.status(200).send({ message: "PDF生成成功", url });
        } catch (err) {
            logger.error("❌ PDF生成エラー:", err);
            if (req.body?.uid) {
                const ref = db.doc(`adviceRequests/${req.body.uid}`);
                await ref.set({ status: "error", errorMessage: err.message }, { merge: true });
            }
            res.status(500).send({ error: err.message });
        }
    }
);
