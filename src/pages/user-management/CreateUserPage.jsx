import { useState } from "react";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import "./CreateUserPage.css";
import successIcon from "../../assets/images/check-green-circle.svg";
import api from "../../network/api";

const USER_TYPE_OPTIONS = [
  { label: "Operator", value: "operator" },
  { label: "Admin", value: "admin" },
];

export default function CreateUserPage() {
  const [showSuccess, setShowSuccess] = useState(false);
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState(""); 
  const [message, setMessage]= useState("")
  const [usertype, setUsertype] = useState("operator");

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

  const handleReset = () => {
    setUserName("");
    setPassword("");
    setName("");
    setUsertype("operator");
  };

  const handleCreateAnother = () => {
    handleReset();
    setShowSuccess(false);
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="mb-5 text-xs text-slate-500">
        User Management / <span className="text-sky-400">Add User</span>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-100">Create New User</h1>
        <p className="mt-1 text-sm text-slate-400">Create a new user for portal access</p>
      </div>

      <div className="rounded-2xl border border-white/5 bg-[#0b1220]/70 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-medium text-slate-300">
                Username <span className="text-rose-400">*</span>
              </label>
              <InputText
                value={userName}
                onChange={(event) => {
                  setUserName(event.target.value);
                }}
                placeholder="e.g. USR001"
                className="w-full !rounded-xl !border !border-white/10 !bg-black/20 !px-4 !py-3 !text-sm !text-slate-100 placeholder:!text-slate-500 focus:!shadow-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-slate-300">
                Password <span className="text-rose-400">*</span>
              </label>
              <InputText
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                }}
                placeholder="Password"
                className="w-full !rounded-xl !border !border-white/10 !bg-black/20 !px-4 !py-3 !text-sm !text-slate-100 placeholder:!text-slate-500 focus:!shadow-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-slate-300">
                Name <span className="text-rose-400">*</span>
              </label>
              <InputText
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                }}
                placeholder="Full name"
                className="w-full !rounded-xl !border !border-white/10 !bg-black/20 !px-4 !py-3 !text-sm !text-slate-100 placeholder:!text-slate-500 focus:!shadow-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-slate-300">
                User Type <span className="text-rose-400">*</span>
              </label>
              <Dropdown
                value={usertype}
                options={USER_TYPE_OPTIONS}
                onChange={(e) => setUsertype(e.value)}
                optionLabel="label"
                optionValue="value"
                placeholder="Select type"
                className="w-full !rounded-xl !border !border-white/10 !bg-black/20 !text-sm !text-slate-100"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="submit"
              label="Create User"
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
            User <span className="text-sky-300">{userName || ""}</span> Created Successfully!
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
              label="Create New User"
              onClick={handleCreateAnother}
              className="!rounded-xl !border !border-sky-500/30 !bg-sky-500/15 !px-6 !py-3 !text-sm !font-semibold !text-sky-200 hover:!bg-sky-500/20"
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
