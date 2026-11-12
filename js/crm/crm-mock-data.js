/**
 * SEAGÖ CRM — Data Stores & Integration Statuses
 * Clean production-ready data arrays (Zero fake data).
 */
(function (global) {
  "use strict";

  var CONTACTS = [];
  var LEADS = [];
  var OPPORTUNITIES = [];
  var CONVERSATIONS = [];
  var TASKS = [];
  var NOTIFICATIONS = [];
  var WEBHOOK_EVENTS = [];

  var INTEGRATIONS = [
    {
      id: "int-whatsapp",
      provider: "whatsapp",
      name: "WhatsApp Business Cloud API",
      status: "disconnected",
      phone_number: null,
      phone_number_id: null,
      waba_id: null,
      app_id: null,
      token_masked: null,
      webhook_status: "not_configured",
      last_sync_at: null,
      last_event_at: null,
      last_error: "Not configured. Enter Meta Cloud API credentials.",
      capabilities: ["Two-Way Messaging", "Automated Chatbot", "Template Notifications", "Media Attachments"]
    },
    {
      id: "int-web3forms",
      provider: "website",
      name: "Web3Forms Ingestion",
      status: "disconnected",
      access_key_masked: null,
      webhook_status: "not_configured",
      last_sync_at: null,
      last_event_at: null,
      last_error: "Not configured. Provide Web3Forms access key.",
      capabilities: ["Quote Request Form", "Contact & Showroom Form", "Lead Mapping", "Auto-Responder"]
    },
    {
      id: "int-facebook",
      provider: "facebook",
      name: "Facebook Lead Ads & Page Sync",
      status: "disconnected",
      page_name: null,
      page_id: null,
      ad_account: null,
      webhook_status: "not_configured",
      last_sync_at: null,
      last_event_at: null,
      last_error: "Not connected. Authorize Facebook Page access.",
      capabilities: ["Instant Lead Forms", "Page Messages", "Campaign Attribution"]
    },
    {
      id: "int-instagram",
      provider: "instagram",
      name: "Instagram Professional Messaging",
      status: "disconnected",
      account_handle: null,
      account_id: null,
      webhook_status: "not_configured",
      last_sync_at: null,
      last_event_at: null,
      last_error: "Not connected. Link Professional Instagram account.",
      capabilities: ["Direct Message Sync", "Story Mentions", "Lead Capture Automation"]
    },
    {
      id: "int-linkedin",
      provider: "linkedin",
      name: "LinkedIn Lead Sync API",
      status: "disconnected",
      organization: null,
      ad_account: null,
      webhook_status: "not_configured",
      last_sync_at: null,
      last_event_at: null,
      last_error: "Not connected. Requires approved Lead Sync app.",
      capabilities: ["Lead Gen Forms", "Sponsored InMail Sync"]
    },
    {
      id: "int-x",
      provider: "x",
      name: "X (Twitter) Developer API",
      status: "disconnected",
      account_handle: null,
      api_tier: null,
      webhook_status: "not_configured",
      last_sync_at: null,
      last_event_at: null,
      last_error: "Not connected. Enter X Developer API credentials.",
      capabilities: ["Direct Message Sync", "Public Mention Ingestion"]
    }
  ];

  global.SeagoCrmMockData = {
    CONTACTS: CONTACTS,
    LEADS: LEADS,
    OPPORTUNITIES: OPPORTUNITIES,
    CONVERSATIONS: CONVERSATIONS,
    TASKS: TASKS,
    INTEGRATIONS: INTEGRATIONS,
    WEBHOOK_EVENTS: WEBHOOK_EVENTS,
    NOTIFICATIONS: NOTIFICATIONS
  };

})(window);
