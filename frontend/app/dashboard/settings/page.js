"use client";

import { useEffect, useState } from "react";
import { SaveButton } from "../../../components";
import { notify } from "../../notifier";
import styles from "./settings.module.css";
import { getCsrfToken } from "../../csrf";

const initialValues = {
  sno_format: "",
  ano_format: "",
  next_sno_number: 1,
  next_ano_number: 1,
  next_sno_value: "",
  next_ano_value: "",
};

function SettingsGearIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="m12 3 1.2 2.5 2.8.4-2 2 .5 2.8L12 9.4l-2.5 1.3.5-2.8-2-2 2.8-.4L12 3Z" />
      <circle cx="12" cy="12" r="2.8" />
      <path d="M4.8 13.2v-2.4l2-.7a5.8 5.8 0 0 1 .7-1.7L6.7 6l1.7-1.7 2.4.8a5.8 5.8 0 0 1 1.7-.7l.7-2h2.4l.7 2a5.8 5.8 0 0 1 1.7.7l2.4-.8L17.3 6l-.8 2.4a5.8 5.8 0 0 1 .7 1.7l2 .7v2.4l-2 .7a5.8 5.8 0 0 1-.7 1.7l.8 2.4-1.7 1.7-2.4-.8a5.8 5.8 0 0 1-1.7.7l-.7 2h-2.4l-.7-2a5.8 5.8 0 0 1-1.7-.7l-2.4.8L6.7 18l.8-2.4a5.8 5.8 0 0 1-.7-1.7l-2-.7Z" />
    </svg>
  );
}

export default function DashboardSettingsPage() {
  const [values, setValues] = useState(initialValues);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("Loading settings...");
  const [isSaving, setIsSaving] = useState(false);
  const [theme, setTheme] = useState("default");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setTheme(localStorage.getItem("app-theme") || "default");
    }
  }, []);

  useEffect(() => {
    fetch("/api/settings/", { cache: "no-store" })
      .then((response) => response.json().then((data) => ({ ok: response.ok, data })))
      .then(({ ok, data }) => {
        if (!ok || !data?.success) {
          throw new Error(data?.message ?? "Unable to load settings.");
        }

        setValues(data.settings);
        setStatus("success");
        setMessage("Settings loaded successfully.");
      })
      .catch((error) => {
        setStatus("error");
        setMessage(error.message || "Unable to load settings.");
      });
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (name === "theme") {
      setTheme(value);
      localStorage.setItem("app-theme", value);
      document.documentElement.dataset.theme = value;
      return;
    }
    setValues((current) => ({
      ...current,
      [name]: name.startsWith("next_") ? Number(value) : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      await notify.promise(
        async () => {
          const response = await fetch("/api/settings/", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "X-CSRFToken": getCsrfToken(),
            },
            body: JSON.stringify({
              sno_format: values.sno_format,
              ano_format: values.ano_format,
              next_sno_number: Number(values.next_sno_number),
              next_ano_number: Number(values.next_ano_number),
            }),
          });
          const data = await response.json();

          if (!response.ok || !data?.success) {
            throw new Error(data?.message ?? "Unable to save settings.");
          }

          setValues(data.settings);
          setStatus("success");
          setMessage(data.message ?? "Settings updated successfully.");
          return data;
        },
        {
          loading: "Saving settings...",
          success: (data) => data?.message ?? "Settings updated successfully.",
          error: (error) => error.message || "Unable to save settings.",
          successOptions: { autoClose: 2400 },
          errorOptions: { autoClose: 3200 },
        },
      );
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Unable to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <span aria-hidden="true" className={styles.settingsIcon}>
          <SettingsGearIcon />
        </span>

        <div className={styles.header}>
          <p className={styles.eyebrow}>Settings</p>
          <h1 className={styles.title}>Workspace Settings</h1>
          <p className={styles.text}>
            Change the SNO and ANO format and decide the next starting number used for auto generation.
          </p>
        </div>

        <div className={styles.grid}>
          <label className={styles.field}>
            <span>SNO Format</span>
            <input name="sno_format" onChange={handleChange} type="text" value={values.sno_format} />
          </label>
          <label className={styles.field}>
            <span>ANO Format</span>
            <input name="ano_format" onChange={handleChange} type="text" value={values.ano_format} />
          </label>
          <label className={styles.field}>
            <span>Next SNO Number</span>
            <input min="1" name="next_sno_number" onChange={handleChange} type="number" value={values.next_sno_number} />
          </label>
          <label className={styles.field}>
            <span>Next ANO Number</span>
            <input min="1" name="next_ano_number" onChange={handleChange} type="number" value={values.next_ano_number} />
          </label>
        </div>

        <div className={styles.header} style={{ marginTop: '24px' }}>
          <p className={styles.eyebrow}>Appearance</p>
          <h1 className={styles.title}>Workspace Theme</h1>
          <p className={styles.text}>
            Customize the colors of your dashboard experience.
          </p>
        </div>

        <div className={styles.grid}>
          <label className={styles.field}>
            <span>Color Profile</span>
            <select name="theme" onChange={handleChange} value={theme}>
              <option value="default">Premium Blue (Default)</option>
              <option value="babypink">Baby Pink</option>
            </select>
          </label>
        </div>

        <div className={styles.preview}>
          <strong>Next Preview</strong>
          <span>{`SNO: ${values.next_sno_value || "-"}`}</span>
          <span>{`ANO: ${values.next_ano_value || "-"}`}</span>
        </div>

        <div className={styles.actions}>
          <SaveButton loading={isSaving} type="submit">
            {isSaving ? "Saving..." : "Save Settings"}
          </SaveButton>
        </div>
      </form>

      <div className={`${styles.status} ${status === "success" ? styles.success : status === "error" ? styles.error : ""}`}>
        {message}
      </div>
    </section>
  );
}
