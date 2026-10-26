import "server-only";
import path from "node:path";
import { PDFDocument } from "pdfkit";
import type { ProgramPoint, ProgramView } from "../domain/program";

const teal = "#087F7B";
const tealDark = "#075B59";
const softTeal = "#EFF9F7";
const border = "#C8E1DE";
const ink = "#162432";
const muted = "#667789";

export function programPdfFilename(view: ProgramView) {
  const slug =
    view.snapshot.campaign.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "campana";
  return `campana-${slug}${view.version ? `-v${view.version}` : ""}.pdf`;
}

export function programPdfDayTitle(date: string, fallback: string) {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return fallback || date;
  const formatted = new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(parsed);
  const plain = formatted.replace(/,/g, "");
  return plain.charAt(0).toUpperCase() + plain.slice(1);
}

export function orderedProgramPdfPoints(points: ProgramPoint[]) {
  // The snapshot is already ordered by the campaign's configured sortOrder.
  return [...points];
}

export function programPdfCellNames(
  block: ProgramView["snapshot"]["days"][number]["blocks"][number],
  pointId: string,
) {
  const cell = block.cells.find((item) => item.pointId === pointId);
  if (!cell?.active) return ["Sin asignar"];
  const names = cell.slots.flatMap((person) => (person ? [person.fullName] : []));
  return names.length ? names : ["Sin asignar"];
}

function fontForCell(
  doc: PDFDocument,
  lines: string[],
  width: number,
  height: number,
) {
  for (let size = 9; size >= 6.4; size -= 0.2) {
    const total = lines.reduce(
      (sum, line) =>
        sum + doc.font("regular").fontSize(size).heightOfString(line, {
          width,
          lineGap: 0.8,
        }),
      0,
    );
    if (total + Math.max(lines.length - 1, 0) * 1.5 <= height) return size;
  }
  return 6.4;
}

function drawCellText(
  doc: PDFDocument,
  lines: string[],
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const isEmpty = lines.length === 1 && lines[0] === "Sin asignar";
  const displayLines = isEmpty
    ? lines
    : lines.map((line, index) => `${index + 1}. ${line}`);
  const size = fontForCell(doc, displayLines, width, height);
  let top = y;
  for (const line of displayLines) {
    const lineHeight = doc.font("regular").fontSize(size).heightOfString(line, {
      width,
      lineGap: 0.8,
    });
    doc
      .font("regular")
      .fontSize(size)
      .fillColor(isEmpty ? muted : ink)
      .text(line, x, top, {
        width,
        height: Math.max(0, height - (top - y)),
        ellipsis: true,
        lineGap: 0.8,
      });
    top += lineHeight + 1.5;
  }
}

/** Server-only renderer. One A4 landscape page is deliberately reserved per day. */
export async function renderProgramPdf(view: ProgramView): Promise<Buffer> {
  const fontRoot = path.join(process.cwd(), "src/modules/campaigns/assets/fonts");
  const regular = path.join(fontRoot, "NotoSans-Regular.ttf");
  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margin: 18,
    autoFirstPage: false,
    bufferPages: true,
    font: regular,
    info: {
      Title: view.snapshot.campaign.name,
      Author: "D-Territorio",
      Subject: "Programa diario de campaña",
      ...(view.publishedAt
        ? { CreationDate: new Date(view.publishedAt), ModDate: new Date(view.publishedAt) }
        : {}),
    },
  });
  doc
    .registerFont("regular", regular)
    .registerFont("bold", path.join(fontRoot, "NotoSans-Bold.ttf"));
  const chunks: Buffer[] = [];
  const output = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  const days = view.snapshot.days.length
    ? [...view.snapshot.days].sort((a, b) => a.date.localeCompare(b.date))
    : [{ id: "empty", date: "Sin días activos", label: "", points: [], blocks: [] }];

  for (const day of days) {
    doc.addPage();
    const margin = 18;
    const points = orderedProgramPdfPoints(day.points);
    const blocks = [...day.blocks].sort((a, b) =>
      a.startTime === b.startTime
        ? a.endTime.localeCompare(b.endTime)
        : a.startTime.localeCompare(b.startTime),
    );
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    doc.font("bold").fontSize(21).fillColor(ink).text(programPdfDayTitle(day.date, day.label), margin, margin + 2, {
      width: pageWidth - 2 * margin,
    });

    const tableY = margin + 45;
    const availableHeight = pageHeight - tableY - margin;
    const headerHeight = 34;
    const rows = Math.max(points.length, 1);
    // Keep the daily sheet together; the standard 8-point layout gets 60pt
    // rows, while unusually large campaigns compact rather than paginate.
    const rowHeight = (availableHeight - headerHeight) / rows;
    const pointWidth = Math.min(88, Math.max(70, (pageWidth - 2 * margin) * 0.11));
    const blockWidth =
      (pageWidth - 2 * margin - pointWidth) / Math.max(blocks.length, 1);
    const tableWidth = pageWidth - 2 * margin;
    const tableHeight = headerHeight + rowHeight * rows;

    doc.fillColor(teal).rect(margin, tableY, tableWidth, headerHeight).fill();
    doc.font("bold").fontSize(10).fillColor("#FFFFFF").text("Punto", margin + 8, tableY + 10, {
      width: pointWidth - 16,
      align: "left",
    });
    blocks.forEach((block, index) => {
      const x = margin + pointWidth + blockWidth * index;
      doc.font("bold").fontSize(9.4).fillColor("#FFFFFF").text(
        `${block.startTime}–${block.endTime}`,
        x + 4,
        tableY + 10,
        { width: blockWidth - 8, align: "center" },
      );
    });

    for (let row = 0; row < rows; row++) {
      const point = points[row];
      const y = tableY + headerHeight + row * rowHeight;
      if (row % 2 === 1) doc.fillColor(softTeal).rect(margin, y, tableWidth, rowHeight).fill();
      if (!point) continue;
      doc.font("bold").fontSize(Math.min(9.5, Math.max(7.2, rowHeight / 4.4))).fillColor(tealDark).text(
        point.name,
        margin + 8,
        y + 8,
        { width: pointWidth - 16, height: rowHeight - 16, ellipsis: true },
      );
      blocks.forEach((block, index) => {
        const x = margin + pointWidth + blockWidth * index;
        drawCellText(doc, programPdfCellNames(block, point.id), x + 7, y + 7, blockWidth - 14, rowHeight - 14);
      });
    }

    doc.strokeColor(border).lineWidth(0.45).rect(margin, tableY, tableWidth, tableHeight).stroke();
    doc.strokeColor(border).lineWidth(0.35);
    for (let row = 0; row <= rows; row++) {
      const y = tableY + headerHeight + row * rowHeight;
      doc.rect(margin, y, tableWidth, 0).stroke();
    }
    doc.rect(margin + pointWidth, tableY, 0, tableHeight).stroke();
    for (let column = 1; column < blocks.length; column++) {
      const x = margin + pointWidth + blockWidth * column;
      doc.rect(x, tableY, 0, tableHeight).stroke();
    }
  }
  doc.end();
  return output;
}
