import { use, useState } from "react";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { useNavigate } from "react-router-dom";
import { Dropdown } from "primereact/dropdown";
import PhoneInput from "react-phone-input-2";
import onboardIcon from "../../assets/images/onboard_merchant.svg";
import successIcon from "../../assets/images/check-green-circle.svg";
import "./OnboardMerchantPage.css";
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
const response = await api.post("/onboard_merchant  ", {
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
  };

  return (
    <div className="onboard-page">
      <header className="onboard-header">
        <img src={onboardIcon} alt="Onboard Merchant" className="onboard-header__icon" />
        <h1 className="onboard-header__title">Onboard New Merchant</h1>
      </header>

      <form className="onboard-form" onSubmit={handleSubmit}>
        <InputText
          value={MID}
          onChange={(event)=>{setMID(event.target.value)}}
          placeholder="Enter Merchant ID"
          className="onboard-input"
        />
        <InputText
          value={MerchantName}
          onChange={(event)=>{setMerchantName(event.target.value)}}
          placeholder="Enter Merchant Name"
          className="onboard-input"
        />
         <Dropdown
                    value={mType}
                    options={MERCHANT_OPTIONS}
                    onChange={(event)=>{
                      console.log(event)
                      setMLable(event.target.lable)
                      setMType(event.target.value)
                    }}
                    placeholder="Select Merchant"
                  />

        <InputText
          value={businessName}
          onChange={(event)=>{setBusinessName(event.target.value)}}
          placeholder="Enter Business Name"
          className="onboard-input"
        />
      
          <PhoneInput
            country="pk"
            value={phoneNumber}
            onChange={(value)=>{setPhoneNumber(value)}}
            placeholder="Enter phone number"
            containerClass="create-terminal__phone"
            buttonClass="create-terminal__phone-flag"
            inputClass="create-terminal__phone-input"
            dropdownClass="create-terminal__phone-dropdown"
            enableSearch
            countryCodeEditable={false}
          />
          <InputText
          value={Email}
          onChange={(event)=>{setEmail(event.target.value)}}
          placeholder="Email"
          className="onboard-input"
        />
        
        <InputText
          value={Adress}
          onChange={(event)=>{setAddress(event.target.value)}}
          placeholder="Address "
          className="onboard-input"
        />
        <Button
          type="submit"
          label="Submit"
          icon="onboard-button__icon"
          iconPos="right"
          className="onboard-submit"
        />
      </form>

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
        <div className="onboard-modal__content">
          <img src={successIcon} alt="Success" className="onboard-modal__icon" />
          <p className="onboard-modal__message">
            Merchant <span className="onboard-modal__mid">{MID}</span> Onboarded Successfully!
          </p>
          <div className="onboard-modal__actions">
            <Button
              type="button"
              label="Close"
              onClick={() => {
                navigation("/merchants")
                setShowSuccess(false)
                
              }}
              className="onboard-modal__close"
            />
            <Button
              type="button"
              label="Onboard New Merchant"
              icon="onboard-button__icon"
              iconPos="right"
              onClick={handleReset}
              className="onboard-modal__cta"
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
