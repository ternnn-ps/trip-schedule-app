import { Trip, TripPlanItem } from "@/types/trip";

const pdfPageWidth = 595;
const pdfPageHeight = 842;
const canvasPageWidth = 794;
const canvasPageHeight = 1123;
const renderScale = 2;
const pageMargin = 54;
const bottomMargin = 58;
const fontStack = '"Noto Sans Thai", "Tahoma", "Arial", sans-serif';
const encoder = new TextEncoder();

type ReportPage = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  links: PdfLink[];
};

type PdfLink = {
  x: number;
  y: number;
  width: number;
  height: number;
  url: string;
};

function safeText(value?: string) {
  return value?.replace(/\r\n?/g, "\n").trim() || "";
}

function inlineText(value?: string) {
  return safeText(value).replace(/\s+/g, " ").trim();
}

function makeFileName(value: string) {
  const fileName = safeText(value)
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/(^-|-$)/g, "");

  return `${fileName || "trip"}-report.pdf`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function setFont(ctx: CanvasRenderingContext2D, size: number, weight = 500) {
  ctx.font = `${weight} ${size}px ${fontStack}`;
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options: {
    size?: number;
    weight?: number;
    color?: string;
    align?: CanvasTextAlign;
  } = {},
) {
  setFont(ctx, options.size ?? 14, options.weight ?? 500);
  ctx.fillStyle = options.color ?? "#111827";
  ctx.textAlign = options.align ?? "left";
  ctx.textBaseline = "top";
  ctx.fillText(inlineText(text), x, y);
}

function textWidth(ctx: CanvasRenderingContext2D, text: string, size: number, weight = 500) {
  setFont(ctx, size, weight);
  return ctx.measureText(inlineText(text)).width;
}

function segmentText(text: string) {
  if (text.includes(" ")) {
    return text.split(/(\s+)/).filter(Boolean);
  }

  return Array.from(text);
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  size: number,
  weight = 500,
) {
  setFont(ctx, size, weight);
  const lines: string[] = [];
  const paragraphs = safeText(text).split("\n");

  paragraphs.forEach((paragraph) => {
    if (!paragraph.trim()) {
      lines.push("");
      return;
    }

    const segments = segmentText(paragraph);
    let currentLine = "";

    segments.forEach((segment) => {
      const nextLine = currentLine + segment;

      if (ctx.measureText(nextLine).width > maxWidth && currentLine.trim()) {
        lines.push(currentLine.trimEnd());
        currentLine = segment.trimStart();
        return;
      }

      currentLine = nextLine;
    });

    if (currentLine.trim()) {
      lines.push(currentLine.trimEnd());
    }
  });

  return lines.length > 0 ? lines : [""];
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  options: {
    size?: number;
    weight?: number;
    color?: string;
    maxLines?: number;
  } = {},
) {
  const size = options.size ?? 14;
  const weight = options.weight ?? 500;
  const lines = wrapLines(ctx, text, maxWidth, size, weight);
  const visibleLines = options.maxLines ? lines.slice(0, options.maxLines) : lines;

  visibleLines.forEach((line, index) => {
    const isLastLine = options.maxLines && index === visibleLines.length - 1 && lines.length > visibleLines.length;
    drawText(ctx, isLastLine ? `${line.replace(/[.\s]+$/, "")}...` : line, x, y + index * lineHeight, {
      size,
      weight,
      color: options.color,
    });
  });

  return visibleLines.length * lineHeight;
}

class ReportRenderer {
  private pages: ReportPage[] = [];
  private y = pageMargin;

  constructor(private trip: Trip) {
    this.newPage();
    this.drawCoverHeader();
  }

  getPages() {
    this.drawFooter();
    return this.pages;
  }

  section(title: string) {
    this.ensureSpace(56);
    this.ctx.fillStyle = "#2563eb";
    roundRect(this.ctx, pageMargin, this.y + 7, 5, 23, 3);
    this.ctx.fill();
    drawText(this.ctx, title, pageMargin + 16, this.y, {
      size: 19,
      weight: 800,
      color: "#0f172a",
    });
    this.y += 39;
  }

  summaryCard(title: string, body: string) {
    const lines = wrapLines(this.ctx, body, canvasPageWidth - pageMargin * 2 - 28, 14, 500);
    const height = 50 + lines.length * 20;
    this.ensureSpace(height + 12);
    this.card(pageMargin, this.y, canvasPageWidth - pageMargin * 2, height);
    drawText(this.ctx, title, pageMargin + 18, this.y + 16, {
      size: 12,
      weight: 800,
      color: "#2563eb",
    });
    drawWrappedText(this.ctx, body, pageMargin + 18, this.y + 35, canvasPageWidth - pageMargin * 2 - 36, 20, {
      size: 14,
      color: "#334155",
    });
    this.y += height + 12;
  }

