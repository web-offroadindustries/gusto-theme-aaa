class ResponsiveImage extends HTMLElement {
  get intersecting() {
    return this.hasAttribute("intersecting");
  }
  constructor() {
    super();
    this.img = this.querySelector("img");
    this.observerCallback = this.observerCallback.bind(this);
    this.loadImage = this.loadImage.bind(this);
    this.img.onload = this.onLoad.bind(this);
    if (this.img.complete) {
      this.removeAttribute("data-image-loading");
      this.img.classList.add("f-img-loaded");
    }
  }
  connectedCallback() {
    if ("IntersectionObserver" in window) this.initIntersectionObserver();
    else this.loadImage();
  }
  disconnectedCallback() {
    this.disconnectObserver();
  }
  loadImage() {
    this.setAttribute("intersecting", "true");
    this.img.width = this.clientWidth;
    this.img.height = this.clientHeight;
    this.img.sizes = this.clientWidth + "px";
  }
  onLoad() {
    this.removeAttribute("data-image-loading");
    this.img.classList.add("f-img-loaded");
  }
  observerCallback(entries, observer) {
    if (!entries[0].isIntersecting) return;
    observer.unobserve(this);
    this.loadImage();
  }
  initIntersectionObserver() {
    if (this.observer) return;
    const rootMargin = "10px";
    this.observer = new IntersectionObserver(this.observerCallback, {
      rootMargin,
    });
    this.observer.observe(this);
  }
  disconnectObserver() {
    if (!this.observer) return;
    this.observer.disconnect();
    this.observer = null;
    delete this.observer;
  }
  // Reinitialize component after page restore from bfcache
  reinitialize() {
    // Check if image is already loaded and displayed correctly
    if (this.img.complete && this.img.naturalHeight > 0) {
      // Image is fully loaded, ensure correct state
      this.removeAttribute("data-image-loading");
      this.img.classList.add("f-img-loaded");
      // Ensure intersecting attribute is set and image properties are correct
      if (!this.intersecting) {
        this.setAttribute("intersecting", "true");
        // Set image dimensions and sizes to ensure proper display
        this.img.width = this.clientWidth;
        this.img.height = this.clientHeight;
        this.img.sizes = this.clientWidth + "px";
      }
    } else {
      // Image not loaded or in progress, reset and reinitialize
      this.removeAttribute("intersecting");
      this.img.classList.remove("f-img-loaded");
      this.setAttribute("data-image-loading", "");

      // Always disconnect and reinitialize observer
      this.disconnectObserver();
      if ("IntersectionObserver" in window) {
        this.initIntersectionObserver();
      } else {
        this.loadImage();
      }
    }
  }
}
customElements.define("responsive-image", ResponsiveImage);

// Handle page restore from bfcache (back button on Safari iOS)
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    // Page was restored from bfcache, reinitialize all responsive-image components
    document.querySelectorAll("responsive-image").forEach((element) => {
      if (element.reinitialize) {
        element.reinitialize();
      }
    });
  }
});
