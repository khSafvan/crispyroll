/**
 * Core API Service Export & Module Alias
 */

// Ensure window.service exists and alias window.api
if (typeof window !== "undefined") {
  window.api = window.service;
}
