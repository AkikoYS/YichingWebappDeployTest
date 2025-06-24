const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const storeAdvicePdf = require("./storeAdvicePdf");
const stripe = require("./stripe");
const sendAdviceEmail = require("./sendAdviceEmail");

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");
const SMTP_USER = defineSecret("SMTP_USER");
const SMTP_PASS = defineSecret("SMTP_PASS");
const SMTP_HOST = defineSecret("SMTP_HOST");
const SMTP_PORT = defineSecret("SMTP_PORT");
const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");

exports.sendAdviceEmail = onRequest(
    { secrets: [OPENAI_API_KEY, SMTP_USER, SMTP_PASS, SMTP_HOST, SMTP_PORT] },
    sendAdviceEmail
);

exports.stripe = onRequest({ secrets: [STRIPE_SECRET_KEY] }, stripe);
exports.storeAdvicePdf = onRequest({}, storeAdvicePdf);
