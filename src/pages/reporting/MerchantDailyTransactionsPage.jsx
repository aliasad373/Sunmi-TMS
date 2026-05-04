import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar } from "primereact/calendar";
import { Dropdown } from "primereact/dropdown";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import api from "../../network/api";

const csvEscape = (value) => {
  if (value === null || value === undefined) return "";
  const str = String(value);
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
};

const downloadCsv = ({ rows, columns, filename }) => {
  const headers = columns.map((c) => c.header ?? c.field);
  const valueGetters = columns.map((c) => c.value ?? ((row) => row?.[c.field]));

  const lines = [headers.map(csvEscape).join(",")];
  rows.forEach((row) => {
    const values = valueGetters.map((getValue) => csvEscape(getValue(row)));
    lines.push(values.join(","));
  });

  const csv = lines.join("\n");
  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
};

const REPORTING_TIMEZONE = "Asia/Karachi";

const removeFirstPrefix = (value) => {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (!str) return "";
  return str.startsWith("3") ? str.slice(1) : str;
};

const getCreatedAtValue = (row) =>
  row?.CreatedAt ?? row?.createdAt ?? row?.created_at ?? row?.Created_at ?? row?.created ?? "";

const getCreateDate = (row) => {
  const createdAt = getCreatedAtValue(row);
  if (!createdAt) return "";
  const parsed = new Date(createdAt);
  if (Number.isNaN(parsed.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORTING_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(parsed);

  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  if (!year || !month || !day) return "";
  return `${year}-${month}-${day}`;
};

const getCreateTime = (row) => {
  const createdAt = getCreatedAtValue(row);
  if (!createdAt) return "";
  const parsed = new Date(createdAt);
  if (Number.isNaN(parsed.getTime())) return "";

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: REPORTING_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(parsed);
};

export default function MerchantDailyTransactionsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mid, setMid] = useState("");
  const [tid, setTid] = useState("");
  const [settlementStatus, setSettlementStatus] = useState("");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const tableScrollRef = useRef(null);

  const settlementOptions = useMemo(
    () => [
      { label: "Settled", value: "1" },
      { label: "Unsettled", value: "0" },
    ],
    []
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/allTransactions");
        const all = response.data?.data ?? [];
        const merchantRows = all.filter((r) => r && typeof r === "object" && r.MerchantID);
        setRows(merchantRows);
      } catch (e) {
        setRows([]);
        setError("Failed to load merchant transactions.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const columns = useMemo(() => {
    const fixedColumns = [
      {
        field: "CreateDate",
        header: "Create Date",
        value: (row) => getCreateDate(row),
      },
      {
        field: "CreateTime",
        header: "Create Time",
        value: (row) => getCreateTime(row),
      },
      { field: "MerchantID", header: "MID" },
      { field: "TerminalID", header: "TID" },
      { field: "CardNumber", header: "Card No" },
      { field: "Amount", header: "Amount" },
      { field: "STAN", header: "STAN" },
      { field: "RRN", header: "RRN", value: (row) => removeFirstPrefix(row?.RRN) },
      { field: "ResponseCode", header: "Response Code", value: (row) => removeFirstPrefix(row?.ResponseCode) },
      { field: "AuthNumber", header: "AuthCode" },
      { field: "BatchNo", header: "Batch No" },
    ];

    const fixedFields = new Set(fixedColumns.map((c) => c.field));
    const hiddenFields = new Set(["AID", "TransactionDate", "TransactionTime"]);
    const discovered = new Set();

    rows.slice(0, 100).forEach((row) => {
      if (!row || typeof row !== "object") return;
      Object.keys(row).forEach((key) => {
        if (!fixedFields.has(key) && !hiddenFields.has(key)) discovered.add(key);
      });
    });

    const extraColumns = Array.from(discovered)
      .sort((a, b) => a.localeCompare(b))
      .map((field) => ({ field, header: field }));

    return [...fixedColumns, ...extraColumns];
  }, [rows]);

  const createdAtRange = useMemo(() => {
    if (!(startDate instanceof Date) && !(endDate instanceof Date)) {
      return { startYmd: null, endYmd: null };
    }

    const toLocalYmd = (date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    };

    let startYmd = startDate instanceof Date ? toLocalYmd(startDate) : null;
    let endYmd = endDate instanceof Date ? toLocalYmd(endDate) : null;

    if (startYmd && endYmd && endYmd < startYmd) {
      const tmp = startYmd;
      startYmd = endYmd;
      endYmd = tmp;
    }

    return { startYmd, endYmd };
  }, [startDate, endDate]);

  const filteredRows = useMemo(() => {
    const midValue = mid.trim();
    const tidValue = tid.trim();
    const settlementValue = settlementStatus.trim();
    const { startYmd, endYmd } = createdAtRange;

    if (!midValue && !tidValue && !settlementValue && !startYmd && !endYmd) return rows;

    return rows.filter((r) => {
      if (!r || typeof r !== "object") return false;
      if (midValue && String(r.MerchantID ?? "").trim() !== midValue) return false;
      if (tidValue && String(r.TerminalID ?? "").trim() !== tidValue) return false;
      if (settlementValue && String(r.SettlementStatus ?? "").trim() !== settlementValue) return false;

      if (startYmd || endYmd) {
        const txYmd = getCreateDate(r);
        if (!txYmd) return false;
        if (startYmd && txYmd < startYmd) return false;
        if (endYmd && txYmd > endYmd) return false;
      }

      return true;
    });
  }, [rows, mid, tid, settlementStatus, createdAtRange]);

  const handleDownloadCsv = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const filename = `merchant-daily-transactions_${yyyy}-${mm}-${dd}.csv`;

    downloadCsv({ rows: filteredRows, columns, filename });
  };

  const handleScrollTable = (direction) => {
    const root = tableScrollRef.current;
    if (!root) return;

    const scrollEl =
      root.querySelector(".p-datatable-wrapper") ||
      root.querySelector(".p-datatable-scrollable-body") ||
      root;

    if (!scrollEl) return;
    if (scrollEl.scrollWidth <= scrollEl.clientWidth) return;

    const amount = Math.max(240, Math.floor(scrollEl.clientWidth * 0.8));
    scrollEl.scrollBy({ left: direction === "right" ? amount : -amount, behavior: "smooth" });
  };

  const inputBaseStyle = {
    height: 40,
    borderRadius: 8,
    border: "1px solid rgba(28, 31, 74, 0.16)",
    padding: "0 12px",
    width: "100%",
  };

  const buttonBaseStyle = {
    height: 40,
    padding: "0 14px",
    borderRadius: 8,
    border: "1px solid rgba(28, 31, 74, 0.16)",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 600,
    color: "#1c1f4a",
  };

  return (
    <div className="page-placeholder" style={{ overflowX: "hidden" }}>
      <h1 className="page-title">Merchant Daily Transactions</h1>

      {error ? <div style={{ color: "#e64424", fontWeight: 700 }}>{error}</div> : null}

      <div style={{ fontWeight: 700, color: "rgba(28, 31, 74, 0.85)", marginBottom: 8 }}>
        Total Transactions: {filteredRows.length.toLocaleString()}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 12,
          alignItems: "end",
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontWeight: 600, color: "#1c1f4a" }}>Start Date</label>
          <Calendar
            className="merchant-date-calendar"
            value={startDate}
            onChange={(e) => setStartDate(e.value)}
            dateFormat="yy-mm-dd"
            showIcon
            style={{ width: "100%" }}
            inputStyle={{ ...inputBaseStyle, padding: "0 12px" }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontWeight: 600, color: "#1c1f4a" }}>End Date</label>
          <Calendar
            className="merchant-date-calendar"
            value={endDate}
            onChange={(e) => setEndDate(e.value)}
            dateFormat="yy-mm-dd"
            showIcon
            style={{ width: "100%" }}
            inputStyle={{ ...inputBaseStyle, padding: "0 12px" }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontWeight: 600, color: "#1c1f4a" }}>MID</label>
          <input
            value={mid}
            onChange={(e) => setMid(e.target.value)}
            placeholder="Enter MerchantID"
            style={inputBaseStyle}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontWeight: 600, color: "#1c1f4a" }}>TID</label>
          <input
            value={tid}
            onChange={(e) => setTid(e.target.value)}
            placeholder="Enter TerminalID"
            style={inputBaseStyle}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontWeight: 600, color: "#1c1f4a" }}>Settlement Status</label>
          <Dropdown
            value={settlementStatus}
            options={settlementOptions}
            onChange={(e) => setSettlementStatus(e.value)}
            placeholder="Select status"
            style={{ width: "100%", height: 40 }}
            inputStyle={{ height: 40, padding: "0 12px" }}
          />
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-start" }}>
          <button
            type="button"
            onClick={() => {
              setMid("");
              setTid("");
              setSettlementStatus("");
              setStartDate(null);
              setEndDate(null);
            }}
            style={buttonBaseStyle}
          >
            Clear
          </button>

          <button
            type="button"
            onClick={handleDownloadCsv}
            disabled={loading || filteredRows.length === 0}
            style={{
              ...buttonBaseStyle,
              border:
                loading || filteredRows.length === 0
                  ? "1px solid rgba(28, 31, 74, 0.12)"
                  : "1px solid #18a957",
              background: loading || filteredRows.length === 0 ? "rgba(28, 31, 74, 0.06)" : "#18a957",
              cursor: loading || filteredRows.length === 0 ? "not-allowed" : "pointer",
              fontWeight: 700,
              color: loading || filteredRows.length === 0 ? "#1c1f4a" : "#ffffff",
            }}
          >
            Download CSV
          </button>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, position: "relative", zIndex: 5 }}>
        <button
          type="button"
          onClick={() => handleScrollTable("left")}
          style={{
            height: 40,
            width: 44,
            borderRadius: 10,
            border: "1px solid rgba(28, 31, 74, 0.16)",
            background: "#fff",
            cursor: "pointer",
            fontWeight: 900,
            color: "#1c1f4a",
            pointerEvents: "auto",
            position: "relative",
            zIndex: 6,
          }}
          aria-label="Scroll table left"
        >
          {"<"}
        </button>
        <button
          type="button"
          onClick={() => handleScrollTable("right")}
          style={{
            height: 40,
            width: 44,
            borderRadius: 10,
            border: "1px solid rgba(28, 31, 74, 0.16)",
            background: "#fff",
            cursor: "pointer",
            fontWeight: 900,
            color: "#1c1f4a",
            pointerEvents: "auto",
            position: "relative",
            zIndex: 6,
          }}
          aria-label="Scroll table right"
        >
          {">"}
        </button>
      </div>

      <div
        ref={tableScrollRef}
        style={{ width: "100%", maxWidth: "100%", overflowX: "hidden" }}
      >
        <DataTable
          value={filteredRows}
          loading={loading}
          dataKey="ID"
          responsiveLayout="scroll"
          scrollable
          scrollHeight="60vh"
          tableStyle={{ minWidth: "1200px" }}
          paginator
          rows={50}
          rowsPerPageOptions={[25, 50, 100, 200]}
        >
          {columns.map((c) => {
            if (typeof c.value === "function") {
              return <Column key={c.field} field={c.field} header={c.header} body={(row) => c.value(row)} />;
            }

            return <Column key={c.field} field={c.field} header={c.header} />;
          })}
        </DataTable>
      </div>
    </div>
  );
}
