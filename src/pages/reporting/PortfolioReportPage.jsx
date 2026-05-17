import { useEffect, useMemo, useState, useCallback } from "react";
import { Chart } from "primereact/chart";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import api from "../../network/api";

const toLocalYmd = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const formatMonthLabel = (key) => {
  const [y, m] = String(key).split("-");
  const idx = Number(m) - 1;
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${monthNames[idx] ?? m} ${y}`;
};

const getCreatedAt = (row) =>
  row?.CreateDateTime ?? row?.CreatedAt ?? row?.CreateDate ?? row?.createdAt ?? row?.created_at ?? row?.date ?? null;

const parseAmount = (value) => {
  if (value === null || value === undefined) return 0;
  const raw = String(value);
  const cleaned = raw.replace(/[^0-9.-]/g, "");
  const num = Number.parseFloat(cleaned);
  return Number.isFinite(num) ? num : 0;
};

const asLower = (v) => String(v ?? "").trim().toLowerCase();

const isTxnSuccess = (t) => {
  const direct = t?.isSuccess ?? t?.IsSuccess;
  if (typeof direct === "boolean") return direct;
  const code = String(t?.ResponseCode ?? t?.RespCode ?? t?.responseCode ?? t?.respCode ?? t?.Code ?? "").trim();
  if (code) {
    const c = code.toLowerCase();
    if (c === "00" || c === "0" || c === "000" || c === "success" || c === "approved") return true;
  }
  const status = asLower(t?.Status ?? t?.status ?? t?.TxnStatus ?? t?.txnStatus ?? "");
  if (status) {
    if (status.includes("success") || status.includes("approved")) return true;
    if (status.includes("fail") || status.includes("declin") || status.includes("reject")) return false;
  }
  return false;
};

const csvEscape = (value) => {
  if (value === null || value === undefined) return "";
  const str = String(value);
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
};

export default function PortfolioReportPage() {
  const [merchantRows, setMerchantRows] = useState([]);
  const [terminalRows, setTerminalRows] = useState([]);
  const [txRows, setTxRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const joinClasses = (...classes) => classes.filter(Boolean).join(" ");

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      try {
        setLoading(true);
        const [merRes, termRes, txRes] = await Promise.all([
          api.get("/all-merchants"),
          api.get("/allTerminals"),
          api.get("/allTransactions"),
        ]);

        if (ignore) return;
        setMerchantRows(Array.isArray(merRes?.data?.data) ? merRes.data.data : []);
        setTerminalRows(Array.isArray(termRes?.data?.terminals) ? termRes.data.terminals : []);
        setTxRows(Array.isArray(txRes?.data?.data) ? txRes.data.data : []);
      } catch {
        if (!ignore) {
          setMerchantRows([]);
          setTerminalRows([]);
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
    if (status === "active") return true;
    if (status === "inactive") return false;
    return Boolean(status);
  }, []);

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

  const monthKeys = useMemo(() => {
    const now = new Date();
    const keys = [];
    for (let i = 2; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keys.push(monthKey(d));
    }
    return keys;
  }, []);

  const monthLabels = useMemo(() => monthKeys.map(formatMonthLabel), [monthKeys]);

  const monthRange = useMemo(() => {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }, []);

  const monthFilteredTx = useMemo(() => {
    const { start, end } = monthRange;
    return (txRows ?? []).filter((t) => {
      const createdAt = getCreatedAt(t);
      if (!createdAt) return false;
      const d = new Date(createdAt);
      if (Number.isNaN(d.getTime())) return false;
      return d >= start && d <= end;
    });
  }, [monthRange, txRows]);

  const merchantNameById = useMemo(() => {
    const map = new Map();
    (merchantRows ?? []).forEach((m) => {
      const mid = String(m?.MID ?? m?.MerchantID ?? "").trim();
      if (!mid) return;
      map.set(mid, String(m?.MerchantName ?? m?.BusinessName ?? mid).trim());
    });
    return map;
  }, [merchantRows]);

  const merchantCityById = useMemo(() => {
    const map = new Map();
    (merchantRows ?? []).forEach((m) => {
      const mid = String(m?.MID ?? m?.MerchantID ?? "").trim();
      if (!mid) return;
      const city = String(m?.City ?? m?.city ?? m?.MerchantCity ?? m?.merchantCity ?? "").trim();
      if (city) map.set(mid, city);
    });
    return map;
  }, [merchantRows]);

  const terminalCountByMerchant = useMemo(() => {
    const map = new Map();
    (terminalRows ?? []).forEach((t) => {
      const mid = String(t?.MerchantID ?? t?.MID ?? t?.merchantId ?? "").trim();
      if (!mid) return;
      map.set(mid, (map.get(mid) ?? 0) + 1);
    });
    return map;
  }, [terminalRows]);

  const merchantPortfolio = useMemo(() => {
    const counts = new Map();
    const volumes = new Map();

    monthFilteredTx.forEach((t) => {
      const mid = String(t?.MerchantID ?? t?.MID ?? "").trim();
      if (!mid) return;
      counts.set(mid, (counts.get(mid) ?? 0) + 1);
      volumes.set(mid, (volumes.get(mid) ?? 0) + parseAmount(t?.Amount));
    });

    const merchantIds = new Set(
      (merchantRows ?? [])
        .map((m) => String(m?.MID ?? m?.MerchantID ?? "").trim())
        .filter(Boolean)
    );

    if (merchantIds.size === 0) {
      for (const mid of counts.keys()) merchantIds.add(mid);
    }

    const rows = [];
    for (const mid of merchantIds) {
      const count = counts.get(mid) ?? 0;
      const volume = volumes.get(mid) ?? 0;
      rows.push({
        mid,
        name: merchantNameById.get(mid) ?? mid,
        txns: count,
        volume,
      });
    }
    rows.sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));

    const segments = { high: 0, medium: 0, low: 0, inactive: 0 };
    rows.forEach((m) => {
      const c = Number(m.txns ?? 0);
      if (c >= 50) segments.high += 1;
      else if (c >= 16) segments.medium += 1;
      else if (c >= 1) segments.low += 1;
      else segments.inactive += 1;
    });

    const totalMerchants = rows.length;
    const pct = (n) => (totalMerchants > 0 ? (n / totalMerchants) * 100 : 0);

    return {
      rows,
      top10: rows.slice(0, 10),
      segments,
      totalMerchants,
      pct: {
        high: pct(segments.high),
        medium: pct(segments.medium),
        low: pct(segments.low),
        inactive: pct(segments.inactive),
      },
    };
  }, [merchantNameById, merchantRows, monthFilteredTx]);

  const monthlySeries = useMemo(() => {
    const counts = new Map(monthKeys.map((k) => [k, 0]));
    const volumes = new Map(monthKeys.map((k) => [k, 0]));

    monthFilteredTx.forEach((t) => {
      const createdAt = getCreatedAt(t);
      if (!createdAt) return;
      const d = new Date(createdAt);
      if (Number.isNaN(d.getTime())) return;
      const k = monthKey(d);
      if (!counts.has(k)) return;
      counts.set(k, (counts.get(k) ?? 0) + 1);
      volumes.set(k, (volumes.get(k) ?? 0) + parseAmount(t?.Amount));
    });

    return {
      txns: monthKeys.map((k) => counts.get(k) ?? 0),
      volume: monthKeys.map((k) => volumes.get(k) ?? 0),
    };
  }, [monthFilteredTx, monthKeys]);

  const channelMix = useMemo(() => {
    const buckets = new Map();
    monthFilteredTx.forEach((t) => {
      const c = channelValue(t) || "Unknown";
      buckets.set(c, (buckets.get(c) ?? 0) + 1);
    });

    const labels = Array.from(buckets.keys()).sort((a, b) => a.localeCompare(b));
    const data = labels.map((l) => buckets.get(l) ?? 0);
    return { labels, data };
  }, [channelValue, monthFilteredTx]);

  const qrMerchantCount = useMemo(() => {
    const qrMids = new Set();
    monthFilteredTx.forEach((t) => {
      const c = channelValue(t).toLowerCase();
      const isQr = c.includes("qr");
      if (!isQr) return;
      const mid = String(t?.MerchantID ?? t?.MID ?? "").trim();
      if (mid) qrMids.add(mid);
    });
    return qrMids.size;
  }, [channelValue, monthFilteredTx]);

  const merchantPerformanceRows = useMemo(() => {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    thisMonthStart.setHours(0, 0, 0, 0);
    const thisMonthEnd = new Date(now);
    thisMonthEnd.setHours(23, 59, 59, 999);

    const monthTxnCounts = new Map();
    const threeMoVolume = new Map();
    const threeMoTxnCounts = new Map();
    const successCounts = new Map();
    const totalCounts = new Map();
    const qrTxnCounts = new Map();

    monthFilteredTx.forEach((t) => {
      const mid = String(t?.MerchantID ?? t?.MID ?? "").trim();
      if (!mid) return;

      const amount = parseAmount(t?.Amount);
      threeMoVolume.set(mid, (threeMoVolume.get(mid) ?? 0) + amount);
      threeMoTxnCounts.set(mid, (threeMoTxnCounts.get(mid) ?? 0) + 1);

      totalCounts.set(mid, (totalCounts.get(mid) ?? 0) + 1);
      if (isTxnSuccess(t)) successCounts.set(mid, (successCounts.get(mid) ?? 0) + 1);

      const ch = channelValue(t).toLowerCase();
      if (ch.includes("qr")) qrTxnCounts.set(mid, (qrTxnCounts.get(mid) ?? 0) + 1);
    });

    (txRows ?? []).forEach((t) => {
      const mid = String(t?.MerchantID ?? t?.MID ?? "").trim();
      if (!mid) return;
      const createdAt = getCreatedAt(t);
      if (!createdAt) return;
      const d = new Date(createdAt);
      if (Number.isNaN(d.getTime())) return;
      if (d < thisMonthStart || d > thisMonthEnd) return;
      monthTxnCounts.set(mid, (monthTxnCounts.get(mid) ?? 0) + 1);
    });

    const mids = new Set(
      (merchantRows ?? [])
        .map((m) => String(m?.MID ?? m?.MerchantID ?? "").trim())
        .filter(Boolean)
    );
    if (mids.size === 0) {
      for (const mid of threeMoVolume.keys()) mids.add(mid);
    }

    const rows = [];
    for (const mid of mids) {
      const name = merchantNameById.get(mid) ?? mid;
      const city = merchantCityById.get(mid) ?? "-";
      const terminals = terminalCountByMerchant.get(mid) ?? 0;
      const qr = qrTxnCounts.get(mid) ?? 0;
      const monthTxns = monthTxnCounts.get(mid) ?? 0;
      const vol3 = threeMoVolume.get(mid) ?? 0;
      const tx3 = threeMoTxnCounts.get(mid) ?? 0;
      const avg = tx3 > 0 ? vol3 / tx3 : 0;
      const total = totalCounts.get(mid) ?? 0;
      const succ = successCounts.get(mid) ?? 0;
      const successPct = total > 0 ? (succ / total) * 100 : 0;
      const active = (merchantRows ?? []).some((m) => {
        const mMid = String(m?.MID ?? m?.MerchantID ?? "").trim();
        if (!mMid || mMid !== mid) return false;
        return getMerchantActive(m);
      });

      rows.push({
        mid,
        merchant: name,
        city,
        terminals,
        qr,
        monthTxns,
        vol3,
        avg,
        successPct,
        active,
      });
    }

    rows.sort((a, b) => (b.vol3 ?? 0) - (a.vol3 ?? 0));
    return rows;
  }, [channelValue, getMerchantActive, merchantCityById, merchantNameById, merchantRows, monthFilteredTx, terminalCountByMerchant, txRows]);

  const monthTxnHeader = useMemo(() => {
    const now = new Date();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${monthNames[now.getMonth()] ?? "This"} Txns`;
  }, []);

  const monthlyTarget = 50;

  const underperformingRows = useMemo(() => {
    const rows = (merchantPerformanceRows ?? [])
      .map((m) => {
        const txns = Number(m?.monthTxns ?? 0);
        const pct = monthlyTarget > 0 ? (txns / monthlyTarget) * 100 : 0;
        let risk = "Low";
        if (pct < 40) risk = "Critical";
        else if (pct < 60) risk = "High";
        else if (pct < 90) risk = "Medium";

        return {
          mid: m?.mid,
          merchant: m?.merchant,
          txns,
          pct,
          risk,
        };
      })
      .sort((a, b) => (a.txns ?? 0) - (b.txns ?? 0));

    return rows.slice(0, 6);
  }, [merchantPerformanceRows]);

  const monthlyAchievementRows = useMemo(() => {
    const rows = (merchantPerformanceRows ?? [])
      .map((m) => {
        const txns = Number(m?.monthTxns ?? 0);
        const pct = monthlyTarget > 0 ? (txns / monthlyTarget) * 100 : 0;
        return {
          mid: m?.mid,
          merchant: m?.merchant,
          txns,
          pct,
        };
      })
      .sort((a, b) => (b.txns ?? 0) - (a.txns ?? 0));

    return rows.slice(0, 5);
  }, [merchantPerformanceRows]);

  const riskPill = useCallback((risk) => {
    const v = String(risk ?? "").trim().toLowerCase();
    if (v === "critical") {
      return (
        <span className="inline-flex items-center gap-2 rounded-full bg-rose-500/15 px-3 py-1 text-xs font-semibold text-rose-200">
          <span className="h-2 w-2 rounded-full bg-rose-400" />
          Critical
        </span>
      );
    }
    if (v === "high") {
      return (
        <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-200">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          High
        </span>
      );
    }
    if (v === "medium") {
      return (
        <span className="inline-flex items-center gap-2 rounded-full bg-cyan-500/15 px-3 py-1 text-xs font-semibold text-cyan-200">
          <span className="h-2 w-2 rounded-full bg-cyan-400" />
          Medium
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200">
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
        Low
      </span>
    );
  }, []);

  const thisMonthVolume = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    let volume = 0;
    (txRows ?? []).forEach((t) => {
      const createdAt = getCreatedAt(t);
      if (!createdAt) return;
      const d = new Date(createdAt);
      if (Number.isNaN(d.getTime())) return;
      if (d < start || d > end) return;
      volume += parseAmount(t?.Amount);
    });

    return volume;
  }, [txRows]);

  const stats = useMemo(() => {
    const totalMerchants = merchantRows.length;
    const activeMerchants = (merchantRows ?? []).filter(getMerchantActive).length;

    const totalTerminals = terminalRows.length;

    return {
      totalMerchants,
      activeMerchants,
      totalTerminals,
      qrMerchants: qrMerchantCount,
      thisMonthVolume,
    };
  }, [getMerchantActive, merchantRows, qrMerchantCount, terminalRows.length, thisMonthVolume]);

  const comboChartData = useMemo(
    () => ({
      labels: monthLabels,
      datasets: [
        {
          type: "line",
          label: "Txns",
          data: monthlySeries.txns,
          tension: 0.35,
          borderColor: "rgba(34,211,238,0.9)",
          backgroundColor: "rgba(34,211,238,0.12)",
          pointRadius: 3,
          pointHoverRadius: 4,
          yAxisID: "y",
        },
        {
          type: "line",
          label: "Volume (M)",
          data: monthlySeries.volume.map((v) => v / 1_000_000),
          tension: 0.35,
          borderColor: "rgba(168,85,247,0.9)",
          backgroundColor: "rgba(168,85,247,0.12)",
          pointRadius: 3,
          pointHoverRadius: 4,
          yAxisID: "y1",
        },
      ],
    }),
    [monthLabels, monthlySeries.txns, monthlySeries.volume]
  );

  const channelMixData = useMemo(
    () => ({
      labels: channelMix.labels,
      datasets: [
        {
          data: channelMix.data,
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
    [channelMix.data, channelMix.labels]
  );

  const topMerchantsBarData = useMemo(
    () => ({
      labels: merchantPortfolio.top10.map((m) => m.name),
      datasets: [
        {
          label: "Volume",
          data: merchantPortfolio.top10.map((m) => Math.round(m.volume ?? 0)),
          backgroundColor: merchantPortfolio.top10.map((_, idx) => {
            const colors = [
              "rgba(34, 211, 238, 0.85)",
              "rgba(14, 165, 233, 0.85)",
              "rgba(99, 102, 241, 0.85)",
              "rgba(168, 85, 247, 0.85)",
              "rgba(244, 63, 94, 0.85)",
            ];
            return colors[idx % colors.length];
          }),
          borderRadius: 12,
          borderSkipped: false,
          maxBarThickness: 26,
        },
      ],
    }),
    [merchantPortfolio.top10]
  );

  const topMerchantsBarOptions = useMemo(
    () => ({
      maintainAspectRatio: false,
      indexAxis: "y",
      plugins: {
        legend: { display: false },
        tooltip: {
          titleColor: "rgba(255,255,255,0.95)",
          bodyColor: "rgba(255,255,255,0.9)",
        },
      },
      layout: { padding: { left: 6, right: 8, top: 4, bottom: 0 } },
      scales: {
        x: {
          ticks: {
            color: "rgba(255,255,255,0.6)",
            maxRotation: 20,
            minRotation: 20,
            callback: (value) => {
              const n = Number(value);
              if (!Number.isFinite(n)) return value;
              if (n >= 1_000_000) return `PKR ${(n / 1_000_000).toFixed(1)}M`;
              if (n >= 1_000) return `PKR ${(n / 1_000).toFixed(0)}K`;
              return `PKR ${n}`;
            },
          },
          grid: { color: "rgba(255,255,255,0.07)" },
        },
        y: {
          ticks: {
            color: "rgba(255,255,255,0.55)",
            callback: function (value) {
              const label = this.getLabelForValue(value);
              if (typeof label !== "string") return label;
              const t = label.trim();
              return t.length > 14 ? `${t.slice(0, 14)}…` : t;
            },
          },
          grid: { display: false },
        },
      },
    }),
    []
  );

  const portfolioDonutData = useMemo(
    () => ({
      labels: ["High (50+)", "Medium", "Low (≤15)", "Inactive"],
      datasets: [
        {
          data: [
            merchantPortfolio.segments.high,
            merchantPortfolio.segments.medium,
            merchantPortfolio.segments.low,
            merchantPortfolio.segments.inactive,
          ],
          backgroundColor: [
            "rgba(34, 197, 94, 0.9)",
            "rgba(34, 211, 238, 0.9)",
            "rgba(245, 158, 11, 0.9)",
            "rgba(244, 63, 94, 0.9)",
          ],
          borderColor: "rgba(2, 6, 23, 0.6)",
          borderWidth: 2,
          cutout: "72%",
        },
      ],
    }),
    [merchantPortfolio.segments.high, merchantPortfolio.segments.inactive, merchantPortfolio.segments.low, merchantPortfolio.segments.medium]
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
        y1: {
          position: "right",
          ticks: { color: "rgba(255,255,255,0.6)" },
          grid: { drawOnChartArea: false },
        },
      },
    }),
    []
  );

  const donutOptions = useMemo(
    () => ({
      maintainAspectRatio: false,
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
      layout: { padding: { bottom: 18 } },
    }),
    []
  );

  const handleExport = useCallback(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");

    const lines = [];
    lines.push(["Metric", "Value"].map(csvEscape).join(","));
    lines.push(["Total Merchants", stats.totalMerchants].map(csvEscape).join(","));
    lines.push(["Active Merchants", stats.activeMerchants].map(csvEscape).join(","));
    lines.push(["Total Terminals", stats.totalTerminals].map(csvEscape).join(","));
    lines.push(["QR Merchants", stats.qrMerchants].map(csvEscape).join(","));
    lines.push(["This Month Volume", stats.thisMonthVolume].map(csvEscape).join(","));

    lines.push("");
    lines.push(["Month", "Txns", "Volume"].map(csvEscape).join(","));
    monthKeys.forEach((k, idx) => {
      lines.push(
        [
          monthLabels[idx],
          monthlySeries.txns[idx] ?? 0,
          Math.round(monthlySeries.volume[idx] ?? 0),
        ]
          .map(csvEscape)
          .join(",")
      );
    });

    lines.push("");
    lines.push(["Channel", "Txns"].map(csvEscape).join(","));
    channelMix.labels.forEach((l, idx) => {
      lines.push([l, channelMix.data[idx] ?? 0].map(csvEscape).join(","));
    });

    const csv = lines.join("\n");
    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `portfolio-report_${yyyy}-${mm}-${dd}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [channelMix.data, channelMix.labels, monthKeys, monthLabels, monthlySeries.txns, monthlySeries.volume, stats]);

  const moneyCompact = useCallback((value) => {
    const n = Number(value ?? 0);
    if (!Number.isFinite(n)) return "PKR 0";
    if (n >= 1_000_000_000) return `PKR ${(n / 1_000_000_000).toFixed(1)}B`;
    if (n >= 1_000_000) return `PKR ${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `PKR ${(n / 1_000).toFixed(1)}K`;
    return `PKR ${Math.round(n).toLocaleString()}`;
  }, []);

  const statusPill = useCallback((row) => {
    const active = Boolean(row?.active);
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
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="mb-5 text-xs text-slate-500">
        Reports / <span className="text-sky-400">Portfolio Report</span>
      </div>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Complete Portfolio Report</h1>
          <p className="mt-1 text-sm text-slate-400">Full picture — merchants, terminals, QR, and financial performance</p>
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={loading}
          className={joinClasses(
            "inline-flex items-center justify-center rounded-xl px-4 py-2 text-xs font-semibold",
            loading
              ? "cursor-not-allowed border border-white/10 bg-white/5 text-slate-400"
              : "border border-cyan-400/40 bg-cyan-400/90 text-slate-950 hover:bg-cyan-300"
          )}
        >
          Export Full Report
        </button>
      </div>

      <section className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        <article className="rounded-2xl border border-white/5 bg-[#0b1220]/70 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Merchants</div>
          <div className="mt-3 text-2xl font-semibold text-cyan-300">{stats.totalMerchants.toLocaleString()}</div>
        </article>

        <article className="rounded-2xl border border-white/5 bg-[#0b1220]/70 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Active Merchants</div>
          <div className="mt-3 text-2xl font-semibold text-emerald-300">{stats.activeMerchants.toLocaleString()}</div>
        </article>

        <article className="rounded-2xl border border-white/5 bg-[#0b1220]/70 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total Terminals</div>
          <div className="mt-3 text-2xl font-semibold text-violet-300">{stats.totalTerminals.toLocaleString()}</div>
        </article>

        <article className="rounded-2xl border border-white/5 bg-[#0b1220]/70 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">QR Merchants</div>
          <div className="mt-3 text-2xl font-semibold text-cyan-300">{stats.qrMerchants.toLocaleString()}</div>
          <div className="mt-1 text-xs text-slate-500">Based on last 3 months</div>
        </article>

        <article className="rounded-2xl border border-white/5 bg-[#0b1220]/70 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">This Month Volume</div>
          <div className="mt-3 text-2xl font-semibold text-amber-300">{moneyCompact(stats.thisMonthVolume)}</div>
        </article>
      </section>

      <section className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <article className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#0b1220]/70 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent" aria-hidden />
          <div className="relative">
            <div className="text-sm font-semibold text-slate-100">Total Transaction Volume — 3 Months</div>
            <div className="mt-4 h-[260px]">
              <Chart type="line" data={comboChartData} options={chartOptions} />
            </div>
          </div>
        </article>

        <article className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#0b1220]/70 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent" aria-hidden />
          <div className="relative">
            <div className="text-sm font-semibold text-slate-100">Channel Mix</div>
            <div className="mt-4 h-[310px]">
              <Chart type="doughnut" data={channelMixData} options={donutOptions} />
            </div>
          </div>
        </article>
      </section>

      <section className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <article className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#0b1220]/70 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent" aria-hidden />
          <div className="relative">
            <div className="text-sm font-semibold text-slate-100">Top 10 Merchants by Volume</div>
            <div className="mt-4 h-[260px]">
              <Chart type="bar" data={topMerchantsBarData} options={topMerchantsBarOptions} />
            </div>
          </div>
        </article>

        <article className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#0b1220]/70 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent" aria-hidden />
          <div className="relative">
            <div className="text-sm font-semibold text-slate-100">Portfolio Distribution</div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr]">
              <div className="relative flex items-start justify-center">
                <div className="relative h-[220px] w-[220px]">
                  <Chart type="doughnut" data={portfolioDonutData} options={donutOptions} />
                  <div className="pointer-events-none absolute inset-0 flex translate-y-6 flex-col items-center justify-center text-center">
                    <div className="text-3xl font-semibold leading-none text-slate-100">
                      {merchantPortfolio.totalMerchants.toLocaleString()}
                    </div>
                    <div className="mt-1 text-xs leading-none text-slate-400">total</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                    <span className="h-2 w-2 rounded-sm bg-emerald-400" aria-hidden />
                    <span>High (50+)</span>
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-slate-100">{merchantPortfolio.segments.high}</div>
                  <div className="mt-1 text-xs text-slate-500">{merchantPortfolio.pct.high.toFixed(0)}%</div>
                </div>

                <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                    <span className="h-2 w-2 rounded-sm bg-cyan-400" aria-hidden />
                    <span>Medium</span>
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-slate-100">{merchantPortfolio.segments.medium}</div>
                  <div className="mt-1 text-xs text-slate-500">{merchantPortfolio.pct.medium.toFixed(0)}%</div>
                </div>

                <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                    <span className="h-2 w-2 rounded-sm bg-amber-400" aria-hidden />
                    <span>Low (≤15)</span>
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-slate-100">{merchantPortfolio.segments.low}</div>
                  <div className="mt-1 text-xs text-slate-500">{merchantPortfolio.pct.low.toFixed(0)}%</div>
                </div>

                <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                    <span className="h-2 w-2 rounded-sm bg-rose-400" aria-hidden />
                    <span>Inactive</span>
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-slate-100">{merchantPortfolio.segments.inactive}</div>
                  <div className="mt-1 text-xs text-slate-500">{merchantPortfolio.pct.inactive.toFixed(0)}%</div>
                </div>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-white/5 bg-white/5">
        <div className="border-b border-white/5 px-5 py-4">
          <div className="text-sm font-semibold text-slate-100">Merchant Performance Summary</div>
        </div>
        <DataTable
          value={merchantPerformanceRows}
          loading={loading}
          dataKey="mid"
          className="!bg-transparent"
          tableClassName="!bg-transparent"
          rowHover
          size="small"
          responsiveLayout="scroll"
          paginator
          rows={50}
          rowsPerPageOptions={[25, 50, 100, 200]}
          paginatorClassName="!border-0 !bg-transparent border-t border-white/5"
          emptyMessage="No merchants found"
        >
          <Column
            field="merchant"
            header="Merchant"
            body={(row) => <span className="text-sky-300">{row?.merchant ?? "-"}</span>}
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
            field="terminals"
            header="Terminals"
            headerClassName="!border-0 !bg-transparent px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
            bodyClassName="px-4 py-3 !border-0 border-t border-white/5 text-sm text-slate-200"
          />
          <Column
            field="qr"
            header="QR"
            headerClassName="!border-0 !bg-transparent px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
            bodyClassName="px-4 py-3 !border-0 border-t border-white/5 text-sm text-slate-200"
          />
          <Column
            field="monthTxns"
            header={monthTxnHeader}
            headerClassName="!border-0 !bg-transparent px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
            bodyClassName="px-4 py-3 !border-0 border-t border-white/5 text-sm text-slate-200"
          />
          <Column
            field="vol3"
            header="3Mo Volume"
            body={(row) => moneyCompact(row?.vol3)}
            headerClassName="!border-0 !bg-transparent px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
            bodyClassName="px-4 py-3 !border-0 border-t border-white/5 text-sm text-slate-200"
          />
          <Column
            field="avg"
            header="Avg Txn"
            body={(row) => moneyCompact(row?.avg)}
            headerClassName="!border-0 !bg-transparent px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
            bodyClassName="px-4 py-3 !border-0 border-t border-white/5 text-sm text-slate-200"
          />
          <Column
            field="successPct"
            header="Success%"
            body={(row) => (
              <span className="text-emerald-300">{`${Number(row?.successPct ?? 0).toFixed(1)}%`}</span>
            )}
            headerClassName="!border-0 !bg-transparent px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
            bodyClassName="px-4 py-3 !border-0 border-t border-white/5 text-sm"
          />
          <Column
            field="active"
            header="Status"
            body={statusPill}
            headerClassName="!border-0 !bg-transparent px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
            bodyClassName="px-4 py-3 !border-0 border-t border-white/5 text-sm"
          />
        </DataTable>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <article className="relative overflow-hidden rounded-2xl border border-white/5 bg-white/5">
          <div className="border-b border-white/5 px-5 py-4">
            <div className="text-sm font-semibold text-slate-100">Underperforming Merchants</div>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="whitespace-nowrap px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">Merchant</th>
                  <th className="whitespace-nowrap px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">Txns</th>
                  <th className="whitespace-nowrap px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">Vs Target</th>
                  <th className="whitespace-nowrap px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">Risk</th>
                </tr>
              </thead>
              <tbody>
                {underperformingRows.map((r) => {
                  const pct = Math.max(0, Math.min(100, Number(r.pct ?? 0)));
                  const barColor = pct < 40 ? "bg-rose-400" : pct < 60 ? "bg-amber-400" : "bg-emerald-400";
                  return (
                    <tr key={String(r.mid ?? r.merchant)} className="border-t border-white/5">
                      <td className="whitespace-nowrap px-5 py-3 text-sm font-semibold text-slate-100">{r.merchant ?? "-"}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-sm text-rose-300">{Number(r.txns ?? 0).toLocaleString()}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-[140px] overflow-hidden rounded-full bg-black/25">
                            <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
                          </div>
                          <div className="text-xs font-semibold text-slate-400">{pct.toFixed(0)}%</div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3">{riskPill(r.risk)}</td>
                    </tr>
                  );
                })}

                {underperformingRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-6 text-sm text-slate-400">
                      No merchants found
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>

        <article className="relative overflow-hidden rounded-2xl border border-white/5 bg-white/5">
          <div className="border-b border-white/5 px-5 py-4">
            <div className="text-sm font-semibold text-slate-100">Monthly Target Achievement</div>
          </div>

          <div className="px-5 py-4">
            <div className="space-y-4">
              {monthlyAchievementRows.map((r) => {
                const pct = Math.max(0, Math.min(100, Number(r.pct ?? 0)));
                return (
                  <div key={String(r.mid ?? r.merchant)}>
                    <div className="flex items-center justify-between text-sm">
                      <div className="font-semibold text-slate-100">{r.merchant ?? "-"}</div>
                      <div className="text-xs font-semibold text-emerald-300">{`${Number(r.txns ?? 0)}/${monthlyTarget}`}</div>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-black/25">
                      <div className="h-full bg-emerald-400" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}

              {monthlyAchievementRows.length === 0 ? (
                <div className="py-6 text-sm text-slate-400">No merchants found</div>
              ) : null}
            </div>
          </div>
        </article>
      </section>

      {loading ? <div className="mt-4 text-xs text-slate-500">Loading…</div> : null}
    </div>
  );
}
