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

  let startedWithUsername = null;
  let startedWithPassword = null;
  let errorMessage = null;

  const mockWindow = {
    translate: { go: (k) => k },
    session: {
      start: (u, p, { success }) => {
        startedWithUsername = u;
        startedWithPassword = p;
        success();
      },
    },
    main: { events: { login: () => {} } },
    loading: { init: () => {}, destroy: () => {} },
    tvKey: {},
    document: {
      createElement: () => ({ innerHTML: "", appendChild: () => {} }),
      body: { appendChild: () => {}, removeChild: () => {} },
      getElementsByClassName: () => [
        { querySelector: () => ({ value: "crunchy_fan99", focus: () => {} }), classList: { add: () => {}, remove: () => {} } },
        { querySelector: () => ({ value: "secret123", focus: () => {} }), classList: { add: () => {}, remove: () => {} } },
        { classList: { add: () => {}, remove: () => {} } },
      ],
      getElementById: () => ({ focus: () => {}, addEventListener: () => {} }),
    },
  };

  const evalFunc = new Function("window", "document", loginCode);
  evalFunc(mockWindow, mockWindow.document);

  // 1. Test valid plain username submission
  mockWindow.login.error = (msg) => { errorMessage = msg; };
  mockWindow.login.action(2);

  assert.strictEqual(errorMessage, null, "Valid plain username should not trigger validation error");
  assert.strictEqual(startedWithUsername, "crunchy_fan99", "Username should pass to session.start");
  assert.strictEqual(startedWithPassword, "secret123", "Password should pass to session.start");

  // 2. Test valid email submission
  mockWindow.document.getElementsByClassName = () => [
    { querySelector: () => ({ value: "user@example.com", focus: () => {} }), classList: { add: () => {}, remove: () => {} } },
    { querySelector: () => ({ value: "secret123", focus: () => {} }), classList: { add: () => {}, remove: () => {} } },
    { classList: { add: () => {}, remove: () => {} } },
  ];
  startedWithUsername = null;
  errorMessage = null;
  mockWindow.login.action(2);

  assert.strictEqual(errorMessage, null, "Valid email should not trigger validation error");
  assert.strictEqual(startedWithUsername, "user@example.com", "Email should pass to session.start");

  // 3. Test invalid email format rejection
  mockWindow.document.getElementsByClassName = () => [
    { querySelector: () => ({ value: "user@broken", focus: () => {} }), classList: { add: () => {}, remove: () => {} } },
    { querySelector: () => ({ value: "secret123", focus: () => {} }), classList: { add: () => {}, remove: () => {} } },
    { classList: { add: () => {}, remove: () => {} } },
  ];
  startedWithUsername = null;
  errorMessage = null;
  mockWindow.login.action(2);

  assert.strictEqual(startedWithUsername, null, "Broken email should not submit");
  assert.strictEqual(errorMessage, "login.error.invalid", "Broken email should trigger validation error");

  console.log("✓ Authentication & login validation tests passed!");
}

module.exports = { testLoginValidation };
