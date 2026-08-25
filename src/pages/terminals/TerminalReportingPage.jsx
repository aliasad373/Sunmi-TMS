import { useCallback, useEffect, useMemo, useState } from "react";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { Chart } from "primereact/chart";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import api from "../../network/api";

const PERIOD_OPTIONS = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last month", value: "1m" },
  { label: "Last 3 months", value: "3m" },
];

const toLocalYmd = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getCreatedAt = (row) =>
  row?.CreateDateTime ??
  row?.CreatedAt ??
  row?.CreateDate ??
  row?.createdAt ??
  row?.date ??
  null;

export default function TerminalReportingPage() {
  const [terminalRows, setTerminalRows] = useState([]);
  const [merchantRows, setMerchantRows] = useState([]);
  const [txRows, setTxRows] = useState([]);
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

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      try {
        setLoading(true);
        const [termRes, txRes, merchantsRes] = await Promise.all([
          api.get("/allTerminals"),
          api.get("/allTransactions"),
          api.get("/all-merchants"),
        ]);

        if (ignore) return;

        const terminals = Array.isArray(termRes?.data?.terminals) ? termRes.data.terminals : [];
        const tx = Array.isArray(txRes?.data?.data) ? txRes.data.data : [];
        const merchants = Array.isArray(merchantsRes?.data?.data) ? merchantsRes.data.data : [];
        setTerminalRows(terminals);
        setTxRows(tx);
        setMerchantRows(merchants);
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

  const monthLabels = useMemo(() => {
    const fmt = new Intl.DateTimeFormat("en", { month: "long" });
    return monthKeys.map((key) => {
      const [yearStr, monthStr] = key.split("-");
      const d = new Date(Number(yearStr), Number(monthStr) - 1, 1);
      return fmt.format(d);
    });
  }, [monthKeys]);

  const monthHeaders = useMemo(() => {
    const fmt = new Intl.DateTimeFormat("en", { month: "short" });
    return monthKeys.map((key) => {
      const [yearStr, monthStr] = key.split("-");
      const d = new Date(Number(yearStr), Number(monthStr) - 1, 1);
      return fmt.format(d).toUpperCase();
    });
  }, [monthKeys]);

  const typeOptions = useMemo(() => {
    const present = new Set();
    (terminalRows ?? []).forEach((t) => {
      const v = String(t?.posType ?? t?.POSType ?? t?.type ?? t?.Type ?? "").trim();
      if (v) present.add(v);
    });

    const opts = [{ label: "All Types", value: "all" }];
    Array.from(present)
      .sort((a, b) => a.localeCompare(b))
      .forEach((v) => opts.push({ label: v, value: v }));
    return opts;
  }, [terminalRows]);

  const terminalMeta = useMemo(() => {
    const map = new Map();
    (terminalRows ?? []).forEach((t) => {
      const tid = String(t?.TID ?? t?.TerminalID ?? t?.terminalId ?? "").trim();
      if (!tid) return;

      const terminalType = String(t?.posType ?? t?.POSType ?? t?.type ?? t?.Type ?? "").trim();
      const mid = String(t?.MID ?? t?.MerchantID ?? t?.merchantId ?? "").trim();
      const serialNumber = String(t?.serial_number ?? t?.SerialNumber ?? t?.serialNumber ?? "").trim();
      const location = String(
        t?.Location ?? t?.location ?? t?.Address ?? t?.address ?? t?.Branch ?? t?.branch ?? ""
      ).trim();
      const statusStr = String(t?.Status ?? t?.status ?? "").trim();
      const explicitActive = Boolean(t?.IsActive ?? t?.Active);
      const statusActive = statusStr.toLowerCase() === "active";
      const liveType = String(terminalType).toLowerCase() === "live";
      const isActive = explicitActive || statusActive || liveType;

      map.set(tid, {
        tid,
        mid,
        type: terminalType,
        serialNumber,
        location,
        active: isActive,
      });
    });
    return map;
  }, [terminalRows]);

  const merchantNameByMid = useMemo(() => {
    const map = new Map();
    (merchantRows ?? []).forEach((m) => {
      const mid = String(m?.MID ?? m?.MerchantID ?? "").trim();
      if (!mid) return;
      map.set(mid, String(m?.MerchantName ?? m?.BusinessName ?? mid));
    });
    return map;
  }, [merchantRows]);

  const filteredTerminalIds = useMemo(() => {
    const ids = new Set();
    for (const meta of terminalMeta.values()) {
      if (applied.type !== "all" && String(meta?.type ?? "") !== String(applied.type)) continue;
      ids.add(meta.tid);
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

  const stats = useMemo(() => {
    const terminals = Array.from(filteredTerminalIds);
    let active = 0;
    let inactive = 0;

    terminals.forEach((tid) => {
      const meta = terminalMeta.get(tid);
      if (!meta) {
        active += 1;
        return;
      }
      if (meta.active) active += 1;
      else inactive += 1;
    });

    const now = new Date();
    const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const txnsThisMonth = filteredTx.reduce((acc, row) => {
      const createdAt = getCreatedAt(row);
      const parsed = createdAt ? new Date(createdAt) : null;
      if (!parsed || Number.isNaN(parsed.getTime())) return acc;
      const mk = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
      return mk === thisMonthKey ? acc + 1 : acc;
    }, 0);

    return {
      totalTerminals: terminals.length,
      active,
      inactive,
      txnsThisMonth,
    };
  }, [filteredTerminalIds, filteredTx, terminalMeta]);

  const lineSeries = useMemo(() => {
    const buckets = new Map();
    monthKeys.forEach((k) => buckets.set(k, 0));

    filteredTx.forEach((row) => {
      const createdAt = getCreatedAt(row);
      const parsed = createdAt ? new Date(createdAt) : null;
      if (!parsed || Number.isNaN(parsed.getTime())) return;
      const mk = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
      if (!buckets.has(mk)) return;
      buckets.set(mk, (buckets.get(mk) ?? 0) + 1);
    });

    return monthKeys.map((k) => buckets.get(k) ?? 0);
  }, [filteredTx, monthKeys]);

  const lineData = useMemo(
    () => ({
      labels: monthLabels,
      datasets: [
        {
          label: "Txns",
          data: lineSeries,
          borderColor: "rgba(14, 165, 233, 0.95)",
          backgroundColor: "rgba(14, 165, 233, 0.25)",
          borderWidth: 2,
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: "rgba(14, 165, 233, 0.95)",
        },
      ],
    }),
    [lineSeries, monthLabels]
  );

  const chartOptions = useMemo(
    () => ({
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: "#cbd5e1",
            boxWidth: 10,
          },
        },
        tooltip: {
          backgroundColor: "rgba(15, 23, 42, 0.95)",
          titleColor: "#e2e8f0",
          bodyColor: "#e2e8f0",
          borderColor: "rgba(148, 163, 184, 0.2)",
          borderWidth: 1,
        },
      },
      scales: {
        x: {
          ticks: { color: "#94a3b8" },
          grid: { color: "rgba(148, 163, 184, 0.12)" },
        },
        y: {
          ticks: { color: "#94a3b8" },
          grid: { color: "rgba(148, 163, 184, 0.12)" },
        },
      },
    }),
    []
  );

  const donutSeries = useMemo(() => {
    const buckets = new Map();

    filteredTx.forEach((row) => {
      const tid = String(row?.TerminalID ?? row?.TID ?? "").trim();
      if (!tid) return;
      const meta = terminalMeta.get(tid);
      const label = String(meta?.type ?? "").trim() || "Unknown";
      buckets.set(label, (buckets.get(label) ?? 0) + 1);
    });

    const labels = Array.from(buckets.keys());
    const data = labels.map((l) => buckets.get(l));

    return { labels, data };
  }, [filteredTx, terminalMeta]);

  const donutData = useMemo(
    () => ({
      labels: donutSeries.labels,
      datasets: [
        {
          data: donutSeries.data,
          backgroundColor: [
            "rgba(14, 165, 233, 0.85)",
            "rgba(34, 197, 94, 0.85)",
            "rgba(168, 85, 247, 0.85)",
            "rgba(244, 63, 94, 0.85)",
            "rgba(148, 163, 184, 0.6)",
          ],
          borderColor: "rgba(2, 6, 23, 0.6)",
          borderWidth: 2,
          cutout: "70%",
        },
      ],
    }),
    [donutSeries.data, donutSeries.labels]
  );

  const donutOptions = useMemo(
    () => ({
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#cbd5e1",
            padding: 14,
            boxWidth: 10,
          },
        },
        tooltip: {
          backgroundColor: "rgba(15, 23, 42, 0.95)",
          titleColor: "#e2e8f0",
          bodyColor: "#e2e8f0",
          borderColor: "rgba(148, 163, 184, 0.2)",
          borderWidth: 1,
        },
      },
      layout: { padding: 0 },
    }),
    []
  );

  const rangeLabel = useMemo(() => {
    const startLabel = toLocalYmd(range.start);
    const endLabel = toLocalYmd(range.end);
    return `${startLabel} to ${endLabel}`;
  }, [range.end, range.start]);

  const terminalDetailRows = useMemo(() => {
    const monthCounts = new Map();

    filteredTx.forEach((row) => {
      const createdAt = getCreatedAt(row);
      const parsed = createdAt ? new Date(createdAt) : null;
      if (!parsed || Number.isNaN(parsed.getTime())) return;

      const monthKey = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
      if (!monthKeys.includes(monthKey)) return;

      const tid = String(row?.TerminalID ?? row?.TID ?? "").trim();
      if (!tid) return;

      const key = `${tid}__${monthKey}`;
      monthCounts.set(key, (monthCounts.get(key) ?? 0) + 1);
    });

    const rows = [];
    for (const tid of filteredTerminalIds) {
      const meta = terminalMeta.get(tid) ?? {
        tid,
        mid: "",
        type: "",
        serialNumber: "",
        location: "",
        active: false,
      };
      const merchantName = merchantNameByMid.get(meta.mid) ?? meta.mid ?? "-";

      const countsByMonth = {};
      monthKeys.forEach((mk) => {
        countsByMonth[mk] = monthCounts.get(`${tid}__${mk}`) ?? 0;
      });

      rows.push({
        tid,
        merchant: merchantName,
        type: meta.type || "-",
        serialNumber: meta.serialNumber || "-",
        location: meta.location || "-",
        countsByMonth,
        status: meta.active ? "Active" : "Inactive",
      });
    }

    rows.sort((a, b) => String(a.tid).localeCompare(String(b.tid)));
    return rows;
  }, [filteredTerminalIds, filteredTx, monthKeys, merchantNameByMid, terminalMeta]);

  const handleExport = () => {
    const headers = ["TerminalID", "TerminalType", "SerialNumber", "TxnCount", "Volume"];
    const lines = [headers.join(",")];

    const counts = new Map();
    const volumes = new Map();

    filteredTx.forEach((row) => {
      const tid = String(row?.TerminalID ?? row?.TID ?? "").trim();
      if (!tid) return;
      counts.set(tid, (counts.get(tid) ?? 0) + 1);
      volumes.set(tid, (volumes.get(tid) ?? 0) + parseAmount(row?.Amount));
    });

    Array.from(filteredTerminalIds).forEach((tid) => {
      const meta = terminalMeta.get(tid);
      const terminalType = String(meta?.type ?? "").trim() || "Unknown";
      const serialNumber = String(meta?.serialNumber ?? "").trim();
      const values = [
        tid,
        JSON.stringify(terminalType),
        JSON.stringify(serialNumber),
        String(counts.get(tid) ?? 0),
        String((volumes.get(tid) ?? 0).toFixed(2)),
      ];
      lines.push(values.join(","));
    });

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `terminal-reports_${toLocalYmd(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="mb-5 text-xs text-slate-500">
        Operations / Terminal / <span className="text-sky-400">Reports</span>
      </div>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Terminal Reports</h1>
          <p className="mt-1 text-sm text-slate-400">Activity and performance by terminal</p>
          <p className="mt-1 text-xs text-slate-500">Range: {rangeLabel}</p>
        </div>

        <Button
          type="button"
          label="Export CSV"
          onClick={handleExport}
          disabled={loading}
          className="!rounded-lg !border !border-sky-500/30 !bg-sky-500/15 !px-4 !py-2.5 !text-xs !font-semibold !text-sky-200 hover:!bg-sky-500/20"
        />
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#0b1220]/70 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent" aria-hidden />
        <div className="relative flex flex-wrap items-end gap-3">
          <div className="min-w-[190px]">
            <div className="mb-2 text-[11px] font-semibold tracking-wider text-slate-500">PERIOD</div>
            <Dropdown
              value={period}
              options={PERIOD_OPTIONS}
              onChange={(e) => setPeriod(e.value)}
              className="w-full !rounded-xl !border !border-white/10 !bg-black/20 !text-sm !text-slate-100"
            />
          </div>

          <div className="min-w-[190px]">
            <div className="mb-2 text-[11px] font-semibold tracking-wider text-slate-500">TYPE</div>
            <Dropdown
              value={type}
              options={typeOptions}
              onChange={(e) => setType(e.value)}
              className="w-full !rounded-xl !border !border-white/10 !bg-black/20 !text-sm !text-slate-100"
            />
          </div>

          <Button
            type="button"
            label="Apply"
            onClick={() => setApplied({ period, type })}
            className="!rounded-lg !border !border-sky-500/30 !bg-sky-500/15 !px-4 !py-2.5 !text-xs !font-semibold !text-sky-200 hover:!bg-sky-500/20"
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-white/5 bg-[#0b1220]/70 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
          <div className="text-[11px] font-semibold tracking-wider text-slate-500">TOTAL TERMINALS</div>
          <div className="mt-2 text-2xl font-semibold text-slate-100">{loading ? "-" : stats.totalTerminals}</div>
        </div>
        <div className="rounded-2xl border border-white/5 bg-[#0b1220]/70 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
          <div className="text-[11px] font-semibold tracking-wider text-slate-500">ACTIVE</div>
          <div className="mt-2 text-2xl font-semibold text-emerald-300">{loading ? "-" : stats.active}</div>
        </div>
        <div className="rounded-2xl border border-white/5 bg-[#0b1220]/70 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
          <div className="text-[11px] font-semibold tracking-wider text-slate-500">INACTIVE</div>
          <div className="mt-2 text-2xl font-semibold text-rose-300">{loading ? "-" : stats.inactive}</div>
        </div>
        <div className="rounded-2xl border border-white/5 bg-[#0b1220]/70 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
          <div className="text-[11px] font-semibold tracking-wider text-slate-500">TXNS THIS MONTH</div>
          <div className="mt-2 text-2xl font-semibold text-violet-300">{loading ? "-" : stats.txnsThisMonth.toLocaleString()}</div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/5 bg-[#0b1220]/70 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.25)] lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-100">Terminal Txns ({applied.period === "3m" ? "3 months" : "range"})</div>
              <div className="mt-1 text-xs text-slate-500">Transactions count over time</div>
            </div>
          </div>
          <div className="h-[260px]">
            <Chart type="line" data={lineData} options={chartOptions} />
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-[#0b1220]/70 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-100">Txns by Terminal Type</div>
              <div className="mt-1 text-xs text-slate-500">Distribution by posType</div>
            </div>
          </div>
          <div className="h-[260px]">
            <Chart type="doughnut" data={donutData} options={donutOptions} />
          </div>
        </div>
      </div>

      <section className="mt-6 relative overflow-hidden rounded-2xl border border-white/5 bg-[#0b1220]/70 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent" aria-hidden />
        <div className="relative">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-100">Terminal Detail</div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/5">
            <DataTable
              value={terminalDetailRows}
              dataKey="tid"
              className="!bg-transparent"
              tableClassName="!bg-transparent"
              rowHover
              size="small"
              scrollable
              scrollHeight="420px"
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
                field="serialNumber"
                header="Serial Number"
                headerClassName="!border-0 !bg-transparent px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
                bodyClassName="px-4 py-3 !border-0 border-t border-white/5 text-sm text-slate-200"
              />
              <Column
                field="location"
                header="Location"
                headerClassName="!border-0 !bg-transparent px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
                bodyClassName="px-4 py-3 !border-0 border-t border-white/5 text-sm text-slate-200"
              />

              {monthKeys.map((mk, idx) => (
                <Column
                  key={mk}
                  header={`${monthHeaders[idx]} Txns`}
                  body={(row) => row?.countsByMonth?.[mk] ?? 0}
                  headerClassName="!border-0 !bg-transparent px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
                  bodyClassName="px-4 py-3 !border-0 border-t border-white/5 text-sm text-slate-200"
                />
              ))}

              <Column
                header="Status"
                body={(row) => {
                  const active = String(row?.status ?? "").toLowerCase() === "active";
                  return (
                    <span
                      className={
                        active
                          ? "inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200"
                          : "inline-flex items-center gap-2 rounded-full bg-slate-500/15 px-3 py-1 text-xs font-semibold text-slate-200"
                      }
                    >
                      <span className={active ? "h-2 w-2 rounded-full bg-emerald-400" : "h-2 w-2 rounded-full bg-slate-400"} />
                      {active ? "Active" : "Inactive"}
                    </span>
                  );
                }}
                headerClassName="!border-0 !bg-transparent px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
                bodyClassName="px-4 py-3 !border-0 border-t border-white/5 text-sm text-slate-200"
              />
            </DataTable>
          </div>
        </div>
      </section>
    </div>
  );
}
