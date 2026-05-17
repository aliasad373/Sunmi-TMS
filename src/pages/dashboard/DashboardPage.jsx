import { useMemo, useCallback, useState, useEffect } from "react";
import api from "../../network/api";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Activity, CheckCircle2, CreditCard, Users } from "lucide-react";
import { Chart } from "primereact/chart";

const stats = [
  { id: "merchants", label: "Total Merchants", value: 0 },
  { id: "terminals-total", label: "Total Terminals", value: 0 },
  { id: "terminals-live", label: "Total Terminals live", value: 0 },
  { id: "terminals-active", label: "Total Terminals live", value: 0 },
];



export default function DashboardPage() {
  const [tableRows, setTableRows] = useState([])
  const [statValues, setStatValues] = useState([]);
  const [merchantRows, setMerchantRows] = useState([]);
  const [terminalRows, setTerminalRows] = useState([]);
  const joinClasses = (...classes) => classes.filter(Boolean).join(" ");

  const parseAmount = useCallback((value) => {
    if (value === null || value === undefined) return 0;
    const raw = String(value);
    const cleaned = raw.replace(/[^0-9.-]/g, "");
    const num = Number.parseFloat(cleaned);
    return Number.isFinite(num) ? num : 0;
  }, []);

  const monthlySeries = useMemo(() => {
    const getCreatedAt = (row) =>
      row?.CreatedAt ?? row?.createdAt ?? row?.created_at ?? row?.Created_at ?? row?.created ?? "";

    const monthKey = (date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      return `${y}-${m}`;
    };

    const formatMonthLabel = (key) => {
      const [y, m] = String(key).split("-");
      const idx = Number(m) - 1;
      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      return `${monthNames[idx] ?? m} ${y}`;
    };

    const now = new Date();
    const keys = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keys.push(monthKey(d));
    }

    const buckets = new Map(keys.map((k) => [k, { count: 0, volume: 0 }]));

    tableRows.forEach((row) => {
      const createdAt = getCreatedAt(row);
      if (!createdAt) return;
      const parsed = new Date(createdAt);
      if (Number.isNaN(parsed.getTime())) return;
      const key = monthKey(parsed);
      if (!buckets.has(key)) return;
      const cur = buckets.get(key);
      cur.count += 1;
      cur.volume += parseAmount(row?.Amount);
    });

    const labels = keys.map(formatMonthLabel);
    const counts = keys.map((k) => buckets.get(k)?.count ?? 0);
    const volumes = keys.map((k) => buckets.get(k)?.volume ?? 0);

    return { labels, counts, volumes };
  }, [parseAmount, tableRows]);

  const dateSeries = useMemo(() => {
    const getCreatedAt = (row) =>
      row?.CreatedAt ?? row?.createdAt ?? row?.created_at ?? row?.Created_at ?? row?.created ?? "";
    const toLocalYmd = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    const now = new Date();
    const todayKey = toLocalYmd(now);
    const yesterdayKey = toLocalYmd(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
    const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}`;

    let todayCount = 0;
    let yesterdayCount = 0;
    let thisMonthCount = 0;
    let prevMonthCount = 0;

    tableRows.forEach((row) => {
      const createdAt = getCreatedAt(row);
      if (!createdAt) return;
      const parsed = new Date(createdAt);
      if (Number.isNaN(parsed.getTime())) return;
      const ymd = toLocalYmd(parsed);
      if (ymd === todayKey) todayCount += 1;
      if (ymd === yesterdayKey) yesterdayCount += 1;
      const monthKey = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
      if (monthKey === thisMonthKey) thisMonthCount += 1;
      if (monthKey === prevMonthKey) prevMonthCount += 1;
    });

    const pctVsYesterday =
      yesterdayCount > 0 ? ((todayCount - yesterdayCount) / yesterdayCount) * 100 : null;
    const diffThisMonth = thisMonthCount - prevMonthCount;

    return {
      todayCount,
      yesterdayCount,
      pctVsYesterday,
      thisMonthCount,
      prevMonthCount,
      diffThisMonth,
    };
  }, [tableRows]);

  const merchantsDelta = useMemo(() => {
    const getCreatedAt = (row) =>
      row?.CreatedAt ?? row?.createdAt ?? row?.created_at ?? row?.Created_at ?? row?.created ?? "";
    const now = new Date();
    const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    let createdThisMonth = 0;
    let hasAnyDate = false;

    merchantRows.forEach((row) => {
      const createdAt = getCreatedAt(row);
      if (!createdAt) return;
      const parsed = new Date(createdAt);
      if (Number.isNaN(parsed.getTime())) return;
      hasAnyDate = true;
      const monthKey = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
      if (monthKey === thisMonthKey) createdThisMonth += 1;
    });

    if (!hasAnyDate) return null;
    return createdThisMonth;
  }, [merchantRows]);

  const terminalsMeta = useMemo(() => {
    const total = terminalRows.length;
    const live = terminalRows.filter((t) => String(t?.posType ?? "").toLowerCase() === "production").length;
    const livePct = total > 0 ? (live / total) * 100 : null;
    return { total, live, livePct };
  }, [terminalRows]);

  const merchantActivity = useMemo(() => {
    const getCreatedAt = (row) =>
      row?.CreatedAt ?? row?.createdAt ?? row?.created_at ?? row?.Created_at ?? row?.created ?? "";

    const now = new Date();
    const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const txCounts = new Map();
    (tableRows ?? []).forEach((row) => {
      const createdAt = getCreatedAt(row);
      if (!createdAt) return;
      const parsed = new Date(createdAt);
      if (Number.isNaN(parsed.getTime())) return;
      const monthKey = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
      if (monthKey !== thisMonthKey) return;

      const mid = String(row?.MerchantID ?? row?.MID ?? "").trim();
      if (!mid) return;
      txCounts.set(mid, (txCounts.get(mid) ?? 0) + 1);
    });

    const merchantIds = new Set(
      (merchantRows ?? [])
        .map((m) => String(m?.MID ?? m?.MerchantID ?? "").trim())
        .filter(Boolean)
    );

    if (merchantIds.size === 0) {
      for (const k of txCounts.keys()) merchantIds.add(k);
    }

    const totals = { high: 0, medium: 0, low: 0, inactive: 0 };
    for (const mid of merchantIds) {
      const c = txCounts.get(mid) ?? 0;
      if (c >= 50) totals.high += 1;
      else if (c >= 16) totals.medium += 1;
      else if (c >= 1) totals.low += 1;
      else totals.inactive += 1;
    }

    const totalMerchants = merchantIds.size;
    const pct = (n) => (totalMerchants > 0 ? (n / totalMerchants) * 100 : 0);

    return {
      totalMerchants,
      totals,
      pct: {
        high: pct(totals.high),
        medium: pct(totals.medium),
        low: pct(totals.low),
        inactive: pct(totals.inactive),
      },
    };
  }, [merchantRows, tableRows]);

  const merchantActivityData = useMemo(
    () => ({
      labels: ["High (50+)", "Medium (16-49)", "Low (≤15)", "Inactive"],
      datasets: [
        {
          data: [
            merchantActivity.totals.high,
            merchantActivity.totals.medium,
            merchantActivity.totals.low,
            merchantActivity.totals.inactive,
          ],
          backgroundColor: [
            "rgba(34, 197, 94, 0.9)",
            "rgba(56, 189, 248, 0.9)",
            "rgba(245, 158, 11, 0.9)",
            "rgba(244, 63, 94, 0.9)",
          ],
          borderColor: "rgba(0,0,0,0)",
          borderWidth: 0,
        },
      ],
    }),
    [merchantActivity]
  );

  const merchantActivityOptions = useMemo(
    () => ({
      maintainAspectRatio: false,
      cutout: "72%",
      layout: {
        padding: 0,
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          titleColor: "rgba(255,255,255,0.95)",
          bodyColor: "rgba(255,255,255,0.9)",
        },
      },
    }),
    []
  );

  const dashboardWidgets = useMemo(() => {
    const getCreatedAt = (row) =>
      row?.CreatedAt ?? row?.createdAt ?? row?.created_at ?? row?.Created_at ?? row?.created ?? "";

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const isInRange = (d, start, end) => d >= start && d < end;

    const merchantMap = new Map();
    (merchantRows ?? []).forEach((m) => {
      const mid = String(m?.MID ?? m?.MerchantID ?? "").trim();
      if (!mid) return;
      merchantMap.set(mid, {
        name: String(m?.MerchantName ?? m?.BusinessName ?? mid),
        subtitle: String(m?.Address ?? ""),
      });
    });

    const countsThisMonth = new Map();
    const countsLastMonth = new Map();
    const volumeThisMonth = new Map();
    let thisMonthTotal = 0;
    let thisMonthSuccess = 0;
    let thisMonthVolume = 0;
    let lastMonthTotal = 0;
    let lastMonthSuccess = 0;
    let lastMonthVolume = 0;
    const hourBuckets = new Array(24).fill(0);
    let failedToday = 0;
    let todayTotal = 0;

    let newOnboardedThisMonth = null;

    const todayYmd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}`;
    const toLocalYmd = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    (tableRows ?? []).forEach((row) => {
      const createdAt = getCreatedAt(row);
      if (!createdAt) return;
      const parsed = new Date(createdAt);
      if (Number.isNaN(parsed.getTime())) return;

      const mid = String(row?.MerchantID ?? row?.MID ?? "").trim();
      const amount = parseAmount(row?.Amount);
      const success = String(row?.ResponseCode ?? "").trim() === "00";

      if (isInRange(parsed, thisMonthStart, nextMonthStart)) {
        thisMonthTotal += 1;
        if (success) thisMonthSuccess += 1;
        thisMonthVolume += amount;
        if (mid) {
          countsThisMonth.set(mid, (countsThisMonth.get(mid) ?? 0) + 1);
          volumeThisMonth.set(mid, (volumeThisMonth.get(mid) ?? 0) + amount);
        }
        hourBuckets[parsed.getHours()] += 1;
      }

      if (isInRange(parsed, lastMonthStart, thisMonthStart)) {
        lastMonthTotal += 1;
        if (success) lastMonthSuccess += 1;
        lastMonthVolume += amount;
        if (mid) countsLastMonth.set(mid, (countsLastMonth.get(mid) ?? 0) + 1);
      }

      if (toLocalYmd(parsed) === todayYmd) {
        todayTotal += 1;
        if (!success) failedToday += 1;
      }
    });

    const underTarget = [];
    const TARGET = 15;
    for (const [mid, count] of countsThisMonth.entries()) {
      if (count <= TARGET) {
        const pct = TARGET > 0 ? (count / TARGET) * 100 : 0;
        const risk = count <= 5 ? "Critical" : count <= 10 ? "High" : "Medium";
        const meta = merchantMap.get(mid) ?? { name: mid, subtitle: "" };
        underTarget.push({ mid, name: meta.name, subtitle: meta.subtitle, count, pct, risk });
      }
    }
    underTarget.sort((a, b) => a.count - b.count);

    const topPerformers = [];
    for (const [mid, count] of countsThisMonth.entries()) {
      const meta = merchantMap.get(mid) ?? { name: mid, subtitle: "" };
      const vol = volumeThisMonth.get(mid) ?? 0;
      topPerformers.push({ mid, name: meta.name, subtitle: meta.subtitle, count, volume: vol });
    }
    topPerformers.sort((a, b) => b.count - a.count);

    const maxHour = hourBuckets.reduce(
      (acc, v, i) => (v > acc.v ? { i, v } : acc),
      { i: 0, v: -1 }
    ).i;
    const formatHour = (h) => {
      const hr = h % 12 === 0 ? 12 : h % 12;
      const ampm = h >= 12 ? "PM" : "AM";
      return `${hr} ${ampm}`;
    };
    const peakHourLabel = `${formatHour(maxHour)}–${formatHour((maxHour + 2) % 24)}`;

    const successRate = thisMonthTotal > 0 ? (thisMonthSuccess / thisMonthTotal) * 100 : 0;
    const lastSuccessRate = lastMonthTotal > 0 ? (lastMonthSuccess / lastMonthTotal) * 100 : 0;
    const successDelta = successRate - lastSuccessRate;

    const avgTxnValue = thisMonthTotal > 0 ? thisMonthVolume / thisMonthTotal : 0;
    const lastAvgTxnValue = lastMonthTotal > 0 ? lastMonthVolume / lastMonthTotal : 0;
    const avgDeltaPct = lastAvgTxnValue > 0 ? ((avgTxnValue - lastAvgTxnValue) / lastAvgTxnValue) * 100 : 0;

    const failRateToday = todayTotal > 0 ? (failedToday / todayTotal) * 100 : 0;

    const totalKnownMerchants = Math.max(merchantRows?.length ?? 0, countsThisMonth.size);
    const churnRisk = totalKnownMerchants > 0 ? Math.max(0, totalKnownMerchants - countsThisMonth.size) : 0;

    return {
      underTarget,
      topPerformers,
      insights: {
        successRate,
        successDelta,
        avgTxnValue,
        avgDeltaPct,
        peakHourLabel,
        failedToday,
        failRateToday,
        newOnboardedThisMonth,
        churnRisk,
      },
    };
  }, [merchantRows, parseAmount, tableRows]);

  const chartOptions = useMemo(
    () => ({
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: "rgba(255,255,255,0.78)",
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

  const txPerMonthData = useMemo(
    () => ({
      labels: monthlySeries.labels,
      datasets: [
        {
          label: "Txn count",
          data: monthlySeries.counts,
          backgroundColor: "rgba(34, 211, 238, 0.35)",
          borderColor: "rgba(34, 211, 238, 0.9)",
          borderWidth: 1,
          borderRadius: 8,
        },
      ],
    }),
    [monthlySeries]
  );

  const txVolumeData = useMemo(
    () => ({
      labels: monthlySeries.labels,
      datasets: [
        {
          label: "Volume",
          data: monthlySeries.volumes,
          tension: 0.3,
          fill: true,
          backgroundColor: "rgba(34, 211, 238, 0.10)",
          borderColor: "rgba(34, 211, 238, 0.85)",
          pointRadius: 3,
          pointHoverRadius: 4,
        },
      ],
    }),
    [monthlySeries]
  );
useEffect(()=>{
    const loadMerchants = async()=>{
    var response = await api.get("/allTransactions");
    const data  = response.data.data;
    const safe = Array.isArray(data) ? data.slice(Math.max(0, data.length - 5000)) : [];
    setTableRows(safe)
    }
    loadMerchants()
   },[])

  useEffect(() => {
    const loadMerchants = async () => {
      try {
        const response = await api.get("/all-merchants");
        setMerchantRows(response.data?.data ?? []);
      } catch {
        setMerchantRows([]);
      }
    };

    const loadTerminals = async () => {
      try {
        const response = await api.get("/allTerminals");
        setTerminalRows(response.data?.terminals ?? []);
      } catch {
        setTerminalRows([]);
      }
    };

    loadMerchants();
    loadTerminals();
  }, []);

   useEffect(()=>{
 const loadStats = async()=>{
    var response = await api.get("/reporting-stats");
   const data  = response.data;
    const stats = [
  { id: "merchants", label: "Total Merchants", value: data.totalMerchants },
  { id: "Terminals", label: "Total Terminals", value: data.totalTerminals },
  { id: "Today's Transactions", label: "Total Transaction today", value: data.todayTransactions },
  { id: "Transactions", label: "Total Transactions", value: data.totalTransactions },
];
    setStatValues(stats)
    }
    loadStats()
   },[])

 const columns = useMemo(
    () => [
      { field: "Amount", header: "Amount" },
      { field: "STAN", header: "STAN" },
       {field: "AuthNumber", header:"Auth Number"},
      {field: "ResponseCode", header:"Response Code"},
      {field: "TerminalID", header:"TID"},
      {field: "CardNumber", header:"Card No."},
      {field: "CardScheme", header:"Card Scheme"},
      {field: "BatchNo", header:"Batch No."},
       ],
    []
  );

  return (
    <div className="page-placeholder">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <div className="mt-1 text-xs text-muted-foreground">Dashboard Overview</div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statValues.map((stat) => {
          const meta = (() => {
            const id = String(stat.id ?? "").toLowerCase();
            if (id.includes("merchant")) {
              const deltaText =
                merchantsDelta === null
                  ? "--"
                  : `${merchantsDelta >= 0 ? "+" : ""}${merchantsDelta.toLocaleString()} this month`;
              return {
                Icon: Users,
                accent: "bg-cyan-400",
                deltaText,
                deltaColor: merchantsDelta === null ? "text-muted-foreground" : "text-emerald-400",
              };
            }
            if (id.includes("terminal")) {
              const pctText =
                terminalsMeta.livePct === null
                  ? "--"
                  : `${terminalsMeta.livePct.toFixed(1)}% live`;
              return {
                Icon: CheckCircle2,
                accent: "bg-emerald-400",
                deltaText: pctText,
                deltaColor: terminalsMeta.livePct === null ? "text-muted-foreground" : "text-emerald-400",
              };
            }
            if (id.includes("today")) {
              const pct = dateSeries.pctVsYesterday;
              const pctText =
                pct === null
                  ? "--"
                  : `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}% vs yesterday`;
              return {
                Icon: CreditCard,
                accent: "bg-cyan-400",
                deltaText: pctText,
                deltaColor: pct === null ? "text-muted-foreground" : pct >= 0 ? "text-emerald-400" : "text-rose-400",
              };
            }

            if (id === "transactions") {
              const diff = dateSeries.diffThisMonth;
              const deltaText = `${diff >= 0 ? "+" : ""}${diff.toLocaleString()} vs last month`;
              return {
                Icon: Activity,
                accent: "bg-violet-400",
                deltaText,
                deltaColor: diff >= 0 ? "text-emerald-400" : "text-rose-400",
              };
            }
            return {
              Icon: Activity,
              accent: "bg-violet-400",
              deltaText: "All time",
              deltaColor: "text-muted-foreground",
            };
          })();

          return (
            <article
              key={stat.id}
              className="relative overflow-hidden rounded-2xl border border-border bg-card/70 px-5 py-4 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent" aria-hidden />

              <div className="relative flex flex-col gap-2">
                <meta.Icon className="h-5 w-5 text-primary" aria-hidden />
                <div className="text-2xl font-semibold tracking-tight text-foreground">
                  {Number(stat.value ?? 0).toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
                <div className={joinClasses("mt-1 text-xs font-semibold", meta.deltaColor)}>{meta.deltaText}</div>
              </div>

              <div className={joinClasses("absolute bottom-0 left-0 h-[2px] w-full opacity-90", meta.accent)} aria-hidden />
            </article>
          );
        })}
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <article className="relative overflow-hidden rounded-2xl border border-border bg-card/70 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent" aria-hidden />
          <div className="relative mb-3">
            <div className="text-sm font-semibold text-foreground">Transactions per Month</div>
            <div className="mt-1 text-xs text-muted-foreground">Last 6 months</div>
          </div>
          <div className="relative h-[260px]">
            <Chart type="bar" data={txPerMonthData} options={chartOptions} />
          </div>
        </article>

        <article className="relative overflow-hidden rounded-2xl border border-border bg-card/70 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent" aria-hidden />
          <div className="relative mb-3">
            <div className="text-sm font-semibold text-foreground">Transaction Volume (PKR)</div>
            <div className="mt-1 text-xs text-muted-foreground">Month-on-month volume</div>
          </div>
          <div className="relative h-[260px]">
            <Chart type="line" data={txVolumeData} options={chartOptions} />
          </div>
        </article>
      </section>

      <section className="mt-6">
        <article className="relative overflow-hidden rounded-2xl border border-border bg-card/70 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent" aria-hidden />
          <div className="relative">
            <div>
              <div className="text-sm font-semibold text-foreground">Merchant Activity Distribution</div>
              <div className="mt-1 text-xs text-muted-foreground">Portfolio health — frequency segmentation</div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
              <div className="relative -mt-4 flex w-full items-start justify-center">
                <div className="relative mx-auto h-[220px] w-[220px]">
                  <Chart type="doughnut" data={merchantActivityData} options={merchantActivityOptions} />
                  <div className="pointer-events-none absolute inset-0 flex translate-y-7 flex-col items-center justify-center text-center">
                    <div className="text-3xl font-semibold leading-none text-foreground">
                      {Number(merchantActivity.totalMerchants ?? 0).toLocaleString()}
                    </div>
                    <div className="mt-1 text-xs leading-none text-muted-foreground">merchants</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                    <span className="h-2 w-2 rounded-sm bg-emerald-400" aria-hidden />
                    <span>High (50+)</span>
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-foreground">
                    {Number(merchantActivity.totals.high ?? 0).toLocaleString()}
                  </div>
                  <div className="mt-3 h-1 w-full rounded-full bg-white/5">
                    <div
                      className="h-1 rounded-full bg-emerald-400"
                      style={{ width: `${merchantActivity.pct.high.toFixed(0)}%` }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {merchantActivity.pct.high.toFixed(0)}% of portfolio
                  </div>
                </div>

                <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                    <span className="h-2 w-2 rounded-sm bg-sky-400" aria-hidden />
                    <span>Medium (16-49)</span>
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-foreground">
                    {Number(merchantActivity.totals.medium ?? 0).toLocaleString()}
                  </div>
                  <div className="mt-3 h-1 w-full rounded-full bg-white/5">
                    <div
                      className="h-1 rounded-full bg-sky-400"
                      style={{ width: `${merchantActivity.pct.medium.toFixed(0)}%` }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {merchantActivity.pct.medium.toFixed(0)}% of portfolio
                  </div>
                </div>

                <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                    <span className="h-2 w-2 rounded-sm bg-amber-400" aria-hidden />
                    <span>Low (≤15)</span>
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-foreground">
                    {Number(merchantActivity.totals.low ?? 0).toLocaleString()}
                  </div>
                  <div className="mt-3 h-1 w-full rounded-full bg-white/5">
                    <div
                      className="h-1 rounded-full bg-amber-400"
                      style={{ width: `${merchantActivity.pct.low.toFixed(0)}%` }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {merchantActivity.pct.low.toFixed(0)}% of portfolio
                  </div>
                </div>

                <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                    <span className="h-2 w-2 rounded-sm bg-rose-400" aria-hidden />
                    <span>Inactive</span>
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-foreground">
                    {Number(merchantActivity.totals.inactive ?? 0).toLocaleString()}
                  </div>
                  <div className="mt-3 h-1 w-full rounded-full bg-white/5">
                    <div
                      className="h-1 rounded-full bg-rose-400"
                      style={{ width: `${merchantActivity.pct.inactive.toFixed(0)}%` }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {merchantActivity.pct.inactive.toFixed(0)}% of portfolio
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="mt-6 grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3">
        <article className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card/70 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent" aria-hidden />
          <div className="relative flex h-full flex-col">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-foreground">Underperforming Merchants</div>
                <div className="mt-1 text-xs text-muted-foreground">Below threshold — needs attention</div>
              </div>
              <div className="inline-flex items-center gap-2 rounded-xl border border-white/5 bg-black/20 px-3 py-1 text-xs text-muted-foreground">
                ≤ <span className="text-foreground">15</span> txns
              </div>
            </div>

            <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/5 bg-black/20">
              <div className="min-h-0 flex-1 overflow-auto">
                <div className="min-w-[680px]">
                  <div className="grid grid-cols-[1fr_80px_220px_120px] gap-3 border-b border-white/5 px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    <div>Merchant</div>
                    <div className="text-center">Txns</div>
                    <div className="text-center">Vs Target</div>
                    <div className="text-right">Risk</div>
                  </div>

                  {(dashboardWidgets.underTarget ?? []).slice(0, 8).map((m) => {
                    const barColor =
                      m.risk === "Critical" ? "bg-rose-400" : m.risk === "High" ? "bg-amber-400" : "bg-emerald-400";
                    const badge =
                      m.risk === "Critical"
                        ? "bg-rose-500/15 text-rose-200 border-rose-500/20"
                        : m.risk === "High"
                          ? "bg-amber-500/15 text-amber-200 border-amber-500/20"
                          : "bg-cyan-500/15 text-cyan-200 border-cyan-500/20";
                    const dotColor =
                      m.risk === "Critical" ? "bg-rose-300" : m.risk === "High" ? "bg-amber-300" : "bg-cyan-300";
                    const txnColor =
                      m.risk === "Critical" ? "text-rose-300" : m.risk === "High" ? "text-amber-300" : "text-emerald-300";
                    const pct = Math.max(0, Math.min(100, m.pct));

                    return (
                      <div
                        key={m.mid}
                        className="grid grid-cols-[1fr_80px_220px_120px] items-center gap-3 border-b border-white/5 px-5 py-4 last:border-b-0"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-foreground">{m.name}</div>
                          {m.subtitle ? (
                            <div className="mt-1 truncate text-[11px] text-muted-foreground">{m.subtitle}</div>
                          ) : null}
                        </div>

                        <div className={joinClasses("text-center text-sm font-semibold", txnColor)}>{m.count}</div>

                        <div className="flex items-center gap-3">
                          <div className="h-2 w-full rounded-full bg-white/5">
                            <div className={joinClasses("h-2 rounded-full", barColor)} style={{ width: `${pct}%` }} />
                          </div>
                          <div className="w-10 text-right text-[11px] text-muted-foreground">{Math.round(pct)}%</div>
                        </div>

                        <div className="flex justify-end">
                          <span
                            className={joinClasses(
                              "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold",
                              badge
                            )}
                          >
                            <span className={joinClasses("h-1.5 w-1.5 rounded-full", dotColor)} aria-hidden />
                            {m.risk}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </article>

        <article className="relative overflow-hidden rounded-2xl border border-border bg-card/70 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent" aria-hidden />
          <div className="relative">
            <div>
              <div className="text-sm font-semibold text-foreground">Top Performers</div>
              <div className="mt-1 text-xs text-muted-foreground">By txns this month</div>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              {(dashboardWidgets.topPerformers ?? []).slice(0, 5).map((m, idx) => {
                const colors = [
                  "bg-cyan-400",
                  "bg-emerald-400",
                  "bg-violet-400",
                  "bg-amber-400",
                  "bg-fuchsia-400",
                ];
                const barColor = colors[idx] ?? "bg-cyan-400";
                const max = dashboardWidgets.topPerformers?.[0]?.count ?? 1;
                const pct = max > 0 ? (m.count / max) * 100 : 0;

                return (
                  <div key={m.mid} className="rounded-2xl border border-white/5 bg-black/20 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="mt-0.5 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-background/30 text-[11px] font-semibold text-foreground">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-foreground">{m.name}</div>
                          {m.subtitle ? (
                            <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{m.subtitle}</div>
                          ) : null}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-foreground">{m.count}</div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">PKR {Math.round(m.volume).toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="mt-3 h-1 w-full rounded-full bg-white/5">
                      <div className={joinClasses("h-1 rounded-full", barColor)} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </article>

        <article className="relative overflow-hidden rounded-2xl border border-border bg-card/70 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent" aria-hidden />
          <div className="relative">
            <div>
              <div className="text-sm font-semibold text-foreground">Insights</div>
              <div className="mt-1 text-xs text-muted-foreground">Operational metrics</div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Success Rate</div>
                <div className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                  {dashboardWidgets.insights.successRate.toFixed(1)}%
                </div>
                <div
                  className={joinClasses(
                    "mt-2 text-[11px] font-semibold",
                    dashboardWidgets.insights.successDelta >= 0 ? "text-emerald-400" : "text-rose-400"
                  )}
                >
                  {dashboardWidgets.insights.successDelta >= 0 ? "↑" : "↓"} {Math.abs(dashboardWidgets.insights.successDelta).toFixed(2)} vs last mo
                </div>
              </div>

              <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Avg Txn Value</div>
                <div className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                  PKR {Math.round(dashboardWidgets.insights.avgTxnValue).toLocaleString()}
                </div>
                <div
                  className={joinClasses(
                    "mt-2 text-[11px] font-semibold",
                    dashboardWidgets.insights.avgDeltaPct >= 0 ? "text-emerald-400" : "text-rose-400"
                  )}
                >
                  {dashboardWidgets.insights.avgDeltaPct >= 0 ? "↑" : "↓"} {Math.abs(dashboardWidgets.insights.avgDeltaPct).toFixed(1)}% vs last mo
                </div>
              </div>

              <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Peak Hour</div>
                <div className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{dashboardWidgets.insights.peakHourLabel}</div>
                <div className="mt-2 text-[11px] text-muted-foreground">Daily avg</div>
              </div>

              <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Failed Today</div>
                <div className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{dashboardWidgets.insights.failedToday}</div>
                <div className="mt-2 text-[11px] font-semibold text-rose-400">
                  {dashboardWidgets.insights.failRateToday.toFixed(1)}% fail rate
                </div>
              </div>

              <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">New Onboarded</div>
                <div className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                  {dashboardWidgets.insights.newOnboardedThisMonth === null ? "--" : dashboardWidgets.insights.newOnboardedThisMonth.toLocaleString()}
                </div>
                <div className="mt-2 text-[11px] font-semibold text-emerald-400">This month</div>
              </div>

              <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Churn Risk</div>
                <div className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{dashboardWidgets.insights.churnRisk.toLocaleString()}</div>
                <div className="mt-2 text-[11px] font-semibold text-rose-400">Need outreach</div>
              </div>
            </div>
          </div>
        </article>
      </section>

      

      <section className="mt-8">
        <article className="relative overflow-hidden rounded-2xl border border-border bg-card/70 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent" aria-hidden />
          <div className="relative">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-foreground">Transaction Log</div>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/5 bg-black/20">
              <DataTable
                value={tableRows}
                dataKey="srNo"
                className="!bg-transparent"
                tableClassName="!bg-transparent"
                rowHover
                size="small"
                paginator
                rows={50}
                rowsPerPageOptions={[50, 100, 200]}
                emptyMessage="No transactions found"
              >
                {columns.map((column) => (
                  <Column
                    key={column.field}
                    field={column.field}
                    header={column.header}
                    body={column.body}
                    headerClassName={joinClasses(
                      "!border-0 !bg-transparent",
                      "px-4 py-3",
                      "text-[10px] font-semibold uppercase tracking-wider",
                      "text-slate-400"
                    )}
                    bodyClassName={joinClasses(
                      "px-4 py-3",
                      "!border-0 border-t border-white/5",
                      "text-sm text-slate-200"
                    )}
                  />
                ))}
              </DataTable>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
