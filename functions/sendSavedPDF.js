// functions/sendSavedPDF.js
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import admin from "firebase-admin";
import nodemailer from "nodemailer";
import { Timestamp } from "firebase-admin/firestore";


// 🔐 Firebase Secrets の定義（環境変数的な役割）
const SMTP_USER = defineSecret("SMTP_USER");
const SMTP_PASS = defineSecret("SMTP_PASS");
const SMTP_HOST = defineSecret("SMTP_HOST");
const SMTP_PORT = defineSecret("SMTP_PORT");

// 🔧 Firebase Admin 初期化（複数回防止）
if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();
const bucket = admin.storage().bucket();

// 📬 Firestore ドキュメントの更新トリガー関数（メイン）
// adviceRequests/{uid} ドキュメントの内容が「更新」されたときに発火。
// PDFファイル（pdfPath）が生成され、emailSent: false かつ pdfURL が存在したら、
// PDF をメールでユーザーに送信し、emailSent: true に更新。
export const sendSavedPDF = onDocumentUpdated(
    {
        retries: false,//失敗したら自動でリトライしない
        document: "adviceRequests/{uid}",//adviceRequests コレクション内の任意のドキュメントが更新されたときに発火
        secrets: [SMTP_USER, SMTP_PASS, SMTP_HOST, SMTP_PORT],//defineSecret() で定義した セキュアな環境変数（Firebase Secrets） を、この関数内で使えるようにする
        timeoutSeconds: 60,//最大許容時間
    },
    //firestoreのドキュメント更新時に呼び出される非同期関数。Cloud Functions のトリガーがeventオブジェクトを引数として提供
    async (event) => {
        try {
            //更新前後の２つの状態が渡される。
            const before = event.data?.before?.data();
            const after = event.data?.after?.data();
            const uid = event.params.uid;//これでuidを取得

            // ✅ before/after が欠落していたら早期終了
            if (!before || !after) {
                console.error("❌ 不正な Firestore データ");
                return;
            }

            // ✅ すでに送信完了していたら処理スキップ（再送防止）
            if (after.emailSent === true) {
                console.log(`⏩ uid: ${uid} — すでに送信済み、処理スキップ`);
                return;
            }

            // ✅ 新たに pdfPathとpifURLが設定され、emailSent:falseのときのみ実行
            if (
                after.emailSent === false &&
                after.pdfPath && //Storage上のファイルのパス（システム内部の情報）
                after.pdfURL//署名つきの一時的なアクセスURL
            ) {
                console.log(`📥 sendSavedPDF: 条件成立 → メール送信開始 (${uid})`);

                //userEmailがフィールドにdataとしてなければ警告
                const userName = after.userName || "匿名";
                const userEmail = after.userEmail;
                if (!userEmail) {
                    console.error("❌ メールアドレスがありません。: uid=${uid}, userName=${userName}");
                    return;
                }
                //pdfファイルがstorageに存在しなければ警告
                const file = bucket.file(after.pdfPath);
                const [exists] = await file.exists();
                if (!exists) {
                    console.error("❌ PDFファイルがStorageに存在しません。");
                    return;
                }
                // ✅ 二重送信防止：emailLock を true に設定してロック
                try {
                    await db.runTransaction(async (t) => {
                        const snap = await t.get(db.doc(`adviceRequests/${uid}`));
                        const data = snap.data();
                        if (data?.emailSent || data?.emailLock) throw new Error("⛔ すでに送信済みまたはロック中");
                        t.update(snap.ref, { emailLock: true });
                    });
                } catch (lockErr) {
                    console.warn(`🚫 ロック失敗: ${lockErr.message}`);
                    return;
                }
                //firebaseからPDFファイルをダウンロードし、それを添付してメール送信の準備処理
                const [pdfBuffer] = await file.download();
                //nomadmailerのSMTPトランスポート設定
                const transporter = nodemailer.createTransport({
                    host: SMTP_HOST.value(),
                    port: parseInt(SMTP_PORT.value(), 10),
                    secure: true,//SSL（暗号化）接続を使う設定
                    auth: {
                        user: SMTP_USER.value(),
                        pass: SMTP_PASS.value(),//認証に使用するSMTPアカウント情報（Secretsで管理）
                    },
                });

                //メイン処理：SMTP トランスポーターを使い宛先ユーザーにPDF送信
                try {
                    await transporter.sendMail({//非同期処理にはawaitが必要
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
                    //実行中のエラー（例：SMTP接続失敗、認証失敗、送信先のフォーマットエラーなど）に備え、エラー内容を安全にログ出力して処理を中断
                } catch (mailErr) {
                    console.error(`❌ メール送信失敗: uid=${uid}, error=${mailErr.message}`);
                    return;
                }
                //firebase storageファイルにおける署名付pdfURLの取得
                const [signedUrl] = await file.getSignedUrl({
                    action: 'read',
                    expires: '2100-01-01',
                });
                //メール送信が成功したらFirestore に「送信済み状態」を明示的に保存
                await db.doc(`adviceRequests/${uid}`).update({
                    status: "completed",
                    pdfURL: signedUrl,
                    emailSentAt: Timestamp.now(),
                    emailSent: true,
                });

                console.log(`✅ メール送信完了: ${userEmail}`);
            } else {
                console.log(`📭 メール送信スキップ: uid=${uid}, 条件: emailSent=${after.emailSent}, pdfPath=${after.pdfPath}, pdfURL=${after.pdfURL}`);
            }
        } catch (err) {
            console.error("❌ FirestoreトリガーPDF送信エラー:", err);
        }
    }
);