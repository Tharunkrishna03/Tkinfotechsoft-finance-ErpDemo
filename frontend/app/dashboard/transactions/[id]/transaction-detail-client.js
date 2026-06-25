"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { notify } from "../../../notifier";
import BackButton from "../../back-button";
import styles from "../transaction-detail.module.css";
import { SaveButton } from "../../../../components";
import { getCsrfToken } from "../../../csrf";

const DEFAULT_VISIBLE_MONTHS = 12;
const MONTHLY_INTEREST_RATE = 2.5;

function BackIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="m15 18-6-6 6-6" />
      <path d="M9 12h10" />
    </svg>
  );
}

function AddIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
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

function amount(value) {
  const numberValue = Number.parseFloat(String(value ?? "").trim());
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function formatMoney(value) {
  return `Rs. ${amount(value).toFixed(2)}`;
}

function toDate(value) {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateInput(value) {
  const date = toDate(value);

  if (!date) {
    return "";
  }

  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  const date = value instanceof Date ? value : toDate(value);

  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getVisibleMonths(entry) {
  const visibleMonths = Number.parseInt(String(entry.visible_months ?? entry.tenure_months ?? DEFAULT_VISIBLE_MONTHS), 10);
  return Number.isFinite(visibleMonths) && visibleMonths >= 1 ? visibleMonths : DEFAULT_VISIBLE_MONTHS;
}

function shiftOneMonth(value) {
  const baseDate = toDate(value);

  if (!baseDate) {
    return null;
  }

  const firstDayOfTargetMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1);
  const lastDayOfTargetMonth = new Date(firstDayOfTargetMonth.getFullYear(), firstDayOfTargetMonth.getMonth() + 1, 0).getDate();
  const targetDay = Math.min(baseDate.getDate(), lastDayOfTargetMonth);
  return new Date(firstDayOfTargetMonth.getFullYear(), firstDayOfTargetMonth.getMonth(), targetDay);
}

function subtractOneDay(value) {
  const baseDate = toDate(value);

  if (!baseDate) {
    return null;
  }

  const nextDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  nextDate.setDate(nextDate.getDate() - 1);
  return nextDate;
}

function getNextTenureDate(baseDate) {
  return subtractOneDay(shiftOneMonth(baseDate));
}

function sortMonthRecords(records) {
  return [...records].sort((left, right) => Number(left.month) - Number(right.month));
}

function shiftMonthRecords(records, month, delta) {
  return sortMonthRecords(
    records.flatMap((record) => {
      const recordMonth = Number.parseInt(String(record.month), 10);

      if (!Number.isFinite(recordMonth) || recordMonth < 1) {
        return [];
      }

      if (delta < 0 && recordMonth === month) {
        return [];
      }

      if (recordMonth > month) {
        return [{ ...record, month: recordMonth + delta }];
      }

      return [{ ...record, month: recordMonth }];
    }),
  );
}

function buildSchedule(entry) {
  const visibleMonths = getVisibleMonths(entry);
  const rate = amount(entry.interest_rate || MONTHLY_INTEREST_RATE) / 100;
  let remainingPrincipal = amount(entry.amount);
  let totalInterest = 0;
  let totalPaid = 0;
  let previousTenureDate = toDate(entry.date);

  const closuresByMonth = new Map((entry.closures ?? []).map((closure) => [Number(closure.month), closure]));
  const tenureDateOverridesByMonth = new Map(
    (entry.tenure_date_overrides ?? []).map((override) => [Number(override.month), override.date]),
  );

  const rows = [];
  for (let index = 0; index < visibleMonths; index++) {
    const month = index + 1;
    const openingPrincipal = remainingPrincipal;
    const interest = openingPrincipal * rate;
    const closure = closuresByMonth.get(month) ?? { amount: "", date: "" };
    const calculatedDueDate = getNextTenureDate(previousTenureDate);
    const dueDate = toDate(tenureDateOverridesByMonth.get(month)) ?? calculatedDueDate;
    const clientPayment = amount(closure.amount);

    totalInterest += interest;
    totalPaid += clientPayment;
    remainingPrincipal = Math.max((openingPrincipal + interest) - clientPayment, 0);
    previousTenureDate = dueDate ?? calculatedDueDate ?? previousTenureDate;

    rows.push({
      month,
      dueDate,
      dueDateValue: formatDateInput(dueDate),
      openingPrincipal,
      interest,
      closureAmount: closure.amount ?? "",
      closureDate: closure.date ?? "",
      remainingPrincipal,
      totalAmount: remainingPrincipal,
    });

    if (remainingPrincipal === 0) {
      break;
    }
  }

  return {
    rows,
    totals: {
      principal: amount(entry.amount),
      interest: totalInterest,
      paid: totalPaid,
      remainingPrincipal,
      totalAmount: remainingPrincipal,
    },
  };
}

export default function CustomerTransactionContent({ customerId }) {
  const searchParams = useSearchParams();
  const isPrintMode = searchParams?.get("print") === "true";
  const resolvedParams = useParams();
  const activeId = customerId || resolvedParams?.id;
  const [customer, setCustomer] = useState(null);
  const [entries, setEntries] = useState([]);
  const [editableTenureMonths, setEditableTenureMonths] = useState({});
  const [message, setMessage] = useState("Loading customer transactions...");
  const [isSaving, setIsSaving] = useState(false);
  const saveInFlightRef = useRef(false);
  
  const [customRowOrders, setCustomRowOrders] = useState({});
  const [dragRowInfo, setDragRowInfo] = useState(null);
  const [dragOverRowInfo, setDragOverRowInfo] = useState(null);

  useEffect(() => {
    if (!isPrintMode) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      window.print();
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [isPrintMode]);

  useEffect(() => {
    if (!activeId) {
      return;
    }

    fetch(`/api/customers/${activeId}/`, { 
      cache: "no-store",
      headers: { "Accept": "application/json" }
    })
      .then((response) => {
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error(`Unexpected server response (Status ${response.status}).`);
        }
        return response.json().then((data) => ({ ok: response.ok, data }));
      })
      .then(({ ok, data }) => {
        if (!ok || !data?.success) {
          throw new Error(data?.message ?? "Unable to load customer transactions.");
        }

        setCustomer(data.customer);
        setEntries(data.customer?.jewel_entries ?? []);
        setEditableTenureMonths({});
        setMessage("Customer transactions loaded successfully.");
      })
      .catch((error) => {
        setMessage(error.message || "Unable to load customer transactions.");
      });
  }, [activeId]);

  const persistTransactions = async (
    nextEntries,
    {
      loadingMessage = "Saving transactions...",
      successToastMessage,
      resetEditableTenureMonths = true,
    } = {},
  ) => {
    if (saveInFlightRef.current) {
      return false;
    }

    saveInFlightRef.current = true;
    setIsSaving(true);

    try {
      await notify.promise(
        async () => {
          const response = await fetch(`/api/customers/${activeId}/`, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "X-CSRFToken": getCsrfToken(),
              "Accept": "application/json",
            },
            body: JSON.stringify({ jewel_entries: nextEntries }),
          });

          const contentType = response.headers.get("content-type");
          if (!contentType || !contentType.includes("application/json")) {
            throw new Error(`Server error (Status ${response.status}). Please try again.`);
          }

          const data = await response.json();

          if (!response.ok || !data?.success) {
            throw new Error(data?.message ?? "Unable to save transactions.");
          }

          setCustomer(data.customer);
          setEntries(data.customer?.jewel_entries ?? []);

          if (resetEditableTenureMonths) {
            setEditableTenureMonths({});
          }

          setMessage(data.message ?? "Transactions updated successfully.");
          return data;
        },
        {
          loading: loadingMessage,
          success: (data) =>
            successToastMessage ?? data?.message ?? "Transactions updated successfully.",
          error: (error) => error.message || "Unable to save transactions.",
          successOptions: { autoClose: 2400 },
          errorOptions: { autoClose: 3200 },
        },
      );
      return true;
    } catch (error) {
      setMessage(error.message || "Unable to save transactions.");
      return false;
    } finally {
      setIsSaving(false);
      saveInFlightRef.current = false;
    }
  };

  const addScheduleRow = async (entryId, afterMonth = null) => {
    if (saveInFlightRef.current) {
      return;
    }

    const targetMonth = Number.parseInt(String(afterMonth), 10);
    const entry = entries.find((e) => e.id === entryId);

    if (entry && Number.isFinite(targetMonth) && targetMonth >= 1) {
      const closuresByMonth = new Map((entry.closures ?? []).map((c) => [Number(c.month), c]));
      const closure = closuresByMonth.get(targetMonth) ?? { amount: "", date: "" };

      const amt = String(closure.amount ?? "").trim();
      const dt = String(closure.date ?? "").trim();

      if (!amt) {
        notify.error("Please enter a Close Amount first before adding a new row.", { autoClose: 3500 });
        return;
      }
      if (!dt) {
        notify.error("Please pick a Paying Date before adding a new row.", { autoClose: 3500 });
        return;
      }
    }

    setEditableTenureMonths((current) => {
      const nextSelections = { ...current };

      if (Number.isFinite(targetMonth) && targetMonth >= 1) {
        nextSelections[entryId] = targetMonth + 1;
      } else {
        delete nextSelections[entryId];
      }

      return nextSelections;
    });

    const nextEntries = entries.map((entry) =>
      entry.id === entryId
        ? {
            ...entry,
            visible_months: getVisibleMonths(entry) + 1,
            closures:
              Number.isFinite(targetMonth) && targetMonth >= 1
                ? shiftMonthRecords(entry.closures ?? [], targetMonth, 1)
                : entry.closures ?? [],
            tenure_date_overrides:
              Number.isFinite(targetMonth) && targetMonth >= 1
                ? shiftMonthRecords(entry.tenure_date_overrides ?? [], targetMonth, 1)
                : entry.tenure_date_overrides ?? [],
          }
        : entry,
    );

    setEntries(nextEntries);
    await persistTransactions(nextEntries, {
      loadingMessage: "Adding transaction...",
      successToastMessage: "Transaction made successfully.",
      resetEditableTenureMonths: false,
    });
  };

  const updateClosure = (entryId, month, field, value) => {
    if (field === "amount" && value !== "") {
      const numericValue = Number(value);
      if (Number.isNaN(numericValue) || numericValue < 0) {
        return; // Validation: Must be a positive number
      }
    }
    
    setEditableTenureRow(entryId, month);

    setEntries((current) =>
      current.map((entry) => {
        if (entry.id !== entryId) {
          return entry;
        }

        const closures = [...(entry.closures ?? [])];
        const existingIndex = closures.findIndex((closure) => Number(closure.month) === month);

        if (existingIndex >= 0) {
          const nextClosure = { ...closures[existingIndex], [field]: value };

          if (!String(nextClosure.amount ?? "").trim() && !String(nextClosure.date ?? "").trim()) {
            closures.splice(existingIndex, 1);
          } else {
            closures[existingIndex] = nextClosure;
          }
        } else {
          if (!String(value ?? "").trim()) {
            return entry;
          }

          closures.push({ month, amount: "", date: "", [field]: value });
        }

        return { ...entry, closures: sortMonthRecords(closures) };
      }),
    );
  };

  const updateTenureDate = (entryId, month, value) => {
    setEntries((current) =>
      current.map((entry) => {
        if (entry.id !== entryId) {
          return entry;
        }

        const tenureDateOverrides = [...(entry.tenure_date_overrides ?? [])];
        const existingIndex = tenureDateOverrides.findIndex((item) => Number(item.month) === month);

        if (!String(value ?? "").trim()) {
          if (existingIndex >= 0) {
            tenureDateOverrides.splice(existingIndex, 1);
          }
        } else if (existingIndex >= 0) {
          tenureDateOverrides[existingIndex] = { month, date: value };
        } else {
          tenureDateOverrides.push({ month, date: value });
        }

        return {
          ...entry,
          tenure_date_overrides: sortMonthRecords(tenureDateOverrides),
        };
      }),
    );
  };

  const deleteScheduleRow = (entryId, month) => {
    setEditableTenureMonths((current) => ({
      ...current,
      [entryId]: Math.max(month - 1, 1),
    }));
    setEntries((current) =>
      current.map((entry) => {
        if (entry.id !== entryId) {
          return entry;
        }

        return {
          ...entry,
          visible_months: Math.max(getVisibleMonths(entry) - 1, 1),
          closures: shiftMonthRecords(entry.closures ?? [], month, -1),
          tenure_date_overrides: shiftMonthRecords(entry.tenure_date_overrides ?? [], month, -1),
        };
      }),
    );
    notify.action(`Month ${month} row removed. Save transactions to confirm it.`, {
      toastId: `transaction-row-delete-${entryId}-${month}`,
    });
  };

  const setEditableTenureRow = (entryId, month) => {
    setEditableTenureMonths((current) => ({
      ...current,
      [entryId]: month,
    }));
  };

  const announceEditableTenureRow = (entryId, month) => {
    setEditableTenureRow(entryId, month);
    notify.action(`Month ${month} is ready to edit.`, {
      toastId: `transaction-row-edit-${entryId}-${month}`,
    });
  };

  const schedules = useMemo(() => entries.map((entry) => {
    const sched = buildSchedule(entry);
    const order = customRowOrders[entry.id];
    if (order) {
      const orderMap = new Map(order.map((m, idx) => [Number(m), idx]));
      sched.rows.sort((a, b) => {
        const idxA = orderMap.has(a.month) ? orderMap.get(a.month) : Infinity;
        const idxB = orderMap.has(b.month) ? orderMap.get(b.month) : Infinity;
        if (idxA !== Infinity || idxB !== Infinity) {
          return idxA - idxB;
        }
        return 0;
      });
    }
    return { entry, schedule: sched };
  }), [entries, customRowOrders]);

  const handleRowDragStart = (e, entryId, month) => {
    setDragRowInfo({ entryId, month });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleRowDragOver = (e, entryId, month) => {
    e.preventDefault();
    if (dragRowInfo && dragRowInfo.entryId === entryId) {
       setDragOverRowInfo({ entryId, month });
    }
  };

  const handleRowDrop = (e, entryId, month) => {
    e.preventDefault();
    if (!dragRowInfo || dragRowInfo.entryId !== entryId || dragRowInfo.month === month) return;
    
    const dragIdx = schedules.find(s => s.entry.id === entryId).schedule.rows.findIndex(r => r.month === dragRowInfo.month);
    const dropIdx = schedules.find(s => s.entry.id === entryId).schedule.rows.findIndex(r => r.month === month);
    
    if (dragIdx === -1 || dropIdx === -1) return;
    
    const currentEntrySchedule = schedules.find(s => s.entry.id === entryId).schedule;
    const newRows = [...currentEntrySchedule.rows];
    const item = newRows.splice(dragIdx, 1);
    newRows.splice(dropIdx, 0, item[0]);
    
    setCustomRowOrders(curr => ({
      ...curr,
      [entryId]: newRows.map(r => r.month)
    }));
    
    setDragRowInfo(null);
    setDragOverRowInfo(null);
  };

  const handleRowDragEnd = () => {
    setDragRowInfo(null);
    setDragOverRowInfo(null);
  };

  const totals = useMemo(
    () =>
      schedules.reduce(
        (summary, item) => ({
          principal: summary.principal + item.schedule.totals.principal,
          interest: summary.interest + item.schedule.totals.interest,
          paid: summary.paid + item.schedule.totals.paid,
          remainingPrincipal: summary.remainingPrincipal + item.schedule.totals.remainingPrincipal,
          totalAmount: summary.totalAmount + item.schedule.totals.totalAmount,
        }),
        { principal: 0, interest: 0, paid: 0, remainingPrincipal: 0, totalAmount: 0 },
      ),
    [schedules],
  );

  const handleSave = async () => {
    for (let i = 0; i < entries.length; i++) {
      const closures = entries[i].closures || [];
      for (let j = 0; j < closures.length; j++) {
        const amt = String(closures[j].amount ?? "").trim();
        const dt = String(closures[j].date ?? "").trim();
        if ((amt && !dt) || (!amt && dt)) {
          setMessage("Close Amount and Paying Date must both be filled out together.");
          notify.error("Paying date is mandatory when adding a payment.", { autoClose: 3200 });
          return;
        }
      }
    }

    await persistTransactions(entries, {
      loadingMessage: "Saving transactions...",
      resetEditableTenureMonths: true,
    });
  };

  if (!customer) {
    return (
      <section className={styles.page}>
        <div className={styles.status}>{message}</div>
      </section>
    );
  }

  return (
    <section className={`${styles.page} ${isPrintMode ? styles.printMode : ""}`}>
      <div className={styles.card}>
        <div className={styles.hero}>
          <div className={styles.copy}>
            <p className={styles.eyebrow}>Transactions</p>
            <h1 className={styles.title}>{customer.full_name}</h1>
           
          </div>

          <BackButton className="backButton" fallbackHref="/dashboard/transactions">
            <BackIcon />
            <span>Back</span>
          </BackButton>
        </div>

        <div className={styles.customerPanel}>
          <div className={styles.photoPanel}>
            {customer.photo_url ? (
              <img alt={`${customer.full_name} photo`} className={styles.photoImage} src={customer.photo_url} loading="lazy" />
            ) : (
              <div className={styles.photoPlaceholder}>No Photo</div>
            )}
          </div>

          <div className={styles.detailPanel}>
            <h2 className={styles.sectionTitle}>Customer Details</h2>
            <div className={styles.grid}>
              <div className={styles.item}>
                <span>Name</span>
                <strong>{customer.full_name || "-"}</strong>
              </div>
              <div className={styles.item}>
                <span>Guardian Name</span>
                <strong>{customer.father_or_husband_name || "-"}</strong>
              </div>
              <div className={styles.item}>
                <span>Phone Number</span>
                <strong>{customer.mobile_number || "-"}</strong>
              </div>
              <div className={styles.item}>
                <span>Address</span>
                <strong>{customer.address || "-"}</strong>
              </div>
              <div className={styles.item}>
                <span>SNO</span>
                <strong>{customer.sno || "-"}</strong>
              </div>
              <div className={styles.item}>
                <span>ANO</span>
                <strong>{customer.ano || "-"}</strong>
              </div>
              <div className={styles.item}>
                <span>No. of Stones</span>
                <strong>{customer.number_of_stones || "-"}</strong>
              </div>
              <div className={styles.item}>
                <span>Remark</span>
                <strong>{customer.remarks || "-"}</strong>
              </div>
              
            </div>
          </div>
        </div>
      </div>

      {schedules.length ? (
        schedules.map(({ entry, schedule }, entryIndex) => {
          const requestedEditableMonth = Number.parseInt(String(editableTenureMonths[entry.id]), 10);
          const editableTenureMonth =
            Number.isFinite(requestedEditableMonth) && requestedEditableMonth >= 1 && requestedEditableMonth <= schedule.rows.length
              ? requestedEditableMonth
              : schedule.rows.length;

          const getAccountOrdinal = (n) => {
            const s = ["th", "st", "nd", "rd"];
            const v = n % 100;
            return n + (s[(v - 20) % 10] || s[v] || s[0]);
          };

          const chunks = [];
          for (let i = 0; i < schedule.rows.length; i += 12) {
            chunks.push(schedule.rows.slice(i, i + 12));
          }

          return (
            <div className={styles.card} key={entry.id}>
            <div className={styles.sectionHeader}>
              <div className={styles.copy}>
                <p className={styles.eyebrow}>{`${getAccountOrdinal(entryIndex + 1)} Account`}</p>
               </div>

              <div className={styles.grid}>
                <div className={styles.item}>
                  <span>Start Amount</span>
                  <strong>{formatMoney(entry.amount)}</strong>
                </div>
                <div className={styles.item}>
                  <span>Start Date</span>
                  <strong>{formatDate(entry.date)}</strong>
                </div>
                <div className={styles.item}>
                  <span>Monthly Interest</span>
                  <strong>{formatMoney(entry.monthly_interest)}</strong>
                </div>
                
              </div>
            </div>

            {chunks.map((chunkRows, chunkIndex) => {
              const isLastChunk = chunkIndex === chunks.length - 1;
              return (
                <div key={chunkIndex} style={{ display: "grid", gap: "14px", marginTop: chunkIndex > 0 ? "24px" : "0" }}>
                  {chunkIndex > 0 && <h3 className={styles.sectionTitle}>Year {chunkIndex + 1}</h3>}
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Tenure</th>
                          <th>Tenure Date</th>
                          <th>Opening Amount</th>
                          <th>Interest Amount</th>
                          <th>Close Amount</th>
                          <th>Paying Date</th>
                          <th>Balance Amount</th>
                          
                          <th className={styles.centerHeader}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {chunkRows.map((row) => {
                          const globalRowIndex = schedule.rows.findIndex(r => r.month === row.month);
                          const isDragTarget = dragOverRowInfo?.entryId === entry.id && dragOverRowInfo?.month === row.month;
                          const dragDir = dragRowInfo?.month > row.month ? -1 : 1;
                          
                          return (
                          <tr 
                            key={`${entry.id}-${row.month}`}
                            draggable
                            onDragStart={(e) => handleRowDragStart(e, entry.id, row.month)}
                            onDragOver={(e) => handleRowDragOver(e, entry.id, row.month)}
                            onDrop={(e) => handleRowDrop(e, entry.id, row.month)}
                            onDragEnd={handleRowDragEnd}
                            style={{
                              opacity: dragRowInfo?.entryId === entry.id && dragRowInfo?.month === row.month ? 0.5 : 1,
                              borderTop: isDragTarget && dragDir === -1 ? "2px solid #005fcc" : "",
                              borderBottom: isDragTarget && dragDir === 1 ? "2px solid #005fcc" : "",
                            }}
                          >
                            <td>{globalRowIndex + 1}</td>
                            <td>{row.month}</td>
                            <td>
                              {row.month === editableTenureMonth ? (
                                <input
                                  onChange={(event) => updateTenureDate(entry.id, row.month, event.target.value)}
                                  type="date"
                                  value={row.dueDateValue}
                                />
                              ) : (
                                formatDate(row.dueDate)
                              )}
                            </td>
                            <td>{formatMoney(row.openingPrincipal)}</td>
                            <td>{formatMoney(row.interest)}</td>
                            <td>
                              <input
                                inputMode="decimal"
                                onChange={(event) => updateClosure(entry.id, row.month, "amount", event.target.value)}
                                readOnly={row.month !== editableTenureMonth && Boolean(row.closureAmount)}
                                step="0.01"
                                type="number"
                                value={row.closureAmount}
                                className={Boolean(String(row.closureAmount ?? "").trim()) ? styles.filledInput : ""}
                              />
                            </td>
                            <td>
                              <input
                                onChange={(event) => updateClosure(entry.id, row.month, "date", event.target.value)}
                                readOnly={row.month !== editableTenureMonth && Boolean(row.closureDate)}
                                type="date"
                                value={row.closureDate}
                                className={Boolean(String(row.closureDate ?? "").trim()) ? styles.filledInput : ""}
                              />
                            </td>
                            <td>{formatMoney(row.remainingPrincipal)}</td>
                    
                            <td className={styles.actionCell}>
                              <div className={styles.rowActionGroup}>
                              
                                <button
                                  className={`${styles.rowActionButton} ${styles.rowActionButtonAdd}`}
                                  onClick={() => addScheduleRow(entry.id, row.month)}
                                  aria-label={`Add row after ${row.month}`}
                                  title="Add row"
                                  type="button"
                                >
                                  <AddIcon />
                                </button>
                                <button
                                  className={`${styles.rowActionButton} ${styles.rowActionButtonEdit} ${row.month === editableTenureMonth ? styles.rowActionButtonActive : ""}`}
                                  onClick={() => announceEditableTenureRow(entry.id, row.month)}
                                  aria-label={`Edit tenure date for row ${row.month}`}
                                  title="Edit tenure date"
                                  type="button"
                                >
                                  <EditIcon />
                                </button>
                                <button
                                  className={`${styles.rowActionButton} ${styles.rowActionButtonDanger}`}
                                  onClick={() => deleteScheduleRow(entry.id, row.month)}
                                  aria-label={`Delete row ${row.month}`}
                                  title="Delete row"
                                  type="button"
                                >
                                  <DeleteIcon />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );})}
                      </tbody>
                      {isLastChunk && (
                        <tfoot>
                          <tr>
                            <td className={styles.addRowCell} colSpan={9} style={{ textAlign: 'center' }}>
                              <button 
                                className={styles.addRowButton} 
                                disabled={isSaving} 
                                onClick={() => addScheduleRow(entry.id, schedule.rows.length)} 
                                type="button"
                              >
                                <AddIcon />
                                <span>Add Row</span>
                              </button>
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
          );
        })
      ) : (
        <div className={styles.emptyState}>
          <h2>No transactions found</h2>
          <p>This customer does not have any recorded transactions yet.</p>
        </div>
      )}

      {schedules.length ? (
        <div className={styles.footerPanel}>
          <div className={styles.grandTotalGrid}>
            <div className={styles.grandTotalItem}>
              <span>Grand Total Interest</span>
              <strong>{formatMoney(totals.interest)}</strong>
            </div>
            <div className={styles.grandTotalItem}>
              <span>Grand Total Paid</span>
              <strong>{formatMoney(totals.paid)}</strong>
            </div>
            <div className={styles.grandTotalItem}>
              <span>Total Balance Amount</span>
              <strong>{formatMoney(totals.totalAmount)}</strong>
            </div>
          </div>

          <div className={styles.footerActions}>
            <SaveButton
              className="saveButton"
              disabled={isSaving}
              label={isSaving ? "Saving..." : "Save Transactions"}
              onClick={handleSave}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
