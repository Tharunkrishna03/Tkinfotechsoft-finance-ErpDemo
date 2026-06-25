"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { notify } from "../notifier";
import styles from "./dashboard.module.css";

const TREND_DAYS = 7;

function money(value) {
  const parsed = Number.parseFloat(String(value ?? "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value) {
  if (!Number.isFinite(value)) {
    return "--";
  }

  return `Rs. ${new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;
}

function formatInteger(value) {
  if (!Number.isFinite(value)) {
    return "--";
  }

  return new Intl.NumberFormat("en-IN").format(value);
}

function formatWeight(value) {
  if (!Number.isFinite(value)) {
    return "--";
  }

  return `${value.toFixed(2)} g`;
}

function toLocalIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getRecentDates(days) {
  const today = new Date();
  return Array.from({ length: days }, (_, index) => {
    const value = new Date(today);
    value.setDate(today.getDate() - (days - 1 - index));
    return toLocalIsoDate(value);
  });
}

function PeopleIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <circle cx="9" cy="8" r="2.5" />
      <path d="M4.2 19a4.8 4.8 0 0 1 9.6 0" />
      <circle cx="17" cy="9" r="2" />
      <path d="M14.7 19a3.6 3.6 0 0 1 6.6 0" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="M5.5 7.5h13A2.5 2.5 0 0 1 21 10v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-7A2.5 2.5 0 0 1 5.5 7.5Z" />
      <path d="M6 7.5V6a2.5 2.5 0 0 1 2.5-2.5h8" />
      <path d="M16.7 13h3.2" />
      <circle cx="16.2" cy="13" r="1" />
    </svg>
  );
}

function CollectionIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="M7 15l3 3 7-7" />
      <path d="M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Z" />
    </svg>
  );
}

function GoldIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <defs>
        <radialGradient id="goldGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#ca8a04" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill="url(#goldGrad)" stroke="#a16207" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="7" stroke="#fef08a" strokeWidth="1" strokeDasharray="2 2" fill="none" />
      <text x="12" y="16.5" textAnchor="middle" fontSize="10" fontWeight="900" fill="#713f12" stroke="none">Au</text>
    </svg>
  );
}

function SilverIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <defs>
        <radialGradient id="silverGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#94a3b8" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill="url(#silverGrad)" stroke="#475569" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="7" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="2 2" fill="none" />
      <text x="12" y="16.5" textAnchor="middle" fontSize="10" fontWeight="900" fill="#334155" stroke="none">Ag</text>
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M10.3 4.8h3.4a2.4 2.4 0 0 1 2.1 1.3l5 9.1A2.4 2.4 0 0 1 18.8 19H5.2a2.4 2.4 0 0 1-2.1-3.8l5-9.1a2.4 2.4 0 0 1 2.2-1.3Z" />
    </svg>
  );
}

function buildOverviewMetrics(customers) {
  const todayKey = toLocalIsoDate(new Date());
  const currentYearMonth = todayKey.substring(0, 7); // e.g. "2026-04"
  const totalCustomers = customers.length;

  let totalLoanAmount = 0;
  let totalPaidAmount = 0;
  let todaysCollection = 0;
  let thisMonthCollection = 0;
  let totalGoldWeight = 0;
  let totalSilverWeight = 0;
  const dueByDay = new Map(getRecentDates(TREND_DAYS).map((key) => [key, 0]));
  const collectionByDay = new Map(getRecentDates(TREND_DAYS).map((key) => [key, 0]));

  const customerStartDates = new Map(getRecentDates(TREND_DAYS).map((key) => [key, 0]));

  customers.forEach((customer) => {
    const entries = customer.jewel_entries ?? [];
    const entryDates = entries.map((entry) => entry.date).filter(Boolean);

    if (entryDates.length) {
      const earliestDate = entryDates.reduce((min, value) => (min && min < value ? min : value), entryDates[0]);
      if (customerStartDates.has(earliestDate)) {
        customerStartDates.set(earliestDate, customerStartDates.get(earliestDate) + 1);
      }
    }

    entries.forEach((entry) => {
      const startAmount = money(entry.amount);
      totalLoanAmount += startAmount;

      if (entry.date && dueByDay.has(entry.date)) {
        dueByDay.set(entry.date, dueByDay.get(entry.date) + startAmount);
      }

      const closures = entry.closures ?? [];
      closures.forEach((closure) => {
        const closureAmount = money(closure.amount);
        totalPaidAmount += closureAmount;

        if (closure.date === todayKey) {
          todaysCollection += closureAmount;
        }

        if (closure.date && closure.date.startsWith(currentYearMonth)) {
          thisMonthCollection += closureAmount;
        }

        if (closure.date && collectionByDay.has(closure.date)) {
          collectionByDay.set(closure.date, collectionByDay.get(closure.date) + closureAmount);
        }
      });
    });

    const metalType = (customer.metal_type || '').toLowerCase();
    const weightGrams = Number.parseFloat(customer.weight_grams) || 0;
    if (metalType === 'gold') {
      totalGoldWeight += weightGrams;
    } else if (metalType === 'silver') {
      totalSilverWeight += weightGrams;
    }
  });

  const pendingDues = customers.reduce((sum, customer) => {
    const entries = customer.jewel_entries ?? [];
    const customerPending = entries.reduce((entrySum, entry) => {
      const startAmount = money(entry.amount);
      const paidAmount = (entry.closures ?? []).reduce((closureSum, closure) => closureSum + money(closure.amount), 0);
      return entrySum + Math.max(startAmount - paidAmount, 0);
    }, 0);

    return sum + customerPending;
  }, 0);

  const paidRatio = totalLoanAmount > 0 ? Math.min(totalPaidAmount / totalLoanAmount, 1) : 0;

  const collectionTrend = getRecentDates(TREND_DAYS).map((key) => ({ key, value: collectionByDay.get(key) ?? 0 }));
  const loanTrend = getRecentDates(TREND_DAYS).map((key) => ({ key, value: dueByDay.get(key) ?? 0 }));
  const customerTrend = getRecentDates(TREND_DAYS).map((key) => ({ key, value: customerStartDates.get(key) ?? 0 }));

  return {
    totalCustomers,
    totalLoanAmount,
    totalPaidAmount,
    todaysCollection,
    thisMonthCollection,
    pendingDues,
    paidRatio,
    trend: {
      collection: collectionTrend,
      loan: loanTrend,
      customers: customerTrend,
    },
    totalGoldWeight,
    totalSilverWeight,
  };
}

function NumberTicker({ value, formatter }) {
  const [displayValue, setDisplayValue] = useState(0);
  const currentValueRef = useRef(0);

  useEffect(() => {
    if (!Number.isFinite(value)) {
      return undefined;
    }

    const from = currentValueRef.current;
    const to = value;

    if (Math.abs(to - from) < 0.001) {
      let frameId = 0;
      frameId = window.requestAnimationFrame(() => {
        currentValueRef.current = to;
        setDisplayValue(to);
      });

      return () => window.cancelAnimationFrame(frameId);
    }

    let frameId = 0;
    const start = performance.now();
    const duration = 950;

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      const next = from + (to - from) * eased;
      currentValueRef.current = next;
      setDisplayValue(next);

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
        return;
      }

      currentValueRef.current = to;
      setDisplayValue(to);
    };

    frameId = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(frameId);
  }, [value]);

  return <span className={styles.numberTicker}>{formatter(displayValue)}</span>;
}

function KpiCard({ icon, label, valueText, colors, numberValue, formatValue }) {
  const customStyles = colors ? {
    "--card-bg": colors.bg || "#ffffff",
    "--card-hover-bg": colors.hoverBg,
    "--card-hover-border": colors.hoverBorder,
    "--icon-bg": colors.iconBg,
    "--icon-color": colors.iconColor,
  } : {};

  return (
    <article className={styles.kpiCard} style={customStyles}>
      <div className={styles.kpiTop}>
        <span className={styles.kpiIcon}>{icon}</span>
      </div>

      <div className={styles.kpiBody}>
        <p className={styles.kpiLabel}>{label}</p>
        <strong className={styles.kpiValue}>
          {valueText ?? <NumberTicker value={numberValue} formatter={formatValue} />}
        </strong>
      </div>
    </article>
  );
}

export default function DashboardOverviewCards() {
  const [customers, setCustomers] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    fetch("/api/customers/", { cache: "no-store" })
      .then((response) => response.json().then((data) => ({ ok: response.ok, data })))
      .then(({ ok, data }) => {
        if (!ok || !data?.success) {
          throw new Error(data?.message ?? "Unable to load overview metrics.");
        }

        setCustomers(data.customers ?? []);
        setStatus("ready");
      })
      .catch((error) => {
        setStatus("error");
        notify.error(error.message || "Unable to load overview metrics.");
      });
  }, []);

  const metrics = useMemo(() => buildOverviewMetrics(customers), [customers]);
  const isLoading = status === "loading";

  return (
    <section aria-label="Dashboard Overview" className={styles.overviewSection}>
      <div className={styles.overviewHeader}>
        <div>
          <p className={styles.overviewEyebrow}>Dashboard Overview</p>
          <h1 className={styles.overviewTitle}>Business at a glance</h1>
        </div>
        <p className={styles.overviewMeta}>
          {status === "error"
            ? "Overview metrics unavailable."
            : isLoading
              ? "Loading latest totals..."
              : `Updated ${new Intl.DateTimeFormat("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                }).format(new Date())}`}
        </p>
      </div>

      <div className={styles.kpiGrid}>
        <KpiCard
          icon={<PeopleIcon />}
          label="Total customers"
          valueText={isLoading ? "--" : null}
          numberValue={metrics.totalCustomers}
          formatValue={formatInteger}
          colors={{
            bg: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
            hoverBg: "linear-gradient(180deg, #ffffff 0%, #e2e8f0 100%)",
            hoverBorder: "rgba(100, 116, 139, 0.4)",
            iconBg: "linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)",
            iconColor: "#475569"
          }}
        />
        <KpiCard
          icon={<WalletIcon />}
          label="Total loan amount"
          valueText={isLoading ? "--" : null}
          numberValue={metrics.totalLoanAmount}
          formatValue={formatMoney}
          colors={{
            bg: "linear-gradient(180deg, #f5f3ff 0%, #ede9fe 100%)",
            hoverBg: "linear-gradient(180deg, #ffffff 0%, #ddd6fe 100%)",
            hoverBorder: "rgba(139, 92, 246, 0.4)",
            iconBg: "linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)",
            iconColor: "#7c3aed"
          }}
        />
        <KpiCard
          icon={<CollectionIcon />}
          label="Today’s collection"
          valueText={isLoading ? "--" : null}
          numberValue={metrics.todaysCollection}
          formatValue={formatMoney}
          colors={{
            bg: "linear-gradient(180deg, #ecfdf5 0%, #d1fae5 100%)",
            hoverBg: "linear-gradient(180deg, #ffffff 0%, #a7f3d0 100%)",
            hoverBorder: "rgba(16, 185, 129, 0.4)",
            iconBg: "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)",
            iconColor: "#059669"
          }}
        />
        <KpiCard
          icon={<CollectionIcon />}
          label="This month's collection"
          valueText={isLoading ? "--" : null}
          numberValue={metrics.thisMonthCollection}
          formatValue={formatMoney}
          colors={{
            bg: "linear-gradient(180deg, #f0fdfa 0%, #ccfbf1 100%)",
            hoverBg: "linear-gradient(180deg, #ffffff 0%, #99f6e4 100%)",
            hoverBorder: "rgba(20, 184, 166, 0.4)",
            iconBg: "linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%)",
            iconColor: "#0d9488"
          }}
        />
        <KpiCard
          icon={<CollectionIcon />}
          label="Overall collection"
          valueText={isLoading ? "--" : null}
          numberValue={metrics.totalPaidAmount}
          formatValue={formatMoney}
          colors={{
            bg: "linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%)",
            hoverBg: "linear-gradient(180deg, #ffffff 0%, #bfdbfe 100%)",
            hoverBorder: "rgba(59, 130, 246, 0.4)",
            iconBg: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)",
            iconColor: "#2563eb"
          }}
        />
        <KpiCard
          icon={<AlertIcon />}
          label="Pending dues"
          valueText={isLoading ? "--" : null}
          numberValue={metrics.pendingDues}
          formatValue={formatMoney}
          colors={{
            bg: "linear-gradient(180deg, #fff1f2 0%, #ffe4e6 100%)",
            hoverBg: "linear-gradient(180deg, #ffffff 0%, #fecdd3 100%)",
            hoverBorder: "rgba(244, 63, 94, 0.4)",
            iconBg: "linear-gradient(135deg, #ffe4e6 0%, #fecdd3 100%)",
            iconColor: "#e11d48"
          }}
        />
        <KpiCard
          icon={<GoldIcon />}
          label="Total Gold Weight"
          valueText={isLoading ? "--" : null}
          numberValue={metrics.totalGoldWeight}
          formatValue={formatWeight}
          colors={{
            bg: "linear-gradient(180deg, #fffbeb 0%, #fef3c7 100%)",
            hoverBg: "linear-gradient(180deg, #ffffff 0%, #fde68a 100%)",
            hoverBorder: "rgba(245, 158, 11, 0.4)",
            iconBg: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
            iconColor: "#d97706"
          }}
        />
        <KpiCard
          icon={<SilverIcon />}
          label="Total Silver Weight"
          valueText={isLoading ? "--" : null}
          numberValue={metrics.totalSilverWeight}
          formatValue={formatWeight}
          colors={{
            bg: "linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%)",
            hoverBg: "linear-gradient(180deg, #ffffff 0%, #cbd5e1 100%)",
            hoverBorder: "rgba(100, 116, 139, 0.4)",
            iconBg: "linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)",
            iconColor: "#475569"
          }}
        />
      </div>
    </section>
  );
}
