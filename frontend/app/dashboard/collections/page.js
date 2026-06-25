"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, Suspense } from "react";
import { notify } from "../../notifier";
import BackButton from "../back-button";
import styles from "./collections.module.css";
import { DataTable } from "../../../components";

const DEFAULT_ROWS_PER_PAGE = 10;

function money(value) {
  const parsed = Number.parseFloat(String(value ?? "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value) {
  return `Rs. ${money(value).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function BackIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="m15 18-6-6 6-6" />
      <path d="M9 12h10" />
    </svg>
  );
}

function CollectionsContent() {
  const searchParams = useSearchParams();
  const viewMode = searchParams?.get("view");
  const router = useRouter();

  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let active = true;
    const toastId = notify.loading("Loading collections...", {
      toastId: "collections-page-status",
    });

    fetch("/api/customers/", { cache: "no-store" })
      .then((response) => response.json().then((data) => ({ ok: response.ok, data })))
      .then(({ ok, data }) => {
        if (!active) {
          return;
        }

        if (!ok || !data?.success) {
          throw new Error(data?.message ?? "Unable to load collections.");
        }

        setCustomers(data.customers ?? []);
        notify.update(toastId, {
          render: data.customers?.length
            ? "Collections loaded successfully."
            : "No collections available yet.",
          type: "success",
        });
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        notify.update(toastId, {
          render: error.message || "Unable to load collections.",
          type: "error",
        });
      });

    return () => {
      active = false;
      notify.dismiss(toastId);
    };
  }, []);

  const todayString = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const currentMonthString = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const collectionRows = useMemo(() => {
    const rows = [];
    customers.forEach((customer) => {
      (customer.jewel_entries ?? []).forEach((entry, entryIndex) => {
        (entry.closures ?? []).forEach((closure, closureIndex) => {
          const amt = money(closure.amount);
          if (amt > 0) {
            rows.push({
              id: `${customer.id}-${entry.id ?? entryIndex}-${closure.month ?? closureIndex}`,
              customerId: customer.id,
              sno: customer.sno || "-",
              ano: customer.ano || "-",
              customerName: customer.full_name || "-",
              mobileNumber: customer.mobile_number || "-",
              month: closure.month || "-",
              date: closure.date || "-",
              amount: amt,
            });
          }
        });
      });
    });
    // Sort by date descending
    return rows.sort((a, b) => {
      const dateA = new Date(a.date || 0).getTime();
      const dateB = new Date(b.date || 0).getTime();
      return dateB - dateA; 
    });
  }, [customers]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return collectionRows.filter((row) => {
      if (viewMode === "today" && row.date !== todayString) {
        return false;
      }

      if (viewMode === "month" && !(row.date && row.date.startsWith(currentMonthString))) {
        return false;
      }
      
      const haystack = [row.sno, row.ano, row.customerName, row.mobileNumber, row.date].join(" ").toLowerCase();
      return !normalizedSearch || haystack.includes(normalizedSearch);
    });
  }, [collectionRows, searchTerm, viewMode, todayString]);

  const totalCollected = useMemo(() => {
    return filteredRows.reduce((sum, row) => sum + row.amount, 0);
  }, [filteredRows]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedRows = filteredRows.slice((safeCurrentPage - 1) * rowsPerPage, safeCurrentPage * rowsPerPage);

  const openTransaction = (customerId) => {
    router.push(`/dashboard/transactions/${customerId}`);
  };

  const columns = useMemo(
    () => [
      {
        key: "idx",
        header: "#",
        render: (_row, idx) => (
          <span className={styles.mono}>
            {idx + 1 + (safeCurrentPage - 1) * rowsPerPage}
          </span>
        ),
      },
      { key: "sno", header: "SNO", render: (r) => <span className={styles.mono}>{r.sno}</span> },
      { key: "ano", header: "ANO", render: (r) => <span className={styles.mono}>{r.ano}</span> },
      {
        key: "customer",
        header: "Customer Name",
        render: (r) => (
          <div className={styles.stack}>
            <strong>{r.customerName}</strong>
            <span>{r.mobileNumber}</span>
          </div>
        ),
      },
      { key: "date", header: "Payment Date", render: (r) => <span className={styles.mono}>{formatDate(r.date)}</span> },
      { key: "month", header: "Tenure", render: (r) => <span className={styles.mono}>Month {r.month}</span> },
      {
        key: "amount",
        header: "Collected Amount",
        render: (r) => (
          <span className={styles.mono}>
            <strong>{formatMoney(r.amount)}</strong>
          </span>
        ),
      },
    ],
    [safeCurrentPage, rowsPerPage, styles],
  );

  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Collections Logs</p>
          <h1 className={styles.title}>
            {viewMode === "today" 
              ? "Today's Collections" 
              : viewMode === "month" 
                ? "This Month's Collections" 
                : "Overall Collections"}
          </h1>
          </div>
        <div className={styles.heroActions}>
          <BackButton className="backButton" fallbackHref="/dashboard">
            <BackIcon />
            <span>Back</span>
          </BackButton>
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.filterBar}>
          <label className={styles.filterField}>
            <span>Search</span>
            <input
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by name, SNO, ANO, or phone"
              type="search"
              value={searchTerm}
            />
          </label>
          <label className={styles.filterField}>
            <span>Rows</span>
            <select
              onChange={(event) => {
                setRowsPerPage(Number.parseInt(event.target.value, 10) || DEFAULT_ROWS_PER_PAGE);
                setCurrentPage(1);
              }}
              value={rowsPerPage}
            >
              {[10, 25, 50, 100].map((option) => (
                <option key={option} value={option}>{option} per page</option>
              ))}
            </select>
          </label>
           <label className={styles.filterField}>
            <span>
              {viewMode === "today" 
                ? "Today's Amount" 
                : viewMode === "month" 
                  ? "This Month's Amount" 
                  : "Total Shown Collection"}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', height: '42px', padding: '0 12px', background: '#e9f7ef', color: '#266744', border: '1px solid #a7f3d0', borderRadius: '14px', fontWeight: 'bold' }}>
              {formatMoney(totalCollected)}
            </div>
           </label>
        </div>

        {paginatedRows.length ? (
          <>
            <DataTable
              columns={columns}
              data={paginatedRows}
              getRowId={(row) => row.id}
              emptyText="No collections found."
              onRowClick={(row) => openTransaction(row.customerId)}
              onEdit={null}
              onDelete={null}
            />

            <div className={styles.paginationBar}>
              <p className={styles.paginationText}>
                Showing {(safeCurrentPage - 1) * rowsPerPage + 1} to {Math.min(safeCurrentPage * rowsPerPage, filteredRows.length)} of {filteredRows.length}
              </p>
              <div className={styles.paginationActions}>
                <button className={styles.pageButton} disabled={safeCurrentPage <= 1} onClick={() => setCurrentPage((current) => Math.max(current - 1, 1))} type="button">
                  Previous
                </button>
                <span className={styles.pageMeta}>{`Page ${safeCurrentPage} of ${totalPages}`}</span>
                <button className={styles.pageButton} disabled={safeCurrentPage >= totalPages} onClick={() => setCurrentPage((current) => Math.min(current + 1, totalPages))} type="button">
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className={styles.emptyState}>
            <h2>No collections found</h2>
            <p>Try a different search, or no collections are matching the filter.</p>
          </div>
        )}
      </div>
    </section>
  );
}

export default function DashboardCollectionsPage() {
  return (
            <Suspense fallback={<div style={{ padding: "20px" }}>Loading collections...</div>}>
      <CollectionsContent />
    </Suspense>
  );
}
