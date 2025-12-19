import { useState } from "react";
import { InputText } from "primereact/inputtext";
import { Checkbox } from "primereact/checkbox";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import "./CreateUserPage.css";
import userIcon from "../../assets/images/user_management.svg";
import successIcon from "../../assets/images/check-green-circle.svg";
import api from "../../network/api";
const ACCESS_OPTIONS = [
  { label: "Admin", value: "admin" },
  { label: "Bind/Unbind", value: "bind" },
  { label: "View Only", value: "view" },
  { label: "Merchant Creation", value: "merchant" },
];

const INITIAL_FORM = {
  userId: "",
  name: "",
  username: "",
  password: "",
  access: [],
};

export default function CreateUserPage() {
  const [showSuccess, setShowSuccess] = useState(false);
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState(""); 
  const [message, setMessage]= useState("")
  const [usertype, setUsertype] = useState("operator");

  const handleInputChange = (field) => (event) => {
    setFormState((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
   if(!userName || !password || !name || !usertype){
      alert("please fill all fields")
    }else{
       //API call
       try{
       const response = await api.post("/register", {
        username: userName,
        password: password,
        name: name,
        user_type: usertype,
        "roles": ["terminal_configurations"]
      });
      console.log(response)
        if(response.data.isSuccess){
         setMessage(response.data.message)
        setShowSuccess(true)
        }else{
         alert(response.data.message)
        }
          }catch(error){
            console.log(error)
           alert(error.response.data.message)
          console.log(error)
       }
       }
  };

  const handleCloseDialog = () => setShowSuccess(false);

  const handleCreateAnother = () => {
    setFormState(INITIAL_FORM);
    setShowSuccess(false);
  };

  return (
    <div className="onboard-page create-user-page">
      <header className="onboard-header">
        <img src={userIcon} alt="Create User" className="onboard-header__icon" />
        <h1 className="onboard-header__title">Create New User</h1>
      </header>

      <form className="onboard-form" onSubmit={handleSubmit}>
        <InputText
          value={userName}
          onChange={(event)=>{setUserName(event.target.value)}}
          placeholder="User name e.g USR001"
          className="onboard-input"
        />

        <InputText
          value={password}
          onChange={(event)=>{setPassword(event.target.value)}}
          placeholder="Password"
          className="onboard-input"
        />

        <InputText
          value={name}
          onChange={(event)=>{setName(event.target.value)}}
          placeholder="Name"
          className="onboard-input"
        />
        <Button
          type="submit"
          label="Submit"
          className="onboard-submit create-user__submit"
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
          <img src={successIcon} alt="Success" className="onboard-modal__icon" />
          <p className="onboard-modal__message">
            User <span className="onboard-modal__mid">{userName}</span> Created Successfully!
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
              label="Create New User"
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
