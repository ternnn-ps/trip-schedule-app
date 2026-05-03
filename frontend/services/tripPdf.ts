import { Trip } from "@/types/trip";

type PdfLine = {
  text: string;
  size?: number;
  gap?: number;
};

const pageWidth = 595;
const pageHeight = 842;
const marginX = 48;
const topY = 792;
const bottomY = 56;

function cleanText(value: string) {
  return value
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "?")
    .replace(/\s+/g, " ")
    .trim();
}

function escapePdfText(value: string) {
  return cleanText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapText(text: string, maxChars: number) {
  const words = cleanText(text).split(" ").filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (nextLine.length > maxChars && currentLine) {
      lines.push(currentLine);
      currentLine = word;
      return;
    }

    currentLine = nextLine;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [""];
}

function buildLines(trip: Trip) {
  const lines: PdfLine[] = [
    { text: trip.name, size: 22, gap: 22 },
    { text: `${trip.destination} - ${trip.dateRange}`, size: 12, gap: 18 },
  ];

  if (trip.notes.trim()) {
    lines.push({ text: "Notes", size: 15, gap: 16 });
    wrapText(trip.notes, 82).forEach((line) => lines.push({ text: line, size: 11, gap: 13 }));
    lines.push({ text: "", gap: 10 });
  }

  lines.push({ text: "Trip Users", size: 15, gap: 16 });
  lines.push({
    text: trip.allUsers ? "All users" : trip.users.length > 0 ? trip.users.join(", ") : "No users assigned",
    size: 11,
    gap: 18,
  });
  lines.push({ text: "Itinerary", size: 15, gap: 18 });

  if (trip.plans.length === 0) {
    lines.push({ text: "No plans yet.", size: 11, gap: 14 });
    return lines;
  }

  trip.plans.forEach((plan, index) => {
    lines.push({
      text: `${index + 1}. ${plan.day} ${plan.time} - ${plan.place}`,
      size: 13,
      gap: 16,
    });
    wrapText(plan.detail, 86).forEach((line) => lines.push({ text: line, size: 11, gap: 13 }));

    if (plan.latitude && plan.longitude) {
      lines.push({ text: `Map: ${plan.latitude}, ${plan.longitude}`, size: 10, gap: 12 });
    }

    if (plan.googleMapUrl) {
      wrapText(`Google Maps: ${plan.googleMapUrl}`, 86).forEach((line) => {
        lines.push({ text: line, size: 10, gap: 12 });
      });
    }

    lines.push({ text: "", gap: 8 });
  });

  return lines;
}

function createContent(lines: PdfLine[]) {
  const pages: string[][] = [[]];
  let y = topY;

  lines.forEach((line) => {
    const gap = line.gap ?? 14;

    if (y - gap < bottomY) {
      pages.push([]);
      y = topY;
    }

    if (line.text) {
      const size = line.size ?? 11;
      pages[pages.length - 1].push(`BT /F1 ${size} Tf 1 0 0 1 ${marginX} ${y} Tm (${escapePdfText(line.text)}) Tj ET`);
    }

    y -= gap;
  });

  return pages.map((page) => page.join("\n"));
}

function buildPdf(contents: string[]) {
  const objects: string[] = [];
  const addObject = (value: string) => {
    objects.push(value);
    return objects.length;
  };

  const catalogId = addObject("<< /Type /Catalog /Pages 2 0 R >>");
  const pagesId = addObject("");
  const fontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const pageIds: number[] = [];

  contents.forEach((content) => {
    const contentId = addObject(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    const pageId = addObject(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
    pageIds.push(pageId);
  });

  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return pdf;
}

function makeFileName(value: string) {
  return `${cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "trip"}-report.pdf`;
}

export function downloadTripReport(trip: Trip) {
  const pdf = buildPdf(createContent(buildLines(trip)));
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
