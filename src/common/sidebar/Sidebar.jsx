import PropTypes from "prop-types";
import { NavLink, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  Building2,
  FileText,
  LayoutDashboard,
  List,
  Monitor,
  PieChart,
  Plus,
  QrCode,
  Store,
  TrendingUp,
  Users,
} from "lucide-react";

import "./Sidebar.css";
import logo from "../../assets/images/logo.svg";


const NAV_GROUPS = [
  {
    id: "dashboard",
    title: null,
    items: [{ id: "dashboard", label: "Dashboard", path: "/dashboard", icon: LayoutDashboard }],
  },
  {
    id: "operations",
    title: "OPERATIONS",
    items: [
      {
        id: "merchant",
        label: "Merchant",
        icon: Store,
        children: [
          { id: "merchant-all", label: "Modify Merchants", path: "/merchants", icon: List },
          { id: "merchant-add", label: "Add Merchant", path: "/merchants/onboard", icon: Plus },
          { id: "merchant-report", label: "Report", path: "/merchant-reports", icon: FileText },
        ],
      },
      {
        id: "terminal",
        label: "Terminal",
        icon: Monitor,
        children: [
          { id: "terminal-all", label: "Modify Terminals", path: "/terminals", icon: List },
          { id: "terminal-add", label: "Add Terminal", path: "/terminals/create", icon: Plus },
          { id: "terminal-reporting", label: "Reporting", path: "/terminals/reporting", icon: FileText },
        ],
      },
      {
        id: "qr",
        label: "QR",
        icon: QrCode,
        children: [{ id: "qr-coming", label: "Coming soon", path: "/dashboard" }],
      },
    ],
  },
  {
    id: "user-management",
    title: "USER MANAGEMENT",
    items: [
      {
        id: "users",
        label: "User Management",
        icon: Users,
        children: [
          { id: "users-all", label: "Modify User", path: "/users", icon: List },
          { id: "users-add", label: "Add User", path: "/users/create", icon: Plus },
          { id: "users-org", label: "Add Organization", path: "/users/organization", icon: Building2 },
          { id: "users-reports", label: "Reports", path: "/users/reports", icon: BarChart3 },
        ],
      },
    ],
  },
  {
    id: "analytics",
    title: "ANALYTICS",
    items: [
      {
        id: "reports",
        label: "Reports",
        icon: BarChart3,
        children: [
          { id: "reports-daily", label: "Transaction Report", path: "/reporting", icon: FileText },
          { id: "reports-merchant-performance", label: "Merchant Performance", path: "/merchant-reports", icon: TrendingUp },
          { id: "reports-terminal", label: "Terminal Report", path: "/terminal-reports", icon: Monitor },
          { id: "reports-qr", label: "QR Report", path: "/qr-reports", icon: QrCode },
          { id: "reports-user", label: "User Report", path: "/user-reports", icon: Users },
          { id: "reports-portfolio", label: "Portfolio Report", path: "/portfolio-report", icon: PieChart },
          { id: "reports-merchant", label: "Merchant Daily Transactions", path: "/merchant-daily-transactions", icon: CalendarDays },
        ],
      },
    ],
  },
];

export default function Sidebar({ footerLabel, onNavigate, onClose, showClose }) {
  const navigate = useNavigate();
  const [openGroups, setOpenGroups] = useState({});

  const groups = useMemo(() => NAV_GROUPS, []);

  const iconClassName = (active) =>
    [
      "h-[18px] w-[18px]",
      active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
    ]
      .filter(Boolean)
      .join(" ");
  const resolveClassName = ({ isActive }) =>
    [
      "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition",
      "text-muted-foreground hover:bg-background/40 hover:text-foreground",
      isActive ? "bg-primary/15 text-foreground" : "",
    ]
      .filter(Boolean)
      .join(" ");

  const resolveSubClassName = ({ isActive }) =>
    [
      "group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[12px] transition",
      "text-muted-foreground hover:bg-background/30 hover:text-foreground",
      isActive ? "bg-background/35 text-foreground" : "",
    ]
      .filter(Boolean)
      .join(" ");

  const toggleGroup = (id) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev?.[id] }));
  };

  const handleLogout = () => {
    localStorage.clear();
    onNavigate();
    navigate("/");
  };

  return (
    <aside className="flex h-full w-[260px] flex-col border-r border-border bg-card/60 px-3 py-4 text-[13px] backdrop-blur">
      <header className="relative flex items-center justify-between gap-3 px-1">
        <button
          type="button"
          onClick={() => {
            onNavigate();
            navigate("/dashboard");
          }}
          className="flex items-center gap-3 rounded-xl border border-white/20 bg-white/10 px-2 py-1.5 text-left shadow-sm backdrop-blur hover:bg-white/15"
          aria-label="Go to dashboard"
        >
          <img src={logo} alt="DigiKhata" className="h-8 w-auto" />
        </button>
        <button
          type="button"
          className={[
            "inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/30 text-foreground",
            showClose ? "lg:hidden" : "hidden",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={onClose}
          aria-label="Close menu"
        >
          <i className="pi pi-times" aria-hidden />
        </button>
      </header>

      <nav className="sidebar-scroll mt-6 flex flex-1 flex-col gap-4 overflow-y-auto pr-1">
        {groups.map((group, groupIdx) => (
          <div key={group.id} className="flex flex-col">
            <div className="flex flex-col gap-2">
              {group.title ? (
                <div className="px-3 text-[11px] font-semibold tracking-[0.22em] text-muted-foreground/80">
                  {group.title}
                </div>
              ) : null}

              <div className="flex flex-col gap-1">
                {group.items.map((item) => {
                  const hasChildren = Array.isArray(item.children) && item.children.length > 0;
                  if (!hasChildren) {
                    return (
                      <NavLink key={item.id} to={item.path} className={resolveClassName} onClick={onNavigate}>
                        {({ isActive }) => (
                          <>
                            <item.icon className={iconClassName(isActive)} aria-hidden />
                            <span className="truncate">{item.label}</span>
                          </>
                        )}
                      </NavLink>
                    );
                  }

                  const open = Boolean(openGroups?.[item.id]);

                  return (
                    <div key={item.id} className="flex flex-col">
                      <button
                        type="button"
                        className={[
                          "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition",
                          "text-muted-foreground hover:bg-background/40 hover:text-foreground",
                          open ? "bg-background/30 text-foreground" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => toggleGroup(item.id)}
                      >
                        <item.icon className={iconClassName(open)} aria-hidden />
                        <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
                        <i
                          className={["pi pi-angle-right text-xs transition-transform", open ? "rotate-90" : ""]
                            .filter(Boolean)
                            .join(" ")}
                          aria-hidden
                        />
                      </button>

                      {open ? (
                        <div className="mt-1 ml-3 flex flex-col gap-1 border-l border-white/10 pl-3">
                          {item.children.map((child) => (
                            <NavLink
                              key={child.id}
                              to={child.path}
                              className={resolveSubClassName}
                              onClick={onNavigate}
                            >
                              {child.icon ? <child.icon className="h-4 w-4 text-muted-foreground" aria-hidden /> : null}
                              <span className="truncate">{child.label}</span>
                            </NavLink>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            {groupIdx < groups.length - 1 ? <div className="my-3 h-px w-full bg-white/5" /> : null}
          </div>
        ))}
      </nav>

      <footer className="mt-auto flex flex-col gap-3 pt-6">
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background/20 px-3 py-2 text-sm text-foreground hover:bg-background/35"
          onClick={handleLogout}
        >
          <i className="pi pi-sign-out" aria-hidden />
          Logout
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
