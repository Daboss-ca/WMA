import type { AdminStats, TrendPoint } from "../types/admin.js";
import { escapeHtml, fromHTML } from "../utils/dom.js";
import { formatCurrency } from "../utils/format.js";
import { icon, type IconName } from "./icons.js";

interface Delta {
  direction: "up" | "down" | "flat";
  percent: number;
}

/** Compares the last three days of revenue against the three days before them. */
export function computeTrend(points: TrendPoint[]): Delta {
  const total = (slice: TrendPoint[]): number => slice.reduce((acc, point) => acc + point.value, 0);
  const recent = total(points.slice(-3));
  const previous = total(points.slice(-6, -3));

  if (previous === 0) {
    return recent > 0 ? { direction: "up", percent: 100 } : { direction: "flat", percent: 0 };
  }

  const percent = Math.round(((recent - previous) / previous) * 100);
  if (percent === 0) return { direction: "flat", percent: 0 };
  return { direction: percent > 0 ? "up" : "down", percent: Math.abs(percent) };
}

function renderDelta({ direction, percent }: Delta): string {
  if (direction === "flat") return `<span class="admin-delta admin-delta--flat">No change</span>`;
  const arrow = direction === "up" ? "▲" : "▼";
  return `<span class="admin-delta admin-delta--${direction}">${arrow} ${percent}% <span class="admin-delta__note">vs prior 3 days</span></span>`;
}

function renderSparkline(values: number[]): string {
  const width = 120;
  const height = 40;
  const pad = 3;
  const max = Math.max(...values, 1);
  const step = values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0;

  const points = values.map((value, index) => ({
    x: pad + index * step,
    y: height - pad - (value / max) * (height - pad * 2),
  }));

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L${width - pad} ${height} L${pad} ${height} Z`;

  return `
    <svg class="admin-stat__spark" viewBox="0 0 ${width} ${height}" aria-hidden="true" focusable="false">
      <path d="${area}" fill="currentColor" opacity="0.1"></path>
      <path d="${line}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"></path>
    </svg>`;
}

interface StatCard {
  label: string;
  value: string;
  hint: string;
  icon: IconName;
  tone: "accent" | "neutral" | "warning" | "success";
  footer?: string;
  extra?: string;
}

export function createStatCards(stats: AdminStats): HTMLElement {
  const trend = computeTrend(stats.revenueTrend);

  const cards: StatCard[] = [
    {
      label: "Total revenue",
      value: formatCurrency(stats.totalRevenue),
      hint: "Paid & fulfilled orders",
      icon: "orders",
      tone: "accent",
      footer: renderDelta(trend),
      extra: renderSparkline(stats.revenueTrend.map((point) => point.value)),
    },
    { label: "Total products", value: String(stats.totalProducts), hint: "Live catalog items", icon: "products", tone: "neutral" },
    { label: "Pending orders", value: String(stats.pendingOrders), hint: "Awaiting payment approval", icon: "orders", tone: "warning" },
    {
      label: "Completed shipments",
      value: String(stats.completedShipments),
      hint: `of ${stats.totalOrders} total orders`,
      icon: "check",
      tone: "success",
    },
  ];

  return fromHTML<HTMLElement>(`
    <section class="admin-stats" aria-label="Key metrics">
      ${cards
        .map(
          (card) => `
        <article class="admin-stat admin-stat--${card.tone}">
          <div class="admin-stat__top">
            <span class="admin-stat__label">${escapeHtml(card.label)}</span>
            <span class="admin-stat__icon">${icon(card.icon, 18)}</span>
          </div>
          <p class="admin-stat__value">${escapeHtml(card.value)}</p>
          <div class="admin-stat__footer">
            <span class="admin-stat__hint">${escapeHtml(card.hint)}</span>
            ${card.footer ?? ""}
          </div>
          ${card.extra ?? ""}
        </article>`
        )
        .join("")}
    </section>`);
}