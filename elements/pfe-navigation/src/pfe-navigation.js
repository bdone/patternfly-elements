import PFElement from "../pfelement/pfelement.js";
import PfeAccordion from "../pfe-accordion/pfe-accordion.js";

class PfeNavigation extends PFElement {
  static get tag() {
    return "pfe-navigation";
  }

  get templateUrl() {
    return "pfe-navigation.html";
  }

  get styleUrl() {
    return "pfe-navigation.scss";
  }

  constructor() {
    super(PfeNavigation);

    this._activeNavigationItem = null;

    this._toggledHandler = this._toggledHandler.bind(this);
    this._init = this._init.bind(this);

    // this._setupSearch = this._setupSearch.bind(this);
    
    this._observerHandler = this._observerHandler.bind(this);
    this._observer = new MutationObserver(this._observerHandler);

    this._initialized = false;

    this.addEventListener(
      `${PfeNavigationItem.tag}:toggled`,
      this._toggledHandler
    );
  }

  connectedCallback() {
    super.connectedCallback();

    this.overlay = this.shadowRoot.querySelector(".pfe-navigation__overlay");

    // Capture the utility slots from shadow
    this._searchSlot = this.shadowRoot.querySelector(`slot[name="search"]`);
    this._loginSlot = this.shadowRoot.querySelector(`slot[name="login"]`);
    this._languageSlot = this.shadowRoot.querySelector(`slot[name="language"]`);
    // Capture mobile slots from shadow
    this._menuSlotMobile     = this.shadowRoot.querySelector(`slot[name="mobile-menu"]`);
    this._searchSlotMobile   = this.shadowRoot.querySelector(`slot[name="mobile-search"]`);
    this._loginSlotMobile    = this.shadowRoot.querySelector(`slot[name="mobile-login"]`);
    this._languageSlotMobile = this.shadowRoot.querySelector(`slot[name="mobile-language"]`);

    // this._searchSlot.addEventListener("slotchange", this._setupSearch);
    // this._loginSlot.addEventListener("slotchange", this._setupLogin);
    // this._languageSlot.addEventListener("slotchange", this._setupLanguage);

    if (this.children.length) {
      this._initialized = this._init();
    }

    Promise.all([
      customElements.whenDefined(PfeNavigationItem.tag),
      customElements.whenDefined(PfeNavigationMain.tag)
    ]).then(() => {
      // Do a thing once items and main are loaded?
      this._observer.observe(this, {
        childList: true,
        subtree: true,
        characterData: true
      });
    });
  }

  disconnectedCallback() {
    this.removeEventListener(
      `${PfeNavigationItem.tag}:toggled`,
      this._toggledHandler
    );

    this._observer.disconnect();
    // this._searchSlot.removeEventListener("slotchange", this._setupSearch);
  }

  _observerHandler(mutationsList) {
    // Reset the state to false, rerun the initializer
    this._initialized = false;
    this._initialized = this._init();
  }

  _toggledHandler(event) {
    if (!this._activeNavigationItem) {
      this._activeNavigationItem = event.detail.navigationItem;
      this.overlay.removeAttribute("hidden");
      return;
    }

    if (this._activeNavigationItem === event.detail.navigationItem) {
      this._activeNavigationItem = null;
      this.overlay.setAttribute("hidden", true);
      return;
    }

    this._activeNavigationItem.expanded = false;
    this._activeNavigationItem = event.detail.navigationItem;
  }

