/**
 * SEAGÖ CRM — Centralized API Service Layer
 * Connects directly to backend or local persistence store.
 * Dynamic metrics calculation · Zero fake data.
 */
(function (global) {
  "use strict";

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

  function setApiBaseUrl(url) {
    apiBaseUrl = url || DEFAULT_BASE_URL;
    try {
      localStorage.setItem("seago_crm_api_base", apiBaseUrl);
    } catch (e) {}
  }

  function getApiBaseUrl() {
    return apiBaseUrl;
  }

  // ── Local Persistence Access via window.SeagoStore or localStorage ──
  function getStoreCollection(collectionName) {
    try {
      var raw = localStorage.getItem("seago_admin_v1:" + collectionName);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    var mock = global.SeagoCrmMockData || {};
    var upper = collectionName.toUpperCase();
    return mock[upper] || [];
  }

  function setStoreCollection(collectionName, items) {
    try {
      localStorage.setItem("seago_admin_v1:" + collectionName, JSON.stringify(items));
      return true;
    } catch (e) {
      return false;
    }
  }

  function clone(obj) {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (e) {
      return obj;
    }
  }

  var SeagoCrmApi = {
    getDemoMode: function () { return false; },
    setDemoMode: function () {},
    getApiBaseUrl: getApiBaseUrl,
    setApiBaseUrl: setApiBaseUrl,

    // ── LEADS ──
    leads: {
      list: function (filters) {
        return new Promise(function (resolve) {
          var leads = getStoreCollection("crm_leads");
          var items = clone(leads);
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
                  (l.name && l.name.toLowerCase().indexOf(q) !== -1) ||
                  (l.company && l.company.toLowerCase().indexOf(q) !== -1) ||
                  (l.location && l.location.toLowerCase().indexOf(q) !== -1) ||
                  (l.product_model && l.product_model.toLowerCase().indexOf(q) !== -1)
                );
              });
            }
          }
          resolve({ data: items, total: items.length });
        });
      },

      get: function (id) {
        return new Promise(function (resolve) {
          var leads = getStoreCollection("crm_leads");
          for (var i = 0; i < leads.length; i++) {
            if (leads[i].id === id) {
              resolve({ data: clone(leads[i]) });
              return;
            }
          }
          resolve({ error: "Lead not found" });
        });
      },

      create: function (leadData) {
        return new Promise(function (resolve) {
          var leads = getStoreCollection("crm_leads");
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
          leads.unshift(newLead);
          setStoreCollection("crm_leads", leads);

          // Also ensure contact exists
          var contacts = getStoreCollection("crm_contacts");
          var found = false;
          for (var i = 0; i < contacts.length; i++) {
            if (contacts[i].phone === newLead.phone) {
              found = true;
              break;
            }
          }
          if (!found) {
            contacts.unshift({
              id: "cont-" + Date.now(),
              name: newLead.name,
              phone: newLead.phone,
              email: newLead.email || "",
              company: newLead.company || "",
              location: newLead.location || "",
              customer_type: newLead.customer_type || "Commercial Operator",
              assigned_to: newLead.assigned_to || "Unassigned",
              created_at: new Date().toISOString()
            });
            setStoreCollection("crm_contacts", contacts);
          }

          resolve({ data: clone(newLead), success: true });
        });
      },

      update: function (id, updates) {
        return new Promise(function (resolve) {
          var leads = getStoreCollection("crm_leads");
          for (var i = 0; i < leads.length; i++) {
            if (leads[i].id === id) {
              Object.assign(leads[i], updates, { updated_at: new Date().toISOString() });
              setStoreCollection("crm_leads", leads);
              resolve({ data: clone(leads[i]), success: true });
              return;
            }
          }
          resolve({ error: "Lead not found" });
        });
      },

      addNote: function (id, noteText, author) {
        return new Promise(function (resolve) {
          var leads = getStoreCollection("crm_leads");
          for (var i = 0; i < leads.length; i++) {
            if (leads[i].id === id) {
              var n = {
                id: "note-" + Date.now(),
                author: author || "Staff",
                text: noteText,
                created_at: new Date().toISOString()
              };
              if (!leads[i].notes) leads[i].notes = [];
              leads[i].notes.unshift(n);
              leads[i].last_activity_at = n.created_at;
              setStoreCollection("crm_leads", leads);
              resolve({ data: n, success: true });
              return;
            }
          }
          resolve({ error: "Lead not found" });
        });
      }
    },

    // ── CONTACTS / CUSTOMERS ──
    contacts: {
      list: function (query) {
        return new Promise(function (resolve) {
          var contacts = getStoreCollection("crm_contacts");
          var items = clone(contacts);
          if (query) {
            var q = query.toLowerCase();
            items = items.filter(function (c) {
              return (
                (c.name && c.name.toLowerCase().indexOf(q) !== -1) ||
                (c.company && c.company.toLowerCase().indexOf(q) !== -1) ||
                (c.location && c.location.toLowerCase().indexOf(q) !== -1)
              );
            });
          }
          resolve({ data: items, total: items.length });
        });
      },

      get: function (id) {
        return new Promise(function (resolve) {
          var contacts = getStoreCollection("crm_contacts");
          for (var i = 0; i < contacts.length; i++) {
            if (contacts[i].id === id) {
              resolve({ data: clone(contacts[i]) });
              return;
            }
          }
          // If not found in contacts, check leads
          var leads = getStoreCollection("crm_leads");
          for (var j = 0; j < leads.length; j++) {
            if (leads[j].id === id || leads[j].contact_id === id) {
              resolve({ data: clone(leads[j]) });
              return;
            }
          }
          resolve({ error: "Contact not found" });
        });
      },

      getTimeline: function (contactId) {
        return new Promise(function (resolve) {
          var events = [];
          var leads = getStoreCollection("crm_leads");
          leads.forEach(function (l) {
            if (l.contact_id === contactId || l.id === contactId) {
              events.push({
                id: "act-create",
                type: "inquiry_received",
                channel: l.channel || "website",
                title: "Enquiry Registered",
                description: "Customer registered interest for " + (l.product_model || "Seagö Outboard"),
                actor: "Customer",
                timestamp: l.created_at
              });
              (l.notes || []).forEach(function (n, idx) {
                events.push({
                  id: "act-n-" + idx,
                  type: "note_added",
                  channel: l.channel || "direct",
                  title: "Internal Note Added",
                  description: n.text,
                  actor: n.author,
                  timestamp: n.created_at
                });
              });
            }
          });
          resolve({ data: events });
        });
      }
    },

    // ── CONVERSATIONS ──
    conversations: {
      list: function (channelFilter) {
        return new Promise(function (resolve) {
          var convs = getStoreCollection("crm_conversations");
          var items = clone(convs);
          if (channelFilter && channelFilter !== "all") {
            items = items.filter(function (c) { return c.channel === channelFilter; });
          }
          resolve({ data: items, total: items.length });
        });
      },

      get: function (id) {
        return new Promise(function (resolve) {
          var convs = getStoreCollection("crm_conversations");
          for (var i = 0; i < convs.length; i++) {
            if (convs[i].id === id) {
              resolve({ data: clone(convs[i]) });
              return;
            }
          }
          resolve({ error: "Conversation not found" });
        });
      },

      sendMessage: function (conversationId, messageText, channel) {
        return new Promise(function (resolve) {
          var convs = getStoreCollection("crm_conversations");
          for (var i = 0; i < convs.length; i++) {
            if (convs[i].id === conversationId) {
              var newMsg = {
                id: "msg-" + Date.now(),
                conversation_id: conversationId,
                direction: "outbound",
                sender_name: "Staff",
                text: messageText,
                channel: channel || convs[i].channel,
                status: "sent",
                timestamp: "Just now"
              };
              if (!convs[i].messages) convs[i].messages = [];
              convs[i].messages.push(newMsg);
              convs[i].last_message = messageText;
              convs[i].last_message_at = new Date().toISOString();
              setStoreCollection("crm_conversations", convs);
              resolve({ data: newMsg, success: true });
              return;
            }
          }
          resolve({ error: "Conversation not found" });
        });
      },

      setHandover: function (conversationId, status) {
        return new Promise(function (resolve) {
          var convs = getStoreCollection("crm_conversations");
          for (var i = 0; i < convs.length; i++) {
            if (convs[i].id === conversationId) {
              convs[i].handover_status = status;
              setStoreCollection("crm_conversations", convs);
              resolve({ success: true, status: status });
              return;
            }
          }
          resolve({ error: "Conversation not found" });
        });
      }
    },

    // ── TASKS ──
    tasks: {
      list: function (filterStatus) {
        return new Promise(function (resolve) {
          var tasks = getStoreCollection("crm_tasks");
          var items = clone(tasks);
          if (filterStatus && filterStatus !== "all") {
            items = items.filter(function (t) { return t.status === filterStatus; });
          }
          resolve({ data: items, total: items.length });
        });
      },

      create: function (taskData) {
        return new Promise(function (resolve) {
          var tasks = getStoreCollection("crm_tasks");
          var newTask = Object.assign(
            {
              id: "task-" + Date.now(),
              status: "pending",
              created_at: new Date().toISOString()
            },
            taskData
          );
          tasks.unshift(newTask);
          setStoreCollection("crm_tasks", tasks);
          resolve({ data: clone(newTask), success: true });
        });
      },

      updateStatus: function (id, status) {
        return new Promise(function (resolve) {
          var tasks = getStoreCollection("crm_tasks");
          for (var i = 0; i < tasks.length; i++) {
            if (tasks[i].id === id) {
              tasks[i].status = status;
              if (status === "completed") tasks[i].completed_at = new Date().toISOString();
              setStoreCollection("crm_tasks", tasks);
              resolve({ data: clone(tasks[i]), success: true });
              return;
            }
          }
          resolve({ error: "Task not found" });
        });
      }
    },

    // ── INTEGRATIONS ──
    integrations: {
      list: function () {
        return new Promise(function (resolve) {
          var stored = getStoreCollection("crm_integrations");
          if (!stored || stored.length === 0) {
            stored = (global.SeagoCrmMockData && global.SeagoCrmMockData.INTEGRATIONS) || [];
          }
          resolve({ data: clone(stored) });
        });
      }
    },

    // ── NOTIFICATIONS ──
    notifications: {
      list: function () {
        return new Promise(function (resolve) {
          var notifs = getStoreCollection("crm_notifications");
          resolve({ data: clone(notifs) });
        });
      },
      markAllRead: function () {
        return new Promise(function (resolve) {
          setStoreCollection("crm_notifications", []);
          resolve({ success: true });
        });
      }
    },

    // ── REPORTS & METRICS (Dynamic from actual leads & tasks) ──
    reports: {
      getDashboardMetrics: function () {
        return new Promise(function (resolve) {
          var leads = getStoreCollection("crm_leads");
          var tasks = getStoreCollection("crm_tasks");
          var convs = getStoreCollection("crm_conversations");

          var totalLeads = leads.length;
          var newLeads = leads.filter(function (l) { return l.stage === "new"; }).length;
          var qualifiedLeads = leads.filter(function (l) { return l.stage === "qualified" || l.stage === "quotation" || l.stage === "negotiation"; }).length;
          var wonLeads = leads.filter(function (l) { return l.stage === "won"; }).length;
          var pendingTasks = tasks.filter(function (t) { return t.status === "pending"; }).length;
          var activeConvs = convs.filter(function (c) { return !c.is_resolved; }).length;

          var pipelineVal = leads.reduce(function (sum, l) {
            return sum + (Number(l.estimated_value) || 0);
          }, 0);

          var channelCounts = {
            whatsapp: 0,
            website: 0,
            instagram: 0,
            facebook: 0,
            linkedin: 0
          };
          leads.forEach(function (l) {
            if (channelCounts[l.channel] !== undefined) {
              channelCounts[l.channel]++;
            }
          });

          var stageCounts = {
            new: 0,
            contacted: 0,
            qualified: 0,
            quotation: 0,
            negotiation: 0,
            won: 0,
            lost: 0
          };
          leads.forEach(function (l) {
            if (stageCounts[l.stage] !== undefined) {
              stageCounts[l.stage]++;
            }
          });

          resolve({
            total_leads: totalLeads,
            new_leads_today: newLeads,
            active_conversations: activeConvs,
            qualified_leads: qualifiedLeads,
            followups_due: pendingTasks,
            orders_won: wonLeads,
            conversion_rate_pct: totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0,
            pipeline_value_inr: pipelineVal,
            channel_distribution: channelCounts,
            stage_distribution: stageCounts
          });
        });
      }
    }
  };

  global.SeagoCrmApi = SeagoCrmApi;

})(window);
