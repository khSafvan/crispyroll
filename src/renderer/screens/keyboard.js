/**
 * On-screen Virtual Keyboard Screen Controller
 */

window.keyboard = {
  id: "keyboard-screen",
  previous: null,
  values: [
    {
      keys: [
        { value: "Q", number: "1", symbol: "1", size: 1 },
        { value: "W", number: "2", symbol: "2", size: 1 },
        { value: "E", number: "3", symbol: "3", size: 1 },
        { value: "R", number: "4", symbol: "4", size: 1 },
        { value: "T", number: "5", symbol: "5", size: 1 },
        { value: "Y", number: "6", symbol: "6", size: 1 },
        { value: "U", number: "7", symbol: "7", size: 1 },
        { value: "I", number: "8", symbol: "8", size: 1 },
        { value: "O", number: "9", symbol: "9", size: 1 },
        { value: "P", number: "0", symbol: "0", size: 1 },
      ],
    },
    {
      keys: [
        { value: "A", number: "@", symbol: "|", size: 1 },
        { value: "S", number: "#", symbol: "/", size: 1 },
        { value: "D", number: "$", symbol: "\\", size: 1 },
        { value: "F", number: "_", symbol: "*", size: 1 },
        { value: "G", number: "&", symbol: "'", size: 1 },
        { value: "H", number: "-", symbol: '"', size: 1 },
        { value: "J", number: "+", symbol: "=", size: 1 },
        { value: "K", number: "(", symbol: ">", size: 1 },
        { value: "L", number: ")", symbol: "<", size: 1 },
      ],
    },
    {
      keys: [
        { value: "", number: "", symbol: "", size: "alpha" },
        { value: "Z", number: ".", symbol: "~", size: 1 },
        { value: "X", number: "¿", symbol: "[", size: 1 },
        { value: "C", number: "?", symbol: "]", size: 1 },
        { value: "V", number: "¡", symbol: "{", size: 1 },
        { value: "B", number: "!", symbol: "}", size: 1 },
        { value: "N", number: ";", symbol: "%", size: 1 },
        { value: "M", number: ":", symbol: "^", size: 1 },
        { value: "Ñ", number: ",", symbol: "`", size: 1 },
        { value: "", number: "", symbol: "", size: "backspace" },
      ],
    },
    {
      keys: [
        { value: "1 2 3", number: "A B C", symbol: "A B C", size: 2 },
        { value: "", number: "", symbol: "", size: 5 },
        { value: "", number: "", symbol: "", size: "ok" },
      ],
    },
  ],
  selected: [0, 0],
  input: null,
  send: null,
  alpha: false,
  number: false,

  /**
   * Initializes virtual on-screen keyboard for target input.
   * @param {HTMLInputElement} element
   * @param {Function} [send]
   */
  init: (element, send) => {
    window.keyboard.selected = [0, 0];
    window.keyboard.input = element;
    window.keyboard.send = send;
    window.keyboard.alpha = false;
    window.keyboard.number = false;

    const keyboardElement = document.createElement("div");
    keyboardElement.id = window.keyboard.id;

    keyboardElement.innerHTML = window.keyboard.generate();
    document.body.appendChild(keyboardElement);

    window.keyboard.move(window.keyboard.selected);
    window.keyboard.previous = window.main.state;
    window.main.state = window.keyboard.id;
  },

  destroy: () => {
    const el = document.getElementById(window.keyboard.id);
    if (el) {
      document.body.removeChild(el);
    }
    window.main.state = window.keyboard.previous;
    window.keyboard.send = null;
  },

  /**
   * Generates DOM HTML string for keyboard keys layout.
   * @returns {string}
   */
  generate: () => {
    let htmlString = "";
    for (const item of window.keyboard.values) {
      htmlString += `<div class="${window.keyboard.id}-option row">`;

      for (const key of item.keys) {
        htmlString += `
        <div class="col ${window.keyboard.getSize(key)}">
          ${window.keyboard.getValue(key)}
        </div>`;
      }

      htmlString += "</div>";
    }
    return htmlString;
  },

  getValue: (key) => {
    if (window.keyboard.number) {
      return window.keyboard.alpha ? key.symbol : key.number;
    }
    return window.keyboard.alpha ? key.value.toUpperCase() : key.value.toLowerCase();
  },

  getSize: (key) => {
    if (key.size === "alpha") {
      return `size-${window.keyboard.number ? "symbol" : "alpha"}${
        window.keyboard.alpha ? " active" : ""
      }`;
    }
    return `size-${key.size}`;
  },

  /**
   * Key down event handler for virtual keyboard navigation and physical typing.
   * @param {KeyboardEvent} event
   */
  keyDown: (event) => {
    switch (event.keyCode) {
      case window.tvKey?.IS_KEY_BACK(event.keyCode):
      case 27:
        window.keyboard.destroy();
        break;
      case window.tvKey?.KEY_UP:
        if (window.keyboard.selected[0] > 0) {
          const max = { 1: 8, 3: 2 }[window.keyboard.selected[0] - 1] || 9;
          window.keyboard.move([
            window.keyboard.selected[0] - 1,
            window.keyboard.selected[0] === 3
              ? 3 * (window.keyboard.selected[1] + 1) - 1
              : window.keyboard.selected[1] > max
              ? max
              : window.keyboard.selected[1],
          ]);
        }
        break;
      case window.tvKey?.KEY_DOWN: {
        const max = { 1: 8, 3: 2 }[window.keyboard.selected[0] + 1] || 9;
        if (window.keyboard.selected[0] < 3) {
          window.keyboard.move([
            window.keyboard.selected[0] + 1,
            window.keyboard.selected[0] === 2
              ? Math.round(window.keyboard.selected[1] / 4.5)
              : window.keyboard.selected[1] > max
              ? max
              : window.keyboard.selected[1],
          ]);
        }
        break;
      }
      case window.tvKey?.KEY_LEFT: {
        const selectedColumn =
          window.keyboard.selected[1] > 0
            ? window.keyboard.selected[1] - 1
            : { 1: 8, 3: 2 }[window.keyboard.selected[0]] || 9;
        window.keyboard.move([window.keyboard.selected[0], selectedColumn]);
        break;
      }
      case window.tvKey?.KEY_RIGHT: {
        const max = { 1: 8, 3: 2 }[window.keyboard.selected[0]] || 9;
        window.keyboard.move([
          window.keyboard.selected[0],
          window.keyboard.selected[1] < max ? window.keyboard.selected[1] + 1 : 0,
        ]);
        break;
      }
      case window.tvKey?.KEY_ENTER:
        window.keyboard.action(window.keyboard.selected);
        break;
      default:
        window.keyboard.handleKeyboardInput(window.keyboard.selected, event);
        break;
    }
  },

  /**
   * Highlights selected keyboard key cell.
   * @param {[number, number]} selected
   */
  move: (selected) => {
    window.keyboard.selected = selected;
    const options = document.getElementsByClassName(`${window.keyboard.id}-option`);
    for (let i = 0; i < options.length; i++) {
      const cols = options[i].children;
      for (let a = 0; a < cols.length; a++) {
        if (i === selected[0] && a === selected[1]) {
          cols[a].classList.add("selected");
        } else {
          cols[a].classList.remove("selected");
        }
      }
    }
  },

  /**
   * Handles physical keyboard input into target element.
   * @param {[number, number]} _selected
   * @param {KeyboardEvent} event
   */
  handleKeyboardInput: (_selected, event) => {
    if (!window.keyboard.input) return;
    const currentValue = window.keyboard.input.value;
    const validInput =
      "qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM`1234567890-=~!@#$%^&*()_+[];',./{}|:<>?¿";

    if (validInput.includes(event.key)) {
      window.keyboard.input.value = currentValue + event.key;
    }
    if (event.keyCode === 32) {
      window.keyboard.input.value = currentValue + " ";
    }
    if (event.keyCode === 8 && currentValue.length > 0) {
      window.keyboard.input.value = currentValue.slice(0, -1);
    }
  },

  /**
   * Executes selected on-screen key action.
   * @param {[number, number]} selected
   */
  action: (selected) => {
    const key = `${selected[0]}${selected[1]}`;
    switch (key) {
      case "20":
        window.keyboard.upperCase();
        break;
      case "30":
        window.keyboard.change();
        break;
      case "31":
        if (window.keyboard.input) {
          window.keyboard.input.value += " ";
        }
        break;
      case "32":
        window.keyboard.send?.();
        window.keyboard.destroy();
        break;
      case "29":
        if (window.keyboard.input) {
          window.keyboard.input.value = window.keyboard.input.value.slice(0, -1);
        }
        break;
      default: {
        const optionRows = document.getElementsByClassName(`${window.keyboard.id}-option`);
        const targetKeyEl = optionRows[selected[0]]?.children[selected[1]];
        if (window.keyboard.input && targetKeyEl) {
          window.keyboard.input.value += targetKeyEl.innerText.trim();
        }
        break;
      }
    }
  },

  upperCase: () => {
    window.keyboard.alpha = !window.keyboard.alpha;
    const el = document.getElementById("keyboard-screen");
    if (el) el.innerHTML = window.keyboard.generate();
    window.keyboard.move(window.keyboard.selected);
  },

  change: () => {
    window.keyboard.number = !window.keyboard.number;
    window.keyboard.alpha = false;
    const el = document.getElementById("keyboard-screen");
    if (el) el.innerHTML = window.keyboard.generate();
    window.keyboard.move(window.keyboard.selected);
  },
};
