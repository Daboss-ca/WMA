import { AUTH_CHANGED_EVENT, getCurrentUser, isAdminSession, LOGOUT_EVENT, SESSION_CHANGED_EVENT } from "../../state/sessionManager.js";
import { buildApiUrl } from "../../config/api.js";
import { normalizeImagePath } from "../../utils/imagePaths.js";
import { subscribeToOrdersRealtime } from "../../config/supabase.js";
import { renderToPayTab } from "./ToPayTab.js";
import { renderToShipTab } from "./ToShipTab.js";
import { renderToReceiveTab } from "./ToReceiveTab.js";
import { renderToReviewTab } from "./ToReviewTab.js";

export type OrderStatusTab = "all" | "pay" | "ship" | "receive" | "review";

export interface OrderLineItem {
  productId: string;
  title: string;
  category: string;
  unitPrice: number;
  quantity: number;
  imageUrl?: string;
  dimensions: string;
}

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
  items: OrderLineItem[];
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

  const itemRows = (order.items.length ? order.items : [{
    productId: "",
    title: order.title,
    category: order.category,
    unitPrice: order.price,
    quantity: 1,
    imageUrl: order.imageUrl,
    dimensions: order.dimensions,
  }]).map((item) => {
    const unitPrice = new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 0,
    }).format(item.unitPrice);

    return `
      <div class="order-card__body order-card__item-row">
        <div class="order-card__media">
          ${item.imageUrl
            ? `<img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.title)}" />`
            : `<div class="order-card__placeholder">${escapeHtml(item.category)}</div>`}
        </div>
        <div class="order-card__info">
          <h3 class="order-card__title">${escapeHtml(item.title)}</h3>
          <p class="order-card__meta">${escapeHtml(item.dimensions)}</p>
          <p class="order-card__meta"><strong>QTY:</strong> ${escapeHtml(String(item.quantity))}</p>
          <p class="order-card__price">${unitPrice} each</p>
        </div>
      </div>`;
  }).join("");

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

      ${itemRows}

      <p class="order-card__price order-card__total">Order total: ${formattedPrice}</p>

      <footer class="order-card__footer">
        ${footerContent}
      </footer>
    </article>
  `;
}

function mapDatabaseStatus(dbStatus: string): "pay" | "ship" | "receive" | "review" {
  const statusLower = (dbStatus || "").trim().toLowerCase();
  if (!statusLower) return "pay";

  if (statusLower.includes("cancel")) return "review";
  if (statusLower.includes("pending") || statusLower.includes("pay")) return "pay";

  if (
    statusLower.includes("shipping") ||
    statusLower.includes("shipped") ||
    statusLower.includes("deliver") ||
    statusLower.includes("delivery") ||
    statusLower.includes("receive")
  ) {
    return "receive";
  }

  if (statusLower.includes("to ship") || statusLower.includes("ship")) {
    return "ship";
  }

  if (statusLower.includes("review") || statusLower.includes("complete") || statusLower.includes("delivered")) {
    return "review";
  }

  return "pay";
}

export function buildOrdersEndpoint(userId?: string | null): string {
  const normalizedUserId = (userId ?? "").trim();

  if (!normalizedUserId) {
    return buildApiUrl("/orders");
  }

  if (normalizedUserId === "admin-wma" || isAdminSession()) {
    return buildApiUrl("/admin/orders");
  }

  return `${buildApiUrl("/orders")}?user_id=${encodeURIComponent(normalizedUserId)}`;
}

