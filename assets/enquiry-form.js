/**
 * <enquiry-form> — custom "Enquire Now" flow (settings.enable_enquiry_mode).
 *
 * Two jobs, both scoped to enquiry mode only (this script is loaded only when
 * enquiry mode is on, so it is fully reversible and never affects the normal
 * add-to-cart flow):
 *
 *   1. Keep the enquiry contact-form's hidden product fields in sync with the
 *      currently selected variant + quantity, so each enquiry carries the exact
 *      product/variant the customer was viewing. Values are read live from the
 *      DOM (nothing hardcoded):
 *        - Current variant id : #product-form-<sectionId> input[name="id"]  (kept updated by product-info.js)
 *        - Variant details     : authoritative #ProductData JSON, or the "variant:changed" event
 *        - Quantity            : #MainProduct-<sectionId> quantity-input input
 *
 *   2. Guarantee the (buttonless) main + sticky product forms can NEVER submit
 *      to /cart/add in enquiry mode. In enquiry mode the add-to-cart button is
 *      removed but the <form> and product-form.js listener remain (kept so the
 *      variant picker keeps working). A document-level capture-phase guard
 *      cancels any submit of those forms before product-form.js can run it —
 *      preventing both an accidental cart add and a null-submitButton crash.
 */
if (!customElements.get("enquiry-form")) {
  customElements.define(
    "enquiry-form",
    class EnquiryForm extends HTMLElement {
      constructor() {
        super();
        // Bind once so add/removeEventListener use a stable reference and the
        // browser de-dupes if connectedCallback runs more than once (the modal
        // is re-parented to <body> by modal-dialog, which re-fires it).
        this._onVariantChange = this._onVariantChange.bind(this);
        this._submitGuard = this._submitGuard.bind(this);
      }

      connectedCallback() {
        this.sectionId = this.dataset.sectionId;
        this.variants = this._parseVariants();

        this.fVariant = this.querySelector("[data-enquiry-variant-title]");
        this.fVariantId = this.querySelector("[data-enquiry-variant-id]");
        this.fSku = this.querySelector("[data-enquiry-sku]");
        this.fQty = this.querySelector("[data-enquiry-qty]");
        this.fUrl = this.querySelector("[data-enquiry-url]");
        this.variantLabel = this.querySelector("[data-enquiry-variant-label]");
        this.baseUrl = this.fUrl
          ? this.fUrl.getAttribute("data-enquiry-base-url") || this.fUrl.value
          : "";

        // Forms whose submission must be blocked in enquiry mode.
        this.guardedFormIds = [
          "product-form-" + this.sectionId,
          "product-form-sticky-atc-bar",
        ];

        // Identical-listener adds are discarded by the browser, so these are safe
        // to call again if the element is reconnected.
        document.addEventListener("variant:changed", this._onVariantChange);
        document.addEventListener("submit", this._submitGuard, true);

        this.modal = this.closest("modal-dialog");
        if (this.modal) {
          // Re-sync each time the popup opens (covers quantity changes, which
          // do not fire variant:changed).
          this.modal.addEventListener("open", () => this.syncAll());
        }

        this.syncAll();
        this._maybeAutoOpen();
      }

      disconnectedCallback() {
        document.removeEventListener("variant:changed", this._onVariantChange);
        document.removeEventListener("submit", this._submitGuard, true);
      }

      // Cancel any attempt to submit the (buttonless) main/sticky product form
      // in enquiry mode. Capture phase on document runs before product-form.js's
      // own submit listener, so no /cart/add fetch and no crash can occur.
      _submitGuard(evt) {
        var target = evt.target;
        if (
          target &&
          target.id &&
          this.guardedFormIds.indexOf(target.id) !== -1
        ) {
          evt.preventDefault();
          evt.stopImmediatePropagation();
        }
      }

      _parseVariants() {
        var node =
          document.querySelector(
            "#MainProduct-" + this.dataset.sectionId + " #ProductData"
          ) || document.querySelector("#ProductData");
        if (!node) return [];
        try {
          var data = JSON.parse(node.textContent);
          return (data && data.variants) || [];
        } catch (e) {
          return [];
        }
      }

      _currentVariantId() {
        var input = document.querySelector(
          "#product-form-" + this.sectionId + ' input[name="id"]'
        );
        return input && input.value ? input.value : null;
      }

      _findVariant(id) {
        if (id == null) return null;
        for (var i = 0; i < this.variants.length; i++) {
          if (String(this.variants[i].id) === String(id)) return this.variants[i];
        }
        return null;
      }

      _onVariantChange(evt) {
        var eventVariant = evt && evt.detail && evt.detail.variant;
        var id =
          eventVariant && eventVariant.id != null
            ? eventVariant.id
            : this._currentVariantId();
        // Prefer the authoritative product JSON (always carries sku/title);
        // fall back to the event payload if the lookup misses.
        var variant = this._findVariant(id) || eventVariant;
        if (variant) this._apply(variant);
        this.syncQty();
      }

      syncVariant() {
        var variant = this._findVariant(this._currentVariantId());
        if (variant) this._apply(variant);
      }

      _apply(variant) {
        if (!variant) return;
        var title = variant.title || variant.public_title || "";
        if (this.fVariant) this.fVariant.value = title;
        if (this.fVariantId)
          this.fVariantId.value = variant.id != null ? variant.id : "";
        if (this.fSku) this.fSku.value = variant.sku || "";
        if (this.fUrl && this.baseUrl && variant.id != null) {
          this.fUrl.value =
            this.baseUrl +
            (this.baseUrl.indexOf("?") > -1 ? "&" : "?") +
            "variant=" +
            variant.id;
        }
        if (this.variantLabel) {
          this.variantLabel.textContent =
            title && title !== "Default Title" ? " — " + title : "";
        }
      }

      syncQty() {
        var qtyInput =
          document.querySelector(
            "#MainProduct-" + this.sectionId + " quantity-input input"
          ) ||
          document.querySelector(
            "#product-form-" + this.sectionId + ' [name="quantity"]'
          );
        if (this.fQty)
          this.fQty.value = qtyInput && qtyInput.value ? qtyInput.value : "1";
      }

      syncAll() {
        this.syncVariant();
        this.syncQty();
      }

      // After a native contact-form submit, Shopify reloads the page and renders
      // the success/error state inside the (closed) popup. Re-open it so the
      // customer sees the result. Fully guarded so it can never break the page.
      _maybeAutoOpen() {
        try {
          var status = this.querySelector("[data-enquiry-status]");
          if (status && this.modal) {
            var opener =
              document.querySelector("[data-enquiry-opener]") || this.modal;
            var modal = this.modal;
            requestAnimationFrame(function () {
              modal.show(opener);
            });
          }
        } catch (e) {
          /* no-op: never block rendering */
        }
      }
    }
  );
}