  dayHeader(day: string, planCount: number) {
    this.ensureSpace(46);
    drawText(this.ctx, day, pageMargin, this.y, {
      size: 15,
      weight: 900,
      color: "#0f172a",
    });
    drawText(this.ctx, `${planCount} ${planCount === 1 ? "stop" : "stops"}`, canvasPageWidth - pageMargin, this.y + 3, {
      size: 11,
      weight: 800,
      color: "#64748b",
      align: "right",
    });
    this.ctx.strokeStyle = "#dbe4ee";
    this.ctx.beginPath();
    this.ctx.moveTo(pageMargin, this.y + 28);
    this.ctx.lineTo(canvasPageWidth - pageMargin, this.y + 28);
    this.ctx.stroke();
    this.y += 40;
  }

  planCard(plan: TripPlanItem, index: number) {
    const width = canvasPageWidth - pageMargin * 2;
    const contentX = pageMargin + 102;
    const contentWidth = width - 122;
    const titleHeight = Math.min(wrapLines(this.ctx, plan.place, contentWidth - (plan.completed ? 86 : 0), 17, 900).length, 2) * 22;
    const detailHeight = wrapLines(this.ctx, plan.detail, contentWidth, 14, 500).length * 20;
    const hasMapLine = Boolean(plan.latitude || plan.longitude || plan.googleMapUrl);
    const height = 30 + titleHeight + 11 + detailHeight + (hasMapLine ? 31 : 0) + 19;
    const accent = plan.completed ? "#94a3b8" : "#2563eb";

    this.ensureSpace(height + 14);
    this.card(pageMargin, this.y, width, height);

    this.ctx.fillStyle = accent;
    roundRect(this.ctx, pageMargin, this.y, 5, height, 5);
    this.ctx.fill();

    drawText(this.ctx, plan.time || "--:--", pageMargin + 20, this.y + 20, {
      size: 15,
      weight: 900,
      color: accent,
    });
    drawText(this.ctx, `STOP ${index + 1}`, pageMargin + 20, this.y + 43, {
      size: 10,
      weight: 800,
      color: "#64748b",
    });
    drawWrappedText(this.ctx, plan.place, contentX, this.y + 19, contentWidth - (plan.completed ? 86 : 0), 22, {
      size: 17,
      weight: 900,
      color: "#0f172a",
      maxLines: 2,
    });
    if (plan.completed) {
      this.statusPill(contentX + contentWidth - 74, this.y + 20, "DONE");
    }
    drawWrappedText(this.ctx, plan.detail, contentX, this.y + 19 + titleHeight + 11, contentWidth, 20, {
      size: 14,
      color: plan.completed ? "#64748b" : "#334155",
    });

    if (hasMapLine) {
      const lineY = this.y + height - 31;
      let linkX = contentX;

      if (plan.latitude || plan.longitude) {
        const mapText = "Pinned location";
        drawText(this.ctx, mapText, contentX, lineY, {
          size: 12,
          weight: 700,
          color: "#64748b",
        });
        linkX += textWidth(this.ctx, mapText, 12, 700) + 18;
      }

      if (plan.googleMapUrl) {
        const linkLabel = "View on Google Maps";
        drawText(this.ctx, linkLabel, linkX, lineY, {
          size: 12,
          weight: 800,
          color: "#2563eb",
        });
        this.addLink(linkX, lineY - 2, textWidth(this.ctx, linkLabel, 12, 800), 18, plan.googleMapUrl);
      }
    }

    this.y += height + 14;
  }

  private statusPill(x: number, y: number, label: string) {
    this.ctx.fillStyle = "#ecfdf5";
    roundRect(this.ctx, x, y, 74, 22, 11);
    this.ctx.fill();
    drawText(this.ctx, label, x + 37, y + 5, {
      size: 10,
      weight: 900,
      color: "#047857",
      align: "center",
    });
  }

  private get ctx() {
    return this.pages[this.pages.length - 1].ctx;
  }

  private newPage() {
    if (this.pages.length > 0) {
      this.drawFooter();
    }

    const canvas = document.createElement("canvas");
    canvas.width = canvasPageWidth * renderScale;
    canvas.height = canvasPageHeight * renderScale;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Could not create PDF canvas.");
    }