export function createOrdersPage(initialTab: OrderStatusTab = "all"): HTMLElement {
  const page = document.createElement("main");
  page.className = "site-main orders-page";
  page.id = "orders-page";

  const getActiveUser = (): { id: string } | null => {
    const user = getCurrentUser();
    return user && user.id ? user : null;
  };

  const user = getActiveUser();
  if (!user) {
    page.innerHTML = `
      <div class="wrap orders-page__inner">
        <div class="orders-header">
          <h1 class="orders-title">Your Orders</h1>
        </div>
        <section class="orders-content">
          <div class="orders-empty">
            <p class="orders-empty__title">Please sign in</p>
            <p class="orders-empty__desc">Sign in to view your order history.</p>
          </div>
        </section>
      </div>
    `;
    return page;
  }

  let activeTab: OrderStatusTab = initialTab;
  let orders: OrderItem[] = [];
  let isLoading = true;
  let paymentProofModal: HTMLElement | null = null;
  let currentUserId = user.id;
  let latestOrderFetch = 0;
  let realtimeRefreshTimer: ReturnType<typeof setTimeout> | null = null;

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
        message.textContent = "The reference number must contain exactly 13 digits.";
        message.classList.add("is-error");
        referenceInput.focus();
        return;
      }

      if (!selectedFile) {
        message.textContent = "Upload an image of your payment proof.";
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
        const response = await fetch(buildApiUrl("/orders/payment-proof"), {
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
          throw new Error(result?.error || "We could not submit your payment proof. Please try again later.");
        }

        message.textContent = "Payment proof submitted successfully.";
        message.classList.add("is-success");
        showToast("Payment proof submitted successfully. It is awaiting review.", "success");

        setTimeout(() => {
          closePaymentProofModal();
        }, 300);
      } catch (error) {
        const messageText = error instanceof Error ? error.message : "We could not submit your payment proof. Please try again later.";
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

  const confirmReceivedOrder = async (order: OrderItem) => {
    const activeUser = getCurrentUser();
    if (!activeUser?.id) {
      showToast("Please sign in to confirm receipt.", "error");
      return;
    }

    try {
      const response = await fetch(`${buildApiUrl("/orders")}/${encodeURIComponent(order.id)}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "completed",
          user_id: activeUser.id,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
      throw new Error(payload?.error || "We could not confirm receipt. Please try again later.");
      }

      await fetchUserOrders(activeUser.id, true);
      showToast("Order marked as completed successfully.", "success");
    } catch (error) {
      console.error("Unable to confirm received order:", error);
      showToast(error instanceof Error ? error.message : "We could not confirm receipt. Please try again later.", "error");
    }
  };

  const resetOrdersState = (loading = false) => {
    orders = [];
    isLoading = loading;
    renderContent();
  };

  const fetchUserOrders = async (requestedUserId: string = currentUserId, silent = false) => {
    const activeUser = getActiveUser();
    if (!activeUser) {
      orders = [];
      isLoading = false;
      renderContent();
      return;
    }

    currentUserId = activeUser.id;
    const targetUserId = requestedUserId || activeUser.id;

    if (activeUser.id !== targetUserId) {
      return;
    }

    const fetchId = ++latestOrderFetch;

    if (!silent) {
      isLoading = true;
      renderContent();
    }

    try {
      const response = await fetch(buildOrdersEndpoint(targetUserId));
      const data = await response.json();

      const latestUser = getActiveUser();
      if (fetchId !== latestOrderFetch || !latestUser || latestUser.id !== targetUserId) {
        return;
      }

      if (!response.ok) {
        throw new Error(data?.error || "We could not retrieve your orders. Please try again later.");
      }

      const fetchedOrders: OrderItem[] = Array.isArray(data)
        ? data.map((item: any) => {
            const lineItems = (Array.isArray(item.order_items) ? item.order_items : []).map((orderLine: any) => {
              const product = Array.isArray(orderLine.products) ? orderLine.products[0] : orderLine.products;
              const rawPrice = Number(orderLine.price ?? orderLine.unit_price ?? product?.price ?? 0);
              const rawQuantity = Number(orderLine.quantity ?? 1);
              const dimensions = product?.dimensions;
              const dimensionsText = typeof dimensions === "string"
                ? dimensions
                : dimensions && typeof dimensions === "object"
                  ? `${dimensions.width ?? 0} × ${dimensions.height ?? 0} × ${dimensions.depth ?? 0} ${dimensions.unit ?? "cm"}`
                  : "";

              return {
                productId: String(orderLine.product_id ?? product?.id ?? ""),
                title: String(product?.title ?? orderLine.title ?? "Custom item"),
                category: String(product?.category ?? "Category"),
                unitPrice: Number.isFinite(rawPrice) ? rawPrice : 0,
                quantity: Number.isFinite(rawQuantity) && rawQuantity > 0 ? rawQuantity : 1,
                imageUrl: product?.image_url
                  ? normalizeImagePath(String(product.image_url))
                  : undefined,
                dimensions: dimensionsText ? `Dimensions: ${dimensionsText}` : "",
              };
            });
            const firstItem = lineItems[0];

            return {
              id: String(item.id),
              date: new Date(item.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              }),
              status: mapDatabaseStatus(item.status),
              statusLabel: item.status || "Pending",
              title: firstItem?.title || `Order ${String(item.id).slice(-6)}`,
              category: firstItem?.category || "Category",
              price: Number(item.total_amount ?? item.total ?? lineItems.reduce((sum: number, line: any) => sum + line.unitPrice * line.quantity, 0)),
              imageUrl: firstItem?.imageUrl,
              dimensions: firstItem?.dimensions ?? "",
              paymentMethod: item.payment_method || item.paymentMethod || "gcash",
              items: lineItems,
            };
          })
        : [];
      orders = fetchedOrders;
    } catch (error) {
      console.error("Error fetching orders:", error);
      if (fetchId === latestOrderFetch) orders = [];
    } finally {
      const latestUser = getActiveUser();
      if (fetchId === latestOrderFetch && latestUser && latestUser.id === targetUserId) {
        isLoading = false;
        renderContent();
      }
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

    page.querySelectorAll<HTMLButtonElement>("[data-order-action='receive']").forEach((actionButton) => {
      const orderId = actionButton.closest(".order-card")?.getAttribute("data-order-id");
      const currentOrder = orders.find((order) => order.id === orderId);
      if (!currentOrder) return;

      actionButton.addEventListener("click", () => {
        void confirmReceivedOrder(currentOrder);
      });
    });

    page.querySelector('[data-action="go-catalog"]')?.addEventListener("click", () => {
      document.dispatchEvent(new CustomEvent("wma:close-orders"));
    });
  };

  const handleSessionReset = () => {
    latestOrderFetch += 1;
    const activeUser = getActiveUser();
    if (!activeUser) {
      currentUserId = "";
      resetOrdersState(false);
      return;
    }

    currentUserId = activeUser.id;
    resetOrdersState(true);
    fetchUserOrders(activeUser.id, false);
  };

  const handleAuthChanged = (event: Event) => {
    const detail = (event as CustomEvent).detail as { user?: { id?: string } | null; userId?: string | null; reason?: string } | undefined;
    const nextUserId = detail?.userId ?? detail?.user?.id ?? null;

    if (!nextUserId) {
      latestOrderFetch += 1;
      currentUserId = "";
      orders = [];
      isLoading = false;
      renderContent();
      return;
    }

    if (detail?.reason === 'login' || detail?.reason === 'logout') {
      handleSessionReset();
    }
  };

  document.addEventListener(LOGOUT_EVENT, handleAuthChanged);
  document.addEventListener(AUTH_CHANGED_EVENT, handleAuthChanged);
  document.addEventListener("wma:session-cleared", handleSessionReset);
  document.addEventListener(SESSION_CHANGED_EVENT, handleSessionReset);


  renderContent();
  fetchUserOrders(currentUserId, false);

  const stopRealtimeSync = subscribeToOrdersRealtime((payload) => {
    console.log("[OrdersPage] refreshing full order state after payload:", payload);
    if (payload.table !== "orders" || !["INSERT", "UPDATE", "DELETE"].includes(payload.eventType)) return;
    const activeUser = getCurrentUser();
    const targetUserId = activeUser?.id ?? currentUserId;
    if (!targetUserId) return;
    if (realtimeRefreshTimer) clearTimeout(realtimeRefreshTimer);
    realtimeRefreshTimer = setTimeout(() => {
      realtimeRefreshTimer = null;
      void fetchUserOrders(targetUserId, true);
    }, 75);
  });

  const destroy = () => {
    if (realtimeRefreshTimer) {
      clearTimeout(realtimeRefreshTimer);
      realtimeRefreshTimer = null;
    }
    stopRealtimeSync();
    document.removeEventListener(LOGOUT_EVENT, handleAuthChanged);
    document.removeEventListener(AUTH_CHANGED_EVENT, handleAuthChanged);
    document.removeEventListener("wma:session-cleared", handleSessionReset);
    document.removeEventListener(SESSION_CHANGED_EVENT, handleSessionReset);
  };

  (page as HTMLElement & { destroy?: () => void }).destroy = destroy;

  return page;
}
