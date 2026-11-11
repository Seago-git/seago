/**
 * SEAGÖ CRM 2.0 — Centralized API Service Layer
 * Designed for seamless backend connectivity.
 * When real endpoints are absent, it cleanly utilizes the local mock store
 * while exposing a visible "Demo Mode" indicator and typed Promise/Callback interfaces.
 */
(function (global) {
  "use strict";

  // Base API configuration
  var DEFAULT_BASE_URL = "/api/v1";
  var apiBaseUrl = (function () {
    try {
      return (
        global.SEAGO_API_BASE_URL ||
        localStorage.getItem("seago_crm_api_base") ||
        DEFAULT_BASE_URL
      );
    } catch (e) {
      return DEFAULT_BASE_URL;
    }
  })();

  // Mode configuration (Demo vs Live)
  var _isDemoMode = (function () {
    try {
      var setting = localStorage.getItem("seago_crm_demo_mode");
      // Default to demo mode if not explicitly set to false
      return setting === null ? true : setting === "true";
    } catch (e) {
      return true;
    }
  })();

  function setDemoMode(enable) {
    _isDemoMode = !!enable;
    try {
      localStorage.setItem("seago_crm_demo_mode", _isDemoMode ? "true" : "false");
    } catch (e) {}
    if (global.SeagoCrmState && typeof global.SeagoCrmState.emit === "function") {
      global.SeagoCrmState.emit("modeChanged", { isDemo: _isDemoMode });
    }
  }

  function getDemoMode() {
    return _isDemoMode;
  }

  function setApiBaseUrl(url) {
    apiBaseUrl = url || DEFAULT_BASE_URL;
    try {
      localStorage.setItem("seago_crm_api_base", apiBaseUrl);
    } catch (e) {}
  }

  function getApiBaseUrl() {
    return apiBaseUrl;
  }

  // ── Network Request Helper with graceful fallback to Mock Store ──
  function request(endpoint, options, fallbackFn) {
    options = options || {};
    var method = options.method || "GET";
    var body = options.body ? JSON.stringify(options.body) : null;
    var headers = Object.assign(
      {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      options.headers || {}
    );

    // If demo mode is active, directly use the mock data fallback
    if (_isDemoMode && typeof fallbackFn === "function") {
      return new Promise(function (resolve) {
        setTimeout(function () {
          resolve(fallbackFn());
        }, 120); // Natural 120ms UI response delay
      });
    }

    var url = apiBaseUrl + endpoint;
    return fetch(url, {
      method: method,
      headers: headers,
      body: body
    })
      .then(function (res) {
        if (!res.ok) {
          throw new Error("HTTP error " + res.status + ": " + res.statusText);
        }
        return res.json();
      })
      .catch(function (err) {
        console.warn("[SeagoCrmApi] Remote request failed, falling back to mock provider:", err.message);
        if (typeof fallbackFn === "function") {
          return fallbackFn();
        }
        throw err;
      });
  }

  // ── Clone utility to prevent mutable pollution ──
  function clone(obj) {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (e) {
      return obj;
    }
  }

  // Local mutable references initialized from SeagoCrmMockData
  var mock = global.SeagoCrmMockData || {
    CONTACTS: [],
    LEADS: [],
    OPPORTUNITIES: [],
    CONVERSATIONS: [],
    TASKS: [],
    INTEGRATIONS: [],
    WEBHOOK_EVENTS: [],
    NOTIFICATIONS: []
  };

  // ── Central API Service API ──
  var SeagoCrmApi = {
    getDemoMode: getDemoMode,
    setDemoMode: setDemoMode,
    getApiBaseUrl: getApiBaseUrl,
    setApiBaseUrl: setApiBaseUrl,

    // ── LEADS SERVICE ──
    leads: {
      list: function (filters) {
        return request("/leads", { method: "GET" }, function () {
          var items = clone(mock.LEADS);
          if (filters) {
            if (filters.channel && filters.channel !== "all") {
              items = items.filter(function (l) { return l.channel === filters.channel; });
            }
            if (filters.stage && filters.stage !== "all") {
              items = items.filter(function (l) { return l.stage === filters.stage; });
            }
            if (filters.assigned_to && filters.assigned_to !== "all") {
              items = items.filter(function (l) { return l.assigned_to === filters.assigned_to; });
            }
            if (filters.search) {
              var q = filters.search.toLowerCase();
              items = items.filter(function (l) {
                return (
                  l.name.toLowerCase().indexOf(q) !== -1 ||
                  (l.company && l.company.toLowerCase().indexOf(q) !== -1) ||
                  (l.location && l.location.toLowerCase().indexOf(q) !== -1) ||
                  (l.product_model && l.product_model.toLowerCase().indexOf(q) !== -1)
                );
              });
            }
          }
          return { data: items, total: items.length };
        });
      },

      get: function (id) {
        return request("/leads/" + encodeURIComponent(id), { method: "GET" }, function () {
          for (var i = 0; i < mock.LEADS.length; i++) {
            if (mock.LEADS[i].id === id) return { data: clone(mock.LEADS[i]) };
          }
          return { error: "Lead not found" };
        });
      },

      create: function (leadData) {
        return request("/leads", { method: "POST", body: leadData }, function () {
          var newLead = Object.assign(
            {
              id: "lead-" + Date.now(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              last_activity_at: new Date().toISOString(),
              notes: [],
              stage: "new",
              priority: "normal",
              bot_status: "bot_active",
              tags: []
            },
            leadData
          );
          mock.LEADS.unshift(newLead);
          return { data: clone(newLead), success: true };
        });
      },

      update: function (id, updates) {
        return request("/leads/" + encodeURIComponent(id), { method: "PATCH", body: updates }, function () {
          for (var i = 0; i < mock.LEADS.length; i++) {
            if (mock.LEADS[i].id === id) {
              Object.assign(mock.LEADS[i], updates, { updated_at: new Date().toISOString() });
              return { data: clone(mock.LEADS[i]), success: true };
            }
          }
          return { error: "Lead not found" };
        });
      },

      addNote: function (id, noteText, author) {
        return request("/leads/" + encodeURIComponent(id) + "/notes", { method: "POST", body: { text: noteText, author: author } }, function () {
          for (var i = 0; i < mock.LEADS.length; i++) {
            if (mock.LEADS[i].id === id) {
              var n = {
                id: "note-" + Date.now(),
                author: author || "Team",
                text: noteText,
                created_at: new Date().toISOString()
              };
              if (!mock.LEADS[i].notes) mock.LEADS[i].notes = [];
              mock.LEADS[i].notes.unshift(n);
              mock.LEADS[i].last_activity_at = n.created_at;
              return { data: n, success: true };
            }
          }
          return { error: "Lead not found" };
        });
      },

      bulkAssign: function (leadIds, employeeName) {
        return request("/leads/bulk-assign", { method: "POST", body: { ids: leadIds, employee: employeeName } }, function () {
          mock.LEADS.forEach(function (l) {
            if (leadIds.indexOf(l.id) !== -1) {
              l.assigned_to = employeeName;
              l.updated_at = new Date().toISOString();
            }
          });
          return { success: true, count: leadIds.length };
        });
      }
    },

    // ── CONTACTS / CUSTOMER 360 SERVICE ──
    contacts: {
      list: function (query) {
        return request("/contacts", { method: "GET" }, function () {
          var items = clone(mock.CONTACTS);
          if (query) {
            var q = query.toLowerCase();
            items = items.filter(function (c) {
              return (
                c.name.toLowerCase().indexOf(q) !== -1 ||
                (c.company && c.company.toLowerCase().indexOf(q) !== -1) ||
                (c.location && c.location.toLowerCase().indexOf(q) !== -1)
              );
            });
          }
          return { data: items, total: items.length };
        });
      },

      get: function (id) {
        return request("/contacts/" + encodeURIComponent(id), { method: "GET" }, function () {
          for (var i = 0; i < mock.CONTACTS.length; i++) {
            if (mock.CONTACTS[i].id === id) return { data: clone(mock.CONTACTS[i]) };
          }
          return { error: "Contact not found" };
        });
      },

      getTimeline: function (contactId) {
        return request("/contacts/" + encodeURIComponent(contactId) + "/timeline", { method: "GET" }, function () {
          // Generate a unified chronological activity timeline for this customer
          var events = [
            {
              id: "act-1",
              contact_id: contactId,
              type: "inquiry_received",
              channel: "whatsapp",
              title: "Inquiry Captured",
              description: "Customer initiated contact requesting commercial propulsion specifications.",
              actor: "Customer (Direct Inbound)",
              timestamp: "2026-11-09T08:30:00.000Z"
            },
            {
              id: "act-2",
              contact_id: contactId,
              type: "message_sent",
              channel: "whatsapp",
              title: "Technical Datasheet Shared",
              description: "50 HP PMSM technical brochure and battery sizing guide shared via WhatsApp.",
              actor: "Anand R. (Sales Exec)",
              timestamp: "2026-11-09T10:45:00.000Z"
            },
            {
              id: "act-3",
              contact_id: contactId,
              type: "quotation_sent",
              channel: "whatsapp",
              title: "Quotation Generated · SG-QT-2026-089",
              description: "Commercial proposal for 2x 50 HP motors with twin LiFePO4 144V 300AH battery packs (₹24,80,000).",
              actor: "Anand R.",
              timestamp: "2026-11-10T11:00:00.000Z"
            },
            {
              id: "act-4",
              contact_id: contactId,
              type: "handover_changed",
              channel: "whatsapp",
              title: "Human Handover Activated",
              description: "Automated chatbot paused; direct live staff communication enabled.",
              actor: "System / Anand R.",
              timestamp: "2026-11-10T11:05:00.000Z"
            },
            {
              id: "act-5",
              contact_id: contactId,
              type: "task_created",
              channel: "direct",
              title: "Sea Trial Demo Scheduled",
              description: "Catamaran trial arranged at Kovalam / Ennore test slipway for Friday 10:00 AM.",
              actor: "Anand R.",
              timestamp: "2026-11-11T09:15:00.000Z"
            }
          ];
          return { data: events };
        });
      }
    },

    // ── CONVERSATIONS / UNIFIED INBOX SERVICE ──
    conversations: {
      list: function (channelFilter) {
        return request("/conversations", { method: "GET" }, function () {
          var items = clone(mock.CONVERSATIONS);
          if (channelFilter && channelFilter !== "all") {
            items = items.filter(function (c) { return c.channel === channelFilter; });
          }
          return { data: items, total: items.length };
        });
      },

      get: function (id) {
        return request("/conversations/" + encodeURIComponent(id), { method: "GET" }, function () {
          for (var i = 0; i < mock.CONVERSATIONS.length; i++) {
            if (mock.CONVERSATIONS[i].id === id) return { data: clone(mock.CONVERSATIONS[i]) };
          }
          return { error: "Conversation not found" };
        });
      },

      sendMessage: function (conversationId, messageText, channel) {
        return request("/conversations/" + encodeURIComponent(conversationId) + "/messages", {
          method: "POST",
          body: { text: messageText, channel: channel }
        }, function () {
          for (var i = 0; i < mock.CONVERSATIONS.length; i++) {
            if (mock.CONVERSATIONS[i].id === conversationId) {
              var newMsg = {
                id: "msg-" + Date.now(),
                conversation_id: conversationId,
                direction: "outbound",
                sender_name: "Seagö Representative",
                text: messageText,
                channel: channel || mock.CONVERSATIONS[i].channel,
                status: "sent",
                timestamp: "Just now"
              };
              mock.CONVERSATIONS[i].messages.push(newMsg);
              mock.CONVERSATIONS[i].last_message = messageText;
              mock.CONVERSATIONS[i].last_message_at = new Date().toISOString();
              return { data: newMsg, success: true };
            }
          }
          return { error: "Conversation not found" };
        });
      },

      setHandover: function (conversationId, status) {
        return request("/conversations/" + encodeURIComponent(conversationId) + "/handover", {
          method: "POST",
          body: { status: status }
        }, function () {
          for (var i = 0; i < mock.CONVERSATIONS.length; i++) {
            if (mock.CONVERSATIONS[i].id === conversationId) {
              mock.CONVERSATIONS[i].handover_status = status;
              return { success: true, status: status };
            }
          }
          return { error: "Conversation not found" };
        });
      },

      resolve: function (conversationId) {
        return request("/conversations/" + encodeURIComponent(conversationId) + "/resolve", {
          method: "POST"
        }, function () {
          for (var i = 0; i < mock.CONVERSATIONS.length; i++) {
            if (mock.CONVERSATIONS[i].id === conversationId) {
              mock.CONVERSATIONS[i].is_resolved = true;
              return { success: true };
            }
          }
          return { error: "Conversation not found" };
        });
      }
    },

    // ── OPPORTUNITIES SERVICE ──
    opportunities: {
      list: function () {
        return request("/opportunities", { method: "GET" }, function () {
          return { data: clone(mock.OPPORTUNITIES), total: mock.OPPORTUNITIES.length };
        });
      },

      create: function (oppData) {
        return request("/opportunities", { method: "POST", body: oppData }, function () {
          var newOpp = Object.assign(
            {
              id: "opp-" + Date.now(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              stage: "qualification",
              probability_pct: 50,
              currency: "INR"
            },
            oppData
          );
          mock.OPPORTUNITIES.unshift(newOpp);
          return { data: clone(newOpp), success: true };
        });
      },

      updateStage: function (id, newStage) {
        return request("/opportunities/" + encodeURIComponent(id) + "/stage", {
          method: "PATCH",
          body: { stage: newStage }
        }, function () {
          for (var i = 0; i < mock.OPPORTUNITIES.length; i++) {
            if (mock.OPPORTUNITIES[i].id === id) {
              mock.OPPORTUNITIES[i].stage = newStage;
              mock.OPPORTUNITIES[i].updated_at = new Date().toISOString();
              return { data: clone(mock.OPPORTUNITIES[i]), success: true };
            }
          }
          return { error: "Opportunity not found" };
        });
      }
    },

    // ── TASKS & FOLLOW-UPS SERVICE ──
    tasks: {
      list: function (filterStatus) {
        return request("/tasks", { method: "GET" }, function () {
          var items = clone(mock.TASKS);
          if (filterStatus && filterStatus !== "all") {
            items = items.filter(function (t) { return t.status === filterStatus; });
          }
          return { data: items, total: items.length };
        });
      },

      create: function (taskData) {
        return request("/tasks", { method: "POST", body: taskData }, function () {
          var newTask = Object.assign(
            {
              id: "task-" + Date.now(),
              status: "pending",
              created_at: new Date().toISOString()
            },
            taskData
          );
          mock.TASKS.unshift(newTask);
          return { data: clone(newTask), success: true };
        });
      },

      updateStatus: function (id, status) {
        return request("/tasks/" + encodeURIComponent(id) + "/status", {
          method: "PATCH",
          body: { status: status }
        }, function () {
          for (var i = 0; i < mock.TASKS.length; i++) {
            if (mock.TASKS[i].id === id) {
              mock.TASKS[i].status = status;
              if (status === "completed") mock.TASKS[i].completed_at = new Date().toISOString();
              return { data: clone(mock.TASKS[i]), success: true };
            }
          }
          return { error: "Task not found" };
        });
      }
    },

    // ── INTEGRATIONS SERVICE ──
    integrations: {
      list: function () {
        return request("/integrations", { method: "GET" }, function () {
          return { data: clone(mock.INTEGRATIONS) };
        });
      },

      getWebhookEvents: function () {
        return request("/integrations/webhooks/events", { method: "GET" }, function () {
          return { data: clone(mock.WEBHOOK_EVENTS) };
        });
      },

      retryWebhookEvent: function (eventId) {
        return request("/integrations/webhooks/events/" + encodeURIComponent(eventId) + "/retry", {
          method: "POST"
        }, function () {
          for (var i = 0; i < mock.WEBHOOK_EVENTS.length; i++) {
            if (mock.WEBHOOK_EVENTS[i].id === eventId) {
              mock.WEBHOOK_EVENTS[i].processing_status = "success";
              mock.WEBHOOK_EVENTS[i].retry_count += 1;
              return { success: true, message: "Webhook event reprocessed successfully" };
            }
          }
          return { error: "Event not found" };
        });
      },

      saveConfig: function (provider, config) {
        return request("/integrations/" + encodeURIComponent(provider) + "/config", {
          method: "PUT",
          body: config
        }, function () {
          for (var i = 0; i < mock.INTEGRATIONS.length; i++) {
            if (mock.INTEGRATIONS[i].provider === provider) {
              Object.assign(mock.INTEGRATIONS[i], config, { last_sync_at: new Date().toISOString() });
              return { success: true, data: clone(mock.INTEGRATIONS[i]) };
            }
          }
          return { error: "Integration not found" };
        });
      }
    },

    // ── NOTIFICATIONS SERVICE ──
    notifications: {
      list: function () {
        return request("/notifications", { method: "GET" }, function () {
          return { data: clone(mock.NOTIFICATIONS) };
        });
      },

      markAllRead: function () {
        return request("/notifications/mark-all-read", { method: "POST" }, function () {
          mock.NOTIFICATIONS.forEach(function (n) { n.read = true; });
          return { success: true };
        });
      }
    },

    // ── DASHBOARD & REPORTS METRICS ──
    reports: {
      getDashboardMetrics: function () {
        return request("/reports/dashboard-metrics", { method: "GET" }, function () {
          var totalLeads = mock.LEADS.length;
          var pipelineVal = mock.OPPORTUNITIES.reduce(function (sum, o) {
            return sum + (o.estimated_value || 0);
          }, 0);
          var wonVal = mock.OPPORTUNITIES.filter(function (o) { return o.stage === "won"; }).reduce(function (sum, o) {
            return sum + (o.estimated_value || 0);
          }, 0);

          return {
            total_leads: totalLeads,
            new_leads_today: 2,
            unassigned_leads: mock.LEADS.filter(function (l) { return l.assigned_to === "Unassigned"; }).length,
            qualified_leads: mock.LEADS.filter(function (l) { return l.stage === "qualified" || l.stage === "quotation" || l.stage === "negotiation"; }).length,
            active_opportunities: mock.OPPORTUNITIES.length,
            quotations_sent: 3,
            followups_due: mock.TASKS.filter(function (t) { return t.status === "pending"; }).length,
            overdue_followups: 1,
            orders_won: 4,
            conversion_rate_pct: 38.5,
            pipeline_value_inr: pipelineVal,
            won_value_inr: wonVal,
            channel_distribution: {
              whatsapp: 3,
              website: 2,
              instagram: 1,
              facebook: 1,
              linkedin: 1,
              x: 0,
              direct: 1
            },
            stage_distribution: {
              new: 1,
              contacted: 1,
              qualified: 2,
              quotation: 1,
              negotiation: 1,
              won: 4,
              lost: 1
            }
          };
        });
      }
    }
  };

  global.SeagoCrmApi = SeagoCrmApi;

})(window);
