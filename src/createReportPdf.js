const rowsPerPage = 10;
const pageWidth = 1400;

function createElement(tagName, styles = {}, text) {
  const element = document.createElement(tagName);
  Object.assign(element.style, styles);
  if (text != null) element.textContent = text;
  return element;
}

function createReportPage({ shopId, summary, rows, pageNumber, pageCount }) {
  const page = createElement("section", {
    width: `${pageWidth}px`,
    padding: "36px",
    background: "#ffffff",
    color: "#172033",
    fontFamily: 'Arial, "Noto Sans Devanagari", sans-serif',
    fontSize: "18px",
  });

  page.append(
    createElement(
      "h1",
      {
        margin: "0 0 10px",
        textAlign: "center",
        fontSize: "30px",
        color: "#111827",
      },
      "उठाव शेष रिपोर्ट",
    ),
    createElement(
      "p",
      {
        margin: "0 0 20px",
        textAlign: "center",
        fontSize: "17px",
        color: "#374151",
      },
      `दुकान क्रमांक: ${shopId}   |   उठाव शेष: ${summary.pending}   |   राशन उठा चुके: ${summary.pickedUp}`,
    ),
  );

  const table = createElement("table", {
    width: "100%",
    borderCollapse: "collapse",
    tableLayout: "fixed",
    fontSize: "15px",
  });
  const header = document.createElement("thead");
  const headerRow = document.createElement("tr");
  const columns = [
    ["क्र.", "4%"],
    ["RC Id", "10%"],
    ["Family Member", "13%"],
    ["Scheme", "12%"],
    ["Units", "6%"],
    ["F Rice", "7%"],
    ["CGRice", "7%"],
    ["Sugar", "7%"],
    ["Salt", "7%"],
    ["Koil / चना", "8%"],
    ["उठाव की स्थिति", "19%"],
  ];

  for (const [label, width] of columns) {
    headerRow.append(
      createElement(
        "th",
        {
          width,
          padding: "10px 6px",
          border: "1px solid #64748b",
          background: "#e8edf5",
          textAlign: "center",
          verticalAlign: "middle",
          overflowWrap: "anywhere",
        },
        label,
      ),
    );
  }
  header.append(headerRow);
  table.append(header);

  const body = document.createElement("tbody");
  rows.forEach((row, index) => {
    const tableRow = document.createElement("tr");
    row.forEach((value) => {
      tableRow.append(
        createElement(
          "td",
          {
            padding: "8px 6px",
            border: "1px solid #94a3b8",
            textAlign: "center",
            verticalAlign: "middle",
            overflowWrap: "anywhere",
          },
          value,
        ),
      );
    });
    if (index % 2 === 1) tableRow.style.background = "#f8fafc";
    body.append(tableRow);
  });
  table.append(body);
  page.append(table);
  page.append(
    createElement(
      "p",
      {
        margin: "14px 0 0",
        textAlign: "right",
        color: "#64748b",
        fontSize: "13px",
      },
      `पृष्ठ ${pageNumber} / ${pageCount}`,
    ),
  );

  return page;
}

export async function createReportPdf({ shopId, summary, rows }) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageCount = Math.ceil(rows.length / rowsPerPage);
  const renderRoot = createElement("div", {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: `${pageWidth}px`,
    zIndex: "-1",
  });
  document.body.append(renderRoot);

  try {
    await document.fonts?.ready;
    for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
      const pageRows = rows.slice(
        pageIndex * rowsPerPage,
        (pageIndex + 1) * rowsPerPage,
      );
      const page = createReportPage({
        shopId,
        summary,
        rows: pageRows,
        pageNumber: pageIndex + 1,
        pageCount,
      });
      renderRoot.replaceChildren(page);

      const canvas = await html2canvas(page, {
        backgroundColor: "#ffffff",
        scale: 2,
      });
      if (pageIndex > 0) pdf.addPage();
      pdf.addImage(
        canvas.toDataURL("image/jpeg", 0.88),
        "JPEG",
        8,
        8,
        pdf.internal.pageSize.getWidth() - 16,
        pdf.internal.pageSize.getHeight() - 16,
        undefined,
        "FAST",
      );
    }
  } finally {
    renderRoot.remove();
  }

  return pdf.output("blob");
}
