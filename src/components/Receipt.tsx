"use client";
import { OfficeId, getOffice } from "@/lib/config";
import { useT } from "@/lib/i18n";

export interface ReceiptData {
  number: string;
  priority: boolean;
  business_name?: string | null;
  account_no?: string | null;
  app_type?: string | null;
  biz_type?: string | null;
  created_at: string;
}

/** The small landscape ticket slip (what staff and the kiosk print). */
export function Receipt({ office, data }: { office: OfficeId; data: ReceiptData }) {
  const t = useT();
  const off = getOffice(office);
  return (
    <div className="receipt">
      <div className="receipt-top">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.jpg" alt="" className="receipt-seal" />
        <div>
          <div className="receipt-head">Bayan ng Cainta, Rizal</div>
          <div className="receipt-head">{off.name}</div>
        </div>
      </div>
      <div className="receipt-body">
        <div className="receipt-left">
          <div className="receipt-number">{data.number}</div>
          <div className="receipt-kind">{data.priority ? "★ PRIORITY" : "REGULAR"}</div>
        </div>
        <div className="receipt-right">
          {data.business_name && (
            <div className="receipt-line">
              <b>{data.business_name}</b>
            </div>
          )}
          {data.account_no && (
            <div className="receipt-line">
              <span>Acct</span> <b>{data.account_no}</b>
            </div>
          )}
          {(data.app_type || data.biz_type) && (
            <div className="receipt-line">
              <b>{[data.app_type, data.biz_type].filter(Boolean).join(" · ")}</b>
            </div>
          )}
          <div className="receipt-line">
            {new Date(data.created_at).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", year: "numeric", month: "short", day: "numeric" })}
          </div>
          <div className="receipt-line">
            {new Date(data.created_at).toLocaleTimeString("en-PH", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </div>
      <div className="receipt-foot">{t("Hintayin po ang inyong numero sa screen. Salamat po!", "Please wait for your number on the screen. Thank you!")}</div>
    </div>
  );
}
