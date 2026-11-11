/**
 * SEAGÖ CRM 2.0 — Complete Views & Screens
 * Enterprise-grade UI inspired by Linear, Attio, Intercom & HubSpot.
 * 10 Modules: Overview, Inbox, Leads, Contacts, Opportunities, Tasks, Products, Reports, Integrations, Settings.
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

    // Header with Breadcrumb & Quick Actions
    var header = cEl("div", { className: "crm-view-header" });
    header.innerHTML = [
      '<div class="crm-vh-left">',
      '  <div class="crm-breadcrumbs"><span>CRM</span> <span class="crm-bc-sep">/</span> <span class="crm-bc-active">Sales Overview</span></div>',
      '  <h1 class="crm-vh-title">Executive Sales Overview</h1>',
      '  <p class="crm-vh-sub">Consolidated multi-channel fleet leads, active proposals, and follow-up activities.</p>',
      '</div>',
      '<div class="crm-vh-actions">',
      '  <button type="button" class="btn btn-secondary btn-sm" id="crmExportAllBtn">Export CSV</button>',
      '  <button type="button" class="btn btn-primary btn-sm" id="crmNewLeadQuickBtn">+ New Fleet Inquiry</button>',
      '</div>'
    ].join("");
    wrap.appendChild(header);

    // Development Mode Banner
    wrap.appendChild(UI.renderDemoModeBanner());

    // Fetch Metrics
    API.reports.getDashboardMetrics().then(function (metrics) {
      // 10 Compact KPI Blocks
      var kpiGrid = cEl("div", { className: "crm-kpi-grid-10" });
      kpiGrid.appendChild(UI.renderKpiCard("Total Fleet Leads", metrics.total_leads, "Across 6 channels", UI.ICONS.website, "kpi-navy"));
      kpiGrid.appendChild(UI.renderKpiCard("New Leads Today", metrics.new_leads_today, "2 awaiting first response", UI.ICONS.direct, "kpi-blue"));
      kpiGrid.appendChild(UI.renderKpiCard("Unassigned Inquiries", metrics.unassigned_leads, "Needs sales owner", '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>', "kpi-warning"));
      kpiGrid.appendChild(UI.renderKpiCard("Qualified Prospects", metrics.qualified_leads, "Commercial fit validated", '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>', "kpi-success"));
      kpiGrid.appendChild(UI.renderKpiCard("Active Opportunities", metrics.active_opportunities, "In proposal & demo stage", '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366F1" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>', "kpi-purple"));
      kpiGrid.appendChild(UI.renderKpiCard("Quotations Dispatched", metrics.quotations_sent, "Avg. turnaround < 24h", '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0284C7" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>', "kpi-cyan"));
      kpiGrid.appendChild(UI.renderKpiCard("Follow-ups Pending", metrics.followups_due, "1 due by 4:30 PM today", '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>', "kpi-orange"));
      kpiGrid.appendChild(UI.renderKpiCard("Orders Won", metrics.orders_won, "Commercial contracts closed", '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>', "kpi-green"));
      kpiGrid.appendChild(UI.renderKpiCard("Conversion Rate", metrics.conversion_rate_pct + "%", "Industry benchmark: 22%", '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>', "kpi-blue-2"));
      kpiGrid.appendChild(UI.renderKpiCard("Active Pipeline Value", UI.formatCurrency(metrics.pipeline_value_inr), "Expected close Q4", '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0D9488" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>', "kpi-teal"));
      wrap.appendChild(kpiGrid);

      // Main Dashboard Section: 2 Columns
      var dashGrid = cEl("div", { className: "crm-dash-columns" });

      // Left Column: Pipeline Distribution & Channel Breakdown
      var leftCol = cEl("div", { className: "crm-dash-col" });

      // Sales Pipeline Funnel Card
      var pipeCard = cEl("div", { className: "crm-card" });
      pipeCard.innerHTML = [
        '<div class="crm-card-head">',
        '  <h3 class="crm-card-title">Sales Pipeline Progression</h3>',
        '  <span class="crm-card-badge">7 Active Stages</span>',
        '</div>',
        '<div class="crm-pipeline-funnel">',
        '  <div class="crm-funnel-row"><span class="funnel-label">New Inquiries</span><div class="funnel-bar-wrap"><div class="funnel-bar" style="width:100%; background:#0284C7;"></div></div><span class="funnel-val">1 Lead</span></div>',
        '  <div class="crm-funnel-row"><span class="funnel-label">Contacted</span><div class="funnel-bar-wrap"><div class="funnel-bar" style="width:85%; background:#7C3AED;"></div></div><span class="funnel-val">1 Lead</span></div>',
        '  <div class="crm-funnel-row"><span class="funnel-label">Qualified</span><div class="funnel-bar-wrap"><div class="funnel-bar" style="width:70%; background:#2563EB;"></div></div><span class="funnel-val">2 Leads</span></div>',
        '  <div class="crm-funnel-row"><span class="funnel-label">Quotation / Demo</span><div class="funnel-bar-wrap"><div class="funnel-bar" style="width:55%; background:#D97706;"></div></div><span class="funnel-val">1 Lead</span></div>',
        '  <div class="crm-funnel-row"><span class="funnel-label">Negotiation</span><div class="funnel-bar-wrap"><div class="funnel-bar" style="width:40%; background:#EA580C;"></div></div><span class="funnel-val">1 Lead</span></div>',
        '  <div class="crm-funnel-row"><span class="funnel-label">Contract Won</span><div class="funnel-bar-wrap"><div class="funnel-bar" style="width:30%; background:#16A34A;"></div></div><span class="funnel-val">4 Closed</span></div>',
        '</div>'
      ].join("");
      leftCol.appendChild(pipeCard);

      // Lead Sources Attribution Card
      var sourcesCard = cEl("div", { className: "crm-card" });
      sourcesCard.innerHTML = [
        '<div class="crm-card-head">',
        '  <h3 class="crm-card-title">Lead Acquisition by Channel</h3>',
        '  <span class="crm-card-badge">Multi-Source</span>',
        '</div>',
        '<div class="crm-channel-breakdown">',
        '  <div class="crm-ch-row"><div class="ch-left">' + UI.ICONS.whatsapp + '<span>WhatsApp Business</span></div><div class="ch-bar-wrap"><div class="ch-bar" style="width:45%; background:#25D366;"></div></div><span class="ch-count">3 Leads (37.5%)</span></div>',
        '  <div class="crm-ch-row"><div class="ch-left">' + UI.ICONS.website + '<span>Website Forms (Web3)</span></div><div class="ch-bar-wrap"><div class="ch-bar" style="width:30%; background:#0284C7;"></div></div><span class="ch-count">2 Leads (25.0%)</span></div>',
        '  <div class="crm-ch-row"><div class="ch-left">' + UI.ICONS.instagram + '<span>Instagram DM</span></div><div class="ch-bar-wrap"><div class="ch-bar" style="width:15%; background:#E1306C;"></div></div><span class="ch-count">1 Lead (12.5%)</span></div>',
        '  <div class="crm-ch-row"><div class="ch-left">' + UI.ICONS.facebook + '<span>Facebook Lead Ads</span></div><div class="ch-bar-wrap"><div class="ch-bar" style="width:15%; background:#1877F2;"></div></div><span class="ch-count">1 Lead (12.5%)</span></div>',
        '  <div class="crm-ch-row"><div class="ch-left">' + UI.ICONS.linkedin + '<span>LinkedIn Lead Sync</span></div><div class="ch-bar-wrap"><div class="ch-bar" style="width:15%; background:#0A66C2;"></div></div><span class="ch-count">1 Lead (12.5%)</span></div>',
        '</div>'
      ].join("");
      leftCol.appendChild(sourcesCard);
      dashGrid.appendChild(leftCol);

      // Right Column: Pending Action Items & Team Workload
      var rightCol = cEl("div", { className: "crm-dash-col" });

      // Critical Pending Actions
      var actionsCard = cEl("div", { className: "crm-card" });
      actionsCard.innerHTML = [
        '<div class="crm-card-head">',
        '  <h3 class="crm-card-title">Priority Follow-up Actions</h3>',
        '  <span class="crm-card-badge crm-badge-urgent">Attention Required</span>',
        '</div>',
        '<div class="crm-actions-list">',
        '  <div class="crm-action-item">',
        '    <div class="act-badge act-urgent">URGENT</div>',
        '    <div class="act-info">',
        '      <h4>Send revised proforma invoice to Mandovi Watersports</h4>',
        '      <p>Capt. Vikram Prabhu requested Bimini canopy & audio inclusions for Freedom 8-seater (Due: Today 4:30 PM)</p>',
        '    </div>',
        '    <button class="btn btn-sm btn-outline-primary act-btn" onclick="location.hash=\'#/crm/inbox/conv-2\'">Open DM</button>',
        '  </div>',
        '  <div class="crm-action-item">',
        '    <div class="act-badge act-high">HIGH</div>',
        '    <div class="act-info">',
        '      <h4>Confirm Friday Chennai sea trial for Capt. Rajesh Varma</h4>',
        '      <p>Backwater Cruises (Kochi) · 2x 50 HP motor inquiry (₹24.8L)</p>',
        '    </div>',
        '    <button class="btn btn-sm btn-outline-primary act-btn" onclick="location.hash=\'#/crm/inbox/conv-1\'">Reply</button>',
        '  </div>',
        '  <div class="crm-action-item">',
        '    <div class="act-badge act-new">UNASSIGNED</div>',
        '    <div class="act-info">',
        '      <h4>Assign Chennai Port Authority Commercial RFP</h4>',
        '      <p>Commander N. S. Rao · 20-Seater Passenger Ferry with Twin 50 HP propulsion</p>',
        '    </div>',
        '    <button class="btn btn-sm btn-primary act-btn" onclick="location.hash=\'#/crm/leads/lead-5\'">Assign</button>',
        '  </div>',
        '</div>'
      ].join("");
      rightCol.appendChild(actionsCard);

      // Team Performance & Workload
      var teamCard = cEl("div", { className: "crm-card" });
      teamCard.innerHTML = [
        '<div class="crm-card-head">',
        '  <h3 class="crm-card-title">Team Assignment &amp; Workload</h3>',
        '  <span class="crm-card-badge">3 Executives</span>',
        '</div>',
        '<div class="crm-team-list">',
        '  <div class="crm-team-row">',
        '    <div class="team-user"><div class="team-avatar">AR</div><div><strong>Anand R.</strong><div class="team-sub">Commercial &amp; Govt Accounts</div></div></div>',
        '    <div class="team-stats"><span><strong>2</strong> Leads</span><span><strong>1</strong> Demo</span><span><strong>₹55.8L</strong> Pipe</span></div>',
        '  </div>',
        '  <div class="crm-team-row">',
        '    <div class="team-user"><div class="team-avatar">PM</div><div><strong>Priya M.</strong><div class="team-sub">Tourism &amp; Custom Vessels</div></div></div>',
        '    <div class="team-stats"><span><strong>1</strong> Lead</span><span><strong>1</strong> Negotiation</span><span><strong>₹17.5L</strong> Pipe</span></div>',
        '  </div>',
        '  <div class="crm-team-row">',
        '    <div class="team-user"><div class="team-avatar">DK</div><div><strong>Divya K.</strong><div class="team-sub">Resorts &amp; Outboards</div></div></div>',
        '    <div class="team-stats"><span><strong>2</strong> Leads</span><span><strong>1</strong> Quote</span><span><strong>₹15.4L</strong> Pipe</span></div>',
        '  </div>',
        '</div>'
      ].join("");
      rightCol.appendChild(teamCard);

      dashGrid.appendChild(rightCol);
      wrap.appendChild(dashGrid);
    });

    container.appendChild(wrap);

    // Event listeners
    var expBtn = wrap.querySelector("#crmExportAllBtn");
    if (expBtn) expBtn.addEventListener("click", exportAllCsv);
    var newBtn = wrap.querySelector("#crmNewLeadQuickBtn");
    if (newBtn) newBtn.addEventListener("click", openNewInquiryModal);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 2. UNIFIED INBOX VIEW (3-Column Layout: Linear / Intercom style)
  // ═════════════════════════════════════════════════════════════════════════
  function renderUnifiedInbox(container, conversationId) {
    container.innerHTML = "";
    var wrap = cEl("div", { className: "crm-inbox-shell" });

    // Top Header & Channel Switcher Toolbar
    var topbar = cEl("div", { className: "crm-inbox-topbar" });
    topbar.innerHTML = [
      '<div class="crm-inbox-tb-left">',
      '  <div class="crm-breadcrumbs"><span>CRM</span> <span class="crm-bc-sep">/</span> <span class="crm-bc-active">Unified Multi-Channel Inbox</span></div>',
      '  <h2 class="crm-inbox-title">Unified Customer Conversations</h2>',
      '</div>',
      '<div class="crm-inbox-tb-right">',
      '  <div class="crm-channel-filter-pills" id="inboxChannelPills">',
      '    <button type="button" class="ch-pill is-active" data-ch="all">All Channels</button>',
      '    <button type="button" class="ch-pill" data-ch="whatsapp">' + UI.ICONS.whatsapp + ' WhatsApp</button>',
      '    <button type="button" class="ch-pill" data-ch="instagram">' + UI.ICONS.instagram + ' Instagram</button>',
      '    <button type="button" class="ch-pill" data-ch="facebook">' + UI.ICONS.facebook + ' Facebook</button>',
      '    <button type="button" class="ch-pill" data-ch="website">' + UI.ICONS.website + ' Website</button>',
      '    <button type="button" class="ch-pill" data-ch="linkedin">' + UI.ICONS.linkedin + ' LinkedIn</button>',
      '  </div>',
      '</div>'
    ].join("");
    wrap.appendChild(topbar);

    // 3-Column Container
    var mainCols = cEl("div", { className: "crm-inbox-layout" });

    // ── LEFT COLUMN: CONVERSATION LIST ──
    var leftCol = cEl("div", { className: "crm-inbox-col-left" });
    var leftSearch = cEl("div", { className: "crm-inbox-search" });
    leftSearch.innerHTML = '<input type="text" class="crm-input" placeholder="Search conversations, names, numbers..." id="inboxSearchInput">';
    leftCol.appendChild(leftSearch);

    var convListContainer = cEl("div", { className: "crm-conv-list", id: "convListContainer" });
    leftCol.appendChild(convListContainer);
    mainCols.appendChild(leftCol);

    // ── CENTER COLUMN: CONVERSATION STREAM ──
    var centerCol = cEl("div", { className: "crm-inbox-col-center", id: "inboxCenterCol" });
    mainCols.appendChild(centerCol);

    // ── RIGHT COLUMN: CUSTOMER CONTEXT & QUICK ACTIONS ──
    var rightCol = cEl("div", { className: "crm-inbox-col-right", id: "inboxRightCol" });
    mainCols.appendChild(rightCol);

    wrap.appendChild(mainCols);
    container.appendChild(wrap);

    var activeConvId = conversationId || State.get().activeConversationId || "conv-1";
    var currentFilter = "all";

    function refreshConvList() {
      convListContainer.innerHTML = "";
      API.conversations.list(currentFilter).then(function (res) {
        var convs = res.data || [];
        if (convs.length === 0) {
          convListContainer.appendChild(UI.renderEmptyState("No conversations", "No inquiries found for this channel filter."));
          return;
        }

        convs.forEach(function (conv) {
          var item = cEl("div", {
            className: "crm-conv-item " + (conv.id === activeConvId ? "is-active" : "")
          });
          item.setAttribute("data-id", conv.id);

          var initials = conv.customer_name.split(" ").map(function (n) { return n[0]; }).join("").substring(0, 2);
          item.innerHTML = [
            '<div class="conv-avatar">' + initials + '<span class="conv-ch-icon">' + (UI.ICONS[conv.channel] || UI.ICONS.website) + '</span></div>',
            '<div class="conv-meta">',
            '  <div class="conv-head">',
            '    <strong class="conv-name">' + esc(conv.customer_name) + '</strong>',
            '    <span class="conv-time">' + UI.formatTimeAgo(conv.last_message_at) + '</span>',
            '  </div>',
            '  <div class="conv-snippet">' + esc(conv.last_message) + '</div>',
            '  <div class="conv-foot">',
            '    <span class="conv-assignee">' + esc(conv.assigned_to) + '</span>',
            (conv.unread_count > 0 ? '<span class="conv-unread-dot">' + conv.unread_count + '</span>' : ''),
            '  </div>',
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
          centerCol.appendChild(UI.renderEmptyState("Select Conversation", "Choose a conversation from the left to start viewing."));
          return;
        }

        // 1. Center Column Header (Channel-specific Identity)
        var chatHead = cEl("div", { className: "crm-chat-header crm-chat-header--" + conv.channel });
        chatHead.innerHTML = [
          '<div class="chat-head-left">',
          '  <span class="chat-ch-icon">' + (UI.ICONS[conv.channel] || UI.ICONS.website) + '</span>',
          '  <div>',
          '    <h3 class="chat-user-title">' + esc(conv.customer_name) + '</h3>',
          '    <div class="chat-sub">' + (conv.customer_phone ? esc(conv.customer_phone) : esc(conv.customer_handle || "Online Inquiry")) + '</div>',
          '  </div>',
          '</div>',
          '<div class="chat-head-right">',
          '  <div class="handover-control" id="handoverToggleWrap">',
          '    <span class="ho-label">Automation:</span>',
          '  </div>',
          '  <button type="button" class="btn btn-secondary btn-sm" id="btnResolveConv">' + (conv.is_resolved ? "Reopen" : "Mark Resolved") + '</button>',
          '</div>'
        ].join("");

        // Add handover badge & toggle
        var hoWrap = chatHead.querySelector("#handoverToggleWrap");
        hoWrap.appendChild(UI.renderHandoverBadge(conv.handover_status));

        var hoToggleBtn = cEl("button", {
          className: "btn btn-outline-topbar btn-sm",
          style: { marginLeft: "8px" },
          type: "button"
        }, conv.handover_status === "bot_active" ? "Take Over (Human)" : "Resume Bot");

        hoToggleBtn.addEventListener("click", function () {
          var nextStatus = conv.handover_status === "bot_active" ? "human_active" : "bot_active";
          API.conversations.setHandover(conv.id, nextStatus).then(function () {
            conv.handover_status = nextStatus;
            UI.showToast("Handover mode changed to: " + nextStatus, "success");
            renderActiveConversation(conv.id);
          });
        });
        hoWrap.appendChild(hoToggleBtn);

        centerCol.appendChild(chatHead);

        // 2. Message History Stream
        var msgStream = cEl("div", { className: "crm-chat-stream crm-stream--" + conv.channel, id: "chatMessageStream" });
        (conv.messages || []).forEach(function (m) {
          var row = cEl("div", { className: "crm-msg-row crm-msg-" + m.direction + " crm-msg-ch--" + m.channel });
          row.innerHTML = [
            '<div class="crm-msg-bubble">',
            '  <div class="crm-msg-sender">' + esc(m.sender_name) + '</div>',
            '  <div class="crm-msg-text">' + esc(m.text) + '</div>',
            '  <div class="crm-msg-meta"><span class="msg-time">' + esc(m.timestamp) + '</span>' + (m.direction === "outbound" ? '<span class="msg-check">✓✓</span>' : '') + '</div>',
            '</div>'
          ].join("");
          msgStream.appendChild(row);
        });
        centerCol.appendChild(msgStream);
        setTimeout(function () { msgStream.scrollTop = msgStream.scrollHeight; }, 50);

        // 3. Compose Box
        var composeBox = cEl("div", { className: "crm-chat-compose-box" });
        composeBox.innerHTML = [
          '<div class="compose-toolbar">',
          '  <span class="compose-channel-pill">' + (UI.ICONS[conv.channel] || "") + ' Replying via ' + conv.channel.toUpperCase() + '</span>',
          '  <button type="button" class="btn-tool-icon" title="Insert approved template">📄 Template</button>',
          '  <button type="button" class="btn-tool-icon" title="Attach file or spec sheet">📎 Attach</button>',
          '</div>',
          '<div class="compose-input-row">',
          '  <textarea class="crm-compose-textarea" id="chatReplyInput" placeholder="Type a message or press Shift + Enter for new line..." rows="2"></textarea>',
          '  <button type="button" class="btn btn-primary crm-send-msg-btn" id="chatSendBtn">Send</button>',
          '</div>'
        ].join("");

        var txtArea = composeBox.querySelector("#chatReplyInput");
        var sendBtn = composeBox.querySelector("#chatSendBtn");

        function handleSend() {
          var val = txtArea.value.trim();
          if (!val) return;
          API.conversations.sendMessage(conv.id, val, conv.channel).then(function () {
            txtArea.value = "";
            renderActiveConversation(conv.id);
            UI.showToast("Message sent to customer", "success");
          });
        }

        sendBtn.addEventListener("click", handleSend);
        txtArea.addEventListener("keydown", function (e) {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        });

        centerCol.appendChild(composeBox);

        // 4. Right Column: Customer Context 360
        rightCol.innerHTML = [
          '<div class="crm-card">',
          '  <div class="crm-card-head"><h3 class="crm-card-title">Customer Context</h3><span class="crm-card-badge">' + esc(conv.customer_name) + '</span></div>',
          '  <div class="ctx-kv-list">',
          '    <div class="ctx-kv"><span class="ctx-lbl">Channel Source</span><span class="ctx-val">' + UI.renderChannelBadge(conv.channel).outerHTML + '</span></div>',
          '    <div class="ctx-kv"><span class="ctx-lbl">Owner Assigned</span><span class="ctx-val"><strong>' + esc(conv.assigned_to) + '</strong></span></div>',
          '    <div class="ctx-kv"><span class="ctx-lbl">Priority Level</span><span class="ctx-val">' + UI.renderPriorityBadge(conv.priority).outerHTML + '</span></div>',
          '    <div class="ctx-kv"><span class="ctx-lbl">Phone Number</span><span class="ctx-val">' + esc(conv.customer_phone || "—") + '</span></div>',
          '  </div>',
          '  <div class="ctx-actions-stack">',
          '    <button type="button" class="btn btn-primary btn-sm btn-full" id="btnCtxViewLead">View Lead Details</button>',
          '    <button type="button" class="btn btn-secondary btn-sm btn-full" id="btnCtxCustomer360">Customer 360 Profile</button>',
          '    <button type="button" class="btn btn-secondary btn-sm btn-full" id="btnCtxAddTask">+ Schedule Follow-up</button>',
          '  </div>',
          '</div>'
        ].join("");

        var vLeadBtn = rightCol.querySelector("#btnCtxViewLead");
        if (vLeadBtn) vLeadBtn.addEventListener("click", function () {
          location.hash = "#/crm/leads/" + (conv.lead_id || "lead-1");
        });
        var vCustBtn = rightCol.querySelector("#btnCtxCustomer360");
        if (vCustBtn) vCustBtn.addEventListener("click", function () {
          location.hash = "#/crm/contacts/" + (conv.contact_id || "cont-1");
        });
        var vTaskBtn = rightCol.querySelector("#btnCtxAddTask");
        if (vTaskBtn) vTaskBtn.addEventListener("click", openNewTaskModal);
      });
    }

    // Filter pills
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
  // 3. LEAD MANAGEMENT VIEW (Table & Interactive Kanban Pipeline)
  // ═════════════════════════════════════════════════════════════════════════
  function renderLeads(container, leadId) {
    container.innerHTML = "";
    var wrap = cEl("div", { className: "crm-view-wrap" });

    var header = cEl("div", { className: "crm-view-header" });
    header.innerHTML = [
      '<div class="crm-vh-left">',
      '  <div class="crm-breadcrumbs"><span>CRM</span> <span class="crm-bc-sep">/</span> <span class="crm-bc-active">Fleet Inquiries &amp; Leads</span></div>',
      '  <h1 class="crm-vh-title">Lead Management</h1>',
      '  <p class="crm-vh-sub">Comprehensive multi-channel pipeline with Table and Kanban workflow views.</p>',
      '</div>',
      '<div class="crm-vh-actions">',
      '  <div class="crm-view-switcher">',
      '    <button type="button" class="crm-sw-btn ' + (State.get().leadViewMode === "table" ? "is-active" : "") + '" id="btnLeadViewTable">☰ Table</button>',
      '    <button type="button" class="crm-sw-btn ' + (State.get().leadViewMode === "kanban" ? "is-active" : "") + '" id="btnLeadViewKanban">☷ Kanban</button>',
      '  </div>',
      '  <button type="button" class="btn btn-secondary btn-sm" id="btnExportLeadsCsv">Export CSV</button>',
      '  <button type="button" class="btn btn-primary btn-sm" id="btnCreateNewLead">+ Add Lead</button>',
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
      '    <option value="quotation">Quotation Sent</option>',
      '    <option value="negotiation">In Negotiation</option>',
      '    <option value="won">Won</option>',
      '  </select>',
      '</div>',
      '<div class="crm-tb-right" id="leadBulkActions" style="display:none;">',
      '  <span class="bulk-count" id="bulkSelectedCount">0 selected</span>',
      '  <button type="button" class="btn btn-secondary btn-sm" id="btnBulkAssign">Assign Owner</button>',
      '</div>'
    ].join("");
    wrap.appendChild(toolbar);

    // Content container (Table or Kanban)
    var contentArea = cEl("div", { id: "leadsContentArea" });
    wrap.appendChild(contentArea);

    container.appendChild(wrap);

    // Detailed Drawer overlay
    var drawer = cEl("div", { className: "crm-lead-drawer", id: "leadDetailDrawer", style: { display: "none" } });
    container.appendChild(drawer);

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
        '    <th>Customer &amp; Company</th>',
        '    <th>Channel Source</th>',
        '    <th>Product Interest</th>',
        '    <th>Stage</th>',
        '    <th>Priority</th>',
        '    <th>Assigned To</th>',
        '    <th>Next Action</th>',
        '    <th style="text-align:right;">Actions</th>',
        '  </tr>',
        '</thead>',
        '<tbody id="leadsTableBody"></tbody>'
      ].join("");

      var tbody = table.querySelector("#leadsTableBody");
      leads.forEach(function (lead) {
        var tr = cEl("tr");
        tr.innerHTML = [
          '<td><input type="checkbox" class="chk-lead-row" data-id="' + lead.id + '"></td>',
          '<td><div class="tbl-cust-name"><strong>' + esc(lead.name) + '</strong></div><div class="tbl-cust-sub">' + esc(lead.company || lead.location) + '</div></td>',
          '<td>' + UI.renderChannelBadge(lead.channel).outerHTML + '</td>',
          '<td><div class="tbl-prod">' + esc(lead.product_model) + '</div><div class="tbl-val">' + UI.formatCurrency(lead.estimated_value) + '</div></td>',
          '<td>' + UI.renderStageBadge(lead.stage).outerHTML + '</td>',
          '<td>' + UI.renderPriorityBadge(lead.priority).outerHTML + '</td>',
          '<td><span class="tbl-assignee">' + esc(lead.assigned_to) + '</span></td>',
          '<td><span class="tbl-followup">' + (lead.next_followup ? UI.formatDateShort(lead.next_followup) : "None scheduled") + '</span></td>',
          '<td style="text-align:right;"><button type="button" class="btn btn-secondary btn-sm btn-open-lead" data-id="' + lead.id + '">Inspect &rarr;</button></td>'
        ].join("");

        tr.addEventListener("click", function (e) {
          if (e.target.tagName === "INPUT" || e.target.tagName === "BUTTON") return;
          openLeadDrawer(lead.id);
        });

        var btn = tr.querySelector(".btn-open-lead");
        btn.addEventListener("click", function (e) {
          e.stopPropagation();
          openLeadDrawer(lead.id);
        });

        tbody.appendChild(tr);
      });

      card.appendChild(table);
      target.appendChild(card);

      // Checkbox multi-select logic
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

    // ── Kanban Pipeline View ──
    function renderKanbanPipeline(target, leads) {
      var stages = [
        { key: "new", label: "New Lead", color: "#0284C7" },
        { key: "contacted", label: "Contacted", color: "#7C3AED" },
        { key: "qualified", label: "Qualified", color: "#2563EB" },
        { key: "quotation", label: "Quotation Sent", color: "#D97706" },
        { key: "negotiation", label: "In Negotiation", color: "#EA580C" },
        { key: "won", label: "Order Won", color: "#16A34A" }
      ];

      var board = cEl("div", { className: "crm-kanban-board" });

      stages.forEach(function (stg) {
        var colLeads = leads.filter(function (l) { return l.stage === stg.key; });
        var colVal = colLeads.reduce(function (sum, l) { return sum + (l.estimated_value || 0); }, 0);

        var col = cEl("div", { className: "crm-kanban-col", "data-stage": stg.key });
        col.innerHTML = [
          '<div class="kanban-col-head" style="border-top: 3px solid ' + stg.color + '">',
          '  <div class="col-title-wrap"><strong>' + esc(stg.label) + '</strong><span class="col-badge">' + colLeads.length + '</span></div>',
          '  <div class="col-val-total">' + UI.formatCurrency(colVal) + '</div>',
          '</div>',
          '<div class="kanban-card-stack" id="stack-' + stg.key + '"></div>'
        ].join("");

        var stack = col.querySelector(".kanban-card-stack");
        colLeads.forEach(function (lead) {
          var card = cEl("div", {
            className: "crm-kanban-card",
            draggable: "true",
            "data-id": lead.id
          });

          card.innerHTML = [
            '<div class="kb-card-head">',
            UI.renderChannelBadge(lead.channel).outerHTML,
            UI.renderPriorityBadge(lead.priority).outerHTML,
            '</div>',
            '<h4 class="kb-cust-name">' + esc(lead.name) + '</h4>',
            '<div class="kb-cust-sub">' + esc(lead.company || lead.location) + '</div>',
            '<div class="kb-product-tag">' + esc(lead.product_model) + '</div>',
            '<div class="kb-card-foot">',
            '  <span class="kb-val">' + UI.formatCurrency(lead.estimated_value) + '</span>',
            '  <span class="kb-assignee">' + esc(lead.assigned_to) + '</span>',
            '</div>'
          ].join("");

          card.addEventListener("click", function () {
            openLeadDrawer(lead.id);
          });

          // Drag and drop listeners
          card.addEventListener("dragstart", function (e) {
            e.dataTransfer.setData("text/plain", lead.id);
            card.classList.add("is-dragging");
          });
          card.addEventListener("dragend", function () {
            card.classList.remove("is-dragging");
          });

          stack.appendChild(card);
        });

        // Allow drop on stack
        stack.addEventListener("dragover", function (e) { e.preventDefault(); stack.classList.add("drag-over"); });
        stack.addEventListener("dragleave", function () { stack.classList.remove("drag-over"); });
        stack.addEventListener("drop", function (e) {
          e.preventDefault();
          stack.classList.remove("drag-over");
          var movedLeadId = e.dataTransfer.getData("text/plain");
          if (movedLeadId) {
            API.leads.update(movedLeadId, { stage: stg.key }).then(function () {
              UI.showToast("Lead stage updated to: " + stg.label, "success");
              renderCurrentView();
            });
          }
        });

        board.appendChild(col);
      });

      target.appendChild(board);
    }

    // ── Detailed Lead Slide-Over Drawer ──
    function openLeadDrawer(id) {
      API.leads.get(id).then(function (res) {
        var lead = res.data;
        if (!lead) return;

        drawer.style.display = "block";
        drawer.innerHTML = [
          '<div class="drawer-header">',
          '  <div class="drw-head-left">',
          '    <div class="drw-crumbs">LEAD INSPECTOR · ' + esc(lead.id) + '</div>',
          '    <h2 class="drw-title">' + esc(lead.name) + '</h2>',
          '    <div class="drw-sub">' + esc(lead.company) + ' · ' + esc(lead.location) + '</div>',
          '  </div>',
          '  <button type="button" class="drawer-close" id="drwCloseBtn">&times;</button>',
          '</div>',
          '<div class="drawer-body">',
          '  <div class="drw-section">',
          '    <div class="drw-sec-title">Propulsion &amp; Vessel Specifications</div>',
          '    <div class="drw-spec-grid">',
          '      <div class="drw-spec-item"><span class="lbl">Category</span><strong>' + esc(lead.product_category) + '</strong></div>',
          '      <div class="drw-spec-item"><span class="lbl">Model / Unit</span><strong>' + esc(lead.product_model) + '</strong></div>',
          '      <div class="drw-spec-item"><span class="lbl">Quantity</span><strong>' + (lead.quantity || 1) + ' Units</strong></div>',
          '      <div class="drw-spec-item"><span class="lbl">Motor Power</span><strong>' + esc(lead.motor_hp || "50 HP") + '</strong></div>',
          '      <div class="drw-spec-item"><span class="lbl">Vessel Length</span><strong>' + esc(lead.vessel_length || "—") + '</strong></div>',
          '      <div class="drw-spec-item"><span class="lbl">Passenger Seats</span><strong>' + (lead.seating_capacity ? lead.seating_capacity + " Persons" : "—") + '</strong></div>',
          '      <div class="drw-spec-item"><span class="lbl">Timeline</span><strong>' + esc(lead.purchase_timeline) + '</strong></div>',
          '      <div class="drw-spec-item"><span class="lbl">Proposal Value</span><strong style="color:var(--cyan);">' + UI.formatCurrency(lead.estimated_value) + '</strong></div>',
          '    </div>',
          '  </div>',
          '  <div class="drw-section">',
          '    <div class="drw-sec-title">Sales Assignment &amp; Stage</div>',
          '    <div class="drw-form-row">',
          '      <div><label class="drw-lbl">Lead Stage</label>',
          '        <select class="crm-select" id="drwStageSelect">',
          '          <option value="new" ' + (lead.stage === "new" ? "selected" : "") + '>New</option>',
          '          <option value="contacted" ' + (lead.stage === "contacted" ? "selected" : "") + '>Contacted</option>',
          '          <option value="qualified" ' + (lead.stage === "qualified" ? "selected" : "") + '>Qualified</option>',
          '          <option value="quotation" ' + (lead.stage === "quotation" ? "selected" : "") + '>Quotation Sent</option>',
          '          <option value="negotiation" ' + (lead.stage === "negotiation" ? "selected" : "") + '>Negotiation</option>',
          '          <option value="won" ' + (lead.stage === "won" ? "selected" : "") + '>Won</option>',
          '        </select>',
          '      </div>',
          '      <div><label class="drw-lbl">Assigned Executive</label>',
          '        <select class="crm-select" id="drwAssignSelect">',
          '          <option value="Anand R." ' + (lead.assigned_to === "Anand R." ? "selected" : "") + '>Anand R.</option>',
          '          <option value="Divya K." ' + (lead.assigned_to === "Divya K." ? "selected" : "") + '>Divya K.</option>',
          '          <option value="Priya M." ' + (lead.assigned_to === "Priya M." ? "selected" : "") + '>Priya M.</option>',
          '          <option value="Unassigned" ' + (lead.assigned_to === "Unassigned" ? "selected" : "") + '>Unassigned</option>',
          '        </select>',
          '      </div>',
          '    </div>',
          '  </div>',
          '  <div class="drw-section">',
          '    <div class="drw-sec-title">Internal Commercial Notes</div>',
          '    <div class="drw-notes-list" id="drwNotesList"></div>',
          '    <div class="drw-add-note">',
          '      <input type="text" class="crm-input" id="drwNoteInput" placeholder="Add internal sales note...">',
          '      <button type="button" class="btn btn-primary btn-sm" id="drwSaveNoteBtn">Post Note</button>',
          '    </div>',
          '  </div>',
          '</div>',
          '<div class="drawer-footer">',
          '  <button type="button" class="btn btn-secondary btn-sm" id="drwOpenChatBtn">Open Channel Chat</button>',
          '  <button type="button" class="btn btn-primary btn-sm" id="drwSaveLeadBtn">Save Changes</button>',
          '</div>'
        ].join("");

        // Render notes list
        var nList = drawer.querySelector("#drwNotesList");
        (lead.notes || []).forEach(function (n) {
          var item = cEl("div", { className: "drw-note-bubble" });
          item.innerHTML = '<strong>' + esc(n.author) + '</strong> (' + UI.formatTimeAgo(n.created_at) + ')<p>' + esc(n.text) + '</p>';
          nList.appendChild(item);
        });

        // Close drawer
        drawer.querySelector("#drwCloseBtn").addEventListener("click", function () {
          drawer.style.display = "none";
        });

        // Add note
        drawer.querySelector("#drwSaveNoteBtn").addEventListener("click", function () {
          var inp = drawer.querySelector("#drwNoteInput");
          var txt = inp.value.trim();
          if (!txt) return;
          API.leads.addNote(lead.id, txt, "Admin").then(function () {
            inp.value = "";
            openLeadDrawer(lead.id);
            UI.showToast("Note added successfully", "success");
          });
        });

        // Save stage & assignee
        drawer.querySelector("#drwSaveLeadBtn").addEventListener("click", function () {
          var stg = drawer.querySelector("#drwStageSelect").value;
          var asg = drawer.querySelector("#drwAssignSelect").value;
          API.leads.update(lead.id, { stage: stg, assigned_to: asg }).then(function () {
            drawer.style.display = "none";
            UI.showToast("Lead updated", "success");
            renderCurrentView();
          });
        });

        drawer.querySelector("#drwOpenChatBtn").addEventListener("click", function () {
          location.hash = "#/crm/inbox/conv-1";
        });
      });
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

    // Filters
    var searchBox = wrap.querySelector("#leadSearchInput");
    searchBox.addEventListener("input", function (e) {
      State.setLeadFilter("search", e.target.value.trim());
      renderCurrentView();
    });

    var chFilter = wrap.querySelector("#leadChannelFilter");
    chFilter.addEventListener("change", function (e) {
      State.setLeadFilter("channel", e.target.value);
      renderCurrentView();
    });

    var stFilter = wrap.querySelector("#leadStageFilter");
    stFilter.addEventListener("change", function (e) {
      State.setLeadFilter("stage", e.target.value);
      renderCurrentView();
    });

    var expBtn = wrap.querySelector("#btnExportLeadsCsv");
    expBtn.addEventListener("click", exportAllCsv);

    var addBtn = wrap.querySelector("#btnCreateNewLead");
    addBtn.addEventListener("click", openNewInquiryModal);

    renderCurrentView();

    if (leadId) {
      openLeadDrawer(leadId);
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 4. CUSTOMER 360 & CONTACTS VIEW
  // ═════════════════════════════════════════════════════════════════════════
  function renderContacts(container, contactId) {
    container.innerHTML = "";
    var wrap = cEl("div", { className: "crm-view-wrap" });

    var header = cEl("div", { className: "crm-view-header" });
    header.innerHTML = [
      '<div class="crm-vh-left">',
      '  <div class="crm-breadcrumbs"><span>CRM</span> <span class="crm-bc-sep">/</span> <span class="crm-bc-active">Customer 360 Profiles</span></div>',
      '  <h1 class="crm-vh-title">Customer 360 Directory</h1>',
      '  <p class="crm-vh-sub">Consolidated customer accounts uniting WhatsApp, Website, Social DMs and Inbound RFPs into one single profile.</p>',
      '</div>',
      '<div class="crm-vh-actions">',
      '  <button type="button" class="btn btn-primary btn-sm" id="btnCreateContact">+ New Customer</button>',
      '</div>'
    ].join("");
    wrap.appendChild(header);

    var contactsGrid = cEl("div", { className: "crm-contacts-grid" });
    wrap.appendChild(contactsGrid);
    container.appendChild(wrap);

    API.contacts.list().then(function (res) {
      var contacts = res.data || [];
      contacts.forEach(function (c) {
        var card = cEl("div", { className: "crm-contact-card" });
        var initials = c.name.split(" ").map(function (n) { return n[0]; }).join("").substring(0, 2);

        card.innerHTML = [
          '<div class="cont-card-head">',
          '  <div class="cont-avatar">' + initials + '</div>',
          '  <div class="cont-head-meta">',
          '    <h3 class="cont-name">' + esc(c.name) + '</h3>',
          '    <div class="cont-comp">' + esc(c.company) + '</div>',
          '  </div>',
          '  <span class="cont-badge-type">' + esc(c.customer_type) + '</span>',
          '</div>',
          '<div class="cont-details">',
          '  <div class="cont-kv"><span>Location:</span> <strong>' + esc(c.location) + '</strong></div>',
          '  <div class="cont-kv"><span>Phone:</span> <strong>' + esc(c.phone) + '</strong></div>',
          '  <div class="cont-kv"><span>Email:</span> <strong>' + esc(c.email) + '</strong></div>',
          '  <div class="cont-kv"><span>Assigned:</span> <strong>' + esc(c.assigned_to) + '</strong></div>',
          '</div>',
          '<div class="cont-tags">',
          (c.tags || []).map(function (t) { return '<span class="c-tag">' + esc(t) + '</span>'; }).join(""),
          '</div>',
          '<div class="cont-card-foot">',
          '  <button type="button" class="btn btn-secondary btn-sm btn-full btn-inspect-cust" data-id="' + c.id + '">View Customer 360 Timeline &rarr;</button>',
          '</div>'
        ].join("");

        card.querySelector(".btn-inspect-cust").addEventListener("click", function () {
          openCustomer360Modal(c.id);
        });

        contactsGrid.appendChild(card);
      });
    });

    if (contactId) {
      openCustomer360Modal(contactId);
    }
  }

  function openCustomer360Modal(cId) {
    API.contacts.get(cId).then(function (cRes) {
      var c = cRes.data;
      if (!c) return;

      API.contacts.getTimeline(cId).then(function (tRes) {
        var events = tRes.data || [];
        var modal = cEl("div", { className: "crm-modal-overlay" });
        modal.innerHTML = [
          '<div class="crm-modal-box crm-modal-lg">',
          '  <div class="crm-modal-head">',
          '    <div>',
          '      <span class="crm-badge-priority crm-priority-high">CUSTOMER 360 PROFILE</span>',
          '      <h2 style="margin-top:6px;">' + esc(c.name) + ' · ' + esc(c.company) + '</h2>',
          '      <div style="font-size:12.5px; color:var(--muted);">' + esc(c.location) + ' · ' + esc(c.customer_type) + '</div>',
          '    </div>',
          '    <button type="button" class="crm-modal-close" id="modalCloseBtn">&times;</button>',
          '  </div>',
          '  <div class="crm-modal-body">',
          '    <div class="c360-summary-row">',
          '      <div class="c360-stat"><span class="lbl">WhatsApp Opt-in</span><strong style="color:#25D366;">' + (c.opt_in_whatsapp ? "Verified Opt-in" : "Not Opted") + '</strong></div>',
          '      <div class="c360-stat"><span class="lbl">Primary Account Owner</span><strong>' + esc(c.assigned_to) + '</strong></div>',
          '      <div class="c360-stat"><span class="lbl">Direct Phone</span><strong>' + esc(c.phone) + '</strong></div>',
          '      <div class="c360-stat"><span class="lbl">Business Email</span><strong>' + esc(c.email) + '</strong></div>',
          '    </div>',
          '    <h3 style="font-size:15px; margin:20px 0 12px; font-weight:700;">Multi-Channel Interaction Timeline</h3>',
          '    <div class="c360-timeline" id="c360TimelineList"></div>',
          '  </div>',
          '  <div class="crm-modal-foot">',
          '    <button type="button" class="btn btn-secondary btn-sm" id="btnModalClose">Close</button>',
          '    <button type="button" class="btn btn-primary btn-sm" onclick="location.hash=\'#/crm/inbox/conv-1\'">Open Live Chat Session</button>',
          '  </div>',
          '</div>'
        ].join("");

        var tList = modal.querySelector("#c360TimelineList");
        events.forEach(function (e) {
          var item = cEl("div", { className: "c360-tl-item" });
          item.innerHTML = [
            '<div class="tl-node">' + (UI.ICONS[e.channel] || "📌") + '</div>',
            '<div class="tl-content">',
            '  <div class="tl-head"><strong class="tl-title">' + esc(e.title) + '</strong><span class="tl-time">' + UI.formatDateShort(e.timestamp) + '</span></div>',
            '  <p class="tl-desc">' + esc(e.description) + '</p>',
            '  <div class="tl-actor">Handled by: ' + esc(e.actor) + '</div>',
            '</div>'
          ].join("");
          tList.appendChild(item);
        });

        modal.querySelector("#modalCloseBtn").addEventListener("click", function () { document.body.removeChild(modal); });
        modal.querySelector("#btnModalClose").addEventListener("click", function () { document.body.removeChild(modal); });
        document.body.appendChild(modal);
      });
    });
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 5. OPPORTUNITY PIPELINE VIEW
  // ═════════════════════════════════════════════════════════════════════════
  function renderOpportunities(container) {
    container.innerHTML = "";
    var wrap = cEl("div", { className: "crm-view-wrap" });

    var header = cEl("div", { className: "crm-view-header" });
    header.innerHTML = [
      '<div class="crm-vh-left">',
      '  <div class="crm-breadcrumbs"><span>CRM</span> <span class="crm-bc-sep">/</span> <span class="crm-bc-active">Sales Opportunities</span></div>',
      '  <h1 class="crm-vh-title">Commercial Deals &amp; Opportunities</h1>',
      '  <p class="crm-vh-sub">Fleet electrification proposals, quotes, and closing probability tracking.</p>',
      '</div>',
      '<div class="crm-vh-actions">',
      '  <button type="button" class="btn btn-primary btn-sm" id="btnNewOpportunity">+ New Opportunity</button>',
      '</div>'
    ].join("");
    wrap.appendChild(header);

    var boardContainer = cEl("div", { className: "crm-opp-board-wrap" });
    wrap.appendChild(boardContainer);
    container.appendChild(wrap);

    API.opportunities.list().then(function (res) {
      var opps = res.data || [];
      var stages = [
        { key: "qualification", label: "Qualification", color: "#0284C7" },
        { key: "quotation_demo", label: "Quotation / Demo", color: "#D97706" },
        { key: "negotiation", label: "Negotiation", color: "#EA580C" },
        { key: "won", label: "Contract Won", color: "#16A34A" },
        { key: "lost", label: "Closed / Lost", color: "#64748B" }
      ];

      var board = cEl("div", { className: "crm-kanban-board" });
      stages.forEach(function (stg) {
        var colOpps = opps.filter(function (o) { return o.stage === stg.key; });
        var colVal = colOpps.reduce(function (sum, o) { return sum + (o.estimated_value || 0); }, 0);

        var col = cEl("div", { className: "crm-kanban-col" });
        col.innerHTML = [
          '<div class="kanban-col-head" style="border-top: 3px solid ' + stg.color + '">',
          '  <div class="col-title-wrap"><strong>' + esc(stg.label) + '</strong><span class="col-badge">' + colOpps.length + '</span></div>',
          '  <div class="col-val-total">' + UI.formatCurrency(colVal) + '</div>',
          '</div>',
          '<div class="kanban-card-stack"></div>'
        ].join("");

        var stack = col.querySelector(".kanban-card-stack");
        colOpps.forEach(function (opp) {
          var card = cEl("div", { className: "crm-kanban-card" });
          card.innerHTML = [
            '<div class="kb-card-head"><span class="crm-badge-stage crm-stage--qualified">' + opp.probability_pct + '% Prob</span><span class="kb-close-date">Target: ' + esc(opp.expected_close_date) + '</span></div>',
            '<h4 class="kb-cust-name">' + esc(opp.name) + '</h4>',
            '<div class="kb-cust-sub">' + esc(opp.customer_name) + ' · ' + esc(opp.company) + '</div>',
            '<div class="kb-product-tag">' + esc(opp.product) + ' (x' + (opp.quantity || 1) + ')</div>',
            '<div class="kb-card-foot"><strong class="kb-val">' + UI.formatCurrency(opp.estimated_value) + '</strong><span class="kb-assignee">' + esc(opp.assigned_to) + '</span></div>'
          ].join("");

          card.addEventListener("click", function () {
            location.hash = "#/crm/leads/" + (opp.lead_id || "lead-1");
          });

          stack.appendChild(card);
        });

        board.appendChild(col);
      });

      boardContainer.appendChild(board);
    });

    wrap.querySelector("#btnNewOpportunity").addEventListener("click", function () {
      UI.showToast("Opening New Opportunity Modal", "info");
      openNewInquiryModal();
    });
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 6. TASKS & FOLLOW-UPS VIEW (List & Calendar Views)
  // ═════════════════════════════════════════════════════════════════════════
  function renderTasks(container) {
    container.innerHTML = "";
    var wrap = cEl("div", { className: "crm-view-wrap" });

    var header = cEl("div", { className: "crm-view-header" });
    header.innerHTML = [
      '<div class="crm-vh-left">',
      '  <div class="crm-breadcrumbs"><span>CRM</span> <span class="crm-bc-sep">/</span> <span class="crm-bc-active">Task Management</span></div>',
      '  <h1 class="crm-vh-title">Tasks &amp; Follow-ups</h1>',
      '  <p class="crm-vh-sub">Commercial follow-up calls, sea trial scheduling, proforma revisions, and deadlines.</p>',
      '</div>',
      '<div class="crm-vh-actions">',
      '  <button type="button" class="btn btn-primary btn-sm" id="btnAddNewTask">+ Create Task</button>',
      '</div>'
    ].join("");
    wrap.appendChild(header);

    var taskListCard = cEl("div", { className: "crm-card" });
    var taskList = cEl("div", { className: "crm-tasks-list-wrap" });
    taskListCard.appendChild(taskList);
    wrap.appendChild(taskListCard);
    container.appendChild(wrap);

    API.tasks.list().then(function (res) {
      var tasks = res.data || [];
      tasks.forEach(function (task) {
        var item = cEl("div", { className: "crm-task-row " + (task.status === "completed" ? "is-completed" : "") });
        item.innerHTML = [
          '<div class="task-chk-col"><input type="checkbox" class="task-chk" ' + (task.status === "completed" ? "checked" : "") + '></div>',
          '<div class="task-info-col">',
          '  <h4 class="task-title">' + esc(task.title) + '</h4>',
          '  <div class="task-meta"><span class="task-customer">Customer: ' + esc(task.customer_name || "Commercial Fleet") + '</span> · <span class="task-due">Due: ' + UI.formatDateShort(task.due_date) + '</span></div>',
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

    wrap.querySelector("#btnAddNewTask").addEventListener("click", openNewTaskModal);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 7. PRODUCTS & CATALOGUE INQUIRY CONTEXT
  // ═════════════════════════════════════════════════════════════════════════
  function renderProductsCatalog(container) {
    container.innerHTML = "";
    var wrap = cEl("div", { className: "crm-view-wrap" });

    var header = cEl("div", { className: "crm-view-header" });
    header.innerHTML = [
      '<div class="crm-vh-left">',
      '  <div class="crm-breadcrumbs"><span>CRM</span> <span class="crm-bc-sep">/</span> <span class="crm-bc-active">Seagö Propulsion &amp; Vessel Specs</span></div>',
      '  <h1 class="crm-vh-title">Product &amp; Vessel Catalogue Context</h1>',
      '  <p class="crm-vh-sub">Link customer requirements directly to verified Seagö electric outboards, battery packs, and FRP custom vessels.</p>',
      '</div>',
      '<div class="crm-vh-actions">',
      '  <a href="products.html" target="_blank" rel="noopener" class="btn btn-secondary btn-sm">View Public Catalogue &rarr;</a>',
      '</div>'
    ].join("");
    wrap.appendChild(header);

    var grid = cEl("div", { className: "crm-prod-cat-grid" });

    // Outboard Motors Line
    var mCard = cEl("div", { className: "crm-card" });
    mCard.innerHTML = [
      '<div class="crm-card-head"><h3 class="crm-card-title">Electric Outboard Motors (3 HP – 50 HP)</h3><span class="crm-card-badge">8 Production Models</span></div>',
      '<div class="prod-specs-table">',
      '  <div class="p-row"><strong>3 HP (2.2 kW)</strong><span>51.2V · 50 AH LiFePO4 · Tiller / Remote</span></div>',
      '  <div class="p-row"><strong>7 HP (5.1 kW)</strong><span>51.2V · 105 AH LiFePO4 · Fast displacement</span></div>',
      '  <div class="p-row"><strong>10 HP (7.3 kW)</strong><span>73.6V · 150 AH LiFePO4 · Commercial workboat</span></div>',
      '  <div class="p-row"><strong>15 HP (11 kW)</strong><span>73.6V · 210 AH LiFePO4 · Heavy-duty transit</span></div>',
      '  <div class="p-row"><strong>20 HP (15 kW)</strong><span>96V · 210 AH LiFePO4 · Yacht auxiliary &amp; tender</span></div>',
      '  <div class="p-row"><strong>30 HP (22 kW)</strong><span>96V · 230 AH LiFePO4 · High-speed tourism</span></div>',
      '  <div class="p-row"><strong>40 HP (29.4 kW)</strong><span>144V · 200 AH LiFePO4 · Twin ferry repower</span></div>',
      '  <div class="p-row"><strong>50 HP (36.8 kW)</strong><span>144V · 300 AH LiFePO4 · Commercial flagship</span></div>',
      '</div>'
    ].join("");
    grid.appendChild(mCard);

    // Custom FRP Boats Line
    var bCard = cEl("div", { className: "crm-card" });
    bCard.innerHTML = [
      '<div class="crm-card-head"><h3 class="crm-card-title">Custom Composite FRP Vessels</h3><span class="crm-card-badge">3 Form Factors</span></div>',
      '<div class="prod-specs-table">',
      '  <div class="p-row"><strong>FREEDOM (8 Seater)</strong><span>5.48m L · 1.72m Beam · 0.25m Draft · 50 HP Max · 350-500 Kg</span></div>',
      '  <div class="p-row"><strong>ECSTASY (12 Seater)</strong><span>12.7m L · 2.2m Beam · 0.33-0.45m Draft · 50 HP · Luxury Tourism</span></div>',
      '  <div class="p-row"><strong>CUSTOM 20 (20 Seater)</strong><span>14-16m L · Twin Outboard (2x 50 HP) · Commercial Passenger Shuttle</span></div>',
      '</div>',
      '<div style="margin-top:16px;">',
      '  <button type="button" class="btn btn-primary btn-sm btn-full" id="btnLaunchSpecForm">+ Spec Inquiry for Lead</button>',
      '</div>'
    ].join("");
    grid.appendChild(bCard);

    wrap.appendChild(grid);
    container.appendChild(wrap);

    bCard.querySelector("#btnLaunchSpecForm").addEventListener("click", openNewInquiryModal);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 8. REPORTS & ANALYTICS VIEW
  // ═════════════════════════════════════════════════════════════════════════
  function renderReports(container) {
    container.innerHTML = "";
    var wrap = cEl("div", { className: "crm-view-wrap" });

    var header = cEl("div", { className: "crm-view-header" });
    header.innerHTML = [
      '<div class="crm-vh-left">',
      '  <div class="crm-breadcrumbs"><span>CRM</span> <span class="crm-bc-sep">/</span> <span class="crm-bc-active">Business Analytics</span></div>',
      '  <h1 class="crm-vh-title">Reports &amp; Sales Analytics</h1>',
      '  <p class="crm-vh-sub">Conversion funnels, channel acquisition efficiency, first response time SLAs, and revenue projections.</p>',
      '</div>',
      '<div class="crm-vh-actions">',
      '  <button type="button" class="btn btn-secondary btn-sm" id="btnRepExport">Export Reports CSV</button>',
      '</div>'
    ].join("");
    wrap.appendChild(header);

    var repGrid = cEl("div", { className: "crm-rep-grid" });

    // Chart 1: Conversion Funnel
    var c1 = cEl("div", { className: "crm-card" });
    c1.innerHTML = [
      '<div class="crm-card-head"><h3 class="crm-card-title">Commercial Conversion Funnel</h3><span class="crm-card-badge">38.5% Close Rate</span></div>',
      '<div class="crm-funnel-chart">',
      '  <div class="fn-bar-row"><span class="fn-lbl">Inquiries Received</span><div class="fn-bar-track"><div class="fn-bar-fill" style="width:100%; background:#0284C7;"></div></div><strong>8 Leads</strong></div>',
      '  <div class="fn-bar-row"><span class="fn-lbl">Technical Fit Qualified</span><div class="fn-bar-track"><div class="fn-bar-fill" style="width:75%; background:#2563EB;"></div></div><strong>6 Leads</strong></div>',
      '  <div class="fn-bar-row"><span class="fn-lbl">Proposals Dispatched</span><div class="fn-bar-track"><div class="fn-bar-fill" style="width:50%; background:#D97706;"></div></div><strong>4 Quotes</strong></div>',
      '  <div class="fn-bar-row"><span class="fn-lbl">Contracts Closed &amp; Won</span><div class="fn-bar-track"><div class="fn-bar-fill" style="width:38%; background:#16A34A;"></div></div><strong>3 Won</strong></div>',
      '</div>'
    ].join("");
    repGrid.appendChild(c1);

    // Chart 2: SLA Response Times
    var c2 = cEl("div", { className: "crm-card" });
    c2.innerHTML = [
      '<div class="crm-card-head"><h3 class="crm-card-title">Speed-to-Lead &amp; Response Times</h3><span class="crm-card-badge">Target: &lt; 15 mins</span></div>',
      '<div class="sla-metrics">',
      '  <div class="sla-metric-box"><span class="sla-lbl">WhatsApp Bot Auto-Reply</span><strong>&lt; 2 seconds</strong><span class="sla-note">100% compliance</span></div>',
      '  <div class="sla-metric-box"><span class="sla-lbl">Human Handover First Reply</span><strong>14 minutes</strong><span class="sla-note">Within 15m SLA</span></div>',
      '  <div class="sla-metric-box"><span class="sla-lbl">Formal Proposal Dispatched</span><strong>18.5 hours</strong><span class="sla-note">Target &lt; 24 hours</span></div>',
      '</div>'
    ].join("");
    repGrid.appendChild(c2);

    wrap.appendChild(repGrid);
    container.appendChild(wrap);

    wrap.querySelector("#btnRepExport").addEventListener("click", exportAllCsv);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 9. INTEGRATION CENTRE & WEBHOOK MONITOR
  // ═════════════════════════════════════════════════════════════════════════
  function renderIntegrations(container, activeSub) {
    container.innerHTML = "";
    var wrap = cEl("div", { className: "crm-view-wrap" });

    var header = cEl("div", { className: "crm-view-header" });
    header.innerHTML = [
      '<div class="crm-vh-left">',
      '  <div class="crm-breadcrumbs"><span>CRM</span> <span class="crm-bc-sep">/</span> <span class="crm-bc-active">Integration Centre</span></div>',
      '  <h1 class="crm-vh-title">Connected Channels &amp; Webhook Health</h1>',
      '  <p class="crm-vh-sub">Manage Meta Cloud API, social lead forms, Web3Forms mapping, and monitor real-time event webhooks.</p>',
      '</div>'
    ].join("");
    wrap.appendChild(header);

    // Integrations Grid
    var intGrid = cEl("div", { className: "crm-int-grid" });

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
          (intItem.last_sync_at ? '<div class="int-kv"><span>Last Synchronized:</span> <strong>' + UI.formatTimeAgo(intItem.last_sync_at) + '</strong></div>' : ''),
          (intItem.last_error ? '<div class="int-error-box">' + esc(intItem.last_error) + '</div>' : ''),
          '  <div class="int-caps-wrap">',
          (intItem.capabilities || []).map(function (c) { return '<span class="c-tag">' + esc(c) + '</span>'; }).join(""),
          '  </div>',
          '</div>',
          '<div class="int-card-foot">',
          '  <button type="button" class="btn btn-secondary btn-sm btn-full btn-config-int" data-provider="' + intItem.provider + '">Configure Connection &rarr;</button>',
          '</div>'
        ].join("");

        card.querySelector(".btn-config-int").addEventListener("click", function () {
          openIntegrationConfigModal(intItem);
        });

        intGrid.appendChild(card);
      });
    });

    wrap.appendChild(intGrid);

    // Live Webhook Event Monitoring Section
    var whCard = cEl("div", { className: "crm-card", style: { marginTop: "24px" } });
    whCard.innerHTML = [
      '<div class="crm-card-head">',
      '  <h3 class="crm-card-title">Real-Time Ingestion Webhook Log</h3>',
      '  <span class="crm-card-badge">Frontend Monitor · Auto-refresh</span>',
      '</div>',
      '<div class="wh-table-wrap">',
      '  <table class="crm-table">',
      '    <thead><tr><th>Event ID</th><th>Provider</th><th>Event Type</th><th>Timestamp</th><th>Status</th><th>Payload Summary</th><th style="text-align:right;">Action</th></tr></thead>',
      '    <tbody id="whEventTableBody"></tbody>',
      '  </table>',
      '</div>'
    ].join("");

    var whTbody = whCard.querySelector("#whEventTableBody");
    API.integrations.getWebhookEvents().then(function (res) {
      var events = res.data || [];
      events.forEach(function (evt) {
        var tr = cEl("tr");
        var stCls = evt.processing_status === "success" ? "crm-stage--won" : "crm-stage--lost";
        tr.innerHTML = [
          '<td><code>' + esc(evt.id) + '</code></td>',
          '<td>' + UI.renderChannelBadge(evt.provider).outerHTML + '</td>',
          '<td><strong>' + esc(evt.event_type) + '</strong></td>',
          '<td>' + UI.formatTimeAgo(evt.received_at) + '</td>',
          '<td><span class="crm-badge-stage ' + stCls + '">' + esc(evt.processing_status.toUpperCase()) + '</span></td>',
          '<td><span class="tbl-cust-sub">' + esc(evt.payload_summary) + '</span></td>',
          '<td style="text-align:right;"><button type="button" class="btn btn-secondary btn-sm btn-retry-wh" data-id="' + evt.id + '">Retry</button></td>'
        ].join("");

        tr.querySelector(".btn-retry-wh").addEventListener("click", function () {
          API.integrations.retryWebhookEvent(evt.id).then(function () {
            UI.showToast("Webhook event queued for retry", "success");
            renderIntegrations(container, activeSub);
          });
        });

        whTbody.appendChild(tr);
      });
    });

    wrap.appendChild(whCard);
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
      '    <div class="form-group">',
      '      <label>Connection Status</label>',
      '      <input type="text" class="crm-input" value="' + esc(intItem.status) + '" readonly style="background:#F1F5F9;">',
      '    </div>',
      (intItem.provider === "whatsapp" ? [
        '<div class="form-group"><label>Meta App ID</label><input type="text" class="crm-input" value="' + esc(intItem.app_id || "") + '"></div>',
        '<div class="form-group"><label>WhatsApp Business Account ID (WABA)</label><input type="text" class="crm-input" value="' + esc(intItem.waba_id || "") + '"></div>',
        '<div class="form-group"><label>Phone Number ID</label><input type="text" class="crm-input" value="' + esc(intItem.phone_number_id || "") + '"></div>',
        '<div class="form-group"><label>Access Token (Masked for Security)</label><input type="password" class="crm-input" value="EAAGxxxxxxxxxxxxxxxxxxxxxxxZD" readonly></div>'
      ].join("") : ''),
      '    <div class="form-group"><label>Webhook Verification Callback URL</label><input type="text" class="crm-input" value="https://api.seago.in/webhooks/' + esc(intItem.provider) + '" readonly style="background:#F1F5F9;"></div>',
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
  // 10. SETTINGS VIEW
  // ═════════════════════════════════════════════════════════════════════════
  function renderSettings(container) {
    container.innerHTML = "";
    var wrap = cEl("div", { className: "crm-view-wrap" });

    var header = cEl("div", { className: "crm-view-header" });
    header.innerHTML = [
      '<div class="crm-vh-left">',
      '  <div class="crm-breadcrumbs"><span>CRM</span> <span class="crm-bc-sep">/</span> <span class="crm-bc-active">Settings</span></div>',
      '  <h1 class="crm-vh-title">CRM System Configuration</h1>',
      '  <p class="crm-vh-sub">Manage round-robin routing, notification channels, business hours, and API endpoints.</p>',
      '</div>',
      '<div class="crm-vh-actions">',
      '  <button type="button" class="btn btn-primary btn-sm" id="btnSaveCrmSettings">Save Preferences</button>',
      '</div>'
    ].join("");
    wrap.appendChild(header);

    var card = cEl("div", { className: "crm-card" });
    card.innerHTML = [
      '<div class="crm-card-head"><h3 class="crm-card-title">Backend API Environment</h3></div>',
      '<div class="form-group" style="margin-bottom:18px;">',
      '  <label>API Base Endpoint URL</label>',
      '  <input type="text" class="crm-input" id="crmApiBaseInput" value="' + esc(API.getApiBaseUrl()) + '">',
      '  <small style="color:var(--muted); font-size:11.5px;">The URL where the backend developer deploys CRM REST endpoints.</small>',
      '</div>',
      '<div class="form-group" style="margin-bottom:18px;">',
      '  <label>Automated Lead Assignment Rule</label>',
      '  <select class="crm-select">',
      '    <option>Round-Robin Across Active Sales Executives</option>',
      '    <option>Product-Based Specialty (Outboards vs Custom FRP Boats)</option>',
      '    <option>Geographic Region (Kerala vs Goa vs Odisha vs Port Blair)</option>',
      '  </select>',
      '</div>',
      '<div class="form-group">',
      '  <label>Business Operating Hours (for automated WhatsApp Bot)</label>',
      '  <input type="text" class="crm-input" value="09:00 AM – 07:00 PM IST (Mon–Sat)">',
      '</div>'
    ].join("");

    wrap.appendChild(card);
    container.appendChild(wrap);

    wrap.querySelector("#btnSaveCrmSettings").addEventListener("click", function () {
      var newBase = wrap.querySelector("#crmApiBaseInput").value.trim();
      API.setApiBaseUrl(newBase);
      UI.showToast("CRM settings and API base updated", "success");
    });
  }

  // ═════════════════════════════════════════════════════════════════════════
  // SHARED MODALS: New Fleet Inquiry & New Task
  // ═════════════════════════════════════════════════════════════════════════
  function openNewInquiryModal() {
    var modal = cEl("div", { className: "crm-modal-overlay" });
    modal.innerHTML = [
      '<div class="crm-modal-box">',
      '  <div class="crm-modal-head">',
      '    <h3>+ Log New Commercial Fleet Inquiry</h3>',
      '    <button type="button" class="crm-modal-close" id="newInqClose">&times;</button>',
      '  </div>',
      '  <div class="crm-modal-body">',
      '    <div class="form-group"><label>Customer Name *</label><input type="text" class="crm-input" id="inqName" placeholder="e.g. Capt. Rajesh Varma" required></div>',
      '    <div class="form-group"><label>Company / Organization</label><input type="text" class="crm-input" id="inqCompany" placeholder="e.g. Backwater Cruises"></div>',
      '    <div class="form-group"><label>Phone Number *</label><input type="tel" class="crm-input" id="inqPhone" placeholder="+91 98470 23145" required></div>',
      '    <div class="form-group"><label>Location</label><input type="text" class="crm-input" id="inqLocation" placeholder="Kochi, Kerala"></div>',
      '    <div class="form-group"><label>Interested Product Category</label>',
      '      <select class="crm-select" id="inqCategory">',
      '        <option value="Outboard Motor">Electric Outboard Motor (3–50 HP)</option>',
      '        <option value="Custom Electric Boat">Freedom 8-Seater FRP Boat</option>',
      '        <option value="Custom Solar Boat">Ecstasy 12-Seater Solar Boat</option>',
      '        <option value="Commercial Ferry">Custom 20-Seater Commercial Shuttle</option>',
      '      </select>',
      '    </div>',
      '    <div class="form-group"><label>Channel Source</label>',
      '      <select class="crm-select" id="inqChannel">',
      '        <option value="direct">Direct Phone Hotline</option>',
      '        <option value="whatsapp">WhatsApp Inbound</option>',
      '        <option value="website">Website Form</option>',
      '        <option value="instagram">Instagram</option>',
      '        <option value="facebook">Facebook</option>',
      '      </select>',
      '    </div>',
      '    <div class="form-group"><label>Estimated Contract Value (INR)</label><input type="number" class="crm-input" id="inqValue" placeholder="1250000" value="1250000"></div>',
      '  </div>',
      '  <div class="crm-modal-foot">',
      '    <button type="button" class="btn btn-secondary btn-sm" id="btnCancelInq">Cancel</button>',
      '    <button type="button" class="btn btn-primary btn-sm" id="btnSaveInq">Create Inquiry</button>',
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
        product_category: modal.querySelector("#inqCategory").value,
        product_model: modal.querySelector("#inqCategory").value,
        channel: modal.querySelector("#inqChannel").value,
        estimated_value: Number(modal.querySelector("#inqValue").value) || 1000000,
        stage: "new",
        assigned_to: "Anand R."
      };
      API.leads.create(newLead).then(function () {
        UI.showToast("Inquiry created: " + name, "success");
        document.body.removeChild(modal);
        if (State.get().activeTab === "leads") {
          renderLeads(document.getElementById("crmAppRoot"));
        } else {
          location.hash = "#/crm/leads";
        }
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
      var headers = ["Lead ID", "Customer Name", "Company", "Phone", "Email", "Location", "Channel", "Product", "Value (INR)", "Stage", "Priority", "Assigned To"];
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
    renderUnifiedInbox: renderUnifiedInbox,
    renderLeads: renderLeads,
    renderContacts: renderContacts,
    renderOpportunities: renderOpportunities,
    renderTasks: renderTasks,
    renderProductsCatalog: renderProductsCatalog,
    renderReports: renderReports,
    renderIntegrations: renderIntegrations,
    renderSettings: renderSettings,
    openNewInquiryModal: openNewInquiryModal,
    openNewTaskModal: openNewTaskModal,
    exportAllCsv: exportAllCsv
  };

})(window);
