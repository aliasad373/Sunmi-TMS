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

const decodeHexAsciiIfLikely = (value) => {
  if (value === null || value === undefined) return null;
  const hex = String(value).trim();
  if (!hex) return null;
  if (hex.length % 2 !== 0) return null;
  if (!/^[0-9a-fA-F]+$/.test(hex)) return null;

  let out = "";
  for (let i = 0; i < hex.length; i += 2) {
    const code = Number.parseInt(hex.slice(i, i + 2), 16);
    if (Number.isNaN(code)) return null;
    out += String.fromCharCode(code);
  }

  const printable = /^[\x20-\x7E]+$/.test(out);
  if (!printable) return null;
  return out;
};

const asciiToHex = (value) => {
  if (value === null || value === undefined) return "";
  const str = String(value);
  let out = "";
  for (let i = 0; i < str.length; i += 1) {
    out += str.charCodeAt(i).toString(16).padStart(2, "0").toUpperCase();
  }
  return out;
};

const formatHexAsciiOrAsciiToHex = (value) => {
  const decoded = decodeHexAsciiIfLikely(value);
  if (decoded !== null) return decoded;
  return asciiToHex(value);
};

const formatRrn = (row) => {
  const raw = row?.RRN;
  const decoded = decodeHexAsciiIfLikely(raw);
  const rrnCandidate = (decoded ?? String(raw ?? "")).trim();
  return rrnCandidate;
};

const formatAuthCode = (row) => {
  const raw = row?.AuthNumber;
  const decoded = decodeHexAsciiIfLikely(raw);
  return (decoded ?? String(raw ?? "")).trim();
};

