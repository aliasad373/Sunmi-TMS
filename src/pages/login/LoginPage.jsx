import { InputText } from "primereact/inputtext";
import { useState } from "react";
import { Button } from "primereact/button";
import "./LoginPage.css";
import api from "../../network/api";
import logo from "../../assets/images/logo.svg";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  var navigation = useNavigate();
  const [UserName, setName] = useState("");
  const [password, setPassword] = useState("");
  function handleName(event) {
    setName(event.target.value);
  }
  function handlePassword(event) {
    setPassword(event.target.value);
  }

  async function  handleLogin(event) {
    event.preventDefault();
    // Add login logic here
    localStorage.clear();
    if (!UserName || !password) {
  alert("Please fill all fields");
}else{
 //alert(UserName + " " + password);
    try {
      const response = await api.post("/login", {
        username: UserName,
        password: password,
        clientType:"WEB"
      });
      console.log("Login successful:", response.data);
      var token = response.data.token
      var userName = response.data.user.username
        localStorage.setItem("token", token);
        localStorage.setItem("name",userName)
        navigation("/dashboard");
        // Handle successful login (e.g., store token, redirect)
    } catch (error) {
      console.error("Login failed:", error);
      alert("Login failed" + error);
}
   }
  }

  return (
    <div className="login-shell">
      <header className="login-header">
        <img src={logo} alt="DigiKhata" className="login-logo" />
        <h1 className="login-title">Terminal Management System</h1>
        <h2 className="login-subtitle">Login to Your Account</h2>
      </header>

      <form className="login-form">
        <span className="p-input-icon-left login-field">
    
        </span>
        <InputText placeholder="Enter Username" className="login-input"
        value={UserName}
        onChange={handleName}
        />
        <InputText
          placeholder="Enter Your Password"
          type="password"
          value={password}
          onChange={handlePassword}
          className="login-input"
        />
        <Button
          type="submit"
          label="Login"
          onClick={handleLogin}
          icon="login-button__icon"
          iconPos="right"
          className="login-button"
        />
      </form>
    </div>
  );
}
