/**
 * SEAGÖ CRM — Core Views & Screen Renderers
 * 6 Main Modules:
 * 1. Overview  2. Leads  3. Customers  4. Inbox  5. Tasks  6. Integrations
 * Plus Two-Column Customer Details Interface.
 * Pure JavaScript · ES5 Compatible.
 */
(function (global) {
  "use strict";

  var UI = global.SeagoCrmUI;
  var API = global.SeagoCrmApi;
  var State = global.SeagoCrmState;

  var cEl = UI.createEl;
  var esc = UI.escapeHtml;

  // ═════════════════════════════════════════════════════════════════════════
  // 1. OVERVIEW DASHBOARD VIEW
  // ═════════════════════════════════════════════════════════════════════════
  function renderOverview(container) {
    container.innerHTML = "";
    var wrap = cEl("div", { className: "crm-view-wrap" });

    // Header
    var header = cEl("div", { className: "crm-view-header" });
    header.innerHTML = [
      '<div class="crm-vh-left">',
      '  <div class="crm-breadcrumbs"><span>CRM</span> <span class="crm-bc-sep">/</span> <span class="crm-bc-active">Overview</span></div>',
      '  <h1 class="crm-vh-title">Executive Sales Overview</h1>',
      '  <p class="crm-vh-sub">Consolidated customer enquiries, active conversations, pipeline progression, and follow-ups.</p>',
      '</div>',
      '<div class="crm-vh-actions">',
      '  <button type="button" class="btn btn-secondary btn-sm" id="crmExportAllBtn">Export CSV</button>',
      '  <button type="button" class="btn btn-primary btn-sm" id="crmNewLeadQuickBtn">+ Add Enquiry</button>',
      '</div>'
    ].join("");
    wrap.appendChild(header);

    // Development Mode Banner
    wrap.appendChild(UI.renderDemoModeBanner());

    // Fetch real stored entities dynamically
    Promise.all([
      API.leads.list(),
      API.tasks.list(),
      API.inbox.getConversations()
    ]).then(function (results) {
      var leads = (results[0] && results[0].data) || [];
      var tasks = (results[1] && results[1].data) || [];
      var convs = (results[2] && results[2].data) || [];

      var totalLeads = leads.length;
      var newLeads = leads.filter(function (l) { return l.status === "new"; }).length;
      var activeConvs = convs.filter(function (c) { return c.status !== "resolved"; }).length;
      var qualLeads = leads.filter(function (l) { return l.status === "qualified"; }).length;
      var followupsDue = tasks.filter(function (t) { return t.status === "pending"; }).length;
      var ordersWon = leads.filter(function (l) { return l.status === "won"; }).length;

      // 6 Main KPI Cards
      var kpiGrid = cEl("div", { className: "crm-kpi-grid-6" });
      kpiGrid.appendChild(UI.renderKpiCard("Total Enquiries", totalLeads, "Across all channels", UI.ICONS.website, "kpi-navy"));
      kpiGrid.appendChild(UI.renderKpiCard("New Leads", newLeads, "Awaiting first response", UI.ICONS.direct, "kpi-blue"));
      kpiGrid.appendChild(UI.renderKpiCard("Active Conversations", activeConvs, "Live customer threads", UI.ICONS.whatsapp, "kpi-cyan"));
      kpiGrid.appendChild(UI.renderKpiCard("Qualified Leads", qualLeads, "Commercial fit validated", '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>', "kpi-success"));
      kpiGrid.appendChild(UI.renderKpiCard("Follow-ups Due", followupsDue, followupsDue === 0 ? "All tasks up to date" : followupsDue + " pending actions", '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>', "kpi-orange"));
      kpiGrid.appendChild(UI.renderKpiCard("Orders Won", ordersWon, "Commercial contracts closed", '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>', "kpi-green"));
      wrap.appendChild(kpiGrid);

      // 2-Column Dashboard Below Metrics
      var dashCols = cEl("div", { className: "crm-dash-columns" });

      // Left Column: Sales Pipeline & Enquiries by Source
      var leftCol = cEl("div", { className: "crm-dash-col" });

      // Dynamic Pipeline Funnel Calculation
      var stages = [
        { key: "new", label: "New", color: "#0284C7" },
        { key: "contacted", label: "Contacted", color: "#7C3AED" },
        { key: "qualified", label: "Qualified", color: "#2563EB" },
        { key: "demo", label: "Quotation / Demo", color: "#D97706" },
        { key: "negotiation", label: "Negotiation", color: "#EA580C" },
        { key: "won", label: "Won", color: "#16A34A" },
        { key: "lost", label: "Lost / On Hold", color: "#64748B" }
      ];

      var pipeCard = cEl("div", { className: "crm-card" });
      var funnelRows = stages.map(function (s) {
        var count = leads.filter(function (l) { return l.status === s.key; }).length;
        var pct = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;
        return [
          '<div class="crm-funnel-row">',
          '  <span class="funnel-label">' + esc(s.label) + '</span>',
          '  <div class="funnel-bar-wrap"><div class="funnel-bar" style="width:' + (count > 0 ? Math.max(pct, 12) : 0) + '%; background:' + s.color + ';"></div></div>',
          '  <span class="funnel-val">' + count + ' ' + (count === 1 ? 'Lead' : 'Leads') + '</span>',
          '</div>'
        ].join("");
      }).join("");

      pipeCard.innerHTML = [
        '<div class="crm-card-head"><h3 class="crm-card-title">Sales Pipeline Overview</h3><span class="crm-card-badge">7 Stages</span></div>',
        '<div class="crm-pipeline-funnel">' + funnelRows + '</div>'
      ].join("");
      leftCol.appendChild(pipeCard);

      // Enquiries by Source (Dynamic)
      var sources = [
        { key: "whatsapp", label: "WhatsApp Business", icon: UI.ICONS.whatsapp, color: "#25D366" },
        { key: "website", label: "Website Form", icon: UI.ICONS.website, color: "#0284C7" },
        { key: "instagram", label: "Instagram DM", icon: UI.ICONS.instagram, color: "#E1306C" },
        { key: "facebook", label: "Facebook Lead Ads", icon: UI.ICONS.facebook, color: "#1877F2" },
        { key: "linkedin", label: "LinkedIn Lead Sync", icon: UI.ICONS.linkedin, color: "#0A66C2" }
      ];

      var sourcesCard = cEl("div", { className: "crm-card" });
      var sourceRows = sources.map(function (src) {
        var count = leads.filter(function (l) { return (l.source || "").toLowerCase().indexOf(src.key) !== -1; }).length;
        var pct = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;
        return [
          '<div class="crm-ch-row">',
          '  <div class="ch-left">' + src.icon + '<span>' + esc(src.label) + '</span></div>',
          '  <div class="ch-bar-wrap"><div class="ch-bar" style="width:' + (count > 0 ? Math.max(pct, 8) : 0) + '%; background:' + src.color + ';"></div></div>',
          '  <span class="ch-count">' + count + ' (' + pct + '%)</span>',
          '</div>'
        ].join("");
      }).join("");

      sourcesCard.innerHTML = [
        '<div class="crm-card-head"><h3 class="crm-card-title">Enquiries by Source</h3><span class="crm-card-badge">Channels</span></div>',
        '<div class="crm-channel-breakdown">' + sourceRows + '</div>'
      ].join("");
      leftCol.appendChild(sourcesCard);

      dashCols.appendChild(leftCol);

      // Right Column: Recent Activity, Pending Follow-ups, Team Assignments
      var rightCol = cEl("div", { className: "crm-dash-col" });

      // Pending Follow-ups (Dynamic)
      var actionsCard = cEl("div", { className: "crm-card" });
      var pendingTasks = tasks.filter(function (t) { return t.status === "pending"; });
      var tasksHtml = "";

      if (pendingTasks.length === 0) {
        tasksHtml = '<div style="padding:28px 16px;text-align:center;color:#64748B;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom:8px;opacity:0.6;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg><p style="margin:0;font-size:13px;">No pending follow-ups scheduled.</p></div>';
      } else {
        tasksHtml = pendingTasks.slice(0, 3).map(function (t) {
          return [
            '<div class="crm-action-item">',
            '  <div class="act-badge act-urgent">' + esc(t.due_date || "DUE SOON") + '</div>',
            '  <div class="act-info"><h4>' + esc(t.title) + '</h4><p>' + esc(t.description || t.assigned_to) + '</p></div>',
            '  <button class="btn btn-sm btn-outline-primary act-btn" onclick="location.hash=\'#/crm/tasks\'">View</button>',
            '</div>'
          ].join("");
        }).join("");
      }

      actionsCard.innerHTML = [
        '<div class="crm-card-head"><h3 class="crm-card-title">Pending Follow-ups</h3><span class="crm-card-badge ' + (pendingTasks.length > 0 ? 'crm-badge-urgent' : '') + '">' + pendingTasks.length + ' Pending</span></div>',
        '<div class="crm-actions-list">' + tasksHtml + '</div>'
      ].join("");
      rightCol.appendChild(actionsCard);

      // Recent Customer Activity (Dynamic)
      var actCard = cEl("div", { className: "crm-card" });
      var actHtml = "";

      if (leads.length === 0) {
        actHtml = '<div style="padding:28px 16px;text-align:center;color:#64748B;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom:8px;opacity:0.6;"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg><p style="margin:0;font-size:13px;">No customer activity recorded yet.</p></div>';
      } else {
        actHtml = leads.slice(0, 4).map(function (l) {
          return [
            '<div class="recent-act-row">',
            '  <div class="act-dot dot-cyan"></div>',
            '  <div class="act-desc"><strong>' + esc(l.customer_name) + '</strong> (' + esc(l.company || 'Direct') + ') — ' + esc(l.requirements || l.interested_product) + '</div>',
            '  <span class="act-time">' + esc(l.last_activity || 'Recent') + '</span>',
            '</div>'
          ].join("");
        }).join("");
      }

      actCard.innerHTML = [
        '<div class="crm-card-head"><h3 class="crm-card-title">Recent Customer Activity</h3><span class="crm-card-badge">Live Stream</span></div>',
        '<div class="crm-recent-act-list">' + actHtml + '</div>'
      ].join("");
      rightCol.appendChild(actCard);

      // Team Assignments (Dynamic)
      var teamReps = ["Anand R.", "Priya M.", "Divya K."];
      var teamCard = cEl("div", { className: "crm-card" });
      var teamRows = teamReps.map(function (rep) {
        var initials = rep.split(" ").map(function (w) { return w[0]; }).join("");
        var assignedCount = leads.filter(function (l) { return l.assigned_employee === rep; }).length;
        return [
          '<div class="crm-team-row">',
          '  <div class="team-user"><div class="team-avatar">' + esc(initials) + '</div><div><strong>' + esc(rep) + '</strong><div class="team-sub">Commercial &amp; Tourism Accounts</div></div></div>',
          '  <span class="team-count"><strong>' + assignedCount + '</strong> ' + (assignedCount === 1 ? 'Enquiry' : 'Enquiries') + '</span>',
          '</div>'
        ].join("");
      }).join("");

      teamCard.innerHTML = [
        '<div class="crm-card-head"><h3 class="crm-card-title">Team Assignments</h3><span class="crm-card-badge">Active Reps</span></div>',
        '<div class="crm-team-list">' + teamRows + '</div>'
      ].join("");
      rightCol.appendChild(teamCard);

      dashCols.appendChild(rightCol);
      wrap.appendChild(dashCols);
    });

    container.appendChild(wrap);

    var expBtn = wrap.querySelector("#crmExportAllBtn");
    if (expBtn) expBtn.addEventListener("click", exportAllCsv);
    var newBtn = wrap.querySelector("#crmNewLeadQuickBtn");
    if (newBtn) newBtn.addEventListener("click", openNewInquiryModal);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 2. LEADS MANAGEMENT VIEW (Table & Kanban Views)
  // ═════════════════════════════════════════════════════════════════════════
  function renderLeads(container, leadId) {
    if (leadId) {
      renderCustomerDetails(container, null, leadId);
      return;
    }

    container.innerHTML = "";
    var wrap = cEl("div", { className: "crm-view-wrap" });

    var header = cEl("div", { className: "crm-view-header" });
    header.innerHTML = [
      '<div class="crm-vh-left">',
      '  <div class="crm-breadcrumbs"><span>CRM</span> <span class="crm-bc-sep">/</span> <span class="crm-bc-active">Leads</span></div>',
      '  <h1 class="crm-vh-title">Lead Management</h1>',
      '  <p class="crm-vh-sub">Filter, assign, track stages, and inspect customer fleet requirements.</p>',
      '</div>',
      '<div class="crm-vh-actions">',
      '  <div class="crm-view-switcher">',
      '    <button type="button" class="crm-sw-btn ' + (State.get().leadViewMode === "table" ? "is-active" : "") + '" id="btnLeadViewTable"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>Table</button>',
      '    <button type="button" class="crm-sw-btn ' + (State.get().leadViewMode === "kanban" ? "is-active" : "") + '" id="btnLeadViewKanban"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;"><rect x="3" y="3" width="7" height="18"></rect><rect x="14" y="3" width="7" height="18"></rect></svg>Kanban</button>',
      '  </div>',
      '  <button type="button" class="btn btn-secondary btn-sm" id="btnExportLeadsCsv">Export CSV</button>',
      '  <button type="button" class="btn btn-primary btn-sm" id="btnCreateNewLead">+ Add Enquiry</button>',
      '</div>'
    ].join("");
    wrap.appendChild(header);

    // Filter & Search Toolbar
    var toolbar = cEl("div", { className: "crm-leads-toolbar" });
    toolbar.innerHTML = [
      '<div class="crm-tb-left">',
      '  <input type="text" class="crm-input crm-search-box" id="leadSearchInput" placeholder="Search customer, company, location, motor HP...">',
      '  <select class="crm-select" id="leadChannelFilter">',
      '    <option value="all">All Channels</option>',
      '    <option value="whatsapp">WhatsApp</option>',
      '    <option value="website">Website Form</option>',
      '    <option value="instagram">Instagram</option>',
      '    <option value="facebook">Facebook</option>',
      '    <option value="linkedin">LinkedIn</option>',
      '  </select>',
      '  <select class="crm-select" id="leadStageFilter">',
      '    <option value="all">All Stages</option>',
      '    <option value="new">New</option>',
      '    <option value="contacted">Contacted</option>',
      '    <option value="qualified">Qualified</option>',
      '    <option value="quotation">Quotation / Demo</option>',
      '    <option value="negotiation">Negotiation</option>',
      '    <option value="won">Won</option>',
      '    <option value="lost">Lost / On Hold</option>',
      '  </select>',
      '</div>',
      '<div class="crm-tb-right" id="leadBulkActions" style="display:none;">',
      '  <span class="bulk-count" id="bulkSelectedCount">0 selected</span>',
      '  <button type="button" class="btn btn-secondary btn-sm" id="btnBulkAssign">Assign Employee</button>',
      '</div>'
    ].join("");
    wrap.appendChild(toolbar);

    var contentArea = cEl("div", { id: "leadsContentArea" });
    wrap.appendChild(contentArea);
    container.appendChild(wrap);

    function renderCurrentView() {
      contentArea.innerHTML = "";
      var mode = State.get().leadViewMode;
      var filters = State.get().leadFilters;

      API.leads.list(filters).then(function (res) {
        var leads = res.data || [];
        if (mode === "kanban") {
          renderKanbanPipeline(contentArea, leads);
        } else {
          renderLeadsTable(contentArea, leads);
        }
      });
    }

    // ── Table View ──
    function renderLeadsTable(target, leads) {
      if (leads.length === 0) {
        target.appendChild(UI.renderEmptyState("No Leads Found", "Try adjusting your search criteria or channel filters."));
        return;
      }

      var card = cEl("div", { className: "crm-table-card" });
      var table = cEl("table", { className: "crm-table" });
      table.innerHTML = [
        '<thead>',
        '  <tr>',
        '    <th style="width:36px;"><input type="checkbox" id="chkLeadSelectAll"></th>',
        '    <th>Customer</th>',
        '    <th>Company</th>',
        '    <th>Source</th>',
        '    <th>Interested Product &amp; Requirements</th>',
        '    <th>Status</th>',
        '    <th>Priority</th>',
        '    <th>Assigned Employee</th>',
        '    <th>Last Activity</th>',
        '    <th>Next Follow-up</th>',
        '    <th style="text-align:right;">Action</th>',
        '  </tr>',
        '</thead>',
        '<tbody id="leadsTableBody"></tbody>'
      ].join("");

      var tbody = table.querySelector("#leadsTableBody");
      leads.forEach(function (lead) {
        var tr = cEl("tr");
        tr.innerHTML = [
          '<td><input type="checkbox" class="chk-lead-row" data-id="' + lead.id + '"></td>',
          '<td><div class="tbl-cust-name"><strong>' + esc(lead.name) + '</strong></div><div class="tbl-cust-sub">' + esc(lead.phone) + '</div></td>',
          '<td><div class="tbl-cust-name">' + esc(lead.company || "—") + '</div><div class="tbl-cust-sub">' + esc(lead.location) + '</div></td>',
          '<td>' + UI.renderChannelBadge(lead.channel).outerHTML + '</td>',
          '<td><div class="tbl-prod">' + esc(lead.product_model) + '</div><div class="tbl-val">' + (lead.vessel_length ? esc(lead.vessel_length) + ' · ' : '') + UI.formatCurrency(lead.estimated_value) + '</div></td>',
          '<td>' + UI.renderStageBadge(lead.stage).outerHTML + '</td>',
          '<td>' + UI.renderPriorityBadge(lead.priority).outerHTML + '</td>',
          '<td><span class="tbl-assignee">' + esc(lead.assigned_to) + '</span></td>',
          '<td><span class="tbl-act-time">' + UI.formatTimeAgo(lead.last_activity_at) + '</span></td>',
          '<td><span class="tbl-followup">' + (lead.next_followup ? UI.formatDateShort(lead.next_followup) : "None scheduled") + '</span></td>',
          '<td style="text-align:right;"><button type="button" class="btn btn-secondary btn-sm btn-open-lead" data-id="' + lead.id + '">View Details &rarr;</button></td>'
        ].join("");

        tr.addEventListener("click", function (e) {
          if (e.target.tagName === "INPUT" || e.target.tagName === "BUTTON") return;
          renderCustomerDetails(container, lead.contact_id, lead.id);
        });

        tr.querySelector(".btn-open-lead").addEventListener("click", function (e) {
          e.stopPropagation();
          renderCustomerDetails(container, lead.contact_id, lead.id);
        });

        tbody.appendChild(tr);
      });

      card.appendChild(table);
      target.appendChild(card);

      // Checkbox multi-select
      var chkAll = table.querySelector("#chkLeadSelectAll");
      var rowChks = table.querySelectorAll(".chk-lead-row");
      var bulkBar = wrap.querySelector("#leadBulkActions");
      var bulkCount = wrap.querySelector("#bulkSelectedCount");

      function updateBulkBar() {
        var checked = Array.from(rowChks).filter(function (c) { return c.checked; });
        if (checked.length > 0) {
          bulkBar.style.display = "flex";
          bulkCount.textContent = checked.length + " selected";
        } else {
          bulkBar.style.display = "none";
        }
      }

      chkAll.addEventListener("change", function () {
        rowChks.forEach(function (c) { c.checked = chkAll.checked; });
        updateBulkBar();
      });

      rowChks.forEach(function (c) {
        c.addEventListener("change", updateBulkBar);
      });
    }

    // ── Kanban View ──
    function renderKanbanPipeline(target, leads) {
      var stages = [
        { key: "new", label: "New", color: "#0284C7" },
        { key: "contacted", label: "Contacted", color: "#7C3AED" },
        { key: "qualified", label: "Qualified", color: "#2563EB" },
        { key: "quotation", label: "Quotation / Demo", color: "#D97706" },
        { key: "negotiation", label: "Negotiation", color: "#EA580C" },
        { key: "won", label: "Won", color: "#16A34A" },
        { key: "lost", label: "Lost / On Hold", color: "#64748B" }
      ];

      var board = cEl("div", { className: "crm-kanban-board" });
      stages.forEach(function (stg) {
        var colLeads = leads.filter(function (l) { return l.stage === stg.key; });
        var colVal = colLeads.reduce(function (sum, l) { return sum + (l.estimated_value || 0); }, 0);

        var col = cEl("div", { className: "crm-kanban-col" });
        col.innerHTML = [
          '<div class="kanban-col-head" style="border-top: 3px solid ' + stg.color + '">',
          '  <div class="col-title-wrap"><strong>' + esc(stg.label) + '</strong><span class="col-badge">' + colLeads.length + '</span></div>',
          '  <div class="col-val-total">' + UI.formatCurrency(colVal) + '</div>',
          '</div>',
          '<div class="kanban-card-stack"></div>'
        ].join("");

        var stack = col.querySelector(".kanban-card-stack");
        colLeads.forEach(function (lead) {
          var card = cEl("div", { className: "crm-kanban-card", draggable: "true" });
          card.innerHTML = [
            '<div class="kb-card-head">' + UI.renderChannelBadge(lead.channel).outerHTML + UI.renderPriorityBadge(lead.priority).outerHTML + '</div>',
            '<h4 class="kb-cust-name">' + esc(lead.name) + '</h4>',
            '<div class="kb-cust-sub">' + esc(lead.company || lead.location) + '</div>',
            '<div class="kb-product-tag">' + esc(lead.product_model) + '</div>',
            '<div class="kb-card-foot"><strong class="kb-val">' + UI.formatCurrency(lead.estimated_value) + '</strong><span class="kb-assignee">' + esc(lead.assigned_to) + '</span></div>'
          ].join("");

          card.addEventListener("click", function () {
            renderCustomerDetails(container, lead.contact_id, lead.id);
          });

          stack.appendChild(card);
        });

        board.appendChild(col);
      });

      target.appendChild(board);
    }

    // Switcher buttons
    var btnTable = wrap.querySelector("#btnLeadViewTable");
    var btnKanban = wrap.querySelector("#btnLeadViewKanban");
    btnTable.addEventListener("click", function () {
      btnTable.classList.add("is-active");
      btnKanban.classList.remove("is-active");
      State.set("leadViewMode", "table");
      renderCurrentView();
    });
    btnKanban.addEventListener("click", function () {
      btnKanban.classList.add("is-active");
      btnTable.classList.remove("is-active");
      State.set("leadViewMode", "kanban");
      renderCurrentView();
    });

    // Search and filter listeners
    wrap.querySelector("#leadSearchInput").addEventListener("input", function (e) {
      State.setLeadFilter("search", e.target.value.trim());
      renderCurrentView();
    });
    wrap.querySelector("#leadChannelFilter").addEventListener("change", function (e) {
      State.setLeadFilter("channel", e.target.value);
      renderCurrentView();
    });
    wrap.querySelector("#leadStageFilter").addEventListener("change", function (e) {
      State.setLeadFilter("stage", e.target.value);
      renderCurrentView();
    });
    wrap.querySelector("#btnExportLeadsCsv").addEventListener("click", exportAllCsv);
    wrap.querySelector("#btnCreateNewLead").addEventListener("click", openNewInquiryModal);

    renderCurrentView();
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 3. CUSTOMER DIRECTORY VIEW
  // ═════════════════════════════════════════════════════════════════════════
  function renderCustomers(container, customerId) {
    if (customerId) {
      renderCustomerDetails(container, customerId);
      return;
    }

    container.innerHTML = "";
    var wrap = cEl("div", { className: "crm-view-wrap" });

    var header = cEl("div", { className: "crm-view-header" });
    header.innerHTML = [
      '<div class="crm-vh-left">',
      '  <div class="crm-breadcrumbs"><span>CRM</span> <span class="crm-bc-sep">/</span> <span class="crm-bc-active">Customers</span></div>',
      '  <h1 class="crm-vh-title">Customer Directory</h1>',
      '  <p class="crm-vh-sub">Consolidated commercial customer accounts across all inbound communication channels.</p>',
      '</div>',
      '<div class="crm-vh-actions">',
      '  <button type="button" class="btn btn-primary btn-sm" id="btnCreateCustomer">+ Add Customer</button>',
      '</div>'
    ].join("");
    wrap.appendChild(header);

    var grid = cEl("div", { className: "crm-contacts-grid" });
    wrap.appendChild(grid);
    container.appendChild(wrap);

    API.contacts.list().then(function (res) {
      var contacts = res.data || [];
      contacts.forEach(function (c) {
        var card = cEl("div", { className: "crm-contact-card" });
        var initials = c.name.split(" ").map(function (n) { return n[0]; }).join("").substring(0, 2);

        card.innerHTML = [
          '<div class="cont-card-head">',
          '  <div class="cont-avatar">' + initials + '</div>',
          '  <div class="cont-head-meta"><h3 class="cont-name">' + esc(c.name) + '</h3><div class="cont-comp">' + esc(c.company) + '</div></div>',
          '  <span class="cont-badge-type">' + esc(c.customer_type) + '</span>',
          '</div>',
          '<div class="cont-details">',
          '  <div class="cont-kv"><span>Location:</span> <strong>' + esc(c.location) + '</strong></div>',
          '  <div class="cont-kv"><span>Phone:</span> <strong>' + esc(c.phone) + '</strong></div>',
          '  <div class="cont-kv"><span>Email:</span> <strong>' + esc(c.email) + '</strong></div>',
          '  <div class="cont-kv"><span>Assigned Rep:</span> <strong>' + esc(c.assigned_to) + '</strong></div>',
          '</div>',
          '<div class="cont-card-foot">',
          '  <button type="button" class="btn btn-secondary btn-sm btn-full btn-view-c360" data-id="' + c.id + '">View Customer Details &rarr;</button>',
          '</div>'
        ].join("");

        card.querySelector(".btn-view-c360").addEventListener("click", function () {
          renderCustomerDetails(container, c.id);
        });

        grid.appendChild(card);
      });
    });

    wrap.querySelector("#btnCreateCustomer").addEventListener("click", openNewInquiryModal);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 4. TWO-COLUMN CUSTOMER DETAILS INTERFACE (Section 5 Requirement)
  // ═════════════════════════════════════════════════════════════════════════
  function renderCustomerDetails(container, contactId, leadId) {
    container.innerHTML = "";
    var wrap = cEl("div", { className: "crm-view-wrap" });

    // Header with Back button
    var header = cEl("div", { className: "crm-view-header" });
    header.innerHTML = [
      '<div class="crm-vh-left">',
      '  <div class="crm-breadcrumbs"><button type="button" class="crm-back-link" id="btnBackToLeads">&larr; Back to Leads</button> <span class="crm-bc-sep">/</span> <span class="crm-bc-active">Customer Profile &amp; Conversation</span></div>',
      '  <h1 class="crm-vh-title" id="custDetTitle">Customer Details</h1>',
      '</div>',
      '<div class="crm-vh-actions">',
      '  <button type="button" class="btn btn-secondary btn-sm" id="btnScheduleFollowup">+ Schedule Follow-up</button>',
      '</div>'
    ].join("");
    wrap.appendChild(header);

    // Two-Column Container
    var twoCol = cEl("div", { className: "crm-two-col-layout" });

    // LEFT SIDE: Customer Info, Contact Details, Products, Rep, Notes, Timeline
    var leftSide = cEl("div", { className: "crm-two-col-left", id: "custLeftCol" });
    twoCol.appendChild(leftSide);

    // RIGHT SIDE: Conversation History with distinct channel identities & Reply interface
    var rightSide = cEl("div", { className: "crm-two-col-right", id: "custRightCol" });
    twoCol.appendChild(rightSide);

    wrap.appendChild(twoCol);
    container.appendChild(wrap);

    wrap.querySelector("#btnBackToLeads").addEventListener("click", function () {
      location.hash = "#/crm/leads";
    });
    wrap.querySelector("#btnScheduleFollowup").addEventListener("click", openNewTaskModal);

    // Fetch lead & contact data
    var targetLeadId = leadId || "lead-1";
    API.leads.get(targetLeadId).then(function (lRes) {
      var lead = lRes.data || {};
      var targetContactId = contactId || lead.contact_id || "cont-1";

      API.contacts.get(targetContactId).then(function (cRes) {
        var cust = cRes.data || lead;
        var titleEl = wrap.querySelector("#custDetTitle");
        if (titleEl) titleEl.textContent = cust.name + " (" + (cust.company || cust.location) + ")";

        // ── Render LEFT SIDE ──
        leftSide.innerHTML = [
          '<div class="crm-card">',
          '  <div class="crm-card-head"><h3 class="crm-card-title">Customer Information</h3>' + UI.renderStageBadge(lead.stage || "new").outerHTML + '</div>',
          '  <div class="c-info-grid">',
          '    <div class="c-info-item"><span class="c-lbl">Full Name</span><strong>' + esc(cust.name) + '</strong></div>',
          '    <div class="c-info-item"><span class="c-lbl">Company / Fleet</span><strong>' + esc(cust.company || "—") + '</strong></div>',
          '    <div class="c-info-item"><span class="c-lbl">Phone Number</span><strong>' + esc(cust.phone) + '</strong></div>',
          '    <div class="c-info-item"><span class="c-lbl">Email Address</span><strong>' + esc(cust.email || "—") + '</strong></div>',
          '    <div class="c-info-item"><span class="c-lbl">Operating Location</span><strong>' + esc(cust.location) + '</strong></div>',
          '    <div class="c-info-item"><span class="c-lbl">Customer Category</span><strong>' + esc(cust.customer_type || "Commercial Operator") + '</strong></div>',
          '    <div class="c-info-item"><span class="c-lbl">Assigned Employee</span><strong>' + esc(lead.assigned_to || cust.assigned_to || "Anand R.") + '</strong></div>',
          '    <div class="c-info-item"><span class="c-lbl">Primary Source</span>' + UI.renderChannelBadge(lead.channel || "whatsapp").outerHTML + '</div>',
          '  </div>',
          '</div>',
          '<div class="crm-card" style="margin-top:16px;">',
          '  <div class="crm-card-head"><h3 class="crm-card-title">Interested Products &amp; Requirements</h3><span class="crm-card-badge" style="color:var(--cyan); font-weight:700;">' + UI.formatCurrency(lead.estimated_value) + '</span></div>',
          '  <div class="c-req-box">',
          '    <div class="c-req-item"><span>Product Model:</span> <strong>' + esc(lead.product_model || "Seagö 50 HP PMSM Outboard") + '</strong></div>',
          '    <div class="c-req-item"><span>Power Rating:</span> <strong>' + esc(lead.motor_hp || "50 HP") + '</strong></div>',
          '    <div class="c-req-item"><span>Vessel Length:</span> <strong>' + esc(lead.vessel_length || "12 m") + '</strong></div>',
          '    <div class="c-req-item"><span>Seating:</span> <strong>' + (lead.seating_capacity ? lead.seating_capacity + " Persons" : "—") + '</strong></div>',
          '    <div class="c-req-item"><span>Purchase Timeline:</span> <strong>' + esc(lead.purchase_timeline || "Immediate (< 2 wks)") + '</strong></div>',
          '  </div>',
          '</div>',
          '<div class="crm-card" style="margin-top:16px;">',
          '  <div class="crm-card-head"><h3 class="crm-card-title">Internal Commercial Notes</h3></div>',
          '  <div class="drw-notes-list" id="custNotesList"></div>',
          '  <div class="drw-add-note">',
          '    <input type="text" class="crm-input" id="custNoteInput" placeholder="Add note...">',
          '    <button type="button" class="btn btn-primary btn-sm" id="btnCustAddNote">Add</button>',
          '  </div>',
          '</div>',
          '<div class="crm-card" style="margin-top:16px;">',
          '  <div class="crm-card-head"><h3 class="crm-card-title">Chronological Activity Timeline</h3></div>',
          '  <div class="c360-timeline" id="custTimelineList"></div>',
          '</div>'
        ].join("");

        // Render notes
        var nList = leftSide.querySelector("#custNotesList");
        (lead.notes || []).forEach(function (n) {
          var noteEl = cEl("div", { className: "drw-note-bubble" });
          noteEl.innerHTML = '<strong>' + esc(n.author) + '</strong> (' + UI.formatTimeAgo(n.created_at) + ')<p>' + esc(n.text) + '</p>';
          nList.appendChild(noteEl);
        });

        leftSide.querySelector("#btnCustAddNote").addEventListener("click", function () {
          var inp = leftSide.querySelector("#custNoteInput");
          var txt = inp.value.trim();
          if (!txt) return;
          API.leads.addNote(lead.id, txt, "Admin").then(function () {
            inp.value = "";
            renderCustomerDetails(container, contactId, leadId);
            UI.showToast("Note added", "success");
          });
        });

        // Render Timeline
        API.contacts.getTimeline(targetContactId).then(function (tRes) {
          var events = tRes.data || [];
          var tlList = leftSide.querySelector("#custTimelineList");
          events.forEach(function (e) {
            var node = cEl("div", { className: "c360-tl-item" });
            node.innerHTML = [
              '<div class="tl-node">' + (UI.ICONS[e.channel] || '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"></circle></svg>') + '</div>',
              '<div class="tl-content">',
              '  <div class="tl-head"><strong class="tl-title">' + esc(e.title) + '</strong><span class="tl-time">' + UI.formatDateShort(e.timestamp) + '</span></div>',
              '  <p class="tl-desc">' + esc(e.description) + '</p>',
              '</div>'
            ].join("");
            tlList.appendChild(node);
          });
        });

        // ── Render RIGHT SIDE: Conversation History with distinct channel identity ──
        var ch = lead.channel || "whatsapp";
        API.conversations.get("conv-1").then(function (cConvRes) {
          var conv = cConvRes.data || {};
          rightSide.innerHTML = [
            '<div class="crm-card crm-conv-pane crm-stream-wrap--' + ch + '">',
            '  <div class="crm-conv-header crm-conv-header--' + ch + '">',
            '    <div class="conv-hdr-left">' + (UI.ICONS[ch] || "") + '<div><h3>' + esc(cust.name) + '</h3><div class="conv-hdr-ch-label">Channel: ' + ch.toUpperCase() + '</div></div></div>',
            '    <div class="conv-hdr-right">' + UI.renderHandoverBadge(lead.bot_status || "human_active").outerHTML + '</div>',
            '  </div>',
            '  <div class="crm-chat-stream crm-stream--' + ch + '" id="twoColChatStream"></div>',
            '  <div class="crm-chat-compose-box">',
            '    <div class="compose-toolbar"><span class="compose-channel-pill">' + (UI.ICONS[ch] || "") + ' Connected via ' + ch.toUpperCase() + '</span></div>',
            '    <div class="compose-input-row">',
            '      <textarea class="crm-compose-textarea" id="twoColReplyInp" placeholder="Type reply to customer..." rows="2"></textarea>',
            '      <button type="button" class="btn btn-primary crm-send-msg-btn" id="btnTwoColSend">Send</button>',
            '    </div>',
            '  </div>',
            '</div>'
          ].join("");

          var stream = rightSide.querySelector("#twoColChatStream");
          (conv.messages || []).forEach(function (m) {
            var row = cEl("div", { className: "crm-msg-row crm-msg-" + m.direction + " crm-msg-ch--" + ch });
            row.innerHTML = [
              '<div class="crm-msg-bubble">',
              '  <div class="crm-msg-sender">' + esc(m.sender_name) + '</div>',
              '  <div class="crm-msg-text">' + esc(m.text) + '</div>',
              '  <div class="crm-msg-meta"><span>' + esc(m.timestamp) + '</span>' + (m.direction === "outbound" ? '<span class="msg-check" style="display:inline-flex;align-items:center;margin-left:4px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline><polyline points="20 12 15 17 13 15"></polyline></svg></span>' : '') + '</div>',
              '</div>'
            ].join("");
            stream.appendChild(row);
          });

          var replyInp = rightSide.querySelector("#twoColReplyInp");
          var btnSend = rightSide.querySelector("#btnTwoColSend");
          function sendReply() {
            var val = replyInp.value.trim();
            if (!val) return;
            API.conversations.sendMessage(conv.id, val, ch).then(function () {
              replyInp.value = "";
              UI.showToast("Message sent to customer", "success");
              renderCustomerDetails(container, contactId, leadId);
            });
          }
          btnSend.addEventListener("click", sendReply);
          replyInp.addEventListener("keydown", function (e) {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendReply();
            }
          });
        });
      });
    });
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 5. UNIFIED INBOX VIEW (3-Column Layout: WhatsApp, IG, FB, Website)
  // ═════════════════════════════════════════════════════════════════════════
  function renderUnifiedInbox(container, conversationId) {
    container.innerHTML = "";
    var wrap = cEl("div", { className: "crm-inbox-shell" });

    // Top Header & Channel Filter Pills
    var topbar = cEl("div", { className: "crm-inbox-topbar" });
    topbar.innerHTML = [
      '<div class="crm-inbox-tb-left">',
      '  <div class="crm-breadcrumbs"><span>CRM</span> <span class="crm-bc-sep">/</span> <span class="crm-bc-active">Unified Inbox</span></div>',
      '  <h2 class="crm-inbox-title">Sales Conversations</h2>',
      '</div>',
      '<div class="crm-inbox-tb-right">',
      '  <div class="crm-channel-filter-pills" id="inboxChannelPills">',
      '    <button type="button" class="ch-pill is-active" data-ch="all">All Channels</button>',
      '    <button type="button" class="ch-pill" data-ch="whatsapp">' + UI.ICONS.whatsapp + ' WhatsApp</button>',
      '    <button type="button" class="ch-pill" data-ch="instagram">' + UI.ICONS.instagram + ' Instagram</button>',
      '    <button type="button" class="ch-pill" data-ch="facebook">' + UI.ICONS.facebook + ' Facebook</button>',
      '    <button type="button" class="ch-pill" data-ch="website">' + UI.ICONS.website + ' Website</button>',
      '  </div>',
      '</div>'
    ].join("");
    wrap.appendChild(topbar);

    // 3-Column Container
    var mainCols = cEl("div", { className: "crm-inbox-layout" });

    // LEFT: Conversation list
    var leftCol = cEl("div", { className: "crm-inbox-col-left" });
    leftCol.innerHTML = '<div class="crm-inbox-search"><input type="text" class="crm-input" placeholder="Search customer, number..." id="inboxSearchInput"></div><div class="crm-conv-list" id="convListContainer"></div>';
    mainCols.appendChild(leftCol);

    // CENTRE: Selected conversation stream
    var centerCol = cEl("div", { className: "crm-inbox-col-center", id: "inboxCenterCol" });
    mainCols.appendChild(centerCol);

    // RIGHT: Customer info & lead details
    var rightCol = cEl("div", { className: "crm-inbox-col-right", id: "inboxRightCol" });
    mainCols.appendChild(rightCol);

    wrap.appendChild(mainCols);
    container.appendChild(wrap);

    var activeConvId = conversationId || State.get().activeConversationId || "conv-1";
    var currentFilter = "all";
    var convListContainer = leftCol.querySelector("#convListContainer");

    function refreshConvList() {
      convListContainer.innerHTML = "";
      API.conversations.list(currentFilter).then(function (res) {
        var convs = res.data || [];
        if (convs.length === 0) {
          convListContainer.appendChild(UI.renderEmptyState("No conversations", "No inquiries found for this channel."));
          return;
        }

        convs.forEach(function (conv) {
          var item = cEl("div", {
            className: "crm-conv-item " + (conv.id === activeConvId ? "is-active" : "")
          });
          var initials = conv.customer_name.split(" ").map(function (n) { return n[0]; }).join("").substring(0, 2);
          item.innerHTML = [
            '<div class="conv-avatar">' + initials + '<span class="conv-ch-icon">' + (UI.ICONS[conv.channel] || UI.ICONS.website) + '</span></div>',
            '<div class="conv-meta">',
            '  <div class="conv-head"><strong class="conv-name">' + esc(conv.customer_name) + '</strong><span class="conv-time">' + UI.formatTimeAgo(conv.last_message_at) + '</span></div>',
            '  <div class="conv-snippet">' + esc(conv.last_message) + '</div>',
            '  <div class="conv-foot"><span class="conv-assignee">' + esc(conv.assigned_to) + '</span>' + (conv.unread_count > 0 ? '<span class="conv-unread-dot">' + conv.unread_count + '</span>' : '') + '</div>',
            '</div>'
          ].join("");

          item.addEventListener("click", function () {
            activeConvId = conv.id;
            State.set("activeConversationId", conv.id);
            refreshConvList();
            renderActiveConversation(activeConvId);
          });

          convListContainer.appendChild(item);
        });

        renderActiveConversation(activeConvId);
      });
    }

    function renderActiveConversation(cId) {
      centerCol.innerHTML = "";
      rightCol.innerHTML = "";

      API.conversations.get(cId).then(function (res) {
        var conv = res.data;
        if (!conv) {
          centerCol.appendChild(UI.renderEmptyState("Select Conversation", "Choose an inquiry from the left to view."));
          return;
        }

        // Centre Header
        var chatHead = cEl("div", { className: "crm-chat-header crm-chat-header--" + conv.channel });
        chatHead.innerHTML = [
          '<div class="chat-head-left">',
          '  <span class="chat-ch-icon">' + (UI.ICONS[conv.channel] || UI.ICONS.website) + '</span>',
          '  <div><h3 class="chat-user-title">' + esc(conv.customer_name) + '</h3><div class="chat-sub">' + esc(conv.customer_phone || conv.customer_handle || "Web Ingestion") + '</div></div>',
          '</div>',
          '<div class="chat-head-right">',
          '  <div class="handover-control" id="handoverToggleWrap"></div>',
          '  <button type="button" class="btn btn-secondary btn-sm" id="btnResolveConv">' + (conv.is_resolved ? "Reopen" : "Resolve") + '</button>',
          '</div>'
        ].join("");

        var hoWrap = chatHead.querySelector("#handoverToggleWrap");
        hoWrap.appendChild(UI.renderHandoverBadge(conv.handover_status));

        var hoBtn = cEl("button", {
          className: "btn btn-outline-topbar btn-sm",
          style: { marginLeft: "8px" },
          type: "button"
        }, conv.handover_status === "bot_active" ? "Take Over (Staff)" : "Resume Bot");

        hoBtn.addEventListener("click", function () {
          var nextStatus = conv.handover_status === "bot_active" ? "human_active" : "bot_active";
          API.conversations.setHandover(conv.id, nextStatus).then(function () {
            conv.handover_status = nextStatus;
            UI.showToast("Handover status updated to: " + nextStatus, "success");
            renderActiveConversation(conv.id);
          });
        });
        hoWrap.appendChild(hoBtn);
        centerCol.appendChild(chatHead);

        // Stream
        var msgStream = cEl("div", { className: "crm-chat-stream crm-stream--" + conv.channel, id: "chatMessageStream" });
        (conv.messages || []).forEach(function (m) {
          var row = cEl("div", { className: "crm-msg-row crm-msg-" + m.direction + " crm-msg-ch--" + m.channel });
          row.innerHTML = [
            '<div class="crm-msg-bubble">',
            '  <div class="crm-msg-sender">' + esc(m.sender_name) + '</div>',
            '  <div class="crm-msg-text">' + esc(m.text) + '</div>',
            '  <div class="crm-msg-meta"><span class="msg-time">' + esc(m.timestamp) + '</span>' + (m.direction === "outbound" ? '<span class="msg-check" style="display:inline-flex;align-items:center;margin-left:4px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline><polyline points="20 12 15 17 13 15"></polyline></svg></span>' : '') + '</div>',
            '</div>'
          ].join("");
          msgStream.appendChild(row);
        });
        centerCol.appendChild(msgStream);
        setTimeout(function () { msgStream.scrollTop = msgStream.scrollHeight; }, 50);

        // Compose
        var composeBox = cEl("div", { className: "crm-chat-compose-box" });
        composeBox.innerHTML = [
          '<div class="compose-toolbar"><span class="compose-channel-pill">' + (UI.ICONS[conv.channel] || "") + ' Connected via ' + conv.channel.toUpperCase() + '</span></div>',
          '<div class="compose-input-row">',
          '  <textarea class="crm-compose-textarea" id="chatReplyInput" placeholder="Type a message to customer..." rows="2"></textarea>',
          '  <button type="button" class="btn btn-primary crm-send-msg-btn" id="chatSendBtn">Send</button>',
          '</div>'
        ].join("");

        var txtArea = composeBox.querySelector("#chatReplyInput");
        var sendBtn = composeBox.querySelector("#chatSendBtn");
        function doSend() {
          var val = txtArea.value.trim();
          if (!val) return;
          API.conversations.sendMessage(conv.id, val, conv.channel).then(function () {
            txtArea.value = "";
            renderActiveConversation(conv.id);
            UI.showToast("Message sent to customer", "success");
          });
        }
        sendBtn.addEventListener("click", doSend);
        txtArea.addEventListener("keydown", function (e) {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            doSend();
          }
        });
        centerCol.appendChild(composeBox);

        // Right Panel: Customer information & lead details
        rightCol.innerHTML = [
          '<div class="crm-card">',
          '  <div class="crm-card-head"><h3 class="crm-card-title">Customer Context</h3><span class="crm-card-badge">' + esc(conv.customer_name) + '</span></div>',
          '  <div class="ctx-kv-list">',
          '    <div class="ctx-kv"><span class="ctx-lbl">Channel Source</span><span class="ctx-val">' + UI.renderChannelBadge(conv.channel).outerHTML + '</span></div>',
          '    <div class="ctx-kv"><span class="ctx-lbl">Assigned Employee</span><span class="ctx-val"><strong>' + esc(conv.assigned_to) + '</strong></span></div>',
          '    <div class="ctx-kv"><span class="ctx-lbl">Priority</span><span class="ctx-val">' + UI.renderPriorityBadge(conv.priority).outerHTML + '</span></div>',
          '    <div class="ctx-kv"><span class="ctx-lbl">Phone</span><span class="ctx-val">' + esc(conv.customer_phone || "—") + '</span></div>',
          '  </div>',
          '  <div class="ctx-actions-stack">',
          '    <button type="button" class="btn btn-primary btn-sm btn-full" id="btnRightViewLead">Open Two-Column Customer Details</button>',
          '    <button type="button" class="btn btn-secondary btn-sm btn-full" id="btnRightAddTask">+ Schedule Follow-up</button>',
          '  </div>',
          '</div>'
        ].join("");

        rightCol.querySelector("#btnRightViewLead").addEventListener("click", function () {
          renderCustomerDetails(container, conv.contact_id, conv.lead_id);
        });
        rightCol.querySelector("#btnRightAddTask").addEventListener("click", openNewTaskModal);
      });
    }

    var pills = topbar.querySelectorAll(".ch-pill");
    pills.forEach(function (p) {
      p.addEventListener("click", function () {
        pills.forEach(function (x) { x.classList.remove("is-active"); });
        p.classList.add("is-active");
        currentFilter = p.getAttribute("data-ch");
        refreshConvList();
      });
    });

    refreshConvList();
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 6. TASKS & FOLLOW-UPS VIEW (Section 7 Requirement)
  // ═════════════════════════════════════════════════════════════════════════
  function renderTasks(container) {
    container.innerHTML = "";
    var wrap = cEl("div", { className: "crm-view-wrap" });

    var header = cEl("div", { className: "crm-view-header" });
    header.innerHTML = [
      '<div class="crm-vh-left">',
      '  <div class="crm-breadcrumbs"><span>CRM</span> <span class="crm-bc-sep">/</span> <span class="crm-bc-active">Tasks &amp; Follow-ups</span></div>',
      '  <h1 class="crm-vh-title">Follow-up Management</h1>',
      '  <p class="crm-vh-sub">Phone calls, WhatsApp follow-ups, meetings, product demonstrations, and quotations.</p>',
      '</div>',
      '<div class="crm-vh-actions">',
      '  <button type="button" class="btn btn-primary btn-sm" id="btnAddNewTask">+ Create Task</button>',
      '</div>'
    ].join("");
    wrap.appendChild(header);

    // Filter Tabs: My Tasks, Today, Upcoming, Overdue, Completed
    var tabFilterRow = cEl("div", { className: "crm-task-filter-pills" });
    tabFilterRow.innerHTML = [
      '<button type="button" class="t-pill is-active" data-filter="all">All Tasks</button>',
      '<button type="button" class="t-pill" data-filter="my">My Tasks</button>',
      '<button type="button" class="t-pill" data-filter="today">Today</button>',
      '<button type="button" class="t-pill" data-filter="upcoming">Upcoming</button>',
      '<button type="button" class="t-pill" data-filter="overdue">Overdue</button>',
      '<button type="button" class="t-pill" data-filter="completed">Completed</button>'
    ].join("");
    wrap.appendChild(tabFilterRow);

    var taskListCard = cEl("div", { className: "crm-card", style: { marginTop: "14px" } });
    var taskList = cEl("div", { className: "crm-tasks-list-wrap", id: "tasksListArea" });
    taskListCard.appendChild(taskList);
    wrap.appendChild(taskListCard);
    container.appendChild(wrap);

    var currentTaskFilter = "all";

    function refreshTasks() {
      taskList.innerHTML = "";
      API.tasks.list().then(function (res) {
        var tasks = res.data || [];
        var filtered = tasks.filter(function (t) {
          if (currentTaskFilter === "completed") return t.status === "completed";
          if (currentTaskFilter === "overdue") return t.priority === "urgent" || t.priority === "high";
          if (currentTaskFilter === "my") return t.assigned_to === "Anand R.";
          return true;
        });

        if (filtered.length === 0) {
          taskList.appendChild(UI.renderEmptyState("No Tasks Found", "All tasks in this category are completed."));
          return;
        }

        filtered.forEach(function (task) {
          var item = cEl("div", { className: "crm-task-row " + (task.status === "completed" ? "is-completed" : "") });
          item.innerHTML = [
            '<div class="task-chk-col"><input type="checkbox" class="task-chk" ' + (task.status === "completed" ? "checked" : "") + '></div>',
            '<div class="task-info-col">',
            '  <h4 class="task-title">' + esc(task.title) + '</h4>',
            '  <div class="task-meta"><span class="task-type-badge">' + esc(task.task_type.replace(/_/g, " ").toUpperCase()) + '</span> · <span class="task-customer">Customer: ' + esc(task.customer_name || "Commercial Fleet") + '</span> · <span class="task-due">Due: ' + UI.formatDateShort(task.due_date) + '</span></div>',
            '</div>',
            '<div class="task-assignee-col"><span class="team-avatar-sm">' + task.assigned_to[0] + '</span> <span>' + esc(task.assigned_to) + '</span></div>',
            '<div class="task-priority-col">' + UI.renderPriorityBadge(task.priority).outerHTML + '</div>'
          ].join("");

          var chk = item.querySelector(".task-chk");
          chk.addEventListener("change", function () {
            var newStatus = chk.checked ? "completed" : "pending";
            API.tasks.updateStatus(task.id, newStatus).then(function () {
              item.classList.toggle("is-completed", chk.checked);
              UI.showToast("Task marked as: " + newStatus, "success");
            });
          });

          taskList.appendChild(item);
        });
      });
    }

    var tPills = tabFilterRow.querySelectorAll(".t-pill");
    tPills.forEach(function (p) {
      p.addEventListener("click", function () {
        tPills.forEach(function (x) { x.classList.remove("is-active"); });
        p.classList.add("is-active");
        currentTaskFilter = p.getAttribute("data-filter");
        refreshTasks();
      });
    });

    wrap.querySelector("#btnAddNewTask").addEventListener("click", openNewTaskModal);
    refreshTasks();
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 7. INTEGRATIONS PAGE (Section 8 Requirement)
  // ═════════════════════════════════════════════════════════════════════════
  function renderIntegrations(container) {
    container.innerHTML = "";
    var wrap = cEl("div", { className: "crm-view-wrap" });

    var header = cEl("div", { className: "crm-view-header" });
    header.innerHTML = [
      '<div class="crm-vh-left">',
      '  <div class="crm-breadcrumbs"><span>CRM</span> <span class="crm-bc-sep">/</span> <span class="crm-bc-active">Integrations</span></div>',
      '  <h1 class="crm-vh-title">Connected Channels &amp; Integrations</h1>',
      '  <p class="crm-vh-sub">Individual configuration cards for WhatsApp Cloud API, Facebook, Instagram, Web3Forms, LinkedIn, and X.</p>',
      '</div>'
    ].join("");
    wrap.appendChild(header);

    var intGrid = cEl("div", { className: "crm-int-grid" });
    wrap.appendChild(intGrid);

    API.integrations.list().then(function (res) {
      var items = res.data || [];
      items.forEach(function (intItem) {
        var card = cEl("div", { className: "crm-card crm-int-card" });
        var statusColor = intItem.status === "connected" ? "#10B981" : intItem.status === "awaiting_approval" ? "#F59E0B" : "#64748B";
        var statusLabel = intItem.status === "connected" ? "CONNECTED" : intItem.status === "awaiting_approval" ? "AWAITING APPROVAL" : "DISCONNECTED";

        card.innerHTML = [
          '<div class="int-card-head">',
          '  <div class="int-card-brand">' + (UI.ICONS[intItem.provider] || UI.ICONS.website) + '<h3>' + esc(intItem.name) + '</h3></div>',
          '  <span class="int-status-badge" style="background:' + statusColor + '20; color:' + statusColor + '; border:1px solid ' + statusColor + '40;">' + statusLabel + '</span>',
          '</div>',
          '<div class="int-card-body">',
          (intItem.phone_number ? '<div class="int-kv"><span>Phone Number:</span> <strong>' + esc(intItem.phone_number) + '</strong></div>' : ''),
          (intItem.account_handle ? '<div class="int-kv"><span>Account Handle:</span> <strong>' + esc(intItem.account_handle) + '</strong></div>' : ''),
          (intItem.page_name ? '<div class="int-kv"><span>Facebook Page:</span> <strong>' + esc(intItem.page_name) + '</strong></div>' : ''),
          (intItem.last_sync_at ? '<div class="int-kv"><span>Last Sync:</span> <strong>' + UI.formatTimeAgo(intItem.last_sync_at) + '</strong></div>' : ''),
          (intItem.last_error ? '<div class="int-error-box">' + esc(intItem.last_error) + '</div>' : ''),
          '  <div class="int-caps-wrap">',
          (intItem.capabilities || []).map(function (c) { return '<span class="c-tag">' + esc(c) + '</span>'; }).join(""),
          '  </div>',
          '</div>',
          '<div class="int-card-foot" style="display:flex; gap:8px;">',
          '  <button type="button" class="btn btn-secondary btn-sm btn-test-int" style="flex:1;">Test Connection</button>',
          '  <button type="button" class="btn btn-primary btn-sm btn-config-int" style="flex:1;" data-provider="' + intItem.provider + '">Configure</button>',
          '</div>'
        ].join("");

        card.querySelector(".btn-test-int").addEventListener("click", function () {
          UI.showToast("Testing connection with " + intItem.name + "...", "info");
          setTimeout(function () {
            if (intItem.status === "connected") {
              UI.showToast("Connection to " + intItem.name + " verified successfully", "success");
            } else {
              UI.showToast("Connection test: " + (intItem.last_error || "Awaiting backend credentials"), "error");
            }
          }, 600);
        });

        card.querySelector(".btn-config-int").addEventListener("click", function () {
          openIntegrationConfigModal(intItem);
        });

        intGrid.appendChild(card);
      });
    });

    container.appendChild(wrap);
  }

  function openIntegrationConfigModal(intItem) {
    var modal = cEl("div", { className: "crm-modal-overlay" });
    modal.innerHTML = [
      '<div class="crm-modal-box">',
      '  <div class="crm-modal-head">',
      '    <div style="display:flex; align-items:center; gap:8px;">' + (UI.ICONS[intItem.provider] || "") + '<h3>' + esc(intItem.name) + ' Settings</h3></div>',
      '    <button type="button" class="crm-modal-close" id="intCloseBtn">&times;</button>',
      '  </div>',
      '  <div class="crm-modal-body">',
      '    <div class="form-group"><label>Connection Status</label><input type="text" class="crm-input" value="' + esc(intItem.status) + '" readonly style="background:#F1F5F9;"></div>',
      (intItem.provider === "whatsapp" ? [
        '<div class="form-group"><label>Meta App ID</label><input type="text" class="crm-input" value="' + esc(intItem.app_id || "") + '"></div>',
        '<div class="form-group"><label>WhatsApp Business Account ID (WABA)</label><input type="text" class="crm-input" value="' + esc(intItem.waba_id || "") + '"></div>',
        '<div class="form-group"><label>Phone Number ID</label><input type="text" class="crm-input" value="' + esc(intItem.phone_number_id || "") + '"></div>',
        '<div class="form-group"><label>Access Token (Masked Server Secret)</label><input type="password" class="crm-input" value="EAAGxxxxxxxxxxxxxxxxxxxxxxxZD" readonly></div>'
      ].join("") : ''),
      (intItem.provider === "website" ? [
        '<div class="form-group"><label>Web3Forms Access Key</label><input type="password" class="crm-input" value="a8f4xxxx-xxxx-xxxx-xxxx-xxxxxxxx6b91" readonly></div>',
        '<div class="form-group"><label>Form-to-CRM Field Mapping</label>',
        '  <div class="crm-field-map-table">',
        '    <div class="map-row"><span>name</span> &rarr; <strong>Customer Name</strong></div>',
        '    <div class="map-row"><span>email</span> &rarr; <strong>Email Address</strong></div>',
        '    <div class="map-row"><span>phone</span> &rarr; <strong>Phone Number</strong></div>',
        '    <div class="map-row"><span>company</span> &rarr; <strong>Company / Organization</strong></div>',
        '    <div class="map-row"><span>product</span> &rarr; <strong>Interested Product</strong></div>',
        '    <div class="map-row"><span>message</span> &rarr; <strong>Enquiry Details</strong></div>',
        '  </div>',
        '</div>'
      ].join("") : ''),
      '  </div>',
      '  <div class="crm-modal-foot">',
      '    <button type="button" class="btn btn-secondary btn-sm" id="btnIntCancel">Cancel</button>',
      '    <button type="button" class="btn btn-primary btn-sm" id="btnIntSave">Save Configuration</button>',
      '  </div>',
      '</div>'
    ].join("");

    modal.querySelector("#intCloseBtn").addEventListener("click", function () { document.body.removeChild(modal); });
    modal.querySelector("#btnIntCancel").addEventListener("click", function () { document.body.removeChild(modal); });
    modal.querySelector("#btnIntSave").addEventListener("click", function () {
      UI.showToast("Integration configuration saved", "success");
      document.body.removeChild(modal);
    });

    document.body.appendChild(modal);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // MODALS: New Fleet Inquiry & New Task
  // ═════════════════════════════════════════════════════════════════════════
  function openNewInquiryModal() {
    var modal = cEl("div", { className: "crm-modal-overlay" });
    modal.innerHTML = [
      '<div class="crm-modal-box">',
      '  <div class="crm-modal-head"><h3>+ Log New Customer Enquiry</h3><button type="button" class="crm-modal-close" id="newInqClose">&times;</button></div>',
      '  <div class="crm-modal-body">',
      '    <div class="form-group"><label>Customer Name *</label><input type="text" class="crm-input" id="inqName" placeholder="e.g. Capt. Rajesh Varma" required></div>',
      '    <div class="form-group"><label>Company / Organization</label><input type="text" class="crm-input" id="inqCompany" placeholder="e.g. Backwater Cruises"></div>',
      '    <div class="form-group"><label>Phone Number *</label><input type="tel" class="crm-input" id="inqPhone" placeholder="+91 98470 23145" required></div>',
      '    <div class="form-group"><label>Location</label><input type="text" class="crm-input" id="inqLocation" placeholder="Kochi, Kerala"></div>',
      '    <div class="form-group"><label>Interested Product Category</label>',
      '      <select class="crm-select" id="inqCategory">',
      '        <option value="Seagö 50 HP (36.8 kW) PMSM Outboard">Seagö 50 HP PMSM Outboard</option>',
      '        <option value="Seagö 30 HP (22 kW) PMSM Outboard">Seagö 30 HP PMSM Outboard</option>',
      '        <option value="FREEDOM — 8 Seater Electric FRP Craft">Freedom 8-Seater FRP Boat</option>',
      '        <option value="ECSTASY — 12 Seater Luxury Tourism Craft">Ecstasy 12-Seater Solar Boat</option>',
      '        <option value="CUSTOM 20 — 20 Seater Passenger Ferry">Custom 20-Seater Passenger Ferry</option>',
      '      </select>',
      '    </div>',
      '    <div class="form-group"><label>Channel Source</label>',
      '      <select class="crm-select" id="inqChannel">',
      '        <option value="whatsapp">WhatsApp Business</option>',
      '        <option value="website">Website Form</option>',
      '        <option value="instagram">Instagram</option>',
      '        <option value="facebook">Facebook</option>',
      '        <option value="direct">Direct Hotline</option>',
      '      </select>',
      '    </div>',
      '    <div class="form-group"><label>Estimated Contract Value (INR)</label><input type="number" class="crm-input" id="inqValue" placeholder="1250000" value="1250000"></div>',
      '  </div>',
      '  <div class="crm-modal-foot">',
      '    <button type="button" class="btn btn-secondary btn-sm" id="btnCancelInq">Cancel</button>',
      '    <button type="button" class="btn btn-primary btn-sm" id="btnSaveInq">Create Enquiry</button>',
      '  </div>',
      '</div>'
    ].join("");

    modal.querySelector("#newInqClose").addEventListener("click", function () { document.body.removeChild(modal); });
    modal.querySelector("#btnCancelInq").addEventListener("click", function () { document.body.removeChild(modal); });
    modal.querySelector("#btnSaveInq").addEventListener("click", function () {
      var name = modal.querySelector("#inqName").value.trim();
      var phone = modal.querySelector("#inqPhone").value.trim();
      if (!name || !phone) {
        UI.showToast("Please provide Customer Name and Phone Number", "error");
        return;
      }
      var newLead = {
        name: name,
        phone: phone,
        company: modal.querySelector("#inqCompany").value.trim(),
        location: modal.querySelector("#inqLocation").value.trim(),
        product_category: "Outboard Motor",
        product_model: modal.querySelector("#inqCategory").value,
        channel: modal.querySelector("#inqChannel").value,
        estimated_value: Number(modal.querySelector("#inqValue").value) || 1000000,
        stage: "new",
        assigned_to: "Anand R."
      };
      API.leads.create(newLead).then(function () {
        UI.showToast("Enquiry created: " + name, "success");
        document.body.removeChild(modal);
        location.hash = "#/crm/leads";
      });
    });

    document.body.appendChild(modal);
  }

  function openNewTaskModal() {
    var modal = cEl("div", { className: "crm-modal-overlay" });
    modal.innerHTML = [
      '<div class="crm-modal-box">',
      '  <div class="crm-modal-head"><h3>+ Schedule Follow-up Task</h3><button type="button" class="crm-modal-close" id="taskClose">&times;</button></div>',
      '  <div class="crm-modal-body">',
      '    <div class="form-group"><label>Task Title *</label><input type="text" class="crm-input" id="tTitle" placeholder="e.g. Follow up on battery sizing specs" required></div>',
      '    <div class="form-group"><label>Task Type</label>',
      '      <select class="crm-select" id="tType">',
      '        <option value="phone_call">Phone Call</option>',
      '        <option value="whatsapp_followup">WhatsApp Follow-up</option>',
      '        <option value="email">Email</option>',
      '        <option value="meeting">Meeting</option>',
      '        <option value="product_demo">Product Demonstration</option>',
      '        <option value="quotation_prep">Quotation Follow-up</option>',
      '      </select>',
      '    </div>',
      '    <div class="form-group"><label>Related Customer</label><input type="text" class="crm-input" id="tCustomer" placeholder="Capt. Rajesh Varma"></div>',
      '    <div class="form-group"><label>Assigned Staff</label>',
      '      <select class="crm-select" id="tAssignee">',
      '        <option value="Anand R.">Anand R.</option>',
      '        <option value="Divya K.">Divya K.</option>',
      '        <option value="Priya M.">Priya M.</option>',
      '      </select>',
      '    </div>',
      '    <div class="form-group"><label>Due Date</label><input type="date" class="crm-input" id="tDueDate" value="2026-11-13"></div>',
      '    <div class="form-group"><label>Priority</label>',
      '      <select class="crm-select" id="tPriority">',
      '        <option value="normal">Normal</option>',
      '        <option value="high">High</option>',
      '        <option value="urgent">Urgent</option>',
      '      </select>',
      '    </div>',
      '  </div>',
      '  <div class="crm-modal-foot">',
      '    <button type="button" class="btn btn-secondary btn-sm" id="btnCancelTask">Cancel</button>',
      '    <button type="button" class="btn btn-primary btn-sm" id="btnSaveTask">Schedule</button>',
      '  </div>',
      '</div>'
    ].join("");

    modal.querySelector("#taskClose").addEventListener("click", function () { document.body.removeChild(modal); });
    modal.querySelector("#btnCancelTask").addEventListener("click", function () { document.body.removeChild(modal); });
    modal.querySelector("#btnSaveTask").addEventListener("click", function () {
      var title = modal.querySelector("#tTitle").value.trim();
      if (!title) return;
      API.tasks.create({
        title: title,
        task_type: modal.querySelector("#tType").value,
        customer_name: modal.querySelector("#tCustomer").value.trim(),
        assigned_to: modal.querySelector("#tAssignee").value,
        due_date: modal.querySelector("#tDueDate").value,
        priority: modal.querySelector("#tPriority").value
      }).then(function () {
        UI.showToast("Task scheduled successfully", "success");
        document.body.removeChild(modal);
        if (State.get().activeTab === "tasks") {
          renderTasks(document.getElementById("crmAppRoot"));
        }
      });
    });

    document.body.appendChild(modal);
  }

  function exportAllCsv() {
    API.leads.list().then(function (res) {
      var leads = res.data || [];
      var headers = ["Lead ID", "Customer Name", "Company", "Phone", "Email", "Location", "Channel", "Product", "Value (INR)", "Stage", "Priority", "Assigned Employee"];
      var rows = leads.map(function (l) {
        return [
          l.id,
          '"' + (l.name || "").replace(/"/g, '""') + '"',
          '"' + (l.company || "").replace(/"/g, '""') + '"',
          '"' + (l.phone || "").replace(/"/g, '""') + '"',
          '"' + (l.email || "").replace(/"/g, '""') + '"',
          '"' + (l.location || "").replace(/"/g, '""') + '"',
          l.channel,
          '"' + (l.product_model || "").replace(/"/g, '""') + '"',
          l.estimated_value || 0,
          l.stage,
          l.priority,
          '"' + (l.assigned_to || "").replace(/"/g, '""') + '"'
        ].join(",");
      });

      var csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.join("\n");
      var encodedUri = encodeURI(csvContent);
      var link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "seago_crm_leads_" + new Date().toISOString().substring(0, 10) + ".csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      UI.showToast("Exported " + leads.length + " leads to CSV", "success");
    });
  }

  global.SeagoCrmViews = {
    renderOverview: renderOverview,
    renderLeads: renderLeads,
    renderCustomers: renderCustomers,
    renderCustomerDetails: renderCustomerDetails,
    renderUnifiedInbox: renderUnifiedInbox,
    renderTasks: renderTasks,
    renderIntegrations: renderIntegrations,
    openNewInquiryModal: openNewInquiryModal,
    openNewTaskModal: openNewTaskModal,
    exportAllCsv: exportAllCsv
  };

})(window);
