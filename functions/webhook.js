// ✅ 修正済：INTERNAL_SECRET_TOKEN を使用しない構成

import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import Stripe from "stripe";
import fetch from "node-fetch";

// ✅ 必要なSecretだけ定義
const STRIPE_SECRET = defineSecret("STRIPE_SECRET");
const STRIPE_API_KEY = defineSecret("STRIPE_API_KEY");

export const webhook = onRequest(
    {
        secrets: [STRIPE_SECRET, STRIPE_API_KEY], // ✅ INTERNAL_SECRET_TOKEN は削除
        timeoutSeconds: 15,
        rawBody: true,
    },
    async (req, res) => {
        const stripe = new Stripe(STRIPE_API_KEY.value(), {
            apiVersion: "2023-10-16",
        });

        if (req.method !== "POST") {
            return res.status(405).send("Method Not Allowed");
        }

        const sig = req.headers["stripe-signature"];
        if (!sig) {
            console.error("❌ Missing Stripe signature header");
            return res.status(400).send("Missing signature");
        }

        let event;
        try {
            event = stripe.webhooks.constructEvent(req.rawBody, sig, STRIPE_SECRET.value());
        } catch (err) {
            console.error("❌ Signature verification failed:", err.message);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        if (event.type !== "checkout.session.completed") {
            return res.status(200).send("Event ignored");
        }

        const session = event.data.object;
        const uid = session?.metadata?.uid;

        if (!uid) {
            console.error("❌ UID not found in metadata:", session);
            return res.status(400).send("Missing UID in metadata");
        }

        try {
            console.log("▶️ generateAndSavePDF呼び出し直前", uid);
            const response = await fetch("https://generateandsavepdf-wrmskjy5ma-uc.a.run.app", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ uid }),
            });
            console.log("✅ generateAndSavePDF呼び出し後、ステータス:", response.status);
            const text = await response.text();
            console.log("✅ PDF Function Response:", text);
            return res.status(200).send("Webhook handled");
        } catch (error) {
            console.error("❌ Error triggering generateAndSavePDF:", error);
            return res.status(500).send("Internal server error");
        }
    }
);
