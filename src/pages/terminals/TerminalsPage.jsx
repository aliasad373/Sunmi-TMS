import { useMemo, useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import api from "../../network/api";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";

const STATUS_OPTIONS = [
  { label: "All Status", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

const EDIT_STATUS_OPTIONS = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

const getCreatedAt = (row) =>
  row?.CreateDateTime ??
  row?.CreatedAt ??
  row?.CreateDate ??
  row?.createdAt ??
  row?.date ??
  null;

export default function TerminalsPage() {
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get("q");
    if (q !== null && q !== undefined) setSearchValue(String(q));
    else setSearchValue("");
  }, [location.search]);

  const [editOpen, setEditOpen] = useState(false);
  const [editTid, setEditTid] = useState("");
  const [editForm, setEditForm] = useState({
    tid: "",
    mid: "",
    type: "",
    serialNumber: "",
    phoneNumber: "",
    status: "active",
  });

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTid, setConfirmTid] = useState("");
  const [confirmAction, setConfirmAction] = useState("deactivate");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedTerminal, setSelectedTerminal] = useState(null);
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
        const termRes = await api.get("/allTerminals");

        if (ignore) return;

        setRows(
          Array.isArray(termRes?.data?.terminals) ? termRes.data.terminals : [],
        );
      } catch {
        if (!ignore) {
          setRows([]);
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
    (rows ?? []).forEach((t) => {
      const tid = String(t?.TID ?? t?.TerminalID ?? t?.terminalId ?? "").trim();
      if (!tid) return;
      const terminalType = String(
        t?.posType ?? t?.POSType ?? t?.type ?? t?.Type ?? "",
      ).trim();
      const statusStr = String(t?.Status ?? t?.status ?? "").trim();
      const explicitActive = Boolean(t?.IsActive ?? t?.Active);
      const statusActive = statusStr.toLowerCase() === "active";
      const liveType = String(terminalType).toLowerCase() === "live";
      const isActive = explicitActive || statusActive || liveType;

      const mid = String(t?.MID ?? t?.MerchantID ?? t?.merchantId ?? "").trim();
      map.set(tid, {
        tid,
        mid,
        type: terminalType,
        location: String(
          t?.Location ??
            t?.location ??
            t?.Branch ??
            t?.branch ??
            t?.serial_number ??
            "",
        ).trim(),
        active: isActive,
      });
    });
    return map;
  }, [rows]);

  const typeOptions = useMemo(() => {
    const present = new Set();
    (rows ?? []).forEach((t) => {
      const v = String(
        t?.posType ?? t?.POSType ?? t?.type ?? t?.Type ?? "",
      ).trim();
      if (v) present.add(v);
    });

    return Array.from(present)
      .sort((a, b) => a.localeCompare(b))
      .map((v) => ({ label: v, value: v }));
  }, [rows]);

  const openEdit = (row) => {
    const tid = String(
      row?.TID ?? row?.TerminalID ?? row?.terminalId ?? "",
    ).trim();
    const meta = terminalMeta.get(tid);
    const active = Boolean(meta?.active);
    const mid = String(
      row?.MID ?? row?.MerchantID ?? row?.merchantId ?? meta?.mid ?? "",
    ).trim();

    setEditTid(tid);
    setEditForm({
      tid,
      mid,
      type: String(
        row?.posType ??
          row?.POSType ??
          row?.type ??
          row?.Type ??
          meta?.type ??
          "",
      ).trim(),
      serialNumber: String(
        row?.serial_number ?? row?.SerialNumber ?? row?.serialNumber ?? "",
      ).trim(),
      phoneNumber: String(row?.PhoneNumber ?? row?.phoneNumber ?? "").trim(),
      status: active ? "active" : "inactive",
    });
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditTid("");
  };

  const saveEdit = () => {
    setRows((prev) =>
      (prev ?? []).map((t) => {
        const tid = String(
          t?.TID ?? t?.TerminalID ?? t?.terminalId ?? "",
        ).trim();
        if (tid !== editTid) return t;

        const next = { ...t };
        next.MID = editForm.mid;
        next.MerchantID = editForm.mid;
        next.posType = editForm.type;
        next.serial_number = editForm.serialNumber;
        next.SerialNumber = editForm.serialNumber;
        next.PhoneNumber = editForm.phoneNumber;
        next.Status = editForm.status === "active" ? "Active" : "Inactive";
        next.IsActive = editForm.status === "active";
        return next;
      }),
    );
    closeEdit();
  };
  const confirmDelete = async () => {
    if (!selectedTerminal?.tsID) {
      alert("Terminal ID not found");
      return;
    }

    try {
      console.log("Deleting terminal tsID:", selectedTerminal.tsID);

      await api.delete(`/delete-terminal/${selectedTerminal.tsID}`);

      setDeleteOpen(false);
      setSelectedTerminal(null);

      await getTerminals();
    } catch (error) {
      console.error("Delete terminal error:", error);

      alert(
        "Delete failed: " + (error?.response?.data?.message ?? error.message),
      );
    }
  };
  const getTerminals = useCallback(async () => {
    try {
      const response = await api.get("/all-terminals");

      console.log("Terminals response:", response.data);

      const terminals = response?.data?.data ?? response?.data?.terminals ?? [];

      setRows(Array.isArray(terminals) ? terminals : []);
    } catch (error) {
      console.error(
        "Failed to load terminals:",
        error?.response?.data || error.message,
      );
    }
  }, []);

  const openConfirm = (tid, action) => {
    setConfirmTid(tid);
    setConfirmAction(action);
    setConfirmOpen(true);
  };

  const closeConfirm = () => {
    setConfirmOpen(false);
    setConfirmTid("");
  };

  const confirmToggleStatus = () => {
    const nextActive = confirmAction === "activate";
    setRows((prev) =>
      (prev ?? []).map((t) => {
        const tid = String(
          t?.TID ?? t?.TerminalID ?? t?.terminalId ?? "",
        ).trim();
        if (tid !== confirmTid) return t;

        const next = { ...t };
        next.Status = nextActive ? "Active" : "Inactive";
        next.IsActive = nextActive;
        return next;
      }),
    );
    closeConfirm();
  };

  const filteredRows = useMemo(() => {
    const q = String(searchValue ?? "")
      .trim()
      .toLowerCase();

    return (rows ?? []).filter((t) => {
      const tid = String(t?.TID ?? t?.TerminalID ?? t?.terminalId ?? "").trim();
      const mid = String(t?.MID ?? t?.MerchantID ?? t?.merchantId ?? "").trim();
      const type = String(t?.posType ?? t?.POSType ?? t?.type ?? t?.Type ?? "");

      const meta = terminalMeta.get(tid);
      const active = Boolean(meta?.active);
      if (statusFilter === "active" && !active) return false;
      if (statusFilter === "inactive" && active) return false;

      if (!q) return true;
      return [tid, mid, type].some((v) =>
        String(v ?? "")
          .toLowerCase()
          .includes(q),
      );
    });
  }, [rows, searchValue, statusFilter, terminalMeta]);

  const exportCsv = () => {
    const headers = [
      "TerminalID",
      "MerchantID",
      "Type",
      "SerialNumber",
      "PhoneNumber",
      "Status",
    ];
    const lines = [headers.join(",")];

    filteredRows.forEach((t) => {
      const tid = String(t?.TID ?? t?.TerminalID ?? t?.terminalId ?? "").trim();
      const mid = String(t?.MID ?? t?.MerchantID ?? t?.merchantId ?? "").trim();
      const type = String(
        t?.posType ?? t?.POSType ?? t?.type ?? t?.Type ?? "",
      ).trim();
      const serial = String(t?.serial_number ?? t?.SerialNumber ?? "").trim();
      const phone = String(t?.PhoneNumber ?? t?.phoneNumber ?? "").trim();
      const active = Boolean(terminalMeta.get(tid)?.active);
      const status = active ? "Active" : "Inactive";

      lines.push(
        [
          tid,
          mid,
          JSON.stringify(type),
          JSON.stringify(serial),
          JSON.stringify(phone),
          status,
        ].join(","),
      );
    });

    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `terminals_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="mb-5 text-xs text-slate-500">
        Operations / Terminal /{" "}
        <span className="text-sky-400">All/Modify Terminal</span>
      </div>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">
            All/Modify Terminal
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Edit, activate or deactivate terminals
          </p>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-sky-500/90 px-4 py-2 text-xs font-semibold text-slate-950 shadow-sm hover:bg-sky-400"
          onClick={() => navigate("/terminals/create")}
        >
          <span className="text-sm leading-none">+</span>
          <span>Add New</span>
        </button>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#0b1220]/70 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent"
          aria-hidden
        />
        <div className="relative flex flex-wrap items-end gap-3">
          <div className="min-w-[280px] flex-1">
            <div className="relative">
              <i
                className="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500"
                aria-hidden
              />
              <InputText
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search by terminal ID, merchant..."
                className="w-full !rounded-xl !border !border-white/10 !bg-black/20 !py-2.5 !pl-9 !pr-3 !text-sm !text-slate-100 placeholder:!text-slate-500 focus:!shadow-none"
              />
            </div>
          </div>

          <div className="min-w-[150px]">
            <Dropdown
              value={statusFilter}
              options={STATUS_OPTIONS}
              onChange={(e) => setStatusFilter(e.value)}
              className="w-full !rounded-xl !border !border-white/10 !bg-black/20 !text-sm !text-slate-100"
            />
          </div>

          <Button
            type="button"
            label="Export"
            onClick={exportCsv}
            disabled={loading}
            className="!rounded-lg !border !border-white/10 !bg-white/5 !px-4 !py-2.5 !text-xs !font-semibold !text-slate-100 hover:!bg-white/10"
          />
        </div>
      </div>

      <section className="mt-5 relative overflow-hidden rounded-2xl border border-white/5 bg-[#0b1220]/70 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent"
          aria-hidden
        />
        <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-black/20">
          <DataTable
            value={filteredRows}
            dataKey="TID"
            className="!bg-transparent"
            tableClassName="!bg-transparent"
            rowHover
            size="small"
            scrollable
            scrollHeight="520px"
            paginator
            rows={25}
            rowsPerPageOptions={[25, 500, 1000]}
            emptyMessage={loading ? "Loading..." : "No terminals found"}
          >
            <Column
              header="Terminal ID"
              body={(row) => {
                const tid = String(row?.TID ?? row?.TerminalID ?? "").trim();
                return <span className="text-sky-300">{tid || "-"}</span>;
              }}
              headerClassName="!border-0 !bg-transparent px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
              bodyClassName="px-4 py-3 !border-0 border-t border-white/5 text-sm"
            />
            <Column
              header="Merchant ID"
              body={(row) =>
                String(row?.MID ?? row?.MerchantID ?? row?.merchantId ?? "-")
              }
              headerClassName="!border-0 !bg-transparent px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
              bodyClassName="px-4 py-3 !border-0 border-t border-white/5 text-sm text-slate-200"
            />
            <Column
              header="Type"
              body={(row) =>
                String(
                  row?.posType ?? row?.POSType ?? row?.type ?? row?.Type ?? "-",
                )
              }
              headerClassName="!border-0 !bg-transparent px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
              bodyClassName="px-4 py-3 !border-0 border-t border-white/5 text-sm text-slate-200"
            />
            <Column
              header="Serial Number"
              body={(row) =>
                String(row?.serial_number ?? row?.SerialNumber ?? "-")
              }
              headerClassName="!border-0 !bg-transparent px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
              bodyClassName="px-4 py-3 !border-0 border-t border-white/5 text-sm text-slate-200"
            />
            <Column
              header="Phone Number"
              body={(row) =>
                String(row?.PhoneNumber ?? row?.phoneNumber ?? "-")
              }
              headerClassName="!border-0 !bg-transparent px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
              bodyClassName="px-4 py-3 !border-0 border-t border-white/5 text-sm text-slate-200"
            />
            <Column
              header="Status"
              body={(row) => {
                const tid = String(row?.TID ?? row?.TerminalID ?? "").trim();
                const active = Boolean(terminalMeta.get(tid)?.active);
                return (
                  <span
                    className={
                      active
                        ? "inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200"
                        : "inline-flex items-center gap-2 rounded-full bg-slate-500/15 px-3 py-1 text-xs font-semibold text-slate-200"
                    }
                  >
                    <span
                      className={
                        active
                          ? "h-2 w-2 rounded-full bg-emerald-400"
                          : "h-2 w-2 rounded-full bg-slate-400"
                      }
                    />
                    {active ? "Active" : "Inactive"}
                  </span>
                );
              }}
              headerClassName="!border-0 !bg-transparent px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
              bodyClassName="px-4 py-3 !border-0 border-t border-white/5 text-sm text-slate-200"
            />
            <Column
              header="Actions"
              body={(row) => {
                const tid = String(row?.TID ?? row?.TerminalID ?? "").trim();
                const active = Boolean(terminalMeta.get(tid)?.active);
                return (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                      onClick={() => openEdit(row)}
                      aria-label="Edit"
                    >
                      <i className="pi pi-pencil text-xs" aria-hidden />
                    </button>

                    <button
                      type="button"
                      className={
                        active
                          ? "inline-flex items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-500/15"
                          : "inline-flex items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/15"
                      }
                      onClick={() =>
                        openConfirm(tid, active ? "deactivate" : "activate")
                      }
                    >
                      {active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                      onClick={() => {
                        setSelectedTerminal({
                          tsID: row?.tsID,
                          tid: row?.TID,
                        });

                        setDeleteOpen(true);
                      }}
                      aria-label="Delete"
                      title="Delete"
                    >
                      <i className="pi pi-trash text-xs" aria-hidden />
                    </button>
                  </div>
                );
              }}
              headerClassName="!border-0 !bg-transparent px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
              bodyClassName="px-4 py-3 !border-0 border-t border-white/5 text-sm text-slate-200"
            />
          </DataTable>
        </div>
      </section>

      <Dialog
        visible={editOpen}
        onHide={closeEdit}
        dismissableMask
        maskClassName="bg-black/70 backdrop-blur-sm"
        breakpoints={{ "768px": "95vw" }}
        style={{ width: "min(720px, 92vw)" }}
        className="!bg-transparent !border-0 !shadow-none"
        contentClassName="!bg-transparent !border-0 !p-0"
        showHeader={false}
      >
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0b1220] text-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.06] via-transparent to-transparent"
            aria-hidden
          />
          <div className="relative p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-base font-semibold tracking-tight">
                  Edit Terminal
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  ID: {editForm.tid || "-"}
                </div>
              </div>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                onClick={closeEdit}
                aria-label="Close"
              >
                <i className="pi pi-times text-xs" aria-hidden />
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-medium text-slate-300">
                  Terminal ID
                </label>
                <InputText
                  value={editForm.tid}
                  disabled
                  className="w-full !h-[46px] !rounded-xl !border !border-white/10 !bg-black/20 !px-4 !text-sm !text-slate-200 placeholder:!text-slate-500 focus:!shadow-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-slate-300">
                  Merchant ID
                </label>
                <InputText
                  value={editForm.mid}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, mid: e.target.value }))
                  }
                  placeholder="Merchant ID"
                  className="w-full !h-[46px] !rounded-xl !border !border-white/10 !bg-black/20 !px-4 !text-sm !text-slate-100 placeholder:!text-slate-500 focus:!shadow-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-slate-300">
                  Type
                </label>
                <Dropdown
                  value={editForm.type}
                  options={typeOptions}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, type: e.value }))
                  }
                  placeholder="Select type"
                  className="w-full !h-[46px] !rounded-xl !border !border-white/10 !bg-black/20 !text-sm !text-slate-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-slate-300">
                  Serial Number
                </label>
                <InputText
                  value={editForm.serialNumber}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      serialNumber: e.target.value,
                    }))
                  }
                  placeholder="Serial Number"
                  className="w-full !h-[46px] !rounded-xl !border !border-white/10 !bg-black/20 !px-4 !text-sm !text-slate-100 placeholder:!text-slate-500 focus:!shadow-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-slate-300">
                  Phone Number
                </label>
                <InputText
                  value={editForm.phoneNumber}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      phoneNumber: e.target.value,
                    }))
                  }
                  placeholder="Phone Number"
                  className="w-full !h-[46px] !rounded-xl !border !border-white/10 !bg-black/20 !px-4 !text-sm !text-slate-100 placeholder:!text-slate-500 focus:!shadow-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-slate-300">
                  Status
                </label>
                <Dropdown
                  value={editForm.status}
                  options={EDIT_STATUS_OPTIONS}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, status: e.value }))
                  }
                  className="w-full !h-[46px] !rounded-xl !border !border-white/10 !bg-black/20 !text-sm !text-slate-100"
                />
              </div>
            </div>

            <div className="mt-7 flex items-center justify-end gap-3">
              <Button
                type="button"
                label="Cancel"
                onClick={closeEdit}
                className="!rounded-lg !border !border-white/10 !bg-white/5 !px-4 !py-2.5 !text-xs !font-semibold !text-slate-100 hover:!bg-white/10"
              />
              <Button
                type="button"
                label="Save Changes"
                onClick={saveEdit}
                className="!rounded-lg !border !border-sky-500/30 !bg-sky-500/15 !px-4 !py-2.5 !text-xs !font-semibold !text-sky-200 hover:!bg-sky-500/20"
              />
            </div>
          </div>
        </div>
      </Dialog>

      <Dialog
        visible={confirmOpen}
        onHide={closeConfirm}
        dismissableMask
        maskClassName="bg-black/70 backdrop-blur-sm"
        breakpoints={{ "768px": "95vw" }}
        style={{ width: "min(680px, 92vw)" }}
        className="!bg-transparent !border-0 !shadow-none"
        contentClassName="!bg-transparent !border-0 !p-0"
        showHeader={false}
      >
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0b1220] text-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.06] via-transparent to-transparent"
            aria-hidden
          />
          <div className="relative p-7">
            <div className="text-lg font-semibold tracking-tight">
              {confirmAction === "activate"
                ? "Activate Terminal"
                : "Deactivate Terminal"}
            </div>
            <div className="mt-2 text-sm text-slate-400">
              You are about to change the status of:{" "}
              <span className="text-slate-200">{confirmTid || "-"}</span>
            </div>

            <div className="mt-5 text-sm text-slate-300">
              {confirmAction === "activate"
                ? "This will activate the record. Are you sure?"
                : "This will deactivate the record. Are you sure?"}
            </div>

            <div className="mt-6 border-t border-white/10 pt-6 flex items-center justify-end gap-3">
              <Button
                type="button"
                label="Cancel"
                onClick={closeConfirm}
                className="!rounded-lg !border !border-white/10 !bg-white/5 !px-5 !py-2.5 !text-xs !font-semibold !text-slate-100 hover:!bg-white/10"
              />
              <Button
                type="button"
                label={
                  confirmAction === "activate"
                    ? "Activate Terminal"
                    : "Deactivate Terminal"
                }
                onClick={confirmToggleStatus}
                className={
                  confirmAction === "activate"
                    ? "!rounded-lg !border !border-emerald-500/30 !bg-emerald-500/15 !px-5 !py-2.5 !text-xs !font-semibold !text-emerald-200 hover:!bg-emerald-500/20"
                    : "!rounded-lg !border !border-rose-500/30 !bg-rose-500/15 !px-5 !py-2.5 !text-xs !font-semibold !text-rose-200 hover:!bg-rose-500/20"
                }
              />
            </div>
          </div>
        </div>
      </Dialog>
      <Dialog
        visible={deleteOpen}
        onHide={() => {
          setDeleteOpen(false);
          setSelectedTerminal(null);
        }}
        dismissableMask
        modal
        showHeader={false}
        className="!bg-transparent !border-0 !shadow-none"
        contentClassName="!bg-transparent !border-0 !p-0"
        style={{ width: "min(420px, 92vw)" }}
      >
        <div className="rounded-2xl border border-white/10 bg-[#0b1220] p-6 text-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
              <i className="pi pi-trash text-red-400" />
            </div>

            <div>
              <h3 className="text-base font-semibold">Delete Terminal</h3>

              <p className="mt-1 text-xs text-slate-400">
                Are you sure you want to delete this terminal?
              </p>
            </div>
          </div>

          {selectedTerminal?.tsID && (
            <div className="mt-5 rounded-lg border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">
                Terminal ID
              </div>

              <div className="mt-1 text-sm font-semibold text-slate-200">
                {selectedTerminal.tid}
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <Button
              label="Cancel"
              type="button"
              onClick={() => {
                setDeleteOpen(false);
                setSelectedTerminal(null);
              }}
              className="!rounded-lg !border !border-white/10 !bg-white/5 !px-4 !py-2.5 !text-xs !font-semibold !text-slate-100 hover:!bg-white/10"
            />

            <Button
              label="Delete"
              type="button"
              onClick={confirmDelete}
              className="!rounded-lg !border !border-red-500/30 !bg-red-500/15 !px-4 !py-2.5 !text-xs !font-semibold !text-red-300 hover:!bg-red-500/25"
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
