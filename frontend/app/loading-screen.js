"use client";

import styles from "./loading-screen.module.css";

export default function LoadingScreen({ label = "Loading..." }) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.loader} aria-hidden="true">
        <div className={styles.loaderSquare}></div>
        <div className={styles.loaderSquare}></div>
        <div className={styles.loaderSquare}></div>
        <div className={styles.loaderSquare}></div>
        <div className={styles.loaderSquare}></div>
        <div className={styles.loaderSquare}></div>
        <div className={styles.loaderSquare}></div>
      </div>
      {label ? <p className={styles.label}>{label}</p> : null}
    </div>
  );
}
