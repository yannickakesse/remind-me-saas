import { DateTime } from "luxon";

export interface CalendarPdfEvent {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status: string;
  activityName: string;
  activityColor: string;
  is_scheduled_expense?: boolean;
  amount?: number;
  currency?: string;
  notes?: string | null;
  hasConflict?: boolean;
}

export interface CalendarPdfActivity {
  id: string;
  name: string;
  color: string;
}

export interface CalendarPdfOptions {
  anchorDate: string; // ISO date YYYY-MM-DD
  timezone: string;
  locale?: string; // fr, en, es, de, pt...
  user: {
    fullName: string | null;
    email?: string | null;
    planName?: string;
  };
  orientation?: "landscape" | "portrait";
  events: CalendarPdfEvent[];
  activities?: CalendarPdfActivity[];
  documentRef?: string;
}

// Convert Hex string to RGB [0..1]
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const num = parseInt(clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean, 16);
  if (isNaN(num)) return [0.2, 0.2, 0.2];
  return [((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255];
}

// WinAnsi (Windows-1252) character mapping for standard PDF Helvetica
function encodeWinAnsi(text: string): string {
  const map: Record<string, string> = {
    é: "\\351", è: "\\350", ê: "\\352", ë: "\\353",
    à: "\\340", â: "\\342", ä: "\\344",
    î: "\\356", ï: "\\357",
    ô: "\\364", ö: "\\366",
    ù: "\\371", û: "\\373", ü: "\\374",
    ç: "\\347",
    É: "\\311", È: "\\310", Ê: "\\312",
    À: "\\300", Â: "\\302",
    Î: "\\316",
    Ô: "\\324",
    Ù: "\\331",
    Ç: "\\307",
    œ: "oe", Œ: "OE",
    "€": "\\200",
    "•": "\\225",
    "–": "\\226",
    "—": "\\227",
    "’": "'",
    "‘": "'",
    "“": '"',
    "”": '"',
    "«": "\\253",
    "»": "\\273",
    "°": "\\260",
    "ñ": "\\361", "Ñ": "\\321",
    "ß": "\\337",
    "á": "\\341", "í": "\\355", "ó": "\\363", "ú": "\\372",
    "ã": "\\343", "õ": "\\365",
    "Á": "\\301", "Í": "\\315", "Ó": "\\323", "Ú": "\\332",
  };

  let out = "";
  for (let i = 0; i < text.length; i++) {
    const char = text.charAt(i);
    if (char === "(") out += "\\(";
    else if (char === ")") out += "\\)";
    else if (char === "\\") out += "\\\\";
    else if (char in map) out += map[char]!;
    else if (char.charCodeAt(0) < 128) out += char;
    else out += " ";
  }
  return out;
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + "…";
}

/**
 * Low-level PDF-1.4 Document Assembler
 */
class PdfDocument {
  private pageStreams: string[] = [];
  private currentStream = "";
  public readonly width: number;
  public readonly height: number;

  constructor(public readonly isLandscape: boolean) {
    // Exact A4 dimensions in typographic points (1 mm = 72/25.4 pt)
    // Landscape: 297 mm x 210 mm = 841.89 pt x 595.28 pt
    // Portrait:  210 mm x 297 mm = 595.28 pt x 841.89 pt
    if (isLandscape) {
      this.width = 841.89;
      this.height = 595.28;
    } else {
      this.width = 595.28;
      this.height = 841.89;
    }
  }

  addPage() {
    this.pageStreams.push(this.currentStream);
    this.currentStream = "";
  }

  // Convert top-relative Y to PDF coordinate Y (0 is bottom of page)
  toPdfY(yFromTop: number): number {
    return this.height - yFromTop;
  }

  drawRect(
    x: number,
    yFromTop: number,
    w: number,
    h: number,
    fillHex?: string,
    strokeHex?: string,
    strokeWidth = 1
  ) {
    const pdfY = this.toPdfY(yFromTop) - h;
    let s = "q\n";
    if (strokeHex) {
      const [r, g, b] = hexToRgb(strokeHex);
      s += `${strokeWidth.toFixed(2)} w\n${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG\n`;
    }
    if (fillHex) {
      const [r, g, b] = hexToRgb(fillHex);
      s += `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg\n`;
    }
    s += `${x.toFixed(2)} ${pdfY.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re\n`;
    if (fillHex && strokeHex) {
      s += "B\n";
    } else if (fillHex) {
      s += "f\n";
    } else if (strokeHex) {
      s += "S\n";
    }
    s += "Q\n";
    this.currentStream += s;
  }

  drawLine(
    x1: number,
    y1FromTop: number,
    x2: number,
    y2FromTop: number,
    strokeHex = "#CBD5E1",
    lineWidth = 1
  ) {
    const pdfY1 = this.toPdfY(y1FromTop);
    const pdfY2 = this.toPdfY(y2FromTop);
    const [r, g, b] = hexToRgb(strokeHex);
    let s = "q\n";
    s += `${lineWidth.toFixed(2)} w\n${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG\n`;
    s += `${x1.toFixed(2)} ${pdfY1.toFixed(2)} m ${x2.toFixed(2)} ${pdfY2.toFixed(2)} l S\n`;
    s += "Q\n";
    this.currentStream += s;
  }

  drawText(
    text: string,
    x: number,
    yFromTop: number,
    font: "F1" | "F2" | "F3" = "F1",
    fontSize = 10,
    hexColor = "#0F172A"
  ) {
    const pdfY = this.toPdfY(yFromTop) - fontSize * 0.82;
    const [r, g, b] = hexToRgb(hexColor);
    const encoded = encodeWinAnsi(text);
    let s = "BT\n";
    s += `/${font} ${fontSize} Tf\n`;
    s += `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg\n`;
    s += `1 0 0 1 ${x.toFixed(2)} ${pdfY.toFixed(2)} Tm\n`;
    s += `(${encoded}) Tj\n`;
    s += "ET\n";
    this.currentStream += s;
  }

  build(): Buffer {
    if (this.currentStream.length > 0 || this.pageStreams.length === 0) {
      this.pageStreams.push(this.currentStream);
      this.currentStream = "";
    }

    const objects: string[] = [];
    const addObject = (content: string) => {
      objects.push(content);
      return objects.length;
    };

    // Obj 1: Catalog
    // Obj 2: Pages
    const catalogId = addObject("<< /Type /Catalog /Pages 2 0 R >>");
    objects.push(""); // Obj 2 placeholder

    // Standard 14 PDF Fonts (no external assets needed)
    const f1Id = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
    const f2Id = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
    const f3Id = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>");

    const pageObjIds: number[] = [];

    for (const streamContent of this.pageStreams) {
      const streamLen = Buffer.byteLength(streamContent, "latin1");
      const streamObjId = addObject(
        `<< /Length ${streamLen} >>\nstream\n${streamContent}\nendstream`
      );

      const pageObjId = addObject(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.width.toFixed(2)} ${this.height.toFixed(2)}] /Resources << /Font << /F1 ${f1Id} 0 R /F2 ${f2Id} 0 R /F3 ${f3Id} 0 R >> >> /Contents ${streamObjId} 0 R >>`
      );
      pageObjIds.push(pageObjId);
    }

    // Obj 2: Pages dictionary
    const kidsStr = pageObjIds.map((id) => `${id} 0 R`).join(" ");
    objects[1] = `<< /Type /Pages /Kids [${kidsStr}] /Count ${pageObjIds.length} >>`;

    // Final Assembly with exact byte offsets
    let output = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
    const xrefOffsets: number[] = [0];

    for (let i = 0; i < objects.length; i++) {
      xrefOffsets.push(Buffer.byteLength(output, "latin1"));
      const objContent = objects[i] ?? "";
      output += `${i + 1} 0 obj\n${objContent}\nendobj\n`;
    }

    const startXref = Buffer.byteLength(output, "latin1");
    output += `xref\n0 ${objects.length + 1}\n`;
    output += "0000000000 65535 f \n";
    for (let i = 1; i <= objects.length; i++) {
      const offset = xrefOffsets[i] ?? 0;
      output += `${offset.toString().padStart(10, "0")} 00000 n \n`;
    }

    output += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;

    return Buffer.from(output, "latin1");
  }
}

/**
 * Generate a complete, elegant, professional Remind Me Calendar PDF formatted for A4.
 */
export function generateCalendarPdf(options: CalendarPdfOptions): Buffer {
  const isLandscape = options.orientation !== "portrait";
  const doc = new PdfDocument(isLandscape);

  const timezone = options.timezone || "Europe/Paris";
  const locale = options.locale || "fr";
  const anchor = DateTime.fromISO(options.anchorDate, { zone: timezone });
  const validAnchor = anchor.isValid ? anchor : DateTime.now().setZone(timezone);

  const currentMonthDt = validAnchor.startOf("month");
  const monthLabel = currentMonthDt.setLocale(locale).toFormat("LLLL yyyy").toUpperCase();
  const generatedAt = DateTime.now().setZone(timezone).setLocale(locale).toFormat("dd/MM/yyyy HH:mm");

  const docHash = options.documentRef
    ? options.documentRef
    : `RM-CAL-${currentMonthDt.toFormat("yyyyMM")}-${Math.abs(
        (options.user.email || "user").split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
      ).toString(36).toUpperCase().padStart(4, "0")}`;

  // Metrics
  const totalEvents = options.events.length;
  let totalHours = 0;
  for (const ev of options.events) {
    if (!ev.is_scheduled_expense) {
      const s = DateTime.fromISO(ev.starts_at, { zone: timezone });
      const e = DateTime.fromISO(ev.ends_at, { zone: timezone });
      if (s.isValid && e.isValid && e > s) {
        totalHours += e.diff(s, "hours").hours;
      }
    }
  }

  // --- PAGE 1: CALENDAR GRID ---
  doc.drawRect(0, 0, doc.width, doc.height, "#FFFFFF");

  const marginX = isLandscape ? 28 : 22;
  const contentWidth = doc.width - marginX * 2;

  // 1. Header (y: 20 to 76)
  // Remind Me Official Vector Icon
  doc.drawRect(marginX, 20, 36, 36, "#131B2E", "#D97706", 1);
  // Geometric inner arcs/dots mimicking Remind Me logo
  doc.drawRect(marginX + 8, 20 + 8, 20, 20, "#1E293B");
  doc.drawRect(marginX + 10, 20 + 10, 6, 6, "#F59E0B");
  doc.drawRect(marginX + 20, 20 + 10, 6, 6, "#D97706");
  doc.drawRect(marginX + 15, 20 + 20, 6, 6, "#E5A91E");

  // Remind Me Branding text
  doc.drawText("REMIND ME", marginX + 46, 23, "F2", 15, "#0F172A");
  doc.drawText("CALENDRIER & PLANNING OFFICIEL", marginX + 46, 39, "F2", 7.5, "#D97706");
  doc.drawText(
    `Titulaire : ${options.user.fullName || "Utilisateur"} • Fuseau : ${timezone}`,
    marginX + 46,
    51,
    "F1",
    7.5,
    "#64748B"
  );

  // Month Title (Right aligned block)
  const monthTitleX = contentWidth - (isLandscape ? 260 : 180) + marginX;
  doc.drawText(monthLabel, monthTitleX, 23, "F2", 16, "#0F172A");
  doc.drawText(`Réf : ${docHash}`, monthTitleX, 41, "F2", 8, "#475569");
  doc.drawText(`Émis le : ${generatedAt}`, monthTitleX, 52, "F1", 7.5, "#64748B");

  // Top Divider line
  doc.drawLine(marginX, 65, marginX + contentWidth, 65, "#CBD5E1", 1.2);

  // 2. Calendar Grid Setup
  const gridStart = currentMonthDt.startOf("month").startOf("week");
  const gridEnd = currentMonthDt.endOf("month").endOf("week");
  const todayISO = DateTime.now().setZone(timezone).toISODate();

  const days: DateTime[] = [];
  let cursor = gridStart;
  while (cursor <= gridEnd) {
    days.push(cursor);
    cursor = cursor.plus({ days: 1 });
  }

  const numWeeks = Math.ceil(days.length / 7);
  const colWidth = contentWidth / 7;
  const gridTopY = 72;
  const weekdayHeaderHeight = 16;
  const footerAndLegendHeight = isLandscape ? 45 : 55;
  const availableGridHeight = doc.height - gridTopY - footerAndLegendHeight - 15;
  const cellHeight = (availableGridHeight - weekdayHeaderHeight) / numWeeks;

  // Weekday Labels
  const sampleWeekDays = days.slice(0, 7);
  const weekdayNames = sampleWeekDays.map((d) =>
    d.setLocale(locale).toFormat("cccc").toUpperCase()
  );

  // Weekday Header Row
  doc.drawRect(marginX, gridTopY, contentWidth, weekdayHeaderHeight, "#0F172A");
  for (let c = 0; c < 7; c++) {
    const wx = marginX + c * colWidth;
    const wLabel = weekdayNames[c] || "";
    doc.drawText(
      wLabel,
      wx + colWidth / 2 - (wLabel.length * 2.4),
      gridTopY + 4,
      "F2",
      7.5,
      "#FFFFFF"
    );
  }

  // Events grouped by day (YYYY-MM-DD)
  const eventsByDay = new Map<string, CalendarPdfEvent[]>();
  for (const ev of options.events) {
    const sDt = DateTime.fromISO(ev.starts_at, { zone: timezone });
    if (sDt.isValid) {
      const iso = sDt.toISODate()!;
      if (!eventsByDay.has(iso)) eventsByDay.set(iso, []);
      eventsByDay.get(iso)!.push(ev);
    }
  }

  // Track overflow items to include in detailed appendix (Page 2)
  const overflowDays: Array<{ date: DateTime; events: CalendarPdfEvent[] }> = [];
  const maxEventsPerCell = isLandscape ? (numWeeks > 5 ? 3 : 4) : 2;

  // Draw Grid Cells
  for (let idx = 0; idx < days.length; idx++) {
    const day = days[idx];
    if (!day) continue;
    const col = idx % 7;
    const row = Math.floor(idx / 7);
    const cellX = marginX + col * colWidth;
    const cellY = gridTopY + weekdayHeaderHeight + row * cellHeight;

    const isCurrentMonth = day.month === currentMonthDt.month;
    const isToday = day.toISODate() === todayISO;
    const iso = day.toISODate()!;
    const dayEvents = (eventsByDay.get(iso) ?? []).sort((a, b) =>
      a.starts_at.localeCompare(b.starts_at)
    );

    // Background & Border
    const bgHex = isCurrentMonth ? "#FFFFFF" : "#F8FAFC";
    doc.drawRect(cellX, cellY, colWidth, cellHeight, bgHex, "#E2E8F0", 0.7);

    // Day number
    if (isToday) {
      doc.drawRect(cellX + 3, cellY + 2.5, 12, 12, "#D97706");
      doc.drawText(`${day.day}`, cellX + 5, cellY + 4.5, "F2", 7.5, "#FFFFFF");
    } else {
      doc.drawText(
        `${day.day}`,
        cellX + 4,
        cellY + 4,
        isCurrentMonth ? "F2" : "F1",
        7.5,
        isCurrentMonth ? "#0F172A" : "#94A3B8"
      );
    }

    // Render Events in Day Cell
    const visibleEvents = dayEvents.slice(0, maxEventsPerCell);
    const overflowCount = dayEvents.length - maxEventsPerCell;

    if (overflowCount > 0) {
      overflowDays.push({ date: day, events: dayEvents });
    }

    const pillHeight = isLandscape ? 12.5 : 11;
    const pillStartY = cellY + 16;

    for (let ei = 0; ei < visibleEvents.length; ei++) {
      const ev = visibleEvents[ei];
      if (!ev) continue;
      const pillY = pillStartY + ei * (pillHeight + 1.5);
      if (pillY + pillHeight > cellY + cellHeight - 2) break;

      const evColor = ev.activityColor || "#3B82F6";
      const sDt = DateTime.fromISO(ev.starts_at, { zone: timezone });
      const timeStr = sDt.isValid ? sDt.toFormat("HH:mm") : "";

      // Pill Background card
      doc.drawRect(cellX + 3, pillY, colWidth - 6, pillHeight, "#F1F5F9", "#E2E8F0", 0.5);
      // Left activity color bar
      doc.drawRect(cellX + 3, pillY, 2.5, pillHeight, evColor);

      const maxTitleChars = isLandscape ? 14 : 9;
      let label = ev.is_scheduled_expense
        ? `[Dépense] ${ev.title}`
        : `${timeStr ? timeStr + " " : ""}${ev.title}`;

      if (ev.hasConflict) {
        label = `[!] ${label}`;
      }

      doc.drawText(
        truncateText(label, maxTitleChars),
        cellX + 8,
        pillY + 2.5,
        "F2",
        5.8,
        ev.is_scheduled_expense ? "#B45309" : "#1E293B"
      );
    }

    if (overflowCount > 0) {
      const overflowY = cellY + cellHeight - 9;
      doc.drawText(
        `+${overflowCount} de plus (voir P.2)`,
        cellX + 5,
        overflowY,
        "F2",
        5.5,
        "#D97706"
      );
    }
  }

  // 3. Legend & Bottom Summary
  const bottomLegendY = doc.height - footerAndLegendHeight;
  doc.drawLine(marginX, bottomLegendY - 4, marginX + contentWidth, bottomLegendY - 4, "#CBD5E1", 0.8);

  // Activities Legend
  const userActivities = options.activities || [];
  let legendX = marginX;
  doc.drawText("Légende :", legendX, bottomLegendY + 2, "F2", 7.5, "#475569");
  legendX += 45;

  for (let ai = 0; ai < Math.min(userActivities.length, 6); ai++) {
    const act = userActivities[ai];
    if (!act) continue;
    doc.drawRect(legendX, bottomLegendY + 3, 6, 6, act.color || "#3B82F6");
    doc.drawText(truncateText(act.name, 14), legendX + 9, bottomLegendY + 2, "F1", 7, "#334155");
    legendX += 85;
  }

  // Scheduled expenses legend badge
  doc.drawRect(legendX, bottomLegendY + 3, 6, 6, "#D97706");
  doc.drawText("Dépenses programmées", legendX + 9, bottomLegendY + 2, "F1", 7, "#D97706");

  // Summary Metrics line
  const summaryLineY = bottomLegendY + 16;
  doc.drawText(
    `Séances totales : ${totalEvents} • Volume planifié : ${Math.round(totalHours)}h • Document certifié conforme Remind Me`,
    marginX,
    summaryLineY,
    "F2",
    7,
    "#0F172A"
  );

  // Page 1 Footer
  const footerY = doc.height - 14;
  doc.drawText(
    `Remind Me • Document officiel de planification A4 (${isLandscape ? "Paysage" : "Portrait"}) • Page 1/${overflowDays.length > 0 ? "2" : "1"}`,
    marginX,
    footerY,
    "F1",
    6.5,
    "#94A3B8"
  );
  doc.drawText(`Émis le ${generatedAt}`, marginX + contentWidth - 110, footerY, "F1", 6.5, "#94A3B8");

  // --- PAGE 2: DETAILED APPENDIX (If overflow exists or dense schedule) ---
  if (overflowDays.length > 0) {
    doc.addPage();
    doc.drawRect(0, 0, doc.width, doc.height, "#FFFFFF");

    // Page 2 Header
    doc.drawRect(marginX, 20, 36, 36, "#131B2E", "#D97706", 1);
    doc.drawRect(marginX + 8, 20 + 8, 20, 20, "#1E293B");
    doc.drawRect(marginX + 10, 20 + 10, 6, 6, "#F59E0B");
    doc.drawRect(marginX + 20, 20 + 10, 6, 6, "#D97706");

    doc.drawText("REMIND ME", marginX + 46, 23, "F2", 15, "#0F172A");
    doc.drawText("ANNEXE DÉTAILLÉE DU CALENDRIER", marginX + 46, 39, "F2", 7.5, "#D97706");
    doc.drawText(
      `Période : ${monthLabel} • Détail exhaustif des séances et engagements programmés`,
      marginX + 46,
      51,
      "F1",
      7.5,
      "#64748B"
    );

    doc.drawText(`Réf : ${docHash}`, contentWidth - 150 + marginX, 23, "F2", 8, "#475569");
    doc.drawText(`Page 2/2`, contentWidth - 150 + marginX, 39, "F2", 12, "#D97706");

    doc.drawLine(marginX, 65, marginX + contentWidth, 65, "#CBD5E1", 1.2);

    // Table Header
    const tTop = 75;
    doc.drawRect(marginX, tTop, contentWidth, 18, "#0F172A");
    doc.drawText("DATE & JOUR", marginX + 8, tTop + 5, "F2", 7.5, "#FFFFFF");
    doc.drawText("HORAIRES", marginX + 130, tTop + 5, "F2", 7.5, "#FFFFFF");
    doc.drawText("ACTIVITÉ / MISSION", marginX + 220, tTop + 5, "F2", 7.5, "#FFFFFF");
    doc.drawText("INTITULÉ DE LA SÉANCE & ENGAGEMENT", marginX + 370, tTop + 5, "F2", 7.5, "#FFFFFF");
    doc.drawText("STATUT", marginX + contentWidth - 70, tTop + 5, "F2", 7.5, "#FFFFFF");

    let rowY = tTop + 18;
    const rowHeight = 16;
    let rowIndex = 0;

    // Collect all events from overflow days (plus any important events)
    for (const od of overflowDays) {
      const dateFormatted = od.date.setLocale(locale).toFormat("cccc d MMMM");

      for (const ev of od.events) {
        if (rowY + rowHeight > doc.height - 35) break;

        const rowBg = rowIndex % 2 === 0 ? "#FFFFFF" : "#F8FAFC";
        doc.drawRect(marginX, rowY, contentWidth, rowHeight, rowBg, "#E2E8F0", 0.5);

        const sDt = DateTime.fromISO(ev.starts_at, { zone: timezone });
        const eDt = DateTime.fromISO(ev.ends_at, { zone: timezone });
        const timeRange = sDt.isValid && eDt.isValid
          ? `${sDt.toFormat("HH:mm")} - ${eDt.toFormat("HH:mm")}`
          : "Toute la journée";

        // Activity color bar
        doc.drawRect(marginX + 215, rowY + 3, 4, 10, ev.activityColor || "#3B82F6");

        doc.drawText(truncateText(dateFormatted, 22), marginX + 8, rowY + 4, "F2", 7, "#0F172A");
        doc.drawText(timeRange, marginX + 130, rowY + 4, "F1", 7, "#475569");
        doc.drawText(truncateText(ev.activityName || "Général", 20), marginX + 225, rowY + 4, "F2", 7, "#1E293B");
        doc.drawText(truncateText(ev.title, 55), marginX + 370, rowY + 4, "F1", 7, "#0F172A");

        const statusLabel = ev.hasConflict ? "Conflit" : ev.is_scheduled_expense ? "Prévue" : "Confirmé";
        const statusColor = ev.hasConflict ? "#E11D48" : ev.is_scheduled_expense ? "#D97706" : "#059669";
        doc.drawText(statusLabel, marginX + contentWidth - 65, rowY + 4, "F2", 7, statusColor);

        rowY += rowHeight;
        rowIndex++;
      }
    }

    // Page 2 Footer
    const footer2Y = doc.height - 14;
    doc.drawText(
      `Remind Me • Document officiel de planification A4 • Fin de l'annexe • Page 2/2`,
      marginX,
      footer2Y,
      "F1",
      6.5,
      "#94A3B8"
    );
    doc.drawText(`Émis le ${generatedAt}`, marginX + contentWidth - 110, footer2Y, "F1", 6.5, "#94A3B8");
  }

  return doc.build();
}
