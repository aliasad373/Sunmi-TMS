import { useState, useEffect, use } from "react";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Checkbox } from "primereact/checkbox";
import { Button } from "primereact/button";
import api from "../../network/api";
import { Dialog } from "primereact/dialog";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import "./CreateTerminalPage.css";
import terminalsIcon from "../../assets/images/terminals.svg";
import successIcon from "../../assets/images/check-green-circle.svg";

const MERCHANT_OPTIONS = [
  { label: "0305", value: "0305" },
  { label: "Cafe Bloom - Merchant ID", value: "cafebloom" },
  { label: "Grocer's Hub - Merchant ID", value: "grocershub" },
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

const INITIAL_FORM = {
  merchant: MERCHANT_OPTIONS[0].value,
  serialNumber: "",
  terminalId: "",
  phoneNumber: "92",
  currency: "",
  allowedCards: ["Visa", "Mastercard", "Karobar Card"],
};

export default function CreateTerminalPage() {
  const [formState, setFormState] = useState(INITIAL_FORM);
  const [showSuccess, setShowSuccess] = useState(false);
  const [MerchatID, setMerchantID] = useState()
  const [MerchantOptions, setMerchantOption] = useState([])
  const [serialNumber, setSerialNumber] = useState("")
  const [terminalId, setTerminalID] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("");
  const [currencyCode, setCurrencyCode] = useState("0586");

  //useEffect
   useEffect(()=>{
    const loadMerchants = async()=>{
    var response = await api.get("/all-merchants");
    const data  = response.data.data;
    const merchantList = data.map(item => ({
  label: item.MID,
  value: item.MID
}));
const updatedMerchantList = [
  { label: "Please select MID", value: "Please select MID" },
  ...merchantList
];
 setMerchantID(updatedMerchantList[0].value);
 setMerchantOption(updatedMerchantList)
    console.log(response)
    }
    loadMerchants()
   },[])
  //

  const handleInputChange = (field) => (event) => {
    setFormState((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleCardToggle = (card) => (event) => {
    const { checked } = event;
    setFormState((prev) => {
      const { allowedCards } = prev;
      if (checked && !allowedCards.includes(card)) {
        return { ...prev, allowedCards: [...allowedCards, card] };
      }
      if (!checked && allowedCards.includes(card)) {
        return {
          ...prev,
          allowedCards: allowedCards.filter((item) => item !== card),
        };
      }
      return prev;
    });
  };

  const handleSubmit = async(event) => {
    event.preventDefault();
    // TODO: replace with real submission logic
    try{
      const response = await api.post("/createTerminal",{
        TID: terminalId,
        MID: MerchatID,
        PhoneNumber: phoneNumber,
        serial_number: serialNumber,
        country_code: "0586",
        currency_code: "0586"
      });
     console.log(response)
     if(response.data.isSuccess){
      setShowSuccess(true)
     }else{
      alert(response.data.message)
     }
    }catch(ex){
      alert(ex.response.data.message)
    }
    //setShowSuccess(true);
  };

  const handlePhoneChange = (value, country) => {
    const nextValue = value || country?.dialCode || "";
    setFormState((prev) => ({ ...prev, phoneNumber: nextValue }));
  };

  const handleCloseDialog = () => setShowSuccess(false);

  const handleCreateAnother = () => {
    setFormState(INITIAL_FORM);
    setShowSuccess(false);
  };

  return (
    <div className="onboard-page create-terminal-page">
      <header className="onboard-header">
        <img
          src={terminalsIcon}
          alt="Create Terminal"
          className="onboard-header__icon"
        />
        <h1 className="onboard-header__title">Create New Terminal</h1>
      </header>

      <form className="onboard-form" onSubmit={handleSubmit}>
        <div className="create-terminal__dropdown">
          <Dropdown
            value={MerchatID}
            options={MerchantOptions}
            onChange={(e)=>{
               setMerchantID(e.value)
            }}
            placeholder="Select Merchant"
          />
        </div>

        <InputText
          value={serialNumber}
          onChange={(event)=>{setSerialNumber(event.target.value)}}
          placeholder="Serial Number"
          className="onboard-input"
        />

        <InputText
          value={terminalId}
          onChange={(event)=>{setTerminalID(event.target.value)}}
          placeholder="Terminal ID"
          className="onboard-input"
        />
        <div className="create-terminal__row">
          <PhoneInput
            country="pk"
            value={phoneNumber}
            onChange={(e)=>{setPhoneNumber(e)}}
            placeholder="Enter phone number"
            containerClass="create-terminal__phone"
            buttonClass="create-terminal__phone-flag"
            inputClass="create-terminal__phone-input"
            dropdownClass="create-terminal__phone-dropdown"
            enableSearch
            countryCodeEditable={false}
          />
          <InputText
            value={currencyCode}
            onChange={(event)=>{setCurrencyCode(event.target.value)}}
            placeholder="Currency Code"
            className="onboard-input"
            disabled
          />
        </div>     

        <Button
          type="submit"
          label="Submit"
          className="onboard-submit create-terminal__submit"
          icon="onboard-button__icon"
          iconPos="right"
        />
      </form>

      <Dialog
        visible={showSuccess}
        onHide={handleCloseDialog}
        dismissableMask={false}
        closeOnEscape={false}
        breakpoints={{ "768px": "95vw" }}
        style={{ width: "min(1064px, 90vw)" }}
        className="onboard-modal"
        showHeader={false}
      >
        <div className="onboard-modal__content">
          <img
            src={successIcon}
            alt="Success"
            className="onboard-modal__icon"
          />
          <p className="onboard-modal__message">
            Terminal{" "}
            <span className="onboard-modal__mid">
              {terminalId || ""}
            </span>{" "}
            Created Successfully!
          </p>
          <div className="onboard-modal__actions">
            <Button
              type="button"
              label="Close"
              onClick={handleCloseDialog}
              className="onboard-modal__close"
            />
            <Button
              type="button"
              label="Create New Terminal"
              icon="onboard-button__icon"
              iconPos="right"
              onClick={handleCreateAnother}
              className="onboard-modal__cta"
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
