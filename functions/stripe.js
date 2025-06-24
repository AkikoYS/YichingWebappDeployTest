const express = require("express");
const cors = require("cors");
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.post("/", async (req, res) => {
    try {
        const { uid } = req.body;
        if (!uid) return res.status(400).json({ error: "uid is required" });

        const stripe = require("stripe")(STRIPE_SECRET_KEY.value());

        const session = await stripe.checkout.sessions.create({
            mode: "payment",
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "jpy",
                        product_data: {
                            name: "AIによる助言（PDF）",
                        },
                        unit_amount: 30000,
                    },
                    quantity: 1,
                },
            ],
            metadata: { uid },
            success_url: "https://yichingapp-a5f90.web.app/success.html",
            cancel_url: "https://yichingapp-a5f90.web.app/ai-advice.html",
        });

        res.status(200).json({ url: session.url });
    } catch (err) {
        console.error("❌ Stripe エラー:", err);
        res.status(500).json({ error: err.message });
    }
});

exports.stripe = onRequest({ secrets: [STRIPE_SECRET_KEY] }, app);
