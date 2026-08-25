import { useEffect, useMemo, useState, useCallback } from "react";
import { Chart } from "primereact/chart";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import api from "../../network/api";

const toYyyyMm = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
};

const formatMonthLabel = (yyyyMm) => {
  const [y, m] = String(yyyyMm).split("-");
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

const getDateValue = (row) =>
  row?.lastLogin ??
  row?.LastLogin ??
  row?.last_login ??
  row?.lastLoginAt ??
  row?.LastLoginAt ??
  row?.updatedAt ??
  row?.UpdatedAt ??
  row?.createdAt ??
  row?.CreatedAt ??
  row?.created_at ??
  row?.Created_at ??
  null;

const safeParseDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

const formatDateTime = (value) => {
  const d = safeParseDate(value);
  if (!d) return "-";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
};

const csvEscape = (value) => {
  if (value === null || value === undefined) return "";
  const str = String(value);
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
};

export default function UserReportsPage({
  breadcrumbSection = "Reports",
  breadcrumbCurrent = "User Report",
  pageTitle = "User Report",
  pageSubtitle = "User access and activity log",
} = {}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const joinClasses = (...classes) => classes.filter(Boolean).join(" ");

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await api.get("/users");
        const list = Array.isArray(response?.data?.users) ? response.data.users : [];
        if (!ignore) setRows(list);
      } catch {
        if (!ignore) {
          setRows([]);
          setError("Failed to load users.");
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

  const now = useMemo(() => new Date(), []);

  const userStats = useMemo(() => {
    const totalUsers = rows.length;

    const getActive = (u) => {
      const raw = u?.IsActive ?? u?.isActive ?? u?.Active ?? u?.active ?? null;
      if (raw !== null && raw !== undefined) {
        if (typeof raw === "boolean") return raw;
        if (typeof raw === "number") return raw === 1;
        const s = String(raw).trim().toLowerCase();
        if (s === "1" || s === "true" || s === "yes") return true;
        if (s === "0" || s === "false" || s === "no") return false;
      }
      const status = String(u?.Status ?? u?.status ?? "").trim().toLowerCase();
      if (status === "active") return true;
      if (status === "inactive") return false;
      return true;
    };

    const activeUsers = rows.filter(getActive).length;

    const orgSet = new Set();
    rows.forEach((u) => {
      const org = String(
        u?.Organization ?? u?.organization ?? u?.Org ?? u?.org ?? u?.Company ?? u?.company ?? u?.Department ?? u?.department ?? ""
      ).trim();
      if (org) orgSet.add(org);
    });
    const organizations = orgSet.size;

    const thisMonthKey = toYyyyMm(now);
    let loginsThisMonth = 0;
    rows.forEach((u) => {
      const d = safeParseDate(getDateValue(u));
      if (!d) return;
      if (toYyyyMm(d) === thisMonthKey) loginsThisMonth += 1;
    });

    return { totalUsers, activeUsers, organizations, loginsThisMonth };
  }, [now, rows]);

  const monthSeries = useMemo(() => {
    const keys = [];
    for (let i = 2; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keys.push(toYyyyMm(d));
    }

    const counts = new Map(keys.map((k) => [k, 0]));
    rows.forEach((u) => {
      const d = safeParseDate(getDateValue(u));
      if (!d) return;
      const k = toYyyyMm(d);
      if (!counts.has(k)) return;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    });

    return {
      labels: keys.map(formatMonthLabel),
      values: keys.map((k) => counts.get(k) ?? 0),
    };
  }, [now, rows]);

  const roleDistribution = useMemo(() => {
    const buckets = new Map();
    rows.forEach((u) => {
      const accessArr = Array.isArray(u?.access) ? u.access : Array.isArray(u?.Access) ? u.Access : [];
      const accessType = accessArr
        .map((a) => String(a?.type ?? a?.Type ?? "").trim())
        .filter(Boolean)[0];
      const accessLabel = accessArr
        .map((a) => String(a?.label ?? a?.Label ?? "").trim())
        .filter(Boolean)[0];

      const role =
        String(accessLabel || accessType || u?.user_type || u?.UserType || u?.role || u?.Role || "Unknown").trim() ||
        "Unknown";

      buckets.set(role, (buckets.get(role) ?? 0) + 1);
    });
    const labels = Array.from(buckets.keys());
    const data = labels.map((l) => buckets.get(l));
    return { labels, data };
  }, [rows]);

  const activityRows = useMemo(() => {
    return (rows ?? []).map((u) => {
      const username = String(u?.username ?? u?.Username ?? "-").trim() || "-";
      const name = String(u?.name ?? u?.Name ?? "-").trim() || "-";
      const role = String(u?.user_type ?? u?.UserType ?? u?.role ?? u?.Role ?? "operator").trim() || "-";
      const organization =
        String(
          u?.Organization ?? u?.organization ?? u?.Org ?? u?.org ?? u?.Company ?? u?.company ?? u?.Department ?? u?.department ?? ""
        ).trim() || "-";

      const lastLoginRaw = getDateValue(u);
      const lastLogin = formatDateTime(lastLoginRaw);
      const lastAction = String(u?.lastAction ?? u?.LastAction ?? "-").trim() || "-";
      const loginsMo = Number(u?.loginsThisMonth ?? u?.LoginsThisMonth ?? u?.logins_mo ?? 0) || 0;

      const blocked = Number(u?.isBlocked ?? u?.IsBlocked ?? 0) === 1;
      const active = !blocked;
      const status = active ? "Active" : "Inactive";

      return { id: u?.id ?? u?.userId ?? username, username, name, role, organization, loginsMo, lastAction, lastLogin, status };
    });
  }, [rows]);

  const roleBadge = useCallback((row) => {
    const role = String(row?.role ?? "").trim() || "-";
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-violet-500/15 px-3 py-1 text-xs font-semibold text-violet-200">
        <span className="h-2 w-2 rounded-full bg-violet-400" />
        {role}
      </span>
    );
  }, []);

  const statusBadge = useCallback((row) => {
    const active = String(row?.status ?? "").trim().toLowerCase() === "active";
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

  const lineData = useMemo(
    () => ({
      labels: monthSeries.labels,
      datasets: [
        {
          label: "Users",
          data: monthSeries.values,
          tension: 0.35,
          fill: true,
          borderColor: "rgba(168, 85, 247, 0.9)",
          backgroundColor: "rgba(168, 85, 247, 0.12)",
          pointRadius: 3,
          pointHoverRadius: 4,
        },
      ],
    }),
    [monthSeries]
  );

  const donutData = useMemo(
    () => ({
      labels: roleDistribution.labels,
      datasets: [
        {
          data: roleDistribution.data,
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
    [roleDistribution.data, roleDistribution.labels]
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
    const headers = ["ID", "Name", "Username", "UserType", "Organization", "Status", "LastActivity"]; 
    const lines = [headers.join(",")];

    rows.forEach((u) => {
      const values = [
        csvEscape(u?.id ?? u?.userId ?? ""),
        csvEscape(u?.name ?? ""),
        csvEscape(u?.username ?? ""),
        csvEscape(u?.user_type ?? u?.UserType ?? ""),
        csvEscape(u?.Organization ?? u?.organization ?? u?.Company ?? u?.company ?? ""),
        csvEscape(u?.Status ?? u?.status ?? (u?.IsActive ?? u?.Active ?? "")),
        csvEscape(getDateValue(u) ?? ""),
      ];
      lines.push(values.join(","));
    });

    const csv = lines.join("\n");
    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `user-report_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [rows]);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="mb-5 text-xs text-slate-500">
        {breadcrumbSection} / <span className="text-sky-400">{breadcrumbCurrent}</span>
      </div>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">{pageTitle}</h1>
          <p className="mt-1 text-sm text-slate-400">{pageSubtitle}</p>
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={loading || rows.length === 0}
          className={joinClasses(
            "inline-flex items-center justify-center rounded-xl px-4 py-2 text-xs font-semibold",
            loading || rows.length === 0
              ? "cursor-not-allowed border border-white/10 bg-white/5 text-slate-400"
              : "border border-cyan-400/40 bg-cyan-400/90 text-slate-950 hover:bg-cyan-300"
          )}
        >
          Export CSV
        </button>
      </div>

      {error ? <div className="mb-4 text-sm font-semibold text-rose-400">{error}</div> : null}

      <section className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-2xl border border-white/5 bg-[#0b1220]/70 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total Users</div>
          <div className="mt-3 text-2xl font-semibold text-fuchsia-300">{userStats.totalUsers.toLocaleString()}</div>
        </article>

        <article className="rounded-2xl border border-white/5 bg-[#0b1220]/70 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Active Users</div>
          <div className="mt-3 text-2xl font-semibold text-emerald-300">{userStats.activeUsers.toLocaleString()}</div>
        </article>

        <article className="rounded-2xl border border-white/5 bg-[#0b1220]/70 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Organizations</div>
          <div className="mt-3 text-2xl font-semibold text-cyan-300">{userStats.organizations.toLocaleString()}</div>
        </article>

        <article className="rounded-2xl border border-white/5 bg-[#0b1220]/70 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Logins This Month</div>
          <div className="mt-3 text-2xl font-semibold text-violet-300">{userStats.loginsThisMonth.toLocaleString()}</div>
        </article>
      </section>

      <section className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <article className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#0b1220]/70 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent" aria-hidden />
          <div className="relative">
            <div className="text-sm font-semibold text-slate-100">Monthly Active Users</div>
            <div className="mt-4 h-[260px]">
              <Chart type="line" data={lineData} options={chartOptions} />
            </div>
          </div>
        </article>

        <article className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#0b1220]/70 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent" aria-hidden />
          <div className="relative">
            <div className="text-sm font-semibold text-slate-100">Role Distribution</div>
            <div className="mt-4 h-[310px]">
              <Chart type="doughnut" data={donutData} options={donutOptions} />
            </div>
          </div>
        </article>
      </section>

      {loading ? <div className="mt-4 text-xs text-slate-500">Loading…</div> : null}

      <section className="mt-6 overflow-hidden rounded-2xl border border-white/5 bg-white/5">
        <div className="border-b border-white/5 px-5 py-4">
          <div className="text-sm font-semibold text-slate-100">User Activity Log</div>
        </div>
        <DataTable
          value={activityRows}
          loading={loading}
          dataKey="id"
          className="!bg-transparent"
          tableClassName="!bg-transparent"
          rowHover
          size="small"
          responsiveLayout="scroll"
          paginator
          rows={50}
          rowsPerPageOptions={[25, 50, 100, 200]}
          paginatorClassName="!border-0 !bg-transparent border-t border-white/5"
          emptyMessage="No users found"
        >
          <Column
            field="username"
            header="Username"
            body={(row) => <span className="text-sky-300">{row?.username ?? "-"}</span>}
            headerClassName="!border-0 !bg-transparent px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
            bodyClassName="px-4 py-3 !border-0 border-t border-white/5 text-sm text-slate-200"
          />
          <Column
            field="name"
            header="Name"
            headerClassName="!border-0 !bg-transparent px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
            bodyClassName="px-4 py-3 !border-0 border-t border-white/5 text-sm text-slate-200"
          />
          <Column
            field="role"
            header="Role"
            body={roleBadge}
            headerClassName="!border-0 !bg-transparent px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
            bodyClassName="px-4 py-3 !border-0 border-t border-white/5 text-sm text-slate-200"
          />
          <Column
            field="organization"
            header="Organization"
            headerClassName="!border-0 !bg-transparent px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
            bodyClassName="px-4 py-3 !border-0 border-t border-white/5 text-sm text-slate-200"
          />
          <Column
            field="loginsMo"
            header="Logins (Mo)"
            headerClassName="!border-0 !bg-transparent px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
            bodyClassName="px-4 py-3 !border-0 border-t border-white/5 text-sm text-slate-200"
          />
          <Column
            field="lastAction"
            header="Last Action"
            headerClassName="!border-0 !bg-transparent px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
            bodyClassName="px-4 py-3 !border-0 border-t border-white/5 text-sm text-slate-200"
          />
          <Column
            field="lastLogin"
            header="Last Login"
            headerClassName="!border-0 !bg-transparent px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
            bodyClassName="px-4 py-3 !border-0 border-t border-white/5 text-xs text-slate-200"
          />
          <Column
            field="status"
            header="Status"
            body={statusBadge}
            headerClassName="!border-0 !bg-transparent px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
            bodyClassName="px-4 py-3 !border-0 border-t border-white/5 text-sm text-slate-200"
          />
        </DataTable>
      </section>
    </div>
  );
}
