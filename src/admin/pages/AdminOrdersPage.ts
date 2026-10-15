import { openDeleteModal } from "../components/DeleteModal.js";
import { icon } from "../components/icons.js";
import { openOrderDetailModal } from "../components/OrderDetailModal.js";
import { createOrderTable } from "../components/OrderManagementTable.js";
import { showToast } from "../components/Toast.js";
import { adminStore } from "../services/adminStore.js";
import { ORDER_STATUSES, type AdminPage, type Order, type OrderStatus } from "../types/admin.js";
import { escapeHtml, fromHTML } from "../utils/dom.js";
import { ORDER_STATUS_META } from "../utils/format.js";

type StatusFilter = "all" | OrderStatus;

const matchesSearch = (order: Order, term: string): boolean =>
  [order.reference, order.customer.name, order.customer.email].join(" ").toLowerCase().includes(term);

export function createAdminOrdersPage(): AdminPage {
  let query = "";
  let status: StatusFilter = "all";
  const updatingOrderIds = new Set<string>();

  const element = fromHTML<HTMLElement>(`
    <div class="admin-orders">
      <div class="admin-toolbar">
        <label class="admin-search">
          ${icon("search", 18)}
          <input type="search" placeholder="Search reference, customer or email" aria-label="Search orders" />
        </label>
      </div>
      <div class="admin-segmented admin-segmented--wrap" role="group" aria-label="Filter by status" data-filters></div>
      <p class="admin-meta" data-meta></p>
      <div data-table></div>
    </div>`);

  const searchInput = element.querySelector<HTMLInputElement>('input[type="search"]') as HTMLInputElement;
  const filtersHost = element.querySelector<HTMLElement>("[data-filters]") as HTMLElement;
  const meta = element.querySelector<HTMLElement>("[data-meta]") as HTMLElement;
  const tableHost = element.querySelector<HTMLElement>("[data-table]") as HTMLElement;

  const changeStatus = async (order: Order, next: OrderStatus): Promise<void> => {
    if (updatingOrderIds.has(order.id) || adminStore.getOrder(order.id)?.status === next) return;
    updatingOrderIds.add(order.id);
    render();
    try {
      await adminStore.updateOrderStatus(order.id, next);
      showToast(`Order ${order.reference} status updated to ${ORDER_STATUS_META[next].label}.`, "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not update this order.", "error");
    } finally {
      updatingOrderIds.delete(order.id);
      render();
    }
  };

  const requestStatusChange = (order: Order, next: OrderStatus): void => {
    if (next === "cancelled") {
      openDeleteModal({
        title: "Cancel this order?",
        itemName: `${order.reference} · ${order.customer.name}`,
        description: "The order will be marked as cancelled and removed from revenue.",
        confirmLabel: "Cancel order",
        onConfirm: async () => {
          await changeStatus(order, next);
        },
        onCancel: render,
      });
      return;
    }
    void changeStatus(order, next);
  };

  const viewOrder = (order: Order): void => {
    const fresh = adminStore.getOrder(order.id) ?? order;
    openOrderDetailModal({
      order: fresh,
      onChangeStatus: (next) => requestStatusChange(fresh, next),
    });
  };

  const renderFilters = (orders: Order[]): void => {
    const items: { key: StatusFilter; label: string; count: number }[] = [
      { key: "all", label: "All", count: orders.length },
      ...ORDER_STATUSES.map((s) => ({
        key: s,
        label: ORDER_STATUS_META[s].label,
        count: orders.filter((order) => order.status === s).length,
      })),
    ];

    filtersHost.innerHTML = items
      .map(
        (item) => `
        <button type="button" data-status="${item.key}" class="${item.key === status ? "is-active" : ""}">
          ${escapeHtml(item.label)} <span class="admin-count">${item.count}</span>
        </button>`
      )
      .join("");
  };

  function render(): void {
    const orders = adminStore.listOrders();
    const term = query.trim().toLowerCase();

    const visible = orders.filter(
      (order) => (status === "all" || order.status === status) && (!term || matchesSearch(order, term))
    );

    renderFilters(orders);
    meta.textContent = `Showing ${visible.length} of ${orders.length} orders`;
    tableHost.replaceChildren(
      createOrderTable({
        orders: visible,
        updatingOrderIds,
        onView: viewOrder,
        onStatusChange: requestStatusChange,
      })
    );
  }

  searchInput.addEventListener("input", () => {
    query = searchInput.value;
    render();
  });

  filtersHost.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-status]");
    if (!button) return;
    status = button.dataset.status as StatusFilter;
    render();
  });

  render();
  const unsubscribe = adminStore.subscribe(render);
  const stopRealtimeSync = adminStore.startRealtimeSync();

  return {
    element,
    destroy: () => {
      stopRealtimeSync();
      unsubscribe();
    },
  };
}
