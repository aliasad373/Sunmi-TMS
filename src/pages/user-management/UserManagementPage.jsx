import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import "./UserManagementPage.css";

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

  const columns = useMemo(
    () => [
      { field: "userId", header: "User ID" },
      { field: "name", header: "Name" },
      { field: "username", header: "Username" },
      { field: "password", header: "Password" },
      { field: "access", header: "Access" },
    ],
    []
  );

  const accessTemplate = (rowData) => (
    <div className="user-management-table__badges">
      {rowData.access.map((item) => (
        <span
          key={`${rowData.userId}-${item.label}`}
          className={`user-management-table__badge user-management-table__badge--${item.type}`}
        >
          {item.label}
        </span>
      ))}
    </div>
  );

  return (
    <div className="user-management-page">
      <header className="terminals-header">
        <h1 className="terminals-title">User Management</h1>
        <button
          type="button"
          className="terminals-create"
          onClick={() => navigate("/users/create")}
        >
          <i className="pi pi-plus terminals-create__icon" aria-hidden />
          <span className="terminals-create__label">Create New User</span>
        </button>
      </header>

      <section className="user-management-table-section">
        <DataTable value={USERS} className="user-management-table" dataKey="userId" responsiveLayout="scroll">
          {columns.map((column) => (
            <Column
              key={column.field}
              field={column.field}
              header={column.header}
              body={column.field === "access" ? accessTemplate : undefined}
              headerClassName={`user-management-table__header user-management-table__header--${column.field}`}
              bodyClassName={`user-management-table__cell user-management-table__cell--${column.field}`}
            />
          ))}
        </DataTable>
      </section>
    </div>
  );
}
