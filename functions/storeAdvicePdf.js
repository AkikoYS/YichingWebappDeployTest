const express = require("express");
const cors = require("cors");
const { onRequest } = require("firebase-functions/v2/https");
const { jsPDF } = require("jspdf");
const { NotoSansJP } = require("./fonts/NotoSansJP-Regular");

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.post("/", async (req, res) => {
    try {
        const { adviceText } = req.body;
        if (!adviceText) return res.status(400).json({ error: "adviceText is required" });

        const pdf = new jsPDF();
        pdf.addFileToVFS("NotoSansJP-Regular.ttf", NotoSansJP);
        pdf.addFont("NotoSansJP-Regular.ttf", "NotoSansJP", "normal");
        pdf.setFont("NotoSansJP");
        pdf.setFontSize(10);

        const lines = pdf.splitTextToSize(adviceText, 170);
        let y = 20;
        for (const line of lines) {
            if (y > 280) {
                pdf.addPage();
                y = 20;
            }
            pdf.text(line, 20, y);
            y += 7;
        }

        const pdfData = pdf.output("datauristring");
        res.status(200).json({ pdfData });
    } catch (err) {
        console.error("❌ PDF生成エラー:", err);
        res.status(500).json({ error: err.message });
    }
});

exports.storeAdvicePdf = onRequest(app);
