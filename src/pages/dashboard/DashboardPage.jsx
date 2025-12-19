import { useMemo, useCallback, useState, useEffect } from "react";
import api from "../../network/api";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import "./DashboardPage.css";
import searchIcon from "../../assets/images/search-icon.svg";

const stats = [
  { id: "merchants", label: "Total Merchants", value: 0 },
  { id: "terminals-total", label: "Total Terminals", value: 0 },
  { id: "terminals-live", label: "Total Terminals live", value: 0 },
  { id: "terminals-active", label: "Total Terminals live", value: 0 },
];



export default function DashboardPage() {
  const [searchValue, setSearchValue] = useState("");
  const [tableRows, setTableRows] = useState([])
  const [statValues, setStatValues] = useState([]);
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

   useEffect(()=>{
 const loadStats = async()=>{
    var response = await api.get("/reporting-stats");
    const data  = response.data;
    console.log(data) 
    const stats = [
  { id: "merchants", label: "Total Merchants", value: data.totalMerchants },
  { id: "Terminals", label: "Total Terminals", value: data.totalTerminals },
  { id: "Today's Transactions", label: "Total Transaction today", value: data.todayTransactions },
  { id: "Transactions", label: "Total Transactions", value: data.totalTransactions },
];
    setStatValues(stats)
    console.log(response)
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
    <div className="dashboard-page">
      <header className="dashboard-page__header">
        <h1 className="dashboard-title">Dashboard</h1>
      </header>

      <section className="dashboard-stats">
        {statValues.map((statValues) => (
          <article key={statValues.id} className="dashboard-stat-card">
            <p className="dashboard-stat-card__label">{statValues.label}</p>
            <p className="dashboard-stat-card__value">{statValues.value.toLocaleString()}</p>
          </article>
        ))}
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
