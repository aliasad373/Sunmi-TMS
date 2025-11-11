import { useState } from "react";
import { InputText } from "primereact/inputtext";
import { Checkbox } from "primereact/checkbox";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import "./CreateUserPage.css";
import userIcon from "../../assets/images/user_management.svg";
import successIcon from "../../assets/images/check-green-circle.svg";

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
  const [formState, setFormState] = useState(INITIAL_FORM);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleInputChange = (field) => (event) => {
    setFormState((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleAccessToggle = (accessValue) => (event) => {
    const { checked } = event;
    setFormState((prev) => {
      const { access } = prev;
      if (checked && !access.includes(accessValue)) {
        return { ...prev, access: [...access, accessValue] };
      }
      if (!checked && access.includes(accessValue)) {
        return { ...prev, access: access.filter((item) => item !== accessValue) };
      }
      return prev;
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    // TODO: replace with real submission logic
    setShowSuccess(true);
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
          value={formState.userId}
          onChange={handleInputChange("userId")}
          placeholder="User ID"
          className="onboard-input"
        />

        <InputText
          value={formState.name}
          onChange={handleInputChange("name")}
          placeholder="Name"
          className="onboard-input"
        />

        <InputText
          value={formState.username}
          onChange={handleInputChange("username")}
          placeholder="Username"
          className="onboard-input"
        />

        <InputText
          value={formState.password}
          onChange={handleInputChange("password")}
          placeholder="Password"
          type="password"
          className="onboard-input"
        />

        <section className="create-user__access">
          <h2 className="create-user__access-title">Access</h2>
          <div className="create-user__access-grid">
            {ACCESS_OPTIONS.map((option) => {
              const checkboxId = `create-user-access-${option.value}`;
              return (
                <label key={checkboxId} htmlFor={checkboxId} className="create-user__access-item">
                  <Checkbox
                    inputId={checkboxId}
                    value={option.value}
                    checked={formState.access.includes(option.value)}
                    onChange={handleAccessToggle(option.value)}
                    className="create-user__checkbox"
                  />
                  <span>{option.label}</span>
                </label>
              );
            })}
          </div>
        </section>

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
            User <span className="onboard-modal__mid">{formState.userId || "ID"}</span> Created Successfully!
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
