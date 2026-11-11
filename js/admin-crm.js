/**
 * Seagö Marine Propulsion — Admin Console
 * CRM & Customer Inquiries Module
 * Symmetrical · Clean · WhatsApp Cloud API & Web Inquiries · Human Handover
 * ES5 Compatible · Pure JavaScript
 */
(function () {
  "use strict";

  // ── CRM State ──
  var filterChannel = "all";
  var filterStage = "all";
  var searchQuery = "";
  var activeDrawerLeadId = null;

  var STAGES = [
    { key: "new", label: "New", color: "#0284C7" },
    { key: "contacted", label: "Contacted", color: "#7C3AED" },
    { key: "in_progress", label: "In Progress", color: "#D97706" },
    { key: "won", label: "Won", color: "#16A34A" },
    { key: "closed", label: "Closed", color: "#64748B" }
  ];

  var CHANNELS = [
    { key: "all", label: "All Inquiries" },
    { key: "whatsapp", label: "WhatsApp", icon: "💬" },
    { key: "website", label: "Website Form", icon: "🌐" },
    { key: "direct", label: "Direct Inbound", icon: "📞" }
  ];

  var TEAM_MEMBERS = [
    "Anand R.",
    "Divya K.",
    "Priya M.",
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
    if (!num) return "—";
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
    }, 3200);
  }

  function getChannelMeta(chKey) {
    for (var i = 0; i < CHANNELS.length; i++) {
      if (CHANNELS[i].key === chKey) return CHANNELS[i];
    }
    return { key: chKey, label: chKey, icon: "💬" };
  }

  function getStageMeta(stKey) {
    for (var i = 0; i < STAGES.length; i++) {
      if (STAGES[i].key === stKey) return STAGES[i];
    }
    return { key: stKey, label: stKey, color: "#64748B" };
  }

  // ── Data Access ──
  function getLeads(cb) {
    if (window.SeagoStore) {
      window.SeagoStore.list("crm_leads", function (err, items) {
        var leads = items || [];
        // Clean out any old dummy leads with simulated test IDs
        var cleaned = leads.filter(function (l) {
          return l && l.id !== "lead-li-104" && l.id !== "lead-fb-105" && l.id !== "lead-x-106";
        });
        if (cleaned.length !== leads.length) {
          try {
            localStorage.setItem("seago_admin_v1:crm_leads", JSON.stringify(cleaned));
          } catch (e) {}
        }
        cb(err, cleaned);
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

  // ── Main Screen Dispatcher ──
  function renderCrmScreen(subroute, id) {
    var pageRoot = document.getElementById("page-root");
    if (!pageRoot) return;
    pageRoot.innerHTML = "";

    var container = createEl("div", { className: "crm-workspace-container" });

    // 1. Symmetrical Top Header
    var header = createEl("div", { className: "page-header", style: { marginBottom: "6px" } });
    var info = createEl("div", { className: "page-header-info" });
    info.appendChild(createEl("h1", { className: "page-header-title" }, "CRM & Customer Inquiries"));
    info.appendChild(createEl("p", { className: "page-header-sub" }, "Direct inquiries, WhatsApp conversations, and website quote submissions"));
    header.appendChild(info);

    var actions = createEl("div", { className: "page-header-actions" });

    // + Add Inquiry
    var addBtn = createEl("button", {
      type: "button",
      className: "btn btn-primary btn-sm",
      onclick: function () {
        openNewLeadModal();
      }
    });
    addBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg><span>+ Add Inquiry</span>';
    actions.appendChild(addBtn);

    // Export CSV
    var exportBtn = createEl("button", {
      type: "button",
      className: "btn btn-outline-topbar btn-sm",
      onclick: function () {
        exportLeadsCsv();
      }
    });
    exportBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg><span>Export CSV</span>';
    actions.appendChild(exportBtn);

    header.appendChild(actions);
    container.appendChild(header);

    // 2. Symmetrical 3-Card KPI Summary
    getLeads(function (err, leads) {
      var total = leads.length;
      var activeCount = leads.filter(function (l) { return l.stage === "new" || l.stage === "contacted" || l.stage === "in_progress"; }).length;
      var wonCount = leads.filter(function (l) { return l.stage === "won"; }).length;

      var kpiGrid = createEl("div", { className: "crm-kpi-grid" });

      var k1 = createEl("div", { className: "crm-kpi-card" });
      k1.innerHTML = '<div class="crm-kpi-head"><span class="crm-kpi-label">Total Inquiries</span><div class="crm-kpi-icon">📋</div></div>' +
        '<div class="crm-kpi-val">' + total + '</div>' +
        '<div class="crm-kpi-sub">Inbound customer records</div>';

      var k2 = createEl("div", { className: "crm-kpi-card kpi-whatsapp" });
      k2.innerHTML = '<div class="crm-kpi-head"><span class="crm-kpi-label">Active Conversations</span><div class="crm-kpi-icon">💬</div></div>' +
        '<div class="crm-kpi-val">' + activeCount + '</div>' +
        '<div class="crm-kpi-sub">Ongoing quotes &amp; inquiries</div>';

      var k3 = createEl("div", { className: "crm-kpi-card kpi-won" });
      k3.innerHTML = '<div class="crm-kpi-head"><span class="crm-kpi-label">Orders Won</span><div class="crm-kpi-icon">🏆</div></div>' +
        '<div class="crm-kpi-val">' + wonCount + '</div>' +
        '<div class="crm-kpi-sub">Confirmed Seagö outboards</div>';

      kpiGrid.appendChild(k1);
      kpiGrid.appendChild(k2);
      kpiGrid.appendChild(k3);
      container.appendChild(kpiGrid);

      // 3. Symmetrical Toolbar
      var toolbar = createEl("div", { className: "crm-toolbar" });

      var tbLeft = createEl("div", { className: "crm-toolbar-left" });
      var searchInput = createEl("input", {
        type: "text",
        className: "crm-search-input",
        placeholder: "Search customer name, phone, motor...",
        value: searchQuery,
        oninput: function (e) {
          searchQuery = e.target.value;
          renderTableRows(leads);
        }
      });
      tbLeft.appendChild(searchInput);

      var chSelect = createEl("select", {
        className: "crm-select",
        onchange: function (e) {
          filterChannel = e.target.value;
          renderTableRows(leads);
        }
      });
      CHANNELS.forEach(function (c) {
        var opt = createEl("option", { value: c.key }, (c.icon ? c.icon + " " : "") + c.label);
        if (filterChannel === c.key) opt.selected = true;
        chSelect.appendChild(opt);
      });
      tbLeft.appendChild(chSelect);

      toolbar.appendChild(tbLeft);

      var tbRight = createEl("div", { className: "crm-toolbar-right" });
      var stSelect = createEl("select", {
        className: "crm-select",
        onchange: function (e) {
          filterStage = e.target.value;
          renderTableRows(leads);
        }
      });
      var allOpt = createEl("option", { value: "all" }, "All Statuses");
      stSelect.appendChild(allOpt);
      STAGES.forEach(function (s) {
        var opt = createEl("option", { value: s.key }, s.label);
        if (filterStage === s.key) opt.selected = true;
        stSelect.appendChild(opt);
      });
      tbRight.appendChild(stSelect);

      toolbar.appendChild(tbRight);
      container.appendChild(toolbar);

      // 4. Symmetrical Table Card
      var tableCard = createEl("div", { className: "crm-table-card" });
      var table = createEl("table", { className: "crm-table" });

      table.innerHTML = '<thead><tr>' +
        '<th>Customer</th>' +
        '<th>Source</th>' +
        '<th>Motor / Requirements</th>' +
        '<th>Assigned</th>' +
        '<th>Status</th>' +
        '<th>Received</th>' +
        '<th style="text-align:right;">Action</th>' +
        '</tr></thead>';

      var tbody = createEl("tbody", { id: "crm-table-tbody" });
      table.appendChild(tbody);
      tableCard.appendChild(table);
      container.appendChild(tableCard);

      pageRoot.appendChild(container);

      // Render rows
      renderTableRows(leads);

      // Auto-open drawer if requested
      if (id && subroute === "lead") {
        openCustomerDrawer(id);
      }
    });
  }

  function renderTableRows(allLeads) {
    var tbody = document.getElementById("crm-table-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    var filtered = allLeads.filter(function (l) {
      if (filterChannel !== "all" && l.channel !== filterChannel) return false;
      if (filterStage !== "all" && l.stage !== filterStage) return false;
      if (searchQuery.trim().length > 0) {
        var q = searchQuery.toLowerCase();
        var hay = ((l.name || "") + " " + (l.company || "") + " " + (l.phone || "") + " " + (l.product_model || "") + " " + (l.location || "")).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:32px; color:var(--muted);">No matching inquiries found.</td></tr>';
      return;
    }

    filtered.forEach(function (lead) {
      var tr = createEl("tr", {
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
        '</td>' +
        '<td>' +
        '<div style="font-weight:600; color:var(--blue);">' + escapeHtml(lead.product_model || "Electric Outboard") + '</div>' +
        (lead.boat_details ? '<div style="font-size:11.5px; color:var(--slate);">' + escapeHtml(lead.boat_details) + '</div>' : '') +
        '</td>' +
        '<td>' +
        '<span style="font-weight:600; color:var(--navy); font-size:12.5px;">' + escapeHtml(lead.assigned_to || "Unassigned") + '</span>' +
        '</td>' +
        '<td>' +
        '<span class="crm-stage-pill stage-' + lead.stage + '">' + stMeta.label + '</span>' +
        '</td>' +
        '<td style="color:var(--muted); font-size:12px;">' + formatTimeAgo(lead.updated_at || lead.created_at) + '</td>' +
        '<td style="text-align:right;">' +
        '<button type="button" class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); window.SeagoCRM.openCustomerDrawer(\'' + lead.id + '\');">Open</button>' +
        '</td>';

      tbody.appendChild(tr);
    });
  }

  // ── Symmetrical Customer 360 Workspace Drawer ──
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

      closeCustomerDrawer();

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
        '<span>' + escapeHtml(lead.company || "Customer") + '</span>' +
        '<span>•</span>' +
        '<span class="crm-channel-pill channel-' + lead.channel + '">' + chMeta.icon + ' ' + chMeta.label + '</span>' +
        '<span>•</span>' +
        '<span>' + escapeHtml(lead.location || "India") + '</span>' +
        '</div>' +
        '</div>';
      dHead.appendChild(hInfo);

      var hActions = createEl("div", { style: { display: "flex", alignItems: "center", gap: "10px" } });

      var stSelect = createEl("select", {
        className: "crm-select",
        style: { fontWeight: "700" },
        onchange: function (e) {
          lead.stage = e.target.value;
          saveLead(lead, function () {
            showToast("Status updated", "success");
            getLeads(function (err, lds) { renderTableRows(lds); });
          });
        }
      });
      STAGES.forEach(function (s) {
        var opt = createEl("option", { value: s.key }, "Status: " + s.label);
        if (lead.stage === s.key) opt.selected = true;
        stSelect.appendChild(opt);
      });
      hActions.appendChild(stSelect);

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

      // Symmetrical 50/50 Body
      var dBody = createEl("div", { className: "crm-drawer-body" });

      // LEFT COLUMN: Details
      var leftCol = createEl("div", { className: "crm-pane-left" });

      // Contact Box
      var cBox = createEl("div", { className: "crm-section-box" });
      cBox.innerHTML = '<div class="crm-section-title">Customer Contact Details</div>' +
        '<div class="crm-kv-grid">' +
        '<div class="crm-kv-item"><span class="crm-kv-label">Phone</span><span class="crm-kv-val">' + escapeHtml(lead.phone || "—") + '</span></div>' +
        '<div class="crm-kv-item"><span class="crm-kv-label">Email</span><span class="crm-kv-val">' + escapeHtml(lead.email || "—") + '</span></div>' +
        '<div class="crm-kv-item"><span class="crm-kv-label">Company</span><span class="crm-kv-val">' + escapeHtml(lead.company || "—") + '</span></div>' +
        '<div class="crm-kv-item"><span class="crm-kv-label">Location</span><span class="crm-kv-val">' + escapeHtml(lead.location || "India") + '</span></div>' +
        '</div>';
      leftCol.appendChild(cBox);

      // Motor & Requirements Box
      var pBox = createEl("div", { className: "crm-section-box" });
      pBox.innerHTML = '<div class="crm-section-title">Propulsion Requirements</div>' +
        '<div class="crm-kv-grid">' +
        '<div class="crm-kv-item"><span class="crm-kv-label">Requested System</span><span class="crm-kv-val" style="color:var(--blue); font-weight:700;">' + escapeHtml(lead.product_model || "—") + '</span></div>' +
        '<div class="crm-kv-item"><span class="crm-kv-label">Quantity</span><span class="crm-kv-val">' + escapeHtml(String(lead.quantity || 1)) + ' unit(s)</span></div>' +
        '<div class="crm-kv-item" style="grid-column: span 2;"><span class="crm-kv-label">Vessel Details</span><span class="crm-kv-val">' + escapeHtml(lead.boat_details || "Standard transom mount") + '</span></div>' +
        '</div>';
      leftCol.appendChild(pBox);

      // Staff Assignment Box
      var aBox = createEl("div", { className: "crm-section-box" });
      aBox.innerHTML = '<div class="crm-section-title">Assigned Staff</div>';
      var asDrop = createEl("select", {
        className: "crm-select",
        style: { width: "100%" },
        onchange: function (e) {
          lead.assigned_to = e.target.value;
          saveLead(lead, function () {
            showToast("Assigned to " + lead.assigned_to, "success");
            getLeads(function (err, lds) { renderTableRows(lds); });
          });
        }
      });
      TEAM_MEMBERS.forEach(function (tm) {
        var opt = createEl("option", { value: tm }, tm);
        if (lead.assigned_to === tm) opt.selected = true;
        asDrop.appendChild(opt);
      });
      aBox.appendChild(asDrop);
      leftCol.appendChild(aBox);

      // Internal Notes
      var nBox = createEl("div", { className: "crm-section-box" });
      nBox.innerHTML = '<div class="crm-section-title">Internal Notes</div>';
      var nList = createEl("div", { id: "crm-notes-list", style: { display: "flex", flexDirection: "column", gap: "8px", marginBottom: "10px" } });
      renderNotesList(nList, lead.notes || []);
      nBox.appendChild(nList);

      var nCompose = createEl("div", { style: { display: "flex", gap: "8px" } });
      var nInput = createEl("input", {
        type: "text",
        placeholder: "Add note...",
        className: "crm-chat-input"
      });
      var nBtn = createEl("button", {
        type: "button",
        className: "btn btn-primary btn-sm",
        onclick: function () {
          var val = nInput.value.trim();
          if (!val) return;
          if (!lead.notes) lead.notes = [];
          lead.notes.push({
            author: "Staff",
            text: val,
            created_at: new Date().toISOString()
          });
          saveLead(lead, function () {
            nInput.value = "";
            renderNotesList(nList, lead.notes);
            showToast("Note added", "success");
          });
        }
      }, "Add");
      nCompose.appendChild(nInput);
      nCompose.appendChild(nBtn);
      nBox.appendChild(nCompose);
      leftCol.appendChild(nBox);

      dBody.appendChild(leftCol);

      // RIGHT COLUMN: Live Message Thread & Handover
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
      container.innerHTML = '<div style="font-size:12px; color:var(--muted); font-style:italic;">No notes logged.</div>';
      return;
    }
    notes.forEach(function (n) {
      var item = createEl("div", { style: { background: "#FFFFFF", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--line)", fontSize: "12px" } });
      item.innerHTML = '<div style="display:flex; justify-content:space-between; margin-bottom:2px;">' +
        '<strong style="color:var(--navy);">' + escapeHtml(n.author) + '</strong>' +
        '<span style="font-size:11px; color:var(--muted);">' + formatTimeAgo(n.created_at) + '</span>' +
        '</div>' +
        '<div style="color:var(--slate);">' + escapeHtml(n.text) + '</div>';
      container.appendChild(item);
    });
  }

  // ── Symmetrical WhatsApp / Inquiries Chat Console ──
  function renderChatConsole(container, lead) {
    container.innerHTML = "";

    var chatCard = createEl("div", { className: "crm-chat-container" });

    // Topbar
    var topbar = createEl("div", { className: "crm-chat-topbar" });
    topbar.innerHTML = '<div class="crm-chat-user">' +
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>' +
      '<div>' +
      '<div class="crm-chat-user-name">' + escapeHtml(lead.name) + ' (' + escapeHtml(lead.phone || lead.email) + ')</div>' +
      '<div class="crm-chat-user-sub">Official WhatsApp Business Cloud API</div>' +
      '</div>' +
      '</div>';
    chatCard.appendChild(topbar);

    // Bot Handover Bar
    var handoverBar = createEl("div", {
      className: "crm-handover-bar " + (lead.bot_status === "paused" ? "crm-handover-human" : "crm-handover-bot")
    });

    if (lead.bot_status === "paused") {
      handoverBar.innerHTML = '<span>👤 <strong>Human Handover Active</strong></span>';
      var resumeBtn = createEl("button", {
        type: "button",
        className: "crm-toggle-btn",
        onclick: function () {
          lead.bot_status = "active";
          saveLead(lead, function () {
            showToast("Auto-bot resumed", "info");
            renderChatConsole(container, lead);
          });
        }
      }, "Resume Auto-Bot");
      handoverBar.appendChild(resumeBtn);
    } else {
      handoverBar.innerHTML = '<span>🤖 <strong>Auto-Bot Active</strong></span>';
      var pauseBtn = createEl("button", {
        type: "button",
        className: "crm-toggle-btn",
        onclick: function () {
          lead.bot_status = "paused";
          saveLead(lead, function () {
            showToast("Human handover activated", "success");
            renderChatConsole(container, lead);
          });
        }
      }, "Switch to Human Handover");
      handoverBar.appendChild(pauseBtn);
    }

    chatCard.appendChild(handoverBar);

    // Message Stream
    var stream = createEl("div", { className: "crm-chat-stream", id: "crm-chat-stream" });
    var msgs = lead.conversation || [];

    if (msgs.length === 0) {
      stream.innerHTML = '<div style="text-align:center; padding:30px; color:var(--muted); font-size:12px;">No messages in this thread yet.</div>';
    } else {
      msgs.forEach(function (m) {
        var mRow = createEl("div", {
          className: "crm-msg-row " +
            (m.direction === "inbound" ? "crm-msg-inbound" :
             m.direction === "bot" ? "crm-msg-bot crm-msg-inbound" : "crm-msg-outbound")
        });

        var bubble = createEl("div", { className: "crm-msg-bubble" });
        bubble.innerHTML = '<div style="font-weight:700; font-size:11px; margin-bottom:2px; opacity:0.8;">' + escapeHtml(m.sender) + '</div>' +
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

    // Composer
    var compose = createEl("div", { className: "crm-chat-compose" });
    var inp = createEl("input", {
      type: "text",
      className: "crm-chat-input",
      placeholder: "Type reply...",
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
      title: "Send Reply",
      onclick: function () {
        sendMessage(inp.value);
      }
    });
    sendBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>';

    compose.appendChild(inp);
    compose.appendChild(sendBtn);
    chatCard.appendChild(compose);

    container.appendChild(chatCard);

    function sendMessage(text) {
      var t = text ? text.trim() : "";
      if (!t) return;
      if (!lead.conversation) lead.conversation = [];
      lead.conversation.push({
        id: "m-" + new Date().getTime(),
        direction: "outbound",
        sender: "Seagö Sales",
        text: t,
        time: "Just now",
        status: "delivered"
      });
      lead.bot_status = "paused";

      saveLead(lead, function () {
        inp.value = "";
        showToast("Reply sent", "success");
        renderChatConsole(container, lead);
        setTimeout(function () {
          var s = document.getElementById("crm-chat-stream");
          if (s) s.scrollTop = s.scrollHeight;
        }, 50);
      });
    }

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

  // ── CSV Export ──
  function exportLeadsCsv() {
    getLeads(function (err, leads) {
      if (err || !leads || leads.length === 0) {
        showToast("No inquiries available to export", "error");
        return;
      }

      var headers = ["Name", "Phone", "Email", "Company", "Location", "Channel", "Product", "Quantity", "Stage", "Assigned", "Created At"];
      var rows = [headers.join(",")];

      leads.forEach(function (l) {
        var row = [
          JSON.stringify(l.name || ""),
          JSON.stringify(l.phone || ""),
          JSON.stringify(l.email || ""),
          JSON.stringify(l.company || ""),
          JSON.stringify(l.location || ""),
          JSON.stringify(l.channel || ""),
          JSON.stringify(l.product_model || ""),
          JSON.stringify(String(l.quantity || 1)),
          JSON.stringify(l.stage || ""),
          JSON.stringify(l.assigned_to || ""),
          JSON.stringify(l.created_at || "")
        ];
        rows.push(row.join(","));
      });

      var csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(rows.join("\n"));
      var link = document.createElement("a");
      link.setAttribute("href", csvContent);
      link.setAttribute("download", "seago-inquiries-" + new Date().toISOString().substring(0, 10) + ".csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast("CSV downloaded", "success");
    });
  }

  // ── Manual Add Inquiry Modal ──
  function openNewLeadModal() {
    var name = prompt("Customer Full Name:");
    if (!name || !name.trim()) return;

    var phone = prompt("Contact Phone Number (+91...):", "+91 ");
    var product = prompt("Requested Motor (e.g. 50 HP PMSM Outboard):", "Seagö 50 HP PMSM Outboard");

    var lead = {
      id: "lead-" + new Date().getTime(),
      name: name.trim(),
      phone: phone ? phone.trim() : "",
      email: "",
      company: "",
      location: "India",
      channel: "direct",
      product_model: product ? product.trim() : "Seagö Outboard Motor",
      quantity: 1,
      boat_details: "Standard transom mount",
      stage: "new",
      assigned_to: "Anand R.",
      opt_in_whatsapp: true,
      bot_status: "paused",
      notes: [],
      conversation: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    saveLead(lead, function () {
      showToast("Inquiry saved: " + lead.name, "success");
      getLeads(function (err, lds) { renderTableRows(lds); });
    });
  }

  // ── Public Export ──
  window.SeagoCRM = {
    renderCrmScreen: renderCrmScreen,
    openCustomerDrawer: openCustomerDrawer,
    exportLeadsCsv: exportLeadsCsv
  };

})();
