import { useState } from "react";
import PropTypes from "prop-types";
import { Outlet } from "react-router-dom";
import Sidebar from "../sidebar/Sidebar.jsx";
import Footer from "../footer/Footer.jsx";
import avatarProfile from "../../assets/images/avatar-profile.svg";

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
    <div className="flex min-h-screen bg-background text-foreground">
      <div
        className={[
          "sticky top-0 h-screen self-start",
          "max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-[1000]",
          "max-lg:-translate-x-full max-lg:transition-transform max-lg:duration-300",
          sidebarOpen ? "max-lg:translate-x-0" : "",
        ]
          .filter(Boolean)
          .join(" ")}
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
          className="fixed inset-0 z-[900] bg-black/60"
          onClick={handleToggleSidebar}
          aria-label="Close navigation menu"
        />
      ) : null}
      <main className="min-w-0 flex-1 overflow-x-hidden px-6 pb-0 pt-6 lg:px-10 lg:pt-8">
        <button
          type="button"
          className="mb-4 inline-flex flex-col gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-foreground lg:hidden"
          onClick={handleToggleSidebar}
          aria-controls={sidebarId}
          aria-expanded={sidebarOpen}
          aria-label={sidebarOpen ? "Close menu" : "Open menu"}
        >
          <span className="h-0.5 w-6 rounded bg-foreground" />
          <span className="h-0.5 w-6 rounded bg-foreground" />
          <span className="h-0.5 w-6 rounded bg-foreground" />
        </button>

        <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-border bg-card/70 px-4 py-3 backdrop-blur">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-background/40 px-3 py-2">
              <i className="pi pi-search text-muted-foreground" aria-hidden />
              <input
                type="text"
                placeholder="Search merchants, terminals, users..."
                className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/30 px-3 py-2 text-sm text-foreground hover:bg-background/50"
            >
              <i className="pi pi-refresh" aria-hidden />
              Refresh
            </button>

            <div className="flex items-center gap-3 rounded-2xl border border-border bg-background/30 px-4 py-2">
              <img src={avatarProfile} alt="" className="h-9 w-9 rounded-full" />
              <span className="text-sm font-semibold text-foreground">Profile</span>
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <Outlet />
        </div>

        <div className="py-6">
          <Footer>© DigiKhata</Footer>
        </div>
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
