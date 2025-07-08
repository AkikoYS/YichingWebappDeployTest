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

// 🔐 OpenAI APIキーの定義
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
export const generateAndSavePDF = onRequest(
    {
        secrets: [OPENAI_API_KEY],
        timeoutSeconds: 120,
        memory: "512MiB",
    },
    async (req, res) => {
        // 🌐 CORS対応（オプションリクエスト処理）
        res.set("Access-Control-Allow-Origin", "*");
        if (req.method === "OPTIONS") {
            res.set("Access-Control-Allow-Methods", "POST");
            res.set("Access-Control-Allow-Headers", "Content-Type");
            return res.status(204).send("");
        }

        try {
            // ✅ リクエストボディから uid を取得（POSTリクエスト前提）
            const { uid } = req.body || {};
            // ❗ uid が含まれていない場合はリクエスト不備としてエラーを返す
            if (!uid) {
                logger.error("❌ リクエストにuidが含まれていません");
                return res.status(400).send("uidは必須です");
            }
            //「複数の同時実行による二重処理・PDF生成の競合・再送信」を防ぐための安全対策
            //ユーザーのくじデータは、adviceRequest/uid...のdoc。
            const docRef = db.doc(`adviceRequests/${uid}`);

            await db.runTransaction(async (t) => {
                const snapshot = await docRef.get();
                if (!snapshot.exists) {
                    logger.error(`❌ Firestoreに該当データなし: ${uid}`);
                    return res.status(404).send(`ドキュメント ${uid} が存在しません`);
                }//adviceRequests/{uid}）の現行内容（スナップショット）を取得

                const data = snapshot.data();//Dataを使って展開することで、GPT へのプロンプト生成・PDF内容の整形・ログなどの後続処理の土台になる

                //すでに status が "processing"（現在実行中）または "completed"（成功済）なら、処理を中止
                if (data.status === "processing" || data.status === "completed") {
                    //明示的に処理を中断し、エラーメッセージを外部に通知するための命令。
                    throw new Error("⛔ すでに処理済または処理中（再送防止）");
                }
                t.set(docRef, { status: "processing" }, { merge: true });//排他制御

            });
            //実際のPDF生成やプロンプト生成のために必要なすべてのフィールドを読み込む

            const data = snapshot.data();
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
            const completion = await openai.chat.completions.create({
                model: "gpt-4",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 4000,
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
            //PDFを初期化
            const pdf = new jsPDF();
            pdf.addFileToVFS("NotoSansJP-Regular.ttf", NotoSansJP);
            pdf.addFont("NotoSansJP-Regular.ttf", "NotoSansJP", "normal");
            pdf.setFont("NotoSansJP");
            pdf.setFontSize(10);

            //名言（quoteSentences）を中央揃えで描画
            const margin = 30;
            const pageWidth = pdf.internal.pageSize.width;
            const usableWidth = pageWidth - margin * 2;
            let y = 30;

            const quoteLines = [];

            quoteSentences.slice(0, -1).forEach((sentence) => {
                const lines = pdf.splitTextToSize(sentence, usableWidth);
                quoteLines.push(...lines);
            });

            // 中央揃えで名言本文を描画
            quoteLines.forEach((line) => {
                const textWidth = pdf.getTextWidth(line);
                const x = (pageWidth - textWidth) / 2;
                pdf.text(line, x, y);
                y += 7;
            });
            // 作者行だけ右寄せで描画
            const authorLine = quoteSentences[quoteSentences.length - 1];
            const authorWidth = pdf.getTextWidth(authorLine);
            const rightX = pageWidth - margin - authorWidth;
            pdf.text(authorLine, rightX, y);

            y += 10;//名言と本文のスペース

            //アドバイス本文（lines）を左寄せで描画
            const lines = pdf.splitTextToSize(adviceText, 170);
            lines.forEach((line) => {
                pdf.text(line, 20, y);
                y += 7;
            });
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

            await docRef.update({
                status: "completed",
                pdfPath: filePath,
                pdfURL: url,
                completedAt: new Date(),
                emailSent: false,
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
