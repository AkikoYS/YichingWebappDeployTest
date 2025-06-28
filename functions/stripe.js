//v2+ESM

import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import Stripe from "stripe";

// ✅ シークレット
const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");

// ✅ 本番URL or ローカルテスト用URL
const DOMAIN_URL = "https://yichingapp-a5f90.web.app";

// ✅ Cloud Function 本体
export const stripeCheckout = onRequest(
    {
        secrets: [STRIPE_SECRET_KEY],
        timeoutSeconds: 30,
        cors: ["https://yichingapp-a5f90.web.app"], // ← ★これを追加
    },
    async (req, res) => {
        // ✅ Stripe 初期化
        const stripe = new Stripe(STRIPE_SECRET_KEY.value(), {
            apiVersion: "2023-10-16",
        });
        console.log("📥 Stripe API リクエスト内容:", req.body);
        const { uid } = req.body || {};
        console.log("📥 抽出した uid:", uid);

        if (!uid) return res.status(400).json({ error: "UIDが不足しています" });

        try {
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ["card"],
                mode: "payment",
                line_items: [
                    {
                        price_data: {
                            currency: "jpy",
                            unit_amount: 100, // ✅ 金額（100円 = ¥100）
                            product_data: {
                                name: "易経AI助言PDF",
                                description: "AIによる2000文字の助言PDFをメールでお届けします",
                            },
                        },
                        quantity: 1,
                    },
                ],
                metadata: { uid }, // ✅ Webhookで使う
                success_url: `${DOMAIN_URL}/success.html?uid=${uid}`,
                cancel_url: `${DOMAIN_URL}/cancel.html`,
            });

            return res.status(200).json({ url: session.url });
        } catch (err) {
            console.error("❌ Stripeセッション作成失敗:", err);
            return res.status(500).json({ error: "Stripeセッション作成失敗" });
        }
    }
);
