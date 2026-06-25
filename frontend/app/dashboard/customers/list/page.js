"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { notify } from "../../../notifier";
import BackButton from "../../back-button";
import LoadingScreen from "../../../loading-screen";
import styles from "../../transactions/transactions.module.css";
import { DataTable } from "../../../../components";
import { getCsrfToken } from "../../../csrf";

const DEFAULT_ROWS_PER_PAGE = 10;

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function latestEntry(customer) {
  const entries = customer.jewel_entries ?? [];
  return entries.length ? entries[entries.length - 1] : null;
}

function money(value) {
  const parsed = Number.parseFloat(String(value ?? "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value) {
  return `Rs. ${money(value).toFixed(2)}`;
}

function getPendingAmount(entry) {
  const startAmount = money(entry?.amount);
  const paidAmount = (entry?.closures ?? []).reduce((sum, closure) => sum + money(closure.amount), 0);
  return Math.max(startAmount - paidAmount, 0);
}

function BackIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="m15 18-6-6 6-6" />
      <path d="M9 12h10" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  );
}

function DetailsIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export default function DashboardCustomerListPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState([]);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Loading customer records...");
  const [deletingId, setDeletingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetch("/api/customers/", { cache: "no-store" })
      .then((response) => response.json().then((data) => ({ ok: response.ok, data })))
      .then(({ ok, data }) => {
        if (!ok || !data?.success) {
          throw new Error(data?.message ?? "Unable to load customer records.");
        }

        setCustomers(data.customers ?? []);
        setStatus("success");
        setMessage(data.customers?.length ? "Customer records loaded successfully." : "No customer records are available yet.");
        setCurrentPage(1);
      })
      .catch((error) => {
        setStatus("error");
        setMessage(error.message || "Unable to load customer records.");
        notify.error(error.message || "Unable to load customer records.");
      });
  }, []);

  const filteredCustomers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return customers.filter((customer) => {
      if (filterMonth) {
        const entry = latestEntry(customer);
        if (!entry || !entry.date) return false;
        const d = new Date(entry.date);
        if (!Number.isNaN(d.getTime())) {
          if (d.getMonth() + 1 !== parseInt(filterMonth)) return false;
        } else {
          return false;
        }
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        customer.sno,
        customer.ano,
        customer.full_name,
        customer.father_or_husband_name,
        customer.mobile_number,
        customer.address,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [customers, searchTerm, filterMonth]);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / rowsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedCustomers = filteredCustomers.slice((safeCurrentPage - 1) * rowsPerPage, safeCurrentPage * rowsPerPage);

  const handleDelete = async (customerId, customerName) => {
    if (!window.confirm(`Delete ${customerName}?`)) {
      return;
    }

    setDeletingId(customerId);

    try {
      await notify.promise(
        async () => {
          if (!customerId) {
            throw new Error("Invalid customer ID.");
          }

          const response = await fetch(`/api/customers/${customerId}/`, {
            method: "DELETE",
            headers: {
              "X-CSRFToken": getCsrfToken(),
              "Accept": "application/json",
            },
          });

          const contentType = response.headers.get("content-type");
          if (!contentType || !contentType.includes("application/json")) {
            throw new Error(`Server returned an unexpected response (Status ${response.status}). Please check your connection.`);
          }

          const data = await response.json();

          if (!response.ok || !data?.success) {
            throw new Error(data?.message ?? "Unable to delete customer.");
          }

          setCustomers((current) => current.filter((customer) => customer.id !== customerId));
          setStatus("success");
          setMessage(data.message ?? "Customer deleted successfully.");
          return data;
        },
        {
          loading: `Deleting ${customerName || "customer"}...`,
          success: (data) => data?.message ?? "Customer deleted successfully.",
          error: (error) => error.message || "Unable to delete customer.",
        },
      );
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Unable to delete customer.");
    } finally {
      setDeletingId(null);
    }
  };

  const openCustomerEditor = (customer) => {
    notify.action(`Opening ${customer.full_name || "customer"} for editing...`, {
      toastId: `customer-edit-${customer.id}`,
    });
    router.push(`/dashboard/customers/${customer.id}`);
  };

  const openTransactionTable = (customerId) => {
    router.push(`/dashboard/transactions/${customerId}`);
  };

  const handleRowKeyDown = (event, customerId) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openTransactionTable(customerId);
    }
  };

  const columns = useMemo(
    () => [
      { key: "sno", header: "SNO", render: (c) => <span className={styles.mono}>{c.sno || "-"}</span> },
      { key: "ano", header: "ANO", render: (c) => <span className={styles.mono}>{c.ano || "-"}</span> },
      {
        key: "customer",
        header: "Customer",
        render: (c) => (
          <span className={styles.primaryText}>{c.full_name || "-"}</span>
        ),
      },
      {
        key: "guardian",
        header: "Guardian",
        render: (c) => <span className={styles.nameCell}>{c.father_or_husband_name || "-"}</span>,
      },
      {
        key: "address",
        header: "Address",
        className: styles.wrapCell,
        render: (c) => <span className={styles.wrapCell}>{c.address || "-"}</span>,
      },
      {
        key: "amount",
        header: "Amount",
        render: (customer) => {
          const entry = latestEntry(customer);
          const pendingAmount = entry ? getPendingAmount(entry) : 0;
          return (
            <span className={styles.mono}>
              {entry ? (
                <span className={styles.amountStack}>
                  <span>{formatMoney(entry.amount)}</span>
                  <span
                    className={`${styles.statusBadge} ${
                      pendingAmount > 0 ? styles.statusBadgePending : styles.statusBadgePaid
                    }`}
                  >
                    {pendingAmount > 0 ? `Pending ${formatMoney(pendingAmount)}` : "Paid"}
                  </span>
                </span>
              ) : (
                "-"
              )}
            </span>
          );
        },
      },
      {
        key: "date",
        header: "Date",
        render: (c) => {
          const entry = latestEntry(c);
          return <span className={styles.mono}>{entry ? formatDate(entry.date) : "-"}</span>;
        },
      },
    ],
    [styles],
  );

  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Customer List</p>
          
        </div>

        <div className={styles.heroActions}>
          <BackButton className="backButton" fallbackHref="/dashboard/customers">
            <BackIcon />
            <span>Back</span>
          </BackButton>
          <Link className={styles.addButton} href="/dashboard/customers" title="Create a new customer">
            <PlusIcon />
            <span>Add</span>
          </Link>
        </div>
      </div>

      <div className={`${styles.statusCard} ${status === "error" ? styles.statusError : status === "success" ? styles.statusSuccess : ""}`}>
        {message}
      </div>

      {status === "loading" && !customers.length ? (
        <div className={styles.panel}>
          <LoadingScreen label="Loading customer records..." />
        </div>
      ) : filteredCustomers.length ? (
        <div className={styles.panel}>
          <div className={`${styles.filterBar} ${styles.filterBarFour}`}>
            <label className={styles.filterField}>
              <span>Search</span>
              <input
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by name, SNO, ANO, phone, or address"
                type="search"
                value={searchTerm}
              />
            </label>

            <label className={styles.filterField}>
              <span>Month</span>
              <select
                onChange={(event) => {
                  setFilterMonth(event.target.value);
                  setCurrentPage(1);
                }}
                value={filterMonth}
              >
                <option value="">All</option>
                <option value="1">January</option>
                <option value="2">February</option>
                <option value="3">March</option>
                <option value="4">April</option>
                <option value="5">May</option>
                <option value="6">June</option>
                <option value="7">July</option>
                <option value="8">August</option>
                <option value="9">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>
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
                {[10, 25, 50].map((option) => (
                  <option key={option} value={option}>
                    {option} per page
                  </option>
                ))}
              </select>
            </label>

            <p className={styles.filterMeta}>{filteredCustomers.length} results</p>
          </div>

          <DataTable
            columns={columns}
            data={paginatedCustomers}
            emptyText="No customer records are available yet."
            getRowId={(row) => row.id}
            onRowClick={(customer) => openTransactionTable(customer.id)}
            onEdit={openCustomerEditor}
            onDelete={(customer) => handleDelete(customer.id, customer.full_name)}
          />

          <div className={styles.paginationBar}>
            <p className={styles.paginationText}>
              Showing {(safeCurrentPage - 1) * rowsPerPage + 1} to{" "}
              {Math.min(safeCurrentPage * rowsPerPage, filteredCustomers.length)} of {filteredCustomers.length}
            </p>

            <div className={styles.paginationActions}>
              <button
                className={styles.pageButton}
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage((current) => Math.max(current - 1, 1))}
                type="button"
              >
                Previous
              </button>
              <span className={styles.pageMeta}>{`Page ${safeCurrentPage} of ${totalPages}`}</span>
              <button
                className={styles.pageButton}
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage((current) => Math.min(current + 1, totalPages))}
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      ) : (
        <article className={styles.emptyState}>
          <p className={styles.emptyEyebrow}>Customer List</p>
          <h2>{customers.length ? "No results found" : "No customer records yet"}</h2>
          <p>
            {customers.length ? "Try a different search term." : "Create your first customer to start adding transactions."}
          </p>
          <Link className={styles.addButton} href="/dashboard/customers">
            <PlusIcon />
            <span>Create Customer</span>
          </Link>
        </article>
      )}
    </section>
  );
}
