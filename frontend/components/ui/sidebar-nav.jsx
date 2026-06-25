"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getCsrfToken } from "../../app/csrf";
import styles from "../../app/dashboard/dashboard.module.css";

const CUSTOMER_LINKS = [
  {
    id: "create-customer",
    label: "Create Customer",
    href: "/dashboard/customers",
    match: (pathname) => pathname === "/dashboard/customers",
    Icon: PlusIcon,
  },
  {
    id: "customer-list",
    label: "Customer List",
    href: "/dashboard/customers/list",
    match: (pathname) => pathname === "/dashboard/customers/list",
    Icon: ListIcon,
  },
];

const COLLECTION_LINKS = [
  {
    id: "today-collection",
    label: "Today Collection",
    href: "/dashboard/collections?view=today",
    match: (pathname, currentView) =>
      pathname === "/dashboard/collections" && currentView === "today",
    Icon: MoneyIcon,
  },
  {
    id: "month-collection",
    label: "Month Collection",
    href: "/dashboard/collections?view=month",
    match: (pathname, currentView) =>
      pathname === "/dashboard/collections" && currentView === "month",
    Icon: MoneyIcon,
  },
  {
    id: "overall-collection",
    label: "Overall Collection",
    href: "/dashboard/collections",
    match: (pathname, currentView) =>
      pathname === "/dashboard/collections" && (!currentView || currentView === "overall"),
    Icon: ListIcon,
  },
];

function SidebarIcon({ slug }) {
  switch (slug) {
    case "overview":
      return (
        <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
          <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1v-9.5Z" />
        </svg>
      );
    case "customers":
      return (
        <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
          <path d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1" />
          <circle cx="9.5" cy="8" r="3.25" />
          <path d="M16.5 10.5a3 3 0 1 0 0-6" />
          <path d="M20 19v-1a4 4 0 0 0-2.5-3.7" />
        </svg>
      );
    case "transactions":
    case "collections":
      return (
        <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
          <path d="M12 3v18" />
          <path d="M16.5 7.5c0-1.7-1.8-3-4.2-3S8 5.8 8 7.4c0 4.2 8.5 2.1 8.5 6.3 0 1.7-1.9 3.1-4.5 3.1S7.5 15.5 7.5 13.8" />
        </svg>
      );
    case "collection":
      return (
        <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
          <rect height="14" rx="2" width="18" x="3" y="5" />
          <path d="M3 10h18" />
          <path d="M7 15h4" />
          <path d="M14 15h3" />
        </svg>
      );
    case "logout":
      return (
        <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
          <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
          <path d="m10 17 5-5-5-5" />
          <path d="M15 12H4" />
        </svg>
      );
    default:
      return null;
  }
}

function PlusIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="M9 6h11" />
      <path d="M9 12h11" />
      <path d="M9 18h11" />
      <path d="M4 6h.01" />
      <path d="M4 12h.01" />
      <path d="M4 18h.01" />
    </svg>
  );
}

function MoneyIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="M12 3v18" />
      <path d="M16.5 7.5c0-1.7-1.8-3-4.2-3S8 5.8 8 7.4c0 4.2 8.5 2.1 8.5 6.3 0 1.7-1.9 3.1-4.5 3.1S7.5 15.5 7.5 13.8" />
    </svg>
  );
}

