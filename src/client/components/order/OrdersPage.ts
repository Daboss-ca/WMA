import { getCurrentUser } from "../../state/sessionManager.js";
import { renderToPayTab } from "./ToPayTab.js";
import { renderToShipTab } from "./ToShipTab.js";
import { renderToReceiveTab } from "./ToReceiveTab.js";
import { renderToReviewTab } from "./ToReviewTab.js";

export type OrderStatusTab = "all" | "pay" | "ship" | "receive" | "review";

export interface OrderItem {
  id: string;
  date: string;
  status: "pay" | "ship" | "receive" | "review";
  statusLabel: string;
  title: string;
  category: string;
  price: number;
  imageUrl?: string;
  dimensions: string;
  paymentMethod?: string;
}

const TABS: { id: OrderStatusTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pay", label: "To pay" },
  { id: "ship", label: "To ship" },
  { id: "receive", label: "To receive" },
  { id: "review", label: "To review" },
];

function escapeHtml(value: string): string {
  if (!value) return "";
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}

// Render function para sa Order Card na tinanggal na ang orderNumber at petsa na lamang ang natira sa header
export function renderOrderCard(order: OrderItem): string {
  const formattedPrice = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(order.price);

  let footerContent = "";
  const isCOD = 
    order.paymentMethod?.toLowerCase() === "cod" || 
    order.paymentMethod?.toLowerCase() === "cash on delivery";

  if (order.status === "pay") {
    if (isCOD) {
      footerContent = `<span class="order-payment-method-label" style="font-weight: 600; color: var(--text-muted, #666);">Cash on Delivery</span>`;
    } else {
      footerContent = `<button type="button" class="btn btn--secondary btn--sm" data-order-action="pay">Pay now / Upload proof</button>`;
    }
  } else {
    let actionButtonLabel = "View details";
    if (order.status === "ship") actionButtonLabel = "Track crafting";
    else if (order.status === "receive") actionButtonLabel = "Confirm received";
    else if (order.status === "review") actionButtonLabel = "Write review";

    footerContent = `
      <button type="button" class="btn btn--secondary btn--sm" data-order-action="${order.status}">
        ${actionButtonLabel}
      </button>
    `;
  }

  return `
    <article class="order-card" data-order-id="${order.id}">
      <header class="order-card__header">
        <div>
          <span class="order-card__date">${escapeHtml(order.date)}</span>
        </div>
        <span class="order-badge order-badge--${order.status}">
          ${escapeHtml(order.statusLabel)}
        </span>
      </header>

      <div class="order-card__body">
        <div class="order-card__media">
          ${
            order.imageUrl
              ? `<img src="${order.imageUrl}" alt="${escapeHtml(order.title)}" />`
              : `<div class="order-card__placeholder">${escapeHtml(order.category)}</div>`
          }
        </div>
        <div class="order-card__info">
          <h3 class="order-card__title">${escapeHtml(order.title)}</h3>
          <p class="order-card__meta">${escapeHtml(order.dimensions)}</p>
          <p class="order-card__price">${formattedPrice}</p>
        </div>
      </div>

      <footer class="order-card__footer">
        ${footerContent}
      </footer>
    </article>
  `;
}

function mapDatabaseStatus(dbStatus: string): "pay" | "ship" | "receive" | "review" {
  const statusLower = (dbStatus || "").toLowerCase();
  if (statusLower.includes("pay") || statusLower.includes("pending")) return "pay";
  if (statusLower.includes("ship") || statusLower.includes("craft")) return "ship";
  if (statusLower.includes("receive") || statusLower.includes("deliver")) return "receive";
  if (statusLower.includes("review") || statusLower.includes("complete")) return "review";
  return "pay";
}

