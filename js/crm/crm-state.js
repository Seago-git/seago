/**
 * SEAGÖ CRM 2.0 — Reactive State Store & Event Bus
 * Pure ES5 compatible event dispatcher and state container.
 */
(function (global) {
  "use strict";

  var listeners = {};

  var state = {
    activeTab: "overview", // 'overview' | 'inbox' | 'leads' | 'contacts' | 'opportunities' | 'tasks' | 'products' | 'reports' | 'integrations' | 'settings'
    subRoute: "",
    selectedId: null,

    // Leads & Contacts
    leadViewMode: "table", // 'table' | 'kanban'
    leadFilters: {
      channel: "all",
      stage: "all",
      assigned_to: "all",
      search: ""
    },
    activeLeadDrawerId: null,

    // Inbox
    activeConversationId: "conv-1",
    inboxChannelFilter: "all",

    // Opportunities
    oppViewMode: "kanban", // 'kanban' | 'table'

    // Tasks
    taskViewMode: "list", // 'list' | 'calendar'
    taskFilter: "all",

    // Integrations active tab
    activeIntegrationId: "whatsapp"
  };

  var SeagoCrmState = {
    get: function () {
      return state;
    },

    set: function (key, value) {
      state[key] = value;
      this.emit("change:" + key, value);
      this.emit("change", state);
    },

    setLeadFilter: function (filterKey, val) {
      state.leadFilters[filterKey] = val;
      this.emit("change:leadFilters", state.leadFilters);
    },

    on: function (event, callback) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(callback);
    },

    off: function (event, callback) {
      if (!listeners[event]) return;
      listeners[event] = listeners[event].filter(function (cb) { return cb !== callback; });
    },

    emit: function (event, data) {
      if (!listeners[event]) return;
      for (var i = 0; i < listeners[event].length; i++) {
        try {
          listeners[event][i](data);
        } catch (e) {
          console.error("[SeagoCrmState Error]", e);
        }
      }
    }
  };

  global.SeagoCrmState = SeagoCrmState;

})(window);
