import { useMemo, useCallback, useState, useEffect } from "react";
import api from "../../network/api";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import "./DashboardPage.css";
import searchIcon from "../../assets/images/search-icon.svg";

const stats = [
  { id: "merchants", label: "Total Merchants", value: 1200 },
  { id: "terminals-total", label: "Total Terminals", value: 18000 },
  { id: "terminals-live", label: "Total Terminals live", value: 18000 },
  { id: "terminals-active", label: "Total Terminals live", value: 18000 },
];



export default function DashboardPage() {
  const [searchValue, setSearchValue] = useState("");
  const [tableRows, setTableRows] = useState([])
  const joinClasses = (...classes) => classes.filter(Boolean).join(" ");
useEffect(()=>{
    const loadMerchants = async()=>{
    var response = await api.get("/allTransactions");
    const data  = response.data.data;
    setTableRows(data)
    console.log(response)
    }
    loadMerchants()
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
    <div className="dashboard-page">
      <header className="dashboard-page__header">
        <h1 className="dashboard-title">Dashboard</h1>
      </header>

      <section className="dashboard-stats">
        {stats.map((stat) => (
          <article key={stat.id} className="dashboard-stat-card">
            <p className="dashboard-stat-card__label">{stat.label}</p>
            <p className="dashboard-stat-card__value">{stat.value.toLocaleString()}</p>
          </article>
        ))}
      </section>

      <section className="dashboard-search">
        <div className="dashboard-search__input p-inputgroup">
          <InputText
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search"
            aria-label="Search"
            className="dashboard-search__input-field"
          />
          <span className="p-inputgroup-addon dashboard-search__input-addon">
            <span className="dashboard-search__icon" aria-hidden />
          </span>
        </div>
        <button type="button" className="dashboard-search__filter">
          <span className="dashboard-search__filter-label">Apply Filter</span>
          <img src={searchIcon} alt="" className="dashboard-search__filter-icon" />
        </button>
      </section>

      <section className="dashboard-table-section">
        <DataTable
          value={tableRows}
          className="terminals-table"
          dataKey="srNo"
         
        >
          {columns.map((column) => (
            <Column
              key={column.field}
              field={column.field}
              header={column.header}
              body={column.body}
              headerClassName={`terminals-table__header terminals-table__header--${column.field}`}
              bodyClassName={`terminals-table__cell terminals-table__cell--${column.field}`}
            />
          ))}
        </DataTable>
      </section>
    </div>
  );
}
