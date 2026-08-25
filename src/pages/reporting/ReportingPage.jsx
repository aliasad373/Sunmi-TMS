import { useEffect, useMemo, useState, useCallback } from "react";
import { Calendar } from "primereact/calendar";
import { Dropdown } from "primereact/dropdown";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Chart } from "primereact/chart";
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

  return new Intl.DateTimeFormat("en-US", {
    timeZone: REPORTING_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
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
  // Serial number transaction row par nahi hota — terminal record par hota hai,
  // TID se join karke laate hain.
  const [terminalRows, setTerminalRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tempStartDate, setTempStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [tempEndDate, setTempEndDate] = useState(() => new Date());
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [endDate, setEndDate] = useState(() => new Date());
  const [tempStatus, setTempStatus] = useState("all");
  const [tempChannel, setTempChannel] = useState("all");
  const [status, setStatus] = useState("all");
  const [channel, setChannel] = useState("all");

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
        setRows(txnRes.data?.data ?? []);
        // Terminals response `terminals` key par aata hai (data nahi)
        setTerminalRows(Array.isArray(termRes?.data?.terminals) ? termRes.data.terminals : []);
      } catch (e) {
        setRows([]);
        setError("Failed to load transactions.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const joinClasses = (...classes) => classes.filter(Boolean).join(" ");

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

  const getSerialNumber = useCallback(
    (row) => {
      const tid = String(row?.TerminalID ?? row?.TID ?? row?.terminalId ?? "").trim();
      return serialByTid.get(tid) ?? "";
    },
    [serialByTid]
  );

  const parseAmount = useCallback((value) => {
    if (value === null || value === undefined) return 0;
    const raw = String(value);
    const cleaned = raw.replace(/[^0-9.-]/g, "");
    const num = Number.parseFloat(cleaned);
    return Number.isFinite(num) ? num : 0;
  }, []);

  const normalizeResponseCode = useCallback((row) => {
    const raw = row?.ResponseCode ?? row?.responseCode ?? row?.RespCode ?? row?.respCode ?? "";
    const decoded = decodeHexAsciiIfLikely(raw);
    const candidate = String(decoded ?? raw ?? "").trim();
    if (!candidate) return "";
    if (/^0+$/.test(candidate)) return "00";
    return candidate;
  }, []);

  const getIsSuccess = useCallback(
    (row) => {
      const code = normalizeResponseCode(row);
      return code === "00";
    },
    [normalizeResponseCode]
  );

  const channelValue = useCallback((row) => {
    const raw =
      row?.Channel ??
      row?.channel ??
      row?.PaymentChannel ??
      row?.paymentChannel ??
      row?.CardScheme ??
      row?.cardScheme ??
      "";
    return String(raw ?? "").trim();
  }, []);

  const statusOptions = useMemo(
    () => [
      { label: "All", value: "all" },
      { label: "Successful", value: "successful" },
      { label: "Failed", value: "failed" },
    ],
    []
  );

  const channelOptions = useMemo(() => {
    const set = new Set();
    rows.slice(0, 2000).forEach((r) => {
      if (!r || typeof r !== "object") return;
      const v = channelValue(r);
      if (v) set.add(v);
    });
    const list = Array.from(set).sort((a, b) => a.localeCompare(b));
    return [{ label: "All", value: "all" }, ...list.map((v) => ({ label: v, value: v }))];
  }, [channelValue, rows]);

  const applyFilters = () => {
    setStartDate(tempStartDate);
    setEndDate(tempEndDate);
    setStatus(tempStatus);
    setChannel(tempChannel);
  };

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
    const statusValue = String(status ?? "all").trim();
    const channelFilter = String(channel ?? "all").trim();

    if (!startYmd && !endYmd && statusValue === "all" && channelFilter === "all") return rows;

    return rows.filter((row) => {
      const createdAt = getCreatedAtValue(row);
      if (!createdAt) return false;
      const parsed = new Date(createdAt);
      if (Number.isNaN(parsed.getTime())) return false;

      const txYmd = getYmdInTimeZone(parsed, REPORTING_TIMEZONE);
      if (!txYmd) return false;

      if (startYmd && txYmd < startYmd) return false;
      if (endYmd && txYmd > endYmd) return false;

      if (statusValue === "successful" && !getIsSuccess(row)) return false;
      if (statusValue === "failed" && getIsSuccess(row)) return false;

      if (channelFilter !== "all") {
        const cv = channelValue(row);
        if (cv !== channelFilter) return false;
      }

      return true;
    });
  }, [channel, channelValue, createdAtRange, getIsSuccess, rows, status]);

  const handleDownloadCsv = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const filename = `daily-reporting_${yyyy}-${mm}-${dd}.csv`;

    downloadCsv({ rows: filteredRows, columns, filename });
  };

  const isFilterActive = useMemo(
    () => Boolean(createdAtRange.startYmd || createdAtRange.endYmd || status !== "all" || channel !== "all"),
    [channel, createdAtRange, status]
  );

  const missingCreatedAtCount = useMemo(() => {
    let missing = 0;
    rows.forEach((row) => {
      if (!getCreatedAtValue(row)) missing += 1;
    });
    return missing;
  }, [rows]);

  const stats = useMemo(() => {
    let total = 0;
    let successful = 0;
    let failed = 0;
    let volume = 0;

    (filteredRows ?? []).forEach((r) => {
      if (!r || typeof r !== "object") return;
      total += 1;
      const ok = getIsSuccess(r);
      if (ok) successful += 1;
      else failed += 1;
      volume += parseAmount(r?.Amount);
    });

    return { total, successful, failed, volume };
  }, [filteredRows, getIsSuccess, parseAmount]);

  const dailyVolumeSeries = useMemo(() => {
    const map = new Map();
    (filteredRows ?? []).forEach((r) => {
      if (!r || typeof r !== "object") return;
      const ymd = getCreateDate(r);
      if (!ymd) return;
      map.set(ymd, (map.get(ymd) ?? 0) + parseAmount(r?.Amount));
    });

    const labels = Array.from(map.keys()).sort((a, b) => a.localeCompare(b));
    const values = labels.map((k) => map.get(k) ?? 0);
    const displayLabels = labels.map((k) => {
      const [y, m, d] = String(k).split("-");
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const idx = Number(m) - 1;
      return `${monthNames[idx] ?? m} ${Number(d)}`;
    });
    return { labels: displayLabels, values };
  }, [filteredRows, parseAmount]);

  const dailyVolumeChartData = useMemo(
    () => ({
      labels: dailyVolumeSeries.labels,
      datasets: [
        {
          label: "PKR",
          data: dailyVolumeSeries.values,
          tension: 0.35,
          fill: true,
          borderColor: "rgba(34,211,238,0.9)",
          backgroundColor: "rgba(34,211,238,0.12)",
          pointRadius: 3,
          pointHoverRadius: 4,
        },
      ],
    }),
    [dailyVolumeSeries]
  );

  const donutData = useMemo(
    () => ({
      labels: ["Successful", "Failed"],
      datasets: [
        {
          data: [stats.successful, stats.failed],
          backgroundColor: ["rgba(52, 211, 153, 0.9)", "rgba(244, 63, 94, 0.9)"],
          hoverBackgroundColor: ["rgba(52, 211, 153, 1)", "rgba(244, 63, 94, 1)"],
          borderWidth: 0,
        },
      ],
    }),
    [stats.failed, stats.successful]
  );

  const chartOptions = useMemo(
    () => ({
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: "rgba(255,255,255,0.75)",
            boxWidth: 10,
            boxHeight: 10,
          },
        },
        tooltip: {
          titleColor: "rgba(255,255,255,0.95)",
          bodyColor: "rgba(255,255,255,0.9)",
        },
      },
      scales: {
        x: {
          ticks: { color: "rgba(255,255,255,0.6)", maxRotation: 0, autoSkip: true },
          grid: { color: "rgba(255,255,255,0.06)" },
        },
        y: {
          ticks: { color: "rgba(255,255,255,0.6)" },
          grid: { color: "rgba(255,255,255,0.06)" },
        },
      },
    }),
    []
  );

  const donutOptions = useMemo(
    () => ({
      maintainAspectRatio: false,
      cutout: "72%",
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "rgba(255,255,255,0.75)",
            boxWidth: 10,
            boxHeight: 10,
          },
        },
      },
    }),
    []
  );

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
      // Device serial — transaction row par nahi hota; TID se terminal ka serial
      { field: "SerialNumber", header: "Serial Number", value: (row) => getSerialNumber(row) },
    ];

    return fixedColumns;
  }, [getSerialNumber]);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8" style={{ overflowX: "hidden" }}>
      <div className="mb-5 text-xs text-slate-500">
        Reports / <span className="text-sky-400">Transaction Report</span>
      </div>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Transaction Report</h1>
          <p className="mt-1 text-sm text-slate-400">Detailed transaction log and analytics</p>
        </div>

        <button
          type="button"
          onClick={handleDownloadCsv}
          disabled={loading || filteredRows.length === 0}
          className={joinClasses(
            "inline-flex items-center justify-center rounded-xl px-4 py-2 text-xs font-semibold",
            loading || filteredRows.length === 0
              ? "cursor-not-allowed border border-white/10 bg-white/5 text-slate-400"
              : "border border-cyan-400/40 bg-cyan-400/90 text-slate-950 hover:bg-cyan-300"
          )}
        >
          Export CSV
        </button>
      </div>

      {error ? <div className="mb-4 text-sm font-semibold text-rose-400">{error}</div> : null}

      <section className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#0b1220]/70 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent" aria-hidden />
        <div className="relative">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <div>
              <div className="mb-2 text-[11px] font-semibold text-slate-400">From:</div>
              <Calendar
                value={tempStartDate}
                onChange={(e) => setTempStartDate(e.value)}
                dateFormat="mm/dd/yy"
                showIcon
                inputClassName="!h-10 !w-full !rounded-xl !border !border-white/10 !bg-black/20 !px-3 !text-sm !text-slate-100 placeholder:!text-slate-500"
                className="w-full"
              />
            </div>

            <div>
              <div className="mb-2 text-[11px] font-semibold text-slate-400">To:</div>
              <Calendar
                value={tempEndDate}
                onChange={(e) => setTempEndDate(e.value)}
                dateFormat="mm/dd/yy"
                showIcon
                inputClassName="!h-10 !w-full !rounded-xl !border !border-white/10 !bg-black/20 !px-3 !text-sm !text-slate-100 placeholder:!text-slate-500"
                className="w-full"
              />
            </div>

            <div>
              <div className="mb-2 text-[11px] font-semibold text-slate-400">Status:</div>
              <Dropdown
                value={tempStatus}
                options={statusOptions}
                onChange={(e) => setTempStatus(e.value)}
                placeholder="All"
                className="w-full !h-10 !rounded-xl !border !border-white/10 !bg-black/20 !text-sm !text-slate-100"
              />
            </div>

            <div>
              <div className="mb-2 text-[11px] font-semibold text-slate-400">Channel:</div>
              <Dropdown
                value={tempChannel}
                options={channelOptions}
                onChange={(e) => setTempChannel(e.value)}
                placeholder="All"
                className="w-full !h-10 !rounded-xl !border !border-white/10 !bg-black/20 !text-sm !text-slate-100"
              />
            </div>

            <div className="flex items-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setTempStartDate(null);
                  setTempEndDate(null);
                  setTempStatus("all");
                  setTempChannel("all");
                  setStartDate(null);
                  setEndDate(null);
                  setStatus("all");
                  setChannel("all");
                }}
                className="h-10 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-semibold text-slate-200 hover:bg-white/10"
              >
                Clear
              </button>

              <button
                type="button"
                onClick={applyFilters}
                className="h-10 rounded-xl border border-cyan-400/40 bg-cyan-400/90 px-4 text-xs font-semibold text-slate-950 hover:bg-cyan-300"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-2xl border border-white/5 bg-[#0b1220]/70 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total Txns</div>
          <div className="mt-3 text-2xl font-semibold text-cyan-300">{stats.total.toLocaleString()}</div>
        </article>

        <article className="rounded-2xl border border-white/5 bg-[#0b1220]/70 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Successful</div>
          <div className="mt-3 text-2xl font-semibold text-emerald-300">{stats.successful.toLocaleString()}</div>
        </article>

        <article className="rounded-2xl border border-white/5 bg-[#0b1220]/70 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Failed</div>
          <div className="mt-3 text-2xl font-semibold text-rose-300">{stats.failed.toLocaleString()}</div>
        </article>

        <article className="rounded-2xl border border-white/5 bg-[#0b1220]/70 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total Volume</div>
          <div className="mt-3 text-2xl font-semibold text-violet-300">
            PKR {Math.round(stats.volume).toLocaleString()}
          </div>
        </article>
      </section>

      <section className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <article className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#0b1220]/70 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent" aria-hidden />
          <div className="relative">
            <div className="text-sm font-semibold text-slate-100">Daily Transaction Volume</div>
            <div className="mt-4 h-[260px]">
              <Chart type="line" data={dailyVolumeChartData} options={chartOptions} />
            </div>
          </div>
        </article>

        <article className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#0b1220]/70 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent" aria-hidden />
          <div className="relative">
            <div className="text-sm font-semibold text-slate-100">Success vs Failed</div>
            <div className="mt-4 h-[320px]">
              <Chart type="doughnut" data={donutData} options={donutOptions} />
            </div>
          </div>
        </article>
      </section>

      <div className="mt-6 text-sm font-semibold text-slate-200">
        {isFilterActive
          ? `Filtered transactions: ${filteredRows.length.toLocaleString()}`
          : `Total Transactions: ${rows.length.toLocaleString()}`}
      </div>

      {missingCreatedAtCount > 0 ? (
        <div className="mt-1 text-xs text-slate-500">Missing CreatedAt in {missingCreatedAtCount.toLocaleString()} rows</div>
      ) : null}

      <section className="mt-3 overflow-hidden rounded-2xl border border-white/5 bg-black/20">
        <DataTable
          value={filteredRows}
          loading={loading}
          dataKey="ID"
          className="!bg-transparent"
          tableClassName="!bg-transparent"
          rowHover
          size="small"
          responsiveLayout="scroll"
          scrollable
          scrollHeight="60vh"
          tableStyle={{ minWidth: "1200px" }}
          paginator
          rows={50}
          rowsPerPageOptions={[25, 50, 100, 200]}
          emptyMessage="No transactions found"
        >
          {columns.map((c) => {
            const headerClassName =
              "!border-0 !bg-transparent px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400";
            const bodyClassName = "px-4 py-3 !border-0 border-t border-white/5 text-sm text-slate-200";

            if (typeof c.value === "function") {
              return (
                <Column
                  key={c.field}
                  field={c.field}
                  header={c.header}
                  body={(row) => c.value(row)}
                  headerClassName={headerClassName}
                  bodyClassName={bodyClassName}
                />
              );
            }

            return (
              <Column
                key={c.field}
                field={c.field}
                header={c.header}
                headerClassName={headerClassName}
                bodyClassName={bodyClassName}
              />
            );
          })}
        </DataTable>
      </section>
    </div>
  );
}