const formatSettlementStatus = (row) => {
  const raw = String(row?.SettlementStatus ?? "").trim();
  if (raw === "1") return "Settled";
  if (raw === "0") return "Unsettled";
  return raw;
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

  return new Intl.DateTimeFormat("en-US", {
    timeZone: REPORTING_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(parsed);
};

export default function MerchantDailyTransactionsPage() {
  const [rows, setRows] = useState([]);
  // Serial number transaction row par nahi hota — terminal record par hota hai,
  // TID se join karke laate hain.
  const [terminalRows, setTerminalRows] = useState([]);
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
      { label: "All", value: "" },
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
        // Terminals ka serial chahiye, is liye dono ek saath. Terminals fail ho
        // to bhi transactions dikhte rahein (serial khali reh jayega).
        const [txnRes, termRes] = await Promise.all([
          api.get("/allTransactions"),
          api.get("/allTerminals").catch(() => null),
        ]);
        const all = txnRes.data?.data ?? [];
        const merchantRows = all.filter((r) => r && typeof r === "object" && r.MerchantID);
        setRows(merchantRows);
        // Terminals response `terminals` key par aata hai (data nahi)
        setTerminalRows(Array.isArray(termRes?.data?.terminals) ? termRes.data.terminals : []);
      } catch (e) {
        setRows([]);
        setError("Failed to load merchant transactions.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // TID -> serial number lookup (terminals se)
  const serialByTid = useMemo(() => {
    const map = new Map();
    (terminalRows ?? []).forEach((t) => {
      const tid = String(t?.TID ?? t?.TerminalID ?? t?.terminalId ?? "").trim();
      if (!tid) return;
      const serial = String(t?.serial_number ?? t?.SerialNumber ?? t?.serialNumber ?? "").trim();
      if (serial) map.set(tid, serial);
    });
    return map;
  }, [terminalRows]);

  const getSerialNumber = (row) => {
    const tid = String(row?.TerminalID ?? row?.TID ?? row?.terminalId ?? "").trim();
    return serialByTid.get(tid) ?? "";
  };

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
      // Device serial — transaction row par nahi hota; TID se terminal ka serial
      { field: "SerialNumber", header: "Serial Number", value: (row) => getSerialNumber(row) },
      { field: "SettlementStatus", header: "Settlement Status", value: (row) => formatSettlementStatus(row) },
      { field: "CardNumber", header: "Card No" },
      { field: "Amount", header: "Amount" },
      { field: "STAN", header: "STAN" },
      { field: "RRN", header: "RRN", value: (row) => formatRrn(row) },
      { field: "ResponseCode", header: "Response Code", value: (row) => formatHexAsciiOrAsciiToHex(row?.ResponseCode) },
      { field: "AuthNumber", header: "AuthCode", value: (row) => formatAuthCode(row) },
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
  }, [rows, serialByTid]);

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
    const settlementValue = String(settlementStatus ?? "").trim();
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

  const filteredTotalAmount = useMemo(() => {
    const parseAmount = (value) => {
      if (value === null || value === undefined) return 0;
      const raw = String(value);
      const cleaned = raw.replace(/[^0-9.-]/g, "");
      const num = Number.parseFloat(cleaned);
      return Number.isFinite(num) ? num : 0;
    };

    let total = 0;
    filteredRows.forEach((r) => {
      if (!r || typeof r !== "object") return;
      total += parseAmount(r.Amount);
    });
    return total;
  }, [filteredRows]);

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

  const inputClassName =
    "h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/30";

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="mb-5 text-xs text-slate-500">Reports / Merchant Daily Transactions</div>

      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Merchant Daily Transactions</h1>
          <div className="mt-1 text-xs text-slate-500">Last updated: --</div>
        </div>

        <button
          type="button"
          onClick={handleDownloadCsv}
          disabled={loading || filteredRows.length === 0}
          className={
            loading || filteredRows.length === 0
              ? "h-10 cursor-not-allowed rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-semibold text-slate-400"
              : "h-10 rounded-xl border border-emerald-400/40 bg-emerald-400/90 px-4 text-xs font-semibold text-slate-950 hover:bg-emerald-300"
          }
        >
          Export CSV
        </button>
      </div>

      {error ? <div className="mb-3 text-sm font-semibold text-rose-300">{error}</div> : null}

      <div className="mb-4 text-sm font-semibold text-slate-200">
        Total Transactions: {filteredRows.length.toLocaleString()} | Total Amount:{" "}
        {filteredTotalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </div>

      <section className="mb-4 rounded-2xl border border-white/5 bg-white/5 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-6">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-300">Start Date</label>
            <Calendar
              className="merchant-date-calendar w-full"
              value={startDate}
              onChange={(e) => setStartDate(e.value)}
              dateFormat="yy-mm-dd"
              showIcon
              inputClassName={inputClassName}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-300">End Date</label>
            <Calendar
              className="merchant-date-calendar w-full"
              value={endDate}
              onChange={(e) => setEndDate(e.value)}
              dateFormat="yy-mm-dd"
              showIcon
              inputClassName={inputClassName}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-300">MID</label>
            <input
              value={mid}
              onChange={(e) => setMid(e.target.value)}
              placeholder="Enter MerchantID"
              className={inputClassName}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-300">TID</label>
            <input
              value={tid}
              onChange={(e) => setTid(e.target.value)}
              placeholder="Enter TerminalID"
              className={inputClassName}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-300">Settlement Status</label>
            <Dropdown
              value={settlementStatus}
              options={settlementOptions}
              onChange={(e) => setSettlementStatus(e.value)}
              optionLabel="label"
              optionValue="value"
              placeholder="Select status"
              className="w-full"
              inputClassName={inputClassName}
            />
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <button
              type="button"
              onClick={() => {
                setMid("");
                setTid("");
                setSettlementStatus("");
                setStartDate(null);
                setEndDate(null);
              }}
              className="h-10 rounded-xl border border-white/10 bg-black/20 px-4 text-xs font-semibold text-slate-200 hover:bg-black/30"
            >
              Clear
            </button>
          </div>
        </div>
      </section>

      <div className="mb-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => handleScrollTable("left")}
          className="h-10 w-11 rounded-xl border border-white/10 bg-black/20 text-xs font-black text-slate-200 hover:bg-black/30"
          aria-label="Scroll table left"
        >
          {"<"}
        </button>
        <button
          type="button"
          onClick={() => handleScrollTable("right")}
          className="h-10 w-11 rounded-xl border border-white/10 bg-black/20 text-xs font-black text-slate-200 hover:bg-black/30"
          aria-label="Scroll table right"
        >
          {">"}
        </button>
      </div>

      <section ref={tableScrollRef} className="overflow-hidden rounded-2xl border border-white/5 bg-white/5">
        <DataTable
          value={filteredRows}
          loading={loading}
          dataKey="ID"
          className="!bg-transparent"
          tableClassName="!bg-transparent"
          responsiveLayout="scroll"
          scrollable
          scrollHeight="60vh"
          tableStyle={{ minWidth: "1200px" }}
          paginator
          rows={50}
          rowsPerPageOptions={[25, 50, 100, 200]}
          paginatorClassName="!border-0 !bg-transparent border-t border-white/5"
          emptyMessage="No transactions found"
          rowHover
          size="small"
        >
          {columns.map((c) => {
            const commonProps = {
              key: c.field,
              field: c.field,
              header: c.header,
              headerClassName:
                "!border-0 !bg-transparent px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400",
              bodyClassName: "px-4 py-3 !border-0 border-t border-white/5 text-sm text-slate-200",
            };

            if (typeof c.value === "function") {
              return <Column {...commonProps} body={(row) => c.value(row)} />;
            }

            return <Column {...commonProps} />;
          })}
        </DataTable>
      </section>
    </div>
  );
}
