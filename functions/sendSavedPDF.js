import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import admin from "firebase-admin";
import nodemailer from "nodemailer";
import { Timestamp } from "firebase-admin/firestore";

const SMTP_USER = defineSecret("SMTP_USER");
const SMTP_PASS = defineSecret("SMTP_PASS");
const SMTP_HOST = defineSecret("SMTP_HOST");
const SMTP_PORT = defineSecret("SMTP_PORT");

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();
const bucket = admin.storage().bucket();

export const sendSavedPDF = onDocumentUpdated(
    {
        retries: false,
        document: "adviceRequests/{uid}",
        secrets: [SMTP_USER, SMTP_PASS, SMTP_HOST, SMTP_PORT],
        timeoutSeconds: 60,
    },
    async (event) => {
        try {
            const before = event.data?.before?.data();
            const after = event.data?.after?.data();
            const uid = event.params.uid;

            if (!before || !after) {
                console.error("❌ 不正な Firestore データ");
                return;
            }

            // ✅ すでに送信完了していたら処理スキップ
            if (after.status === "completed") {
                console.log(`⏩ uid: ${uid} — すでに送信済み、処理スキップ`);
                return;
            }

            // ✅ 新たに pdfPath が設定されたときのみ実行
            if (!before.pdfPath && after.pdfPath && !after.pdfURL) {
                const userName = after.userName || "匿名";
                const userEmail = after.userEmail;
                if (!userEmail) {
                    console.error("❌ メールアドレスがありません。");
                    return;
                }

                const file = bucket.file(after.pdfPath);
                const [exists] = await file.exists();
                if (!exists) {
                    console.error("❌ PDFファイルがStorageに存在しません。");
                    return;
                }

                const [pdfBuffer] = await file.download();
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
                            content: pdfBuffer,
                        },
                    ],
                });

                const [signedUrl] = await file.getSignedUrl({
                    action: 'read',
                    expires: '2100-01-01',
                });

                await db.doc(`adviceRequests/${uid}`).update({
                    status: "completed",
                    pdfURL: signedUrl,
                    pdfSentAt: Timestamp.now(),
                });

                console.log(`✅ メール送信完了: ${userEmail}`);
            } else {
                console.log(`📭 uid: ${uid} — pdfPathの変更なし、または既に送信済、スキップ`);
            }
        } catch (err) {
            console.error("❌ FirestoreトリガーPDF送信エラー:", err);
        }
    }
);