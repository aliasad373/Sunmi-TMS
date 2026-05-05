import { useEffect, useMemo, useState } from "react";
import { Calendar } from "primereact/calendar";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import api from "../../network/api";

const REPORTING_TIMEZONE = "Asia/Karachi";

const getYmdFromLocalDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const getCreatedAtValue = (row) =>
  row?.CreatedAt ?? row?.createdAt ?? row?.created_at ?? row?.Created_at ?? row?.created ?? "";

const getCreateDate = (row) => {
  const createdAt = getCreatedAtValue(row);
  if (!createdAt) return "";
  const parsed = new Date(createdAt);
  if (Number.isNaN(parsed.getTime())) return "";
  return getYmdInTimeZone(parsed, REPORTING_TIMEZONE) ?? "";
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

const getYmdInTimeZone = (date, timeZone) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;

  if (!year || !month || !day) return null;
  return `${year}-${month}-${day}`;
};

const formatYmd = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

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

export default function ReportingPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/allTransactions");
        setRows(response.data?.data ?? []);
      } catch (e) {
        setRows([]);
        setError("Failed to load transactions.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const createdAtRange = useMemo(() => {
    if (!(startDate instanceof Date) && !(endDate instanceof Date)) {
      return { startYmd: null, endYmd: null };
    }

    let startYmd = startDate instanceof Date ? getYmdFromLocalDate(startDate) : null;
    let endYmd = endDate instanceof Date ? getYmdFromLocalDate(endDate) : null;

    if (startYmd && endYmd && endYmd < startYmd) {
      const tmp = startYmd;
      startYmd = endYmd;
      endYmd = tmp;
    }

    return { startYmd, endYmd };
  }, [startDate, endDate]);

  const filteredRows = useMemo(() => {
    const { startYmd, endYmd } = createdAtRange;

    if (!startYmd && !endYmd) return rows;

    return rows.filter((row) => {
      const createdAt = row?.CreatedAt;
      if (!createdAt) return false;
      const parsed = new Date(createdAt);
      if (Number.isNaN(parsed.getTime())) return false;

      const txYmd = getYmdInTimeZone(parsed, REPORTING_TIMEZONE);
      if (!txYmd) return false;

      if (startYmd && txYmd < startYmd) return false;
      if (endYmd && txYmd > endYmd) return false;
      return true;
    });
  }, [rows, createdAtRange]);

  const handleDownloadCsv = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const filename = `daily-reporting_${yyyy}-${mm}-${dd}.csv`;

    downloadCsv({ rows: filteredRows, columns, filename });
  };

  const isFilterActive = useMemo(
    () => Boolean(createdAtRange.startYmd || createdAtRange.endYmd),
    [createdAtRange]
  );

  const missingCreatedAtCount = useMemo(() => {
    let missing = 0;
    rows.forEach((row) => {
      if (!row?.CreatedAt) missing += 1;
    });
    return missing;
  }, [rows]);

  const columns = useMemo(() => {
    const fixedColumns = [
      { field: "CreateDate", header: "Create Date", value: (row) => getCreateDate(row) },
      { field: "CreateTime", header: "Create Time", value: (row) => getCreateTime(row) },
      { field: "CardNumber", header: "Card No" },
      { field: "CardScheme", header: "Card Scheme" },
      { field: "Amount", header: "Amount" },
      { field: "STAN", header: "STAN" },
      { field: "RRN", header: "RRN", value: (row) => formatRrn(row) },
      {
        field: "ResponseCode",
        header: "Response Code",
        value: (row) => formatHexAsciiOrAsciiToHex(row?.ResponseCode),
      },
      { field: "AuthNumber", header: "AuthCode", value: (row) => formatAuthCode(row) },
      { field: "BatchNo", header: "Batch No" },
    ];

    return fixedColumns;
  }, []);

  return (
    <div className="page-placeholder">
      <h1 className="page-title">Daily Reporting</h1>

      {error ? <div style={{ color: "#e64424", fontWeight: 700 }}>{error}</div> : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "end", marginBottom: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, width: 450 }}>
          <label style={{ fontWeight: 600, color: "#1c1f4a" }}>Start Date</label>
          <Calendar
            value={startDate}
            onChange={(e) => setStartDate(e.value)}
            dateFormat="yy-mm-dd"
            showIcon
            inputStyle={{ width: "100%" }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, width: 450}}>
          <label style={{ fontWeight: 600, color: "#1c1f4a" }}>End Date</label>
          <Calendar
            value={endDate}
            onChange={(e) => setEndDate(e.value)}
            dateFormat="yy-mm-dd"
            showIcon
            inputStyle={{ width: "100%" }}
          />
        </div>

        <button
          type="button"
          onClick={() => {
            setStartDate(null);
            setEndDate(null);
          }}
          style={{
            height: 40,
            padding: "0 14px",
            borderRadius: 8,
            border: "1px solid rgba(28, 31, 74, 0.16)",
            background: "#fff",
            cursor: "pointer",
            fontWeight: 600,
            color: "#1c1f4a",
          }}
        >
          Clear Filter
        </button>

        <button
          type="button"
          onClick={handleDownloadCsv}
          disabled={loading || filteredRows.length === 0}
          style={{
            height: 40,
            padding: "0 14px",
            borderRadius: 8,
            border: loading || filteredRows.length === 0 ? "1px solid rgba(28, 31, 74, 0.12)" : "1px solid #18a957",
            background: loading || filteredRows.length === 0 ? "rgba(28, 31, 74, 0.06)" : "#18a957",
            cursor: loading || filteredRows.length === 0 ? "not-allowed" : "pointer",
            fontWeight: 700,
            color: loading || filteredRows.length === 0 ? "#1c1f4a" : "#ffffff",
          }}
        >
          Download CSV
        </button>
      </div>

      <div style={{ fontWeight: 700, color: "rgba(28, 31, 74, 0.85)", marginBottom: 8 }}>
        {isFilterActive
          ? `Filtered transactions by date: ${filteredRows.length.toLocaleString()}`
          : `Total Transaction: ${rows.length.toLocaleString()}`}
      </div>

      <div style={{ width: "100%", maxWidth: "100%", overflowX: "hidden" }}>
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
