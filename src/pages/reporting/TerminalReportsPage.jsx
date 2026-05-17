import { useCallback, useEffect, useMemo, useState } from "react";
import { Dropdown } from "primereact/dropdown";
import { Chart } from "primereact/chart";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import api from "../../network/api";

const PERIOD_OPTIONS = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last month", value: "1m" },
  { label: "Last 3 months", value: "3m" },
];

const TYPE_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Production", value: "production" },
  { label: "Test", value: "test" },
];

const toLocalYmd = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getCreatedAt = (row) =>
  row?.CreateDateTime ?? row?.CreatedAt ?? row?.CreateDate ?? row?.createdAt ?? row?.date ?? null;

export default function TerminalReportsPage() {
  const [terminalRows, setTerminalRows] = useState([]);
  const [txRows, setTxRows] = useState([]);
  const [merchantRows, setMerchantRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [period, setPeriod] = useState("3m");
  const [type, setType] = useState("all");
  const [applied, setApplied] = useState({ period: "3m", type: "all" });

  const parseAmount = useCallback((value) => {
    if (value === null || value === undefined) return 0;
    const raw = String(value);
    const cleaned = raw.replace(/[^0-9.-]/g, "");
    const num = Number.parseFloat(cleaned);
    return Number.isFinite(num) ? num : 0;
  }, []);

  const normalizeResponseCode = useCallback((row) => {
    const raw = row?.ResponseCode ?? row?.responseCode ?? row?.RespCode ?? row?.respCode ?? "";
    const candidate = String(raw ?? "").trim();
    if (!candidate) return "";
    if (/^0+$/.test(candidate)) return "00";
    return candidate;
  }, []);

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      try {
        setLoading(true);
        const [termRes, txRes, merchantRes] = await Promise.all([
          api.get("/allTerminals"),
          api.get("/allTransactions"),
          api.get("/all-merchants"),
        ]);
        if (ignore) return;
        setTerminalRows(Array.isArray(termRes?.data?.terminals) ? termRes.data.terminals : []);
        setTxRows(Array.isArray(txRes?.data?.data) ? txRes.data.data : []);
        setMerchantRows(Array.isArray(merchantRes?.data?.data) ? merchantRes.data.data : []);
      } catch {
        if (!ignore) {
          setTerminalRows([]);
          setTxRows([]);
          setMerchantRows([]);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    load();
    return () => {
      ignore = true;
    };
  }, []);

  const terminalMeta = useMemo(() => {
    const map = new Map();
    (terminalRows ?? []).forEach((t) => {
      const tid = String(t?.TID ?? t?.TerminalID ?? t?.terminalId ?? "").trim();
      if (!tid) return;
      const typeValue = String(t?.posType ?? t?.POSType ?? t?.Type ?? t?.type ?? "").trim().toLowerCase();
      map.set(tid, {
        tid,
        mid: String(t?.MID ?? t?.MerchantID ?? t?.merchantId ?? "").trim(),
        type: typeValue,
        serialNumber: String(t?.serial_number ?? t?.SerialNumber ?? "").trim(),
        location: String(t?.Location ?? t?.location ?? t?.Branch ?? t?.branch ?? "").trim(),
        active: Boolean(t?.IsActive ?? t?.isActive ?? t?.Active ?? t?.active ?? String(t?.Status ?? "").toLowerCase() === "active"),
      });
    });
    return map;
  }, [terminalRows]);

  const merchantNameById = useMemo(() => {
    const map = new Map();
    (merchantRows ?? []).forEach((m) => {
      const mid = String(m?.MID ?? m?.MerchantID ?? "").trim();
      if (!mid) return;
      map.set(mid, String(m?.MerchantName ?? m?.BusinessName ?? mid).trim());
    });
    return map;
  }, [merchantRows]);

  const range = useMemo(() => {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    if (applied.period === "7d") {
      start.setDate(start.getDate() - 6);
      return { start, end };
    }

    if (applied.period === "1m") {
      start.setMonth(start.getMonth() - 1);
      return { start, end };
    }

    start.setMonth(start.getMonth() - 3);
    return { start, end };
  }, [applied.period]);

  const filteredTerminalIds = useMemo(() => {
    const ids = new Set();
    for (const [tid, meta] of terminalMeta.entries()) {
      if (applied.type !== "all" && meta.type !== String(applied.type)) continue;
      ids.add(tid);
    }

    if (ids.size === 0 && applied.type === "all") {
      (txRows ?? []).forEach((t) => {
        const tid = String(t?.TerminalID ?? t?.TID ?? "").trim();
        if (tid) ids.add(tid);
      });
    }

    return ids;
  }, [applied.type, terminalMeta, txRows]);

  const filteredTx = useMemo(() => {
    const { start, end } = range;
    return (txRows ?? []).filter((row) => {
      const createdAt = getCreatedAt(row);
      if (!createdAt) return false;
      const parsed = new Date(createdAt);
      if (Number.isNaN(parsed.getTime())) return false;
      if (parsed < start || parsed > end) return false;

      const tid = String(row?.TerminalID ?? row?.TID ?? "").trim();
      if (!tid) return false;
      if (!filteredTerminalIds.has(tid)) return false;

      return true;
    });
  }, [filteredTerminalIds, range, txRows]);

  const monthKeys = useMemo(() => {
    const count = applied.period === "1m" ? 1 : applied.period === "7d" ? 1 : 3;
    const end = new Date(range.end);
    const anchor = new Date(end.getFullYear(), end.getMonth(), 1);
    const keys = [];
    for (let i = count - 1; i >= 0; i -= 1) {
      const d = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1);
      keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    return keys;
  }, [applied.period, range.end]);

  const monthHeaders = useMemo(() => {
    const fmt = new Intl.DateTimeFormat("en", { month: "short" });
    return monthKeys.map((key) => {
      const [yearStr, monthStr] = key.split("-");
      const d = new Date(Number(yearStr), Number(monthStr) - 1, 1);
      return fmt.format(d).toUpperCase();
    });
  }, [monthKeys]);

  const terminalSummary = useMemo(() => {
    const counts = new Map();
    const successCounts = new Map();
    const failedCounts = new Map();
    const volumes = new Map();
    const monthCounts = new Map();

    filteredTx.forEach((row) => {
      const tid = String(row?.TerminalID ?? row?.TID ?? "").trim();
      if (!tid) return;

      const createdAt = getCreatedAt(row);
      const parsed = createdAt ? new Date(createdAt) : null;
      if (parsed && !Number.isNaN(parsed.getTime())) {
        const monthKey = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
        if (monthKeys.includes(monthKey)) {
          monthCounts.set(`${tid}__${monthKey}`, (monthCounts.get(`${tid}__${monthKey}`) ?? 0) + 1);
        }
      }

      counts.set(tid, (counts.get(tid) ?? 0) + 1);
      volumes.set(tid, (volumes.get(tid) ?? 0) + parseAmount(row?.Amount));

      const ok = normalizeResponseCode(row) === "00";
      if (ok) successCounts.set(tid, (successCounts.get(tid) ?? 0) + 1);
      else failedCounts.set(tid, (failedCounts.get(tid) ?? 0) + 1);
    });

    const rows = [];
    for (const tid of filteredTerminalIds) {
      const meta = terminalMeta.get(tid) ?? { tid, mid: "", type: "", serialNumber: "", location: "", active: false };
      const total = counts.get(tid) ?? 0;
      const success = successCounts.get(tid) ?? 0;
      const failed = failedCounts.get(tid) ?? (total - success);
      const volume = volumes.get(tid) ?? 0;
      const successRate = total > 0 ? (success / total) * 100 : 0;

      const countsByMonth = {};
      monthKeys.forEach((mk) => {
        countsByMonth[mk] = monthCounts.get(`${tid}__${mk}`) ?? 0;
      });

      rows.push({
        tid,
        mid: meta.mid,
        merchant: merchantNameById.get(meta.mid) ?? meta.mid,
        type: meta.type,
        serialNumber: meta.serialNumber,
        location: meta.location,
        status: meta.active ? "Active" : "Inactive",
        total,
        success,
        failed,
        volume,
        successRate,
        countsByMonth,
      });
    }

    rows.sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));
    return rows;
  }, [filteredTerminalIds, filteredTx, merchantNameById, monthKeys, normalizeResponseCode, parseAmount, terminalMeta]);

  const stats = useMemo(() => {
    let totalTxns = 0;
    let successful = 0;
    let failed = 0;
    let volume = 0;

    (filteredTx ?? []).forEach((r) => {
      if (!r || typeof r !== "object") return;
      totalTxns += 1;
      const ok = normalizeResponseCode(r) === "00";
      if (ok) successful += 1;
      else failed += 1;
      volume += parseAmount(r?.Amount);
    });

    const totalTerminals = filteredTerminalIds.size;
    const activeTerminals = Array.from(filteredTerminalIds).filter((tid) => terminalMeta.get(tid)?.active).length;
    const inactiveTerminals = totalTerminals - activeTerminals;

    const lastMonthKey = monthKeys[monthKeys.length - 1];
    const lastMonthCount = lastMonthKey
      ? terminalSummary.reduce((acc, t) => acc + (t?.countsByMonth?.[lastMonthKey] ?? 0), 0)
      : totalTxns;
    const avgTxnsPerTerminal = totalTerminals > 0 ? lastMonthCount / totalTerminals : 0;

    return {
      totalTerminals,
      activeTerminals,
      inactiveTerminals,
      totalTxns,
      successful,
      failed,
      volume,
      lastMonthCount,
      avgTxnsPerTerminal,
    };
  }, [filteredTerminalIds, filteredTx, monthKeys, normalizeResponseCode, parseAmount, terminalMeta, terminalSummary]);

  const activityTrend = useMemo(() => {
    const totalsByMonth = new Map(monthKeys.map((k) => [k, 0]));
    terminalSummary.forEach((t) => {
      monthKeys.forEach((mk) => {
        totalsByMonth.set(mk, (totalsByMonth.get(mk) ?? 0) + (t?.countsByMonth?.[mk] ?? 0));
      });
    });
    const values = monthKeys.map((k) => totalsByMonth.get(k) ?? 0);
    return { labels: monthHeaders, values };
  }, [monthHeaders, monthKeys, terminalSummary]);

  const trendData = useMemo(
    () => ({
      labels: activityTrend.labels,
      datasets: [
        {
          label: "Txns",
          data: activityTrend.values,
          tension: 0.35,
          fill: true,
          borderColor: "rgba(34,211,238,0.9)",
          backgroundColor: "rgba(34,211,238,0.12)",
          pointRadius: 3,
          pointHoverRadius: 4,
        },
      ],
    }),
    [activityTrend]
  );

  const typeDistribution = useMemo(() => {
    const buckets = new Map();
    for (const tid of filteredTerminalIds) {
      const t = terminalMeta.get(tid);
      const key = String(t?.type ?? "").trim() || "Unknown";
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    const labels = Array.from(buckets.keys());
    const data = labels.map((l) => buckets.get(l));
    return { labels, data };
  }, [filteredTerminalIds, terminalMeta]);

  const typeDonutData = useMemo(
    () => ({
      labels: typeDistribution.labels,
      datasets: [
        {
          data: typeDistribution.data,
          backgroundColor: [
            "rgba(14, 165, 233, 0.85)",
            "rgba(34, 197, 94, 0.85)",
            "rgba(168, 85, 247, 0.85)",
            "rgba(244, 63, 94, 0.85)",
            "rgba(148, 163, 184, 0.6)",
          ],
          borderColor: "rgba(2, 6, 23, 0.6)",
          borderWidth: 2,
          cutout: "72%",
        },
      ],
    }),
    [typeDistribution.data, typeDistribution.labels]
  );

  const successDonutData = useMemo(
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
          ticks: { color: "rgba(255,255,255,0.6)", callback: (v) => `PKR ${Number(v).toLocaleString()}` },
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

  const rangeLabel = useMemo(() => {
    const start = toLocalYmd(range.start);
    const end = toLocalYmd(range.end);
    return `${start} to ${end}`;
  }, [range.end, range.start]);

  const applyFilters = () => setApplied({ period, type });

  const joinClasses = (...classes) => classes.filter(Boolean).join(" ");

  const handleExport = () => {
    const headers = [
      "TerminalID",
      "Merchant",
      "Type",
      "Location",
      ...monthHeaders.map((h) => `${h} Txns`),
      "Volume",
      "Status",
    ];

    const lines = [headers.join(",")];
    terminalSummary.forEach((t) => {
      const values = [
        t.tid,
        JSON.stringify(t.merchant ?? ""),
        JSON.stringify(t.type ?? ""),
        JSON.stringify(t.location ?? ""),
        ...monthKeys.map((mk) => String(t?.countsByMonth?.[mk] ?? 0)),
        String((t.volume ?? 0).toFixed(2)),
        t.status,
      ];
      lines.push(values.join(","));
    });

    const csv = lines.join("\n");
    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `terminal-report_${rangeLabel}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="mb-5 text-xs text-slate-500">
        Reports / <span className="text-sky-400">Terminal Report</span>
      </div>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Terminal Report</h1>
          <p className="mt-1 text-sm text-slate-400">Terminal usage and health analytics</p>
          <p className="mt-1 text-xs text-slate-500">Range: {rangeLabel}</p>
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={loading || terminalSummary.length === 0}
          className={joinClasses(
            "inline-flex items-center justify-center rounded-xl px-4 py-2 text-xs font-semibold",
            loading || terminalSummary.length === 0
              ? "cursor-not-allowed border border-white/10 bg-white/5 text-slate-400"
              : "border border-cyan-400/40 bg-cyan-400/90 text-slate-950 hover:bg-cyan-300"
          )}
        >
          Export CSV
        </button>
      </div>

      <section className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#0b1220]/70 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent" aria-hidden />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            <div>
              <div className="mb-2 text-[11px] font-semibold text-slate-400">Period</div>
              <Dropdown
                value={period}
                options={PERIOD_OPTIONS}
                onChange={(e) => setPeriod(e.value)}
                className="w-full !h-10 !rounded-xl !border !border-white/10 !bg-black/20 !text-sm !text-slate-100"
              />
            </div>

            <div>
              <div className="mb-2 text-[11px] font-semibold text-slate-400">Type</div>
              <Dropdown
                value={type}
                options={TYPE_OPTIONS}
                onChange={(e) => setType(e.value)}
                className="w-full !h-10 !rounded-xl !border !border-white/10 !bg-black/20 !text-sm !text-slate-100"
              />
            </div>

            <div className="flex items-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setPeriod("3m");
                  setType("all");
                  setApplied({ period: "3m", type: "all" });
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

          <div className="text-xs text-slate-500">{loading ? "Loading…" : ""}</div>
        </div>
      </section>

      <section className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-2xl border border-white/5 bg-[#0b1220]/70 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Terminals</div>
          <div className="mt-3 text-2xl font-semibold text-cyan-300">{stats.totalTerminals.toLocaleString()}</div>
        </article>

        <article className="rounded-2xl border border-white/5 bg-[#0b1220]/70 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Active</div>
          <div className="mt-3 text-2xl font-semibold text-emerald-300">{stats.activeTerminals.toLocaleString()}</div>
        </article>

        <article className="rounded-2xl border border-white/5 bg-[#0b1220]/70 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{monthHeaders[monthHeaders.length - 1] ?? ""} Txns</div>
          <div className="mt-3 text-2xl font-semibold text-violet-300">{stats.lastMonthCount.toLocaleString()}</div>
        </article>

        <article className="rounded-2xl border border-white/5 bg-[#0b1220]/70 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Avg Txns/Terminal</div>
          <div className="mt-3 text-2xl font-semibold text-amber-300">
            {Math.round(stats.avgTxnsPerTerminal).toLocaleString()}
          </div>
        </article>
      </section>

      <section className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <article className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#0b1220]/70 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent" aria-hidden />
          <div className="relative">
            <div className="text-sm font-semibold text-slate-100">Terminal Activity Trend</div>
            <div className="mt-4 h-[260px]">
              <Chart type="line" data={trendData} options={chartOptions} />
            </div>
          </div>
        </article>

        <article className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#0b1220]/70 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent" aria-hidden />
          <div className="relative">
            <div className="text-sm font-semibold text-slate-100">Terminal Types Distribution</div>
            <div className="mt-4 h-[260px]">
              <Chart type="doughnut" data={typeDonutData} options={donutOptions} />
            </div>
          </div>
        </article>
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-white/5 bg-white/5">
        <div className="border-b border-white/5 px-5 py-4">
          <div className="text-sm font-semibold text-slate-100">Terminal Report Detail</div>
        </div>
        <DataTable
          value={terminalSummary}
          loading={loading}
          dataKey="tid"
          className="!bg-transparent"
          tableClassName="!bg-transparent"
          rowHover
          size="small"
          responsiveLayout="scroll"
          paginator
          rows={50}
          rowsPerPageOptions={[25, 50, 100, 200]}
          paginatorClassName="!border-0 !bg-transparent border-t border-white/5"
          emptyMessage="No terminals found"
        >
          <Column
            field="tid"
            header="Terminal ID"
            headerClassName="!border-0 !bg-transparent px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
            bodyClassName="px-4 py-3 !border-0 border-t border-white/5 text-sm text-slate-200"
          />
          <Column
            field="merchant"
            header="Merchant"
            headerClassName="!border-0 !bg-transparent px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
            bodyClassName="px-4 py-3 !border-0 border-t border-white/5 text-sm text-slate-200"
          />
          <Column
            field="type"
            header="Type"
            headerClassName="!border-0 !bg-transparent px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
            bodyClassName="px-4 py-3 !border-0 border-t border-white/5 text-sm text-slate-200"
          />
          <Column
            field="location"
            header="Location"
            headerClassName="!border-0 !bg-transparent px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
            bodyClassName="px-4 py-3 !border-0 border-t border-white/5 text-sm text-slate-200"
          />
          <Column
            field="serialNumber"
            header="Serial Number"
            headerClassName="!border-0 !bg-transparent px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
            bodyClassName="px-4 py-3 !border-0 border-t border-white/5 text-sm text-slate-200"
          />

          {monthKeys.map((mk, idx) => (
            <Column
              key={mk}
              header={`${monthHeaders[idx] ?? mk} Txns`}
              body={(row) => String(row?.countsByMonth?.[mk] ?? 0)}
              headerClassName="!border-0 !bg-transparent px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
              bodyClassName="px-4 py-3 !border-0 border-t border-white/5 text-sm text-slate-200"
            />
          ))}

          <Column
            field="volume"
            header="Volume"
            body={(row) => `PKR ${Math.round(row?.volume ?? 0).toLocaleString()}`}
            headerClassName="!border-0 !bg-transparent px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
            bodyClassName="px-4 py-3 !border-0 border-t border-white/5 text-sm text-slate-200"
          />
          <Column
            field="status"
            header="Status"
            headerClassName="!border-0 !bg-transparent px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
            bodyClassName="px-4 py-3 !border-0 border-t border-white/5 text-sm text-slate-200"
          />
        </DataTable>
      </section>
    </div>
  );
}
