"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { notify } from "../../notifier";
import BackButton from "../back-button";
import styles from "./transactions.module.css";
import { DataTable } from "../../../components";

const DEFAULT_ROWS_PER_PAGE = 10;

function money(value) {
  const parsed = Number.parseFloat(String(value ?? "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function BackIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="m15 18-6-6 6-6" />
      <path d="M9 12h10" />
    </svg>
  );
}

function OpenIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
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

function PlusIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function formatMoney(value) {
  return `Rs. ${money(value).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function getMonthKey(value) {
  if (!value) {
    return "";
  }

  return String(value).slice(0, 7);
}

function getMonthLabel(value) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(`${value}-01T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(date);
}

function buildCollectionRows(customers) {
  return customers.flatMap((customer) =>
    (customer.jewel_entries ?? []).map((entry, index) => {
      const paidAmount = (entry.closures ?? []).reduce((sum, closure) => sum + money(closure.amount), 0);
      const startAmount = money(entry.amount);

      return {
        id: `${customer.id}-${entry.id ?? index + 1}`,
        customerId: customer.id,
        entryId: entry.id ?? `${index + 1}`,
        sno: customer.sno || "-",
        ano: customer.ano || "-",
        customerName: customer.full_name || "-",
        guardianName: customer.father_or_husband_name || "-",
        mobileNumber: customer.mobile_number || "-",
        address: customer.address || "-",
        startAmount,
        paidAmount,
        pendingAmount: Math.max(startAmount - paidAmount, 0),
        startDate: entry.date || "",
        monthKey: getMonthKey(entry.date),
        visibleRows: Number.parseInt(String(entry.visible_months ?? entry.tenure_months ?? 0), 10) || 0,
      };
    }),
  );
}
function PrintIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <path d="M6 14h12v8H6z" />
    </svg>
  );
}

