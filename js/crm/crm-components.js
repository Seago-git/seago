/**
 * SEAGÖ CRM 2.0 — Reusable Component Library
 * Enterprise UX components inspired by Linear, Attio, and Intercom.
 * Pure JavaScript · ES5 Compatible.
 */
(function (global) {
  "use strict";

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

  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatCurrency(num) {
    if (!num && num !== 0) return "—";
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

  function formatDateShort(isoStr) {
    if (!isoStr) return "—";
    var d = new Date(isoStr);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  // ── SVG Channels Map ──
  var ICONS = {
    whatsapp: '<svg class="crm-ch-svg" viewBox="0 0 24 24" fill="#25D366"><path d="M17.5 14.4c-.3-.1-1.7-.9-2-1-.3-.1-.5-.1-.6.1-.2.3-.7 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.1.2-.3.3-.4.1-.2 0-.4 0-.5 0-.1-.6-1.5-.8-2-.2-.5-.4-.5-.6-.5h-.5c-.2 0-.5.1-.7.3-.3.3-1 1-1 2.4s1 2.8 1.1 3c.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.7.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 2-1.4.2-.6.2-1.2.2-1.3-.1-.1-.3-.2-.6-.3z"/><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2z"/></svg>',
    instagram: '<svg class="crm-ch-svg" viewBox="0 0 24 24" fill="none" stroke="#E1306C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>',
    facebook: '<svg class="crm-ch-svg" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
    website: '<svg class="crm-ch-svg" viewBox="0 0 24 24" fill="none" stroke="#0284C7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>',
    linkedin: '<svg class="crm-ch-svg" viewBox="0 0 24 24" fill="#0A66C2"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>',
    x: '<svg class="crm-ch-svg" viewBox="0 0 24 24" fill="#0F172A"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
    direct: '<svg class="crm-ch-svg" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>'
  };

  function renderChannelBadge(channelKey) {
    var key = (channelKey || "website").toLowerCase();
    var names = {
      whatsapp: "WhatsApp",
      instagram: "Instagram",
      facebook: "Facebook",
      website: "Website Form",
      linkedin: "LinkedIn",
      x: "X (Twitter)",
      direct: "Direct Hotline"
    };
    var label = names[key] || key;
    var icon = ICONS[key] || ICONS.website;

    var badge = createEl("span", { className: "crm-badge-channel crm-badge-channel--" + key });
    badge.innerHTML = icon + '<span class="crm-badge-label">' + escapeHtml(label) + '</span>';
    return badge;
  }

  function renderStageBadge(stageKey) {
    var key = (stageKey || "new").toLowerCase();
    var meta = {
      new: { label: "New Lead", cls: "crm-stage--new" },
      contacted: { label: "Contacted", cls: "crm-stage--contacted" },
      qualified: { label: "Qualified", cls: "crm-stage--qualified" },
      quotation: { label: "Quotation Sent", cls: "crm-stage--quotation" },
      negotiation: { label: "In Negotiation", cls: "crm-stage--negotiation" },
      won: { label: "Order Won", cls: "crm-stage--won" },
      lost: { label: "Lost / Closed", cls: "crm-stage--lost" },
      qualification: { label: "Qualification", cls: "crm-stage--qualified" },
      quotation_demo: { label: "Quotation / Demo", cls: "crm-stage--quotation" }
    };
    var m = meta[key] || { label: stageKey, cls: "crm-stage--new" };
    return createEl("span", { className: "crm-badge-stage " + m.cls }, m.label);
  }

  function renderPriorityBadge(priorityKey) {
    var key = (priorityKey || "normal").toLowerCase();
    var cls = "crm-priority--" + key;
    var label = key.toUpperCase();
    return createEl("span", { className: "crm-badge-priority " + cls }, label);
  }

  function renderHandoverBadge(statusKey) {
    var meta = {
      bot_active: { label: "Bot Active", cls: "handover-bot", icon: "🤖" },
      human_requested: { label: "Human Requested", cls: "handover-requested", icon: "🙋" },
      human_assigned: { label: "Staff Assigned", cls: "handover-assigned", icon: "👤" },
      human_active: { label: "Live Staff", cls: "handover-active", icon: "🟢" },
      resolved: { label: "Resolved", cls: "handover-resolved", icon: "✓" }
    };
    var m = meta[statusKey] || meta.bot_active;
    var span = createEl("span", { className: "crm-handover-pill " + m.cls });
    span.textContent = m.icon + " " + m.label;
    return span;
  }

  function renderKpiCard(title, value, subtext, iconSvg, accentClass) {
    var card = createEl("div", { className: "crm-kpi-card " + (accentClass || "") });
    var top = createEl("div", { className: "crm-kpi-head" });
    top.appendChild(createEl("span", { className: "crm-kpi-label" }, title));
    if (iconSvg) {
      var icon = createEl("div", { className: "crm-kpi-icon" });
      icon.innerHTML = iconSvg;
      top.appendChild(icon);
    }
    card.appendChild(top);
    card.appendChild(createEl("div", { className: "crm-kpi-val" }, String(value)));
    if (subtext) {
      card.appendChild(createEl("div", { className: "crm-kpi-sub" }, subtext));
    }
    return card;
  }

  function renderDemoModeBanner() {
    var banner = createEl("div", { className: "crm-demo-banner" });
    banner.innerHTML = [
      '<div class="crm-demo-left">',
      '  <span class="crm-demo-tag">DEVELOPMENT DATA MODE</span>',
      '  <span class="crm-demo-msg">Displaying simulated marine fleet inquiries &amp; sample conversations. Production database and third-party APIs will be connected by backend developer.</span>',
      '</div>',
      '<div class="crm-demo-right">',
      '  <label class="crm-demo-toggle-wrap" title="Toggle between local mock store and remote API">',
      '    <input type="checkbox" id="crmDemoToggle" ' + (global.SeagoCrmApi.getDemoMode() ? "checked" : "") + '>',
      '    <span class="crm-toggle-slider"></span>',
      '    <span class="crm-toggle-text">Demo Data</span>',
      '  </label>',
      '</div>'
    ].join("");

    var chk = banner.querySelector("#crmDemoToggle");
    if (chk) {
      chk.addEventListener("change", function (e) {
        global.SeagoCrmApi.setDemoMode(e.target.checked);
        showToast(e.target.checked ? "Switched to Demo Data simulation" : "Switched to Live API connection mode", "info");
      });
    }
    return banner;
  }

  function renderEmptyState(title, message, actionLabel, onAction) {
    var wrap = createEl("div", { className: "crm-empty-state" });
    wrap.innerHTML = [
      '<div class="crm-empty-icon">📭</div>',
      '<h3 class="crm-empty-title">' + escapeHtml(title) + '</h3>',
      '<p class="crm-empty-desc">' + escapeHtml(message) + '</p>'
    ].join("");

    if (actionLabel && onAction) {
      var btn = createEl("button", { className: "btn btn-primary btn-sm crm-empty-btn", type: "button" }, actionLabel);
      btn.addEventListener("click", onAction);
      wrap.appendChild(btn);
    }
    return wrap;
  }

  function renderLoadingSkeleton(rowCount) {
    var count = rowCount || 5;
    var wrap = createEl("div", { className: "crm-skeleton-wrap" });
    for (var i = 0; i < count; i++) {
      var row = createEl("div", { className: "crm-skeleton-row" });
      row.innerHTML = '<div class="crm-skeleton-cell cell-avatar"></div><div class="crm-skeleton-cell cell-long"></div><div class="crm-skeleton-cell cell-short"></div><div class="crm-skeleton-cell cell-pill"></div>';
      wrap.appendChild(row);
    }
    return wrap;
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

  global.SeagoCrmUI = {
    createEl: createEl,
    escapeHtml: escapeHtml,
    formatCurrency: formatCurrency,
    formatTimeAgo: formatTimeAgo,
    formatDateShort: formatDateShort,
    ICONS: ICONS,
    renderChannelBadge: renderChannelBadge,
    renderStageBadge: renderStageBadge,
    renderPriorityBadge: renderPriorityBadge,
    renderHandoverBadge: renderHandoverBadge,
    renderKpiCard: renderKpiCard,
    renderDemoModeBanner: renderDemoModeBanner,
    renderEmptyState: renderEmptyState,
    renderLoadingSkeleton: renderLoadingSkeleton,
    showToast: showToast
  };

})(window);
