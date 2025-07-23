// ✅ Firebase v2 + jsPDF + OpenAI（uid = 助言ID）構成
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import admin from "firebase-admin";
import OpenAI from "openai";
import { generatePrompt } from "./prompt.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { stripHtml } from "string-strip-html";
import { renderAdvicePDF } from "./pdfLayout.js";



// 🔐 内部認証トークンの定義
// const INTERNAL_SECRET_TOKEN = defineSecret("INTERNAL_SECRET_TOKEN");
const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

// 🔧 Firebase 初期化
if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();
const bucket = admin.storage().bucket();

// 📂 名言リスト読み込み
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const quotesPath = path.join(__dirname, "quotes.json");
const quotes = JSON.parse(fs.readFileSync(quotesPath, "utf-8"));

// 📄 PDFを生成しStorageに保存するHTTPトリガー関数（メイン処理）
export const generateAndSavePDF = onRequest({
    secrets: [OPENAI_API_KEY],
    timeoutSeconds: 120,
    memory: "512MiB",
}, async (req, res) => {
    console.log("called generateAndSavePDF", req.body);
    res.set("Access-Control-Allow-Origin", "*");
    if (req.method === "OPTIONS") {
        res.set("Access-Control-Allow-Methods", "POST");
        res.set("Access-Control-Allow-Headers", "Content-Type");
        return res.status(204).send("");
    }

    // 🔐 内部トークンの検証（Bearerトークン）
    // const authHeader = req.headers.authorization || "";
    // const token = authHeader.replace("Bearer ", "").trim();

    // if (token !== INTERNAL_SECRET_TOKEN.value()) {
    //     logger.error("❌ 不正なトークンによるアクセス試行");
    //     return res.status(403).send("Forbidden");
    // }

    const { uid } = req.body || {};
    if (!uid) {
        logger.error("❌ リクエストにuidが含まれていません");
        return res.status(400).send("uidは必須です");
    }

    const docRef = db.doc(`adviceRequests/${uid}`);
    let data = null;

    try {
        await db.runTransaction(async (t) => {
            const snapshot = await t.get(docRef);
            if (!snapshot.exists) {
                logger.error(`❌ Firestoreに該当データなし: ${uid}`);
                throw new Error("not_found");
            }

            const snapData = snapshot.data();
            if (snapData.status === "processing" || snapData.status === "completed") {
                throw new Error("⛔ すでに処理済または処理中（再送防止）");
            }

            t.set(docRef, { status: "processing" }, { merge: true });
            data = snapData;
        });
    } catch (err) {
        if (err.message === "not_found") {
            return res.status(404).send(`ドキュメント ${uid} が存在しません`);
        }
        logger.error("❌ トランザクションエラー:", err);
        return res.status(500).send("Firestoreトランザクション失敗");
    }

    const {
        userName = "匿名",
        userQuestion = "",
        topic = "",
        situation = "",
        notes = "",
        fortunesSummary = "",
    } = data;
    const strippedSummary = stripHtml(fortunesSummary).result.trim();

    logger.info("🧾 Prompt に渡されるデータ:", {
        userName,
        userQuestion,
        topic,
        situation,
        notes,
        fortunesSummary,
    });

    try {
        const prompt = generatePrompt({
            userName,
            userQuestion,
            topic,
            situation,
            notes,
            fortunesSummary: strippedSummary,
        });

        //AIでアドバイス文を生成、名言と一緒にPDF出力
        const openai = new OpenAI({ apiKey: OPENAI_API_KEY.value() });//openaiを初期化
        //GPT-4 モデルを使ってチャット形式でアドバイス文を生成
        // ✅ 新しい messages 構造（system + user）
        const messages = [
            {
                role: "system",
                content: `
  あなたは熟練した日本の占い師であり、易経（周易）を用いて深く共感的で実践的な助言を行うAIです。
  表面的な解説や一般論ではなく、相談者の心情と背景を汲み取って助言を行ってください。
  `,
            },
            {
                role: "user",
                content: prompt,
            },
        ];

        // GPT-4 モデルを使ってチャット形式でアドバイス文を生成
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages,
            max_tokens: 6000,
            temperature: 0.85,
            stop: null, // 明示的に止めない
        });
        //応答の中から実際のアドバイス本文だけを取得
        const adviceText = completion.choices[0].message.content;
        //quotes.json の中からランダムに1つ名言を選ぶ
        const randomQuoteObj = quotes[Math.floor(Math.random() * quotes.length)];
        //選ばれた名言を 複数行の文章に整形し、最後に作者名（―〇〇）を追加
        const quoteSentences = randomQuoteObj.text
            .split("。")
            .filter((line) => line.trim() !== "")
            .map((line) => line + "。");
        quoteSentences.push(`— ${randomQuoteObj.author}`);

        const pdf = renderAdvicePDF({ quoteSentences, adviceText });

        //PDF を Firebase Storage に保存
        const buffer = pdf.output("arraybuffer");//pdfをバイナリ転換
        const filePath = `pdfs/${uid}.pdf`;// 保存先パスを設定（uidごとに一意な名前）
        await bucket.file(filePath).save(Buffer.from(buffer));//保存
        //署名付き URL を発行(有効期限7日)
        const [url] = await bucket.file(filePath).getSignedUrl({
            action: "read",
            version: "v4",
            expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        });

        // 情報を保存
        await docRef.update({
            pdfPath: filePath,
            pdfURL: url,
            completedAt: new Date(),
            emailSent: false,        // ← sendSavedPDF の発火条件
            status: "completed"      // ← 表示・管理用の状態
        });

        res.status(200).send({ message: "PDF生成成功", url });
    } catch (err) {
        logger.error("❌ PDF生成エラー:", err);
        await docRef.set({ status: "error", errorMessage: err.message }, { merge: true });
        res.status(500).send({ error: err.message });
    }
});