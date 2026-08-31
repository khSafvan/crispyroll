/**
 * Authentication & Login Validation Unit Tests
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

function testLoginValidation() {
  console.log("Running Authentication & Login Validation Tests...");

  const loginCode = fs.readFileSync(
    path.resolve(__dirname, "../src/renderer/screens/login.js"),
    "utf8"
  );

  // 1. Verify login.js includes split-screen layout with warning text for disabled TV login
  assert(loginCode.includes("Fast TV Login"), "login.js must contain Fast TV Login column");
  assert(
    loginCode.includes("tv-login-warning-text") &&
      loginCode.includes("Not working properly — please use manual login"),
    "login.js must render warning label for disabled Fast TV login"
  );
  assert(
    loginCode.includes("disabled-qr-container"),
    "login.js must render disabled QR container"
  );
  assert(loginCode.includes("openForgotPassword"), "login.js must define openForgotPassword");
  assert(
    loginCode.includes("togglePasswordVisibility"),
    "login.js must define togglePasswordVisibility"
  );

  // 3. Test simulated login screen execution
  let startedWithUsername = null;
  let startedWithPassword = null;

  const mockPassInput = { value: "secret123", focus: () => {}, type: "password" };

  const mockWindow = {
    translate: { go: (k) => k },
    session: {
      storage: { account: {} },
      start: (opts) => {
        startedWithUsername = opts.username;
        startedWithPassword = opts.password;
        opts.success?.();
      },
    },
    service: {
      deviceCode: (req) => {
        req.success?.({
          user_code: "ab12cd",
          device_code: "mock-device-uuid",
          expires_in: 300,
        });
      },
      pollDeviceToken: () => {},
    },
    profilesScreen: { init: () => {} },
    main: { state: "" },
    tvKey: {},
    document: {
      createElement: () => ({
        innerHTML: "",
        appendChild: () => {},
        className: "",
        remove: () => {},
      }),
      body: { appendChild: () => {}, removeChild: () => {} },
      querySelectorAll: () => [],
      querySelector: () => null,
      getElementById: (id) => {
        if (id === "login-username") return { value: "crunchy_fan99", focus: () => {} };
        if (id === "login-password") return mockPassInput;
        if (id === "login-submit") return { classList: { add: () => {}, remove: () => {} } };
        if (id === "login-btn-text") return { innerHTML: "", textContent: "" };
        if (id === "login-error-message") return { style: { display: "none" }, textContent: "" };
        if (id === "icon-toggle-password" || id === "icon-toggle-password-wrapper") return { innerHTML: "", className: "" };
        return { focus: () => {}, addEventListener: () => {}, setAttribute: () => {} };
      },
    },
  };

  const evalFunc = new Function("window", "document", loginCode);
  evalFunc(mockWindow, mockWindow.document);

  // 4. Test manual login submission
  mockWindow.login.action(3);

  assert.strictEqual(startedWithUsername, "crunchy_fan99", "Username should pass to session.start");
  assert.strictEqual(startedWithPassword, "secret123", "Password should pass to session.start");

  // 5. Test password toggle
  const passEl = mockWindow.document.getElementById("login-password");
  mockWindow.login.togglePasswordVisibility();
  assert.strictEqual(passEl.type, "text", "Password input type should toggle to text");
  mockWindow.login.togglePasswordVisibility();
  assert.strictEqual(passEl.type, "password", "Password input type should toggle back to password");

  console.log("✓ Authentication & login validation tests passed!");
}

module.exports = { testLoginValidation };
