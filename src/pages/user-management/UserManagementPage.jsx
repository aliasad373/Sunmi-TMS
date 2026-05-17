import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import "./UserManagementPage.css";
import api from "../../network/api";  

const USERS = [
  {
    userId: 101,
    name: "Asad",
    username: "asad@DGK",
    password: "DGK929292",
    access: [{ label: "Admin", type: "admin" }],
  },
  {
    userId: 102,
    name: "Iyma",
    username: "iyma.123",
    password: "nenjopq12",
    access: [
      { label: "Merchant Creation", type: "primary" },
      { label: "Bind/Unbind", type: "secondary" },
    ],
  },
  {
    userId: 103,
    name: "Noor",
    username: "noor11@DGK",
    password: "0909op",
    access: [{ label: "Merchant Creation", type: "primary" }],
  },
  {
    userId: 104,
    name: "Ismail",
    username: "ismail0202",
    password: "imniopq12",
    access: [{ label: "Bind/Unbind", type: "secondary" }],
  },
  {
    userId: 105,
    name: "Usman Ali",
    username: "usman@DGK",
    password: "123wer45",
    access: [{ label: "View Only", type: "view" }],
  },
];

export default function UserManagementPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");

  const [editOpen, setEditOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [editForm, setEditForm] = useState({
    username: "",
    name: "",
    user_type: "operator",
    status: "active",
  });

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmUserId, setConfirmUserId] = useState(null);
  const [confirmAction, setConfirmAction] = useState("deactivate");

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await api.get("/users");
        const data = response.data?.users ?? [];
        setUser(Array.isArray(data) ? data : []);
      } catch {
        setUser([]);
      }
    };
    loadUsers();
  }, []);

  const openEditDialog = useCallback((row) => {
    const active = Number(row?.isBlocked ?? 0) !== 1;
    setEditingUserId(row?.id ?? null);
    setEditForm({
      username: String(row?.username ?? "").trim(),
      name: String(row?.name ?? "").trim(),
      user_type: String(row?.user_type ?? row?.role ?? "operator").trim() || "operator",
      status: active ? "active" : "inactive",
    });
    setEditOpen(true);
  }, []);

  const closeEditDialog = useCallback(() => {
    setEditOpen(false);
    setEditingUserId(null);
  }, []);

  const saveEditDialog = useCallback(() => {
    if (editingUserId === null || editingUserId === undefined) {
      closeEditDialog();
      return;
    }

    setUser((prev) =>
      (prev ?? []).map((u) => {
        if (u?.id !== editingUserId) return u;
        const isBlocked = editForm.status === "inactive" ? 1 : 0;
        return {
          ...u,
          username: editForm.username,
          name: editForm.name,
          user_type: editForm.user_type,
          isBlocked,
        };
      })
    );

    closeEditDialog();
  }, [closeEditDialog, editForm.name, editForm.status, editForm.user_type, editForm.username, editingUserId]);

  const roleOptions = useMemo(() => {
    const roles = new Set();
    (user ?? []).forEach((u) => {
      const r = String(u?.user_type ?? u?.role ?? "").trim();
      if (r) roles.add(r);
    });
    return [{ label: "All Roles", value: "all" }, ...Array.from(roles).sort().map((r) => ({ label: r, value: r }))];
  }, [user]);

  const editRoleOptions = useMemo(() => {
    const present = new Map();
    present.set("operator", { label: "operator", value: "operator" });
    present.set("admin", { label: "admin", value: "admin" });
    roleOptions
      .filter((o) => o.value !== "all")
      .forEach((o) => {
        present.set(String(o.value), { label: String(o.label), value: String(o.value) });
      });
    return Array.from(present.values());
  }, [roleOptions]);

  const statusOptions = useMemo(
    () => [
      { label: "All Status", value: "all" },
      { label: "Active", value: "active" },
      { label: "Inactive", value: "inactive" },
    ],
    []
  );

  const filteredUsers = useMemo(() => {
    const q = String(searchText ?? "").trim().toLowerCase();
    return (user ?? []).filter((u) => {
      const username = String(u?.username ?? "").toLowerCase();
      const name = String(u?.name ?? "").toLowerCase();
      const role = String(u?.user_type ?? u?.role ?? "").trim();
      const isBlocked = Number(u?.isBlocked ?? 0) === 1;
      const status = isBlocked ? "inactive" : "active";

      if (q && !username.includes(q) && !name.includes(q) && !role.toLowerCase().includes(q)) return false;
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (roleFilter !== "all" && role !== roleFilter) return false;
      return true;
    });
  }, [roleFilter, searchText, statusFilter, user]);

  const statusPill = useCallback((row) => {
    const active = Number(row?.isBlocked ?? 0) !== 1;
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

  const openConfirm = useCallback((row, action) => {
    const id = row?.id;
    if (id === null || id === undefined) return;
    setConfirmUserId(id);
    setConfirmAction(action);
    setConfirmOpen(true);
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmOpen(false);
    setConfirmUserId(null);
  }, []);

  const confirmToggleStatus = useCallback(() => {
    const nextActive = confirmAction === "activate";
    setUser((prev) =>
      (prev ?? []).map((u) => {
        if (u?.id !== confirmUserId) return u;
        return { ...u, isBlocked: nextActive ? 0 : 1 };
      })
    );
    closeConfirm();
  }, [closeConfirm, confirmAction, confirmUserId]);

  const actionTemplate = useCallback(
    (row) => {
      const active = Number(row?.isBlocked ?? 0) !== 1;
      return (
        <div className="flex w-full items-center justify-start gap-2">
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-black/20 text-slate-200 hover:bg-black/30"
            aria-label="Edit user"
            onClick={() => openEditDialog(row)}
          >
            <i className="pi pi-pencil" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => openConfirm(row, active ? "deactivate" : "activate")}
            className={
              active
                ? "h-9 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 text-xs font-semibold text-rose-200 hover:bg-rose-500/15"
                : "h-9 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/15"
            }
          >
            {active ? "Deactivate" : "Activate"}
          </button>
        </div>
      );
    },
    [openConfirm, openEditDialog]
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="mb-5 text-xs text-slate-500">
        User Management / <span className="text-sky-400">Modify User</span>
      </div>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Modify User</h1>
          <p className="mt-1 text-sm text-slate-400">Edit user details, roles, and access status</p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/users/create")}
          className="h-10 rounded-xl border border-cyan-400/40 bg-cyan-400/90 px-4 text-xs font-semibold text-slate-950 hover:bg-cyan-300"
        >
          Add New User
        </button>
      </div>

      <section className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_180px]">
        <div className="rounded-2xl border border-white/5 bg-white/5 p-3">
          <div className="flex items-center gap-2">
            <i className="pi pi-search text-xs text-slate-500" aria-hidden />
            <InputText
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search by name, username, role..."
              className="w-full !border-0 !bg-transparent !text-sm !text-slate-100 placeholder:!text-slate-500 focus:!shadow-none"
            />
          </div>
        </div>

        <Dropdown
          value={statusFilter}
          options={statusOptions}
          onChange={(e) => setStatusFilter(e.value)}
          optionLabel="label"
          optionValue="value"
          className="w-full !rounded-2xl !border !border-white/5 !bg-white/5 !text-sm !text-slate-100"
        />

        <Dropdown
          value={roleFilter}
          options={roleOptions}
          onChange={(e) => setRoleFilter(e.value)}
          optionLabel="label"
          optionValue="value"
          className="w-full !rounded-2xl !border !border-white/5 !bg-white/5 !text-sm !text-slate-100"
        />
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/5 bg-white/5">
        <DataTable
          value={filteredUsers}
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
            header="Full Name"
            headerClassName="!border-0 !bg-transparent px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
            bodyClassName="px-4 py-3 !border-0 border-t border-white/5 text-sm font-semibold text-slate-100"
          />
          <Column
            field="user_type"
            header="Role"
            body={(row) => String(row?.user_type ?? "-")}
            headerClassName="!border-0 !bg-transparent px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
            bodyClassName="px-4 py-3 !border-0 border-t border-white/5 text-sm text-slate-200"
          />
          <Column
            header="Organization"
            body={() => "-"}
            headerClassName="!border-0 !bg-transparent px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
            bodyClassName="px-4 py-3 !border-0 border-t border-white/5 text-sm text-slate-200"
          />
          <Column
            header="Email"
            body={() => "-"}
            headerClassName="!border-0 !bg-transparent px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
            bodyClassName="px-4 py-3 !border-0 border-t border-white/5 text-sm text-slate-200"
          />
          <Column
            header="Last Login"
            body={() => "-"}
            headerClassName="!border-0 !bg-transparent px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
            bodyClassName="px-4 py-3 !border-0 border-t border-white/5 text-xs text-slate-200"
          />
          <Column
            header="Status"
            body={statusPill}
            headerClassName="!border-0 !bg-transparent px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
            bodyClassName="px-4 py-3 !border-0 border-t border-white/5"
          />
          <Column
            header="Actions"
            body={actionTemplate}
            headerClassName="!border-0 !bg-transparent px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-400"
            bodyClassName="px-4 py-3 !border-0 border-t border-white/5"
          />
        </DataTable>
      </section>

      <Dialog
        visible={editOpen}
        onHide={closeEditDialog}
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
                <div className="text-base font-semibold tracking-tight">Edit User</div>
                <div className="mt-1 text-xs text-slate-400">ID: {editingUserId ?? "-"}</div>
              </div>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                onClick={closeEditDialog}
                aria-label="Close"
              >
                <i className="pi pi-times text-xs" aria-hidden />
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-medium text-slate-300">Username</label>
                <InputText
                  value={editForm.username}
                  onChange={(e) => setEditForm((p) => ({ ...p, username: e.target.value }))}
                  className="w-full !h-[46px] !rounded-xl !border !border-white/10 !bg-black/20 !px-4 !text-sm !text-slate-100 placeholder:!text-slate-500 focus:!shadow-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-slate-300">Full Name</label>
                <InputText
                  value={editForm.name}
                  onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full !h-[46px] !rounded-xl !border !border-white/10 !bg-black/20 !px-4 !text-sm !text-slate-100 placeholder:!text-slate-500 focus:!shadow-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-slate-300">Role</label>
                <Dropdown
                  value={editForm.user_type}
                  options={editRoleOptions}
                  onChange={(e) => setEditForm((p) => ({ ...p, user_type: e.value }))}
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Select role"
                  className="w-full !h-[46px] !rounded-xl !border !border-white/10 !bg-black/20 !text-sm !text-slate-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-slate-300">Status</label>
                <Dropdown
                  value={editForm.status}
                  options={[
                    { label: "Active", value: "active" },
                    { label: "Inactive", value: "inactive" },
                  ]}
                  onChange={(e) => setEditForm((p) => ({ ...p, status: e.value }))}
                  optionLabel="label"
                  optionValue="value"
                  className="w-full !h-[46px] !rounded-xl !border !border-white/10 !bg-black/20 !text-sm !text-slate-100"
                />
              </div>
            </div>

            <div className="mt-7 flex items-center justify-end gap-3">
              <Button
                type="button"
                label="Cancel"
                onClick={closeEditDialog}
                className="!rounded-lg !border !border-white/10 !bg-white/5 !px-4 !py-2.5 !text-xs !font-semibold !text-slate-100 hover:!bg-white/10"
              />
              <Button
                type="button"
                label="Save Changes"
                onClick={saveEditDialog}
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
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.06] via-transparent to-transparent" aria-hidden />
          <div className="relative p-7">
            <div className="text-lg font-semibold tracking-tight">
              {confirmAction === "activate" ? "Activate User" : "Deactivate User"}
            </div>
            <div className="mt-2 text-sm text-slate-400">
              You are about to change the status of: <span className="text-slate-200">{confirmUserId ?? "-"}</span>
            </div>

            <div className="mt-5 text-sm text-slate-300">
              {confirmAction === "activate"
                ? "This will activate the record. Are you sure?"
                : "This will deactivate the record. Are you sure?"}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-white/10 pt-6">
              <Button
                type="button"
                label="Cancel"
                onClick={closeConfirm}
                className="!rounded-lg !border !border-white/10 !bg-white/5 !px-5 !py-2.5 !text-xs !font-semibold !text-slate-100 hover:!bg-white/10"
              />
              <Button
                type="button"
                label={confirmAction === "activate" ? "Activate User" : "Deactivate User"}
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
    </div>
  );
}