  _init() {
    let ret = false;
    if(!this._initialized) {
      // @IE11 This is necessary so the script doesn't become non-responsive
      if (window.ShadyCSS) {
        this._observer.disconnect();
      }

      // if (!this._searchSlotMobile) {
      //   this._searchSlotMobile = document.createElement("div");
      //   this._searchSlotMobile.setAttribute("slot", "search-mobile");
      //   this.appendChild(this._searchSlotMobile);
      // }


      // if (!this._menuSlotMobile) {
      //   this._menuSlotMobile = document.createElement("div");
      //   this._menuSlotMobile.setAttribute("slot", "menu-mobile");
      //   this.appendChild(this._menuSlotMobile);
      // }

      ret = this._setupMobileNav();

      // @IE11 This is necessary so the script doesn't become non-responsive
      if (window.ShadyCSS) {
        setTimeout(() => {
          this._observer.observe(this, {
            childList: true,
            subtree: true,
            characterData: true
          });
        }, 0);
      }
    }

    return ret;
  }

  // _setupSearch(event) {
  //   const searchInnerHTML = this._searchSlot.assignedNodes()[0].querySelector(`[slot="tray"] > *`);
  //   const searchInnerHTMLClone = searchInnerHTML.cloneNode(true);

  //   this._searchSlotMobile.appendChild(searchInnerHTMLClone);
  // }

  _setupMobileNav() {
    if(!this._initialized) {
      const triggers = [
        ...this.querySelectorAll("pfe-navigation-main pfe-navigation-item > *:first-child")
      ];
      const fragment = document.createDocumentFragment();
      const accordion = document.createElement("pfe-accordion");
      const menuSlotMobile = this.querySelector(`[slot="menu-mobile"]`);

      // Set up the mobile search
      const searchClone = this.querySelector(`[slot="search"] > [slot="tray"]`).innerHTML;
      this._searchSlotMobile.innerHTML = searchClone;

      // Set up the mobile login
      const loginEl = this._loginSlot ? this._loginSlot.querySelector(`[slot="trigger"]`) : null;
      const loginClone = loginEl !== null ? loginEl.innerHTML : "";
      this._loginSlotMobile.innerHTML = loginClone;

      // Set up the mobile language
      const languageEl = this._languageSlot ? this._languageSlot.querySelector(`[slot="trigger"]`) : null;
      const languageClone = languageEl !== null ? languageEl.innerHTML : "";
      this._languageSlotMobile.innerHTML = languageClone;

      // Set up the mobile main menu
      triggers.forEach(trigger => {
        const clone = trigger.cloneNode(true);
        const header = document.createElement("pfe-accordion-header");
        const panel = document.createElement("pfe-accordion-panel");

        if (!trigger.hasAttribute("slot")) {
          header.innerHTML = clone.outerHTML;
        } else {
          header.innerHTML = trigger.outerHTML;
          header.children[0].removeAttribute("slot");
        }

        if (
          trigger.nextElementSibling &&
          trigger.nextElementSibling.getAttribute("slot") === "tray"
        ) {
          panel.innerHTML = trigger.nextElementSibling.innerHTML;
        } else {
          panel.innerHTML = "";
        }

        accordion.appendChild(header);
        accordion.appendChild(panel);
      });

      fragment.appendChild(accordion);

      this._menuSlotMobile.innerHTML = "";
      this._menuSlotMobile.appendChild(fragment);
    }

    return true;
  }
}

class PfeNavigationItem extends PFElement {
  static get tag() {
    return "pfe-navigation-item";
  }

  get templateUrl() {
    return "pfe-navigation-item.html";
  }

  get styleUrl() {
    return "pfe-navigation-item.scss";
  }

  static get PfeType() {
    return PFElement.PfeTypes.Container;
  }

