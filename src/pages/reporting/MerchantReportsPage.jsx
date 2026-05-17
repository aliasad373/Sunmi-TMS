import { useEffect, useMemo, useState, useCallback } from "react";
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

const CATEGORY_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Kissan Merchant", value: "1" },
  { label: "Livestock Merchant", value: "2" },
  { label: "Ration Card Merchant", value: "3" },
  { label: "Other", value: "0" },
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

export default function MerchantReportsPage() {
  const [merchantRows, setMerchantRows] = useState([]);
  const [txRows, setTxRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [period, setPeriod] = useState("3m");
  const [category, setCategory] = useState("all");
  const [applied, setApplied] = useState({ period: "3m", category: "all" });

  const parseAmount = useCallback((value) => {
    if (value === null || value === undefined) return 0;
    const raw = String(value);
    const cleaned = raw.replace(/[^0-9.-]/g, "");
    const num = Number.parseFloat(cleaned);
    return Number.isFinite(num) ? num : 0;
  }, []);

  const getMerchantActive = useCallback((m) => {
    const raw = m?.IsActive ?? m?.isActive ?? m?.Active ?? m?.active ?? null;
    if (raw !== null && raw !== undefined) {
      if (typeof raw === "boolean") return raw;
      if (typeof raw === "number") return raw === 1;
      const s = String(raw).trim().toLowerCase();
      if (s === "1" || s === "true" || s === "yes") return true;
      if (s === "0" || s === "false" || s === "no") return false;
    }

    const status = String(m?.Status ?? m?.status ?? "").trim().toLowerCase();
    if (!status) return false;
    if (status === "active") return true;
    if (status === "inactive") return false;
    return status.includes("active") && !status.includes("in");
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
        const [merchantsRes, txRes] = await Promise.all([
          api.get("/all-merchants"),
          api.get("/allTransactions"),
        ]);

        if (ignore) return;

        if (import.meta?.env?.DEV) {
          const sample = Array.isArray(merchantsRes?.data?.data) ? merchantsRes.data.data?.[0] : null;
          if (sample) {
            // eslint-disable-next-line no-console
            console.log("/all-merchants sample:", sample);
            // eslint-disable-next-line no-console
            console.log("/all-merchants keys:", Object.keys(sample));
          }
        }

        setMerchantRows(Array.isArray(merchantsRes?.data?.data) ? merchantsRes.data.data : []);
        setTxRows(Array.isArray(txRes?.data?.data) ? txRes.data.data : []);
      } catch {
        if (!ignore) {
          setMerchantRows([]);
          setTxRows([]);
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

  const merchantMeta = useMemo(() => {
    const map = new Map();
    (merchantRows ?? []).forEach((m) => {
      const mid = String(m?.MID ?? m?.MerchantID ?? "").trim();
      if (!mid) return;
      const type = String(m?.flag ?? m?.Flag ?? m?.mType ?? "").trim();
      map.set(mid, {
        mid,
        name: String(m?.MerchantName ?? m?.BusinessName ?? mid),
        city: String(m?.City ?? m?.city ?? m?.Town ?? m?.town ?? "").trim(),
        category: type,
        active: getMerchantActive(m),
      });
    });
    return map;
  }, [getMerchantActive, merchantRows]);

  const monthKeys = useMemo(() => {
    const count = applied.period === "1m" ? 1 : applied.period === "7d" ? 1 : 3;
    const end = new Date(range.end);
    const anchor = new Date(end.getFullYear(), end.getMonth(), 1);
    const keys = [];

    for (let i = count - 1; i >= 0; i -= 1) {
      const d = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      keys.push(key);
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

  const filteredMerchantIds = useMemo(() => {
    const ids = new Set();
    for (const [mid, meta] of merchantMeta.entries()) {
      if (applied.category !== "all" && meta.category !== String(applied.category)) continue;
      ids.add(mid);
    }

    if (ids.size === 0 && applied.category === "all") {
      // fallback: if merchant api didn't return data, use tx-based MIDs
      (txRows ?? []).forEach((t) => {
        const mid = String(t?.MerchantID ?? t?.MID ?? "").trim();
        if (mid) ids.add(mid);
      });
    }

    return ids;
  }, [applied.category, merchantMeta, txRows]);

  const filteredTx = useMemo(() => {
    const { start, end } = range;

    return (txRows ?? []).filter((row) => {
      const createdAt = getCreatedAt(row);
      if (!createdAt) return false;
      const parsed = new Date(createdAt);
      if (Number.isNaN(parsed.getTime())) return false;
      if (parsed < start || parsed > end) return false;

      const mid = String(row?.MerchantID ?? row?.MID ?? "").trim();
      if (!mid) return false;
      if (!filteredMerchantIds.has(mid)) return false;

      return true;
    });
  }, [filteredMerchantIds, range, txRows]);

  const merchantSummary = useMemo(() => {
    const counts = new Map();
    const successCounts = new Map();
    const volumes = new Map();

    filteredTx.forEach((row) => {
      const mid = String(row?.MerchantID ?? row?.MID ?? "").trim();
      if (!mid) return;

      counts.set(mid, (counts.get(mid) ?? 0) + 1);
      volumes.set(mid, (volumes.get(mid) ?? 0) + parseAmount(row?.Amount));

      const success = normalizeResponseCode(row) === "00";
      if (success) successCounts.set(mid, (successCounts.get(mid) ?? 0) + 1);
    });

    const rows = [];
    for (const mid of filteredMerchantIds) {
      const meta = merchantMeta.get(mid) ?? { mid, name: mid, category: "" };
      const total = counts.get(mid) ?? 0;
      const success = successCounts.get(mid) ?? 0;
      const volume = volumes.get(mid) ?? 0;
      const successRate = total > 0 ? (success / total) * 100 : 0;

      rows.push({
        mid,
        name: meta.name,
        category: meta.category,
        total,
        success,
        failed: total - success,
        volume,
        successRate,
        active: meta.active,
      });
    }

    return rows;
  }, [filteredMerchantIds, filteredTx, merchantMeta, normalizeResponseCode, parseAmount]);

  const stats = useMemo(() => {
    const totalMerchants = merchantSummary.length;
    const active = merchantSummary.filter((m) => m.active).length;
    const inactive = totalMerchants - active;

    const totalVolume = merchantSummary.reduce((acc, m) => acc + (m.volume ?? 0), 0);

    return { totalMerchants, active, inactive, totalVolume };
  }, [merchantSummary]);

  const topMerchants = useMemo(() => {
    const list = [...merchantSummary];
    list.sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));
    return list.slice(0, 6);
  }, [merchantSummary]);

  const categoryLabelMap = useMemo(() => {
    const map = new Map();
    CATEGORY_OPTIONS.forEach((opt) => {
      map.set(String(opt.value), opt.label);
    });
    return map;
  }, []);

  const categoryBreakdown = useMemo(() => {
    const buckets = new Map();
    merchantSummary.forEach((m) => {
      const raw = String(m.category ?? "").trim();
      const key = categoryLabelMap.get(raw) ?? (raw || "Other");
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    });

    const labels = Array.from(buckets.keys());
    const data = labels.map((l) => buckets.get(l));

    return { labels, data };
  }, [categoryLabelMap, merchantSummary]);

  const merchantDetailRows = useMemo(() => {
    const monthCounts = new Map();
    const volumes = new Map();

    filteredTx.forEach((row) => {
      const createdAt = getCreatedAt(row);
      const parsed = createdAt ? new Date(createdAt) : null;
      if (!parsed || Number.isNaN(parsed.getTime())) return;

      const monthKey = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
      if (!monthKeys.includes(monthKey)) return;

      const mid = String(row?.MerchantID ?? row?.MID ?? "").trim();
      if (!mid) return;

      const key = `${mid}__${monthKey}`;
      monthCounts.set(key, (monthCounts.get(key) ?? 0) + 1);
      volumes.set(mid, (volumes.get(mid) ?? 0) + parseAmount(row?.Amount));
    });

    const rows = [];
    for (const mid of filteredMerchantIds) {
      const meta = merchantMeta.get(mid) ?? { mid, name: mid, category: "", city: "", active: false };
      const city = meta.city || "-";
      const categoryValue = String(meta.category ?? "").trim();
      const categoryLabel = categoryLabelMap.get(categoryValue) ?? (categoryValue || "Unknown");

      const countsByMonth = {};
      monthKeys.forEach((mk) => {
        countsByMonth[mk] = monthCounts.get(`${mid}__${mk}`) ?? 0;
      });

      rows.push({
        mid,
        merchant: meta.name,
        city,
        category: categoryLabel,
        countsByMonth,
        volume: volumes.get(mid) ?? 0,
        status: meta.active ? "Active" : "Inactive",
      });
    }

    rows.sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));
    return rows;
  }, [categoryLabelMap, filteredMerchantIds, filteredTx, merchantMeta, monthKeys, parseAmount]);

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
          ticks: {
            color: "#94a3b8",
            autoSkip: true,
            maxRotation: 0,
            minRotation: 0,
            callback: function (value) {
              const label = this.getLabelForValue(value);
              if (typeof label !== "string") return label;
              const trimmed = label.trim();
              return trimmed.length > 12 ? `${trimmed.slice(0, 12)}…` : trimmed;
            },
          },
          grid: { color: "rgba(148, 163, 184, 0.12)" },
        },
        y: {
          ticks: {
            color: "#94a3b8",
            callback: (value) => `PKR ${Number(value).toLocaleString()}`,
          },
          grid: { color: "rgba(148, 163, 184, 0.12)" },
        },
      },
    }),
    []
  );

  const barData = useMemo(
    () => ({
      labels: topMerchants.map((m) => m.name),
      datasets: [
        {
          label: "Volume",
          data: topMerchants.map((m) => Number(m.volume ?? 0)),
          backgroundColor: "rgba(14, 165, 233, 0.55)",
          borderColor: "rgba(14, 165, 233, 0.95)",
          borderWidth: 1,
          borderRadius: 10,
          maxBarThickness: 46,
        },
      ],
    }),
    [topMerchants]
  );

  const donutData = useMemo(
    () => ({
      labels: categoryBreakdown.labels,
      datasets: [
        {
          data: categoryBreakdown.data,
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
    [categoryBreakdown.data, categoryBreakdown.labels]
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

  const handleExport = () => {
    const headers = [
      "MerchantID",
      "MerchantName",
      "Category",
      "TxnCount",
      "SuccessCount",
      "FailedCount",
      "SuccessRate(%)",
      "Volume",
    ];

    const lines = [headers.join(",")];

    merchantSummary.forEach((m) => {
      const values = [
        m.mid,
        JSON.stringify(m.name ?? ""),
        JSON.stringify(String(m.category ?? "")),
        String(m.total ?? 0),
        String(m.success ?? 0),
        String(m.failed ?? 0),
        (m.successRate ?? 0).toFixed(2),
        (m.volume ?? 0).toFixed(2),
      ];
      lines.push(values.join(","));
    });

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `merchant-reports_${toLocalYmd(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const rangeLabel = useMemo(() => {
    const startLabel = toLocalYmd(range.start);
    const endLabel = toLocalYmd(range.end);
    return `${startLabel} to ${endLabel}`;
  }, [range.end, range.start]);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="mb-5 text-xs text-slate-500">
        Operations / Merchant / <span className="text-sky-400">Reports</span>
      </div>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Merchant Reports</h1>
          <p className="mt-1 text-sm text-slate-400">Performance analytics for all merchants</p>
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
            <div className="mb-2 text-[11px] font-semibold tracking-wider text-slate-500">CATEGORY</div>
            <Dropdown
              value={category}
              options={CATEGORY_OPTIONS}
              onChange={(e) => setCategory(e.value)}
              className="w-full !rounded-xl !border !border-white/10 !bg-black/20 !text-sm !text-slate-100"
            />
          </div>

          <Button
            type="button"
            label="Apply"
            onClick={() => setApplied({ period, category })}
            className="!rounded-lg !border !border-sky-500/30 !bg-sky-500/15 !px-4 !py-2.5 !text-xs !font-semibold !text-sky-200 hover:!bg-sky-500/20"
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-white/5 bg-[#0b1220]/70 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
          <div className="text-[11px] font-semibold tracking-wider text-slate-500">TOTAL MERCHANTS</div>
          <div className="mt-2 text-2xl font-semibold text-slate-100">{loading ? "-" : stats.totalMerchants}</div>
          <div className="mt-1 text-xs text-slate-500">Registered</div>
        </div>
        <div className="rounded-2xl border border-white/5 bg-[#0b1220]/70 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
          <div className="text-[11px] font-semibold tracking-wider text-slate-500">ACTIVE</div>
          <div className="mt-2 text-2xl font-semibold text-emerald-300">{loading ? "-" : stats.active}</div>
          <div className="mt-1 text-xs text-slate-500">Active profile</div>
        </div>
        <div className="rounded-2xl border border-white/5 bg-[#0b1220]/70 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
          <div className="text-[11px] font-semibold tracking-wider text-slate-500">INACTIVE</div>
          <div className="mt-2 text-2xl font-semibold text-rose-300">{loading ? "-" : stats.inactive}</div>
          <div className="mt-1 text-xs text-slate-500">No recent activity</div>
        </div>
        <div className="rounded-2xl border border-white/5 bg-[#0b1220]/70 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
          <div className="text-[11px] font-semibold tracking-wider text-slate-500">TOTAL VOLUME</div>
          <div className="mt-2 text-2xl font-semibold text-violet-300">
            {loading ? "-" : `PKR ${stats.totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          </div>
          <div className="mt-1 text-xs text-slate-500">Selected range</div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/5 bg-[#0b1220]/70 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.25)] lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-100">Top Merchants by Volume</div>
              <div className="mt-1 text-xs text-slate-500">Based on filtered transactions</div>
            </div>
          </div>
          <div className="h-[260px]">
            <Chart type="bar" data={barData} options={chartOptions} />
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-[#0b1220]/70 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-100">Category Breakdown</div>
              <div className="mt-1 text-xs text-slate-500">Merchants by category</div>
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
              <div className="text-sm font-semibold text-slate-100">Merchant Detail Report</div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/5 bg-black/20">
            <DataTable
              value={merchantDetailRows}
              dataKey="mid"
              className="!bg-transparent"
              tableClassName="!bg-transparent"
              rowHover
              size="small"
              scrollable
              scrollHeight="420px"
              emptyMessage="No merchants found"
            >
              <Column
                field="mid"
                header="Merchant"
                headerClassName="!border-0 !bg-transparent px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
                bodyClassName="px-4 py-3 !border-0 border-t border-white/5 text-sm text-slate-200"
              />
              <Column
                field="city"
                header="City"
                headerClassName="!border-0 !bg-transparent px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
                bodyClassName="px-4 py-3 !border-0 border-t border-white/5 text-sm text-slate-200"
              />
              <Column
                field="category"
                header="Category"
                headerClassName="!border-0 !bg-transparent px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
                bodyClassName="px-4 py-3 !border-0 border-t border-white/5 text-sm text-slate-200"
              />

              {monthKeys.map((mk, idx) => (
                <Column
                  key={mk}
                  header={`Txns ${monthHeaders[idx]}`}
                  body={(row) => row?.countsByMonth?.[mk] ?? 0}
                  headerClassName="!border-0 !bg-transparent px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
                  bodyClassName="px-4 py-3 !border-0 border-t border-white/5 text-sm text-slate-200"
                />
              ))}

              <Column
                header="Volume (PKR)"
                body={(row) => `PKR ${Number(row?.volume ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                headerClassName="!border-0 !bg-transparent px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
                bodyClassName="px-4 py-3 !border-0 border-t border-white/5 text-sm text-slate-200"
              />

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
