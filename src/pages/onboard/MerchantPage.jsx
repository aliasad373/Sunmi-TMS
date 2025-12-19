import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Checkbox } from "primereact/checkbox";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
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
  const navigate = useNavigate();
   useEffect(()=>{
    const loadMerchants = async()=>{
    var response = await api.get("/all-merchants");
    const data  = response.data.data;
    setRows(data)
    console.log(response)
    }
    loadMerchants()
   },[])
  const columns = useMemo(
    () => [
      { field: "MerchantName", header: "Merchant Name" },
      { field: "MID", header: "Merchant ID" },
      {field: "BusinessName", header:"Business Name"},
      {field: "PhoneNumber", header:"Phone Number"},
      {field: "Address", header:"Address"},
       
    ],
    []
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
    <div className="terminals-page">
      <header className="terminals-header">
        <h1 className="terminals-title">Merchants</h1>
        <button
          type="button"
          className="terminals-create"
          onClick={() => navigate("/merchants/onboard")}
        >
          <i className="pi pi-plus terminals-create__icon" aria-hidden />
          <span className="terminals-create__label">Onbaord Merchant</span>
        </button>
      </header>

     

      <section className="terminals-table-section">
        <DataTable
          value={rows}
          className="terminals-table"
          dataKey="srNo"
          responsiveLayout="scroll"
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