  get iconSVG() {
    return {
      bento: `<?xml version="1.0" encoding="UTF-8"?>
      <svg width="19px" height="19px" viewBox="0 0 19 19" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
          <!-- Generator: Sketch 53.2 (72643) - https://sketchapp.com -->
          <title>Icon</title>
          <desc>Created with Sketch.</desc>
          <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
              <g id="Icon">
                  <rect id="Rectangle" x="14" y="14" width="5" height="5"></rect>
                  <rect id="Rectangle" x="7" y="14" width="5" height="5"></rect>
                  <rect id="Rectangle" x="0" y="14" width="5" height="5"></rect>
                  <rect id="Rectangle" x="14" y="7" width="5" height="5"></rect>
                  <rect id="Rectangle" x="7" y="7" width="5" height="5"></rect>
                  <rect id="Rectangle" x="0" y="7" width="5" height="5"></rect>
                  <rect id="Rectangle" x="14" y="0" width="5" height="5"></rect>
                  <rect id="Rectangle" x="7" y="0" width="5" height="5"></rect>
                  <rect id="Rectangle" x="0" y="0" width="5" height="5"></rect>
              </g>
          </g>
      </svg>`,
      globe: `<?xml version="1.0" encoding="UTF-8"?>
      <svg width="21px" height="21px" viewBox="0 0 21 21" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
          <!-- Generator: Sketch 53.2 (72643) - https://sketchapp.com -->
          <title>Icon</title>
          <desc>Created with Sketch.</desc>
          <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
              <g id="Icon">
                  <circle id="Oval" cx="9.5" cy="9.5" r="9.5"></circle>
                  <ellipse id="Oval" cx="9.5" cy="9.5" rx="4.75" ry="9.5"></ellipse>
                  <path d="M9.5,0 L9.5,19" id="Path"></path>
                  <path d="M1,14 L18,14" id="Path"></path>
                  <path d="M0,9.5 L19,9.5" id="Path"></path>
                  <path d="M1,5 L18,5" id="Path"></path>
              </g>
          </g>
      </svg>`,
      menu: `<?xml version="1.0" encoding="UTF-8"?>
      <svg width="23px" height="18px" viewBox="0 0 23 18" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
          <!-- Generator: Sketch 53.2 (72643) - https://sketchapp.com -->
          <title>Icon</title>
          <desc>Created with Sketch.</desc>
          <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
              <g id="Icon">
                  <rect id="Rectangle" x="0.5" y="14.5" width="22" height="3"></rect>
                  <rect id="Rectangle" x="0.5" y="7.5" width="22" height="3"></rect>
                  <rect id="Rectangle" x="0.5" y="0.5" width="22" height="3"></rect>
              </g>
          </g>
      </svg>`,
      search: `<?xml version="1.0" encoding="UTF-8"?>
      <svg width="20px" height="20px" viewBox="0 0 20 20" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
          <!-- Generator: Sketch 53.2 (72643) - https://sketchapp.com -->
          <title>Icon</title>
          <desc>Created with Sketch.</desc>
          <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
              <g id="Icon">
                  <path d="M12,13 L18,19" id="Path" stroke-linecap="round"></path>
                  <ellipse id="Oval" cx="7" cy="7.5" rx="7" ry="7.5"></ellipse>
              </g>
          </g>
      </svg>`,
      user: `<?xml version="1.0" encoding="UTF-8"?>
      <svg width="21px" height="20px" viewBox="0 0 21 20" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
          <!-- Generator: Sketch 53.2 (72643) - https://sketchapp.com -->
          <title>Icon</title>
          <desc>Created with Sketch.</desc>
          <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd" stroke-linecap="round">
              <g id="Icon">
                  <path d="M0,19 C0,13.75 4.25,9.5 9.5,9.5 C14.75,9.5 19,13.75 19,19" id="Path"></path>
                  <circle id="Oval" cx="9.5" cy="4.75" r="4.75"></circle>
              </g>
          </g>
      </svg>`
    };
  }

  static get observedAttributes() {
    return ["pfe-icon"];
  }

  get expanded() {
    return this.classList.contains("expanded");
  }

