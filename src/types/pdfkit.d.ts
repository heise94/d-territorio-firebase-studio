declare module "pdfkit" {
  import { Readable } from "node:stream";
  interface TextOptions {
    width?: number;
    lineGap?: number;
    align?: "left" | "center" | "right";
    height?: number;
    ellipsis?: boolean;
  }
  export class PDFDocument extends Readable {
    constructor(options?: {
      size?: string;
      layout?: string;
      margin?: number;
      autoFirstPage?: boolean;
      bufferPages?: boolean;
      font?: string;
      info?: Record<string, string | Date>;
    });
    page: { width: number; height: number };
    addPage(): this;
    registerFont(name: string, path: string): this;
    font(name: string): this;
    fontSize(size: number): this;
    fillColor(color: string): this;
    strokeColor(color: string): this;
    lineWidth(width: number): this;
    rect(x: number, y: number, width: number, height: number): this;
    stroke(): this;
    text(text: string, x: number, y: number, options?: TextOptions): this;
    heightOfString(text: string, options?: TextOptions): number;
    bufferedPageRange(): { start: number; count: number };
    switchToPage(page: number): this;
    end(): void;
  }
}
