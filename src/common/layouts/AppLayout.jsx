import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../sidebar/Sidebar.jsx";
import Footer from "../footer/Footer.jsx";
import avatarProfile from "../../assets/images/avatar-profile.svg";
import api from "../../network/api";

export default function AppLayout({ sidebarFooterLabel }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState({ merchants: [], terminals: [], users: [] });
  const navigate = useNavigate();
  const location = useLocation();
  const sidebarId = "app-layout-sidebar";
  const searchRootRef = useRef(null);

  const handleToggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  const handleSidebarNavigate = () => {
    setSidebarOpen(false);
  };

  const normalizedQuery = useMemo(() => String(searchQuery ?? "").trim(), [searchQuery]);
  const currentUrl = useMemo(() => `${location.pathname}${location.search}`, [location.pathname, location.search]);

  const runSearch = useCallback(async (query) => {
    const q = String(query ?? "").trim();
    if (q.length < 2) {
      setSearchResults({ merchants: [], terminals: [], users: [] });
      return;
    }

    setSearchLoading(true);
    try {
      const [merRes, termRes, userRes] = await Promise.all([
        api.get("/all-merchants"),
        api.get("/allTerminals"),
        api.get("/users"),
      ]);

      const merchants = Array.isArray(merRes?.data?.data) ? merRes.data.data : [];
      const terminals = Array.isArray(termRes?.data?.terminals) ? termRes.data.terminals : [];
      const users = Array.isArray(userRes?.data?.users) ? userRes.data.users : [];

      const needle = q.toLowerCase();
      const includes = (value) => String(value ?? "").toLowerCase().includes(needle);

      const merchantMatches = merchants
        .filter((m) => includes(m?.MID) || includes(m?.MerchantName) || includes(m?.BusinessName) || includes(m?.Address))
        .slice(0, 6);

      const terminalMatches = terminals
        .filter((t) => includes(t?.TID) || includes(t?.TerminalID) || includes(t?.MID) || includes(t?.MerchantID))
        .slice(0, 6);

      const userMatches = users
        .filter((u) => includes(u?.username) || includes(u?.name) || includes(u?.email) || includes(u?.type))
        .slice(0, 6);

      setSearchResults({ merchants: merchantMatches, terminals: terminalMatches, users: userMatches });
    } catch {
      setSearchResults({ merchants: [], terminals: [], users: [] });
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!searchOpen) return undefined;
    const q = normalizedQuery;
    const t = setTimeout(() => {
      runSearch(q);
    }, 250);
    return () => clearTimeout(t);
  }, [normalizedQuery, runSearch, searchOpen]);

  useEffect(() => {
    if (!searchOpen) return undefined;

    const onPointerDown = (e) => {
      const root = searchRootRef.current;
      if (!root) return;
      if (root.contains(e.target)) return;
      setSearchOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [searchOpen]);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchLoading(false);
  }, []);

  const handleSelectResult = useCallback(
    (type, value) => {
      const raw = value !== undefined ? value : normalizedQuery;
      const q = encodeURIComponent(String(raw ?? "").trim());
      closeSearch();
      try {
        sessionStorage.setItem("app_refresh_return_to", currentUrl);
      } catch {
        // ignore
      }
      if (type === "merchants") navigate(q ? `/merchants?q=${q}` : "/merchants");
      if (type === "terminals") navigate(q ? `/terminals?q=${q}` : "/terminals");
      if (type === "users") navigate(q ? `/users?q=${q}` : "/users");
    },
    [closeSearch, currentUrl, navigate, normalizedQuery]
  );

  const handleRefresh = useCallback(() => {
    closeSearch();
    if (String(location.search ?? "").length) {
      try {
        const returnTo = sessionStorage.getItem("app_refresh_return_to");
        if (returnTo) {
          sessionStorage.removeItem("app_refresh_return_to");
          navigate(returnTo, { replace: true });
          return;
        }
      } catch {
        // ignore
      }

      navigate(location.pathname, { replace: true });
      return;
    }

    navigate(0);
  }, [closeSearch, location.pathname, location.search, navigate]);

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

        <div className="relative z-[3000] mb-6 flex items-center justify-between gap-4 rounded-2xl border border-border bg-card/70 px-4 py-3 backdrop-blur">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div ref={searchRootRef} className="relative flex min-w-0 flex-1">
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-background/40 px-3 py-2">
              <i className="pi pi-search text-muted-foreground" aria-hidden />
              <input
                type="text"
                placeholder="Search merchants, terminals, users..."
                className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  setSearchOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setSearchOpen(true);
                    runSearch(e.currentTarget.value);
                  }
                  if (e.key === "Escape") closeSearch();
                }}
              />
              </div>

              {searchOpen ? (
                <div className="absolute left-0 top-[calc(100%+10px)] z-[5000] w-full overflow-hidden rounded-2xl border border-border bg-card/95 shadow-[0_20px_40px_rgba(0,0,0,0.55)] backdrop-blur">
                  <div className="border-b border-border px-4 py-3 text-xs font-semibold text-muted-foreground">
                    {searchLoading ? "Searching..." : "Search results"}
                  </div>

                  <div className="max-h-[360px] overflow-auto">
                    <div className="px-4 py-3">
                      <button
                        type="button"
                        className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSelectResult("merchants")}
                        disabled={searchLoading}
                      >
                        Merchants
                      </button>
                      <div className="mt-2 grid gap-1">
                        {(searchResults.merchants ?? []).length ? (
                          (searchResults.merchants ?? []).map((m) => (
                            <button
                              key={String(m?.MID ?? m?.MerchantID ?? Math.random())}
                              type="button"
                              className="rounded-xl px-3 py-2 text-left hover:bg-background/50"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleSelectResult("merchants", m?.MID ?? m?.MerchantID)}
                              disabled={searchLoading}
                            >
                              <div className="text-sm font-semibold text-foreground">{String(m?.MerchantName ?? m?.BusinessName ?? "Merchant")}</div>
                              <div className="mt-0.5 text-xs text-muted-foreground">MID: {String(m?.MID ?? "--")}</div>
                            </button>
                          ))
                        ) : (
                          <div className="text-xs text-muted-foreground">No matches</div>
                        )}
                      </div>

                      <button
                        type="button"
                        className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSelectResult("terminals")}
                        disabled={searchLoading}
                      >
                        Terminals
                      </button>
                      <div className="mt-2 grid gap-1">
                        {(searchResults.terminals ?? []).length ? (
                          (searchResults.terminals ?? []).map((t) => (
                            <button
                              key={String(t?.TID ?? t?.TerminalID ?? Math.random())}
                              type="button"
                              className="rounded-xl px-3 py-2 text-left hover:bg-background/50"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleSelectResult("terminals", t?.TID ?? t?.TerminalID)}
                              disabled={searchLoading}
                            >
                              <div className="text-sm font-semibold text-foreground">TID: {String(t?.TID ?? t?.TerminalID ?? "--")}</div>
                              <div className="mt-0.5 text-xs text-muted-foreground">MID: {String(t?.MID ?? t?.MerchantID ?? "--")}</div>
                            </button>
                          ))
                        ) : (
                          <div className="text-xs text-muted-foreground">No matches</div>
                        )}
                      </div>

                      <button
                        type="button"
                        className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSelectResult("users")}
                        disabled={searchLoading}
                      >
                        Users
                      </button>
                      <div className="mt-2 grid gap-1">
                        {(searchResults.users ?? []).length ? (
                          (searchResults.users ?? []).map((u) => (
                            <button
                              key={String(u?.id ?? u?._id ?? u?.username ?? Math.random())}
                              type="button"
                              className="rounded-xl px-3 py-2 text-left hover:bg-background/50"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleSelectResult("users", u?.username)}
                              disabled={searchLoading}
                            >
                              <div className="text-sm font-semibold text-foreground">{String(u?.name ?? u?.username ?? "User")}</div>
                              <div className="mt-0.5 text-xs text-muted-foreground">
                                {String(u?.username ?? "--")} · {String(u?.type ?? "--")}
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="text-xs text-muted-foreground">No matches</div>
                        )}
                      </div>
                    </div>

                    {normalizedQuery.length >= 2 &&
                    !searchLoading &&
                    searchResults.merchants.length === 0 &&
                    searchResults.terminals.length === 0 &&
                    searchResults.users.length === 0 ? (
                      <div className="px-4 py-4 text-xs text-muted-foreground">No results found.</div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/30 px-3 py-2 text-sm text-foreground hover:bg-background/50"
              onClick={handleRefresh}
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
