"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Tilt, TiltContent } from "@/components/animate-ui/primitives/effects/tilt";
import { MagicCard } from "@/components/magicui/magic-card";

import styles from "./page.module.css";
import { notify } from "./notifier";
import { Button, Input, SubmitButton } from "../components";

const initialForm = {
  username: "",
  password: "",
};

const CONFETTI_PIECES = [
  { x: 4, hue: 207, delay: "0s", duration: "1.7s", drift: -160, rotate: "-22deg", spin: 560 },
  { x: 9, hue: 42, delay: "0.04s", duration: "1.8s", drift: -132, rotate: "16deg", spin: -520 },
  { x: 14, hue: 332, delay: "0.08s", duration: "1.66s", drift: -120, rotate: "-14deg", spin: 540 },
  { x: 19, hue: 188, delay: "0.02s", duration: "1.74s", drift: -88, rotate: "18deg", spin: -500 },
  { x: 24, hue: 216, delay: "0.1s", duration: "1.86s", drift: -64, rotate: "-18deg", spin: 620 },
  { x: 29, hue: 24, delay: "0.06s", duration: "1.68s", drift: -40, rotate: "14deg", spin: -560 },
  { x: 34, hue: 145, delay: "0.12s", duration: "1.84s", drift: -18, rotate: "-10deg", spin: 520 },
  { x: 39, hue: 280, delay: "0.03s", duration: "1.78s", drift: 12, rotate: "20deg", spin: -600 },
  { x: 44, hue: 12, delay: "0.14s", duration: "1.72s", drift: 28, rotate: "-16deg", spin: 540 },
  { x: 49, hue: 193, delay: "0.07s", duration: "1.82s", drift: 52, rotate: "12deg", spin: -520 },
  { x: 54, hue: 48, delay: "0.11s", duration: "1.76s", drift: 76, rotate: "-20deg", spin: 610 },
  { x: 59, hue: 340, delay: "0.09s", duration: "1.88s", drift: 102, rotate: "18deg", spin: -540 },
  { x: 64, hue: 202, delay: "0.05s", duration: "1.7s", drift: 126, rotate: "-12deg", spin: 500 },
  { x: 69, hue: 156, delay: "0.13s", duration: "1.8s", drift: 148, rotate: "16deg", spin: -620 },
  { x: 74, hue: 33, delay: "0.01s", duration: "1.74s", drift: 166, rotate: "-18deg", spin: 560 },
  { x: 79, hue: 220, delay: "0.15s", duration: "1.9s", drift: 188, rotate: "14deg", spin: -520 },
  { x: 84, hue: 10, delay: "0.02s", duration: "1.6s", drift: 210, rotate: "-24deg", spin: 580 },
  { x: 89, hue: 180, delay: "0.12s", duration: "1.75s", drift: 240, rotate: "18deg", spin: -510 },
  { x: 94, hue: 290, delay: "0.06s", duration: "1.81s", drift: 260, rotate: "-16deg", spin: 610 },
  { x: 12, hue: 80, delay: "0.07s", duration: "1.85s", drift: -100, rotate: "22deg", spin: -590 },
  { x: 26, hue: 350, delay: "0.16s", duration: "1.65s", drift: -75, rotate: "-18deg", spin: 520 },
  { x: 42, hue: 60, delay: "0.03s", duration: "1.78s", drift: 45, rotate: "20deg", spin: -610 },
  { x: 58, hue: 200, delay: "0.14s", duration: "1.82s", drift: 80, rotate: "-14deg", spin: 530 },
  { x: 72, hue: 310, delay: "0.09s", duration: "1.72s", drift: 140, rotate: "16deg", spin: -550 },
  { x: 86, hue: 140, delay: "0.04s", duration: "1.76s", drift: 180, rotate: "-20deg", spin: 570 },
  { x: 6, hue: 0, delay: "0.18s", duration: "1.9s", drift: -150, rotate: "12deg", spin: -500 },
  { x: 18, hue: 270, delay: "0.11s", duration: "1.68s", drift: -95, rotate: "-24deg", spin: 600 },
  { x: 38, hue: 160, delay: "0.05s", duration: "1.84s", drift: 15, rotate: "14deg", spin: -540 },
  { x: 62, hue: 30, delay: "0.13s", duration: "1.77s", drift: 95, rotate: "-18deg", spin: 560 },
  { x: 82, hue: 250, delay: "0.08s", duration: "1.8s", drift: 200, rotate: "22deg", spin: -580 }
];

