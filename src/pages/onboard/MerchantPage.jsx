import { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Checkbox } from "primereact/checkbox";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import searchIcon from "../../assets/images/search-icon.svg";
import api from "../../network/api";
const MERCHANTS = [
  { label: "Cheesious - Merchant ID", value: "cheesious" },
  { label: "Cafe Bloom - Merchant ID", value: "cafebloom" },
  { label: "Grocer's Hub - Merchant ID", value: "grocershub" },
];



export default function MerchantPage() {

  const [selectedMerchant, setSelectedMerchant] = useState(MERCHANTS[0].value);
  const [searchValue, setSearchValue] = useState("");
  const [rows, setRows] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMid, setConfirmMid] = useState("");
  const [confirmNextActive, setConfirmNextActive] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editMid, setEditMid] = useState("");
  const [editForm, setEditForm] = useState({
    mid: "",
    merchantName: "",
    businessName: "",
    phoneNumber: "",
    address: "",
    status: "active",
  });
  const navigate = useNavigate();
   useEffect(()=>{
    const loadMerchants = async()=>{
    var response = await api.get("/all-merchants");
    const data  = response.data.data;
    setRows(data)
    }
    loadMerchants()
   },[])

  const getActive = useCallback((row) => {
    if (row?.IsActive !== undefined && row?.IsActive !== null) return Boolean(row.IsActive);
    if (row?.isActive !== undefined && row?.isActive !== null) return Boolean(row.isActive);
    const status = String(row?.Status ?? row?.status ?? "").trim().toLowerCase();
    if (!status) return false;
    return status === "active";
  }, []);

  const getMid = useCallback((row) => String(row?.MID ?? row?.MerchantID ?? row?.merchantId ?? "").trim(), []);

  const openEdit = useCallback(
    (row) => {
      const mid = getMid(row);
      const active = getActive(row);
      setEditMid(mid);
      setEditForm({
        mid,
        merchantName: String(row?.MerchantName ?? row?.merchantName ?? "").trim(),
        businessName: String(row?.BusinessName ?? row?.businessName ?? "").trim(),
        phoneNumber: String(row?.PhoneNumber ?? row?.phoneNumber ?? "").trim(),
        address: String(row?.Address ?? row?.address ?? "").trim(),
        status: active ? "active" : "inactive",
      });
      setEditOpen(true);
    },
    [getActive, getMid]
  );

  const closeEdit = useCallback(() => {
    setEditOpen(false);
    setEditMid("");
  }, []);

  const saveEdit = useCallback(() => {
    if (!editMid) {
      closeEdit();
      return;
    }

    setRows((prev) =>
      (prev ?? []).map((r) => {
        const mid = getMid(r);
        if (mid !== editMid) return r;

        const next = { ...r };
        next.MerchantName = editForm.merchantName;
        next.BusinessName = editForm.businessName;
        next.PhoneNumber = editForm.phoneNumber;
        next.Address = editForm.address;
        next.IsActive = editForm.status === "active";
        next.Status = editForm.status === "active" ? "Active" : "Inactive";
        return next;
      })
    );

    closeEdit();
  }, [closeEdit, editForm.address, editForm.businessName, editForm.merchantName, editForm.phoneNumber, editForm.status, editMid, getMid]);

  const openToggle = useCallback(
    (row) => {
      const mid = getMid(row);
      const active = getActive(row);
      setConfirmMid(mid);
      setConfirmNextActive(!active);
      setConfirmOpen(true);
    },
    [getActive, getMid]
  );

  const applyToggle = useCallback(() => {
    setRows((prev) =>
      (prev ?? []).map((r) => {
        const mid = getMid(r);
        if (mid !== confirmMid) return r;

        const next = { ...r };
        next.IsActive = confirmNextActive;
        next.Status = confirmNextActive ? "Active" : "Inactive";
        return next;
      })
    );
    setConfirmOpen(false);
  }, [confirmMid, confirmNextActive, getMid]);

  const statusBody = useCallback(
    (row) => {
      const active = getActive(row);
      return (
        <span
          className={
            active
              ? "inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-200"
              : "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-slate-100"
          }
        >
          <span className={active ? "h-2 w-2 rounded-full bg-emerald-400" : "h-2 w-2 rounded-full bg-slate-400"} />
          {active ? "Active" : "Inactive"}
        </span>
      );
    },
    [getActive]
  );

  const actionsBody = useCallback(
    (row) => {
      const active = getActive(row);
      return (
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
            onClick={() => openEdit(row)}
            aria-label="Edit"
            title="Edit"
          >
            <i className="pi pi-pencil text-xs" aria-hidden />
          </button>

          <button
            type="button"
            className={
              active
                ? "inline-flex items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-500/15"
                : "inline-flex items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/15"
            }
            onClick={() => openToggle(row)}
          >
            {active ? "Deactivate" : "Activate"}
          </button>
        </div>
      );
    },
    [getActive, openEdit, openToggle]
  );

  const columns = useMemo(
    () => [
      { field: "MerchantName", header: "Merchant Name" },
      { field: "MID", header: "Merchant ID" },
      {field: "BusinessName", header:"Business Name"},
      {field: "PhoneNumber", header:"Phone Number"},
      {field: "Address", header:"Address"},
      { field: "Status", header: "Status", body: statusBody },
      { field: "Actions", header: "Actions", body: actionsBody },
       
    ],
    [actionsBody, statusBody]
  );

  const handleCardToggle = (terminalId, card) => (event) => {
    const { checked } = event;

    setRows((prevRows) =>
      prevRows.map((row) => {
        if (row.terminalId !== terminalId) {
          return row;
        }

        const hasCard = row.cards.includes(card);
        if (checked && !hasCard) {
          return { ...row, cards: [...row.cards, card] };
        }

        if (!checked && hasCard) {
          return { ...row, cards: row.cards.filter((item) => item !== card) };
        }

        return row;
      })
    );
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="mb-5 text-xs text-slate-500">
        Operations / Merchant / <span className="text-sky-400">Modify Merchants</span>
      </div>

      <header className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-100">Merchants</h1>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-sky-500/90 px-4 py-2 text-xs font-semibold text-slate-950 shadow-sm hover:bg-sky-400"
          onClick={() => navigate("/merchants/onboard")}
        >
          <span className="text-sm leading-none">+</span>
          <span>Add New</span>
        </button>
      </header>

     

      <section className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#0b1220]/70 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent" aria-hidden />
        <div className="relative">
          <div className="overflow-hidden rounded-2xl border border-white/5 bg-black/20">
            <DataTable
              value={rows}
              dataKey="MID"
              className="!bg-transparent"
              tableClassName="!bg-transparent"
              rowHover
              size="small"
              responsiveLayout="scroll"
              emptyMessage="No merchants found"
            >
              {columns.map((column) => (
                <Column
                  key={column.field}
                  field={column.field}
                  header={column.header}
                  body={column.body}
                  headerClassName={
                    "!border-0 !bg-transparent px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
                  }
                  bodyClassName={
                    "px-4 py-3 !border-0 border-t border-white/5 text-sm text-slate-200"
                  }
                />
              ))}
            </DataTable>
          </div>
        </div>
      </section>

      <Dialog
        visible={confirmOpen}
        onHide={() => setConfirmOpen(false)}
        header={confirmNextActive ? "Activate Merchant" : "Deactivate Merchant"}
        draggable={false}
        className="w-[95vw] max-w-md"
        contentClassName="!bg-[#0b1220] !text-slate-100 !border-0"
        headerClassName="!bg-[#0b1220] !text-slate-100 !border-0"
        maskClassName="backdrop-blur-sm"
      >
        <div className="text-sm text-slate-300">
          Are you sure you want to {confirmNextActive ? "activate" : "deactivate"} this merchant?
        </div>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10"
            onClick={() => setConfirmOpen(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className={
              confirmNextActive
                ? "rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
                : "rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-rose-400"
            }
            onClick={applyToggle}
          >
            {confirmNextActive ? "Activate" : "Deactivate"}
          </button>
        </div>
      </Dialog>

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
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.06] via-transparent to-transparent" aria-hidden />
          <div className="relative p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-base font-semibold tracking-tight">Edit Merchant</div>
                <div className="mt-1 text-xs text-slate-400">ID: {editForm.mid || "-"}</div>
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
                <label className="mb-2 block text-xs font-medium text-slate-300">Merchant ID</label>
                <InputText
                  value={editForm.mid}
                  disabled
                  className="w-full !h-[46px] !rounded-xl !border !border-white/10 !bg-black/20 !px-4 !text-sm !text-slate-200 placeholder:!text-slate-500 focus:!shadow-none"
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
                  className="w-full !h-[46px] !rounded-xl !border !border-white/10 !bg-black/20 !text-sm !text-slate-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-slate-300">Merchant Name</label>
                <InputText
                  value={editForm.merchantName}
                  onChange={(e) => setEditForm((p) => ({ ...p, merchantName: e.target.value }))}
                  placeholder="Merchant Name"
                  className="w-full !h-[46px] !rounded-xl !border !border-white/10 !bg-black/20 !px-4 !text-sm !text-slate-100 placeholder:!text-slate-500 focus:!shadow-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-slate-300">Business Name</label>
                <InputText
                  value={editForm.businessName}
                  onChange={(e) => setEditForm((p) => ({ ...p, businessName: e.target.value }))}
                  placeholder="Business Name"
                  className="w-full !h-[46px] !rounded-xl !border !border-white/10 !bg-black/20 !px-4 !text-sm !text-slate-100 placeholder:!text-slate-500 focus:!shadow-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-slate-300">Phone Number</label>
                <InputText
                  value={editForm.phoneNumber}
                  onChange={(e) => setEditForm((p) => ({ ...p, phoneNumber: e.target.value }))}
                  placeholder="Phone Number"
                  className="w-full !h-[46px] !rounded-xl !border !border-white/10 !bg-black/20 !px-4 !text-sm !text-slate-100 placeholder:!text-slate-500 focus:!shadow-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-slate-300">Address</label>
                <InputText
                  value={editForm.address}
                  onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))}
                  placeholder="Address"
                  className="w-full !h-[46px] !rounded-xl !border !border-white/10 !bg-black/20 !px-4 !text-sm !text-slate-100 placeholder:!text-slate-500 focus:!shadow-none"
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
    </div>
  );
}
