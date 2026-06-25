"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import chromeStyles from "../../app/chrome.module.css";
import styles from "../../app/dashboard/dashboard.module.css";
import SidebarNav from "./sidebar-nav";
import HeaderCalendarButton from "../../app/dashboard/header-calendar-button";
import { getCsrfToken } from "../../app/csrf";

function MenuGlyph() {
  return (
    <span aria-hidden="true" className={chromeStyles.headerMenuGlyph}>
      <span />
      <span />
      <span />
    </span>
  );
}

function BellIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="M8 17h8" />
      <path d="M9 17v-5a3 3 0 1 1 6 0v5" />
      <path d="M6.5 17h11" />
      <path d="M12 5.5v1" />
      <path d="M10.3 20a1.9 1.9 0 0 0 3.4 0" />
      <path d="M8.3 8.7A5 5 0 0 0 7 12v2.4c0 .8-.3 1.6-.9 2.1l-.6.5" />
      <path d="m17.5 16.9-.6-.5a3 3 0 0 1-.9-2.1V12a5 5 0 0 0-1.3-3.3" />
    </svg>
  );
}

function TeamIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <circle cx="9" cy="9" r="2.5" />
      <path d="M4.5 18a4.5 4.5 0 0 1 9 0" />
      <circle cx="16.8" cy="9.2" r="1.8" />
      <path d="M15 17.7a3.8 3.8 0 0 1 5 0" />
      <path d="m18.7 4.7.4.9.9.4-.9.4-.4.9-.4-.9-.9-.4.9-.4.4-.9Z" />
      <path d="m20.7 8.3.3.6.6.3-.6.3-.3.6-.3-.6-.6-.3.6-.3.3-.6Z" />
    </svg>
  );
}

function CalculateIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <rect x="4" y="2" width="16" height="20" rx="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="8" y1="6" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="8" y1="11" x2="8.01" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="12" y1="11" x2="12.01" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="16" y1="11" x2="16.01" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="8" y1="15" x2="8.01" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="12" y1="15" x2="12.01" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="16" y1="15" x2="16.01" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="M10.8 13.2 8.5 15.5a3.2 3.2 0 1 1-4.5-4.5l2.8-2.8a3.2 3.2 0 0 1 4.5 0" />
      <path d="m13.2 10.8 2.3-2.3a3.2 3.2 0 1 1 4.5 4.5l-2.8 2.8a3.2 3.2 0 0 1-4.5 0" />
      <path d="m9 15 6-6" />
    </svg>
  );
}

function ProfileMenuBrandIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 3.8c-2.7 0-4.9 2.2-4.9 4.9 0 1.6.8 3.1 2.1 4-2.7.9-4.7 3.4-4.7 6.4 0 .7.5 1.1 1.1 1.1h4.1c5.1 0 9.3-4.1 9.3-9.2 0-4-3.2-7.2-7.1-7.2Z"
        fill="currentColor"
      />
      <circle cx="13.6" cy="8.7" fill="#fff" r="1.55" />
      <path d="M8.8 18c.4-2.7 2.8-4.7 5.6-4.7" stroke="#fff" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function ProfileMenuUserIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="M5 20a7 7 0 0 1 14 0" />
      <circle cx="12" cy="8" r="3.3" />
    </svg>
  );
}

function ProfileMenuSettingsIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="m12 3 1.2 2.5 2.8.4-2 2 0.5 2.8L12 9.4l-2.5 1.3.5-2.8-2-2 2.8-.4L12 3Z" />
      <circle cx="12" cy="12" r="2.8" />
      <path d="M4.8 13.2v-2.4l2-.7a5.8 5.8 0 0 1 .7-1.7L6.7 6l1.7-1.7 2.4.8a5.8 5.8 0 0 1 1.7-.7l.7-2h2.4l.7 2a5.8 5.8 0 0 1 1.7.7l2.4-.8L17.3 6l-.8 2.4a5.8 5.8 0 0 1 .7 1.7l2 .7v2.4l-2 .7a5.8 5.8 0 0 1-.7 1.7l.8 2.4-1.7 1.7-2.4-.8a5.8 5.8 0 0 1-1.7.7l-.7 2h-2.4l-.7-2a5.8 5.8 0 0 1-1.7-.7l-2.4.8L6.7 18l.8-2.4a5.8 5.8 0 0 1-.7-1.7l-2-.7Z" />
    </svg>
  );
}

function ProfileMenuLogoutIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="M10 7H7.5A2.5 2.5 0 0 0 5 9.5v5A2.5 2.5 0 0 0 7.5 17H10" />
      <path d="m13 15 3-3-3-3" />
      <path d="M16 12H9" />
    </svg>
  );
}

const MOBILE_DRAWER_BREAKPOINT = 860;

export default function DashboardShell({ children, items, initialProfile }) {
  return <DashboardShellFrame items={items} initialProfile={initialProfile}>{children}</DashboardShellFrame>;
}

function DashboardShellFrame({ children, items, initialProfile }) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile || null);
  const avatarMenuRef = useRef(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const notifRef = useRef(null);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const handleDismissAlert = (id) => {
    localStorage.setItem(`dismissed_${id}`, "true");
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleSnoozeAlert = (id) => {
    const twelveHours = Date.now() + (12 * 60 * 60 * 1000);
    localStorage.setItem(`snoozed_${id}`, twelveHours.toString());
    setNotifications(prev => prev.filter(n => n.id !== id));
  };
  const [calcExpr, setCalcExpr] = useState("");

  const [calcPos, setCalcPos] = useState({ x: 0, y: 0 });
  const calcDragRef = useRef({ isDragging: false, startX: 0, startY: 0, initialX: 0, initialY: 0 });

  useEffect(() => {
    if (!isCalcOpen) return;

    setCalcPos(prev => {
      if (prev.x === 0 && prev.y === 0) {
        return { x: window.innerWidth / 2 - 160, y: window.innerHeight / 2 - 200 };
      }
      return prev;
    });

    function handleMouseMove(e) {
      if (!calcDragRef.current.isDragging) return;
      setCalcPos({
        x: calcDragRef.current.initialX + (e.clientX - calcDragRef.current.startX),
        y: calcDragRef.current.initialY + (e.clientY - calcDragRef.current.startY)
      });
    }

    function handleMouseUp() {
      calcDragRef.current.isDragging = false;
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isCalcOpen]);


  function evaluateCalc(exprToEval) {
    try {
      if (!exprToEval) return;
      // eslint-disable-next-line no-eval
      const result = eval(exprToEval.replace(/[^-()\d/*+.]/g, ''));
      setCalcExpr(String(result));
    } catch (e) {
      setCalcExpr("Error");
    }
  }

  useEffect(() => {
    if (!isCalcOpen) return;

    function handleCalcKeyDown(e) {
      const key = e.key;
      const validKeys = ['0','1','2','3','4','5','6','7','8','9','/','*','-','+','.'];
      if (validKeys.includes(key)) {
        e.preventDefault();
        setCalcExpr(prev => (prev === "Error" ? "" : prev) + key);
      } else if (key === 'Enter' || key === '=') {
        e.preventDefault();
        evaluateCalc(calcExpr);
      } else if (key === 'Backspace') {
        e.preventDefault();
        setCalcExpr(prev => (prev === "Error" ? "" : prev.slice(0, -1)));
      } else if (key === 'Escape' || key === 'c' || key === 'C') {
        e.preventDefault();
        if (key === 'Escape') {
          setIsCalcOpen(false);
        } else {
           setCalcExpr("");
        }
      }
    }

    window.addEventListener("keydown", handleCalcKeyDown);
    return () => window.removeEventListener("keydown", handleCalcKeyDown);
  }, [isCalcOpen, calcExpr]);

  const displayName = profile?.display_name || "Tharuns";
  const avatarInitial = (profile?.avatar_initial || displayName.slice(0, 1) || "T").toUpperCase();
  const isSidebarExpanded = isDesktopViewport ? !isSidebarCollapsed : isSidebarOpen;
  const isSidebarIconMode = isDesktopViewport ? isSidebarCollapsed : false;

  function expandSidebarFromIconMode() {
    if (isDesktopViewport) {
      if (!isSidebarCollapsed) {
        return false;
      }

      setIsSidebarCollapsed(false);
      return true;
    }

    if (isSidebarOpen) {
      return false;
    }

    setIsSidebarOpen(true);
    return true;
  }

  function handleToggleSidebar() {
    setIsProfileMenuOpen(false);
    setIsNotifOpen(false);

    if (isDesktopViewport) {
      setIsSidebarCollapsed((current) => !current);
      return;
    }

    setIsSidebarOpen((current) => !current);
  }

  function handleToggleProfileMenu() {
    setIsSidebarOpen(false);
    setIsNotifOpen(false);
    setIsProfileMenuOpen((current) => !current);
  }
  
  function handleToggleNotifMenu() {
    setIsSidebarOpen(false);
    setIsProfileMenuOpen(false);
    setIsNotifOpen((current) => !current);
  }

  async function handleHeaderLogout() {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    try {
      const response = await fetch("/api/logout/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCsrfToken(),
        },
        cache: "no-store",
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error("Unable to logout.");
      }

      setIsProfileMenuOpen(false);
      router.replace("/");
      router.refresh();
    } catch (error) {
      console.error(error);
      setIsLoggingOut(false);
    }
  }

  useEffect(() => {
    if (initialProfile) {
      setProfile(initialProfile);
    }
  }, [initialProfile]);

  useEffect(() => {
    let active = true;

    function handleViewportChange() {
      const desktopViewport = window.innerWidth > MOBILE_DRAWER_BREAKPOINT;
      setIsDesktopViewport(desktopViewport);

      if (desktopViewport) {
        setIsSidebarOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setIsSidebarOpen(false);
        setIsProfileMenuOpen(false);
      }
    }

    function handleOutsideClick(event) {
      if (!avatarMenuRef.current?.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
      if (!notifRef.current?.contains(event.target)) {
        setIsNotifOpen(false);
      }
    }

    function handleProfileUpdated(event) {
      if (event.detail) {
        setProfile(event.detail);
      }
    }

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("keydown", handleEscape);
    window.addEventListener("dashboard-profile-updated", handleProfileUpdated);
    document.addEventListener("mousedown", handleOutsideClick);
    handleViewportChange();

    return () => {
      active = false;
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("dashboard-profile-updated", handleProfileUpdated);
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadNotifications() {
      try {
        const response = await fetch("/api/customers/", { cache: "no-store" });
        const data = await response.json();
        if (!active || !response.ok || !data.success || !data.customers) return;

        const custs = data.customers;
        const activeNotifs = [];
        const now = new Date();

        for (const c of custs) {
          const entry = c.jewel_entries && c.jewel_entries.length > 0 ? c.jewel_entries[0] : null;
          if (!entry || !entry.date) continue;
          
          const startDate = new Date(entry.date);
          if (isNaN(startDate.getTime())) continue;

          const sixMonths = new Date(startDate);
          sixMonths.setMonth(sixMonths.getMonth() + 6);
          const oneYear = new Date(startDate);
          oneYear.setFullYear(oneYear.getFullYear() + 1);

          const diff6 = (now.getTime() - sixMonths.getTime()) / (1000 * 3600 * 24);
          const diff12 = (now.getTime() - oneYear.getTime()) / (1000 * 3600 * 24);

          if (diff6 >= -3 && diff6 <= 3) {
            activeNotifs.push({ id: `${c.id}-6m`, customer: c.full_name || "Unknown", type: "6-Month Reminder", date: sixMonths });
          }
          if (diff12 >= -3 && diff12 <= 3) {
            activeNotifs.push({ id: `${c.id}-12m`, customer: c.full_name || "Unknown", type: "1-Year Reminder", date: oneYear });
          }
        }

        const filtered = activeNotifs.filter(n => {
          if (localStorage.getItem(`dismissed_${n.id}`)) return false;
          const snooze = localStorage.getItem(`snoozed_${n.id}`);
          if (snooze && parseInt(snooze, 10) > now.getTime()) return false;
          return true;
        });

        if (filtered.length > 0) {
          if (Notification.permission === "default") {
            Notification.requestPermission().then(perm => {
              if (perm === "granted") {
                new Notification("Malaiyarasi Finance", { body: `You have ${filtered.length} pending milestone remind(s)!` });
              }
            });
          } else if (Notification.permission === "granted") {
             new Notification("Malaiyarasi Finance", { body: `You have ${filtered.length} pending milestone remind(s)!` });
          }
        }
        setNotifications(filtered);
      } catch (err) {
        console.error(err);
      }
    }
    loadNotifications();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!isSidebarOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isSidebarOpen]);

  return (
    <div
      className={`${styles.shell} ${
        isDesktopViewport && isSidebarCollapsed ? styles.shellCollapsed : ""
      } ${!isDesktopViewport && isSidebarOpen ? styles.shellMobileExpanded : ""}`}
    >
      <button
        aria-label="Close sidebar"
        className={`${styles.sidebarOverlay} ${isSidebarOpen ? styles.sidebarOverlayVisible : ""}`}
        onClick={() => setIsSidebarOpen(false)}
        tabIndex={isSidebarOpen ? 0 : -1}
        type="button"
      />

      <aside
        className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : ""} ${
          isDesktopViewport && isSidebarCollapsed ? styles.sidebarCollapsed : ""
        }`}
        id="dashboard-sidebar"
      >
        <div className={`${styles.brandPanel} ${isDesktopViewport && isSidebarCollapsed ? styles.brandPanelCollapsed : ""}`}>
          <img alt="TK Infotechsoft Logo" className={styles.brandLogo} src="/logo.png" loading="lazy" />
        </div>

        <Suspense fallback={null}>
          <SidebarNav
            collapsed={isDesktopViewport && isSidebarCollapsed}
            iconOnly={isSidebarIconMode}
            items={items}
            onNavigate={() => {}}
            onRequestExpand={expandSidebarFromIconMode}
          />
        </Suspense>
      </aside>

      <div className={`${chromeStyles.dashboardColumn} ${styles.mainColumn}`}>
        <header className={chromeStyles.header}>
          <div className={chromeStyles.panelHeaderInner}>
            <div className={chromeStyles.headerLead}>
              <button
                aria-controls="dashboard-sidebar"
                aria-expanded={isSidebarExpanded}
                aria-label={
                  isDesktopViewport
                    ? isSidebarCollapsed
                      ? "Expand sidebar menu"
                      : "Collapse sidebar menu"
                    : isSidebarOpen
                      ? "Close sidebar menu"
                      : "Open sidebar menu"
                }
                className={`${chromeStyles.headerMenuButton} ${
                  isSidebarExpanded ? chromeStyles.headerMenuButtonActive : ""
                }`}
                onClick={handleToggleSidebar}
                type="button"
              >
                <MenuGlyph />
              </button>
            </div>

            <div className={chromeStyles.headerIconStrip}>
              <div className={chromeStyles.headerAvatarWrap} ref={notifRef}>
                <button
                  aria-expanded={isNotifOpen}
                  aria-label="Open notifications"
                  className={chromeStyles.headerAvatarButton}
                  onClick={handleToggleNotifMenu}
                  type="button"
                >
                  <span
                    aria-hidden="true"
                    className={`${chromeStyles.headerIconBadge} ${chromeStyles.headerAnimatedIcon} ${chromeStyles.headerBellIcon}`}
                    style={{ position: "relative", color: isNotifOpen ? "#0f172a" : "inherit" }}
                  >
                    <BellIcon />
                    {notifications.length > 0 && (
                      <span className={chromeStyles.headerNotificationDot} />
                    )}
                  </span>
                </button>
                {isNotifOpen && (
                  <div className={chromeStyles.headerAvatarMenu} style={{ width: 320, padding: 18 }} role="menu">
                    <p style={{ margin: 0, fontWeight: 800, fontSize: 13, marginBottom: 14, color: '#111827', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Anniversary Reminders</p>
                    {notifications.length === 0 ? (
                      <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>No pending reminders.</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {notifications.map(n => (
                          <div key={n.id} style={{ background: "#f8fafc", padding: 14, borderRadius: 12, border: "1px solid #e5e7eb" }}>
                            <p style={{ margin: 0, fontSize: 13, color: "#111827", fontWeight: 700 }}>{n.customer}</p>
                            <p style={{ margin: '4px 0 10px', fontSize: 12, color: "#4b5563" }}>{n.type}</p>
                            <div style={{ display: "flex", gap: 8 }}>
                              <button style={{ flex: 1, padding: "8px", background: "#ffffff", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", color: "#374151" }} onClick={() => handleSnoozeAlert(n.id)}>Remind</button>
                              <button style={{ flex: 1, padding: "8px", background: "#10b981", border: "none", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", color: "#ffffff" }} onClick={() => handleDismissAlert(n.id)}>OK</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <span
                aria-hidden="true"
                className={`${chromeStyles.headerIconBadge} ${chromeStyles.headerAnimatedIcon} ${chromeStyles.headerTeamIcon}`}
              >
                <TeamIcon />
              </span>
              <HeaderCalendarButton />
              <span
                aria-hidden="true"
                className={`${chromeStyles.headerIconBadge} ${chromeStyles.headerAnimatedIcon} ${chromeStyles.headerCalcIcon}`}
                onClick={() => setIsCalcOpen(true)}
                style={{ cursor: "pointer" }}
                title="Calculator"
              >
                <CalculateIcon />
              </span>
              <span
                aria-hidden="true"
                className={`${chromeStyles.headerIconBadge} ${chromeStyles.headerAnimatedIcon} ${chromeStyles.headerLinkIcon}`}
              >
                <LinkIcon />
              </span>

              <div className={chromeStyles.headerAvatarWrap} ref={avatarMenuRef}>
                <button
                  aria-expanded={isProfileMenuOpen}
                  aria-haspopup="menu"
                  aria-label={isProfileMenuOpen ? "Close account menu" : "Open account menu"}
                  className={`${chromeStyles.headerAvatarButton} ${
                    isProfileMenuOpen ? chromeStyles.headerAvatarButtonActive : ""
                  }`}
                  onClick={handleToggleProfileMenu}
                  type="button"
                >
                  <span className={chromeStyles.headerAvatarBadge}>
                    {profile?.photo_url ? (
                      <img
                        alt={`${displayName} profile`}
                        className={chromeStyles.headerAvatarImage}
                        src={profile.photo_url}
                        loading="eager"
                      />
                    ) : (
                      <span className={chromeStyles.headerAvatarMark}>{avatarInitial}</span>
                    )}
                  </span>
                </button>

                {isProfileMenuOpen ? (
                  <div className={chromeStyles.headerAvatarMenu} role="menu">
                    <div className={chromeStyles.headerAvatarMenuHeader}>
                      <span className={chromeStyles.headerAvatarMenuLogo}>
                        {profile?.photo_url ? (
                          <img
                            alt={`${displayName} profile`}
                            className={chromeStyles.headerAvatarMenuImage}
                            src={profile.photo_url}
                            loading="eager"
                          />
                        ) : (
                          <ProfileMenuBrandIcon />
                        )}
                      </span>
                      <p className={chromeStyles.headerAvatarMenuTitle}>{displayName}</p>
                    </div>

                    <div className={chromeStyles.headerAvatarMenuDivider} />

                    <Link
                      className={chromeStyles.headerAvatarMenuAction}
                      href="/dashboard/profile"
                      onClick={() => setIsProfileMenuOpen(false)}
                      role="menuitem"
                    >
                      <ProfileMenuUserIcon />
                      <span>Profile</span>
                    </Link>

                    <Link
                      className={chromeStyles.headerAvatarMenuAction}
                      href="/dashboard/settings"
                      onClick={() => setIsProfileMenuOpen(false)}
                      role="menuitem"
                    >
                      <ProfileMenuSettingsIcon />
                      <span>Settings</span>
                    </Link>

                    <button
                      className={chromeStyles.headerAvatarMenuAction}
                      disabled={isLoggingOut}
                      onClick={handleHeaderLogout}
                      role="menuitem"
                      type="button"
                    >
                      <ProfileMenuLogoutIcon />
                      <span>{isLoggingOut ? "Logging out..." : "Log Out"}</span>
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <main className={styles.content}>
          <Suspense fallback={null}>{children}</Suspense>
        </main>

        <div className={chromeStyles.footerText}>
          <p>Product of TK Infotechsoft</p>
          <p>Copyright &copy; <span suppressHydrationWarning>{new Date().getFullYear()}</span> TK Infotechsoft. All rights reserved.</p>
        </div>
      </div>

      {isCalcOpen && (
        <div style={{
          position: 'fixed',
          zIndex: 9999,
          left: calcPos.x,
          top: calcPos.y,
          width: 320,
          background: '#ffffff',
          borderRadius: 22,
          padding: 24,
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div 
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, cursor: 'grab' }}
            onMouseDown={(e) => {
              calcDragRef.current = {
                isDragging: true,
                startX: e.clientX,
                startY: e.clientY,
                initialX: calcPos.x,
                initialY: calcPos.y
              };
            }}
          >
            <h3 style={{ margin: 0, fontSize: 18, color: '#111827', fontWeight: 800, userSelect: 'none' }}>Calculator</h3>
            <button onClick={() => setIsCalcOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 24, color: '#6b7280', lineHeight: 1 }}>&times;</button>
          </div>
            <div>
              <input 
                value={calcExpr}
                readOnly
                placeholder="0"
                style={{ width: '100%', height: 50, fontSize: 24, textAlign: 'right', padding: '0 12px', borderRadius: 12, border: '1px solid #d1d5db', marginBottom: 16, outline: 'none', background: '#f8fafc', color: '#0f172a' }} 
              />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {['7','8','9','/','4','5','6','*','1','2','3','-','0','.','=','+'].map(btn => (
                  <button 
                    key={btn}
                    onClick={() => {
                      if (btn === '=') {
                        evaluateCalc(calcExpr);
                      } else {
                        setCalcExpr(prev => (prev === "Error" ? "" : prev) + btn);
                      }
                    }}
                    style={{
                      height: 48, borderRadius: 12, border: '1px solid #d1d5db', 
                      background: btn === '=' ? '#0ea5e9' : '#f1f5f9',
                      color: btn === '=' ? '#ffffff' : '#1e293b', 
                      fontSize: 18, fontWeight: 700, cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if(btn !== '=') e.currentTarget.style.background = '#e2e8f0';
                      else e.currentTarget.style.background = '#0284c7';
                    }}
                    onMouseLeave={(e) => {
                      if(btn !== '=') e.currentTarget.style.background = '#f1f5f9';
                      else e.currentTarget.style.background = '#0ea5e9';
                    }}
                  >
                    {btn}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setCalcExpr("")} 
                style={{ width: '100%', height: 48, borderRadius: 12, border: '1px solid #ef4444', background: '#fef2f2', color: '#dc2626', fontSize: 16, fontWeight: 700, marginTop: 10, cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#fee2e2'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#fef2f2'}
              >
                Clear
              </button>
            </div>
          </div>
      )}
    </div>
  );
}