function ConfettiLayer({ show, styles }) {
  if (!show) return null;
  return (
    <div aria-hidden="true" className={styles.confettiLayer}>
      {CONFETTI_PIECES.map((piece, index) => (
        <span
          key={`${piece.x}-${piece.hue}-${index}`}
          className={styles.confettiPiece}
          style={{
            "--piece-x": piece.x,
            "--piece-hue": piece.hue,
            "--piece-delay": piece.delay,
            "--piece-duration": piece.duration,
            "--piece-drift": piece.drift,
            "--piece-rotate": piece.rotate,
            "--piece-spin": piece.spin,
          }}
        />
      ))}
    </div>
  );
}

function LoginLogo({ styles }) {
  return (
    <div className={styles.imageColumn}>
      <div className={styles.logoTilt}>
        <TiltContent>
          <MagicCard className={styles.imageCard}>
            <span
              aria-hidden="true"
              className={`${styles.borderBeam} ${styles.imageBeam}`}
            />

            <div className={styles.logoWrapper}>
              <Image
                src="/logo.png"
                alt="Logo"
                fill
                sizes="260px"
                className={styles.logoImage}
                priority
              />
            </div>
          </MagicCard>
        </TiltContent>
      </div>
    </div>
  );
}

function LoginForm({
  formData,
  errors,
  isSubmitting,
  handleChange,
  handleSubmit,
  handleCancel,
  styles,
}) {
  return (
    <div className={styles.formColumn}>
      <div className={styles.formCard}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>Jewel Finance</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <Input
            label="Username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="Enter your username"
            error={errors.username}
            disabled={isSubmitting}
            className={styles.inputField}
          />

          <Input
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Enter your password"
            error={errors.password}
            disabled={isSubmitting}
            className={styles.inputField}
          />

          <div className={styles.actions}>
            <SubmitButton disabled={isSubmitting} loading={isSubmitting}>
              {isSubmitting ? "Checking..." : "Login"}
            </SubmitButton>

            <Button type="button" variant="secondary" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [formData, setFormData] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [demoAccounts, setDemoAccounts] = useState([]);
  const [demoStatus, setDemoStatus] = useState("loading");
  const [showConfetti, setShowConfetti] = useState(false);
  const successTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        window.clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadDemoAccounts = async () => {
      try {
        const response = await fetch("/api/login/demo/", {
          method: "GET",
          cache: "no-store",
        });
        const data = await response.json();

        if (!isMounted) return;

        if (response.ok && data.success && Array.isArray(data.accounts)) {
          setDemoAccounts(data.accounts);
          setDemoStatus(data.accounts.length ? "ready" : "empty");
        }
      } catch {
        if (isMounted) {
          setDemoAccounts([]);
          setDemoStatus("unavailable");
        }
      }
    };

    loadDemoAccounts();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));

    setErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  };

  const handleCancel = () => {
    if (successTimeoutRef.current) {
      window.clearTimeout(successTimeoutRef.current);
    }

    setFormData(initialForm);
    setErrors({});
    setShowConfetti(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = {};
    if (!formData.username.trim()) nextErrors.username = "Username is required.";
    if (!formData.password.trim()) nextErrors.password = "Password is required.";

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      notify.error("Please fill the required fields.", {
        toastId: "login-validation",
      });
      setShowConfetti(false);
      return;
    }

    setIsSubmitting(true);
    setShowConfetti(false);

    try {
      const response = await fetch("/api/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      const nextMessage =
        data.message ?? (data.success ? "Login successful." : "Unable to log in.");

      if (data.success) {
        notify.success(nextMessage, {
          toastId: "login-status",
        });
      } else {
        notify.error(nextMessage, {
          toastId: "login-status",
        });
      }

      if (data.success) {
        setShowConfetti(true);

        successTimeoutRef.current = window.setTimeout(() => {
          startTransition(() => {
            router.replace("/dashboard");
            router.refresh();
          });
        }, 950);
      }
    } catch {
      notify.error("Something went wrong while contacting the server.", {
        toastId: "login-status",
      });
      setShowConfetti(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Tilt className={styles.page} maxTilt={35} perspective={1300}>
      <ConfettiLayer show={showConfetti} styles={styles} />

      <div className={styles.loginContainer}>
        {/* IMAGE SECTION ONLY HAS TILT + BORDER BEAM */}
        <LoginLogo styles={styles} />

        {/* FORM SECTION (NO TILT, NO BEAM) */}
        <LoginForm
          formData={formData}
          errors={errors}
          isSubmitting={isSubmitting}
          handleChange={handleChange}
          handleSubmit={handleSubmit}
          handleCancel={handleCancel}
          styles={styles}
        />
      </div>
    </Tilt>
  );
}