  set expanded(val) {
    val = Boolean(val);

    if (val) {
      this.classList.add("expanded");

      if (this.trigger) {
        this.trigger.setAttribute("aria-expanded", true);
      }

      if (this.tray) {
        this.tray.removeAttribute("hidden");
        this.tray.setAttribute("aria-expanded", true);
      }

      if (this.indicator) {
        this.indicator.classList.add("expanded");
      }
    } else {
      this.classList.remove("expanded");

      if (this.trigger) {
        this.trigger.removeAttribute("aria-expanded");
      }

      if (this.tray) {
        this.tray.setAttribute("hidden", true);
        this.tray.removeAttribute("aria-expanded");
      }

      if (this.indicator) {
        this.indicator.classList.remove("expanded");
      }
    }
  }

  constructor() {
    super(PfeNavigationItem);

    this.expanded = false;
    this.trigger = null;
    this.tray = null;

    this._init = this._init.bind(this);
    this._clickHandler = this._clickHandler.bind(this);
    this._keydownHandler = this._keydownHandler.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    
    // If no slots have been assigned, assign it to the trigger slot
    const unassigned = [...this.children].filter(child => !child.hasAttribute("slot"));
    unassigned.map(item => item.setAttribute("slot", "trigger"));

    this.trigger = this.querySelector(`[slot="trigger"]`);
    this.tray = this.querySelector(`[slot="tray"]`);

    this.shadowRoot
      .querySelector(`slot[name="trigger"]`)
      .addEventListener("slotchange", this._init);
  }

  attributeChangedCallback(attr, oldValue, newValue) {
    super.attributeChangedCallback(attr, oldValue, newValue);

    // if (attr === "pfe-icon") {
    //   if (!this.shadowRoot.querySelector(".pfe-navigation-item__icon")) {
    //     const span = document.createElement("span");
    //     span.classList.add("pfe-navigation-item__icon");
    //     this.shadowRoot.querySelector(".trigger").insertAdjacentElement("afterbegin", span);
    //   }
    
    //   this.shadowRoot.querySelector(".pfe-navigation-item__icon").innerHTML = this.iconSVG[newValue];
    // }
  }

  disconnectedCallback() {
    if (this.trigger) {
      this.trigger.removeEventListener("click", this._clickHandler);
      this.trigger.removeEventListener("keydown", this._keydownHandler);
    }
  }

  _init() {
    // Get the trigger and tray from the light DOM
    // this.trigger = this.querySelector(`[slot="trigger"]`);
    // this.tray = this.querySelector(`[slot="tray"]`);
    this.indicator = this.shadowRoot.querySelector(".indicator");

    // If there is both a trigger and a tray element, add click events
    if (this.trigger && this.tray) {
      this.trigger.addEventListener("click", this._clickHandler);
      this.trigger.addEventListener("keydown", this._keydownHandler);
    }
  }

  _clickHandler(event) {
    event.preventDefault();
    this.expanded = !this.expanded;
    this._fireExpandToggledEvent();
  }

  _keydownHandler(event) {
    switch (event.key) {
      case "Spacebar":
      case " ":
        event.preventDefault();
        this.expanded = !this.expanded;
        this._fireExpandToggledEvent();
        break;
      case "Esc":
      case "Escape":
        event.preventDefault();

        if (this.trigger) {
          this.trigger.focus();
        }

        this.expanded = false;
        this._fireExpandToggledEvent();
        break;
      default:
        return;
    }
  }

  _fireExpandToggledEvent() {
    this.dispatchEvent(
      new CustomEvent(`${PfeNavigationItem.tag}:toggled`, {
        detail: { navigationItem: this, expanded: this.expanded },
        bubbles: true,
        composed: true
      })
    );
  }
}

class PfeNavigationMain extends PFElement {
  static get tag() {
    return "pfe-navigation-main";
  }

  get templateUrl() {
    return "pfe-navigation-main.html";
  }

  get styleUrl() {
    return "pfe-navigation-main.scss";
  }

  static get PfeType() {
    return PFElement.PfeTypes.Container;
  }

  constructor() {
    super(PfeNavigationMain);
  }
}

PFElement.create(PfeNavigationItem);
PFElement.create(PfeNavigationMain);
PFElement.create(PfeNavigation);
