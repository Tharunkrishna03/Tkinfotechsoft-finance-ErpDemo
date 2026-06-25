"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useState } from "react";
import { getDashboardMarketData } from "./market-data";
import styles from "./dashboard.module.css";

const AUTO_ROTATE_MS = 4500;
const REFRESH_MS = 300000;

async function requestMarketData(refresh = false) {
  return getDashboardMarketData(refresh).catch(() => null);
}

function formatPrice(value, currencyCode) {
  if (!Number.isFinite(value)) {
    return "--";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}

function formatChange(value) {
  if (!Number.isFinite(value)) {
    return "No change data";
  }

  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function formatShortTime(value) {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getBounds(points) {
  if (!points.length) {
    return {
      high: null,
      low: null,
    };
  }

  const values = points.map((point) => point.value);

  return {
    high: Math.max(...values),
    low: Math.min(...values),
  };
}

function getSparklinePath(points, width, height) {
  if (!points.length) {
    return "";
  }

  if (points.length === 1) {
    const centerY = height / 2;
    return `M 0 ${centerY} L ${width} ${centerY}`;
  }

  const values = points.map((point) => point.value);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = maximum - minimum || 1;

  return points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - ((point.value - minimum) / range) * height;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

function Sparkline({ item }) {
  const validPoints = item.history.filter((point) => Number.isFinite(point.value));
  const path = getSparklinePath(validPoints, 260, 92);
  const positive = Number.isFinite(item.changePercent) ? item.changePercent >= 0 : true;

  return (
    <svg
      aria-hidden="true"
      className={styles.marketSparkline}
      preserveAspectRatio="none"
      viewBox="0 0 260 92"
    >
      <defs>
        <linearGradient id={`marketGradient-${item.slug}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={positive ? "#3ea977" : "#d36a5c"} stopOpacity="0.22" />
          <stop offset="100%" stopColor={positive ? "#3ea977" : "#d36a5c"} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path className={styles.marketGridLine} d="M 0 18 L 260 18" />
      <path className={styles.marketGridLine} d="M 0 46 L 260 46" />
      <path className={styles.marketGridLine} d="M 0 74 L 260 74" />
      {path ? (
        <>
          <path
            className={styles.marketArea}
            d={`${path} L 260 92 L 0 92 Z`}
            fill={`url(#marketGradient-${item.slug})`}
          />
          <path
            className={`${styles.marketLine} ${positive ? styles.marketLineUp : styles.marketLineDown}`}
            d={path}
          />
        </>
      ) : null}
    </svg>
  );
}

function MarketSlide({ item }) {
  const bounds = getBounds(item.history);
  const positive = Number.isFinite(item.changePercent) ? item.changePercent >= 0 : null;

  return (
    <article className={styles.marketSlide} aria-label={item.label}>
      <div className={styles.marketFrame}>
        <div className={styles.marketTopRow}>
          <div>
            <span className={styles.marketPill}>{item.label}</span>
            <p className={styles.marketUnit}>{item.unitLabel}</p>
          </div>

          <div
            className={`${styles.marketChange} ${
              positive === null
                ? styles.marketChangeNeutral
                : positive
                  ? styles.marketChangeUp
                  : styles.marketChangeDown
            }`}
          >
            {formatChange(item.changePercent)}
          </div>
        </div>

        {item.status === "ready" ? (
          <>
            <div className={styles.marketBody}>
              <div className={styles.marketValueBlock}>
                <strong className={styles.marketValue}>
                  {formatPrice(item.price, item.currencyCode)}
                </strong>
                <span className={styles.marketValueCaption}>Current tracked price</span>
              </div>

              <Sparkline item={item} />
            </div>

            <div className={styles.marketStats}>
              <div className={styles.marketStat}>
                <span>Range</span>
                <strong>{item.rangeLabel}</strong>
              </div>
              <div className={styles.marketStat}>
                <span>High</span>
                <strong>{formatPrice(bounds.high, item.currencyCode)}</strong>
              </div>
              <div className={styles.marketStat}>
                <span>Low</span>
                <strong>{formatPrice(bounds.low, item.currencyCode)}</strong>
              </div>
              <div className={styles.marketStat}>
                <span>Updated</span>
                <strong>{formatShortTime(item.updatedAt)}</strong>
              </div>
            </div>
          </>
        ) : (
          <div className={styles.marketUnavailable}>
            <strong>{item.label} feed unavailable</strong>
            <p>{item.note}</p>
          </div>
        )}

        <p className={styles.marketNote}>{item.note}</p>
      </div>
    </article>
  );
}

export default function MarketCarousel({ initialData }) {
  const [data, setData] = useState(initialData);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(!initialData);

  const items = data?.items ?? [];

  function applyNextData(nextData) {
    if (!nextData) {
      return;
    }

    setData(nextData);
    setActiveIndex((current) => {
      if (!nextData.items?.length) {
        return 0;
      }

      return Math.min(current, nextData.items.length - 1);
    });
  }

  const rotateSlides = useEffectEvent(() => {
    setActiveIndex((current) => {
      if (!items.length) {
        return 0;
      }

      return (current + 1) % items.length;
    });
  });

  const refreshMarketsInEffect = useEffectEvent(async () => {
    setIsRefreshing(true);

    try {
      applyNextData(await requestMarketData());
    } finally {
      setIsRefreshing(false);
    }
  });

  async function handleManualRefresh() {
    setIsRefreshing(true);

    try {
      applyNextData(await requestMarketData(true));
    } finally {
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    if (data) {
      return;
    }

    refreshMarketsInEffect();
  }, [data]);

  useEffect(() => {
    if (!items.length) {
      return undefined;
    }

    const rotateTimer = window.setInterval(() => {
      rotateSlides();
    }, AUTO_ROTATE_MS);

    return () => {
      window.clearInterval(rotateTimer);
    };
  }, [items.length]);

  useEffect(() => {
    const refreshTimer = window.setInterval(() => {
      refreshMarketsInEffect();
    }, REFRESH_MS);

    return () => {
      window.clearInterval(refreshTimer);
    };
  }, []);

  if (!items.length) {
    return null;
  }

  return (
    <section className={styles.marketSection}>
      <article className={styles.marketCard}>
        <div className={styles.marketHeader}>
          <div>
            <p className={styles.marketEyebrow}>India rate board</p>
            <h1 className={styles.marketTitle}>Live Market Snapshot</h1>
            <p className={styles.marketSummary}>
              Gold, silver, diamond, and platinum in one rotating card with a compact trend graph.
            </p>
          </div>

          <button
            className={styles.marketRefreshButton}
            disabled={isRefreshing}
            onClick={handleManualRefresh}
            type="button"
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className={styles.marketViewport}>
          <div
            className={styles.marketTrack}
            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
          >
            {items.map((item) => (
              <MarketSlide item={item} key={item.slug} />
            ))}
          </div>
        </div>

        <div className={styles.marketCarouselFooter}>
          <div className={styles.marketDots} role="tablist" aria-label="Market slides">
            {items.map((item, index) => (
              <button
                aria-label={`Show ${item.label}`}
                aria-pressed={index === activeIndex}
                className={`${styles.marketDot} ${index === activeIndex ? styles.marketDotActive : ""}`}
                key={item.slug}
                onClick={() => setActiveIndex(index)}
                type="button"
              />
            ))}
          </div>

          <div className={styles.marketAttribution}>
            <Link href={data.attribution.metals} rel="noreferrer" target="_blank">
              {data.attribution.metalsLabel}
            </Link>
            <span>/</span>
            <Link href={data.attribution.diamond} rel="noreferrer" target="_blank">
              OpenFacet
            </Link>
            <span>/</span>
            <Link href={data.attribution.fx} rel="noreferrer" target="_blank">
              Exchange Rate API
            </Link>
          </div>
        </div>
      </article>
    </section>
  );
}
