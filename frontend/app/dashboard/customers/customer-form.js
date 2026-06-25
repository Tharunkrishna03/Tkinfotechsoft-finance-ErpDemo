"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { notify } from "../../notifier";
import BackButton from "../back-button";
import styles from "./customers.module.css";
import { ResetButton, SaveButton } from "../../../components";
import MultiSelectAutocomplete from "../../../components/ui/multi-select-autocomplete";
import { getDashboardMarketData } from "../market-data";
import { getCsrfToken } from "../../csrf";

const MAX_PHOTO_SIZE_BYTES = 1024 * 1024;
const MONTHLY_INTEREST_RATE = 2.5;
const TENURE_MONTHS = 12;

const itemTypeOptions = ["", "ring", "chain", "necklace", "bracelet", "bangle", "earring", "other"];
const metalTypeOptionsInitial = ["", "gold", "silver"];

const initialFormValues = {
  sno: "",
  ano: "",
  date: "",
  full_name: "",
  father_or_husband_name: "",
  mobile_number: "",
  address: "",
  item_type: "",
  metal_type: "",
  purity_or_karat: "",
  weight_grams: "",
  number_of_stones: "",
  remarks: "",
  jewelry_photo: null,
};

const initialDraft = {
  amount: "",
};

function formatMoney(value) {
  const numberValue = Number.parseFloat(String(value ?? "").trim());
  return Number.isFinite(numberValue) ? numberValue.toFixed(2) : "0.00";
}

function getInterest(value) {
  const amount = Number.parseFloat(String(value ?? "").trim());
  return Number.isFinite(amount) && amount > 0 ? ((amount * MONTHLY_INTEREST_RATE) / 100).toFixed(2) : "0.00";
}

function digitsOnly(value, maxLength) {
  return String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, maxLength);
}

function mapCustomerToForm(customer) {
  return {
    sno: customer.sno ?? "",
    ano: customer.ano ?? "",
    date: customer.date ?? "",
    full_name: customer.full_name ?? "",
    father_or_husband_name: customer.father_or_husband_name ?? "",
    mobile_number: digitsOnly(customer.mobile_number ?? "", 10),
    address: customer.address ?? "",
    item_type: customer.item_type ?? "",
    metal_type: customer.metal_type ?? "",
    purity_or_karat: customer.purity_or_karat ?? "",
    weight_grams: customer.weight_grams ?? "",
    number_of_stones: customer.number_of_stones ?? "",
    remarks: customer.remarks ?? "",
    jewelry_photo: null,
  };
}

function createEntryId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `entry-${Date.now()}-${Math.round(Math.random() * 10000)}`;
}

function Label({ children, required = false }) {
  return (
    <span>
      {children} {required ? <span className={styles.requiredMark}>*</span> : null}
    </span>
  );
}

function BackIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="m15 18-6-6 6-6" />
      <path d="M9 12h10" />
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

