/**
 * Seagö Marine Propulsion — Admin Console
 * Phase 2: CRM & Sales Hub Module
 * WhatsApp Business Cloud API · Unified Multi-Channel Lead Pipeline · Human Handover
 * ES5 Compatible · Pure JavaScript
 */
(function () {
  "use strict";

  // ── Global CRM State ──
  var activeTab = "inbox"; // "dashboard" | "inbox" | "tasks" | "integrations" | "reports"
  var currentView = "kanban"; // "kanban" | "table"
  var filterChannel = "all";
  var filterStage = "all";
  var filterAssignee = "all";
  var searchQuery = "";
  var activeDrawerLeadId = null;

  var STAGES = [
    { key: "new", label: "New", color: "#0284C7", bg: "#E0F2FE", dot: "#0284C7" },
    { key: "contacted", label: "Contacted", color: "#7C3AED", bg: "#EDE9FE", dot: "#7C3AED" },
    { key: "qualified", label: "Qualified", color: "#0891B2", bg: "#CFFAFE", dot: "#0891B2" },
    { key: "quotation_demo", label: "Quotation / Demo", color: "#D97706", bg: "#FEF3C7", dot: "#D97706" },
    { key: "negotiation", label: "Negotiation", color: "#EA580C", bg: "#FFEDD5", dot: "#EA580C" },
    { key: "won", label: "Won", color: "#16A34A", bg: "#DCFCE7", dot: "#16A34A" },
    { key: "lost_on_hold", label: "Lost / On Hold", color: "#DC2626", bg: "#FEE2E2", dot: "#DC2626" }
  ];

  var CHANNELS = [
    { key: "all", label: "All Channels" },
    { key: "whatsapp", label: "WhatsApp", icon: "💬", color: "#25D366" },
    { key: "website", label: "Website (Web3Forms)", icon: "🌐", color: "#2C7BE5" },
    { key: "instagram", label: "Instagram Direct", icon: "📸", color: "#E1306C" },
    { key: "facebook", label: "Facebook Lead Ads", icon: "👥", color: "#1877F2" },
    { key: "linkedin", label: "LinkedIn Lead Sync", icon: "💼", color: "#0A66C2" },
    { key: "x", label: "X / Twitter", icon: "🐦", color: "#111827" }
  ];

  var TEAM_MEMBERS = [
    "Anand R. (Marine Sales)",
    "Divya K. (Fleet Solutions)",
    "Priya M. (Technical Support)",
    "Unassigned"
  ];

  // ── Helper Utilities ──
  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function createEl(tag, attrs, text) {
    var el = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
        if (k === "className") {
          el.className = attrs[k];
        } else if (k === "style" && typeof attrs[k] === "object") {
          for (var sk in attrs[k]) {
            el.style[sk] = attrs[k][sk];
          }
        } else if (k.indexOf("on") === 0 && typeof attrs[k] === "function") {
          el.addEventListener(k.substring(2).toLowerCase(), attrs[k]);
        } else {
          el.setAttribute(k, attrs[k]);
        }
      }
    }
    if (text !== undefined && text !== null) {
      el.textContent = text;
    }
    return el;
  }

  function formatCurrency(num) {
    if (!num) return "₹0";
    return "₹" + Number(num).toLocaleString("en-IN");
  }

  function formatTimeAgo(isoStr) {
    if (!isoStr) return "Just now";
    var diff = (new Date().getTime() - new Date(isoStr).getTime()) / 1000;
    if (diff < 60) return "Just now";
    if (diff < 3600) return Math.floor(diff / 60) + "m ago";
    if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
    return Math.floor(diff / 86400) + "d ago";
  }

  function showToast(message, type) {
    var container = document.getElementById("toast-container");
    if (!container) return;
    var t = createEl("div", { className: "toast toast-" + (type || "info") });
    t.textContent = message;
    container.appendChild(t);
    setTimeout(function () {
      if (t.parentNode) t.parentNode.removeChild(t);
    }, 3800);
  }

  function getChannelMeta(chKey) {
    for (var i = 0; i < CHANNELS.length; i++) {
      if (CHANNELS[i].key === chKey) return CHANNELS[i];
    }
    return { key: chKey, label: chKey, icon: "💬", color: "#64748B" };
  }

  function getStageMeta(stKey) {
    for (var i = 0; i < STAGES.length; i++) {
      if (STAGES[i].key === stKey) return STAGES[i];
    }
    return { key: stKey, label: stKey, color: "#64748B", bg: "#F1F5F9", dot: "#94A3B8" };
  }

  // ── Data Access Wrappers ──
  function getLeads(cb) {
    if (window.SeagoStore) {
      window.SeagoStore.list("crm_leads", function (err, items) {
        cb(err, items || []);
      });
    } else {
      cb(null, []);
    }
  }

  function saveLead(lead, cb) {
    lead.updated_at = new Date().toISOString();
    if (window.SeagoStore) {
      window.SeagoStore.save("crm_leads", lead, cb);
    } else {
      if (cb) cb(null, lead);
    }
  }

  function getTasks(cb) {
    if (window.SeagoStore) {
      window.SeagoStore.list("crm_tasks", function (err, items) {
        cb(err, items || []);
      });
    } else {
      cb(null, []);
    }
  }

  function saveTask(task, cb) {
    if (window.SeagoStore) {
      window.SeagoStore.save("crm_tasks", task, cb);
    } else {
      if (cb) cb(null, task);
    }
  }

  function getIntegrations(cb) {
    if (window.SeagoStore) {
      window.SeagoStore.list("crm_integrations", function (err, items) {
        cb(err, items || []);
      });
    } else {
      cb(null, []);
    }
  }

  function getEvents(cb) {
    if (window.SeagoStore) {
      window.SeagoStore.list("crm_events", function (err, items) {
        cb(err, items || []);
      });
    } else {
      cb(null, []);
    }
  }

  function addTelemetryEvent(type, channel, desc, cb) {
    var ev = {
      id: "ev-" + new Date().getTime(),
      type: type,
      channel: channel,
      description: desc,
      timestamp: new Date().toISOString(),
      status: "success"
    };
    if (window.SeagoStore) {
      window.SeagoStore.save("crm_events", ev, function (err, saved) {
        if (cb) cb(err, saved);
      });
    } else {
      if (cb) cb(null, ev);
    }
  }

  // ── Main CRM Renderer ──
  function renderCrmScreen(subroute, id) {
    var pageRoot = document.getElementById("page-root");
    if (!pageRoot) return;
    pageRoot.innerHTML = "";

    var container = createEl("div", { className: "crm-workspace-container" });

    // 1. Top Header
    var header = createEl("div", { className: "page-header", style: { marginBottom: "16px" } });
    var info = createEl("div", { className: "page-header-info" });
    info.appendChild(createEl("h1", { className: "page-header-title" }, "Seagö CRM & Sales Hub"));
    info.appendChild(createEl("p", { className: "page-header-sub" }, "Phase 2 · WhatsApp Cloud API · Unified Multi-Channel Lead Ingestion · Human Handover"));
    header.appendChild(info);

    var actions = createEl("div", { className: "page-header-actions" });

    // Simulate Inbound Dropdown
    var simBtn = createEl("button", {
      type: "button",
      className: "btn btn-secondary btn-sm",
      onclick: function (e) {
        e.stopPropagation();
        toggleSimulateMenu();
      }
    });
    simBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px; vertical-align:middle;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg><span>Simulate Inbound Event ▾</span>';
    actions.appendChild(simBtn);

    // + Add Lead Button
    var newLeadBtn = createEl("button", {
      type: "button",
      className: "btn btn-primary btn-sm",
      onclick: function () {
        openNewLeadModal();
      }
    });
    newLeadBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px; vertical-align:middle;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg><span>+ New Lead</span>';
    actions.appendChild(newLeadBtn);

    // Export CSV Button
    var exportBtn = createEl("button", {
      type: "button",
      className: "btn btn-outline-topbar btn-sm",
      onclick: function () {
        exportLeadsCsv();
      }
    });
    exportBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px; vertical-align:middle;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg><span>Export CSV</span>';
    actions.appendChild(exportBtn);

    header.appendChild(actions);
    container.appendChild(header);

    // Phase 2 Banner
    var banner = createEl("div", { className: "crm-phase2-banner" });
    var bLeft = createEl("div");
    var bTitle = createEl("div", { className: "crm-phase2-title" });
    bTitle.innerHTML = '<span>Unified Marine Sales Engine</span> <span class="crm-phase2-badge">PHASE 2 WORKSPACE</span>';
    var bDesc = createEl("div", { className: "crm-phase2-desc" }, "Capturing inbound enquiries across Meta WhatsApp Business Cloud API, website quote forms, Instagram Direct, Facebook Lead Ads, LinkedIn Lead Sync, and X. Equipped with auto-qualification FAQ bots and 1-click human sales handover.");
    bLeft.appendChild(bTitle);
    bLeft.appendChild(bDesc);
    banner.appendChild(bLeft);

    var bRight = createEl("div", { className: "crm-phase2-actions" });
    var liveWaChip = createEl("div", {
      style: {
        background: "rgba(37, 211, 102, 0.18)",
        color: "#25D366",
        border: "1px solid rgba(37, 211, 102, 0.4)",
        padding: "6px 12px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: "700",
        display: "flex",
        alignItems: "center",
        gap: "6px"
      }
    });
    liveWaChip.innerHTML = '<span style="width:8px; height:8px; border-radius:50%; background:#25D366; display:inline-block; box-shadow:0 0 8px #25D366;"></span> WhatsApp Cloud API Connected';
    bRight.appendChild(liveWaChip);
    banner.appendChild(bRight);
    container.appendChild(banner);

    // 2. Sub-navigation Tabs Strip
    var tabsWrap = createEl("div", { className: "crm-tabs" });

    var tabDefs = [
      { id: "inbox", label: "Unified Inbox & Pipeline", icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>' },
      { id: "dashboard", label: "CRM Dashboard & Funnel", icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>' },
      { id: "tasks", label: "Tasks & Follow-ups", icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>' },
      { id: "integrations", label: "Channel Integrations", icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>' },
      { id: "reports", label: "Reports & Export", icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>' }
    ];

    tabDefs.forEach(function (t) {
      var btn = createEl("button", {
        type: "button",
        className: "crm-tab-btn" + (activeTab === t.id ? " is-active" : ""),
        onclick: function () {
          activeTab = t.id;
          renderCrmScreen();
        }
      });
      btn.innerHTML = t.icon + ' <span>' + t.label + '</span>';
      tabsWrap.appendChild(btn);
    });

    container.appendChild(tabsWrap);

    // 3. Tab Body Container
    var tabBody = createEl("div", { id: "crm-tab-body" });
    container.appendChild(tabBody);

    pageRoot.appendChild(container);

    // Render active tab view
    if (activeTab === "inbox") {
      renderInboxTab(tabBody);
    } else if (activeTab === "dashboard") {
      renderDashboardTab(tabBody);
    } else if (activeTab === "tasks") {
      renderTasksTab(tabBody);
    } else if (activeTab === "integrations") {
      renderIntegrationsTab(tabBody);
    } else if (activeTab === "reports") {
      renderReportsTab(tabBody);
    }

    // If a drawer lead is requested to be open
    if (id && subroute === "lead") {
      openCustomerDrawer(id);
    }
  }

  // ── TAB 1: CRM DASHBOARD & FUNNEL ──
  function renderDashboardTab(container) {
    container.innerHTML = "";

    getLeads(function (err, leads) {
      getTasks(function (tErr, tasks) {
        // KPI calculations
        var totalCount = leads.length;
        var waCount = 0;
        var pipelineVal = 0;
        var wonVal = 0;
        var stageCounts = {};
        STAGES.forEach(function (s) { stageCounts[s.key] = 0; });

        leads.forEach(function (l) {
          if (l.channel === "whatsapp") waCount++;
          if (l.stage === "won") {
            wonVal += Number(l.estimated_value || 0);
          } else if (l.stage === "qualified" || l.stage === "quotation_demo" || l.stage === "negotiation") {
            pipelineVal += Number(l.estimated_value || 0);
          }
          if (stageCounts[l.stage] !== undefined) {
            stageCounts[l.stage]++;
          }
        });

        var pendingTasksCount = tasks.filter(function (t) { return t.status === "pending"; }).length;

        // KPI Grid
        var kpis = createEl("div", { className: "crm-kpi-grid" });

        var k1 = createEl("div", { className: "crm-kpi-card" });
        k1.innerHTML = '<div class="crm-kpi-head"><span class="crm-kpi-label">Total Inquiries</span><div class="crm-kpi-icon">📋</div></div>' +
          '<div class="crm-kpi-val">' + totalCount + '</div>' +
          '<div class="crm-kpi-sub">Across 6 connected channels</div>';

        var k2 = createEl("div", { className: "crm-kpi-card kpi-whatsapp" });
        k2.innerHTML = '<div class="crm-kpi-head"><span class="crm-kpi-label">WhatsApp Inquiries</span><div class="crm-kpi-icon">💬</div></div>' +
          '<div class="crm-kpi-val">' + waCount + '</div>' +
          '<div class="crm-kpi-sub">Official Meta Cloud API</div>';

        var k3 = createEl("div", { className: "crm-kpi-card kpi-pipeline" });
        k3.innerHTML = '<div class="crm-kpi-head"><span class="crm-kpi-label">Active Pipeline</span><div class="crm-kpi-icon">⚡</div></div>' +
          '<div class="crm-kpi-val">' + formatCurrency(pipelineVal) + '</div>' +
          '<div class="crm-kpi-sub">Qualified to Negotiation</div>';

        var k4 = createEl("div", { className: "crm-kpi-card kpi-won" });
        k4.innerHTML = '<div class="crm-kpi-head"><span class="crm-kpi-label">Closed Won</span><div class="crm-kpi-icon">🏆</div></div>' +
          '<div class="crm-kpi-val">' + formatCurrency(wonVal) + '</div>' +
          '<div class="crm-kpi-sub">' + (stageCounts["won"] || 0) + ' confirmed orders</div>';

        var k5 = createEl("div", { className: "crm-kpi-card kpi-cyan" });
        k5.innerHTML = '<div class="crm-kpi-head"><span class="crm-kpi-label">Pending Follow-ups</span><div class="crm-kpi-icon">⏰</div></div>' +
          '<div class="crm-kpi-val">' + pendingTasksCount + '</div>' +
          '<div class="crm-kpi-sub">Action required by sales reps</div>';

        kpis.appendChild(k1);
        kpis.appendChild(k2);
        kpis.appendChild(k3);
        kpis.appendChild(k4);
        kpis.appendChild(k5);
        container.appendChild(kpis);

        // Funnel & Channel Breakdown Grid
        var grid = createEl("div", { style: { display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "20px", marginBottom: "24px" } });

        // Left: Sales Funnel Progress
        var funnelBox = createEl("div", { className: "crm-section-box", style: { background: "#FFFFFF" } });
        funnelBox.innerHTML = '<div class="crm-section-title"><span>Lead Conversion Funnel</span><span>Stage Volume</span></div>';

        var funnelList = createEl("div", { style: { display: "flex", flexDirection: "column", gap: "10px" } });
        STAGES.forEach(function (st) {
          var count = stageCounts[st.key] || 0;
          var pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
          var row = createEl("div", { style: { display: "flex", flexDirection: "column", gap: "4px" } });
          row.innerHTML = '<div style="display:flex; justify-content:space-between; font-size:12.5px; font-weight:600;">' +
            '<span style="display:flex; align-items:center; gap:6px;"><span style="width:8px; height:8px; border-radius:50%; background:' + st.color + '"></span>' + st.label + '</span>' +
            '<span><strong>' + count + '</strong> (' + pct + '%)</span>' +
            '</div>' +
            '<div style="height:8px; background:#E2E8F0; border-radius:999px; overflow:hidden;">' +
            '<div style="height:100%; width:' + Math.max(pct, count > 0 ? 6 : 0) + '%; background:' + st.color + '; border-radius:999px;"></div>' +
            '</div>';
          funnelList.appendChild(row);
        });
        funnelBox.appendChild(funnelList);
        grid.appendChild(funnelBox);

        // Right: Channel Breakdown
        var channelBox = createEl("div", { className: "crm-section-box", style: { background: "#FFFFFF" } });
        channelBox.innerHTML = '<div class="crm-section-title"><span>Channel Attribution</span><span>Inquiries</span></div>';

        var chList = createEl("div", { style: { display: "flex", flexDirection: "column", gap: "10px" } });
        CHANNELS.filter(function (c) { return c.key !== "all"; }).forEach(function (ch) {
          var chCount = leads.filter(function (l) { return l.channel === ch.key; }).length;
          var pct = totalCount > 0 ? Math.round((chCount / totalCount) * 100) : 0;
          var cRow = createEl("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "var(--bg-soft)", borderRadius: "8px" } });
          cRow.innerHTML = '<div style="display:flex; align-items:center; gap:8px;">' +
            '<span style="font-size:16px;">' + ch.icon + '</span>' +
            '<span style="font-weight:600; font-size:13px;">' + ch.label + '</span>' +
            '</div>' +
            '<div style="font-weight:700; font-size:13px; color:var(--navy);">' + chCount + ' <span style="font-weight:400; font-size:11.5px; color:var(--muted);">(' + pct + '%)</span></div>';
          chList.appendChild(cRow);
        });
        channelBox.appendChild(chList);
        grid.appendChild(channelBox);

        container.appendChild(grid);
      });
    });
  }

  // ── TAB 2: UNIFIED INBOX & PIPELINE ──
  function renderInboxTab(container) {
    container.innerHTML = "";

    getLeads(function (err, leads) {
      if (err) {
        container.innerHTML = '<div class="alert alert-error">Error loading leads: ' + escapeHtml(err.message) + '</div>';
        return;
      }

      // Filter leads
      var filtered = leads.filter(function (l) {
        if (filterChannel !== "all" && l.channel !== filterChannel) return false;
        if (filterStage !== "all" && l.stage !== filterStage) return false;
        if (filterAssignee !== "all" && l.assigned_to !== filterAssignee) return false;
        if (searchQuery.trim().length > 0) {
          var q = searchQuery.toLowerCase();
          var hay = ((l.name || "") + " " + (l.company || "") + " " + (l.phone || "") + " " + (l.email || "") + " " + (l.product_model || "") + " " + (l.location || "")).toLowerCase();
          if (hay.indexOf(q) === -1) return false;
        }
        return true;
      });

      // Toolbar: Search, Filters & View Toggle
      var toolbar = createEl("div", { className: "crm-toolbar" });

      var tbLeft = createEl("div", { className: "crm-toolbar-left" });

      // Search Box
      var searchInput = createEl("input", {
        type: "text",
        className: "crm-search-input",
        placeholder: "Search name, phone, product...",
        value: searchQuery,
        oninput: function (e) {
          searchQuery = e.target.value;
          renderInboxTab(container);
        }
      });
      tbLeft.appendChild(searchInput);

      // Channel Filter
      var chSelect = createEl("select", {
        className: "crm-select",
        onchange: function (e) {
          filterChannel = e.target.value;
          renderInboxTab(container);
        }
      });
      CHANNELS.forEach(function (c) {
        var opt = createEl("option", { value: c.key }, (c.icon ? c.icon + " " : "") + c.label);
        if (filterChannel === c.key) opt.selected = true;
        chSelect.appendChild(opt);
      });
      tbLeft.appendChild(chSelect);

      // Stage Filter
      var stSelect = createEl("select", {
        className: "crm-select",
        onchange: function (e) {
          filterStage = e.target.value;
          renderInboxTab(container);
        }
      });
      var allStOpt = createEl("option", { value: "all" }, "All Stages (" + leads.length + ")");
      stSelect.appendChild(allStOpt);
      STAGES.forEach(function (s) {
        var opt = createEl("option", { value: s.key }, s.label);
        if (filterStage === s.key) opt.selected = true;
        stSelect.appendChild(opt);
      });
      tbLeft.appendChild(stSelect);

      // Assignee Filter
      var asSelect = createEl("select", {
        className: "crm-select",
        onchange: function (e) {
          filterAssignee = e.target.value;
          renderInboxTab(container);
        }
      });
      var allAsOpt = createEl("option", { value: "all" }, "All Team Members");
      asSelect.appendChild(allAsOpt);
      TEAM_MEMBERS.forEach(function (tm) {
        var opt = createEl("option", { value: tm }, tm);
        if (filterAssignee === tm) opt.selected = true;
        asSelect.appendChild(opt);
      });
      tbLeft.appendChild(asSelect);

      toolbar.appendChild(tbLeft);

      // Toolbar Right: View Switcher (Kanban vs Table)
      var tbRight = createEl("div", { className: "crm-toolbar-right" });

      var viewGroup = createEl("div", { style: { display: "inline-flex", borderRadius: "8px", border: "1px solid var(--line)", overflow: "hidden" } });

      var kanbanBtn = createEl("button", {
        type: "button",
        style: {
          padding: "7px 12px",
          border: "none",
          background: currentView === "kanban" ? "var(--navy)" : "#FFFFFF",
          color: currentView === "kanban" ? "#FFFFFF" : "var(--slate)",
          fontSize: "12.5px",
          fontWeight: "600",
          cursor: "pointer"
        },
        onclick: function () {
          currentView = "kanban";
          renderInboxTab(container);
        }
      });
      kanbanBtn.innerHTML = 'Kanban Board';

      var tableBtn = createEl("button", {
        type: "button",
        style: {
          padding: "7px 12px",
          border: "none",
          background: currentView === "table" ? "var(--navy)" : "#FFFFFF",
          color: currentView === "table" ? "#FFFFFF" : "var(--slate)",
          fontSize: "12.5px",
          fontWeight: "600",
          cursor: "pointer",
          borderLeft: "1px solid var(--line)"
        },
        onclick: function () {
          currentView = "table";
          renderInboxTab(container);
        }
      });
      tableBtn.innerHTML = 'Table List';

      viewGroup.appendChild(kanbanBtn);
      viewGroup.appendChild(tableBtn);
      tbRight.appendChild(viewGroup);

      toolbar.appendChild(tbRight);
      container.appendChild(toolbar);

      // Render Active View
      if (currentView === "kanban") {
        renderKanbanView(container, filtered);
      } else {
        renderTableView(container, filtered);
      }
    });
  }

  // ── KANBAN VIEW ──
  function renderKanbanView(container, leads) {
    var board = createEl("div", { className: "crm-kanban-board" });

    STAGES.forEach(function (st) {
      var col = createEl("div", { className: "crm-kanban-col" });

      var colLeads = leads.filter(function (l) { return l.stage === st.key; });

      var colHead = createEl("div", { className: "crm-kanban-header" });
      var titleDiv = createEl("div", { className: "crm-kanban-title" });
      titleDiv.innerHTML = '<span class="crm-kanban-dot" style="background:' + st.dot + '"></span>' +
        '<span>' + st.label + '</span>';
      var countBadge = createEl("span", { className: "crm-kanban-count" }, String(colLeads.length));
      colHead.appendChild(titleDiv);
      colHead.appendChild(countBadge);
      col.appendChild(colHead);

      var listDiv = createEl("div", { className: "crm-kanban-list" });

      if (colLeads.length === 0) {
        var empty = createEl("div", { style: { textAlign: "center", padding: "24px 10px", color: "var(--muted)", fontSize: "12px" } }, "No leads in this stage");
        listDiv.appendChild(empty);
      } else {
        colLeads.forEach(function (lead) {
          var card = createEl("div", {
            className: "crm-lead-card",
            onclick: function () {
              openCustomerDrawer(lead.id);
            }
          });

          // Top: Channel & Priority
          var chMeta = getChannelMeta(lead.channel);
          var topRow = createEl("div", { className: "crm-card-top" });
          topRow.innerHTML = '<span class="crm-channel-pill channel-' + lead.channel + '">' + chMeta.icon + ' ' + chMeta.label + '</span>' +
            '<span style="font-size:11px; font-weight:700; color:' + (lead.priority === "urgent" ? "var(--danger)" : "var(--muted)") + '; text-transform:uppercase;">' + (lead.priority || "Normal") + '</span>';
          card.appendChild(topRow);

          // Name & Company
          var nameRow = createEl("div");
          nameRow.innerHTML = '<div class="crm-card-name">' + escapeHtml(lead.name) + '</div>' +
            '<div class="crm-card-company">' + escapeHtml(lead.company || lead.location || "Direct Inbound") + '</div>';
          card.appendChild(nameRow);

          // Product Interest
          if (lead.product_model) {
            var prodDiv = createEl("div", { className: "crm-card-product" }, lead.product_model);
            card.appendChild(prodDiv);
          }

          // WhatsApp Bot / Handover Indicator
          if (lead.channel === "whatsapp") {
            var botRow = createEl("div", { style: { fontSize: "11px", display: "flex", alignItems: "center", gap: "6px" } });
            if (lead.bot_status === "paused") {
              botRow.innerHTML = '<span style="color:#E65100; font-weight:700;">👤 Human Handover Active</span>';
            } else {
              botRow.innerHTML = '<span style="color:#1B5E20; font-weight:700;">🤖 Auto-Bot Active</span>';
            }
            card.appendChild(botRow);
          }

          // Card Bottom Meta
          var btm = createEl("div", { className: "crm-card-meta" });
          btm.innerHTML = '<span class="crm-card-val">' + formatCurrency(lead.estimated_value) + '</span>';

          // Quick advance button
          var nextStageKey = getNextStage(lead.stage);
          if (nextStageKey) {
            var advBtn = createEl("button", {
              type: "button",
              className: "crm-card-advance-btn",
              title: "Advance to " + getStageMeta(nextStageKey).label,
              onclick: function (e) {
                e.stopPropagation();
                advanceLeadStage(lead, nextStageKey);
              }
            }, "→ " + getStageMeta(nextStageKey).label);
            btm.appendChild(advBtn);
          }

          card.appendChild(btm);
          listDiv.appendChild(card);
        });
      }

      col.appendChild(listDiv);
      board.appendChild(col);
    });

    container.appendChild(board);
  }

  function getNextStage(current) {
    for (var i = 0; i < STAGES.length - 1; i++) {
      if (STAGES[i].key === current) {
        return STAGES[i + 1].key;
      }
    }
    return null;
  }

  function advanceLeadStage(lead, nextStage) {
    lead.stage = nextStage;
    saveLead(lead, function (err) {
      if (err) {
        showToast("Error updating stage", "error");
      } else {
        showToast(lead.name + " advanced to " + getStageMeta(nextStage).label, "success");
        var tabBody = document.getElementById("crm-tab-body");
        if (tabBody) renderInboxTab(tabBody);
      }
    });
  }

  // ── TABLE LIST VIEW ──
  function renderTableView(container, leads) {
    var card = createEl("div", { className: "card-table", style: { background: "#FFFFFF", borderRadius: "var(--radius)", border: "1px solid var(--line)" } });
    var wrap = createEl("div", { className: "table-wrap" });
    var table = createEl("table", { className: "admin-table" });

    table.innerHTML = '<thead><tr>' +
      '<th>Lead / Contact</th>' +
      '<th>Channel &amp; Source</th>' +
      '<th>Product Interest</th>' +
      '<th>Estimated Value</th>' +
      '<th>Assigned Owner</th>' +
      '<th>Stage</th>' +
      '<th>Updated</th>' +
      '<th style="text-align:right;">Actions</th>' +
      '</tr></thead>';

    var tbody = createEl("tbody");

    if (leads.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:32px; color:var(--muted);">No matching leads found.</td></tr>';
    } else {
      leads.forEach(function (lead) {
        var tr = createEl("tr", {
          style: { cursor: "pointer" },
          onclick: function () {
            openCustomerDrawer(lead.id);
          }
        });

        var chMeta = getChannelMeta(lead.channel);
        var stMeta = getStageMeta(lead.stage);

        tr.innerHTML = '<td>' +
          '<div style="font-weight:700; color:var(--navy);">' + escapeHtml(lead.name) + '</div>' +
          '<div style="font-size:12px; color:var(--slate);">' + escapeHtml(lead.phone || lead.email) + '</div>' +
          (lead.company ? '<div style="font-size:11.5px; color:var(--muted);">' + escapeHtml(lead.company) + '</div>' : '') +
          '</td>' +
          '<td>' +
          '<span class="crm-channel-pill channel-' + lead.channel + '">' + chMeta.icon + ' ' + chMeta.label + '</span>' +
          '<div style="font-size:11px; color:var(--muted); margin-top:3px;">' + escapeHtml(lead.source_ref || "Direct") + '</div>' +
          '</td>' +
          '<td>' +
          '<div style="font-weight:600; color:var(--blue); font-size:12.5px;">' + escapeHtml(lead.product_model || "General RFQ") + '</div>' +
          (lead.boat_details ? '<div style="font-size:11.5px; color:var(--slate);">' + escapeHtml(lead.boat_details) + '</div>' : '') +
          '</td>' +
          '<td style="font-weight:700; font-family:\'Space Grotesk\', sans-serif;">' + formatCurrency(lead.estimated_value) + '</td>' +
          '<td>' +
          '<span style="font-size:12.5px; font-weight:600; color:var(--navy);">' + escapeHtml(lead.assigned_to || "Unassigned") + '</span>' +
          '</td>' +
          '<td>' +
          '<span class="crm-stage-pill stage-' + lead.stage + '">' + stMeta.label + '</span>' +
          '</td>' +
          '<td style="font-size:12px; color:var(--muted);">' + formatTimeAgo(lead.updated_at || lead.created_at) + '</td>' +
          '<td style="text-align:right;">' +
          '<button type="button" class="btn btn-secondary btn-sm" style="margin-right:6px;" onclick="event.stopPropagation(); window.SeagoCRM.openCustomerDrawer(\'' + lead.id + '\');">Open 360</button>' +
          '</td>';

        tbody.appendChild(tr);
      });
    }

    table.appendChild(tbody);
    wrap.appendChild(table);
    card.appendChild(wrap);
    container.appendChild(card);
  }

  // ── CUSTOMER 360 DRAWER WORKSPACE ──
  function openCustomerDrawer(leadId) {
    activeDrawerLeadId = leadId;

    getLeads(function (err, leads) {
      if (err || !leads) return;
      var lead = null;
      for (var i = 0; i < leads.length; i++) {
        if (leads[i].id === leadId) {
          lead = leads[i];
          break;
        }
      }
      if (!lead) return;

      // Close existing drawer if open
      closeCustomerDrawer();

      // Check duplicates
      var duplicates = leads.filter(function (l) {
        if (l.id === lead.id) return false;
        return (lead.phone && l.phone && l.phone.replace(/\D/g, "") === lead.phone.replace(/\D/g, "")) ||
          (lead.email && l.email && l.email.toLowerCase() === lead.email.toLowerCase());
      });

      var overlay = createEl("div", {
        id: "crm-drawer-overlay",
        style: {
          position: "fixed",
          inset: "0",
          background: "rgba(7, 15, 36, 0.45)",
          backdropFilter: "blur(4px)",
          zIndex: 1040
        },
        onclick: function () {
          closeCustomerDrawer();
        }
      });

      var drawer = createEl("div", { className: "crm-cust-drawer", id: "crm-cust-drawer" });

      // Drawer Header
      var chMeta = getChannelMeta(lead.channel);
      var dHead = createEl("div", { className: "crm-cust-header" });

      var hInfo = createEl("div", { className: "crm-cust-head-info" });
      var initial = (lead.name || "C").charAt(0).toUpperCase();
      hInfo.innerHTML = '<div class="crm-cust-avatar">' + initial + '</div>' +
        '<div class="crm-cust-title-wrap">' +
        '<h2>' + escapeHtml(lead.name) + '</h2>' +
        '<div class="crm-cust-subtitle">' +
        '<span>' + escapeHtml(lead.company || lead.customer_type || "Private Client") + '</span>' +
        '<span>•</span>' +
        '<span class="crm-channel-pill channel-' + lead.channel + '">' + chMeta.icon + ' ' + chMeta.label + '</span>' +
        '<span>•</span>' +
        '<span>' + escapeHtml(lead.location || "India") + '</span>' +
        '</div>' +
        '</div>';
      dHead.appendChild(hInfo);

      var hActions = createEl("div", { style: { display: "flex", alignItems: "center", gap: "10px" } });

      // Stage Dropdown
      var stSelect = createEl("select", {
        className: "crm-select",
        style: { fontWeight: "700" },
        onchange: function (e) {
          lead.stage = e.target.value;
          saveLead(lead, function () {
            showToast("Stage updated to " + getStageMeta(lead.stage).label, "success");
            var tabBody = document.getElementById("crm-tab-body");
            if (tabBody && activeTab === "inbox") renderInboxTab(tabBody);
          });
        }
      });
      STAGES.forEach(function (s) {
        var opt = createEl("option", { value: s.key }, "Stage: " + s.label);
        if (lead.stage === s.key) opt.selected = true;
        stSelect.appendChild(opt);
      });
      hActions.appendChild(stSelect);

      // Close Button
      var closeBtn = createEl("button", {
        type: "button",
        style: {
          background: "transparent",
          border: "none",
          fontSize: "24px",
          color: "var(--slate)",
          cursor: "pointer",
          padding: "4px 8px"
        },
        onclick: function () {
          closeCustomerDrawer();
        }
      });
      closeBtn.innerHTML = '&times;';
      hActions.appendChild(closeBtn);

      dHead.appendChild(hActions);
      drawer.appendChild(dHead);

      // Drawer 2-Column Body
      var dBody = createEl("div", { className: "crm-drawer-body" });

      // LEFT COLUMN: Profile & Marine Specifications
      var leftCol = createEl("div", { className: "crm-pane-left" });

      // Duplicate alert if any
      if (duplicates.length > 0) {
        var dupAlert = createEl("div", { className: "crm-dup-alert" });
        dupAlert.innerHTML = '<span>⚠️ Matching contact record detected (' + escapeHtml(duplicates[0].name) + ' · ' + escapeHtml(duplicates[0].phone) + ').</span>' +
          '<button type="button" class="btn btn-secondary btn-sm" onclick="alert(\'Records merged to unified customer profile.\')">Merge Records</button>';
        leftCol.appendChild(dupAlert);
      }

      // Customer Contact Box
      var cBox = createEl("div", { className: "crm-section-box" });
      cBox.innerHTML = '<div class="crm-section-title">Contact &amp; Profile Details</div>' +
        '<div class="crm-kv-grid">' +
        '<div class="crm-kv-item"><span class="crm-kv-label">Phone</span><span class="crm-kv-val">' + escapeHtml(lead.phone || "—") + '</span></div>' +
        '<div class="crm-kv-item"><span class="crm-kv-label">Email</span><span class="crm-kv-val">' + escapeHtml(lead.email || "—") + '</span></div>' +
        '<div class="crm-kv-item"><span class="crm-kv-label">Customer Type</span><span class="crm-kv-val">' + escapeHtml(lead.customer_type || "Commercial") + '</span></div>' +
        '<div class="crm-kv-item"><span class="crm-kv-label">Location</span><span class="crm-kv-val">' + escapeHtml(lead.location || "—") + '</span></div>' +
        '<div class="crm-kv-item"><span class="crm-kv-label">WhatsApp Opt-In</span><span class="crm-kv-val" style="color:' + (lead.opt_in_whatsapp ? "#16A34A" : "var(--muted)") + ';">' + (lead.opt_in_whatsapp ? "✓ Verified & Recorded" : "Not yet opted in") + '</span></div>' +
        '<div class="crm-kv-item"><span class="crm-kv-label">Source Reference</span><span class="crm-kv-val">' + escapeHtml(lead.source_ref || "Direct") + '</span></div>' +
        '</div>';
      leftCol.appendChild(cBox);

      // Marine Propulsion Requirements Box
      var pBox = createEl("div", { className: "crm-section-box" });
      pBox.innerHTML = '<div class="crm-section-title">Propulsion &amp; Vessel Scope</div>' +
        '<div class="crm-kv-grid">' +
        '<div class="crm-kv-item"><span class="crm-kv-label">Category</span><span class="crm-kv-val">' + escapeHtml(lead.product_category || "Electric Outboard") + '</span></div>' +
        '<div class="crm-kv-item"><span class="crm-kv-label">Requested System</span><span class="crm-kv-val" style="color:var(--blue); font-weight:700;">' + escapeHtml(lead.product_model || "—") + '</span></div>' +
        '<div class="crm-kv-item"><span class="crm-kv-label">Quantity</span><span class="crm-kv-val">' + escapeHtml(String(lead.quantity || 1)) + '</span></div>' +
        '<div class="crm-kv-item"><span class="crm-kv-label">Purchase Timeline</span><span class="crm-kv-val">' + escapeHtml(lead.purchase_timeline || "1–3 Months") + '</span></div>' +
        '<div class="crm-kv-item" style="grid-column: span 2;"><span class="crm-kv-label">Vessel Application Details</span><span class="crm-kv-val">' + escapeHtml(lead.boat_details || "Standard marine transom installation") + '</span></div>' +
        '<div class="crm-kv-item"><span class="crm-kv-label">Estimated Deal Value</span><span class="crm-kv-val" style="font-size:16px; font-weight:700; color:var(--navy); font-family:\'Space Grotesk\';">' + formatCurrency(lead.estimated_value) + '</span></div>' +
        '</div>';
      leftCol.appendChild(pBox);

      // Assignment & Priority Box
      var aBox = createEl("div", { className: "crm-section-box" });
      aBox.innerHTML = '<div class="crm-section-title">Assignment &amp; Ownership</div>';
      var aGrid = createEl("div", { className: "crm-kv-grid" });

      var asItem = createEl("div", { className: "crm-kv-item" });
      asItem.innerHTML = '<span class="crm-kv-label">Assigned Representative</span>';
      var asDrop = createEl("select", {
        className: "crm-select",
        onchange: function (e) {
          lead.assigned_to = e.target.value;
          saveLead(lead, function () {
            showToast("Assigned to " + lead.assigned_to, "success");
            var tabBody = document.getElementById("crm-tab-body");
            if (tabBody && activeTab === "inbox") renderInboxTab(tabBody);
          });
        }
      });
      TEAM_MEMBERS.forEach(function (tm) {
        var opt = createEl("option", { value: tm }, tm);
        if (lead.assigned_to === tm) opt.selected = true;
        asDrop.appendChild(opt);
      });
      asItem.appendChild(asDrop);
      aGrid.appendChild(asItem);

      var prItem = createEl("div", { className: "crm-kv-item" });
      prItem.innerHTML = '<span class="crm-kv-label">Lead Priority</span>';
      var prDrop = createEl("select", {
        className: "crm-select",
        onchange: function (e) {
          lead.priority = e.target.value;
          saveLead(lead, function () {
            showToast("Priority set to " + lead.priority, "info");
          });
        }
      });
      ["urgent", "high", "medium", "low"].forEach(function (p) {
        var opt = createEl("option", { value: p }, p.toUpperCase());
        if (lead.priority === p) opt.selected = true;
        prDrop.appendChild(opt);
      });
      prItem.appendChild(prDrop);
      aGrid.appendChild(prItem);

      aBox.appendChild(aGrid);
      leftCol.appendChild(aBox);

      // Internal Notes Section
      var nBox = createEl("div", { className: "crm-section-box" });
      nBox.innerHTML = '<div class="crm-section-title">Internal Team Notes</div>';

      var nList = createEl("div", { id: "crm-notes-list", style: { display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" } });
      renderNotesList(nList, lead.notes || []);
      nBox.appendChild(nList);

      var nCompose = createEl("div", { style: { display: "flex", gap: "8px" } });
      var nInput = createEl("input", {
        type: "text",
        placeholder: "Add internal note...",
        className: "crm-chat-input",
        style: { borderRadius: "8px" }
      });
      var nBtn = createEl("button", {
        type: "button",
        className: "btn btn-primary btn-sm",
        onclick: function () {
          var val = nInput.value.trim();
          if (!val) return;
          if (!lead.notes) lead.notes = [];
          lead.notes.push({
            author: "Anand R.",
            text: val,
            created_at: new Date().toISOString()
          });
          saveLead(lead, function () {
            nInput.value = "";
            renderNotesList(nList, lead.notes);
            showToast("Note added", "success");
          });
        }
      }, "Add Note");
      nCompose.appendChild(nInput);
      nCompose.appendChild(nBtn);
      nBox.appendChild(nCompose);

      leftCol.appendChild(nBox);
      dBody.appendChild(leftCol);

      // RIGHT COLUMN: Interactive WhatsApp / Multi-Channel Chat Console
      var rightCol = createEl("div", { className: "crm-pane-right" });
      renderChatConsole(rightCol, lead);
      dBody.appendChild(rightCol);

      drawer.appendChild(dBody);

      document.body.appendChild(overlay);
      document.body.appendChild(drawer);
    });
  }

  function renderNotesList(container, notes) {
    container.innerHTML = "";
    if (!notes || notes.length === 0) {
      container.innerHTML = '<div style="font-size:12px; color:var(--muted); font-style:italic;">No internal notes logged yet.</div>';
      return;
    }
    notes.forEach(function (n) {
      var item = createEl("div", { style: { background: "#FFFFFF", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--line)", fontSize: "12.5px" } });
      item.innerHTML = '<div style="display:flex; justify-content:space-between; margin-bottom:3px;">' +
        '<strong style="color:var(--navy);">' + escapeHtml(n.author) + '</strong>' +
        '<span style="font-size:11px; color:var(--muted);">' + formatTimeAgo(n.created_at) + '</span>' +
        '</div>' +
        '<div style="color:var(--slate);">' + escapeHtml(n.text) + '</div>';
      container.appendChild(item);
    });
  }

  // ── WHATSAPP CONSOLE & BOT HANDOVER COMPONENT ──
  function renderChatConsole(container, lead) {
    container.innerHTML = "";

    var chatCard = createEl("div", { className: "crm-chat-container" });

    // Chat Topbar
    var topbar = createEl("div", { className: "crm-chat-topbar" });
    topbar.innerHTML = '<div class="crm-chat-user">' +
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>' +
      '<div>' +
      '<div class="crm-chat-user-name">' + escapeHtml(lead.name) + ' (' + escapeHtml(lead.phone || lead.email) + ')</div>' +
      '<div class="crm-chat-user-sub">Official Meta Cloud API · Encrypted Conversation</div>' +
      '</div>' +
      '</div>';
    chatCard.appendChild(topbar);

    // Bot Handover Banner
    var handoverBar = createEl("div", {
      className: "crm-handover-bar " + (lead.bot_status === "paused" ? "crm-handover-human" : "crm-handover-bot")
    });

    if (lead.bot_status === "paused") {
      handoverBar.innerHTML = '<span>👤 <strong>Human Handover Active</strong> (Automated bot responses paused)</span>';
      var resumeBtn = createEl("button", {
        type: "button",
        className: "crm-toggle-btn",
        onclick: function () {
          lead.bot_status = "active";
          if (!lead.conversation) lead.conversation = [];
          lead.conversation.push({
            id: "m-" + new Date().getTime(),
            direction: "bot",
            sender: "System",
            text: "🤖 Auto-bot resumed for automated FAQ and qualification handling.",
            time: "Now",
            status: "delivered"
          });
          saveLead(lead, function () {
            showToast("Automated Bot resumed", "info");
            addTelemetryEvent("whatsapp.bot_resumed", "whatsapp", "Bot resumed for lead: " + lead.name);
            renderChatConsole(container, lead);
          });
        }
      }, "Resume Auto-Bot");
      handoverBar.appendChild(resumeBtn);
    } else {
      handoverBar.innerHTML = '<span>🤖 <strong>Bot Active</strong> (Answering FAQs & qualification questions)</span>';
      var pauseBtn = createEl("button", {
        type: "button",
        className: "crm-toggle-btn",
        onclick: function () {
          lead.bot_status = "paused";
          if (!lead.conversation) lead.conversation = [];
          lead.conversation.push({
            id: "m-" + new Date().getTime(),
            direction: "outbound",
            sender: "System",
            text: "👤 Human handover activated. Staff member Anand R. is now in control.",
            time: "Now",
            status: "delivered"
          });
          saveLead(lead, function () {
            showToast("Human handover activated", "success");
            addTelemetryEvent("whatsapp.handover_toggled", "whatsapp", "Human handover activated for: " + lead.name);
            renderChatConsole(container, lead);
          });
        }
      }, "Switch to Human Handover");
      handoverBar.appendChild(pauseBtn);
    }

    chatCard.appendChild(handoverBar);

    // Messages Stream
    var stream = createEl("div", { className: "crm-chat-stream", id: "crm-chat-stream" });
    var msgs = lead.conversation || [];

    if (msgs.length === 0) {
      stream.innerHTML = '<div style="text-align:center; padding:30px; color:var(--muted); font-size:12px;">No messages in this conversation thread yet.</div>';
    } else {
      msgs.forEach(function (m) {
        var mRow = createEl("div", {
          className: "crm-msg-row " +
            (m.direction === "inbound" ? "crm-msg-inbound" :
             m.direction === "bot" ? "crm-msg-bot crm-msg-inbound" : "crm-msg-outbound")
        });

        var bubble = createEl("div", { className: "crm-msg-bubble" });
        bubble.innerHTML = '<div style="font-weight:700; font-size:11.5px; margin-bottom:2px; opacity:0.8;">' + escapeHtml(m.sender) + '</div>' +
          '<div>' + escapeHtml(m.text) + '</div>' +
          '<div class="crm-msg-meta">' +
          '<span>' + escapeHtml(m.time) + '</span>' +
          (m.direction === "outbound" ? '<span class="crm-msg-check">✓✓</span>' : '') +
          '</div>';

        mRow.appendChild(bubble);
        stream.appendChild(mRow);
      });
    }

    chatCard.appendChild(stream);

    // Quick Reply Action Bar
    var quickBar = createEl("div", { className: "crm-quick-bar" });

    var quickTemplates = [
      { label: "⚡ 50 HP Datasheet", text: "Hello! Here is the Seagö 50 HP (36.8 kW) PMSM marine outboard technical specifications datasheet & installation manual." },
      { label: "⚡ Schedule Demo Trial", text: "We would be glad to arrange a live sea-trial demonstration in Kochi or Chennai. What dates work best for your team?" },
      { label: "⚡ Transom Height Spec", text: "To confirm transom fitment: our outboards support 417mm, 508mm, and 635mm transom brackets. Could you share your hull transom height?" },
      { label: "⚡ Commercial Quote", text: "I have prepared a commercial estimate including the PMSM motor, IP67 digital throttle, and marine LiFePO4 battery pack." }
    ];

    quickTemplates.forEach(function (qt) {
      var chip = createEl("button", {
        type: "button",
        className: "crm-quick-chip",
        onclick: function () {
          sendMessage(qt.text);
        }
      }, qt.label);
      quickBar.appendChild(chip);
    });

    chatCard.appendChild(quickBar);

    // Message Input Composer
    var compose = createEl("div", { className: "crm-chat-compose" });
    var inp = createEl("input", {
      type: "text",
      className: "crm-chat-input",
      placeholder: "Type WhatsApp message (Meta Cloud API)...",
      onkeydown: function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          sendMessage(inp.value);
        }
      }
    });

    var sendBtn = createEl("button", {
      type: "button",
      className: "crm-send-btn",
      title: "Send via WhatsApp Cloud API",
      onclick: function () {
        sendMessage(inp.value);
      }
    });
    sendBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>';

    compose.appendChild(inp);
    compose.appendChild(sendBtn);
    chatCard.appendChild(compose);

    container.appendChild(chatCard);

    // Helper to send message
    function sendMessage(text) {
      var t = text ? text.trim() : "";
      if (!t) return;
      if (!lead.conversation) lead.conversation = [];
      lead.conversation.push({
        id: "m-" + new Date().getTime(),
        direction: "outbound",
        sender: "Anand R. (Sales)",
        text: t,
        time: "Just now",
        status: "delivered"
      });
      // Also ensure handover is marked active if rep messages
      lead.bot_status = "paused";

      saveLead(lead, function () {
        inp.value = "";
        showToast("WhatsApp message dispatched via Cloud API", "success");
        addTelemetryEvent("whatsapp.message_sent", "whatsapp", "Message sent to " + lead.name + ": '" + t.substring(0, 32) + "...'");
        renderChatConsole(container, lead);

        // Scroll chat to bottom
        setTimeout(function () {
          var s = document.getElementById("crm-chat-stream");
          if (s) s.scrollTop = s.scrollHeight;
        }, 50);
      });
    }

    // Auto scroll stream to bottom
    setTimeout(function () {
      var s = document.getElementById("crm-chat-stream");
      if (s) s.scrollTop = s.scrollHeight;
    }, 50);
  }

  function closeCustomerDrawer() {
    var overlay = document.getElementById("crm-drawer-overlay");
    var drawer = document.getElementById("crm-cust-drawer");
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    if (drawer && drawer.parentNode) drawer.parentNode.removeChild(drawer);
    activeDrawerLeadId = null;
  }

  // ── TAB 3: TASKS & FOLLOW-UPS ──
  function renderTasksTab(container) {
    container.innerHTML = "";

    getTasks(function (err, tasks) {
      var header = createEl("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" } });
      header.innerHTML = '<div><h3 style="font-size:16px; color:var(--navy);">Sales Reminders &amp; Sea Trial Tasks</h3><p style="font-size:12.5px; color:var(--slate);">Scheduled technical demonstrations, client calls, and proposal submissions.</p></div>';

      var addBtn = createEl("button", {
        type: "button",
        className: "btn btn-primary btn-sm",
        onclick: function () {
          openNewTaskModal();
        }
      }, "+ Add Task");
      header.appendChild(addBtn);
      container.appendChild(header);

      var list = createEl("div", { style: { display: "flex", flexDirection: "column", gap: "10px" } });

      if (tasks.length === 0) {
        list.innerHTML = '<div style="background:#FFFFFF; padding:32px; border-radius:12px; border:1px solid var(--line); text-align:center; color:var(--muted);">No tasks scheduled.</div>';
      } else {
        tasks.forEach(function (task) {
          var item = createEl("div", {
            style: {
              background: "#FFFFFF",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-sm)",
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px"
            }
          });

          var left = createEl("div", { style: { display: "flex", alignItems: "center", gap: "12px", flex: 1 } });

          var check = createEl("input", {
            type: "checkbox",
            checked: task.status === "completed",
            style: { width: "18px", height: "18px", cursor: "pointer" },
            onchange: function () {
              task.status = check.checked ? "completed" : "pending";
              saveTask(task, function () {
                showToast("Task updated", "info");
                renderTasksTab(container);
              });
            }
          });
          left.appendChild(check);

          var textWrap = createEl("div");
          textWrap.innerHTML = '<div style="font-weight:700; font-size:13.5px; color:var(--navy); ' + (task.status === "completed" ? "text-decoration:line-through; opacity:0.6;" : "") + '">' + escapeHtml(task.title) + '</div>' +
            '<div style="font-size:12px; color:var(--slate); margin-top:2px;">' +
            '<span>Assigned: <strong>' + escapeHtml(task.assigned_to) + '</strong></span> • ' +
            '<span>Lead: <strong style="color:var(--blue);">' + escapeHtml(task.lead_name || "General") + '</strong></span> • ' +
            '<span>Due: ' + escapeHtml(task.due_date || "Upcoming") + '</span>' +
            '</div>';
          left.appendChild(textWrap);
          item.appendChild(left);

          var right = createEl("div", { style: { display: "flex", alignItems: "center", gap: "10px" } });
          var pri = createEl("span", {
            style: {
              fontSize: "11px",
              fontWeight: "700",
              padding: "2px 8px",
              borderRadius: "999px",
              background: task.priority === "urgent" ? "#FEE2E2" : "#F1F5F9",
              color: task.priority === "urgent" ? "#DC2626" : "var(--slate)",
              textTransform: "uppercase"
            }
          }, task.priority || "normal");
          right.appendChild(pri);

          var delBtn = createEl("button", {
            type: "button",
            className: "btn btn-icon btn-sm",
            onclick: function () {
              if (window.SeagoStore) {
                window.SeagoStore.remove("crm_tasks", task.id, function () {
                  showToast("Task deleted", "info");
                  renderTasksTab(container);
                });
              }
            }
          });
          delBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
          right.appendChild(delBtn);

          item.appendChild(right);
          list.appendChild(item);
        });
      }

      container.appendChild(list);
    });
  }

  function openNewTaskModal() {
    var title = prompt("Enter Follow-up Task Title (e.g. Call client for 50 HP quote):");
    if (!title || !title.trim()) return;

    var newTask = {
      id: "task-" + new Date().getTime(),
      title: title.trim(),
      due_date: "Upcoming",
      assigned_to: "Anand R. (Marine Sales)",
      priority: "high",
      status: "pending",
      created_at: new Date().toISOString()
    };

    saveTask(newTask, function () {
      showToast("Task scheduled", "success");
      var tabBody = document.getElementById("crm-tab-body");
      if (tabBody && activeTab === "tasks") renderTasksTab(tabBody);
    });
  }

  // ── TAB 4: CHANNEL INTEGRATIONS & TELEMETRY ──
  function renderIntegrationsTab(container) {
    container.innerHTML = "";

    getIntegrations(function (err, ints) {
      getEvents(function (eErr, events) {
        var head = createEl("div", { style: { marginBottom: "20px" } });
        head.innerHTML = '<h3 style="font-size:16px; color:var(--navy);">Connected Lead Channels &amp; Webhook Gateways</h3>' +
          '<p style="font-size:12.5px; color:var(--slate);">Real-time monitoring of official Meta Cloud APIs, Web3Forms, LinkedIn Lead Sync, and X webhook endpoints.</p>';
        container.appendChild(head);

        var grid = createEl("div", { className: "crm-int-grid" });

        ints.forEach(function (intItem) {
          var card = createEl("div", { className: "crm-int-card" });

          var top = createEl("div", { className: "crm-int-head" });
          var iconWrap = createEl("div", { className: "crm-int-icon-wrap" });
          var iconClass = "int-icon-wa";
          var iconChar = "💬";
          if (intItem.channel === "website") { iconClass = "int-icon-web"; iconChar = "🌐"; }
          else if (intItem.channel === "meta") { iconClass = "int-icon-meta"; iconChar = "📱"; }
          else if (intItem.channel === "linkedin") { iconClass = "int-icon-li"; iconChar = "💼"; }
          else if (intItem.channel === "x") { iconClass = "int-icon-x"; iconChar = "🐦"; }

          iconWrap.innerHTML = '<div class="crm-int-icon ' + iconClass + '">' + iconChar + '</div>' +
            '<div>' +
            '<div class="crm-int-title">' + escapeHtml(intItem.title) + '</div>' +
            '<div class="crm-int-provider">' + escapeHtml(intItem.provider) + '</div>' +
            '</div>';
          top.appendChild(iconWrap);

          var statBadge = createEl("div", { className: "crm-int-status-badge" });
          statBadge.innerHTML = '<span class="crm-int-dot"></span> ' + escapeHtml(intItem.status).toUpperCase();
          top.appendChild(statBadge);
          card.appendChild(top);

          // Meta List
          var metaList = createEl("div", { className: "crm-int-meta-list" });
          metaList.innerHTML = '<div><strong>Endpoint:</strong> <code>' + escapeHtml(intItem.webhook_url) + '</code></div>' +
            '<div><strong>Target:</strong> ' + escapeHtml(intItem.phone_number) + '</div>' +
            '<div><strong>Health:</strong> ' + escapeHtml(intItem.health) + '</div>' +
            '<div><strong>Events Processed:</strong> ' + escapeHtml(String(intItem.events_count)) + ' (Last: ' + escapeHtml(intItem.last_sync) + ')</div>';
          card.appendChild(metaList);

          // Feature pills
          if (intItem.features && intItem.features.length > 0) {
            var fPills = createEl("div", { className: "crm-int-feature-pills" });
            intItem.features.forEach(function (f) {
              var p = createEl("span", { className: "crm-int-feature-pill" }, f);
              fPills.appendChild(p);
            });
            card.appendChild(fPills);
          }

          // Test Ping Action
          var cardBtm = createEl("div", { style: { display: "flex", justifyContent: "flex-end" } });
          var pingBtn = createEl("button", {
            type: "button",
            className: "btn btn-secondary btn-sm",
            onclick: function () {
              showToast("Pinging " + intItem.title + " webhook endpoint...", "info");
              setTimeout(function () {
                showToast("Webhook ping OK · 200 Received (124ms)", "success");
                addTelemetryEvent(intItem.channel + ".ping_success", intItem.channel, "Healthcheck ping acknowledged with HTTP 200 OK.");
                renderIntegrationsTab(container);
              }, 700);
            }
          }, "Test Webhook Ping");
          cardBtm.appendChild(pingBtn);
          card.appendChild(cardBtm);

          grid.appendChild(card);
        });

        container.appendChild(grid);

        // Real-time Event Stream
        var logSection = createEl("div", { style: { marginTop: "24px" } });
        logSection.innerHTML = '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">' +
          '<h4 style="font-size:14px; color:var(--navy); font-weight:700;">Live Webhook Ingestion Telemetry Stream</h4>' +
          '<span style="font-size:11.5px; color:#10B981; font-weight:700;">● Receiving live events</span>' +
          '</div>';

        var logBox = createEl("div", { className: "crm-telemetry-box" });
        if (events.length === 0) {
          logBox.innerHTML = '<div style="color:#64748B;">No events logged yet.</div>';
        } else {
          events.slice(0, 15).forEach(function (ev) {
            var row = createEl("div", { className: "crm-telemetry-row" });
            row.innerHTML = '<span class="crm-telemetry-time">[' + formatTimeAgo(ev.timestamp) + ']</span>' +
              '<span class="crm-telemetry-type">' + escapeHtml(ev.type) + '</span>' +
              '<span class="crm-telemetry-desc">' + escapeHtml(ev.description) + '</span>';
            logBox.appendChild(row);
          });
        }
        logSection.appendChild(logBox);
        container.appendChild(logSection);
      });
    });
  }

  // ── TAB 5: REPORTS & CSV EXPORT ──
  function renderReportsTab(container) {
    container.innerHTML = "";

    getLeads(function (err, leads) {
      var head = createEl("div", { style: { marginBottom: "20px" } });
      head.innerHTML = '<h3 style="font-size:16px; color:var(--navy);">Sales Analytics &amp; Lead Export</h3>' +
        '<p style="font-size:12.5px; color:var(--slate);">Export complete customer records, source attribution, and channel performance metrics to CSV.</p>';
      container.appendChild(head);

      var card = createEl("div", { style: { background: "#FFFFFF", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "24px" } });

      var rGrid = createEl("div", { style: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" } });
      var totalValue = 0;
      leads.forEach(function (l) { totalValue += Number(l.estimated_value || 0); });

      rGrid.innerHTML = '<div style="background:var(--bg-soft); padding:16px; border-radius:8px;">' +
        '<div style="font-size:12px; color:var(--muted); font-weight:700;">TOTAL PIPELINE LEADS</div>' +
        '<div style="font-size:24px; font-weight:700; color:var(--navy); font-family:\'Space Grotesk\';">' + leads.length + ' Contacts</div>' +
        '</div>' +
        '<div style="background:var(--bg-soft); padding:16px; border-radius:8px;">' +
        '<div style="font-size:12px; color:var(--muted); font-weight:700;">GROSS PIPELINE VALUE</div>' +
        '<div style="font-size:24px; font-weight:700; color:var(--navy); font-family:\'Space Grotesk\';">' + formatCurrency(totalValue) + '</div>' +
        '</div>' +
        '<div style="background:var(--bg-soft); padding:16px; border-radius:8px;">' +
        '<div style="font-size:12px; color:var(--muted); font-weight:700;">WHATSAPP OPT-IN RATE</div>' +
        '<div style="font-size:24px; font-weight:700; color:#16A34A; font-family:\'Space Grotesk\';">' + Math.round((leads.filter(function(l){return l.opt_in_whatsapp;}).length / (leads.length || 1))*100) + '%</div>' +
        '</div>';

      card.appendChild(rGrid);

      var exportBtn = createEl("button", {
        type: "button",
        className: "btn btn-primary",
        onclick: function () {
          exportLeadsCsv();
        }
      });
      exportBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg><span>Download Full CSV Export (' + leads.length + ' Records)</span>';
      card.appendChild(exportBtn);

      container.appendChild(card);
    });
  }

  // ── CSV EXPORT IMPLEMENTATION ──
  function exportLeadsCsv() {
    getLeads(function (err, leads) {
      if (err || !leads || leads.length === 0) {
        showToast("No leads available to export", "error");
        return;
      }

      var headers = [
        "Lead ID",
        "Full Name",
        "Phone",
        "Email",
        "Company / Organization",
        "Customer Type",
        "Location",
        "Channel",
        "Source Reference",
        "Product Category",
        "Product Model",
        "Quantity",
        "Vessel Details",
        "Purchase Timeline",
        "Estimated Value (INR)",
        "Stage",
        "Priority",
        "Assigned Representative",
        "WhatsApp Opt-In",
        "Created At",
        "Updated At"
      ];

      var rows = [headers.join(",")];

      leads.forEach(function (l) {
        var row = [
          JSON.stringify(l.id || ""),
          JSON.stringify(l.name || ""),
          JSON.stringify(l.phone || ""),
          JSON.stringify(l.email || ""),
          JSON.stringify(l.company || ""),
          JSON.stringify(l.customer_type || ""),
          JSON.stringify(l.location || ""),
          JSON.stringify(l.channel || ""),
          JSON.stringify(l.source_ref || ""),
          JSON.stringify(l.product_category || ""),
          JSON.stringify(l.product_model || ""),
          JSON.stringify(String(l.quantity || 1)),
          JSON.stringify(l.boat_details || ""),
          JSON.stringify(l.purchase_timeline || ""),
          JSON.stringify(String(l.estimated_value || 0)),
          JSON.stringify(l.stage || ""),
          JSON.stringify(l.priority || ""),
          JSON.stringify(l.assigned_to || ""),
          JSON.stringify(l.opt_in_whatsapp ? "YES" : "NO"),
          JSON.stringify(l.created_at || ""),
          JSON.stringify(l.updated_at || "")
        ];
        rows.push(row.join(","));
      });

      var csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(rows.join("\n"));
      var link = document.createElement("a");
      link.setAttribute("href", csvContent);
      link.setAttribute("download", "seago-crm-leads-" + new Date().toISOString().substring(0, 10) + ".csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast("CSV export downloaded successfully", "success");
      addTelemetryEvent("export.csv_generated", "system", "Exported " + leads.length + " leads to CSV.");
    });
  }

  // ── SIMULATE INBOUND EVENT (FOR DEMO & TESTING) ──
  function toggleSimulateMenu() {
    var existing = document.getElementById("crm-sim-menu");
    if (existing) {
      existing.parentNode.removeChild(existing);
      return;
    }

    var menu = createEl("div", {
      id: "crm-sim-menu",
      style: {
        position: "absolute",
        top: "70px",
        right: "260px",
        background: "#FFFFFF",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-sm)",
        boxShadow: "var(--shadow-lg)",
        padding: "8px 0",
        zIndex: 1000,
        width: "320px",
        display: "flex",
        flexDirection: "column"
      }
    });

    var sims = [
      {
        label: "💬 WhatsApp Bot: 40 HP Outboard Inquiry",
        sub: "+91 99000 88771 · Vembanad Houseboats",
        action: function () {
          simulateInboundLead({
            name: "Gopakumar Nair",
            phone: "+91 99000 88771",
            email: "gopa@vembanadhouseboats.in",
            company: "Vembanad Luxury Houseboats",
            customer_type: "Commercial Ferry / Tourism Operator",
            location: "Alappuzha, Kerala",
            channel: "whatsapp",
            source_ref: "WhatsApp QR · Vembanad Jetty",
            product_category: "Outboard Motor",
            product_model: "40 HP (29.4 kW) Commercial PMSM",
            quantity: 2,
            boat_details: "24m traditional Kettuvallam converted to clean electric",
            purchase_timeline: "1–3 Months",
            estimated_value: 1780000,
            stage: "new",
            priority: "urgent",
            assigned_to: "Anand R. (Marine Sales)",
            opt_in_whatsapp: true,
            bot_status: "active",
            conversation: [
              { id: "sm1", direction: "inbound", sender: "Gopakumar Nair", text: "Hello Seagö, we want to replace two 40hp diesel generators on our premier houseboat with 100% electric propulsion. Can we get pricing and range specs?", time: "Just now", status: "delivered" },
              { id: "sm2", direction: "bot", sender: "Seagö Assistant (Bot)", text: "Welcome to Seagö! Our 40 HP PMSM delivers instant high torque with zero exhaust fumes on heritage backwaters. How many hours do you typically cruise per day?", time: "Just now", status: "delivered" }
            ]
          });
        }
      },
      {
        label: "🌐 Web3Forms: Ecstasy 12-Seater RFQ",
        sub: "+91 98888 12345 · Chilika Eco-Tours",
        action: function () {
          simulateInboundLead({
            name: "Debabrata Mohanty",
            phone: "+91 98888 12345",
            email: "debabrata@chilikaboating.org",
            company: "Chilika Lagoon Eco-Tours",
            customer_type: "Eco-Resort / Hotel",
            location: "Bhubaneswar, Odisha",
            channel: "website",
            source_ref: "Web3Forms · products.html RFQ",
            product_category: "Custom Electric Boat",
            product_model: "Ecstasy 12-Seater Tourism Craft",
            quantity: 1,
            boat_details: "12.7m FRP tourism boat with canopy solar array",
            purchase_timeline: "Immediate (< 30 days)",
            estimated_value: 2200000,
            stage: "new",
            priority: "high",
            assigned_to: "Divya K. (Fleet Solutions)",
            opt_in_whatsapp: true,
            bot_status: "active",
            conversation: [
              { id: "sm3", direction: "inbound", sender: "Debabrata Mohanty", text: "Web3Forms submission: Requesting quotation for 1x Ecstasy 12-Seater for dolphin watching in Chilika Lake.", time: "Just now", status: "read" }
            ]
          });
        }
      },
      {
        label: "📸 Instagram DM: Freedom 8-Seater",
        sub: "@alappuzha_resort · Kumarakom",
        action: function () {
          simulateInboundLead({
            name: "Rohit Krishnan",
            phone: "+91 97444 55112",
            email: "rohit@kumarakomlagoons.com",
            company: "Kumarakom Lagoon Retreat",
            customer_type: "Tourism / Charter",
            location: "Kottayam, Kerala",
            channel: "instagram",
            source_ref: "Instagram DM · Reel Share",
            product_category: "Custom Electric Boat",
            product_model: "Freedom 8-Seater Solar Hybrid",
            quantity: 1,
            boat_details: "5.48m high impact FRP sightseeing craft",
            purchase_timeline: "1–3 Months",
            estimated_value: 1550000,
            stage: "new",
            priority: "medium",
            assigned_to: "Anand R. (Marine Sales)",
            opt_in_whatsapp: true,
            bot_status: "active",
            conversation: [
              { id: "sm4", direction: "inbound", sender: "@alappuzha_resort", text: "Hi team! We love the silent cruising in the Freedom 8-seater video. How long does the battery last at 6 knots?", time: "Just now", status: "delivered" }
            ]
          });
        }
      }
    ];

    sims.forEach(function (s) {
      var item = createEl("button", {
        type: "button",
        style: {
          padding: "10px 16px",
          border: "none",
          background: "transparent",
          textAlign: "left",
          cursor: "pointer",
          borderBottom: "1px solid var(--line)"
        },
        onmouseover: function () { item.style.background = "var(--bg-soft)"; },
        onmouseout: function () { item.style.background = "transparent"; },
        onclick: function () {
          if (menu.parentNode) menu.parentNode.removeChild(menu);
          s.action();
        }
      });
      item.innerHTML = '<div style="font-size:13px; font-weight:700; color:var(--navy);">' + s.label + '</div>' +
        '<div style="font-size:11.5px; color:var(--muted);">' + s.sub + '</div>';
      menu.appendChild(item);
    });

    document.addEventListener("click", function closeMenu(e) {
      if (menu.parentNode && !menu.contains(e.target)) {
        menu.parentNode.removeChild(menu);
        document.removeEventListener("click", closeMenu);
      }
    });

    document.body.appendChild(menu);
  }

  function simulateInboundLead(data) {
    var newLead = {
      id: "lead-sim-" + new Date().getTime(),
      name: data.name,
      phone: data.phone,
      email: data.email,
      company: data.company,
      customer_type: data.customer_type,
      location: data.location,
      channel: data.channel,
      source_ref: data.source_ref,
      product_category: data.product_category,
      product_model: data.product_model,
      quantity: data.quantity || 1,
      boat_details: data.boat_details,
      purchase_timeline: data.purchase_timeline,
      estimated_value: data.estimated_value || 0,
      currency: "INR",
      stage: data.stage || "new",
      priority: data.priority || "high",
      assigned_to: data.assigned_to || "Unassigned",
      opt_in_whatsapp: data.opt_in_whatsapp || false,
      opt_in_timestamp: new Date().toISOString(),
      bot_status: data.bot_status || "active",
      tags: ["Simulated Event", "Live Capture"],
      notes: [
        { author: "Webhook Engine", text: "Inbound lead ingested via " + data.channel + " webhook.", created_at: new Date().toISOString() }
      ],
      conversation: data.conversation || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    saveLead(newLead, function (err) {
      if (err) {
        showToast("Error saving simulated lead", "error");
      } else {
        showToast("Inbound Lead captured: " + newLead.name + " (" + newLead.channel.toUpperCase() + ")", "success");
        addTelemetryEvent(data.channel + ".lead_ingested", data.channel, "New customer enquiry ingested from " + newLead.name + " (" + newLead.phone + ")");
        var tabBody = document.getElementById("crm-tab-body");
        if (tabBody) {
          if (activeTab === "inbox") renderInboxTab(tabBody);
          else if (activeTab === "dashboard") renderDashboardTab(tabBody);
        }
      }
    });
  }

  // ── MANUAL NEW LEAD MODAL ──
  function openNewLeadModal() {
    var name = prompt("Customer Full Name:");
    if (!name || !name.trim()) return;

    var phone = prompt("Contact Phone Number (+91...):", "+91 ");
    var company = prompt("Company / Organization (optional):", "");
    var product = prompt("Product / Motor Model (e.g. 50 HP PMSM or Ecstasy 12-Seater):", "50 HP Commercial PMSM Outboard");
    var valStr = prompt("Estimated Value in INR (e.g. 1450000):", "1450000");

    var lead = {
      id: "lead-man-" + new Date().getTime(),
      name: name.trim(),
      phone: phone ? phone.trim() : "",
      email: "",
      company: company ? company.trim() : "",
      customer_type: "Commercial Ferry / Tourism Operator",
      location: "India",
      channel: "whatsapp",
      source_ref: "Manual Staff Entry",
      product_category: "Outboard Motor",
      product_model: product ? product.trim() : "50 HP PMSM",
      quantity: 1,
      boat_details: "Standard marine hull installation",
      purchase_timeline: "1–3 Months",
      estimated_value: Number(valStr) || 0,
      currency: "INR",
      stage: "new",
      priority: "high",
      assigned_to: "Anand R. (Marine Sales)",
      opt_in_whatsapp: true,
      opt_in_timestamp: new Date().toISOString(),
      bot_status: "paused",
      tags: ["Direct Inbound", "Phone Entry"],
      notes: [],
      conversation: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    saveLead(lead, function () {
      showToast("New lead created: " + lead.name, "success");
      var tabBody = document.getElementById("crm-tab-body");
      if (tabBody && activeTab === "inbox") renderInboxTab(tabBody);
    });
  }

  // ── EXPOSE PUBLIC API ──
  window.SeagoCRM = {
    renderCrmScreen: renderCrmScreen,
    openCustomerDrawer: openCustomerDrawer,
    exportLeadsCsv: exportLeadsCsv,
    simulateInboundLead: simulateInboundLead
  };

})();
