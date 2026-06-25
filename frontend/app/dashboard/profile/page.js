"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { notify } from "../../notifier";
import styles from "./profile.module.css";
import { getCsrfToken } from "../../csrf";

const PROFILE_UPDATED_EVENT = "dashboard-profile-updated";

const initialPasswordForm = {
  current_password: "",
  new_password: "",
  confirm_password: "",
};

function BackIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="m15 18-6-6 6-6" />
      <path d="M9 12h10" />
    </svg>
  );
}

export default function DashboardProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [profile, setProfile] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [passwordForm, setPasswordForm] = useState(initialPasswordForm);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const response = await fetch("/api/profile/", {
          cache: "no-store",
        });
        const data = await response.json();

        if (!active || !response.ok || !data.success || !data.profile) {
          throw new Error(data.message || "Unable to load profile.");
        }

        setProfile(data.profile);
        setDisplayName(data.profile.display_name || "");
      } catch (error) {
        notify.error(error.message || "Unable to load profile.");
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedPhoto) {
      setPreviewUrl("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(selectedPhoto);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedPhoto]);

  function emitProfileUpdated(nextProfile) {
    setProfile(nextProfile);
    window.dispatchEvent(new CustomEvent(PROFILE_UPDATED_EVENT, { detail: nextProfile }));
  }

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/dashboard");
  }

  function handleNameCancel() {
    setDisplayName(profile?.display_name || "");
  }

  async function handleNameSubmit(event) {
    event.preventDefault();

    if (!displayName.trim()) {
      notify.error("Name is required.");
      return;
    }

    setIsSavingName(true);

    try {
      const response = await fetch("/api/profile/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCsrfToken(),
        },
        body: JSON.stringify({
          display_name: displayName.trim(),
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success || !data.profile) {
        throw new Error(data.message || "Unable to update name.");
      }

      emitProfileUpdated(data.profile);
      setDisplayName(data.profile.display_name || "");
      notify.success(data.message || "Name updated successfully.");
    } catch (error) {
      notify.error(error.message || "Unable to update name.");
    } finally {
      setIsSavingName(false);
    }
  }

  function handlePasswordChange(event) {
    const { name, value } = event.target;
    setPasswordForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();

    setIsChangingPassword(true);

    try {
      const response = await fetch("/api/profile/password/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCsrfToken(),
        },
        body: JSON.stringify(passwordForm),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to change password.");
      }

      setPasswordForm(initialPasswordForm);
      notify.success(data.message || "Password changed successfully.");
    } catch (error) {
      notify.error(error.message || "Unable to change password.");
    } finally {
      setIsChangingPassword(false);
    }
  }

  function handlePhotoSelect(event) {
    const nextFile = event.target.files?.[0] ?? null;
    setSelectedPhoto(nextFile);
  }

  function handlePasswordCancel() {
    setPasswordForm(initialPasswordForm);
  }

  function handlePhotoCancel() {
    setSelectedPhoto(null);
    setPreviewUrl("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handlePhotoSubmit(event) {
    event.preventDefault();

    if (!selectedPhoto) {
      notify.error("Choose a profile picture first.");
      return;
    }

    setIsUploadingPhoto(true);

    try {
      const formData = new FormData();
      formData.append("photo", selectedPhoto);

      const response = await fetch("/api/profile/photo/", {
        method: "POST",
        headers: {
          "X-CSRFToken": getCsrfToken(),
        },
        body: formData,
      });
      const data = await response.json();

      if (!response.ok || !data.success || !data.profile) {
        throw new Error(data.message || "Unable to upload profile picture.");
      }

      emitProfileUpdated(data.profile);
      setSelectedPhoto(null);
      setPreviewUrl("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      notify.success(data.message || "Profile picture updated successfully.");
    } catch (error) {
      notify.error(error.message || "Unable to upload profile picture.");
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  const currentInitial = (profile?.avatar_initial || displayName.slice(0, 1) || "T").toUpperCase();
  const currentPhoto = previewUrl || profile?.photo_url || "";

  return (
    <section className={styles.page}>
      <article className={styles.parentCard}>
        <div className={styles.headerRow}>
          <div className={styles.header}>
            <p className={styles.eyebrow}>Profile</p>
            <h1 className={styles.title}>Account Settings</h1>
          </div>

          <button className="backButton" onClick={handleBack} type="button">
            <BackIcon />
            <span>Back</span>
          </button>
        </div>

        <div className={styles.cardGrid}>
          <section className={styles.childCard}>
            <div className={styles.cardHead}>
          
              <h2 className={styles.cardTitle}>Update Name</h2>
            </div>

            <form className={styles.form} onSubmit={handleNameSubmit}>
              <label className={styles.field}>
                <span className={styles.label}>Display Name</span>
                <input
                  className={styles.input}
                  disabled={isLoading || isSavingName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Enter your display name"
                  type="text"
                  value={displayName}
                />
              </label>

              <div className={styles.actionRow}>
                <button className={styles.primaryButton} disabled={isLoading || isSavingName} type="submit">
                  {isSavingName ? "Updating..." : "Update"}
                </button>
                <button
                  className={styles.secondaryButton}
                  disabled={isLoading || isSavingName}
                  onClick={handleNameCancel}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>

          <section className={styles.childCard}>
            <div className={styles.cardHead}>
              
              <h2 className={styles.cardTitle}>Change Password</h2>
            </div>

            <form className={styles.form} onSubmit={handlePasswordSubmit}>
              <label className={styles.field}>
                <span className={styles.label}>Current Password</span>
                <input
                  className={styles.input}
                  disabled={isChangingPassword}
                  name="current_password"
                  onChange={handlePasswordChange}
                  placeholder="Enter current password"
                  type="password"
                  value={passwordForm.current_password}
                />
              </label>

              <label className={styles.field}>
                <span className={styles.label}>New Password</span>
                <input
                  className={styles.input}
                  disabled={isChangingPassword}
                  name="new_password"
                  onChange={handlePasswordChange}
                  placeholder="Enter new password"
                  type="password"
                  value={passwordForm.new_password}
                />
              </label>

              <label className={styles.field}>
                <span className={styles.label}>Confirm Password</span>
                <input
                  className={styles.input}
                  disabled={isChangingPassword}
                  name="confirm_password"
                  onChange={handlePasswordChange}
                  placeholder="Confirm new password"
                  type="password"
                  value={passwordForm.confirm_password}
                />
              </label>

              <div className={styles.actionRow}>
                <button className={styles.primaryButton} disabled={isChangingPassword} type="submit">
                  {isChangingPassword ? "Changing..." : "Change Password"}
                </button>
                <button
                  className={styles.secondaryButton}
                  disabled={isChangingPassword}
                  onClick={handlePasswordCancel}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>

          <section className={styles.childCard}>
            <div className={styles.cardHead}>
              
              <h2 className={styles.cardTitle}>Profile Picture</h2>
            </div>

            <form className={styles.form} onSubmit={handlePhotoSubmit}>
              <div className={styles.photoPreviewWrap}>
                <div className={styles.photoPreview}>
                  {currentPhoto ? (
                    <img alt={`${displayName || "Profile"} preview`} className={styles.photoImage} src={currentPhoto} loading="lazy" />
                  ) : (
                    <span className={styles.photoInitial}>{currentInitial}</span>
                  )}
                </div>
              </div>

              <label className={styles.field}>
                <span className={styles.label}>Choose Picture</span>
                <input
                  accept=".jpg,.jpeg,.png,.webp"
                  className={styles.input}
                  disabled={isUploadingPhoto}
                  onChange={handlePhotoSelect}
                  ref={fileInputRef}
                  type="file"
                />
              </label>

              <p className={styles.helperText}>
                {selectedPhoto
                  ? `Selected file: ${selectedPhoto.name}`
                  : "Upload a JPG, PNG, or WEBP image under 1 MB."}
              </p>

              <div className={styles.actionRow}>
                <button className={styles.primaryButton} disabled={isUploadingPhoto || !selectedPhoto} type="submit">
                  {isUploadingPhoto ? "Uploading..." : "Update Picture"}
                </button>
                <button
                  className={styles.secondaryButton}
                  disabled={isUploadingPhoto}
                  onClick={handlePhotoCancel}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        </div>
      </article>
    </section>
  );
}
