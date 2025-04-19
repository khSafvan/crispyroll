/**
 * Gamepad Navigation Listener (Renderer Process)
 * Listens to HTML5 Gamepad API inputs and forwards navigation events to Electron main process.
 */

function debounce(func, timeout = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func.apply(this, args);
    }, timeout);
  };
}

let gpIndex = -1;
let animationFrameId;
let controllerEnabled = window.localStorage.getItem("controllerSupport") === "ENABLE";

const sendButtonPressToElectronOriginal = (buttonPressed) => {
  if (window.electronUtilsRender?.gamepadButtonPress) {
    window.electronUtilsRender.gamepadButtonPress(buttonPressed);
  }
};

const sendButtonPressToElectron = debounce(sendButtonPressToElectronOriginal, 70);

const controllerNavigation = (gp) => {
  const el = document.activeElement;
  const dPadUp = gp.buttons[12];
  const dPadDown = gp.buttons[13];
  const dPadLeft = gp.buttons[14];
  const dPadRight = gp.buttons[15];
  const aButton = gp.buttons[0];
  const bButton = gp.buttons[1];

  try {
    if (dPadUp?.pressed) {
      if (el?.getAttribute("role") === "menuitemradio") {
        sendButtonPressToElectron("up");
      } else {
        sendButtonPressToElectron("dPadUp");
      }
    }
    if (dPadDown?.pressed) {
      if (el?.getAttribute("role") === "menuitemradio") {
        sendButtonPressToElectron("down");
      } else {
        sendButtonPressToElectron("dPadDown");
      }
    }
    if (dPadLeft?.pressed) {
      sendButtonPressToElectron("dPadLeft");
    }
    if (dPadRight?.pressed) {
      sendButtonPressToElectron("dPadRight");
    }
    if (aButton?.pressed) {
      sendButtonPressToElectron("aButton");
    }
    if (bButton?.pressed) {
      sendButtonPressToElectron("bButton");
    }
  } catch {
    // Gamepad button read error
  }
};

const updateLoop = () => {
  if (gpIndex >= 0) {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[gpIndex];
    if (gp && controllerEnabled) {
      controllerNavigation(gp);
    }
    animationFrameId = window.requestAnimationFrame(updateLoop);
  }
};

const setupGamepadEventListener = () => {
  if (!window.localStorage.getItem("controllerSupportInitialized")) {
    window.localStorage.setItem("controllerSupport", "ENABLE");
    window.localStorage.setItem("controllerSupportInitialized", "1");
    controllerEnabled = true;
  }

  const handleController = (event) => {
    gpIndex = event.gamepad.index;
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[gpIndex];
    if (!gp) return;
    updateLoop();
  };

  const handleControllerDisconnect = () => {
    gpIndex = -1;
    if (animationFrameId) {
      window.cancelAnimationFrame(animationFrameId);
      animationFrameId = undefined;
    }
  };

  window.addEventListener("gamepadconnected", handleController);
  window.addEventListener("gamepaddisconnected", handleControllerDisconnect);
};

window.setControllerEnabled = (b) => {
  controllerEnabled = Boolean(b);
};

setTimeout(setupGamepadEventListener, 1500);