export function createOrdersPage(initialTab: OrderStatusTab = "all"): HTMLElement {
  const user = getCurrentUser();
  const page = document.createElement("main");
  page.className = "site-main orders-page";
  page.id = "orders-page";

  if (!user) return page;

  let activeTab: OrderStatusTab = initialTab;
  let orders: OrderItem[] = [];
  let isLoading = true;
  let paymentProofModal: HTMLElement | null = null;

  const showToast = (message: string, type: "success" | "error" = "success") => {
    let toast = document.getElementById("payment-proof-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "payment-proof-toast";
      toast.className = "payment-proof-toast";
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.remove("is-error", "is-success");
    toast.classList.add(type === "success" ? "is-success" : "is-error");
    toast.classList.add("is-visible");

    window.clearTimeout((toast as any).__timeoutId);
    (toast as any).__timeoutId = window.setTimeout(() => {
      toast?.classList.remove("is-visible");
    }, 3200);
  };

  const closePaymentProofModal = () => {
    if (!paymentProofModal) return;
    paymentProofModal.classList.remove("modal--open");
    paymentProofModal.setAttribute("aria-hidden", "true");
  };

  const ensurePaymentProofModal = () => {
    if (paymentProofModal && paymentProofModal.isConnected) return paymentProofModal;

    const modal = document.createElement("div");
    modal.id = "payment-proof-modal";
    modal.className = "modal";
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = `
      <div class="modal__overlay" data-close-proof-modal="true"></div>
      <div class="modal__panel payment-proof-modal" role="dialog" aria-modal="true" aria-labelledby="payment-proof-modal-title">
        <div class="payment-proof-modal__header">
          <div>
            <p class="payment-proof-modal__eyebrow">GCash payment</p>
            <h2 id="payment-proof-modal-title" class="payment-proof-modal__title">Upload proof of payment</h2>
          </div>
          <button type="button" class="modal__close payment-proof-modal__close" aria-label="Close upload proof modal">×</button>
        </div>

        <div class="modal__body">
          <div class="payment-proof-modal__content">
            <div class="payment-proof-modal__info">
              <div class="payment-proof-modal__qr-box" aria-label="GCash QR code placeholder">
                <div class="payment-proof-modal__qr-pattern">
                  <span></span><span></span><span></span><span></span><span></span><span></span>
                  <span></span><span></span><span></span><span></span><span></span><span></span>
                  <span></span><span></span><span></span><span></span><span></span><span></span>
                  <span></span><span></span><span></span><span></span><span></span><span></span>
                  <span></span><span></span><span></span><span></span><span></span><span></span>
                  <span></span><span></span><span></span><span></span><span></span><span></span>
                </div>
              </div>

              <div class="payment-proof-modal__details">
                <p>Send your payment to</p>
                <strong>0917 123 4567</strong>
                <span>GCash number</span>
              </div>
            </div>

            <form class="payment-proof-form">
              <div class="payment-proof-form__field">
                <label for="payment-proof-reference">Reference Number</label>
                <input id="payment-proof-reference" name="reference_number" inputmode="numeric" maxlength="13" placeholder="Enter 13-digit reference number" aria-describedby="payment-proof-reference-help" />
                <small id="payment-proof-reference-help">Example: 1234567890123</small>
              </div>

              <div class="payment-proof-form__upload">
                <label class="payment-proof-upload" for="payment-proof-upload-input">
                  <input id="payment-proof-upload-input" type="file" accept="image/*" />
                  <div class="payment-proof-upload__icon" aria-hidden="true">⇪</div>
                  <div>
                    <strong>Upload proof of payment</strong>
                    <span>PNG, JPG, or WEBP up to 10MB</span>
                  </div>
                </label>
                <div class="payment-proof-upload__preview" aria-live="polite"></div>
              </div>

              <div class="payment-proof-form__message" role="alert" aria-live="polite"></div>

              <div class="payment-proof-form__actions">
                <button type="button" class="btn btn--secondary payment-proof-modal__cancel">Cancel</button>
                <button type="submit" class="btn btn--primary">Submit proof</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    const closeButton = modal.querySelector<HTMLButtonElement>(".payment-proof-modal__close");
    closeButton?.addEventListener("click", closePaymentProofModal);
    modal.querySelector("[data-close-proof-modal]")?.addEventListener("click", closePaymentProofModal);
    modal.querySelector<HTMLButtonElement>(".payment-proof-modal__cancel")?.addEventListener("click", closePaymentProofModal);

    const form = modal.querySelector<HTMLFormElement>(".payment-proof-form");
    const referenceInput = modal.querySelector<HTMLInputElement>("#payment-proof-reference");
    const uploadInput = modal.querySelector<HTMLInputElement>("#payment-proof-upload-input");
    const preview = modal.querySelector<HTMLDivElement>(".payment-proof-upload__preview");
    const message = modal.querySelector<HTMLDivElement>(".payment-proof-form__message");

    referenceInput?.addEventListener("input", () => {
      if (!referenceInput.value) return;
      referenceInput.value = referenceInput.value.replace(/\D/g, "").slice(0, 13);
    });

    uploadInput?.addEventListener("change", () => {
      const file = uploadInput.files?.[0];
      if (!preview) return;
      preview.innerHTML = "";

      if (!file) return;

      const fileName = document.createElement("span");
      fileName.className = "payment-proof-upload__filename";
      fileName.textContent = file.name;
      preview.appendChild(fileName);

      const objectUrl = URL.createObjectURL(file);
      const img = document.createElement("img");
      img.src = objectUrl;
      img.alt = "Payment proof preview";
      preview.appendChild(img);
    });

    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!form || !referenceInput || !uploadInput || !message) return;

      const orderId = modal.dataset.orderId || "";
      const refValue = referenceInput.value.trim();
      const selectedFile = uploadInput.files?.[0];

      if (!orderId) {
        message.textContent = "Order is missing. Please try again.";
        message.classList.add("is-error");
        return;
      }

      if (!/^\d{13}$/.test(refValue)) {
        message.textContent = "Reference Number must be exactly 13 digits.";
        message.classList.add("is-error");
        referenceInput.focus();
        return;
      }

      if (!selectedFile) {
        message.textContent = "Please upload a proof of payment image.";
        message.classList.add("is-error");
        return;
      }

      const submitButton = form.querySelector<HTMLButtonElement>('button[type="submit"]');
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Submitting...";
      }

      message.textContent = "";
      message.classList.remove("is-error", "is-success");

      try {
        const proofUrl = URL.createObjectURL(selectedFile);
        const response = await fetch("http://localhost:5000/api/orders/payment-proof", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order_id: orderId,
            user_id: user.id,
            proof_url: proofUrl,
            reference_number: refValue,
          }),
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(result?.error || "Unable to submit proof of payment.");
        }

        message.textContent = "Payment proof submitted successfully.";
        message.classList.add("is-success");
        showToast("Payment proof submitted and is pending review.", "success");

        setTimeout(() => {
          closePaymentProofModal();
          fetchUserOrders();
        }, 300);
      } catch (error) {
        const messageText = error instanceof Error ? error.message : "Something went wrong while submitting proof.";
        message.textContent = messageText;
        message.classList.add("is-error");
        showToast(messageText, "error");
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = "Submit proof";
        }
      }
    });

    document.body.appendChild(modal);
    paymentProofModal = modal;
    return modal;
  };

  const openPaymentProofModal = (order: OrderItem) => {
    const modal = ensurePaymentProofModal();
    const referenceInput = modal.querySelector<HTMLInputElement>("#payment-proof-reference");
    const uploadInput = modal.querySelector<HTMLInputElement>("#payment-proof-upload-input");
    const preview = modal.querySelector<HTMLDivElement>(".payment-proof-upload__preview");
    const title = modal.querySelector<HTMLElement>("#payment-proof-modal-title");
    const message = modal.querySelector<HTMLDivElement>(".payment-proof-form__message");

    modal.dataset.orderId = order.id;
    if (title) title.textContent = `Proof for ${order.title}`;
    if (referenceInput) referenceInput.value = "";
    if (uploadInput) uploadInput.value = "";
    if (preview) preview.innerHTML = "";
    if (message) {
      message.textContent = "";
      message.classList.remove("is-error", "is-success");
    }

    modal.classList.add("modal--open");
    modal.setAttribute("aria-hidden", "false");
    referenceInput?.focus();
  };

  const fetchUserOrders = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/orders?user_id=${user.id}`);
      const data = await response.json();

      if (response.ok && Array.isArray(data)) {
        orders = data.map((item: any) => {
          const firstOrderItem = item.order_items?.[0];
          const product = firstOrderItem?.products;
          const quantity = firstOrderItem?.quantity || 1;

          return {
            id: item.id,
            date: new Date(item.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }),
            status: mapDatabaseStatus(item.status),
            statusLabel: item.status || "Pending",
            title: product?.title || `Item ${firstOrderItem?.product_id || ""}`,
            category: product?.category || "Category",
            price: item.total_amount || 0,
            imageUrl: product?.image_url,
            dimensions: product?.dimensions ? `Dimensions: ${product.dimensions} (Qty: ${quantity})` : `Qty: ${quantity}`,
            paymentMethod: item.payment_method || item.paymentMethod || "gcash",
          };
        });
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      isLoading = false;
      renderContent();
    }
  };

  const renderContent = () => {
    const tabsHtml = TABS.map(
      (tab) => `
        <button 
          type="button" 
          class="orders-tab ${tab.id === activeTab ? "is-active" : ""}" 
          data-tab="${tab.id}"
          aria-pressed="${tab.id === activeTab}"
        >
          ${tab.label}
        </button>`
    ).join("");

    let listHtml = "";
    if (isLoading) {
      listHtml = `<div class="orders-loading"><p>Loading your orders...</p></div>`;
    } else {
      switch (activeTab) {
        case "pay":
          listHtml = renderToPayTab(orders, renderOrderCard);
          break;
        case "ship":
          listHtml = renderToShipTab(orders, renderOrderCard);
          break;
        case "receive":
          listHtml = renderToReceiveTab(orders, renderOrderCard);
          break;
        case "review":
          listHtml = renderToReviewTab(orders, renderOrderCard);
          break;
        case "all":
        default:
          if (orders.length === 0) {
            listHtml = `
              <div class="orders-empty">
                <p class="orders-empty__title">No orders found</p>
                <p class="orders-empty__desc">You don't have any orders yet.</p>
                <a href="#catalog" class="btn btn--outline orders-empty__cta" data-action="go-catalog">Browse Catalog</a>
              </div>
            `;
          } else {
            listHtml = `<div class="orders-list">${orders.map(renderOrderCard).join("")}</div>`;
          }
          break;
      }
    }

    page.innerHTML = `
      <div class="wrap orders-page__inner">
        <div class="orders-header">
          <button type="button" class="btn-back" id="back-to-dashboard-btn">
            ← Back to Dashboard
          </button>
          <h1 class="orders-title">Your Orders</h1>
        </div>

        <nav class="orders-tabs" role="tablist" aria-label="Order status tabs">
          ${tabsHtml}
        </nav>

        <section class="orders-content">
          ${listHtml}
        </section>
      </div>
    `;

    page.querySelector("#back-to-dashboard-btn")?.addEventListener("click", () => {
      document.dispatchEvent(new CustomEvent("wma:close-orders"));
    });

    page.querySelectorAll<HTMLButtonElement>("[data-tab]").forEach((tabBtn) => {
      tabBtn.addEventListener("click", () => {
        const selected = tabBtn.dataset.tab as OrderStatusTab;
        if (selected && selected !== activeTab) {
          activeTab = selected;
          renderContent();
        }
      });
    });

    page.querySelectorAll<HTMLButtonElement>("[data-order-action='pay']").forEach((actionButton) => {
      const orderId = actionButton.closest(".order-card")?.getAttribute("data-order-id");
      const currentOrder = orders.find((order) => order.id === orderId);
      if (!currentOrder) return;

      actionButton.addEventListener("click", () => {
        openPaymentProofModal(currentOrder);
      });
    });

    page.querySelector('[data-action="go-catalog"]')?.addEventListener("click", () => {
      document.dispatchEvent(new CustomEvent("wma:close-orders"));
    });
  };

  renderContent();
  fetchUserOrders();

  return page;
}