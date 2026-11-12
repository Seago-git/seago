/**
 * SEAGÖ CRM — Core Orchestrator & Shell Coordinator
 * Clean 6-Section Enterprise Navigation:
 * 1. Overview  2. Leads  3. Customers  4. Inbox  5. Tasks  6. Integrations
 * ES5 Compatible · Pure JavaScript.
 */
(function (global) {
  "use strict";

  var UI = global.SeagoCrmUI;
  var State = global.SeagoCrmState;
  var Views = global.SeagoCrmViews;

  var CRM_TABS = [
    { key: "overview", label: "Overview", icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>' },
    { key: "leads", label: "Leads", icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="22" y1="12" x2="18" y2="12"></line><line x1="6" y1="12" x2="2" y2="12"></line><line x1="12" y1="6" x2="12" y2="2"></line><line x1="12" y1="22" x2="12" y2="18"></line></svg>' },
    { key: "customers", label: "Customers", icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>' },
    { key: "inbox", label: "Inbox", icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>' },
    { key: "tasks", label: "Tasks", icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>' },
    { key: "integrations", label: "Integrations", icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>' }
  ];

  function renderCrmScreen(action, id) {
    var pageRoot = document.getElementById("page-root");
    if (!pageRoot) return;

    // Normalize route aliases
    var activeTab = action || "overview";
    if (activeTab === "contacts") activeTab = "customers";

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
      '    <span class="crm-nav-title">SEAGÖ CRM</span>',
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
      '      <span class="crm-notif-badge" id="crmNotifBadge" style="display:none;">0</span>',
      '    </button>',
      '    <div class="crm-notif-dropdown" id="crmNotifDropdown" style="display:none;"></div>',
      '  </div>',
      '</div>'
    ].join("");

    // Populate the 6 Tab Pills
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
    var notifBadge = crmNav.querySelector("#crmNotifBadge");

    global.SeagoCrmApi.notifications.list().then(function (res) {
      var notifs = res.data || [];
      var unread = notifs.filter(function (n) { return !n.read; }).length;
      if (notifBadge) {
        if (unread > 0) {
          notifBadge.textContent = unread;
          notifBadge.style.display = "flex";
        } else {
          notifBadge.style.display = "none";
        }
      }
    });

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

    // Route to corresponding view
    renderTabContent(crmBody, activeTab, id);
  }

  function renderTabContent(container, tabKey, id) {
    if (tabKey === "leads") {
      Views.renderLeads(container, id);
    } else if (tabKey === "customers" || tabKey === "contacts") {
      Views.renderCustomers(container, id);
    } else if (tabKey === "inbox") {
      Views.renderUnifiedInbox(container, id);
    } else if (tabKey === "tasks") {
      Views.renderTasks(container, id);
    } else if (tabKey === "integrations") {
      Views.renderIntegrations(container, id);
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
      if (notifs.length === 0) {
        list.innerHTML = '<div style="padding:22px;text-align:center;color:#64748B;font-size:12.5px;">No notifications.</div>';
      } else {
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
      }
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
