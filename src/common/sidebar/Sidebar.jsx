import PropTypes from "prop-types";
import { NavLink, useNavigate } from "react-router-dom";
import styles from "./Sidebar.module.css";
import logo from "../../assets/images/logo.svg";
import dashboardIcon from "../../assets/images/dashboard.svg";
import onboardIcon from "../../assets/images/onboard_merchant.svg";
import userIcon from "../../assets/images/user_management.svg";
import terminalsIcon from "../../assets/images/terminals.svg";
import reportingIcon from "../../assets/images/reporting.svg";
import avatarProfile from "../../assets/images/avatar-profile.svg";


const MENU_ITEMS = [
  { id: "dashboard", label: "Dashboard", path: "/dashboard", icon: dashboardIcon, iconWidth: "24px" },
  { id: "onboard", label: "Onboard Merchant", path: "/merchants", icon: onboardIcon, iconWidth: "24px" },
  { id: "users", label: "User Management", path: "/users", icon: userIcon, iconWidth: "22px" },
  { id: "terminals", label: "Terminals", path: "/terminals", icon: terminalsIcon, iconWidth: "18.48px" },
  { id: "reporting", label: "Daily Reporting", path: "/reporting", icon: reportingIcon, iconWidth: "24px" },
  {
    id: "merchant-daily-transactions",
    label: "Merchant Daily Transactions",
    path: "/merchant-daily-transactions",
    icon: reportingIcon,
    iconWidth: "24px",
  },
];

export default function Sidebar({ footerLabel, onNavigate, onClose, showClose }) {
  const navigate = useNavigate();
  const resolveClassName = ({ isActive }) =>
    [styles.navItem, isActive ? styles.navItemActive : ""].filter(Boolean).join(" ");

  const handleLogout = () => {
    localStorage.clear();
    onNavigate();
    navigate("/");
  };

  return (
    <aside className={styles.sidebar}>
      <header className={styles.sidebarHeader}>
        <img src={logo} alt="DigiKhata" className={styles.sidebarLogo} />
        <button
          type="button"
          className={`${styles.sidebarClose} ${showClose ? styles.sidebarCloseVisible : ""}`}
          onClick={onClose}
          aria-label="Close menu"
        >
          <span className={styles.sidebarCloseBar} />
          <span className={styles.sidebarCloseBar} />
        </button>
      </header>

      <nav className={styles.nav}>
        {MENU_ITEMS.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            className={resolveClassName}
            onClick={onNavigate}
          >
            <img
              src={item.icon}
              alt=""
              aria-hidden
              className={styles.navIcon}
              style={item.iconWidth ? { "--icon-width": item.iconWidth } : undefined}
            />
            <span className={styles.navLabel}>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <footer className={styles.footer}>
        <div className={styles.profile}>
          <img src={avatarProfile} alt="" className={styles.profileAvatar} />
          <span className={styles.profileLabel}>{footerLabel}</span>
        </div>
        <button type="button" className={styles.logoutButton} onClick={handleLogout}>
          <i className={`pi pi-sign-out ${styles.logoutIcon}`} aria-hidden />
          <span className={styles.logoutLabel}>Logout</span>
        </button>
      </footer>
    </aside>
  );
}

Sidebar.propTypes = {
  footerLabel: PropTypes.string,
  onNavigate: PropTypes.func,
  onClose: PropTypes.func,
  showClose: PropTypes.bool,
};

Sidebar.defaultProps = {
  footerLabel: "Profile",
  onNavigate: () => {},
  onClose: () => {},
  showClose: false,
};
