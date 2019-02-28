import { autoReveal } from "./reveal.js";
const prefix = "pfe-";

class PFElement extends HTMLElement {
  static create(pfe) {
    window.customElements.define(pfe.tag, pfe);
  }

  static debugLog(preference = null) {
    if (preference !== null) {
      PFElement._debugLog = !!preference;
    }
    return PFElement._debugLog;
  }

  static log(...msgs) {
    if (PFElement.debugLog()) {
      console.log(...msgs);
    }
  }

  static get PfeTypes() {
    return {
      Container: "container",
      Content: "content",
      Combo: "combo"
    };
  }

  get pfeType() {
    return this.getAttribute(`${prefix}type`);
  }

  set pfeType(value) {
    this.setAttribute(`${prefix}type`, value);
  }

  has_slot(name) {
    return this.querySelector(`[slot='${name}']`);
  }
  
  // Expects an object containing the content selector and the shadow selector
  static moveToShadowDOM(items, context) {
    // Copy the content from the slot into the ShadowDOM
    Object.entries(items).forEach(item => {
      // Document fragments are more efficient
      const fraggle = document.createDocumentFragment();
      // Get the content and the slots
      if(item[0] && item[1]) {
        const contents = [...context.querySelectorAll(`[slot=\"${item[0]}\"]`)];
        const templateSlot = context.shadowRoot.querySelector(item[1]);
        // For each content item, append it to the fragment
        contents.forEach(content => {
          // Remove slot designation
          content.removeAttribute("slot");
          // Append content to the fragment
          fraggle.appendChild(content);
        });
        // If the slot and contents exist, append the fragment to the DOM
        if (templateSlot && contents.length) {
          templateSlot.appendChild(fraggle);
        }
      }
    });
  }

  static swapElements(oldEl, newEl, attributes = []) {
    if(oldEl && oldEl.attributes.length > 0 && newEl) {
      [...oldEl.attributes].forEach((attr) => {
        if(attributes.length) {
          // Only add supported attributes to the new element
          attributes.forEach(a => {
            if (a === attr.name) {
              // Give the new element this attribute from the old element
              newEl.setAttribute(attr.name, attr.value);
            }
          })

        } else {
          // Give the new element all the attributes of the old element
          newEl.setAttribute(attr.name, attr.value);
        }
      });

      // Get the parent container of the old element
      const parent = oldEl.parentNode;
      // If the parent element is found, replace the old element with the new one
      if(parent) {
        parent.replaceChild(newEl, oldEl);
      }
    }
    // Return the new element at the end of the swap
    return newEl;
  }

  static copyAttributes(from, to, ignore = [], only = []) {
    if(from && from.attributes.length > 0 && to) {
      [...from.attributes].forEach((attr) => {
        // If the attribute is not flagged to ignore, copy it
        if (!ignore.includes(attr.name) || (only.length && only.includes(attr.name))) {
          to.setAttribute(attr.name, attr.value);
        }
      });
    }
    return to;
  }

  constructor(pfeClass, { type = null, delayRender = false } = {}) {
    super();

    this.connected = false;
    this._pfeClass = pfeClass;
    this.tag = pfeClass.tag;
    this.props = pfeClass.properties;
    this._queue = [];
    this.template = document.createElement("template");

    this.attachShadow({ mode: "open" });

    if (type) {
      this._queueAction({
        type: "setProperty",
        data: {
          name: "pfeType",
          value: type
        }
      });
    }

    if (!delayRender) {
      this.render();
    }
  }

  connectedCallback() {
    this.connected = true;

    if (window.ShadyCSS) {
      window.ShadyCSS.styleElement(this);
    }

    this.classList.add("PFElement");

    if (typeof this.props === "object") {
      this._mapSchemaToProperties(this.tag, this.props);
    }

    if (this._queue.length) {
      this._processQueue();
    }
  }

  disconnectedCallback() {
    this.connected = false;
  }

  attributeChangedCallback(attr, oldVal, newVal) {
    if (!this._pfeClass.cascadingAttributes) {
      return;
    }

    const cascadeTo = this._pfeClass.cascadingAttributes[attr];
    if (cascadeTo) {
      this._copyAttribute(attr, cascadeTo);
    }
  }

  _copyAttribute(name, to) {
    const recipients = [
      ...this.querySelectorAll(to),
      ...this.shadowRoot.querySelectorAll(to)
    ];
    const value = this.getAttribute(name);
    const fname = value == null ? "removeAttribute" : "setAttribute";
    for (const node of recipients) {
      node[fname](name, value);
    }
  }

  // Map the imported properties json to real props on the element
  // @notice static getter of properties is built via tooling
  // to edit modify src/element.json
  _mapSchemaToProperties(tag, properties) {
    // Loop over the properties provided by the schema
    Object.keys(properties).forEach(attr => {
      let data = properties[attr];
      // Set the attribute's property equal to the schema input
      this[attr] = data;
      // Initialize the value to null
      this[attr].value = null;

      // If the attribute exists on the host
      if (this.hasAttribute(`${prefix}${attr}`)) {
        // Set property value based on the existing attribute
        this[attr].value = this.getAttribute(`${prefix}${attr}`);
      }
      // Otherwise, look for a default and use that instead
      else if (data.default) {
        const dependency_exists = this._hasDependency(tag, data.options);
        const no_dependencies =
          !data.options || (data.options && !data.options.dependencies.length);
        // If the dependency exists or there are no dependencies, set the default
        if (dependency_exists || no_dependencies) {
          this.setAttribute(`${prefix}${attr}`, data.default);
          this[attr].value = data.default;
        }
      }
    });
  }

  // Test whether expected dependencies exist
  _hasDependency(tag, opts) {
    // Get any possible dependencies for this attribute to exist
    let dependencies = opts ? opts.dependencies : [];
    // Initialize the dependency return value
    let hasDependency = false;
    // Check that dependent item exists
    // Loop through the dependencies defined
    for (let i = 0; i < dependencies.length; i += 1) {
      const slot_exists =
        dependencies[i].type === "slot" &&
        this.has_slot(`${tag}--${dependencies[i].id}`);
      const attribute_exists =
        dependencies[i].type === "attribute" &&
        this.getAttribute(`${prefix}${dependencies[i].id}`);
      // If the type is slot, check that it exists OR
      // if the type is an attribute, check if the attribute is defined
      if (slot_exists || attribute_exists) {
        // If the slot does exist, add the attribute with the default value
        hasDependency = true;
        // Exit the loop
        break;
      }
    }
    // Return a boolean if the dependency exists
    return hasDependency;
  }

  _queueAction(action) {
    this._queue.push(action);
  }

  _processQueue() {
    this._queue.forEach(action => {
      this[`_${action.type}`](action.data);
    });

    this._queue = [];
  }

  _setProperty({ name, value }) {
    this[name] = value;
  }

  static var(name, element = document.body) {
    return window
      .getComputedStyle(element)
      .getPropertyValue(name)
      .trim();
  }

  var(name) {
    return PFElement.var(name, this);
  }

  render() {
    this.shadowRoot.innerHTML = "";
    this.template.innerHTML = this.html;

    if (window.ShadyCSS) {
      window.ShadyCSS.prepareTemplate(this.template, this.tag);
    }

    this.shadowRoot.appendChild(this.template.content.cloneNode(true));
  }

  log(...msgs) {
    PFElement.log(`[${this.tag}]`, ...msgs);
  }
}

autoReveal(PFElement.log);

export default PFElement;
//# sourceMappingURL=PFElement.js.map
