/**
 * SEAGÖ CRM 2.0 — Orchestrator & Shell Coordinator
 * Bridges into Admin Studio SPA architecture and router.
 * ES5 Compatible · Pure JavaScript.
 */
(function (global) {
  "use strict";

  var UI = global.SeagoCrmUI;
  var State = global.SeagoCrmState;
  var Views = global.SeagoCrmViews;

  var CRM_TABS = [
    { key: "overview", label: "Overview", icon: "📊" },
    { key: "inbox", label: "Unified Inbox", icon: "💬" },
    { key: "leads", label: "Leads & Inquiries", icon: "🎯" },
    { key: "contacts", label: "Customer 360", icon: "👥" },
    { key: "opportunities", label: "Opportunities", icon: "💼" },
    { key: "tasks", label: "Tasks & Follow-ups", icon: "📋" },
    { key: "products", label: "Propulsion Catalogue", icon: "⚡" },
    { key: "reports", label: "Reports & SLAs", icon: "📈" },
    { key: "integrations", label: "Integrations & Webhooks", icon: "🔌" },
    { key: "settings", label: "Settings", icon: "⚙️" }
  ];

  function renderCrmScreen(action, id) {
    var pageRoot = document.getElementById("page-root");
    if (!pageRoot) return;

    var activeTab = action || "overview";
    State.set("activeTab", activeTab);
    State.set("subRoute", action);
    State.set("selectedId", id);

    pageRoot.innerHTML = "";

    // ── CRM Shell Wrapper ──
    var crmShell = UI.createEl("div", { className: "crm-app-shell" });

    // ── CRM Top Header Navigation Bar ──
    var crmNav = UI.createEl("header", { className: "crm-top-nav" });
    crmNav.innerHTML = [
      '<div class="crm-nav-left">',
      '  <div class="crm-nav-brand">',
      '    <span class="crm-nav-logo-dot"></span>',
      '    <span class="crm-nav-title">SEAGÖ CRM 2.0</span>',
      '    <span class="crm-badge-env ' + (global.SeagoCrmApi.getDemoMode() ? "is-demo" : "is-live") + '">' + (global.SeagoCrmApi.getDemoMode() ? "DEV DATA" : "LIVE API") + '</span>',
      '  </div>',
      '</div>',
      '<div class="crm-nav-center">',
      '  <nav class="crm-tabs-list" id="crmTabsList" role="tablist"></nav>',
      '</div>',
      '<div class="crm-nav-right">',
      '  <div class="crm-notif-wrap" id="crmNotifWrap">',
      '    <button type="button" class="crm-notif-btn" id="crmNotifBtn" title="In-App Notifications" aria-label="Notifications">',
      '      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>',
      '      <span class="crm-notif-badge">2</span>',
      '    </button>',
      '    <div class="crm-notif-dropdown" id="crmNotifDropdown" style="display:none;"></div>',
      '  </div>',
      '</div>'
    ].join("");

    // Populate Tab Pills
    var tabsList = crmNav.querySelector("#crmTabsList");
    CRM_TABS.forEach(function (tab) {
      var btn = UI.createEl("button", {
        type: "button",
        role: "tab",
        className: "crm-tab-btn " + (tab.key === activeTab ? "is-active" : ""),
        "data-tab": tab.key
      });
      btn.innerHTML = '<span class="tab-icon">' + tab.icon + '</span><span class="tab-label">' + tab.label + '</span>';
      btn.addEventListener("click", function () {
        location.hash = "#/crm/" + tab.key;
      });
      tabsList.appendChild(btn);
    });

    // Notifications Dropdown Logic
    var notifBtn = crmNav.querySelector("#crmNotifBtn");
    var notifMenu = crmNav.querySelector("#crmNotifDropdown");
    notifBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      var isHidden = notifMenu.style.display === "none";
      notifMenu.style.display = isHidden ? "block" : "none";
      if (isHidden) {
        renderNotificationsMenu(notifMenu);
      }
    });

    document.addEventListener("click", function () {
      if (notifMenu) notifMenu.style.display = "none";
    });

    crmShell.appendChild(crmNav);

    // ── Main Content Container ──
    var crmBody = UI.createEl("div", { className: "crm-app-body", id: "crmAppRoot" });
    crmShell.appendChild(crmBody);

    pageRoot.appendChild(crmShell);

    // Render corresponding view module
    renderTabContent(crmBody, activeTab, id);
  }

  function renderTabContent(container, tabKey, id) {
    if (tabKey === "inbox") {
      Views.renderUnifiedInbox(container, id);
    } else if (tabKey === "leads") {
      Views.renderLeads(container, id);
    } else if (tabKey === "contacts") {
      Views.renderContacts(container, id);
    } else if (tabKey === "opportunities") {
      Views.renderOpportunities(container, id);
    } else if (tabKey === "tasks") {
      Views.renderTasks(container, id);
    } else if (tabKey === "products") {
      Views.renderProductsCatalog(container, id);
    } else if (tabKey === "reports") {
      Views.renderReports(container, id);
    } else if (tabKey === "integrations") {
      Views.renderIntegrations(container, id);
    } else if (tabKey === "settings") {
      Views.renderSettings(container, id);
    } else {
      Views.renderOverview(container, id);
    }
  }

  function renderNotificationsMenu(target) {
    target.innerHTML = "";
    global.SeagoCrmApi.notifications.list().then(function (res) {
      var notifs = res.data || [];
      var head = UI.createEl("div", { className: "notif-menu-head" });
      head.innerHTML = '<strong>In-App Notifications</strong><button type="button" class="btn-link-sm" id="btnMarkAllRead">Mark all read</button>';
      target.appendChild(head);

      var list = UI.createEl("div", { className: "notif-menu-list" });
      notifs.forEach(function (n) {
        var item = UI.createEl("div", { className: "notif-item " + (n.read ? "is-read" : "is-unread") });
        item.innerHTML = [
          '<div class="notif-item-title">' + UI.escapeHtml(n.title) + '</div>',
          '<div class="notif-item-msg">' + UI.escapeHtml(n.message) + '</div>',
          '<div class="notif-item-time">' + UI.formatTimeAgo(n.timestamp) + '</div>'
        ].join("");
        item.addEventListener("click", function () {
          if (n.route) location.hash = n.route;
        });
        list.appendChild(item);
      });
      target.appendChild(list);

      head.querySelector("#btnMarkAllRead").addEventListener("click", function (e) {
        e.stopPropagation();
        global.SeagoCrmApi.notifications.markAllRead().then(function () {
          var badge = document.querySelector(".crm-notif-badge");
          if (badge) badge.style.display = "none";
          renderNotificationsMenu(target);
          UI.showToast("All notifications marked as read", "info");
        });
      });
    });
  }

  // ── Public Export ──
  global.SeagoCRM = {
    renderCrmScreen: renderCrmScreen,
    openNewInquiryModal: Views.openNewInquiryModal,
    openNewTaskModal: Views.openNewTaskModal,
    exportLeadsCsv: Views.exportAllCsv
  };

})(window);
