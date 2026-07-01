if (!customElements.get("image-with-text-slider")) {
  class imageWithTextSlider extends HTMLElement {
    constructor() {
      super()

      this.selectedIndex = this.selectedIndex;
      
      this.selectors = {
        contents: ['.f-slider__content-wrapper'],
        textContainer: '.f-slider__text',
        mediaContainer: '.f-slider__media',
        pageDots: '.flickity-page-dots',
        pageCounter: '.flickity-page-counter'
      }
      this.domNodes = queryDomNodes(this.selectors, this)
      if (this.totalSlides < 2) {
        return
      }
      this.init()
    }

    get totalSlides() {
      return this.getAttribute('data-total-slides')
    }

    static get observedAttributes() {
      return ['selected-index'];
    }

    get selectedIndex() {
      return parseInt(this.getAttribute('selected-index')) || 0;
    }

    set selectedIndex(index) {
      this.setAttribute('selected-index', `${index}`);
    }

    disconnectedCallback() {
      clearInterval(this.check)
    }

    init() {
      this.check = setInterval(() => {
        this.textSlider = this.domNodes.textContainer.slider && this.domNodes.textContainer.slider.instance
        this.mediaSlider = this.domNodes.mediaContainer.slider && this.domNodes.mediaContainer.slider.instance
        if (this.textSlider && typeof this.textSlider == 'object') {
          clearInterval(this.check)
          this.removeAttribute('data-media-loading')
          this.textSlider.on('change', this.handleChange.bind(this))
          this.mediaSlider.on('change', (index) => {
            this.textSlider.select(index)
            this.selectedIndex = index;
          })
          this.handleScreenChange()
          this.playVideo()
          if (this.domNodes.pageCounter) {
            this.domNodes.textContainer.insertBefore(this.domNodes.pageCounter, null)
          }
        }
      }, 100)
    }

    handleChange(index) {
      const sliderCounterCurrent = this.querySelector('.flickity-counter--current')
      const slideContentCurrent = this.domNodes.contents[index]
      const currentColorScheme = slideContentCurrent.dataset.colorScheme

      Array.from(this.domNodes.contents, (el) => {
        this.domNodes.textContainer.classList.remove(el.dataset.colorScheme)
      })

      this.domNodes.textContainer.classList.add(currentColorScheme)

      // Handle page counter
      if (this.domNodes.pageCounter && sliderCounterCurrent) {
        sliderCounterCurrent.textContent = index + 1
      }

      if (this.mediaSlider) {
				this.mediaSlider.select(index)
			}

      this.playVideo()
      this.selectedIndex = index;
    }

    playVideo() {
      this.pauseAllMedia()
      const selectedElm = this.mediaSlider.selectedElement
      const deferredMedia = selectedElm.querySelector('deferred-media')

      if (deferredMedia) {
        deferredMedia.loadContent()
        const youtube = deferredMedia.querySelector('.js-youtube')
        const vimeo = deferredMedia.querySelector('.js-vimeo')
        const video = deferredMedia.querySelector('video')
        if (video) video.play()
        if (youtube) youtube.contentWindow.postMessage('{"event":"command","func":"' + 'playVideo' + '","args":""}', '*')
        if (vimeo) vimeo.contentWindow.postMessage('{"method":"play"}', '*')
      }
    }

    pauseAllMedia() {
      this.querySelectorAll(".js-youtube").forEach((video) => {
        video.contentWindow.postMessage(
          '{"event":"command","func":"' + "pauseVideo" + '","args":""}',
          "*"
        );
      });
      this.querySelectorAll(".js-vimeo").forEach((video) => {
        video.contentWindow.postMessage('{"method":"pause"}', "*");
      });
      this.querySelectorAll("video").forEach((video) => video.pause());
    }

    handleScreenChange() {
      if (FoxThemeSettings.isMobile) {
        // this.domNodes.flickity.toggleFade()
      }
      document.addEventListener('matchMobile', () => {
        // this.domNodes.flickity.toggleFade()
      })
      document.addEventListener('unmatchMobile', () => {
        // this.domNodes.flickity.toggleFade(true)
      })
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (name === 'selected-index' && oldValue !== null && oldValue !== newValue) {
        const fromElements = this.querySelectorAll(`.f-slider__content-wrapper[data-index="${oldValue}"]`);
        const toElements = this.querySelectorAll(`.f-slider__content-wrapper[data-index="${newValue}"]`);

        fromElements.forEach((fromElement) => {
          const motionEls = fromElement.querySelectorAll('motion-element');
          motionEls &&
            motionEls.forEach((motionEl) => {
              motionEl.resetAnimation();
            });
        });

        toElements.forEach((toElement) => {
          setTimeout(() => {
            if (toElement.classList.contains('is-selected')) {
              const motionEls = toElement.querySelectorAll('motion-element');
              motionEls.forEach((motionEl) => {
                setTimeout(() => {
                  motionEl && motionEl.refreshAnimation();
                });
              });
            }
          });
        });
      }
    }
  }

  customElements.define('image-with-text-slider', imageWithTextSlider)
}