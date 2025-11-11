import { useState } from "react";
import PropTypes from "prop-types";
import { Outlet } from "react-router-dom";
import Sidebar from "../sidebar/Sidebar.jsx";
import Footer from "../footer/Footer.jsx";
import styles from "./AppLayout.module.css";

export default function AppLayout({ sidebarFooterLabel }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarId = "app-layout-sidebar";

  const handleToggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  const handleSidebarNavigate = () => {
    setSidebarOpen(false);
  };

  return (
    <div className={styles.layoutShell}>
      <div
        className={`${styles.sidebarContainer} ${sidebarOpen ? styles.sidebarContainerOpen : ""}`}
        id={sidebarId}
      >
        <Sidebar
          footerLabel={sidebarFooterLabel}
          onNavigate={handleSidebarNavigate}
          onClose={handleToggleSidebar}
          showClose={sidebarOpen}
        />
      </div>
      {sidebarOpen ? (
        <button
          type="button"
          className={`${styles.mobileOverlay} ${styles.mobileOverlayVisible}`}
          onClick={handleToggleSidebar}
          aria-label="Close navigation menu"
        />
      ) : null}
      <main className={styles.layoutContent}>
        <button
          type="button"
          className={styles.mobileToggle}
          onClick={handleToggleSidebar}
          aria-controls={sidebarId}
          aria-expanded={sidebarOpen}
          aria-label={sidebarOpen ? "Close menu" : "Open menu"}
        >
          <span className={styles.mobileToggleBar} />
          <span className={styles.mobileToggleBar} />
          <span className={styles.mobileToggleBar} />
        </button>
        <div className={styles.layoutOutlet}>
          <Outlet />
        </div>
        <Footer>© DigiKhata</Footer>
      </main>
    </div>
  );
}

AppLayout.propTypes = {
  sidebarFooterLabel: PropTypes.string,
};

AppLayout.defaultProps = {
  sidebarFooterLabel: "Profile",
};