    ctx.scale(renderScale, renderScale);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasPageWidth, canvasPageHeight);
    this.pages.push({ canvas, ctx, links: [] });
    this.y = pageMargin;

    if (this.pages.length > 1) {
      drawText(ctx, this.trip.name, pageMargin, 32, {
        size: 13,
        weight: 800,
        color: "#64748b",
      });
      this.y = 72;
    }
  }

  private drawCoverHeader() {
    const width = canvasPageWidth - pageMargin * 2;
    this.ctx.fillStyle = "#f8fafc";
    roundRect(this.ctx, pageMargin, pageMargin, width, 184, 12);
    this.ctx.fill();
    this.ctx.fillStyle = "#2563eb";
    roundRect(this.ctx, pageMargin, pageMargin, 7, 184, 6);
    this.ctx.fill();

    drawText(this.ctx, "TRIP REPORT", pageMargin + 28, pageMargin + 23, {
      size: 11,
      weight: 900,
      color: "#2563eb",
    });
    drawWrappedText(this.ctx, this.trip.name, pageMargin + 28, pageMargin + 46, width - 56, 32, {
      size: 27,
      weight: 900,
      color: "#0f172a",
      maxLines: 2,
    });
    drawWrappedText(this.ctx, this.trip.destination, pageMargin + 28, pageMargin + 114, width - 56, 21, {
      size: 15,
      weight: 700,
      color: "#475569",
      maxLines: 2,
    });
    this.infoPill(pageMargin + 28, pageMargin + 145, this.trip.dateRange || "Date not set", "#dbeafe", "#1d4ed8");
    const planLabel = `${this.trip.plans.length} ${this.trip.plans.length === 1 ? "stop" : "stops"}`;
    const dateWidth = Math.min(textWidth(this.ctx, this.trip.dateRange || "Date not set", 11, 800) + 30, 258);
    this.infoPill(pageMargin + 42 + dateWidth, pageMargin + 145, planLabel, "#dcfce7", "#15803d");

    this.y = 254;
  }

  private infoPill(x: number, y: number, label: string, background: string, color: string) {
    const width = Math.min(textWidth(this.ctx, label, 11, 800) + 30, 258);
    this.ctx.fillStyle = background;
    roundRect(this.ctx, x, y, width, 26, 13);
    this.ctx.fill();
    drawText(this.ctx, label, x + 15, y + 7, {
      size: 11,
      weight: 800,
      color,
    });
  }

  private card(x: number, y: number, width: number, height: number) {
    this.ctx.fillStyle = "#ffffff";
    roundRect(this.ctx, x, y, width, height, 10);
    this.ctx.fill();

    this.ctx.strokeStyle = "#e2e8f0";
    this.ctx.lineWidth = 1;
    roundRect(this.ctx, x, y, width, height, 10);
    this.ctx.stroke();
  }

  private ensureSpace(height: number) {
    if (this.y + height > canvasPageHeight - bottomMargin) {
      this.newPage();
    }
  }

  private drawFooter() {
    const pageNumber = this.pages.length;
    const ctx = this.ctx;

    ctx.strokeStyle = "#e2e8f0";
    ctx.beginPath();
    ctx.moveTo(pageMargin, canvasPageHeight - 42);
    ctx.lineTo(canvasPageWidth - pageMargin, canvasPageHeight - 42);
    ctx.stroke();

    drawText(ctx, `Travel App Report | Page ${pageNumber}`, pageMargin, canvasPageHeight - 31, {
      size: 11,
      weight: 700,
      color: "#94a3b8",
    });
  }

  private addLink(x: number, y: number, width: number, height: number, url: string) {
    this.pages[this.pages.length - 1].links.push({
      x,
      y,
      width,
      height,
      url,
    });
  }
}

function renderTripReport(trip: Trip) {
  const renderer = new ReportRenderer(trip);

  if (trip.notes.trim()) {
    renderer.summaryCard("Notes", trip.notes);
  }

  renderer.summaryCard(
    "Trip Users",
    trip.allUsers ? "All users can view and edit this trip." : trip.users.length > 0 ? trip.users.join(", ") : "No users assigned.",
  );
  renderer.section("Itinerary");

  if (trip.plans.length === 0) {
    renderer.summaryCard("No plans yet", "Add itinerary stops to include them in this report.");
  } else {
    const plansByDay = new Map<string, TripPlanItem[]>();

    trip.plans.forEach((plan) => {
      const day = safeText(plan.day) || "Unscheduled";
      const plans = plansByDay.get(day) ?? [];
      plans.push(plan);
      plansByDay.set(day, plans);
    });

    [...plansByDay.entries()]
      .sort(([firstDay], [secondDay]) => firstDay.localeCompare(secondDay, undefined, { numeric: true, sensitivity: "base" }))
      .forEach(([day, plans]) => {
        const sortedPlans = [...plans].sort((firstPlan, secondPlan) => firstPlan.time.localeCompare(secondPlan.time));
        renderer.dayHeader(day, sortedPlans.length);
        sortedPlans.forEach((plan, index) => renderer.planCard(plan, index));
      });
  }

  return renderer.getPages();
}