export default function CustomerForm({ mode = "create", customerId = null }) {
  const isEditMode = mode === "edit";
  const [formValues, setFormValues] = useState(initialFormValues);
  const [itemTypeDraft, setItemTypeDraft] = useState("");
  const [autoSequenceValues, setAutoSequenceValues] = useState({ sno: "", ano: "" });
  const [initialSnapshot, setInitialSnapshot] = useState(initialFormValues);
  const [entries, setEntries] = useState([]);
  const [initialEntries, setInitialEntries] = useState([]);
  const [metalTypeOptions, setMetalTypeOptions] = useState(metalTypeOptionsInitial);
  const [draft, setDraft] = useState(initialDraft);
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState(
    isEditMode ? "Loading customer details..." : "Fill the customer card and add at least one transaction row.",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(isEditMode);
  const [formResetKey, setFormResetKey] = useState(0);

  useEffect(() => {
    if (isEditMode) {
      return;
    }

    fetch("/api/settings/", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (!data?.success) {
          return;
        }

        setAutoSequenceValues({
          sno: data.settings?.next_sno_value ?? "",
          ano: data.settings?.next_ano_value ?? "",
        });

        setFormValues((current) => ({
          ...current,
          sno: current.sno || data.settings?.next_sno_value || "",
          ano: current.ano || data.settings?.next_ano_value || "",
        }));
      })
      .catch(() => {});

    getDashboardMarketData()
      .then((data) => {
        if (data?.items?.length) {
          const liveOptions = ["", ...data.items.map((item) => item.slug)];
          setMetalTypeOptions(liveOptions);
        }
      })
      .catch(() => {});
  }, [isEditMode]);

  useEffect(() => {
    if (!isEditMode) {
      return;
    }

    if (!customerId) {
      setIsInitialLoading(false);
      return;
    }

    let active = true;

    fetch(`/api/customers/${customerId}/`, { cache: "no-store" })
      .then((response) => response.json().then((data) => ({ ok: response.ok, data })))
      .then(({ ok, data }) => {
        if (!active) {
          return;
        }

        if (!ok || !data?.success) {
          throw new Error(data?.message ?? "Unable to load customer details.");
        }

        const nextValues = mapCustomerToForm(data.customer);
        const nextEntries = data.customer?.jewel_entries ?? [];
        setFormValues(nextValues);
        setInitialSnapshot(nextValues);
        setEntries(nextEntries);
        setInitialEntries(nextEntries);
        setStatus("success");
        setMessage("Customer details loaded. Update the values and save your changes.");
      })
      .catch((error) => {
        if (active) {
          setStatus("error");
          setMessage(error.message || "Unable to load customer details.");
          notify.error(error.message || "Unable to load customer details.");
        }
      })
      .finally(() => {
        if (active) {
          setIsInitialLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [customerId, isEditMode]);

  const clearError = (fieldName) => {
    setErrors((current) => {
      if (!current[fieldName]) {
        return current;
      }

      const next = { ...current };
      delete next[fieldName];
      return next;
    });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    const sanitizedValue = name === "mobile_number" ? digitsOnly(value, 10) : value;

    setFormValues((current) => ({
      ...current,
      [name]: sanitizedValue,
    }));
    clearError(name);
  };

  const handleFileChange = (event) => {
    const { name, files } = event.target;
    setFormValues((current) => ({
      ...current,
      [name]: files?.[0] ?? null,
    }));
    clearError(name);
  };

  const handleDraftChange = (event) => {
    const { name, value } = event.target;
    setDraft((current) => ({ ...current, [name]: value }));
    clearError(`draft_${name}`);
    clearError("entries");
  };

  const getSelectedItemTypes = () => {
    return String(formValues.item_type || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  };

  const addItemType = (raw) => {
    const next = String(raw || "").trim();
    if (!next) return;

    const normalized = next.toLowerCase();
    const current = getSelectedItemTypes();
    const already = current.some((x) => x.toLowerCase() === normalized);
    if (already) {
      setItemTypeDraft("");
      return;
    }

    const updated = [...current, normalized];
    setFormValues((c) => ({ ...c, item_type: updated.join(", ") }));
    setItemTypeDraft("");
    clearError("item_type");
  };

  const removeItemType = (value) => {
    const normalized = String(value || "").trim().toLowerCase();
    const updated = getSelectedItemTypes().filter((x) => x.toLowerCase() !== normalized);
    setFormValues((c) => ({ ...c, item_type: updated.join(", ") }));
    clearError("item_type");
  };

  const resetDraft = () => {
    setDraft(initialDraft);
    setEditingEntryId(null);
  };

  const handleCancelEntryEdit = () => {
    resetDraft();
    notify.action("Entry edit cancelled.");
  };

  const handleEditEntry = (entry) => {
    setDraft({ amount: entry.amount });
    setFormValues((current) => ({ ...current, date: entry.date }));
    setEditingEntryId(entry.id);
    notify.action("Transaction row is ready to edit.", {
      toastId: `customer-entry-edit-${entry.id}`,
    });
  };

  const handleDeleteEntry = (entryId) => {
    setEntries((current) => current.filter((item) => item.id !== entryId));

    if (editingEntryId === entryId) {
      resetDraft();
    }

    notify.action("Transaction row removed. Save customer to keep the change.");
  };

  const resetFormState = (nextForm, nextEntries, nextMessage, nextStatus = "idle") => {
    setFormValues(nextForm);
    setEntries(nextEntries);
    setErrors({});
    setStatus(nextStatus);
    setMessage(nextMessage);
    resetDraft();
    setFormResetKey((current) => current + 1);
  };

  const handleAddEntry = () => {
    const nextErrors = {};
    const amount = Number.parseFloat(draft.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      nextErrors.draft_amount = "Enter a valid amount.";
    }

    if (!formValues.date) {
      nextErrors.date = "Choose a date for the transaction.";
    }

    if (Object.keys(nextErrors).length) {
      setErrors((current) => ({ ...current, ...nextErrors }));
      notify.error("Enter a valid amount and choose a transaction date first.");
      return;
    }

    const existingClosures = entries.find((entry) => entry.id === editingEntryId)?.closures ?? [];
    const existingVisibleMonths = entries.find((entry) => entry.id === editingEntryId)?.visible_months ?? TENURE_MONTHS;
    const existingTenureDateOverrides = entries.find((entry) => entry.id === editingEntryId)?.tenure_date_overrides ?? [];
    const isEditingEntry = Boolean(editingEntryId);
    const nextEntry = {
      id: editingEntryId || createEntryId(),
      amount: formatMoney(draft.amount),
      date: formValues.date,
      interest_rate: formatMoney(MONTHLY_INTEREST_RATE),
      monthly_interest: getInterest(draft.amount),
      tenure_months: TENURE_MONTHS,
      visible_months: existingVisibleMonths,
      closures: existingClosures,
      tenure_date_overrides: existingTenureDateOverrides,
    };

    setEntries((current) =>
      editingEntryId ? current.map((entry) => (entry.id === editingEntryId ? nextEntry : entry)) : [...current, nextEntry],
    );

    resetDraft();
    notify.action(
      isEditingEntry
        ? "Transaction row updated. Save customer to apply it."
        : "Transaction row added. Save customer to create the record.",
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = {};
    const mobileNumber = digitsOnly(formValues.mobile_number, 10);

    if (!formValues.date) {
      nextErrors.date = "Date is required.";
    }

    if (!formValues.full_name.trim()) {
      nextErrors.full_name = "Customer name is required.";
    }

    if (!formValues.father_or_husband_name.trim()) {
      nextErrors.father_or_husband_name = "Guardian name is required.";
    }

    if (!mobileNumber) {
      nextErrors.mobile_number = "Phone number is required.";
    } else if (!/^[6-9]\d{9}$/.test(mobileNumber)) {
      nextErrors.mobile_number = "Enter a valid 10-digit phone number.";
    }

    if (!formValues.address.trim()) {
      nextErrors.address = "Address is required.";
    }

    if (formValues.jewelry_photo && formValues.jewelry_photo.size > MAX_PHOTO_SIZE_BYTES) {
      nextErrors.jewelry_photo = "Jewelry photo must stay under 1 MB.";
    }

    if (formValues.weight_grams && Number.parseFloat(formValues.weight_grams) <= 0) {
      nextErrors.weight_grams = "Weight must be greater than zero.";
    }

    if (formValues.number_of_stones && Number.parseInt(formValues.number_of_stones, 10) < 0) {
      nextErrors.number_of_stones = "Number of stones cannot be negative.";
    }

    if (!entries.length) {
      nextErrors.entries = "Add at least one amount and date row.";
    }

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      setStatus("error");
      setMessage("Please correct the highlighted customer form errors.");
      notify.error("Fill the required fields and add a transaction row.");
      return;
    }

    setIsSubmitting(true);
    setStatus("idle");
    setMessage(isEditMode ? "Updating customer details..." : "Saving customer details...");

    try {
      await notify.promise(
        async () => {
          const payload = new FormData();
          const trimmedSno = formValues.sno.trim();
          const trimmedAno = formValues.ano.trim();
          payload.append("full_name", formValues.full_name.trim());
          payload.append("father_or_husband_name", formValues.father_or_husband_name.trim());
          payload.append("mobile_number", mobileNumber);
          payload.append("address", formValues.address.trim());
          payload.append("identity_proof_type", "");
          payload.append("identity_proof_name", "");
          payload.append("identity_proof_number", "");
          payload.append("item_type", formValues.item_type);
          payload.append("metal_type", formValues.metal_type);
          payload.append("purity_or_karat", formValues.purity_or_karat.trim());
          payload.append("weight_grams", formValues.weight_grams);
          payload.append("number_of_stones", formValues.number_of_stones);
          payload.append("remarks", formValues.remarks.trim());
          payload.append("jewel_entries", JSON.stringify(entries));

          if (isEditMode || (trimmedSno && trimmedSno !== autoSequenceValues.sno)) {
            payload.append("sno", trimmedSno);
          }

          if (isEditMode || (trimmedAno && trimmedAno !== autoSequenceValues.ano)) {
            payload.append("ano", trimmedAno);
          }

          if (formValues.date) {
            payload.append("date", formValues.date);
          }

          if (formValues.jewelry_photo instanceof File) {
            payload.append("jewelry_photo", formValues.jewelry_photo);
          }

          const response = await fetch(isEditMode ? `/api/customers/${customerId}/` : "/api/customers/", {
            method: "POST",
            headers: {
              "X-CSRFToken": getCsrfToken(),
            },
            body: payload,
          });
          const data = await response.json();

          if (!response.ok || !data?.success) {
            setErrors(data?.errors ?? {});
            throw new Error(data?.message ?? "Unable to save the customer right now.");
          }

          if (isEditMode) {
            const nextForm = mapCustomerToForm(data.customer);
            const nextEntries = data.customer?.jewel_entries ?? [];
            setInitialSnapshot(nextForm);
            setInitialEntries(nextEntries);
            resetFormState(nextForm, nextEntries, data.message ?? "Customer updated successfully.", "success");
          } else {
            const clearedFormValues = {
              ...initialFormValues,
              sno: autoSequenceValues.sno,
              ano: autoSequenceValues.ano,
            };
            resetFormState(
              clearedFormValues,
              [],
              data.message ?? "Customer saved successfully.",
              "success",
            );

            const settingsResponse = await fetch("/api/settings/", { cache: "no-store" });
            const settingsData = await settingsResponse.json();

            if (settingsResponse.ok && settingsData?.success) {
              setAutoSequenceValues({
                sno: settingsData.settings?.next_sno_value ?? "",
                ano: settingsData.settings?.next_ano_value ?? "",
              });
              setFormValues((current) => ({
                ...current,
                sno: settingsData.settings?.next_sno_value ?? "",
                ano: settingsData.settings?.next_ano_value ?? "",
              }));
            }
          }

          return data;
        },
        {
          loading: isEditMode ? "Updating customer details..." : "Saving customer details...",
          success: (data) => data?.message ?? "Customer saved successfully.",
          error: (error) =>
            error.message || "Something went wrong while submitting the customer form.",
          successOptions: { autoClose: 2400 },
          errorOptions: { autoClose: 3200 },
        },
      );
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Something went wrong while submitting the customer form.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormReset = () => {
    resetFormState(
      isEditMode
        ? initialSnapshot
        : {
            ...initialFormValues,
            sno: autoSequenceValues.sno,
            ano: autoSequenceValues.ano,
          },
      isEditMode ? initialEntries : [],
      isEditMode ? "Customer form reset to the last saved values." : "Fill the customer card and add at least one transaction row.",
    );
    notify.action(isEditMode ? "Customer form restored to the saved values." : "Customer form cleared.");
  };

  const isDraftReady = Number.isFinite(Number.parseFloat(draft.amount)) && Number.parseFloat(draft.amount) > 0 && Boolean(formValues.date);

  return (
    <section className={styles.page}>
      {isInitialLoading ? (
        <article className={styles.loadingCard}>
          <div className={styles.loadingSpinner} />
          <p className={styles.loadingText}>Loading customer details...</p>
        </article>
      ) : (
        <form className={`${styles.formCard} ${styles.parentCard}`} key={formResetKey} noValidate onSubmit={handleSubmit}>
          <div className={styles.headerActions}>
            <Link className="listButton" href="/dashboard/customers/list">
              <ListIcon />
              <span>List</span>
            </Link>
            <BackButton className="backButton" fallbackHref={isEditMode ? "/dashboard/customers/list" : "/dashboard"}>
              <BackIcon />
              <span>Back</span>
            </BackButton>
          </div>

          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h2>Customer Card</h2>
            </div>

            <div className={styles.grid}>
              <label className={styles.field}>
                <Label>SNO</Label>
                <input name="sno" onChange={handleChange} type="text" value={formValues.sno} />
              </label>
              <label className={styles.field}>
                <Label>ANO</Label>
                <input name="ano" onChange={handleChange} type="text" value={formValues.ano} />
              </label>
              <label className={`${styles.field} ${styles.fieldRequired}`}>
                <Label required>Date</Label>
                <input aria-invalid={Boolean(errors.date)} name="date" onChange={handleChange} type="date" value={formValues.date} />
                {errors.date ? <small className={styles.errorText}>{errors.date}</small> : null}
              </label>
              <label className={`${styles.field} ${styles.fieldRequired}`}>
                <Label required>Customer Name</Label>
                <input aria-invalid={Boolean(errors.full_name)} name="full_name" onChange={handleChange} type="text" value={formValues.full_name} />
                {errors.full_name ? <small className={styles.errorText}>{errors.full_name}</small> : null}
              </label>
              <label className={`${styles.field} ${styles.fieldRequired}`}>
                <Label required>Guardian Name</Label>
                <input
                  aria-invalid={Boolean(errors.father_or_husband_name)}
                  name="father_or_husband_name"
                  onChange={handleChange}
                  type="text"
                  value={formValues.father_or_husband_name}
                />
                {errors.father_or_husband_name ? <small className={styles.errorText}>{errors.father_or_husband_name}</small> : null}
              </label>
              <label className={`${styles.field} ${styles.fieldRequired}`}>
                <Label required>Phone Number</Label>
                <input
                  aria-invalid={Boolean(errors.mobile_number)}
                  inputMode="numeric"
                  maxLength={10}
                  name="mobile_number"
                  onChange={handleChange}
                  pattern="[0-9]{10}"
                  type="tel"
                  value={formValues.mobile_number}
                />
                {errors.mobile_number ? <small className={styles.errorText}>{errors.mobile_number}</small> : <small className={styles.hint}>Enter a valid 10-digit mobile number.</small>}
              </label>
              <label className={`${styles.field} ${styles.fieldWide} ${styles.fieldRequired}`}>
                <Label required>Address</Label>
                <textarea aria-invalid={Boolean(errors.address)} name="address" onChange={handleChange} rows={4} value={formValues.address} />
                {errors.address ? <small className={styles.errorText}>{errors.address}</small> : <small className={styles.hint}>Add the full address for the customer record.</small>}
              </label>
            </div>
          </div>

          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h2>Transaction Card</h2>
            </div>

            <div className={styles.grid}>
              <label className={`${styles.field} ${styles.fieldRequired}`}>
                <Label required>Amount</Label>
                <input aria-invalid={Boolean(errors.draft_amount)} name="amount" onChange={handleDraftChange} step="0.01" type="number" value={draft.amount} />
                {errors.draft_amount ? <small className={styles.errorText}>{errors.draft_amount}</small> : null}
              </label>
              <label className={`${styles.field}`}>
                <Label>Date</Label>
                <input disabled readOnly type="date" value={formValues.date} />
              </label>
              <label className={styles.field}>
                <Label>Interest Amount</Label>
                <input disabled readOnly type="text" value={`Rs. ${getInterest(draft.amount)}`} />
              </label>
              <label className={styles.field}>
                <Label>Tenure</Label>
                <input disabled readOnly type="text" value="12 months" />
              </label>
            </div>

            <div className={styles.transactionActionRow}>
              <button className={styles.primaryButton} disabled={isSubmitting || !isDraftReady} onClick={handleAddEntry} type="button">
                {editingEntryId ? "Update Entry" : "Add"}
              </button>
              {editingEntryId ? (
                <button className={styles.secondaryButton} disabled={isSubmitting} onClick={handleCancelEntryEdit} type="button">
                  Cancel Edit
                </button>
              ) : null}
            </div>

            {errors.entries ? <small className={styles.errorText}>{errors.entries}</small> : null}

            <div className={styles.transactionTableWrap}>
              {entries.length ? (
                <table className={styles.transactionTable}>
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Amount</th>
                      <th>Date</th>
                      <th>Interest</th>
                      <th>Tenure</th>
                      <th className={styles.centerHeader}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry, index) => (
                      <tr key={entry.id}>
                        <td>{index + 1}</td>
                        <td>{`Rs. ${formatMoney(entry.amount)}`}</td>
                        <td>{entry.date}</td>
                        <td>{`Rs. ${formatMoney(entry.monthly_interest)}`}</td>
                        <td>{`${entry.tenure_months || TENURE_MONTHS} months`}</td>
                        <td className={styles.actionCell}>
                          <div className={styles.actionGroup}>
                            <button
                              className={`${styles.iconButton} ${styles.editButton}`}
                              onClick={() => handleEditEntry(entry)}
                              type="button"
                            >
                              <EditIcon />
                            </button>
                            <button className={`${styles.iconButton} ${styles.deleteButton}`} onClick={() => handleDeleteEntry(entry.id)} type="button">
                              <DeleteIcon />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className={styles.emptyTableText}>No rows yet. Add amount and date to show the table.</p>
              )}
            </div>
          </div>

          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h2>Jewel Details</h2>
            </div>

            <div className={styles.grid}>
              <label className={styles.field}>
                <Label>Item Type</Label>
                <MultiSelectAutocomplete
                  options={itemTypeOptions.filter(Boolean)}
                  value={getSelectedItemTypes()}
                  onChange={(newValue) => {
                    setFormValues((c) => ({ ...c, item_type: newValue.join(", ") }));
                    clearError("item_type");
                  }}
                  placeholder="Add item type"
                />
              </label>
              <label className={styles.field}>
                <Label>Metal Type</Label>
                <select name="metal_type" onChange={handleChange} value={formValues.metal_type}>
                  {metalTypeOptions.map((option) => (
                    <option key={option || "blank"} value={option}>
                      {option ? option[0].toUpperCase() + option.slice(1) : "Choose metal type"}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                <Label>Purity / Karat</Label>
                <input name="purity_or_karat" onChange={handleChange} type="text" value={formValues.purity_or_karat} />
              </label>
              <label className={styles.field}>
                <Label>Weight (grams)</Label>
                <input aria-invalid={Boolean(errors.weight_grams)} name="weight_grams" onChange={handleChange} step="0.001" type="number" value={formValues.weight_grams} />
                {errors.weight_grams ? <small className={styles.errorText}>{errors.weight_grams}</small> : null}
              </label>
              <label className={styles.field}>
                <Label>No. of Stones</Label>
                <input aria-invalid={Boolean(errors.number_of_stones)} min="0" name="number_of_stones" onChange={handleChange} step="1" type="number" value={formValues.number_of_stones} />
                {errors.number_of_stones ? <small className={styles.errorText}>{errors.number_of_stones}</small> : null}
              </label>
              <label className={styles.field}>
                <Label>Jewelry Photo</Label>
                <input accept=".jpg,.jpeg,.png,.webp" aria-invalid={Boolean(errors.jewelry_photo)} name="jewelry_photo" onChange={handleFileChange} type="file" />
                {errors.jewelry_photo ? <small className={styles.errorText}>{errors.jewelry_photo}</small> : null}
              </label>
              <label className={`${styles.field} ${styles.fieldWide}`}>
                <Label>Remark</Label>
                <textarea name="remarks" onChange={handleChange} rows={4} value={formValues.remarks} />
              </label>
            </div>
          </div>

          <div className={`${styles.status} ${status === "success" ? styles.statusSuccess : status === "error" ? styles.statusError : ""}`}>
            {message}
          </div>

          <div className={styles.actions}>
            <SaveButton loading={isSubmitting} type="submit">
              {isSubmitting ? (isEditMode ? "Updating..." : "Saving...") : isEditMode ? "Update Customer" : "Save Customer"}
            </SaveButton>
            <ResetButton disabled={isSubmitting} onClick={handleFormReset}>
              Reset
            </ResetButton>
          </div>
        </form>
      )}
    </section>
  );
}
