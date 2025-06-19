
require("dotenv").config();
const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const admin = require("firebase-admin");

// 必要なら初期化（重複防止）
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// ✅ 決済セッション作成エンドポイント
app.post("/createCheckoutSession", async (req, res) => {
    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "payment",
            line_items: [{ price: "price_1RaRH6K9WG06pzlU7wE3UFhZ", quantity: 1 }],
            success_url: "http://localhost:5500/success.html",
            cancel_url: "http://localhost:5500/index.html",
        });
        res.status(200).json({ url: session.url });
    } catch (err) {
        console.error("Checkout session error:", err);
        res.status(500).send("Checkout session error");
    }
});

// ✅ Stripe決済完了時に自動で呼ばれるWebhook処理（Firestoreを参照し、PDFを送信）
app.post("/stripeWebhook", async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;
    console.log("Webhook data to sendAdviceEmailWithPDF:", data);

    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
    } catch (err) {
        console.error("Webhook Error:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const uid = session.metadata?.uid;
        if (!uid) {
            console.warn("No UID found in session metadata.");
            return res.status(400).send("Missing UID");
        }

        const snapshot = await db.collection("payments_pending")
            .where("uid", "==", uid)
            .orderBy("timestamp", "desc")
            .limit(1)
            .get();

        if (!snapshot.empty) {
            const data = snapshot.docs[0].data();

            try {
                const { sendAdviceEmailWithPDF } = require("./sendAdviceEmail");
                await sendAdviceEmailWithPDF(data);
            } catch (err) {
                console.error("PDF送信失敗:", err);
            }
        }
    }

    res.status(200).json({ received: true });
});

// ✅ Firebase Functions export
exports.stripe = functions.https.onRequest(app);
