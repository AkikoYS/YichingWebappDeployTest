import fetch from "node-fetch";
import { onRequest } from "firebase-functions/v2/https";
import Stripe from "stripe";
import { defineSecret } from "firebase-functions/params";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import nodemailer from "nodemailer";

// ✅ シークレット定義
const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");
const SMTP_USER = defineSecret("SMTP_USER");
const SMTP_PASS = defineSecret("SMTP_PASS");
const SMTP_HOST = defineSecret("SMTP_HOST");
const SMTP_PORT = defineSecret("SMTP_PORT");

if (!getApps().length) initializeApp();
const db = getFirestore();
const bucket = getStorage().bucket();

export const webhook = onRequest({
    secrets: [
        STRIPE_SECRET_KEY,
        STRIPE_WEBHOOK_SECRET,
        SMTP_USER,
        SMTP_PASS,
        SMTP_HOST,
        SMTP_PORT,
    ],
    timeoutSeconds: 30,
}, async (req, res) => {
    const stripe = new Stripe(STRIPE_SECRET_KEY.value(), {
        apiVersion: "2023-10-16",
    });

    let event;

    // ✅ 本番環境では署名検証を必ず実行
    try {
        if (process.env.NODE_ENV === "production") {
            const sig = req.headers["stripe-signature"];
            event = stripe.webhooks.constructEvent(
                req.rawBody,
                sig,
                STRIPE_WEBHOOK_SECRET.value()
            );
        } else {
            // ✅ テスト環境では署名スキップ
            event = req.body;
        }
    } catch (err) {
        console.error("❌ Webhook署名検証エラー:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type !== "checkout.session.completed") {
        console.log("ℹ️ 無視されたイベントタイプ:", event.type);
        return res.status(200).send("Ignored event");
    }

    const session = event.data.object;
    const uid = session.metadata?.uid;

    if (!uid) {
        console.error("❌ UIDが webhook に含まれていません");
        return res.status(400).send("Missing UID");
    }

    try {
        console.log("🔁 webhook で受け取った uid:", uid);

        // ✅ PDF生成 Cloud Function を呼び出す
        const response = await fetch("https://us-central1-yichingapp-a5f90.cloudfunctions.net/generateAndSavePDF", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uid }),
        });

        if (!response.ok) {
            console.error("❌ PDF生成Cloud Functionの呼び出し失敗");
            return res.status(500).send("PDF generation failed");
        }

        // 少し待ってからPDF取得
        await new Promise((resolve) => setTimeout(resolve, 3000));

        const doc = await db.collection("adviceRequests").doc(uid).get();
        if (!doc.exists) {
            console.error("❌ Firestore にデータが見つかりません");
            return res.status(404).send("Data not found");
        }

        const data = doc.data();
        const { userName = "お客様", userEmail } = data;
        if (!userEmail) {
            console.error("❌ メールアドレスが Firestore に存在しません");
            return res.status(400).send("Missing email");
        }

        const file = bucket.file(`pdfs/${uid}.pdf`);
        const [buffer] = await file.download();

        const transporter = nodemailer.createTransport({
            host: SMTP_HOST.value(),
            port: parseInt(SMTP_PORT.value(), 10),
            secure: true,
            auth: {
                user: SMTP_USER.value(),
                pass: SMTP_PASS.value(),
            },
        });

        await transporter.sendMail({
            from: `"易経AI" <${SMTP_USER.value()}>`,
            to: userEmail,
            subject: "【易経AI】あなたへの助言PDFをお届けします",
            text: `${userName}さま\n\nご依頼のAI助言（PDF）をお届けします。\n\n易経くじ管理人`,
            attachments: [
                {
                    filename: "advice.pdf",
                    content: buffer,
                },
            ],
        });

        await db.collection("adviceRequests").doc(uid).update({
            emailSent: true,
        });

        console.log(`✅ PDF送信完了: ${userEmail}`);
        return res.status(200).send("Email sent");
    } catch (err) {
        console.error("❌ Webhook処理エラー:", err.message);
        return res.status(500).send("Internal Error");
    }
});
