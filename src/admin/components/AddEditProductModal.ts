import { PRODUCT_CATEGORIES, type DimensionUnit, type Product, type ProductCategory, type ProductInput } from "../types/admin.js";
import { escapeHtml } from "../utils/dom.js";
import { readFileAsDataUrl } from "../utils/format.js";
import { openModal } from "./Modal.js";
import { productSchema } from "../../client/validation/schemas.js";

const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;
const FORM_ID = "admin-product-form";

type FieldKey = "category" | "price" | "title" | "description" | "dimensions" | "image";
const FIELD_KEYS: FieldKey[] = ["category", "price", "title", "description", "dimensions", "image"];

type FormErrors = Partial<Record<FieldKey, string>>;
type FormField = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export interface ProductModalOptions {
  product?: Product;
  /** Throw to keep the modal open and show the message inline. */
  onSubmit: (input: ProductInput) => void;
}

export function openProductModal({ product, onSubmit }: ProductModalOptions): void {
  const isEdit = Boolean(product);
  const modal = openModal({
    title: isEdit ? "Edit item" : "Post new item",
    eyebrow: isEdit ? "Catalog" : "New listing",
    size: "lg",
  });

  let imageUrl = product?.imageUrl ?? "";
  let uploadName = product && product.imageUrl.startsWith("data:") ? "Current image" : "";

  modal.body.innerHTML = `
    <form id="${FORM_ID}" class="admin-form" novalidate>
      <div class="admin-form__grid">
        <div class="admin-field">
          <label for="pm-category">Item type</label>
          <select id="pm-category" name="category">
            ${PRODUCT_CATEGORIES.map((category) => `<option value="${category}">${category}</option>`).join("")}
          </select>
          <p class="admin-field__error" data-error="category"></p>
        </div>

        <div class="admin-field">
          <label for="pm-price">Price (PHP)</label>
          <input id="pm-price" name="price" type="number" min="0" step="1" inputmode="numeric" placeholder="0" />
          <p class="admin-field__error" data-error="price"></p>
        </div>

        <div class="admin-field admin-field--full">
          <label for="pm-title">Title</label>
          <input id="pm-title" name="title" type="text" maxlength="120" placeholder="e.g. Heritage Newspaper Kiosk" />
          <p class="admin-field__error" data-error="title"></p>
        </div>

        <div class="admin-field admin-field--full">
          <label for="pm-description">Description</label>
          <textarea id="pm-description" name="description" rows="4" maxlength="600" placeholder="Materials, finish, joinery…"></textarea>
          <p class="admin-field__error" data-error="description"></p>
        </div>

        <fieldset class="admin-field admin-field--full">
          <legend>Dimensions</legend>
          <div class="admin-dimensions">
            <input name="width" type="number" min="0" step="0.1" placeholder="Width" aria-label="Width" />
            <span aria-hidden="true">×</span>
            <input name="height" type="number" min="0" step="0.1" placeholder="Height" aria-label="Height" />
            <span aria-hidden="true">×</span>
            <input name="depth" type="number" min="0" step="0.1" placeholder="Depth" aria-label="Depth" />
            <select name="unit" aria-label="Unit">
              <option value="cm">cm</option>
              <option value="in">in</option>
            </select>
          </div>
          <p class="admin-field__error" data-error="dimensions"></p>
        </fieldset>

        <div class="admin-field admin-field--full">
          <label for="pm-image">Image <span class="admin-hint">(URL or upload, optional)</span></label>
          <div class="admin-media">
            <div class="admin-media__preview" data-preview></div>
            <div class="admin-media__controls">
              <input id="pm-image" name="imageUrl" type="url" placeholder="https://…" />
              <div class="admin-media__actions">
                <label class="btn btn--ghost admin-upload">
                  Upload image
                  <input type="file" accept="image/*" hidden data-file />
                </label>
                <button type="button" class="btn btn--ghost" data-clear-image>Remove image</button>
              </div>
              <p class="admin-hint" data-upload-note></p>
              <p class="admin-field__error" data-error="image"></p>
            </div>
          </div>
        </div>
      </div>
      <p class="admin-form__error" role="alert" data-form-error hidden></p>
    </form>`;

  modal.footer.innerHTML = `
    <button type="button" class="btn btn--ghost" data-modal-dismiss>Cancel</button>
    <button type="submit" form="${FORM_ID}" class="btn btn--primary">${isEdit ? "Save changes" : "Publish item"}</button>`;

  const form = modal.body.querySelector<HTMLFormElement>(`#${FORM_ID}`) as HTMLFormElement;
  const urlInput = form.elements.namedItem("imageUrl") as HTMLInputElement;
  const preview = form.querySelector<HTMLElement>("[data-preview]") as HTMLElement;
  const uploadNote = form.querySelector<HTMLElement>("[data-upload-note]") as HTMLElement;
  const formError = form.querySelector<HTMLElement>("[data-form-error]") as HTMLElement;

  const getField = (name: string): FormField | null => form.elements.namedItem(name) as FormField | null;
  const setValue = (name: string, value: string): void => {
    const field = getField(name);
    if (field) field.value = value;
  };
  const getValue = (name: string): string => getField(name)?.value.trim() ?? "";

  if (product) {
    setValue("category", product.category);
    setValue("price", String(product.price));
    setValue("title", product.title);
    setValue("description", product.description);
    setValue("width", String(product.dimensions.width));
    setValue("height", String(product.dimensions.height));
    setValue("depth", String(product.dimensions.depth));
    setValue("unit", product.dimensions.unit);
    if (!product.imageUrl.startsWith("data:")) urlInput.value = product.imageUrl;
  } else {
    setValue("unit", "cm");
  }

  const setError = (key: FieldKey, message: string): void => {
    const node = form.querySelector<HTMLElement>(`[data-error="${key}"]`);
    if (!node) return;
    node.textContent = message;
    node.closest(".admin-field")?.classList.toggle("is-invalid", message !== "");
  };

  const renderPreview = (): void => {
    preview.innerHTML = imageUrl
      ? `<img src="${escapeHtml(imageUrl)}" alt="Preview of the item image" />`
      : `<span class="admin-hint">No image</span>`;

    preview.querySelector("img")?.addEventListener("error", () => {
      preview.innerHTML = `<span class="admin-hint">Image could not load</span>`;
    });
    uploadNote.textContent = uploadName ? `Uploaded: ${uploadName} (stored locally)` : "";
  };

  renderPreview();

  urlInput.addEventListener("input", () => {
    imageUrl = urlInput.value.trim();
    uploadName = "";
    setError("image", "");
    renderPreview();
  });

  form.querySelector<HTMLInputElement>("[data-file]")?.addEventListener("change", async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("image", "Please choose an image file.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("image", "Image must be 1.5 MB or smaller.");
      return;
    }

    try {
      imageUrl = await readFileAsDataUrl(file);
      uploadName = file.name;
      urlInput.value = "";
      setError("image", "");
      renderPreview();
    } catch {
      setError("image", "Could not read that file.");
    }
  });

  form.querySelector("[data-clear-image]")?.addEventListener("click", () => {
    imageUrl = "";
    uploadName = "";
    urlInput.value = "";
    setError("image", "");
    renderPreview();
  });

  const validate = (): { input?: ProductInput; errors: FormErrors } => {
    const errors: FormErrors = {};
    const title = getValue("title");
    const description = getValue("description");
    const category = getValue("category") as ProductCategory;
    const price = Number(getValue("price"));
    const dimensions = {
      width: Number(getValue("width")),
      height: Number(getValue("height")),
      depth: Number(getValue("depth")),
      unit: getValue("unit") as DimensionUnit,
    };

    const parsed = productSchema.safeParse({ title, description, category, price, dimensions, imageUrl });
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] === "imageUrl" ? "image" : issue.path[0] as FieldKey;
        if (FIELD_KEYS.includes(key) && !errors[key]) errors[key] = issue.message;
      }
      if (!errors.dimensions && parsed.error.issues.some((issue) => issue.path[0] === "dimensions")) {
        errors.dimensions = "Width, height and depth are required and must be greater than 0.";
      }
      return { errors };
    }

    return {
      errors,
      input: parsed.data,
    };
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    formError.hidden = true;

    const { input, errors } = validate();
    FIELD_KEYS.forEach((key) => setError(key, errors[key] ?? ""));

    if (!input) {
      form.querySelector<HTMLElement>(".is-invalid input, .is-invalid select, .is-invalid textarea")?.focus();
      return;
    }

    try {
      onSubmit(input);
      modal.close();
    } catch (error) {
      formError.textContent = error instanceof Error ? error.message : "Something went wrong. Please try again.";
      formError.hidden = false;
    }
  });
}
