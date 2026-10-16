import "server-only";
import path from "node:path";
import { PDFDocument } from "pdfkit";
import type { ProgramView } from "../domain/program";

export function programPdfFilename(view: ProgramView) {
  const slug =
    view.snapshot.campaign.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "campana";
  return `campana-${slug}-${view.mode === "draft" ? "borrador" : `v${view.version}`}.pdf`;
}
/** Server-only, no browser, remote fonts or external rendering service. */
export async function renderProgramPdf(view: ProgramView): Promise<Buffer> {
  const fontRoot = path.join(
    process.cwd(),
    "src/modules/campaigns/assets/fonts",
  );
  const regular = path.join(fontRoot, "NotoSans-Regular.ttf");
  const status =
    view.mode === "draft"
      ? "BORRADOR — NO DISTRIBUIR"
      : `Publicado · v${view.version} · ${view.publishedAt}`;
  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margin: 28,
    autoFirstPage: false,
    bufferPages: true,
    font: regular,
    info: {
      Title: view.snapshot.campaign.name,
      Author: "D-Territorio",
      Subject: status,
      ...(view.publishedAt
        ? {
            CreationDate: new Date(view.publishedAt),
            ModDate: new Date(view.publishedAt),
          }
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
    ? view.snapshot.days
    : [
        {
          id: "empty",
          date: "Sin días activos",
          label: "",
          points: [],
          blocks: [],
        },
      ];
  const footerContexts: string[] = [];
  for (const day of days) {
    // Up to four points per group keeps names at 11pt even with eight points.
    const groups = Array.from(
      { length: Math.max(1, Math.ceil(day.points.length / 4)) },
      (_, i) => day.points.slice(i * 4, i * 4 + 4),
    );
    for (const [index, points] of groups.entries()) {
      let y = 0;
      const margin = 28,
        hourWidth = 110,
        pad = 7;
      let pointWidth = 0;
      const text = (
        value: string,
        x: number,
        top: number,
        width: number,
        size = 11,
        bold = false,
      ) =>
        doc
          .font(bold ? "bold" : "regular")
          .fontSize(size)
          .fillColor("#111111")
          .text(value, x, top, { width, lineGap: 2 });
      const measure = (value: string, width: number, bold = false, size = 11) =>
        doc
          .font(bold ? "bold" : "regular")
          .fontSize(size)
          .heightOfString(value, { width, lineGap: 2 });
      function page() {
        doc.addPage();
        pointWidth =
          (doc.page.width - 2 * margin - hourWidth) /
          Math.max(points.length, 1);
        y = margin;
        const titleHeight = measure(
          view.snapshot.campaign.name,
          doc.page.width - 2 * margin,
          true,
          18,
        );
        text(
          view.snapshot.campaign.name,
          margin,
          y,
          doc.page.width - 2 * margin,
          18,
          true,
        );
        y += titleHeight + 5;
        const context = `${view.snapshot.campaign.locationName} · ${day.date} ${day.label}`;
        const contextHeight = measure(context, doc.page.width - 2 * margin);
        text(context, margin, y, doc.page.width - 2 * margin);
        y += contextHeight + 5;
        if (view.snapshot.campaign.locationDetails) {
          const detail = view.snapshot.campaign.locationDetails;
          text(detail, margin, y, doc.page.width - 2 * margin);
          y += measure(detail, doc.page.width - 2 * margin) + 5;
        }
        text(status, margin, y, doc.page.width - 2 * margin, 13, true);
        y += 26;
        text(
          `Grupo de puntos ${index + 1}/${groups.length} · Posiciones 1 y 2`,
          margin,
          y,
          doc.page.width - 2 * margin,
        );
        y += 24;
        const headerHeight = Math.max(
          30,
          ...points.map(
            (p) => measure(p.name, pointWidth - 2 * pad, true) + 2 * pad,
          ),
        );
        doc
          .strokeColor("#555555")
          .lineWidth(0.6)
          .rect(margin, y, hourWidth, headerHeight)
          .stroke();
        text(
          "Hora / bloque",
          margin + pad,
          y + pad,
          hourWidth - 2 * pad,
          11,
          true,
        );
        points.forEach((point, i) => {
          const x = margin + hourWidth + i * pointWidth;
          doc.rect(x, y, pointWidth, headerHeight).stroke();
          text(point.name, x + pad, y + pad, pointWidth - 2 * pad, 11, true);
        });
        y += headerHeight;
        footerContexts.push(
          `${day.date} · Grupo ${index + 1}/${groups.length}`,
        );
      }
      page();
      for (const block of day.blocks) {
        const hour = `${block.startTime}–${block.endTime}\n${block.label}`;
        const values = points.map((p) => {
          const cell = block.cells.find((c) => c.pointId === p.id)!;
          return !cell.active
            ? "No activo"
            : cell.slots
                .map(
                  (person, slot) =>
                    `${slot + 1}. ${person?.fullName ?? "Pendiente"}${person?.congregation ? `\n${person.congregation}` : ""}`,
                )
                .join("\n\n");
        });
        const height = Math.max(
          45,
          measure(hour, hourWidth - 2 * pad) + 2 * pad,
          ...values.map((v) => measure(v, pointWidth - 2 * pad) + 2 * pad),
        );
        if (y + height > doc.page.height - 50) page();
        // Dynamic height and row-level page breaks prevent clipped names.
        doc.rect(margin, y, hourWidth, height).stroke();
        text(hour, margin + pad, y + pad, hourWidth - 2 * pad);
        values.forEach((value, i) => {
          const x = margin + hourWidth + i * pointWidth;
          doc.rect(x, y, pointWidth, height).stroke();
          text(value, x + pad, y + pad, pointWidth - 2 * pad);
        });
        y += height;
      }
      if (!day.blocks.length)
        text(
          "No hay bloques activos.",
          margin,
          y + 12,
          doc.page.width - 2 * margin,
        );
    }
  }
  const { count } = doc.bufferedPageRange();
  for (let i = 0; i < count; i++) {
    doc.switchToPage(i);
    doc
      .font("regular")
      .fontSize(9)
      .text(
        `${status} · ${footerContexts[i]} · Página ${i + 1}/${count}`,
        28,
        doc.page.height - 42,
        { width: doc.page.width - 56, lineGap: 0 },
      );
  }
  doc.end();
  return output;
}
