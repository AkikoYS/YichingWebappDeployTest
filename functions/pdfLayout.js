// pdfLayout.js

import { jsPDF } from "jspdf";
import { NotoSansJP } from "./fonts/NotoSansJP-Regular.js";

// 禁則文字
const lineHeadProhibited = ["、", "。", "」", "』", "）", "】", "ー", "ァ", "ィ", "ゥ", "ェ", "ォ", "ッ", "ャ", "ュ", "ョ", "ー", "！", "？"];
const lineEndProhibited = ["「", "『", "（", "【"];

function splitWithKinsoku(text, maxWidth, pdf) {
    const rawLines = pdf.splitTextToSize(text, maxWidth);
    const fixedLines = [];

    rawLines.forEach((line, idx) => {
        if (idx === 0) {
            fixedLines.push(line);
            return;
        }

        const prev = fixedLines[fixedLines.length - 1];
        const current = line;

        if (lineHeadProhibited.includes(current.charAt(0))) {
            fixedLines[fixedLines.length - 1] = prev + current.charAt(0);
            fixedLines.push(current.slice(1));
        } else if (lineEndProhibited.includes(prev.charAt(prev.length - 1))) {
            const movedChar = prev.charAt(prev.length - 1);
            fixedLines[fixedLines.length - 1] = prev.slice(0, -1);
            fixedLines.push(movedChar + current);
        } else {
            fixedLines.push(current);
        }
    });

    return fixedLines;
}

// メイン：PDF描画処理（名言 + 本文）
export function renderAdvicePDF({ quoteSentences, adviceText }) {
    const pdf = new jsPDF();
    pdf.addFileToVFS("NotoSansJP-Regular.ttf", NotoSansJP);
    pdf.addFont("NotoSansJP-Regular.ttf", "NotoSansJP", "normal");
    pdf.setFont("NotoSansJP");
    pdf.setFontSize(10);
    pdf.setTextColor("#228B22");

    const margin = 30;
    const pageWidth = pdf.internal.pageSize.width;
    const usableWidth = pageWidth - margin * 2;
    let y = 30;

    const quoteLines = [];

    quoteSentences.slice(0, -1).forEach((sentence) => {
        const lines = splitWithKinsoku(sentence, usableWidth, pdf);
        quoteLines.push(...lines);
    });

    quoteLines.forEach((line) => {
        const textWidth = pdf.getTextWidth(line);
        const x = (pageWidth - textWidth) / 2;
        pdf.text(line, x, y);
        y += 7;
    });

    const authorLine = quoteSentences[quoteSentences.length - 1];
    const authorWidth = pdf.getTextWidth(authorLine);
    const rightX = pageWidth - margin - authorWidth;
    pdf.text(authorLine, rightX, y);

    y += 10;
    pdf.setTextColor(0, 0, 0);

    const pageHeight = pdf.internal.pageSize.height;
    const lines = splitWithKinsoku(adviceText, 170, pdf);

    for (const line of lines) {
        if (y + 7 > pageHeight - 20) {
            pdf.addPage();
            y = 20;
        }
        pdf.text(line, 20, y);
        y += 7;
    }

    return pdf;
}
