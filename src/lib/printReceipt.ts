"use client";

// Print only the receipt: copy it into a hidden frame with its own small page size, so nothing else on the
  // staff screen can add pages and the Queue List still prints on A4.
export function printReceipt(title = "Ticket") {
    const el = document.querySelector(".receipt");
    if (!el) return window.print();
    const css = `
      @page { size: 64mm 34mm; margin: 1.5mm; }
      html, body { margin: 0; padding: 0; background: #fff; }
      .receipt { width: 100%; box-sizing: border-box; color: #000; font-family: "Courier New", monospace; text-align: center; font-size: 10px; line-height: 1.2; }
      .receipt-top { display: flex; align-items: center; gap: 5px; text-align: left; }
      .receipt-seal { width: 30px; height: 30px; flex: none; object-fit: contain; filter: grayscale(1); }
      .receipt-head { font-weight: 700; text-transform: uppercase; font-size: 9px; line-height: 1.15; }
      .receipt-body { display: flex; align-items: center; gap: 6px; margin: 2px 0; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 2px 0; }
      .receipt-left { flex: none; }
      .receipt-right { flex: 1; min-width: 0; text-align: left; font-size: 9px; }
      .receipt-number { font-size: 32px; font-weight: 900; line-height: 1; letter-spacing: .02em; }
      .receipt-kind { font-weight: 700; font-size: 10px; }
      .receipt-line b { overflow-wrap: anywhere; }
      .receipt-foot { font-size: 8px; }
    `;
    const frame = document.createElement("iframe");
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
    document.body.appendChild(frame);
    const doc = frame.contentDocument!;
    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>${css}</style></head><body>${el.outerHTML.replace('src="/logo.jpg"', `src="${location.origin}/logo.jpg"`)}</body></html>`);
    doc.close();
    const go = () => {
      frame.contentWindow!.focus();
      frame.contentWindow!.print();
      setTimeout(() => frame.remove(), 2000);
    };
    const img = doc.querySelector("img");
    if (img && !img.complete) {
      img.onload = img.onerror = go;
    } else {
      setTimeout(go, 100);
    }
  }
