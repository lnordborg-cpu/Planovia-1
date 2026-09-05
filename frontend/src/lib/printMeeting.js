// Opens a clean print window for a meeting and calls print().
// No dependencies – uses inline styled HTML.

const escapeHtml = (v) => {
  if (v === null || v === undefined) return "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const nl2br = (v) => escapeHtml(v).replace(/\n/g, "<br/>");

const bulletsFromText = (text) => {
  if (!text) return "";
  const lines = String(text)
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[\d]+[.)]\s*|^\s*[-•*]\s*/, "").trim())
    .filter(Boolean);
  if (lines.length === 0) return "";
  return `<ol>${lines.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ol>`;
};

export const printMeeting = ({ event, followups = [], klass, subject }) => {
  if (!event) return;
  const date = event.date || "";
  const title = event.title || "Utan rubrik";
  const timeRange = event.time && event.endTime ? `${event.time}–${event.endTime}` : event.time || "";
  const meta = [klass?.name, subject?.name, event.meetingType, event.location]
    .filter(Boolean)
    .map(escapeHtml)
    .join(" &middot; ");

  const followupItems = followups
    .map(
      (f) => `<li class="fu ${f.completed ? "done" : ""}">
        <span class="box">${f.completed ? "&#9745;" : "&#9744;"}</span>
        <span>${escapeHtml(f.description)}</span>
      </li>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="sv">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} · Mötesprotokoll</title>
  <style>
    :root {
      --ink: #293330;
      --muted: #5E6B65;
      --line: #DEDAD2;
      --accent: #718A7F;
      --paper: #FFFEFB;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #F6F3EE; color: var(--ink); }
    body {
      font-family: "Manrope", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      font-size: 12pt;
      line-height: 1.5;
    }
    .sheet {
      max-width: 780px;
      margin: 32px auto;
      background: var(--paper);
      padding: 44px 52px;
      border: 1px solid var(--line);
      border-radius: 4px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.05);
    }
    .kicker {
      font-size: 10pt;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      color: var(--accent);
      font-weight: 600;
      margin-bottom: 6px;
    }
    h1 {
      font-family: "Cormorant Garamond", Georgia, serif;
      font-weight: 600;
      font-size: 28pt;
      line-height: 1.15;
      margin: 0 0 4px 0;
    }
    .datestamp {
      font-size: 11pt;
      color: var(--muted);
      margin-top: 2px;
    }
    .meta {
      margin-top: 4px;
      font-size: 10.5pt;
      color: var(--muted);
    }
    h2 {
      font-family: "Cormorant Garamond", Georgia, serif;
      font-weight: 600;
      font-size: 15pt;
      color: var(--ink);
      margin: 28px 0 8px 0;
      border-bottom: 1px solid var(--line);
      padding-bottom: 4px;
    }
    p { margin: 4px 0; }
    ol, ul { margin: 6px 0 6px 20px; padding: 0; }
    li { margin: 3px 0; }
    .participants {
      font-size: 11pt;
      color: var(--ink);
      background: #F6F3EE;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 10px 14px;
      margin-top: 6px;
      white-space: pre-wrap;
    }
    .decisions {
      background: #EFF5F0;
      border: 1px solid #D2E4D5;
      border-radius: 8px;
      padding: 10px 14px;
      white-space: pre-wrap;
    }
    .fu {
      list-style: none;
      margin-left: 0;
      padding: 6px 0;
      border-bottom: 1px dashed var(--line);
      display: flex;
      align-items: start;
      gap: 10px;
    }
    .fu:last-child { border-bottom: none; }
    .fu .box { font-size: 14pt; color: var(--accent); line-height: 1; }
    .fu.done { color: var(--muted); text-decoration: line-through; }
    .notes { white-space: pre-wrap; color: var(--muted); }
    .footer {
      margin-top: 40px;
      padding-top: 10px;
      border-top: 1px solid var(--line);
      font-size: 9pt;
      color: #A3A69F;
      display: flex;
      justify-content: space-between;
    }
    .empty { color: #A3A69F; font-style: italic; }
    @media print {
      html, body { background: white; }
      .sheet { border: none; box-shadow: none; margin: 0; padding: 24px 32px; max-width: none; }
      @page { size: A4; margin: 18mm 16mm; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="kicker">Mötesprotokoll</div>
    <h1>${escapeHtml(title)}</h1>
    <div class="datestamp">${escapeHtml(date)}${timeRange ? ` &middot; ${escapeHtml(timeRange)}` : ""}</div>
    ${meta ? `<div class="meta">${meta}</div>` : ""}

    ${
      event.participants
        ? `<h2>Deltagare</h2><div class="participants">${nl2br(event.participants)}</div>`
        : ""
    }

    <h2>Agenda</h2>
    ${event.agenda ? bulletsFromText(event.agenda) || `<div class="notes">${nl2br(event.agenda)}</div>` : `<div class="empty">Ingen agenda antecknad.</div>`}

    <h2>Anteckningar</h2>
    ${event.notes ? `<div class="notes">${nl2br(event.notes)}</div>` : `<div class="empty">Inga anteckningar.</div>`}

    <h2>Beslut</h2>
    ${event.decisions ? `<div class="decisions">${nl2br(event.decisions)}</div>` : `<div class="empty">Inga beslut noterade.</div>`}

    <h2>Uppföljningar</h2>
    ${
      followupItems
        ? `<ul style="list-style:none; margin-left:0; padding:0;">${followupItems}</ul>`
        : `<div class="empty">Inga uppföljningspunkter kopplade.</div>`
    }

    <div class="footer">
      <span>Planovia &middot; Din digitala lärarplanerare</span>
      <span>Utskrivet ${new Date().toLocaleString("sv-SE")}</span>
    </div>
  </div>
  <script>
    // Wait a beat so fonts settle, then open print dialog.
    window.addEventListener("load", () => {
      setTimeout(() => { window.print(); }, 250);
    });
  </script>
</body>
</html>`;

  const w = window.open("", "_blank", "width=900,height=1100");
  if (!w) {
    alert("Popup-fönstret blockerades. Tillåt popup för att skriva ut mötet.");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
};
