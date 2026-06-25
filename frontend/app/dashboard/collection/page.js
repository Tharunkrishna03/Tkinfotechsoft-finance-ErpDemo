"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { notify } from "../../notifier";
import BackButton from "../back-button";
import styles from "../collections/collections.module.css";
import { DataTable } from "../../../components";

const DEFAULT_ROWS_PER_PAGE = 10;

function BackIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="m15 18-6-6 6-6" />
      <path d="M9 12h10" />
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

function TrashIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function money(value) {
  const parsed = Number.parseFloat(String(value ?? "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value) {
  return `Rs. ${money(value).toFixed(2)}`;
}

function formatAmountApi(n) {
  return money(n).toFixed(2);
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

function ensureEntrySpansMonth(entry, monthNum) {
  const m = Number(monthNum);
  if (!Number.isFinite(m) || m < 1) {
    return entry;
  }

  let vis = Number(entry.visible_months ?? entry.tenure_months ?? 12);
  let ten = Number(entry.tenure_months ?? 12);
  if (!Number.isFinite(vis) || vis < 1) {
    vis = 12;
  }
  if (!Number.isFinite(ten) || ten < 1) {
    ten = 12;
  }
  if (m > vis) {
    vis = m;
  }
  if (m > ten) {
    ten = m;
  }
  return { ...entry, visible_months: vis, tenure_months: ten };
}

function buildCollectedAmountRows(customers) {
  const rows = [];

  for (const customer of customers) {
    for (const entry of customer.jewel_entries ?? []) {
      for (const closure of entry.closures ?? []) {
        const amount = money(closure.amount);
        const dateStr = closure.date || "";
        if (!dateStr && amount === 0) {
          continue;
        }

        rows.push({
          id: `${customer.id}-${entry.id}-m${closure.month}`,
          customerId: customer.id,
          entryId: entry.id,
          date: dateStr,
          amount,
          sno: customer.sno || "-",
          ano: customer.ano || "-",
          customerName: customer.full_name || "-",
          mobileNumber: customer.mobile_number || "-",
          address: customer.address || "-",
          closureMonth: closure.month,
          monthKey: getMonthKey(dateStr),
        });
      }
    }
  }

  rows.sort((a, b) => {
    if (!a.date && !b.date) {
      return 0;
    }
    if (!a.date) {
      return 1;
    }
    if (!b.date) {
      return -1;
    }
    const byDate = b.date.localeCompare(a.date);
    if (byDate !== 0) {
      return byDate;
    }
    return String(a.id).localeCompare(String(b.id));
  });

  return rows;
}

function escapeCsvCell(value) {
  const s = String(value ?? "");
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function downloadCsv(filename, headerRow, dataRows) {
  const lines = [headerRow.map(escapeCsvCell).join(","), ...dataRows.map((row) => row.map(escapeCsvCell).join(","))];
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DashboardCollectionPage() {
  const [customers, setCustomers] = useState([]);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Loading collections...");
  const [searchTerm, setSearchTerm] = useState("");
  const [monthFilter, setMonthFilter] = useState("all");
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);
  const [currentPage, setCurrentPage] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  const [editRow, setEditRow] = useState(null);
  const [editMonth, setEditMonth] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");

  const [deleteRow, setDeleteRow] = useState(null);

  const [addOpen, setAddOpen] = useState(false);
  const [addCustomerId, setAddCustomerId] = useState("");
  const [addEntryId, setAddEntryId] = useState("");
  const [addMonth, setAddMonth] = useState("1");
  const [addAmount, setAddAmount] = useState("");
  const [addDate, setAddDate] = useState("");

  const reloadCustomers = useCallback(async () => {
    const response = await fetch("/api/customers/", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok || !data?.success) {
      throw new Error(data?.message ?? "Unable to reload customers.");
    }
    setCustomers(data.customers ?? []);
  }, []);

  useEffect(() => {
    fetch("/api/customers/", { cache: "no-store" })
      .then((response) => response.json().then((data) => ({ ok: response.ok, data })))
      .then(({ ok, data }) => {
        if (!ok || !data?.success) {
          throw new Error(data?.message ?? "Unable to load transactions.");
        }

        setCustomers(data.customers ?? []);
        setStatus("success");
        setMessage(data.customers?.length ? "Collections loaded." : "No customers yet.");
      })
      .catch((error) => {
        setStatus("error");
        setMessage(error.message || "Unable to load collections.");
        notify.error(error.message || "Unable to load collections.");
      });
  }, []);

  const rows = useMemo(() => buildCollectedAmountRows(customers), [customers]);

  const monthOptions = useMemo(() => {
    const uniqueMonths = [...new Set(rows.map((row) => row.monthKey).filter(Boolean))];
    return uniqueMonths.sort((left, right) => right.localeCompare(left));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesMonth = monthFilter === "all" || row.monthKey === monthFilter;
      const haystack = [row.sno, row.ano, row.customerName, row.mobileNumber, row.address].join(" ").toLowerCase();
      const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);
      return matchesMonth && matchesSearch;
    });
  }, [rows, monthFilter, searchTerm]);

  const filteredTotal = useMemo(
    () => filteredRows.reduce((sum, row) => sum + money(row.amount), 0),
    [filteredRows],
  );

  const allRowsTotal = useMemo(() => rows.reduce((sum, row) => sum + money(row.amount), 0), [rows]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedRows = filteredRows.slice((safeCurrentPage - 1) * rowsPerPage, safeCurrentPage * rowsPerPage);

  useEffect(() => {
    setCurrentPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const persistJewelEntries = async (customerId, nextEntries) => {
    if (isSaving) {
      return false;
    }
    setIsSaving(true);
    try {
      await notify.promise(
        async () => {
          const response = await fetch(`/api/customers/${customerId}/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jewel_entries: nextEntries }),
          });
          const data = await response.json();
          if (!response.ok || !data?.success) {
            throw new Error(data?.message ?? "Unable to save.");
          }
          await reloadCustomers();
          return data;
        },
        {
          loading: "Saving...",
          success: (data) => data?.message ?? "Saved.",
          error: (error) => error.message || "Save failed.",
          successOptions: { autoClose: 2200 },
          errorOptions: { autoClose: 3200 },
        },
      );
      return true;
    } catch {
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const getCustomerEntries = (customerId) => {
    const c = customers.find((x) => x.id === customerId);
    return c?.jewel_entries ?? [];
  };

  const openEdit = (row, event) => {
    event?.stopPropagation?.();
    setEditRow(row);
    setEditMonth(String(row.closureMonth ?? ""));
    setEditAmount(String(money(row.amount)));
    setEditDate(row.date ? String(row.date).slice(0, 10) : "");
    notify.action(`Editing collection for ${row.customerName}.`, {
      toastId: `collection-edit-${row.id}`,
    });
  };

  const submitEdit = async () => {
    if (!editRow) {
      return;
    }
    const customer = customers.find((c) => c.id === editRow.customerId);
    if (!customer) {
      notify.error("Customer not found.");
      return;
    }
    const monthNum = Number.parseInt(String(editMonth), 10);
    if (!Number.isFinite(monthNum) || monthNum < 1) {
      notify.error("Enter a valid month number.");
      return;
    }
    if (!String(editDate).trim()) {
      notify.error("Pick a date.");
      return;
    }

    const entries = [...(customer.jewel_entries ?? [])];
    const nextEntries = entries.map((entry) => {
      if (entry.id !== editRow.entryId) {
        return entry;
      }
      let e = ensureEntrySpansMonth(entry, monthNum);
      const closures = [...(e.closures ?? [])];
      const without = closures.filter((c) => Number(c.month) !== Number(editRow.closureMonth));
      const withoutDup = without.filter((c) => Number(c.month) !== monthNum);
      withoutDup.push({
        month: monthNum,
        amount: formatAmountApi(editAmount),
        date: String(editDate).trim(),
      });
      withoutDup.sort((a, b) => Number(a.month) - Number(b.month));
      return { ...e, closures: withoutDup };
    });

    const ok = await persistJewelEntries(editRow.customerId, nextEntries);
    if (ok) {
      setEditRow(null);
    }
  };

  const submitDelete = async () => {
    if (!deleteRow) {
      return;
    }
    const customer = customers.find((c) => c.id === deleteRow.customerId);
    if (!customer) {
      notify.error("Customer not found.");
      return;
    }
    const nextEntries = (customer.jewel_entries ?? []).map((entry) => {
      if (entry.id !== deleteRow.entryId) {
        return entry;
      }
      return {
        ...entry,
        closures: (entry.closures ?? []).filter((c) => Number(c.month) !== Number(deleteRow.closureMonth)),
      };
    });
    const ok = await persistJewelEntries(deleteRow.customerId, nextEntries);
    if (ok) {
      setDeleteRow(null);
    }
  };

  const openAddModal = () => {
    setAddOpen(true);
    const first = customers[0];
    setAddCustomerId(first ? String(first.id) : "");
    const entries = first?.jewel_entries ?? [];
    const firstEntry = entries[entries.length - 1] ?? entries[0];
    setAddEntryId(firstEntry?.id ? String(firstEntry.id) : "");
    setAddMonth("1");
    setAddAmount("");
    setAddDate("");
    notify.action("Collection form is ready.");
  };

  const openDeleteModal = (row) => {
    setDeleteRow(row);
    notify.action(`Review the delete request for ${row.customerName}.`, {
      toastId: `collection-delete-${row.id}`,
      type: "warning",
    });
  };

  useEffect(() => {
    if (!addOpen) {
      return;
    }
    const cid = Number.parseInt(addCustomerId, 10);
    const customer = customers.find((c) => c.id === cid);
    const entries = customer?.jewel_entries ?? [];
    if (!entries.length) {
      setAddEntryId("");
      return;
    }
    setAddEntryId((current) => {
      const stillValid = entries.some((e) => String(e.id) === current);
      if (stillValid) {
        return current;
      }
      const last = entries[entries.length - 1];
      return last?.id ? String(last.id) : "";
    });
  }, [addOpen, addCustomerId, customers]);

  const submitAdd = async () => {
    const cid = Number.parseInt(addCustomerId, 10);
    if (!Number.isFinite(cid)) {
      notify.error("Select a customer.");
      return;
    }
    const customer = customers.find((c) => c.id === cid);
    if (!customer) {
      notify.error("Customer not found.");
      return;
    }
    if (!addEntryId) {
      notify.error("This customer has no transaction to attach a collection to.");
      return;
    }
    const monthNum = Number.parseInt(String(addMonth), 10);
    if (!Number.isFinite(monthNum) || monthNum < 1) {
      notify.error("Enter a valid month number.");
      return;
    }
    if (!String(addDate).trim()) {
      notify.error("Pick a date.");
      return;
    }
    if (money(addAmount) <= 0) {
      notify.error("Enter a collected amount greater than zero.");
      return;
    }

    const nextEntries = (customer.jewel_entries ?? []).map((entry) => {
      if (String(entry.id) !== String(addEntryId)) {
        return entry;
      }
      let e = ensureEntrySpansMonth(entry, monthNum);
      const closures = [...(e.closures ?? [])];
      const withoutDup = closures.filter((c) => Number(c.month) !== monthNum);
      withoutDup.push({
        month: monthNum,
        amount: formatAmountApi(addAmount),
        date: String(addDate).trim(),
      });
      withoutDup.sort((a, b) => Number(a.month) - Number(b.month));
      return { ...e, closures: withoutDup };
    });

    const ok = await persistJewelEntries(cid, nextEntries);
    if (ok) {
      setAddOpen(false);
    }
  };

  const handleExport = () => {
    const header = ["Date", "Collected amount", "SNO", "ANO", "Customer", "Mobile", "Month"];
    const data = filteredRows.map((row) => [
      row.date,
      money(row.amount).toFixed(2),
      row.sno,
      row.ano,
      row.customerName,
      row.mobileNumber,
      row.closureMonth,
    ]);
    downloadCsv(`collections-${new Date().toISOString().slice(0, 10)}.csv`, header, data);
    notify.success("Export started.");
  };

  const addCustomerOptions = customers;
  const addEntryOptions = getCustomerEntries(Number.parseInt(addCustomerId, 10) || 0);

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
      { key: "date", header: "Date", render: (r) => <span className={styles.mono}>{formatDate(r.date)}</span> },
      {
        key: "amount",
        header: "Collected amount",
        render: (r) => <span className={styles.mono}>{formatMoney(r.amount)}</span>,
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
      { key: "month", header: "Month", render: (r) => <span className={styles.mono}>{r.closureMonth ?? "-"}</span> },
    ],
    [safeCurrentPage, rowsPerPage, styles],
  );

  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Collection</p>
         
        </div>

        <div className={styles.heroActions}>
          <BackButton className="backButton" fallbackHref="/dashboard">
            <BackIcon />
            <span>Back</span>
          </BackButton>
          <button
            className={styles.addButton}
            disabled={status !== "success" || !customers.length || isSaving}
            onClick={openAddModal}
            type="button"
          >
            <PlusIcon />
            <span>Add collection</span>
          </button>
        </div>
      </div>

      <div className={`${styles.statusCard} ${status === "error" ? styles.statusError : status === "success" ? styles.statusSuccess : ""}`}>
        {message}
      </div>

      <div className={styles.panel}>
        {status === "success" ? (
          <>
            <div className={styles.summaryStrip}>
              <div>
                <strong>Total collected{filteredRows.length !== rows.length ? " (filtered)" : ""}: {formatMoney(filteredTotal)}</strong>
                {filteredRows.length !== rows.length ? (
                  <span className={styles.summaryMuted}>All records total: {formatMoney(allRowsTotal)}</span>
                ) : null}
              </div>
              <span className={styles.summaryMuted}>
                Showing {filteredRows.length} record{filteredRows.length === 1 ? "" : "s"}
                {filteredRows.length !== rows.length ? ` of ${rows.length}` : ""}
              </span>
            </div>

            <div className={`${styles.filterBar} ${styles.filterBarWide}`}>
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

              <div className={styles.exportWrap}>
                <span>Export</span>
                <button className={styles.exportButton} disabled={!filteredRows.length} onClick={handleExport} type="button">
                  Download CSV
                </button>
              </div>
            </div>

            {rows.length === 0 ? (
              <div className={styles.emptyState}>
                <h2>No collected amounts yet</h2>
                <p>Closure payments on customer transactions will appear here. Use Add collection or open a transaction to record one.</p>
              </div>
            ) : filteredRows.length === 0 ? (
              <div className={styles.emptyState}>
                <h2>No matching collections</h2>
                <p>Try another search or month filter.</p>
              </div>
            ) : paginatedRows.length ? (
              <>
                <DataTable
                  columns={columns}
                  data={paginatedRows}
                  getRowId={(row) => row.id}
                  emptyText="No collections found."
                  onRowClick={(row) => window.open(`/dashboard/transactions/${row.customerId}`, "_self")}
                  onEdit={(row) => openEdit(row)}
                  onDelete={openDeleteModal}
                />

                <div className={styles.paginationBar}>
                  <p className={styles.paginationText}>
                    Showing {(safeCurrentPage - 1) * rowsPerPage + 1} to {Math.min(safeCurrentPage * rowsPerPage, filteredRows.length)} of{" "}
                    {filteredRows.length}
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
              </>
            ) : null}
          </>
        ) : null}
      </div>

      {editRow ? (
        <div
          className={styles.modalOverlay}
          onClick={() => !isSaving && setEditRow(null)}
          onKeyDown={(e) => e.key === "Escape" && !isSaving && setEditRow(null)}
          role="presentation"
        >
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="edit-collection-title">
            <h2 className={styles.modalTitle} id="edit-collection-title">
              Edit collection
            </h2>
            <p className={styles.modalHint}>
              {editRow.customerName} · {editRow.sno} · tenure month {editRow.closureMonth}
            </p>
            <label className={styles.modalField}>
              <span>Month (tenure)</span>
              <input
                inputMode="numeric"
                min={1}
                onChange={(e) => setEditMonth(e.target.value)}
                type="number"
                value={editMonth}
              />
            </label>
            <label className={styles.modalField}>
              <span>Amount (Rs.)</span>
              <input inputMode="decimal" onChange={(e) => setEditAmount(e.target.value)} type="text" value={editAmount} />
            </label>
            <label className={styles.modalField}>
              <span>Date</span>
              <input onChange={(e) => setEditDate(e.target.value)} type="date" value={editDate} />
            </label>
            <div className={styles.modalActions}>
              <button className={styles.modalButtonSecondary} disabled={isSaving} onClick={() => setEditRow(null)} type="button">
                Cancel
              </button>
              <button className={styles.modalButtonPrimary} disabled={isSaving} onClick={submitEdit} type="button">
                {isSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteRow ? (
        <div
          className={styles.modalOverlay}
          onClick={() => !isSaving && setDeleteRow(null)}
          role="presentation"
        >
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="delete-collection-title">
            <h2 className={styles.modalTitle} id="delete-collection-title">
              Delete collection?
            </h2>
            <p className={styles.modalHint}>
              Remove {formatMoney(deleteRow.amount)} on {formatDate(deleteRow.date)} for {deleteRow.customerName}. This cannot be undone.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.modalButtonSecondary} disabled={isSaving} onClick={() => setDeleteRow(null)} type="button">
                Cancel
              </button>
              <button className={styles.modalButtonDanger} disabled={isSaving} onClick={submitDelete} type="button">
                {isSaving ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {addOpen ? (
        <div
          className={styles.modalOverlay}
          onClick={() => !isSaving && setAddOpen(false)}
          role="presentation"
        >
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="add-collection-title">
            <h2 className={styles.modalTitle} id="add-collection-title">
              Add collection
            </h2>
            <p className={styles.modalHint}>Record a closure payment on an existing customer transaction.</p>
            <label className={styles.modalField}>
              <span>Customer</span>
              <select
                onChange={(e) => setAddCustomerId(e.target.value)}
                value={addCustomerId}
              >
                {addCustomerOptions.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.sno || c.ano || c.id} — {c.full_name}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.modalField}>
              <span>Transaction</span>
              <select
                disabled={!addEntryOptions.length}
                onChange={(e) => setAddEntryId(e.target.value)}
                value={addEntryId}
              >
                {addEntryOptions.map((entry, idx) => (
                  <option key={entry.id || idx} value={String(entry.id)}>
                    #{idx + 1} · {entry.date || "—"} · {formatMoney(entry.amount)}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.modalField}>
              <span>Month (tenure)</span>
              <input inputMode="numeric" min={1} onChange={(e) => setAddMonth(e.target.value)} type="number" value={addMonth} />
            </label>
            <label className={styles.modalField}>
              <span>Amount (Rs.)</span>
              <input inputMode="decimal" onChange={(e) => setAddAmount(e.target.value)} type="text" value={addAmount} />
            </label>
            <label className={styles.modalField}>
              <span>Date</span>
              <input onChange={(e) => setAddDate(e.target.value)} type="date" value={addDate} />
            </label>
            <div className={styles.modalActions}>
              <button className={styles.modalButtonSecondary} disabled={isSaving} onClick={() => setAddOpen(false)} type="button">
                Cancel
              </button>
              <button className={styles.modalButtonPrimary} disabled={isSaving || !addEntryOptions.length} onClick={submitAdd} type="button">
                {isSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