function dataUrlToBytes(dataUrl: string) {
  const base64 = dataUrl.split(",")[1] ?? "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function appendBytes(target: number[], bytes: Uint8Array) {
  bytes.forEach((byte) => target.push(byte));
}

function appendAscii(target: number[], value: string) {
  appendBytes(target, encoder.encode(value));
}

function escapePdfString(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function toPdfRect(link: PdfLink) {
  const x1 = (link.x / canvasPageWidth) * pdfPageWidth;
  const x2 = ((link.x + link.width) / canvasPageWidth) * pdfPageWidth;
  const y1 = pdfPageHeight - ((link.y + link.height) / canvasPageHeight) * pdfPageHeight;
  const y2 = pdfPageHeight - (link.y / canvasPageHeight) * pdfPageHeight;

  return [x1, y1, x2, y2].map((value) => value.toFixed(2)).join(" ");
}

function buildPdfFromPages(pages: ReportPage[]) {
  const images = pages.map((page) => dataUrlToBytes(page.canvas.toDataURL("image/jpeg", 0.92)));
  const chunks: number[] = [];
  const offsets = [0];
  const objects: Array<Array<string | Uint8Array>> = [];
  const pageIds: number[] = [];

  function reserveObject() {
    objects.push([]);
    return objects.length;
  }

  function setObject(id: number, parts: Array<string | Uint8Array>) {
    objects[id - 1] = parts;
  }

  function addObject(parts: Array<string | Uint8Array>) {
    objects.push(parts);
    return objects.length;
  }

  function writeObject(id: number, parts: Array<string | Uint8Array>) {
    offsets[id] = chunks.length;
    appendAscii(chunks, `${id} 0 obj\n`);
    parts.forEach((part) => {
      if (typeof part === "string") {
        appendAscii(chunks, part);
      } else {
        appendBytes(chunks, part);
      }
    });
    appendAscii(chunks, "\nendobj\n");
  }

  const catalogId = addObject(["<< /Type /Catalog /Pages 2 0 R >>"]);
  const pagesId = reserveObject();

  images.forEach((imageBytes, index) => {
    const imageId = addObject([
      `<< /Type /XObject /Subtype /Image /Width ${canvasPageWidth * renderScale} /Height ${canvasPageHeight * renderScale} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`,
      imageBytes,
      "\nendstream",
    ]);
    const imageName = `Im${index + 1}`;
    const content = `q ${pdfPageWidth} 0 0 ${pdfPageHeight} 0 0 cm /${imageName} Do Q`;
    const contentId = addObject([
      `<< /Length ${encoder.encode(content).length} >>\nstream\n${content}\nendstream`,
    ]);

    const annotationIds = pages[index].links.map((link) =>
      addObject([
        `<< /Type /Annot /Subtype /Link /Rect [${toPdfRect(link)}] /Border [0 0 0] /A << /S /URI /URI (${escapePdfString(link.url)}) >> >>`,
      ]),
    );
    const annotations = annotationIds.length > 0 ? ` /Annots [${annotationIds.map((id) => `${id} 0 R`).join(" ")}]` : "";
    const pageId = addObject([
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pdfPageWidth} ${pdfPageHeight}] /Resources << /XObject << /${imageName} ${imageId} 0 R >> >> /Contents ${contentId} 0 R${annotations} >>`,
    ]);
    pageIds.push(pageId);
  });

  setObject(pagesId, [`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`]);

  appendAscii(chunks, "%PDF-1.4\n");
  objects.forEach((parts, index) => writeObject(index + 1, parts));

  const xrefOffset = chunks.length;
  appendAscii(chunks, `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);

  for (let id = 1; id <= objects.length; id += 1) {
    appendAscii(chunks, `${String(offsets[id]).padStart(10, "0")} 00000 n \n`);
  }

  appendAscii(chunks, `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return new Uint8Array(chunks);
}

export async function downloadTripReport(trip: Trip) {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const pages = renderTripReport(trip);
  const pdf = buildPdfFromPages(pages);
  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = makeFileName(trip.name);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
