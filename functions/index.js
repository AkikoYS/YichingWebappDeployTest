// ✅ functions/index.js（ESM形式）
import { webhook } from "./webhook.js";
import { stripe } from "./stripe.js";
import { generateAndSavePDF } from "./generateAndSavePDF.js";
import { sendSavedPDF } from "./sendSavedPDF.js";
// import { deletePdfSentAt } from "./deletePdfSentAt.js";
// import { sendAdviceEmail } from "./sendAdviceEmail.js"; // 必要であれば追加

export {
    webhook,
    stripe, // ✅ alias で "stripe" としてエクスポート（既存呼び出しと整合）
    generateAndSavePDF,
    sendSavedPDF,
};

