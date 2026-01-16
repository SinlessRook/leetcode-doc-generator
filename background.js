/**
 * LeetCode Documentation Generator - Background Service Worker
 * Handles message routing between content script and popup
 * Minimal coordinator logic for extension lifecycle management
 */

console.log('LeetCode Doc Generator background service worker loaded');

/**
 * Message router between content script and popup
 * Routes messages based on sender and message type
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message, 'from:', sender);
  
  // Determine message source
  const isFromContentScript = sender.tab !== undefined;
  const isFromPopup = !isFromContentScript;
  
  // Route messages based on type and source
  if (message.type === 'PROBLEM_DATA_EXTRACTED') {
    // Content script has extracted data, forward to popup if needed
    // Note: In current architecture, popup directly queries content script
    // This handler is here for future extensibility
    console.log('Problem data extracted by content script:', message.data);
    sendResponse({ success: true, message: 'Data received by background' });
    return true;
  }
  
  // For other message types, allow direct communication
  // The background script acts as a minimal coordinator
  // Most communication happens directly between popup and content script
  console.log('Message passed through background script');
  sendResponse({ success: true, message: 'Message acknowledged by background' });
  return true; // Keep message channel open for async responses
});

/**
 * Handle extension installation or update
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed/updated:', details.reason);
  
  if (details.reason === 'install') {
    console.log('First time installation');
    // Could initialize default storage values here if needed
  } else if (details.reason === 'update') {
    console.log('Extension updated to version:', chrome.runtime.getManifest().version);
  }
});

/**
 * Handle extension startup
 */
chrome.runtime.onStartup.addListener(() => {
  console.log('Extension started');
});

console.log('Background service worker initialized');
