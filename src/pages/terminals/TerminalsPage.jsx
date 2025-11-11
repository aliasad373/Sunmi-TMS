import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Checkbox } from "primereact/checkbox";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import api from "../../network/api";
import "./TerminalsPage.css";
import searchIcon from "../../assets/images/search-icon.svg";

const MERCHANTS = [
  { label: "Cheesious - Merchant ID", value: "cheesious" },
  { label: "Cafe Bloom - Merchant ID", value: "cafebloom" },
  { label: "Grocer's Hub - Merchant ID", value: "grocershub" },
];

const INITIAL_ROWS = [
  {
    srNo: 101,
    terminalId: "12345678",
    currency: "PKR",
    cards: [
      "Visa",
      "Mastercard",
      "Asan Card",
      "Rashan Card",
      "Karobar Card",
      "LiveStock Card",
    ],
  },
  {
    srNo: 102,
    terminalId: "12345678",
    currency: "PKR",
    cards: ["Visa", "Asan Card"],
  },
  {
    srNo: 103,
    terminalId: "12345678",
    currency: "PKR",
    cards: ["Visa", "Mastercard", "Asan Card", "Rashan Card", "Karobar Card"],
  },
  {
    srNo: 104,
    terminalId: "12345678",
    currency: "PKR",
    cards: ["Visa", "Mastercard", "Asan Card", "Rashan Card", "Karobar Card"],
  },
];

const CARD_OPTIONS = [
  "Visa",
  "Mastercard",
  "PayPak",
  "LiveStock Card",
  "Asan Card",
  "Rashan Card",
  "Kisan Card",
  "Karobar Card",
];

export default function TerminalsPage() {
  const [selectedMerchant, setSelectedMerchant] = useState(MERCHANTS[0].value);
  const [searchValue, setSearchValue] = useState("");
  const [rows, setRows] = useState([]);
  const navigate = useNavigate();
  useEffect(()=>{
    const loadTerminals = async()=>{
    var response = await api.get("/allTerminals");
    const data  = response.data.terminals;
    setRows(data)
    console.log(response)
    }
    loadTerminals()
   },[])
  const columns = useMemo(
    () => [
      { field: "TID", header: "Terminal ID" },
      { field: "serial_number", header: "Serial Number" },
      { field: "PhoneNumber", header: "Phone Number" },
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

  const cardTemplate = (rowData) => (
    <div className="terminals-table__cards">
      {CARD_OPTIONS.map((card) => {
        const checkboxId = `${rowData.terminalId}-${card}`;
        return (
          <label key={checkboxId} htmlFor={checkboxId} className="terminals-table__card">
            <Checkbox
              inputId={checkboxId}
              value={card}
              checked={rowData.cards.includes(card)}
              onChange={handleCardToggle(rowData.terminalId, card)}
              className="terminals-checkbox"
            />
            <span>{card}</span>
          </label>
        );
      })}
    </div>
  );

  return (
    <div className="terminals-page">
      <header className="terminals-header">
        <h1 className="terminals-title">Terminals</h1>
        <button
          type="button"
          className="terminals-create"
          onClick={() => navigate("/terminals/create")}
        >
          <i className="pi pi-plus terminals-create__icon" aria-hidden />
          <span className="terminals-create__label">Create New Terminal</span>
        </button>
      </header>

      <section className="terminals-controls">
        <div className="terminals-merchant">
          <Dropdown
            value={selectedMerchant}
            options={MERCHANTS}
            onChange={(e) => setSelectedMerchant(e.value)}
            placeholder="Select Merchant"
          />
        </div>

        <section className="search-bar">
          <div className="search-bar__input p-inputgroup">
            <InputText
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search"
              aria-label="Search"
              className="search-bar__input-field"
            />
            <span className="p-inputgroup-addon search-bar__input-addon">
              <span className="search-bar__icon" aria-hidden />
            </span>
          </div>
          <button type="button" className="search-bar__filter">
            <span className="search-bar__filter-label">Apply Filter</span>
            <img src={searchIcon} alt="" className="search-bar__filter-icon" />
          </button>
        </section>
      </section>

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