export default function DashboardTransactionsPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState([]);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Loading saved transactions...");
  const [searchTerm, setSearchTerm] = useState("");
  const [monthFilter, setMonthFilter] = useState("all");
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);
  const [currentPage, setCurrentPage] = useState(1);
  const [customOrder, setCustomOrder] = useState([]);
  const [dragRow, setDragRow] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  useEffect(() => {
    fetch("/api/customers/", { cache: "no-store" })
      .then((response) => response.json().then((data) => ({ ok: response.ok, data })))
      .then(({ ok, data }) => {
        if (!ok || !data?.success) {
          throw new Error(data?.message ?? "Unable to load saved transactions.");
        }

        setCustomers(data.customers ?? []);
        setStatus("success");
        setMessage(data.customers?.length ? "Saved transactions loaded successfully." : "No saved transactions are available yet.");
      })
      .catch((error) => {
        setStatus("error");
        setMessage(error.message || "Unable to load saved transactions.");
        notify.error(error.message || "Unable to load saved transactions.");
      });
  }, []);

  const todayString = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const { overallCollection, todayCollection } = useMemo(() => {
    let overall = 0;
    let today = 0;
    customers.forEach((c) => {
      (c.jewel_entries ?? []).forEach((e) => {
        (e.closures ?? []).forEach((cl) => {
          const amt = money(cl.amount);
          overall += amt;
          if (cl.date === todayString) {
            today += amt;
          }
        });
      });
    });
    return { overallCollection: formatMoney(overall), todayCollection: formatMoney(today) };
  }, [customers, todayString]);

  const collectionRows = useMemo(() => buildCollectionRows(customers), [customers]);

  const monthOptions = useMemo(() => {
    const uniqueMonths = [...new Set(collectionRows.map((row) => row.monthKey).filter(Boolean))];
    return uniqueMonths.sort((left, right) => right.localeCompare(left));
  }, [collectionRows]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return collectionRows.filter((row) => {
      const matchesMonth = monthFilter === "all" || row.monthKey === monthFilter;
      const haystack = [row.sno, row.ano, row.customerName, row.guardianName, row.mobileNumber, row.address].join(" ").toLowerCase();
      const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);
      return matchesMonth && matchesSearch;
    });
  }, [collectionRows, monthFilter, searchTerm]);

  const sortedFilteredRows = useMemo(() => {
    if (customOrder.length === 0) return filteredRows;
    const orderMap = new Map(customOrder.map((id, index) => [id, index]));
    return [...filteredRows].sort((a, b) => {
      const idxA = orderMap.has(a.id) ? orderMap.get(a.id) : Infinity;
      const idxB = orderMap.has(b.id) ? orderMap.get(b.id) : Infinity;
      if (idxA !== Infinity || idxB !== Infinity) {
        return idxA - idxB;
      }
      return 0;
    });
  }, [filteredRows, customOrder]);

  const totalPages = Math.max(1, Math.ceil(sortedFilteredRows.length / rowsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedRows = sortedFilteredRows.slice((safeCurrentPage - 1) * rowsPerPage, safeCurrentPage * rowsPerPage);

  const handleDragStart = (e, index) => {
    setDragRow(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    setDragOverIdx(index);
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    if (dragRow === null || dragRow === index) return;
    
    // We modify customOrder based on paginatedRows swap
    const newPaginated = [...paginatedRows];
    const draggedItem = newPaginated[dragRow];
    newPaginated.splice(dragRow, 1);
    newPaginated.splice(index, 0, draggedItem);
    
    // update customOrder
    const allIds = sortedFilteredRows.map(r => r.id);
    const pageStart = (safeCurrentPage - 1) * rowsPerPage;
    const newAllIds = [...allIds];
    newAllIds.splice(pageStart, newPaginated.length, ...newPaginated.map(r => r.id));
    setCustomOrder(newAllIds);
    setDragRow(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDragRow(null);
    setDragOverIdx(null);
  };

  const openTransaction = (customerId) => {
    router.push(`/dashboard/transactions/${customerId}`);
  };

  const openCustomerEditor = (row) => {
    notify.action(`Opening ${row.customerName || "customer"} for editing...`, {
      toastId: `transaction-edit-${row.customerId}`,
    });
    router.push(`/dashboard/customers/${row.customerId}`);
  };

  const handleRowKeyDown = (event, customerId) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openTransaction(customerId);
    }
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
        header: "Customer",
        render: (r) => (
          <div className={styles.stack}>
            <strong>{r.customerName}</strong>
            <span>{r.mobileNumber}</span>
          </div>
        ),
      },
      { key: "address", header: "Address", render: (r) => r.address },
      { key: "month", header: "Month", render: (r) => getMonthLabel(r.monthKey) },
      { key: "startDate", header: "Start Date", render: (r) => <span className={styles.mono}>{formatDate(r.startDate)}</span> },
      { key: "startAmount", header: "Start Amount", render: (r) => <span className={styles.mono}>{formatMoney(r.startAmount)}</span> },
      { key: "paidAmount", header: "Paid Amount", render: (r) => <span className={styles.mono}>{formatMoney(r.paidAmount)}</span> },
      {
        key: "pendingAmount",
        header: "Pending Amount",
        render: (r) => (
          <span className={styles.mono}>
            <span
              className={`${styles.statusBadge} ${
                r.pendingAmount > 0 ? styles.statusBadgePending : styles.statusBadgePaid
              }`}
            >
              {r.pendingAmount > 0 ? formatMoney(r.pendingAmount) : "Paid"}
            </span>
          </span>
        ),
      },
      { key: "rows", header: "Rows", render: (r) => <span className={styles.mono}>{r.visibleRows || "-"}</span> },
    ],
    [safeCurrentPage, rowsPerPage, styles],
  );

  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Transactions</p>
        </div>

        <div className={styles.heroActions}>
          <BackButton className="backButton" fallbackHref="/dashboard">
            <BackIcon />
            <span>Back</span>
          </BackButton>
          <Link className={styles.addButton} href="/dashboard/customers">
            <PlusIcon />
            <span>Add New</span>
          </Link>
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
              placeholder="Search by name, SNO, ANO, phone, or address"
              type="search"
              value={searchTerm}
            />
          </label>

          <label className={styles.filterField}>
            <span>Month</span>
            <select
              onChange={(event) => {
                setMonthFilter(event.target.value);
                setCurrentPage(1);
              }}
              value={monthFilter}
            >
              <option value="all">All Months</option>
              {monthOptions.map((monthKey) => (
                <option key={monthKey} value={monthKey}>
                  {getMonthLabel(monthKey)}
                </option>
              ))}
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
        </div>

        {paginatedRows.length ? (
          <>
            <DataTable
              columns={columns}
              data={paginatedRows}
              getRowId={(row) => row.id}
              actionsHeader="Actions"
              onRowClick={(row) => openTransaction(row.customerId)}
              onEdit={openCustomerEditor}
              onDelete={null}
              emptyText="No saved transactions found."
            />

            <div className={styles.paginationBar}>
              <p className={styles.paginationText}>
                Showing {(safeCurrentPage - 1) * rowsPerPage + 1} to {Math.min(safeCurrentPage * rowsPerPage, sortedFilteredRows.length)} of {sortedFilteredRows.length}
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
            <h2>No saved transactions found</h2>
            <p>Try a different search or month filter, or create a new customer transaction from the add button.</p>
          </div>
        )}
      </div>
    </section>
  );
}
