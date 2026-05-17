import { useState } from "react";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { useNavigate } from "react-router-dom";
import { Dropdown } from "primereact/dropdown";
import PhoneInput from "react-phone-input-2";
import successIcon from "../../assets/images/check-green-circle.svg";
import api from "../../network/api";

const INITIAL_FORM = {
  merchantId: "",
  merchantName: "",
  address1: "",
  address2: "",
};

const MERCHANT_OPTIONS = [
  { label: "Kissan Merchant", value: "1" },
  { label: "Livestock Merchant", value: "2" },
  { label: "Ration Card Merchant", value: "3" },
  { label: "Other", value: "0" },
];

export default function OnboardMerchantPage() {
  var navigation = useNavigate();
  const [formState, setFormState] = useState(INITIAL_FORM);
  const [showSuccess, setShowSuccess] = useState(false);
  //
  const [MID, setMID] = useState("");
  const [MerchantName, setMerchantName] = useState("")
  const [businessName, setBusinessName] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [Email, setEmail] = useState("")
  const [Adress, setAddress] = useState("") 
  const [message, setMessage]= useState("")
  const [mLable, setMLable] = useState("")
  const [mType, setMType] = useState("")

  const handleChange = (field) => (event) => {
    setFormState((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async(event) => {
    event.preventDefault();
    // TODO: hook up submission logic
    if(!MID || !MerchantName || !businessName || !phoneNumber || !Email || !Adress){
      alert("please fill all fields")
    }else{
       //API call
       try{
const response = await api.post("/onboard_merchant", {
        MerchantName: MerchantName,
        MID: MID,
        BusinessName: businessName,
        PhoneNumber: phoneNumber,
        Email: Email,
        Address: Adress,
        flag:mType
      });
      console.log(response)
        if(response.data.isSuccess){
         setMessage(response.data.message)
        setShowSuccess(true)
        }else{
         alert(response.data.message)
        }
          }catch(error){
           alert(error.response.data.message)
          console.log(error)
       }
       }
    //setShowSuccess(true);
  };

  const handleReset = () => {
    setFormState(INITIAL_FORM);
    setShowSuccess(false);
    setMerchantName("");
    setMID("")
    setBusinessName("")
    setEmail("")
    setPhoneNumber("")
    setAddress("")
    setMType("")
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="mb-5 text-xs text-slate-500">
        Operations / Merchant / <span className="text-sky-400">Add Merchant</span>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-100">Add Merchant</h1>
        <p className="mt-1 text-sm text-slate-400">Register a new merchant on the portal</p>
      </div>

      <div className="rounded-2xl border border-white/5 bg-[#0b1220]/70 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
        <form onSubmit={handleSubmit} className="space-y-8">
          <section>
            <div className="mb-4 text-[11px] font-semibold tracking-wider text-slate-500">BUSINESS INFORMATION</div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-medium text-slate-300">
                  Merchant ID <span className="text-rose-400">*</span>
                </label>
                <InputText
                  value={MID}
                  onChange={(event) => {
                    setMID(event.target.value);
                  }}
                  placeholder="e.g. 123456"
                  className="w-full !rounded-xl !border !border-white/10 !bg-black/20 !px-4 !py-3 !text-sm !text-slate-100 placeholder:!text-slate-500 focus:!shadow-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-slate-300">
                  Business Type <span className="text-rose-400">*</span>
                </label>
                <Dropdown
                  value={mType}
                  options={MERCHANT_OPTIONS}
                  onChange={(event) => {
                    setMType(event.value);
                  }}
                  placeholder="Select type"
                  className="w-full !rounded-xl !border !border-white/10 !bg-black/20 !text-sm !text-slate-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-slate-300">
                  Merchant Name <span className="text-rose-400">*</span>
                </label>
                <InputText
                  value={MerchantName}
                  onChange={(event) => {
                    setMerchantName(event.target.value);
                  }}
                  placeholder="e.g. Metro Superstore"
                  className="w-full !rounded-xl !border !border-white/10 !bg-black/20 !px-4 !py-3 !text-sm !text-slate-100 placeholder:!text-slate-500 focus:!shadow-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-slate-300">
                  Business Name <span className="text-rose-400">*</span>
                </label>
                <InputText
                  value={businessName}
                  onChange={(event) => {
                    setBusinessName(event.target.value);
                  }}
                  placeholder="Business legal name"
                  className="w-full !rounded-xl !border !border-white/10 !bg-black/20 !px-4 !py-3 !text-sm !text-slate-100 placeholder:!text-slate-500 focus:!shadow-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-xs font-medium text-slate-300">
                  Business Address <span className="text-rose-400">*</span>
                </label>
                <InputText
                  value={Adress}
                  onChange={(event) => {
                    setAddress(event.target.value);
                  }}
                  placeholder="Full address including street, area"
                  className="w-full !rounded-xl !border !border-white/10 !bg-black/20 !px-4 !py-3 !text-sm !text-slate-100 placeholder:!text-slate-500 focus:!shadow-none"
                />
              </div>
            </div>
          </section>

          <section>
            <div className="mb-4 text-[11px] font-semibold tracking-wider text-slate-500">OWNER / CONTACT DETAILS</div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                <label className="mb-2 block text-xs font-medium text-slate-300">
                  Email <span className="text-rose-400">*</span>
                </label>
                <InputText
                  value={Email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                  }}
                  placeholder="example@email.com"
                  className="w-full !rounded-xl !border !border-white/10 !bg-black/20 !px-4 !py-3 !text-sm !text-slate-100 placeholder:!text-slate-500 focus:!shadow-none"
                />
              </div>
            </div>
          </section>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="submit"
              label="Create Merchant"
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
        onHide={() => setShowSuccess(false)}
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
            Merchant <span className="text-sky-300">{MID}</span> Onboarded Successfully!
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              type="button"
              label="Close"
              onClick={() => {
                navigation("/merchants")
                setShowSuccess(false)
                
              }}
              className="!rounded-xl !border !border-white/10 !bg-white/5 !px-6 !py-3 !text-sm !font-semibold !text-slate-100 hover:!bg-white/10"
            />
            <Button
              type="button"
              label="Onboard New Merchant"
              onClick={handleReset}
              className="!rounded-xl !border !border-sky-500/30 !bg-sky-500/15 !px-6 !py-3 !text-sm !font-semibold !text-sky-200 hover:!bg-sky-500/20"
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