function ChevronIcon({ open }) {
  return (
    <svg
      aria-hidden="true"
      className={`${styles.navChevron} ${open ? styles.navChevronOpen : ""}`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

function isActivePath(pathname, href) {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname.startsWith(href);
}

export default function SidebarNav({
  items,
  onNavigate,
  collapsed = false,
  iconOnly = false,
  onRequestExpand,
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [isCollectionDropdownOpen, setIsCollectionDropdownOpen] = useState(false);

  const currentCollectionView = searchParams?.get("view") ?? "overall";
  const isCustomerSection = pathname.startsWith("/dashboard/customers");
  const isCollectionSection =
    pathname.startsWith("/dashboard/collection") ||
    pathname.startsWith("/dashboard/collections");

  useEffect(() => {
    setIsCustomerDropdownOpen(isCustomerSection);
    setIsCollectionDropdownOpen(isCollectionSection);
  }, [isCollectionSection, isCustomerSection, pathname]);

  async function handleLogout() {
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

      onNavigate?.();
      router.replace("/");
      router.refresh();
    } catch (error) {
      console.error(error);
      setIsLoggingOut(false);
    }
  }

  function handleToggleCustomer() {
    if (iconOnly && onRequestExpand?.()) {
      return;
    }

    setIsCustomerDropdownOpen((current) => !current);
    setIsCollectionDropdownOpen(false);
  }

  function handleToggleCollection() {
    if (iconOnly && onRequestExpand?.()) {
      return;
    }

    setIsCollectionDropdownOpen((current) => !current);
    setIsCustomerDropdownOpen(false);
  }

  return (
    <div
      className={`${styles.sidebarNavWrap} ${
        collapsed ? styles.sidebarNavWrapCollapsed : ""
      }`}
      suppressHydrationWarning
    >
      <nav className={styles.nav} aria-label="Dashboard sections" suppressHydrationWarning>
        {items.map((item) => {
          const active = isActivePath(pathname, item.href);

          if (item.slug === "customers") {
            return (
              <div className={styles.navMenuWrap} key={item.href}>
                <button
                  aria-expanded={isCustomerDropdownOpen}
                  className={`${styles.navItem} ${
                    isCustomerSection ? styles.navItemActive : ""
                  } ${styles.navMenuButton}`}
                  onClick={handleToggleCustomer}
                  title={item.navLabel}
                  type="button"
                >
                  <span className={styles.navTag}>
                    <SidebarIcon slug={item.slug} />
                  </span>
                  <span
                    className={`${styles.navCopy} ${
                      collapsed ? styles.navCopyCollapsed : ""
                    }`}
                  >
                    <span className={styles.navCopyRow}>
                      <span className={styles.navLabel}>{item.navLabel}</span>
                      <ChevronIcon open={isCustomerDropdownOpen} />
                    </span>
                  </span>
                </button>

                {isCustomerDropdownOpen ? (
                  <div
                    className={`${styles.navSubmenu} ${
                      collapsed ? styles.navSubmenuFlyout : ""
                    }`}
                  >
                    {CUSTOMER_LINKS.map((link) => {
                      const linkActive = link.match(pathname);
                      return (
                        <Link
                          className={`${styles.navSubmenuItem} ${
                            linkActive ? styles.navSubmenuItemActive : ""
                          }`}
                          href={link.href}
                          key={link.id}
                          onClick={() => onNavigate?.()}
                          title={link.label}
                        >
                          <span className={styles.navSubmenuIcon}>
                            <link.Icon />
                          </span>
                          <span className={styles.navSubmenuLabel}>{link.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          }

          if (item.slug === "collection" || item.slug === "collections") {
            return (
              <div className={styles.navMenuWrap} key={item.href}>
                <button
                  aria-expanded={isCollectionDropdownOpen}
                  className={`${styles.navItem} ${
                    isCollectionSection ? styles.navItemActive : ""
                  } ${styles.navMenuButton}`}
                  onClick={handleToggleCollection}
                  title={item.navLabel}
                  type="button"
                >
                  <span className={styles.navTag}>
                    <SidebarIcon slug={item.slug} />
                  </span>
                  <span
                    className={`${styles.navCopy} ${
                      collapsed ? styles.navCopyCollapsed : ""
                    }`}
                  >
                    <span className={styles.navCopyRow}>
                      <span className={styles.navLabel}>{item.navLabel}</span>
                      <ChevronIcon open={isCollectionDropdownOpen} />
                    </span>
                  </span>
                </button>

                {isCollectionDropdownOpen ? (
                  <div
                    className={`${styles.navSubmenu} ${
                      collapsed ? styles.navSubmenuFlyout : ""
                    }`}
                  >
                    {COLLECTION_LINKS.map((link) => {
                      const linkActive = link.match(pathname, currentCollectionView);
                      return (
                        <Link
                          className={`${styles.navSubmenuItem} ${
                            linkActive ? styles.navSubmenuItemActive : ""
                          }`}
                          href={link.href}
                          key={link.id}
                          onClick={() => onNavigate?.()}
                          title={link.label}
                        >
                          <span className={styles.navSubmenuIcon}>
                            <link.Icon />
                          </span>
                          <span className={styles.navSubmenuLabel}>{link.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          }

          return (
            <Link
              aria-current={active ? "page" : undefined}
              aria-label={item.navLabel}
              className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
              href={item.href}
              key={item.href}
              onClick={(event) => {
                if (iconOnly && onRequestExpand?.()) {
                  event.preventDefault();
                  return;
                }

                onNavigate?.();
              }}
              title={item.navLabel}
            >
              <span className={styles.navTag}>
                <SidebarIcon slug={item.slug} />
              </span>
              <span
                className={`${styles.navCopy} ${
                  collapsed ? styles.navCopyCollapsed : ""
                }`}
              >
                <span className={styles.navLabel}>{item.navLabel}</span>
              </span>
            </Link>
          );
        })}
      </nav>

      <button
        aria-label="Logout"
        className={`${styles.navItem} ${styles.logoutButton}`}
        disabled={isLoggingOut}
        onClick={() => {
          if (iconOnly && onRequestExpand?.()) {
            return;
          }

          handleLogout();
        }}
        title="Logout"
        type="button"
      >
        <span className={styles.navTag}>
          <SidebarIcon slug="logout" />
        </span>
        <span
          className={`${styles.navCopy} ${
            collapsed ? styles.navCopyCollapsed : ""
          }`}
        >
          <span className={styles.navLabel}>
            {isLoggingOut ? "Logging out..." : "Logout"}
          </span>
        </span>
      </button>
    </div>
  );
}
