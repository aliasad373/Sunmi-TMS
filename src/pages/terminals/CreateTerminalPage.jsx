import { useState, useEffect } from "react";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import api from "../../network/api";
import { Dialog } from "primereact/dialog";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
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
  const [posType, setPosType] = useState([ { label: "Test", value: "test" }, { label: "Production", value: "production" }])
  const [POS_type, setPOS_Type] = useState("")
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
        currency_code: "0586",
        posType: POS_type
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

  const handleReset = () => {
    setFormState(INITIAL_FORM);
    setShowSuccess(false);
    setSerialNumber("");
    setTerminalID("");
    setPhoneNumber("");
    setCurrencyCode("0586");
    setPOS_Type("");
    if (Array.isArray(MerchantOptions) && MerchantOptions.length > 0) {
      setMerchantID(MerchantOptions[0].value);
    } else {
      setMerchantID(undefined);
    }
  };

  const handleCreateAnother = () => {
    setFormState(INITIAL_FORM);
    setShowSuccess(false);
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="mb-5 text-xs text-slate-500">
        Operations / Terminal / <span className="text-sky-400">Add Terminal</span>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-100">Add Terminal</h1>
        <p className="mt-1 text-sm text-slate-400">Register a new terminal on the portal</p>
      </div>

      <div className="rounded-2xl border border-white/5 bg-[#0b1220]/70 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
        <form onSubmit={handleSubmit} className="space-y-8">
          <section>
            <div className="mb-4 text-[11px] font-semibold tracking-wider text-slate-500">TERMINAL INFORMATION</div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-medium text-slate-300">
                  Merchant ID <span className="text-rose-400">*</span>
                </label>
                <Dropdown
                  value={MerchatID}
                  options={MerchantOptions}
                  onChange={(e) => {
                    setMerchantID(e.value);
                  }}
                  placeholder="Select MID"
                  className="w-full !rounded-xl !border !border-white/10 !bg-black/20 !text-sm !text-slate-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-slate-300">
                  POS Type <span className="text-rose-400">*</span>
                </label>
                <Dropdown
                  value={POS_type}
                  options={posType}
                  onChange={(e) => {
                    setPOS_Type(e.value);
                  }}
                  placeholder="Select POS Type"
                  className="w-full !rounded-xl !border !border-white/10 !bg-black/20 !text-sm !text-slate-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-slate-300">
                  Terminal ID <span className="text-rose-400">*</span>
                </label>
                <InputText
                  value={terminalId}
                  onChange={(event) => {
                    setTerminalID(event.target.value);
                  }}
                  placeholder="e.g. 12345678"
                  className="w-full !rounded-xl !border !border-white/10 !bg-black/20 !px-4 !py-3 !text-sm !text-slate-100 placeholder:!text-slate-500 focus:!shadow-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-slate-300">
                  Serial Number <span className="text-rose-400">*</span>
                </label>
                <InputText
                  value={serialNumber}
                  onChange={(event) => {
                    setSerialNumber(event.target.value);
                  }}
                  placeholder="Device serial"
                  className="w-full !rounded-xl !border !border-white/10 !bg-black/20 !px-4 !py-3 !text-sm !text-slate-100 placeholder:!text-slate-500 focus:!shadow-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-slate-300">
                  Phone Number <span className="text-rose-400">*</span>
                </label>
                <PhoneInput
                  country="pk"
                  value={phoneNumber}
                  onChange={(value) => {
                    setPhoneNumber(value);
                  }}
                  placeholder="Enter phone number"
                  containerClass="w-full"
                  inputClass="!w-full !h-[46px] !rounded-xl !border !border-white/10 !bg-black/20 !text-sm !text-slate-100 placeholder:!text-slate-500 !pl-12 focus:!shadow-none"
                  buttonClass="!rounded-xl !border !border-white/10 !bg-black/20"
                  dropdownClass="!bg-[#0b1220] !text-slate-100"
                  enableSearch
                  countryCodeEditable={false}
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-slate-300">Currency Code</label>
                <InputText
                  value={currencyCode}
                  onChange={(event) => {
                    setCurrencyCode(event.target.value);
                  }}
                  placeholder="Currency Code"
                  className="w-full !rounded-xl !border !border-white/10 !bg-black/20 !px-4 !py-3 !text-sm !text-slate-100 placeholder:!text-slate-500 focus:!shadow-none"
                  disabled
                />
              </div>
            </div>
          </section>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="submit"
              label="Create Terminal"
              className="!rounded-lg !border !border-sky-500/30 !bg-sky-500/15 !px-4 !py-2.5 !text-xs !font-semibold !text-sky-200 hover:!bg-sky-500/20"
            />
            <Button
              type="button"
              label="Reset"
              onClick={handleReset}
              className="!rounded-lg !border !border-white/10 !bg-white/5 !px-4 !py-2.5 !text-xs !font-semibold !text-slate-100 hover:!bg-white/10"
            />
          </div>
        </form>
      </div>

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
        <div className="rounded-2xl border border-white/10 bg-[#0b1220] p-8 text-center text-slate-100">
          <img src={successIcon} alt="Success" className="mx-auto mb-4 h-12 w-12" />
          <p className="text-base font-semibold">
            Terminal <span className="text-sky-300">{terminalId || ""}</span> Created Successfully!
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              type="button"
              label="Close"
              onClick={handleCloseDialog}
              className="!rounded-xl !border !border-white/10 !bg-white/5 !px-6 !py-3 !text-sm !font-semibold !text-slate-100 hover:!bg-white/10"
            />
            <Button
              type="button"
              label="Create New Terminal"
              onClick={handleCreateAnother}
              className="!rounded-xl !border !border-sky-500/30 !bg-sky-500/15 !px-6 !py-3 !text-sm !font-semibold !text-sky-200 hover:!bg-sky-500/20"
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
