// NOT REAL SECURITY — replace with server-side auth before production.
(function(){
  "use strict";

  // ================= 1. CONSTANTS & APPLICATION STATE =================
  var ADMIN_EMAIL = "admin@seago.in";
  var ADMIN_PASS = "seago-admin";
  var SESSION_KEY = "seago_admin_session";

  var currentRoute = "";
  var isDirty = false;
  var trapFocusCleanup = null;

  // DOM node caches
  var loginScreen = document.getElementById("admin-login");
  var adminApp = document.getElementById("admin-app");
  var pageRoot = document.getElementById("page-root");
  var pageTitle = document.getElementById("pageTitle");
  var burgerBtn = document.getElementById("burgerBtn");
  var sidebarOverlay = document.getElementById("sidebar-overlay");
  var modalContainer = document.getElementById("modal-container");
  var toastContainer = document.getElementById("toast-container");
  var loginForm = document.getElementById("loginForm");
  var loginError = document.getElementById("loginError");
  var logoutBtn = document.getElementById("logoutBtn");
  var demoBanner = document.getElementById("demoBanner");
  var demoBannerClose = document.getElementById("demoBannerClose");

  // ================= 2. UTILITY & SECURITY HELPERS =================
  function escapeHtml(str) {
    if (str === null || str === undefined) {
      return "";
    }
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
        if (Object.prototype.hasOwnProperty.call(attrs, k)) {
          if (k === "className") {
            el.className = attrs[k];
          } else if (k === "style" && typeof attrs[k] === "object") {
            for (var sk in attrs[k]) {
              if (Object.prototype.hasOwnProperty.call(attrs[k], sk)) {
                el.style[sk] = attrs[k][sk];
              }
            }
          } else {
            el.setAttribute(k, attrs[k]);
          }
        }
      }
    }
    if (text !== undefined && text !== null) {
      el.textContent = text;
    }
    return el;
  }

  function showToast(message, type) {
    var toast = createEl("div", { className: "toast toast-" + (type || "info") });
    var msgSpan = createEl("span", null, message);
    toast.appendChild(msgSpan);
    toastContainer.appendChild(toast);
    setTimeout(function(){
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 3500);
  }

  function openModal(options) {
    closeModal();
    var dialog = createEl("div", { className: "modal-dialog", role: "document" });
    if (options.maxWidth) {
      dialog.style.maxWidth = options.maxWidth;
    }
    var title = createEl("h3", { className: "modal-title" }, options.title || "Confirm");
    var body = createEl("div", { className: "modal-body" });

    if (options.bodyText) {
      body.textContent = options.bodyText;
    } else if (options.bodyEl) {
      body.appendChild(options.bodyEl);
    }

    var actions = createEl("div", { className: "modal-actions" });
    var cancelBtn = createEl("button", { type: "button", className: "btn btn-secondary" }, options.cancelLabel || (options.hideConfirm ? "Close" : "Cancel"));
    cancelBtn.addEventListener("click", closeModal);
    actions.appendChild(cancelBtn);

    if (!options.hideConfirm) {
      var confirmBtn = createEl("button", {
        type: "button",
        className: "btn " + (options.danger ? "btn-danger" : "btn-primary")
      }, options.confirmLabel || "Confirm");

      confirmBtn.addEventListener("click", function(){
        closeModal();
        if (typeof options.onConfirm === "function") {
          options.onConfirm();
        }
      });
      actions.appendChild(confirmBtn);
    }

    dialog.appendChild(title);
    dialog.appendChild(body);
    dialog.appendChild(actions);

    modalContainer.innerHTML = "";
    modalContainer.appendChild(dialog);
    modalContainer.style.display = "flex";

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        closeModal();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    trapFocusCleanup = function(){
      document.removeEventListener("keydown", handleKeyDown);
    };
    cancelBtn.focus();
  }

  function closeModal() {
    modalContainer.style.display = "none";
    modalContainer.innerHTML = "";
    if (trapFocusCleanup) {
      trapFocusCleanup();
      trapFocusCleanup = null;
    }
  }

  modalContainer.addEventListener("click", function(e){
    if (e.target === modalContainer) {
      closeModal();
    }
  });

  // Lightbox Zoom Helper
  function openLightbox(imageUrl, title) {
    var wrap = createEl("div", { style: { textAlign: "center" } });
    var img = createEl("img", {
      src: imageUrl,
      alt: title || "Preview",
      style: {
        maxWidth: "100%",
        maxHeight: "70vh",
        objectFit: "contain",
        borderRadius: "8px",
        background: "#070F24",
        boxShadow: "0 10px 25px rgba(0,0,0,0.5)"
      }
    });
    wrap.appendChild(img);
    openModal({
      title: title || "Media Preview",
      bodyEl: wrap,
      hideConfirm: true,
      cancelLabel: "Close",
      maxWidth: "720px"
    });
  }

  // ================= 3. AUTHENTICATION & SIDEBAR SYNC =================
  function isAuthenticated() {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  }

  function checkAuth() {
    if (isAuthenticated()) {
      loginScreen.style.display = "none";
      adminApp.style.display = "block";
      updateSidebarBadges();
      return true;
    } else {
      loginScreen.style.display = "flex";
      adminApp.style.display = "none";
      return false;
    }
  }

  function updateSidebarBadges() {
    var cols = ["motors", "battery_packs", "boats", "case_studies", "gallery_items"];
    cols.forEach(function(col){
      var badge = document.getElementById("badge_" + col);
      if (badge && window.SeagoStore) {
        window.SeagoStore.list(col, function(err, items){
          if (!err && items) {
            badge.textContent = String(items.length);
          }
        });
      }
    });
  }

  loginForm.addEventListener("submit", function(e){
    e.preventDefault();
    var email = document.getElementById("loginEmail").value.trim();
    var pass = document.getElementById("loginPassword").value;
    if (email === ADMIN_EMAIL && pass === ADMIN_PASS) {
      sessionStorage.setItem(SESSION_KEY, "1");
      loginError.classList.remove("show");
      checkAuth();
      if (!window.location.hash || window.location.hash === "#/") {
        window.location.hash = "#/dashboard";
      } else {
        handleRouting();
      }
      showToast("Signed in to console", "success");
    } else {
      loginError.textContent = "Invalid credentials. Use demo credentials shown below.";
      loginError.classList.add("show");
    }
  });

  logoutBtn.addEventListener("click", function(){
    openModal({
      title: "Sign Out",
      bodyText: "Are you sure you want to sign out of the admin panel?",
      confirmLabel: "Sign Out",
      onConfirm: function(){
        sessionStorage.removeItem(SESSION_KEY);
        isDirty = false;
        checkAuth();
        showToast("Signed out successfully", "info");
      }
    });
  });

  if (demoBannerClose && demoBanner) {
    demoBannerClose.addEventListener("click", function(){
      demoBanner.style.display = "none";
    });
  }

  // Mobile drawer controls
  function toggleSidebar(open) {
    if (open) {
      document.body.classList.add("sidebar-open");
      burgerBtn.setAttribute("aria-expanded", "true");
    } else {
      document.body.classList.remove("sidebar-open");
      burgerBtn.setAttribute("aria-expanded", "false");
    }
  }

  burgerBtn.addEventListener("click", function(){
    var isOpen = document.body.classList.contains("sidebar-open");
    toggleSidebar(!isOpen);
  });

  sidebarOverlay.addEventListener("click", function(){
    toggleSidebar(false);
  });

  // Global hotkeys (Ctrl+S / Cmd+S to save, / to search)
  document.addEventListener("keydown", function(e){
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      var saveBtn = document.querySelector("#page-root form button[type='submit']");
      if (saveBtn && !saveBtn.disabled) {
        e.preventDefault();
        saveBtn.click();
      }
    } else if (e.key === "/" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
      var search = document.querySelector(".search-box input");
      if (search) {
        e.preventDefault();
        search.focus();
      }
    }
  });

  // Unsaved changes warning
  window.addEventListener("beforeunload", function(e){
    if (isDirty) {
      e.preventDefault();
      e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
      return e.returnValue;
    }
  });

  // ================= 4. FILE UPLOADS & WEBP RESIZE =================
  function processImageFile(file, cb) {
    if (!file || !file.type.match(/^image\//)) {
      cb(new Error("Please select a valid image file."));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      cb(new Error("Image size must be less than 5MB."));
      return;
    }

    var reader = new FileReader();
    reader.onload = function(e){
      var img = new Image();
      img.onload = function(){
        var maxSide = 1600;
        var width = img.width;
        var height = img.height;

        if (width > maxSide || height > maxSide) {
          if (width > height) {
            height = Math.round((height * maxSide) / width);
            width = maxSide;
          } else {
            width = Math.round((width * maxSide) / height);
            maxSide = height;
          }
        }

        var canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        if (canvas.toBlob) {
          canvas.toBlob(function(blob){
            if (!blob) {
              canvas.toBlob(function(jpgBlob){
                window.SeagoStore.uploadFile("image", jpgBlob || file, cb);
              }, "image/jpeg", 0.82);
            } else {
              window.SeagoStore.uploadFile("image", blob, cb);
            }
          }, "image/webp", 0.82);
        } else {
          window.SeagoStore.uploadFile("image", file, cb);
        }
      };
      img.onerror = function(){
        cb(new Error("Failed to process image file."));
      };
      img.src = e.target.result;
    };
    reader.onerror = function(){
      cb(new Error("Failed to read image file."));
    };
    reader.readAsDataURL(file);
  }

  function processPdfFile(file, cb) {
    if (!file || file.type !== "application/pdf") {
      cb(new Error("Please select a valid PDF file."));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      cb(new Error("PDF file size must be less than 10MB."));
      return;
    }
    window.SeagoStore.uploadFile("pdf", file, cb);
  }

  // ================= 5. ROUTING & CONTROLLER DISPATCH =================
  function updateNavLinks(route) {
    var links = document.querySelectorAll(".sidebar-nav .nav-link");
    for (var i = 0; i < links.length; i++) {
      var r = links[i].getAttribute("data-route");
      if (r && route.indexOf(r) === 0) {
        links[i].classList.add("active");
      } else {
        links[i].classList.remove("active");
      }
    }
  }

  function handleRouting() {
    if (!checkAuth()) {
      return;
    }

    var hash = window.location.hash || "#/dashboard";
    if (hash === "#" || hash === "#/") {
      hash = "#/dashboard";
    }

    if (isDirty) {
      var proceed = window.confirm("You have unsaved changes. Discard and proceed?");
      if (!proceed) {
        window.location.hash = currentRoute;
        return;
      }
      isDirty = false;
    }

    toggleSidebar(false);
    currentRoute = hash;
    var path = hash.substring(1);
    updateNavLinks(path);

    var parts = path.split("/").filter(function(p){ return p.length > 0; });
    var root = parts[0] || "dashboard";
    var action = parts[1] || "";
    var id = parts[2] || "";

    if (root === "dashboard") {
      pageTitle.textContent = "Executive Dashboard";
      renderDashboard();
    } else if (root === "motors") {
      if (action === "new") {
        pageTitle.textContent = "New Outboard Motor";
        renderMotorForm(null);
      } else if (action === "edit" && id) {
        pageTitle.textContent = "Edit Outboard Motor";
        renderMotorForm(id);
      } else {
        pageTitle.textContent = "Outboard Motors (3–50 HP)";
        renderMotorsList();
      }
    } else if (root === "battery-packs") {
      if (action === "new") {
        pageTitle.textContent = "New Marine Battery Pack";
        renderBatteryForm(null);
      } else if (action === "edit" && id) {
        pageTitle.textContent = "Edit Battery Pack";
        renderBatteryForm(id);
      } else {
        pageTitle.textContent = "LiFePO4 Marine Battery Packs";
        renderBatteryList();
      }
    } else if (root === "boats") {
      if (action === "new") {
        pageTitle.textContent = "New Electric Boat";
        renderBoatForm(null);
      } else if (action === "edit" && id) {
        pageTitle.textContent = "Edit Electric Boat";
        renderBoatForm(id);
      } else {
        pageTitle.textContent = "Electric & Solar Boats";
        renderBoatsList();
      }
    } else if (root === "case-studies") {
      if (action === "new") {
        pageTitle.textContent = "New Field Deployment";
        renderCaseStudyForm(null);
      } else if (action === "edit" && id) {
        pageTitle.textContent = "Edit Case Study";
        renderCaseStudyForm(id);
      } else {
        pageTitle.textContent = "Field Deployments & Research";
        renderCaseStudiesList();
      }
    } else if (root === "gallery") {
      if (action === "new") {
        pageTitle.textContent = "New Gallery Media";
        renderGalleryForm(null);
      } else if (action === "edit" && id) {
        pageTitle.textContent = "Edit Media Item";
        renderGalleryForm(id);
      } else {
        pageTitle.textContent = "Photo & Video Gallery";
        renderGalleryGrid();
      }
    } else if (root === "site-settings") {
      pageTitle.textContent = "Site Settings";
      renderSiteSettings();
    } else if (root === "data") {
      pageTitle.textContent = "Data & Backup";
      renderDataScreen();
    } else {
      window.location.hash = "#/dashboard";
    }
  }

  window.addEventListener("hashchange", handleRouting);

  // ================= 6. SCREEN: EXECUTIVE DASHBOARD =================
  function renderDashboard() {
    pageRoot.innerHTML = "";
    var wrap = createEl("div");

    var grid = createEl("div", { className: "dash-grid" });

    var statItems = [
      { key: "motors", name: "Outboard Motors", route: "#/motors", icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", subText: "3 to 50 HP Lineup" },
      { key: "battery_packs", name: "Battery Packs", route: "#/battery-packs", icon: "M2 7h20v14H2z", subText: "51.2V to 144V Systems" },
      { key: "boats", name: "Custom Vessels", route: "#/boats", icon: "M2 20h20M5 20V8l7-5 7 5v12", subText: "Electric & Solar Hybrid" },
      { key: "case_studies", name: "Field Deployments", route: "#/case-studies", icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z", subText: "Commercial & Govt fleets" }
    ];

    statItems.forEach(function(col){
      var card = createEl("a", { className: "dash-card", href: col.route });
      var info = createEl("div", { className: "dash-card-info" });
      var countH3 = createEl("h3", null, "…");
      var labelP = createEl("p", null, col.name);
      var subP = createEl("div", { className: "dash-card-sub" }, col.subText);
      info.appendChild(countH3);
      info.appendChild(labelP);
      info.appendChild(subP);

      var iconWrap = createEl("div", { className: "dash-card-icon" });
      iconWrap.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="' + col.icon + '"/></svg>';

      card.appendChild(info);
      card.appendChild(iconWrap);
      grid.appendChild(card);

      window.SeagoStore.list(col.key, function(err, items){
        if (!err && items) {
          countH3.textContent = String(items.length);
        } else {
          countH3.textContent = "0";
        }
      });
    });

    wrap.appendChild(grid);

    // Two-column layout: Recent Activity + Quick Actions
    var cols = createEl("div", { className: "dash-columns" });

    // Recent items card
    var recentCard = createEl("div", { className: "form-card" });
    recentCard.appendChild(createEl("h3", { className: "form-section__title" }, "Latest Catalog Updates"));
    var recentList = createEl("ul", { className: "recent-list", style: { marginTop: "16px" } });
    recentCard.appendChild(recentList);

    window.SeagoStore.list("motors", function(err, motors){
      window.SeagoStore.list("case_studies", function(err2, cases){
        var combined = [];
        if (motors) {
          motors.forEach(function(m){
            combined.push({
              title: m.title || ("Seagö " + m.hp + " HP"),
              type: "Motor",
              route: "#/motors/edit/" + m.id,
              date: m.updated_at || ""
            });
          });
        }
        if (cases) {
          cases.forEach(function(c){
            combined.push({
              title: c.title,
              type: "Case Study",
              route: "#/case-studies/edit/" + c.id,
              date: c.updated_at || ""
            });
          });
        }
        combined.sort(function(a, b){
          return (b.date || "").localeCompare(a.date || "");
        });

        var top6 = combined.slice(0, 6);
        if (top6.length === 0) {
          var liEmpty = createEl("li", { className: "recent-item" }, "No recent activity.");
          recentList.appendChild(liEmpty);
        } else {
          top6.forEach(function(item){
            var li = createEl("li", { className: "recent-item" });
            var a = createEl("a", { className: "recent-item-title", href: item.route }, item.title);
            var meta = createEl("span", { className: "recent-item-meta" }, item.type);
            li.appendChild(a);
            li.appendChild(meta);
            recentList.appendChild(li);
          });
        }
      });
    });

    // Quick Add Actions Card
    var actionsCard = createEl("div", { className: "form-card" });
    actionsCard.appendChild(createEl("h3", { className: "form-section__title" }, "Quick Add Shortcuts"));
    var btnList = createEl("div", { style: { display: "flex", flexDirection: "column", gap: "10px", marginTop: "18px" } });

    var quickLinks = [
      { label: "+ New Outboard Motor", href: "#/motors/new" },
      { label: "+ New Battery Pack", href: "#/battery-packs/new" },
      { label: "+ New Custom Boat", href: "#/boats/new" },
      { label: "+ New Field Case Study", href: "#/case-studies/new" },
      { label: "+ Upload Media Item", href: "#/gallery/new" }
    ];

    quickLinks.forEach(function(ql){
      var btn = createEl("a", { className: "btn btn-secondary btn-full", href: ql.href }, ql.label);
      btnList.appendChild(btn);
    });

    actionsCard.appendChild(btnList);
    cols.appendChild(recentCard);
    cols.appendChild(actionsCard);
    wrap.appendChild(cols);

    pageRoot.appendChild(wrap);
  }

  // ================= 7. SCREEN: MOTORS (FEATURES & ACTIONS) =================
  function renderMotorsList() {
    pageRoot.innerHTML = "";
    var header = createEl("div", { className: "page-header" });
    var info = createEl("div", { className: "page-header-info" });
    info.appendChild(createEl("h1", { className: "page-header-title" }, "Electric Outboard Motors"));
    info.appendChild(createEl("p", { className: "page-header-sub" }, "Commercial and recreational PMSM outboards from 3 HP to 50 HP."));
    header.appendChild(info);

    var act = createEl("div", { className: "page-header-actions" });
    var searchWrap = createEl("div", { className: "search-box" });
    searchWrap.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
    var searchInput = createEl("input", { type: "text", placeholder: "Search HP, model, slug… (press /)" });
    searchWrap.appendChild(searchInput);
    var addBtn = createEl("a", { className: "btn btn-primary", href: "#/motors/new" }, "+ Add Motor Model");
    act.appendChild(searchWrap);
    act.appendChild(addBtn);
    header.appendChild(act);
    pageRoot.appendChild(header);

    // Filter Tabs (All / Published / Draft)
    var filterWrap = createEl("div", { className: "filter-tabs" });
    var tabAll = createEl("button", { type: "button", className: "filter-tab active" }, "All (8)");
    var tabPub = createEl("button", { type: "button", className: "filter-tab" }, "Published");
    var tabDraft = createEl("button", { type: "button", className: "filter-tab" }, "Drafts");
    filterWrap.appendChild(tabAll);
    filterWrap.appendChild(tabPub);
    filterWrap.appendChild(tabDraft);
    pageRoot.appendChild(filterWrap);

    var currentFilter = "all";

    var tableCard = createEl("div", { className: "card-table" });
    var tableWrap = createEl("div", { className: "table-wrap" });
    var table = createEl("table", { className: "data-table" });

    table.innerHTML = "<thead><tr>" +
      "<th>Order</th>" +
      "<th>Thumbnail</th>" +
      "<th>Model &amp; HP</th>" +
      "<th>Rated Power</th>" +
      "<th>Voltage</th>" +
      "<th>Status (Toggle)</th>" +
      "<th style='text-align:right;'>Actions</th>" +
      "</tr></thead>";

    var tbody = createEl("tbody");
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    tableCard.appendChild(tableWrap);
    pageRoot.appendChild(tableCard);

    var allMotors = [];

    function renderRows(items) {
      tbody.innerHTML = "";
      if (!items || items.length === 0) {
        var trEmpty = createEl("tr");
        var tdEmpty = createEl("td", { colspan: "7" });
        tdEmpty.innerHTML = '<div class="empty-state"><h3>No matching motors</h3><p>Adjust your search query or filter criteria.</p></div>';
        trEmpty.appendChild(tdEmpty);
        tbody.appendChild(trEmpty);
        return;
      }

      items.forEach(function(item, idx){
        var tr = createEl("tr");

        // Reorder arrows
        var tdOrder = createEl("td");
        var upBtn = createEl("button", { type: "button", className: "btn-icon", "aria-label": "Move Up" }, "↑");
        var dnBtn = createEl("button", { type: "button", className: "btn-icon", "aria-label": "Move Down", style: { marginLeft: "4px" } }, "↓");

        if (idx === 0) upBtn.disabled = true;
        if (idx === items.length - 1) dnBtn.disabled = true;

        upBtn.addEventListener("click", function(){ swapOrder(items, idx, idx - 1); });
        dnBtn.addEventListener("click", function(){ swapOrder(items, idx, idx + 1); });

        tdOrder.appendChild(upBtn);
        tdOrder.appendChild(dnBtn);
        tr.appendChild(tdOrder);

        // Thumbnail with Lightbox zoom
        var tdThumb = createEl("td");
        var thumbUrl = item.image_url || "assets/photos/Outboard Motors.webp";
        var imgThumb = createEl("img", {
          className: "table-thumb",
          src: thumbUrl,
          alt: item.title || "Motor"
        });
        imgThumb.title = "Click to zoom image";
        imgThumb.addEventListener("click", function(){
          openLightbox(thumbUrl, item.title || ("Seagö " + item.hp + " HP"));
        });
        tdThumb.appendChild(imgThumb);
        tr.appendChild(tdThumb);

        // Model & Slug
        var tdModel = createEl("td");
        var titleA = createEl("a", { href: "#/motors/edit/" + item.id, style: { fontWeight: "600", color: "var(--navy)" } }, item.title || ("Seagö " + item.hp + " HP"));
        var slugSpan = createEl("div", { style: { fontSize: "11.5px", color: "var(--slate)" } }, item.slug || "");
        tdModel.appendChild(titleA);
        tdModel.appendChild(slugSpan);
        tr.appendChild(tdModel);

        // Power
        tr.appendChild(createEl("td", null, item.kw || (item.hp + " HP")));

        // Voltage
        tr.appendChild(createEl("td", null, item.voltage || "—"));

        // Status (Interactive Clickable Toggle)
        var tdStatus = createEl("td");
        var pill = createEl("button", {
          type: "button",
          className: "pill " + (item.published ? "pill-published" : "pill-draft"),
          title: "Click to toggle between Published & Draft"
        }, item.published ? "Published" : "Draft");

        pill.addEventListener("click", function(){
          item.published = !item.published;
          window.SeagoStore.save("motors", item, function(err){
            if (!err) {
              showToast((item.title || (item.hp + " HP")) + " is now " + (item.published ? "Published" : "Draft"), "info");
              applyFilters();
              updateSidebarBadges();
            }
          });
        });
        tdStatus.appendChild(pill);
        tr.appendChild(tdStatus);

        // Actions: Preview, Edit, Clone, Delete
        var tdActions = createEl("td", { style: { textAlign: "right" } });
        var actWrap = createEl("div", { className: "table-actions", style: { justifyContent: "flex-end" } });

        // Live Preview Modal button
        var prevBtn = createEl("button", { type: "button", className: "btn btn-sm btn-secondary", title: "Live Card Preview" }, "Preview");
        prevBtn.addEventListener("click", function(){
          previewMotorCard(item);
        });

        // Edit button
        var editBtn = createEl("a", { className: "btn btn-sm btn-secondary", href: "#/motors/edit/" + item.id }, "Edit");

        // Clone button
        var cloneBtn = createEl("button", { type: "button", className: "btn btn-sm btn-secondary", title: "Duplicate as Draft" }, "Clone");
        cloneBtn.addEventListener("click", function(){
          cloneMotor(item);
        });

        // Delete button
        var delBtn = createEl("button", { type: "button", className: "btn btn-sm btn-secondary", style: { color: "var(--danger)" } }, "Delete");
        delBtn.addEventListener("click", function(){
          openModal({
            title: "Delete Motor",
            bodyText: "Are you sure you want to delete '" + (item.title || (item.hp + " HP")) + "'? This action cannot be undone.",
            danger: true,
            confirmLabel: "Delete",
            onConfirm: function(){
              window.SeagoStore.remove("motors", item.id, function(err){
                if (!err) {
                  showToast("Motor model deleted", "success");
                  loadMotors();
                  updateSidebarBadges();
                }
              });
            }
          });
        });

        actWrap.appendChild(prevBtn);
        actWrap.appendChild(editBtn);
        actWrap.appendChild(cloneBtn);
        actWrap.appendChild(delBtn);
        tdActions.appendChild(actWrap);
        tr.appendChild(tdActions);

        tbody.appendChild(tr);
      });
    }

    function cloneMotor(item) {
      var cloned = {};
      for (var k in item) {
        if (Object.prototype.hasOwnProperty.call(item, k) && k !== "id") {
          cloned[k] = item[k];
        }
      }
      cloned.title = (item.title || ("Seagö " + item.hp + " HP")) + " (Copy)";
      cloned.slug = (item.slug || "motor") + "-copy";
      cloned.published = false;

      // Assign a temporary non-conflicting hp
      var maxHp = 0;
      allMotors.forEach(function(m){ if (m.hp > maxHp) maxHp = m.hp; });
      cloned.hp = maxHp + 1;

      window.SeagoStore.save("motors", cloned, function(err, saved){
        if (!err && saved) {
          showToast("Duplicated as draft (Seagö " + saved.hp + " HP)", "success");
          loadMotors();
          updateSidebarBadges();
        }
      });
    }

    function previewMotorCard(motor) {
      var pwrap = createEl("div", { style: { padding: "10px 0" } });
      var card = createEl("div", {
        style: {
          background: "#0B1D3D",
          borderRadius: "14px",
          overflow: "hidden",
          color: "#FFFFFF",
          border: "1px solid rgba(255,255,255,0.12)",
          padding: "24px"
        }
      });

      var mImg = createEl("img", {
        src: motor.image_url || "assets/photos/Outboard Motors.webp",
        style: {
          width: "100%",
          maxHeight: "220px",
          objectFit: "contain",
          background: "#FFFFFF",
          borderRadius: "10px",
          padding: "16px",
          marginBottom: "16px"
        }
      });
      card.appendChild(mImg);

      var title = createEl("h3", { style: { color: "#FFFFFF", fontSize: "20px", marginBottom: "4px" } }, motor.title || ("Seagö " + motor.hp + " HP"));
      card.appendChild(title);

      var meta = createEl("div", { style: { color: "var(--cyan)", fontWeight: "600", fontSize: "14px", marginBottom: "16px" } },
        (motor.hp + " HP") + " · " + (motor.kw || "") + " · " + (motor.voltage || ""));
      card.appendChild(meta);

      var specGrid = createEl("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "12.5px", color: "#CBD5E1" } });
      specGrid.innerHTML = "<div><strong>Control:</strong> " + escapeHtml(motor.control || "—") + "</div>" +
        "<div><strong>Cooling:</strong> " + escapeHtml(motor.cooling || "—") + "</div>" +
        "<div><strong>RPM:</strong> " + escapeHtml(motor.rpm || "—") + "</div>" +
        "<div><strong>Weight:</strong> " + escapeHtml(motor.weight || "—") + "</div>";
      card.appendChild(specGrid);

      pwrap.appendChild(card);

      openModal({
        title: "Live Product Card Preview",
        bodyEl: pwrap,
        hideConfirm: true,
        cancelLabel: "Done",
        maxWidth: "520px"
      });
    }

    function swapOrder(items, i1, i2) {
      var tmp = items[i1];
      items[i1] = items[i2];
      items[i2] = tmp;
      var ids = items.map(function(it){ return it.id; });
      window.SeagoStore.reorder("motors", ids, function(err){
        if (!err) loadMotors();
      });
    }

    function applyFilters() {
      var q = searchInput.value.toLowerCase().trim();
      var filtered = allMotors.filter(function(m){
        var matchSearch = (m.title && m.title.toLowerCase().indexOf(q) >= 0) ||
                          (String(m.hp).indexOf(q) >= 0) ||
                          (m.slug && m.slug.toLowerCase().indexOf(q) >= 0);
        if (!matchSearch) return false;
        if (currentFilter === "published") return !!m.published;
        if (currentFilter === "draft") return !m.published;
        return true;
      });
      renderRows(filtered);
    }

    function loadMotors() {
      window.SeagoStore.list("motors", function(err, items){
        allMotors = items || [];
        var pubCount = 0;
        allMotors.forEach(function(m){ if (m.published) pubCount++; });
        tabAll.textContent = "All (" + allMotors.length + ")";
        tabPub.textContent = "Published (" + pubCount + ")";
        tabDraft.textContent = "Drafts (" + (allMotors.length - pubCount) + ")";
        applyFilters();
      });
    }

    tabAll.addEventListener("click", function(){
      currentFilter = "all";
      tabAll.classList.add("active");
      tabPub.classList.remove("active");
      tabDraft.classList.remove("active");
      applyFilters();
    });

    tabPub.addEventListener("click", function(){
      currentFilter = "published";
      tabPub.classList.add("active");
      tabAll.classList.remove("active");
      tabDraft.classList.remove("active");
      applyFilters();
    });

    tabDraft.addEventListener("click", function(){
      currentFilter = "draft";
      tabDraft.classList.add("active");
      tabAll.classList.remove("active");
      tabPub.classList.remove("active");
      applyFilters();
    });

    searchInput.addEventListener("input", applyFilters);
    loadMotors();
  }

  function renderMotorForm(motorId) {
    pageRoot.innerHTML = "";
    var isNew = !motorId;

    var header = createEl("div", { className: "page-header" });
    var info = createEl("div", { className: "page-header-info" });
    info.appendChild(createEl("h1", { className: "page-header-title" }, isNew ? "Add Outboard Motor" : "Edit Outboard Motor"));
    info.appendChild(createEl("p", { className: "page-header-sub" }, "Configure engineering parameters, cooling system, and documentation."));
    header.appendChild(info);

    var backBtn = createEl("a", { className: "btn btn-secondary", href: "#/motors" }, "← Back to Motors");
    header.appendChild(backBtn);
    pageRoot.appendChild(header);

    var formCard = createEl("div", { className: "form-card" });
    var form = createEl("form", { id: "motorEditForm", novalidate: "novalidate" });

    // Section 1: Basics
    var s1 = createEl("div", { className: "form-section" });
    var h1Wrap = createEl("div", { className: "form-section__header" });
    h1Wrap.appendChild(createEl("span", { className: "form-section__badge" }, "1"));
    h1Wrap.appendChild(createEl("h3", { className: "form-section__title" }, "Model & Ratings"));
    s1.appendChild(h1Wrap);
    s1.appendChild(createEl("p", { className: "form-section__desc" }, "Horsepower rating, public title, and catalog slug."));

    var r1 = createEl("div", { className: "form-row" });
    var gHp = createEl("div", { className: "form-group" });
    gHp.appendChild(createEl("label", { for: "f_hp" }, "Horsepower (HP) *"));
    var inpHp = createEl("input", { type: "number", id: "f_hp", min: "1", max: "200", required: "required" });
    var errHp = createEl("div", { className: "field-error", id: "err_hp" }, "Valid unique horsepower is required.");
    gHp.appendChild(inpHp);
    gHp.appendChild(errHp);

    var gTitle = createEl("div", { className: "form-group" });
    gTitle.appendChild(createEl("label", { for: "f_title" }, "Model Title *"));
    var inpTitle = createEl("input", { type: "text", id: "f_title", required: "required" });
    var errTitle = createEl("div", { className: "field-error", id: "err_title" }, "Model title is required.");
    gTitle.appendChild(inpTitle);
    gTitle.appendChild(errTitle);

    var gSlug = createEl("div", { className: "form-group" });
    gSlug.appendChild(createEl("label", { for: "f_slug" }, "URL Slug"));
    var inpSlug = createEl("input", { type: "text", id: "f_slug" });
    gSlug.appendChild(inpSlug);

    r1.appendChild(gHp);
    r1.appendChild(gTitle);
    r1.appendChild(gSlug);
    s1.appendChild(r1);

    // Section 2: Electrical
    var s2 = createEl("div", { className: "form-section" });
    var h2Wrap = createEl("div", { className: "form-section__header" });
    h2Wrap.appendChild(createEl("span", { className: "form-section__badge" }, "2"));
    h2Wrap.appendChild(createEl("h3", { className: "form-section__title" }, "Electrical Architecture"));
    s2.appendChild(h2Wrap);
    s2.appendChild(createEl("p", { className: "form-section__desc" }, "Power output, voltage, motor chemistry, and recommended battery."));

    var r2 = createEl("div", { className: "form-row" });
    var gKw = createEl("div", { className: "form-group" });
    gKw.appendChild(createEl("label", { for: "f_kw" }, "Rated Power (kW)"));
    var inpKw = createEl("input", { type: "text", id: "f_kw", placeholder: "e.g. 11 kW" });
    gKw.appendChild(inpKw);

    var gVolt = createEl("div", { className: "form-group" });
    gVolt.appendChild(createEl("label", { for: "f_voltage" }, "Operating Voltage (V)"));
    var inpVolt = createEl("input", { type: "text", id: "f_voltage", placeholder: "e.g. 73.6 V" });
    gVolt.appendChild(inpVolt);

    var gMotor = createEl("div", { className: "form-group" });
    gMotor.appendChild(createEl("label", { for: "f_motor" }, "Motor Type"));
    var inpMotor = createEl("input", { type: "text", id: "f_motor", placeholder: "Permanent Magnet Synchronous Motor (PMSM)" });
    gMotor.appendChild(inpMotor);

    r2.appendChild(gKw);
    r2.appendChild(gVolt);
    r2.appendChild(gMotor);
    s2.appendChild(r2);

    var gBat = createEl("div", { className: "form-group" });
    gBat.appendChild(createEl("label", { for: "f_battery" }, "Recommended Marine Battery Pack"));
    var inpBat = createEl("input", { type: "text", id: "f_battery", placeholder: "e.g. 73.6V - 210 AH LiFePO4" });
    gBat.appendChild(inpBat);
    s2.appendChild(gBat);

    // Section 3: Mechanical
    var s3 = createEl("div", { className: "form-section" });
    var h3Wrap = createEl("div", { className: "form-section__header" });
    h3Wrap.appendChild(createEl("span", { className: "form-section__badge" }, "3"));
    h3Wrap.appendChild(createEl("h3", { className: "form-section__title" }, "Mechanical & Propulsion"));
    s3.appendChild(h3Wrap);
    s3.appendChild(createEl("p", { className: "form-section__desc" }, "Cooling, control method, transom length, and propeller."));

    var r3a = createEl("div", { className: "form-row" });
    var gControl = createEl("div", { className: "form-group" });
    gControl.appendChild(createEl("label", { for: "f_control" }, "Control Method"));
    var inpControl = createEl("input", { type: "text", id: "f_control", placeholder: "Tiller / Remote Control" });
    gControl.appendChild(inpControl);

    var gCooling = createEl("div", { className: "form-group" });
    gCooling.appendChild(createEl("label", { for: "f_cooling" }, "Cooling Method"));
    var inpCooling = createEl("input", { type: "text", id: "f_cooling", placeholder: "Water Cooled" });
    gCooling.appendChild(inpCooling);

    var gRpm = createEl("div", { className: "form-group" });
    gRpm.appendChild(createEl("label", { for: "f_rpm" }, "Rated RPM"));
    var inpRpm = createEl("input", { type: "text", id: "f_rpm", placeholder: "4650 RPM" });
    gRpm.appendChild(inpRpm);

    r3a.appendChild(gControl);
    r3a.appendChild(gCooling);
    r3a.appendChild(gRpm);
    s3.appendChild(r3a);

    var r3b = createEl("div", { className: "form-row" });
    var gGear = createEl("div", { className: "form-group" });
    gGear.appendChild(createEl("label", { for: "f_gear" }, "Gear Ratio"));
    var inpGear = createEl("input", { type: "text", id: "f_gear", placeholder: "2.08 (27/13)" });
    gGear.appendChild(inpGear);

    var gTransom = createEl("div", { className: "form-group" });
    gTransom.appendChild(createEl("label", { for: "f_transom" }, "Transom Height"));
    var inpTransom = createEl("input", { type: "text", id: "f_transom", placeholder: "S:440mm / L:567mm" });
    gTransom.appendChild(inpTransom);

    var gWeight = createEl("div", { className: "form-group" });
    gWeight.appendChild(createEl("label", { for: "f_weight" }, "Weight"));
    var inpWeight = createEl("input", { type: "text", id: "f_weight", placeholder: "S:38 Kg / L:39.5 Kg" });
    gWeight.appendChild(inpWeight);

    r3b.appendChild(gGear);
    r3b.appendChild(gTransom);
    r3b.appendChild(gWeight);
    s3.appendChild(r3b);

    var r3c = createEl("div", { className: "form-row" });
    var gBoatLen = createEl("div", { className: "form-group" });
    gBoatLen.appendChild(createEl("label", { for: "f_boatlen" }, "Recommended Vessel Length"));
    var inpBoatLen = createEl("input", { type: "text", id: "f_boatlen", placeholder: "3.6-7.0 metres" });
    gBoatLen.appendChild(inpBoatLen);

    var gPropeller = createEl("div", { className: "form-group" });
    gPropeller.appendChild(createEl("label", { for: "f_propeller" }, "Propeller Dimensions"));
    var inpPropeller = createEl("input", { type: "text", id: "f_propeller", placeholder: "9 7/8 × 12" });
    gPropeller.appendChild(inpPropeller);

    r3c.appendChild(gBoatLen);
    r3c.appendChild(gPropeller);
    s3.appendChild(r3c);

    // Section 4: Media & Uploads
    var s4 = createEl("div", { className: "form-section" });
    var h4Wrap = createEl("div", { className: "form-section__header" });
    h4Wrap.appendChild(createEl("span", { className: "form-section__badge" }, "4"));
    h4Wrap.appendChild(createEl("h3", { className: "form-section__title" }, "Photos & PDF Catalog"));
    s4.appendChild(h4Wrap);
    s4.appendChild(createEl("p", { className: "form-section__desc" }, "Product imagery and technical specification datasheet."));

    // Motor Image Upload
    var gImg = createEl("div", { className: "form-group" });
    gImg.appendChild(createEl("label", null, "Motor Product Photo"));
    var dropImg = createEl("div", { className: "upload-zone", id: "dropImg" });
    dropImg.innerHTML = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>' +
      '<div class="upload-zone-text">Click or drag image file here</div>' +
      '<div class="upload-zone-hint">PNG, WebP or JPEG (Auto-resized up to 1600px WebP)</div>';
    var fileImgInput = createEl("input", { type: "file", accept: "image/*", style: { display: "none" } });
    var imgPreview = createEl("div", { className: "upload-preview", style: { display: "none" } });
    var imgThumbEl = createEl("img", { src: "", alt: "Preview" });
    var imgMetaEl = createEl("div", { className: "upload-meta" });
    var imgNameEl = createEl("div", { className: "upload-name" });
    var imgSizeEl = createEl("div", { className: "upload-size" });
    var removeImgBtn = createEl("button", { type: "button", className: "btn btn-sm btn-secondary", style: { color: "var(--danger)" } }, "Remove");
    imgMetaEl.appendChild(imgNameEl);
    imgMetaEl.appendChild(imgSizeEl);
    imgPreview.appendChild(imgThumbEl);
    imgPreview.appendChild(imgMetaEl);
    imgPreview.appendChild(removeImgBtn);

    dropImg.appendChild(fileImgInput);
    gImg.appendChild(dropImg);
    gImg.appendChild(imgPreview);
    s4.appendChild(gImg);

    var currentImageUrl = "";
    var currentImageId = null;

    dropImg.addEventListener("click", function(){ fileImgInput.click(); });
    fileImgInput.addEventListener("change", function(){
      if (fileImgInput.files && fileImgInput.files[0]) {
        var f = fileImgInput.files[0];
        showToast("Compressing & optimizing image…", "info");
        processImageFile(f, function(err, res){
          if (!err && res) {
            currentImageUrl = res.url;
            currentImageId = res.id;
            imgThumbEl.src = res.url;
            imgNameEl.textContent = res.name;
            imgSizeEl.textContent = Math.round(res.size / 1024) + " KB (WebP)";
            imgPreview.style.display = "flex";
            isDirty = true;
            showToast("Photo ready", "success");
          } else {
            showToast(err ? err.message : "Image processing failed", "error");
          }
        });
      }
    });

    removeImgBtn.addEventListener("click", function(){
      currentImageUrl = "";
      currentImageId = null;
      imgThumbEl.src = "";
      imgPreview.style.display = "none";
      isDirty = true;
    });

    // Catalog PDF
    var gPdf = createEl("div", { className: "form-group" });
    gPdf.appendChild(createEl("label", { for: "f_catalog" }, "Technical Specification Catalog (PDF)"));
    var inpCatalog = createEl("input", { type: "text", id: "f_catalog", placeholder: "e.g. catalog/SEAGO 15 HP Technical Specifications.pdf" });
    var filePdfInput = createEl("input", { type: "file", accept: "application/pdf", style: { display: "none" } });
    var uploadPdfBtn = createEl("button", { type: "button", className: "btn btn-sm btn-secondary", style: { marginTop: "6px" } }, "Upload PDF Datasheet");

    uploadPdfBtn.addEventListener("click", function(){ filePdfInput.click(); });
    filePdfInput.addEventListener("change", function(){
      if (filePdfInput.files && filePdfInput.files[0]) {
        var pf = filePdfInput.files[0];
        showToast("Uploading PDF document…", "info");
        processPdfFile(pf, function(err, pres){
          if (!err && pres) {
            inpCatalog.value = pres.url;
            isDirty = true;
            showToast("PDF uploaded", "success");
          } else {
            showToast(err ? err.message : "PDF upload failed", "error");
          }
        });
      }
    });

    gPdf.appendChild(inpCatalog);
    gPdf.appendChild(filePdfInput);
    gPdf.appendChild(uploadPdfBtn);
    s4.appendChild(gPdf);

    // Section 5: Publication Status
    var s5 = createEl("div", { className: "form-section" });
    var chkPub = createEl("div", { className: "form-check" });
    var inpPub = createEl("input", { type: "checkbox", id: "f_pub", checked: true });
    var lblPub = createEl("label", { for: "f_pub" }, "Publish this model on public website catalog");
    chkPub.appendChild(inpPub);
    chkPub.appendChild(lblPub);
    s5.appendChild(chkPub);

    // Form Actions
    var formActions = createEl("div", { className: "form-actions" });
    var cancelAction = createEl("a", { className: "btn btn-secondary", href: "#/motors" }, "Cancel");
    var saveBtn = createEl("button", { type: "submit", className: "btn btn-primary", id: "btnSaveMotor" }, "Save Changes (Ctrl+S)");
    formActions.appendChild(cancelAction);
    formActions.appendChild(saveBtn);

    form.appendChild(s1);
    form.appendChild(s2);
    form.appendChild(s3);
    form.appendChild(s4);
    form.appendChild(s5);
    form.appendChild(formActions);
    formCard.appendChild(form);
    pageRoot.appendChild(formCard);

    // Auto title/slug suggestion
    inpHp.addEventListener("input", function(){
      isDirty = true;
      if (!inpTitle.value || inpTitle.value.indexOf("Seagö ") === 0) {
        inpTitle.value = "Seagö " + inpHp.value + " HP";
      }
      if (!inpSlug.value || inpSlug.value.indexOf("seago-") === 0) {
        inpSlug.value = "seago-" + inpHp.value + "hp";
      }
    });

    form.addEventListener("input", function(){
      isDirty = true;
    });

    var existingMotor = null;
    if (!isNew) {
      window.SeagoStore.get("motors", motorId, function(err, motor){
        if (!motor) {
          showToast("Motor model not found", "error");
          window.location.hash = "#/motors";
          return;
        }
        existingMotor = motor;
        inpHp.value = motor.hp || "";
        inpTitle.value = motor.title || "";
        inpSlug.value = motor.slug || "";
        inpKw.value = motor.kw || "";
        inpVolt.value = motor.voltage || "";
        inpBat.value = motor.battery || "";
        inpMotor.value = motor.motor || "";
        inpControl.value = motor.control || "";
        inpCooling.value = motor.cooling || "";
        inpRpm.value = motor.rpm || "";
        inpGear.value = motor.gear_ratio || "";
        inpTransom.value = motor.transom || "";
        inpWeight.value = motor.weight || "";
        inpBoatLen.value = motor.boat_length || "";
        inpPropeller.value = motor.propeller || "";
        inpCatalog.value = motor.catalog_path || "";
        inpPub.checked = !!motor.published;

        if (motor.image_url) {
          currentImageUrl = motor.image_url;
          currentImageId = motor.image_id;
          imgThumbEl.src = motor.image_url;
          imgNameEl.textContent = motor.title || "Stored image";
          imgSizeEl.textContent = "WebP / Stored";
          imgPreview.style.display = "flex";
        }
      });
    }

    form.addEventListener("submit", function(e){
      e.preventDefault();
      var hpVal = parseInt(inpHp.value, 10);
      var titleVal = inpTitle.value.trim();

      var valid = true;
      if (isNaN(hpVal) || hpVal <= 0) {
        errHp.classList.add("show");
        valid = false;
      } else {
        errHp.classList.remove("show");
      }

      if (!titleVal) {
        errTitle.classList.add("show");
        valid = false;
      } else {
        errTitle.classList.remove("show");
      }

      if (!valid) return;

      saveBtn.disabled = true;
      saveBtn.textContent = "Saving…";

      window.SeagoStore.list("motors", function(err, allList){
        var isDuplicate = false;
        if (allList) {
          for (var i = 0; i < allList.length; i++) {
            if (allList[i].hp === hpVal && (!existingMotor || allList[i].id !== existingMotor.id)) {
              isDuplicate = true;
              break;
            }
          }
        }

        if (isDuplicate) {
          errHp.textContent = "A model with " + hpVal + " HP already exists. Please choose a unique HP.";
          errHp.classList.add("show");
          saveBtn.disabled = false;
          saveBtn.textContent = "Save Changes";
          return;
        }

        var record = existingMotor || {};
        record.hp = hpVal;
        record.title = titleVal;
        record.slug = inpSlug.value.trim() || ("seago-" + hpVal + "hp");
        record.kw = inpKw.value.trim();
        record.voltage = inpVolt.value.trim();
        record.battery = inpBat.value.trim();
        record.motor = inpMotor.value.trim();
        record.control = inpControl.value.trim();
        record.cooling = inpCooling.value.trim();
        record.rpm = inpRpm.value.trim();
        record.gear_ratio = inpGear.value.trim();
        record.transom = inpTransom.value.trim();
        record.weight = inpWeight.value.trim();
        record.boat_length = inpBoatLen.value.trim();
        record.propeller = inpPropeller.value.trim();
        record.catalog_path = inpCatalog.value.trim();
        record.image_url = currentImageUrl;
        record.image_id = currentImageId;
        record.published = inpPub.checked;

        window.SeagoStore.save("motors", record, function(saveErr){
          saveBtn.disabled = false;
          saveBtn.textContent = "Save Changes";
          if (!saveErr) {
            isDirty = false;
            showToast("Motor model saved", "success");
            updateSidebarBadges();
            window.location.hash = "#/motors";
          } else {
            showToast("Save error: " + (saveErr.message || "Quota exceeded"), "error");
          }
        });
      });
    });
  }

  // ================= 8. SCREEN: BATTERY PACKS =================
  function renderBatteryList() {
    pageRoot.innerHTML = "";
    var header = createEl("div", { className: "page-header" });
    var info = createEl("div", { className: "page-header-info" });
    info.appendChild(createEl("h1", { className: "page-header-title" }, "Marine LiFePO4 Battery Packs"));
    info.appendChild(createEl("p", { className: "page-header-sub" }, "IP67 marine modular packs with smart dual CAN-bus BMS."));
    header.appendChild(info);

    var act = createEl("div", { className: "page-header-actions" });
    var addBtn = createEl("a", { className: "btn btn-primary", href: "#/battery-packs/new" }, "+ Add Battery Pack");
    act.appendChild(addBtn);
    header.appendChild(act);
    pageRoot.appendChild(header);

    var tableCard = createEl("div", { className: "card-table" });
    var tableWrap = createEl("div", { className: "table-wrap" });
    var table = createEl("table", { className: "data-table" });

    table.innerHTML = "<thead><tr>" +
      "<th>Order</th>" +
      "<th>Voltage</th>" +
      "<th>Capacity Range</th>" +
      "<th>Chemistry</th>" +
      "<th>BMS</th>" +
      "<th>Status (Toggle)</th>" +
      "<th style='text-align:right;'>Actions</th>" +
      "</tr></thead>";

    var tbody = createEl("tbody");
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    tableCard.appendChild(tableWrap);
    pageRoot.appendChild(tableCard);

    window.SeagoStore.list("battery_packs", function(err, items){
      tbody.innerHTML = "";
      if (!items || items.length === 0) {
        var trEmpty = createEl("tr");
        var tdEmpty = createEl("td", { colspan: "7" });
        tdEmpty.innerHTML = '<div class="empty-state"><h3>No battery packs</h3></div>';
        trEmpty.appendChild(tdEmpty);
        tbody.appendChild(trEmpty);
        return;
      }

      items.forEach(function(item, idx){
        var tr = createEl("tr");

        var tdOrder = createEl("td");
        var upBtn = createEl("button", { type: "button", className: "btn-icon" }, "↑");
        var dnBtn = createEl("button", { type: "button", className: "btn-icon", style: { marginLeft: "4px" } }, "↓");
        if (idx === 0) upBtn.disabled = true;
        if (idx === items.length - 1) dnBtn.disabled = true;
        upBtn.addEventListener("click", function(){ swapOrder(items, idx, idx - 1); });
        dnBtn.addEventListener("click", function(){ swapOrder(items, idx, idx + 1); });
        tdOrder.appendChild(upBtn);
        tdOrder.appendChild(dnBtn);
        tr.appendChild(tdOrder);

        tr.appendChild(createEl("td", { style: { fontWeight: "600", color: "var(--navy)" } }, item.voltage));
        tr.appendChild(createEl("td", null, item.capacity_range));
        tr.appendChild(createEl("td", null, item.chemistry || "LiFePO4"));
        tr.appendChild(createEl("td", null, item.bms || "Integrated BMS"));

        // Status Toggle
        var tdStatus = createEl("td");
        var pill = createEl("button", {
          type: "button",
          className: "pill " + (item.published ? "pill-published" : "pill-draft"),
          title: "Click to toggle status"
        }, item.published ? "Published" : "Draft");
        pill.addEventListener("click", function(){
          item.published = !item.published;
          window.SeagoStore.save("battery_packs", item, function(sErr){
            if (!sErr) {
              showToast("Battery pack is now " + (item.published ? "Published" : "Draft"), "info");
              renderBatteryList();
            }
          });
        });
        tdStatus.appendChild(pill);
        tr.appendChild(tdStatus);

        var tdActions = createEl("td", { style: { textAlign: "right" } });
        var actWrap = createEl("div", { className: "table-actions", style: { justifyContent: "flex-end" } });
        var editBtn = createEl("a", { className: "btn btn-sm btn-secondary", href: "#/battery-packs/edit/" + item.id }, "Edit");
        var delBtn = createEl("button", { type: "button", className: "btn btn-sm btn-secondary", style: { color: "var(--danger)" } }, "Delete");

        delBtn.addEventListener("click", function(){
          openModal({
            title: "Delete Battery Pack",
            bodyText: "Delete pack " + item.voltage + " (" + item.capacity_range + ")?",
            danger: true,
            confirmLabel: "Delete",
            onConfirm: function(){
              window.SeagoStore.remove("battery_packs", item.id, function(rErr){
                if (!rErr) {
                  showToast("Battery pack removed", "success");
                  renderBatteryList();
                  updateSidebarBadges();
                }
              });
            }
          });
        });

        actWrap.appendChild(editBtn);
        actWrap.appendChild(delBtn);
        tdActions.appendChild(actWrap);
        tr.appendChild(tdActions);

        tbody.appendChild(tr);
      });
    });

    function swapOrder(items, i1, i2) {
      var tmp = items[i1];
      items[i1] = items[i2];
      items[i2] = tmp;
      var ids = items.map(function(it){ return it.id; });
      window.SeagoStore.reorder("battery_packs", ids, function(){
        renderBatteryList();
      });
    }
  }

  function renderBatteryForm(batteryId) {
    pageRoot.innerHTML = "";
    var isNew = !batteryId;

    var header = createEl("div", { className: "page-header" });
    header.appendChild(createEl("h1", { className: "page-header-title" }, isNew ? "Add Battery Pack" : "Edit Battery Pack"));
    header.appendChild(createEl("a", { className: "btn btn-secondary", href: "#/battery-packs" }, "← Back to List"));
    pageRoot.appendChild(header);

    var formCard = createEl("div", { className: "form-card" });
    var form = createEl("form");

    var row1 = createEl("div", { className: "form-row" });
    var gVolt = createEl("div", { className: "form-group" });
    gVolt.appendChild(createEl("label", null, "Voltage Rating *"));
    var inpVolt = createEl("input", { type: "text", required: "required", placeholder: "e.g. 51.2 V" });
    gVolt.appendChild(inpVolt);

    var gCap = createEl("div", { className: "form-group" });
    gCap.appendChild(createEl("label", null, "Capacity Range (Ah) *"));
    var inpCap = createEl("input", { type: "text", required: "required", placeholder: "e.g. 50-105 Ah" });
    gCap.appendChild(inpCap);

    var gChem = createEl("div", { className: "form-group" });
    gChem.appendChild(createEl("label", null, "Cell Chemistry"));
    var inpChem = createEl("input", { type: "text", value: "LiFePO4" });
    gChem.appendChild(inpChem);

    row1.appendChild(gVolt);
    row1.appendChild(gCap);
    row1.appendChild(gChem);
    form.appendChild(row1);

    var row2 = createEl("div", { className: "form-row" });
    var gBms = createEl("div", { className: "form-group" });
    gBms.appendChild(createEl("label", null, "BMS Specification"));
    var inpBms = createEl("input", { type: "text", placeholder: "Integrated Smart CAN-bus BMS" });
    gBms.appendChild(inpBms);

    var gEnc = createEl("div", { className: "form-group" });
    gEnc.appendChild(createEl("label", null, "Enclosure Rating"));
    var inpEnc = createEl("input", { type: "text", placeholder: "Marine Grade IP67 Aluminum Case" });
    gEnc.appendChild(inpEnc);

    row2.appendChild(gBms);
    row2.appendChild(gEnc);
    form.appendChild(row2);

    var gNotes = createEl("div", { className: "form-group" });
    gNotes.appendChild(createEl("label", null, "Application Notes"));
    var inpNotes = createEl("textarea", { placeholder: "Recommended motor pairings and discharge limits…" });
    gNotes.appendChild(inpNotes);
    form.appendChild(gNotes);

    var chkPub = createEl("div", { className: "form-check" });
    var inpPub = createEl("input", { type: "checkbox", id: "f_bpub", checked: true });
    chkPub.appendChild(inpPub);
    chkPub.appendChild(createEl("label", { for: "f_bpub" }, "Published in public catalog"));
    form.appendChild(chkPub);

    var actions = createEl("div", { className: "form-actions" });
    actions.appendChild(createEl("a", { className: "btn btn-secondary", href: "#/battery-packs" }, "Cancel"));
    var saveBtn = createEl("button", { type: "submit", className: "btn btn-primary" }, "Save Battery Pack");
    actions.appendChild(saveBtn);
    form.appendChild(actions);

    formCard.appendChild(form);
    pageRoot.appendChild(formCard);

    var existing = null;
    if (!isNew) {
      window.SeagoStore.get("battery_packs", batteryId, function(err, b){
        if (b) {
          existing = b;
          inpVolt.value = b.voltage || "";
          inpCap.value = b.capacity_range || "";
          inpChem.value = b.chemistry || "";
          inpBms.value = b.bms || "";
          inpEnc.value = b.enclosure || "";
          inpNotes.value = b.notes || "";
          inpPub.checked = !!b.published;
        }
      });
    }

    form.addEventListener("submit", function(e){
      e.preventDefault();
      var v = inpVolt.value.trim();
      var c = inpCap.value.trim();
      if (!v || !c) {
        showToast("Voltage and Capacity are required", "error");
        return;
      }
      var record = existing || {};
      record.voltage = v;
      record.capacity_range = c;
      record.chemistry = inpChem.value.trim();
      record.bms = inpBms.value.trim();
      record.enclosure = inpEnc.value.trim();
      record.notes = inpNotes.value.trim();
      record.published = inpPub.checked;

      window.SeagoStore.save("battery_packs", record, function(err){
        if (!err) {
          isDirty = false;
          showToast("Battery pack saved", "success");
          updateSidebarBadges();
          window.location.hash = "#/battery-packs";
        }
      });
    });
  }

  // ================= 9. SCREEN: BOATS (VESSELS) =================
  function renderBoatsList() {
    pageRoot.innerHTML = "";
    var header = createEl("div", { className: "page-header" });
    var info = createEl("div", { className: "page-header-info" });
    info.appendChild(createEl("h1", { className: "page-header-title" }, "Electric & Solar Vessels"));
    info.appendChild(createEl("p", { className: "page-header-sub" }, "Custom FRP composite passenger ferries and solar cruisers."));
    header.appendChild(info);

    var addBtn = createEl("a", { className: "btn btn-primary", href: "#/boats/new" }, "+ Add Custom Boat");
    header.appendChild(addBtn);
    pageRoot.appendChild(header);

    var tableCard = createEl("div", { className: "card-table" });
    var tableWrap = createEl("div", { className: "table-wrap" });
    var table = createEl("table", { className: "data-table" });

    table.innerHTML = "<thead><tr>" +
      "<th>Order</th>" +
      "<th>Vessel Name</th>" +
      "<th>Type</th>" +
      "<th>Description</th>" +
      "<th>Status</th>" +
      "<th style='text-align:right;'>Actions</th>" +
      "</tr></thead>";

    var tbody = createEl("tbody");
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    tableCard.appendChild(tableWrap);
    pageRoot.appendChild(tableCard);

    window.SeagoStore.list("boats", function(err, items){
      tbody.innerHTML = "";
      if (!items || items.length === 0) {
        var trEmpty = createEl("tr");
        var tdEmpty = createEl("td", { colspan: "6" });
        tdEmpty.innerHTML = '<div class="empty-state"><h3>No vessels listed</h3></div>';
        trEmpty.appendChild(tdEmpty);
        tbody.appendChild(trEmpty);
        return;
      }

      items.forEach(function(item){
        var tr = createEl("tr");
        tr.appendChild(createEl("td", null, String(item.sort_order || 1)));
        tr.appendChild(createEl("td", { style: { fontWeight: "600", color: "var(--navy)" } }, item.name));
        tr.appendChild(createEl("td", null, item.type === "solar-electric" ? "Solar-Electric" : "Pure Electric"));
        tr.appendChild(createEl("td", null, item.description ? (item.description.substring(0, 60) + "…") : "—"));

        var tdStatus = createEl("td");
        var pill = createEl("button", {
          type: "button",
          className: "pill " + (item.published ? "pill-published" : "pill-draft")
        }, item.published ? "Published" : "Draft");
        pill.addEventListener("click", function(){
          item.published = !item.published;
          window.SeagoStore.save("boats", item, function(){
            renderBoatsList();
          });
        });
        tdStatus.appendChild(pill);
        tr.appendChild(tdStatus);

        var tdActions = createEl("td", { style: { textAlign: "right" } });
        var editBtn = createEl("a", { className: "btn btn-sm btn-secondary", href: "#/boats/edit/" + item.id }, "Edit");
        tdActions.appendChild(editBtn);
        tr.appendChild(tdActions);

        tbody.appendChild(tr);
      });
    });
  }

  function renderBoatForm(boatId) {
    pageRoot.innerHTML = "";
    var isNew = !boatId;

    var header = createEl("div", { className: "page-header" });
    header.appendChild(createEl("h1", { className: "page-header-title" }, isNew ? "Add Vessel" : "Edit Vessel"));
    header.appendChild(createEl("a", { className: "btn btn-secondary", href: "#/boats" }, "← Back to Boats"));
    pageRoot.appendChild(header);

    var formCard = createEl("div", { className: "form-card" });
    var form = createEl("form");

    var row1 = createEl("div", { className: "form-row" });
    var gName = createEl("div", { className: "form-group" });
    gName.appendChild(createEl("label", null, "Vessel Name *"));
    var inpName = createEl("input", { type: "text", required: "required" });
    gName.appendChild(inpName);

    var gType = createEl("div", { className: "form-group" });
    gType.appendChild(createEl("label", null, "Propulsion Category"));
    var selType = createEl("select");
    selType.innerHTML = '<option value="electric">Pure Electric Vessel</option><option value="solar-electric">Solar-Electric Cruiser</option>';
    gType.appendChild(selType);

    row1.appendChild(gName);
    row1.appendChild(gType);
    form.appendChild(row1);

    var gDesc = createEl("div", { className: "form-group" });
    gDesc.appendChild(createEl("label", null, "Overview & Deployment Scope"));
    var inpDesc = createEl("textarea");
    gDesc.appendChild(inpDesc);
    form.appendChild(gDesc);

    // Repeatable Specs
    var sSpecs = createEl("div", { className: "form-section" });
    sSpecs.appendChild(createEl("h3", { className: "form-section__title" }, "Vessel Specifications"));
    sSpecs.appendChild(createEl("p", { className: "form-section__desc" }, "Custom key/value pairs (Hull Material, Capacity, Solar Array)"));

    var specsContainer = createEl("div", { id: "specsContainer" });
    var addSpecBtn = createEl("button", { type: "button", className: "btn btn-sm btn-secondary", style: { marginTop: "10px" } }, "+ Add Specification");

    function addSpecRow(key, val) {
      var row = createEl("div", { className: "repeatable-item" });
      var kInp = createEl("input", { type: "text", placeholder: "Key (e.g. Hull Material)", value: key || "" });
      var vInp = createEl("input", { type: "text", placeholder: "Value (e.g. Marine FRP)", value: val || "" });
      var del = createEl("button", { type: "button", className: "btn-icon", style: { color: "var(--danger)" } }, "×");
      del.addEventListener("click", function(){
        row.parentNode.removeChild(row);
        isDirty = true;
      });
      row.appendChild(kInp);
      row.appendChild(vInp);
      row.appendChild(del);
      specsContainer.appendChild(row);
    }

    addSpecBtn.addEventListener("click", function(){
      addSpecRow("", "");
      isDirty = true;
    });

    sSpecs.appendChild(specsContainer);
    sSpecs.appendChild(addSpecBtn);
    form.appendChild(sSpecs);

    var chkPub = createEl("div", { className: "form-check" });
    var inpPub = createEl("input", { type: "checkbox", id: "f_boat_pub", checked: true });
    chkPub.appendChild(inpPub);
    chkPub.appendChild(createEl("label", { for: "f_boat_pub" }, "Published on website"));
    form.appendChild(chkPub);

    var actions = createEl("div", { className: "form-actions" });
    actions.appendChild(createEl("a", { className: "btn btn-secondary", href: "#/boats" }, "Cancel"));
    var saveBtn = createEl("button", { type: "submit", className: "btn btn-primary" }, "Save Vessel");
    actions.appendChild(saveBtn);
    form.appendChild(actions);

    formCard.appendChild(form);
    pageRoot.appendChild(formCard);

    var existingBoat = null;
    if (!isNew) {
      window.SeagoStore.get("boats", boatId, function(err, b){
        if (b) {
          existingBoat = b;
          inpName.value = b.name || "";
          selType.value = b.type || "electric";
          inpDesc.value = b.description || "";
          inpPub.checked = !!b.published;
          if (b.specs && b.specs.length > 0) {
            b.specs.forEach(function(sp){ addSpecRow(sp.key, sp.value); });
          } else {
            addSpecRow("", "");
          }
        }
      });
    } else {
      addSpecRow("Hull Material", "FRP Composite Marine Grade");
      addSpecRow("Passenger Capacity", "8 - 14 Persons");
    }

    form.addEventListener("submit", function(e){
      e.preventDefault();
      var n = inpName.value.trim();
      if (!n) {
        showToast("Vessel name is required", "error");
        return;
      }
      var record = existingBoat || {};
      record.name = n;
      record.type = selType.value;
      record.description = inpDesc.value.trim();
      record.published = inpPub.checked;

      var specs = [];
      var specRows = specsContainer.querySelectorAll(".repeatable-item");
      for (var i = 0; i < specRows.length; i++) {
        var inputs = specRows[i].querySelectorAll("input");
        var k = inputs[0].value.trim();
        var val = inputs[1].value.trim();
        if (k || val) specs.push({ key: k, value: val });
      }
      record.specs = specs;

      window.SeagoStore.save("boats", record, function(err){
        if (!err) {
          isDirty = false;
          showToast("Vessel saved", "success");
          updateSidebarBadges();
          window.location.hash = "#/boats";
        }
      });
    });
  }

  // ================= 10. SCREEN: CASE STUDIES =================
  function renderCaseStudiesList() {
    pageRoot.innerHTML = "";
    var header = createEl("div", { className: "page-header" });
    header.appendChild(createEl("h1", { className: "page-header-title" }, "Field Deployments & Research"));
    header.appendChild(createEl("a", { className: "btn btn-primary", href: "#/case-studies/new" }, "+ Add Case Study"));
    pageRoot.appendChild(header);

    var tableCard = createEl("div", { className: "card-table" });
    var tableWrap = createEl("div", { className: "table-wrap" });
    var table = createEl("table", { className: "data-table" });

    table.innerHTML = "<thead><tr>" +
      "<th>Headline / Title</th>" +
      "<th>Partner</th>" +
      "<th>Location</th>" +
      "<th>Status</th>" +
      "<th>Published (Toggle)</th>" +
      "<th style='text-align:right;'>Actions</th>" +
      "</tr></thead>";

    var tbody = createEl("tbody");
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    tableCard.appendChild(tableWrap);
    pageRoot.appendChild(tableCard);

    window.SeagoStore.list("case_studies", function(err, items){
      tbody.innerHTML = "";
      if (!items || items.length === 0) {
        var trEmpty = createEl("tr");
        var tdEmpty = createEl("td", { colspan: "6" });
        tdEmpty.innerHTML = '<div class="empty-state"><h3>No case studies</h3></div>';
        trEmpty.appendChild(tdEmpty);
        tbody.appendChild(trEmpty);
        return;
      }

      items.forEach(function(item){
        var tr = createEl("tr");
        tr.appendChild(createEl("td", { style: { fontWeight: "600", color: "var(--navy)" } }, item.title));
        tr.appendChild(createEl("td", null, item.partner || "—"));
        tr.appendChild(createEl("td", null, item.location || "—"));
        tr.appendChild(createEl("td", null, item.status || "Operational"));

        var tdStatus = createEl("td");
        var pill = createEl("button", {
          type: "button",
          className: "pill " + (item.published ? "pill-published" : "pill-draft")
        }, item.published ? "Published" : "Draft");
        pill.addEventListener("click", function(){
          item.published = !item.published;
          window.SeagoStore.save("case_studies", item, function(){
            renderCaseStudiesList();
          });
        });
        tdStatus.appendChild(pill);
        tr.appendChild(tdStatus);

        var tdActions = createEl("td", { style: { textAlign: "right" } });
        var editBtn = createEl("a", { className: "btn btn-sm btn-secondary", href: "#/case-studies/edit/" + item.id }, "Edit");
        tdActions.appendChild(editBtn);
        tr.appendChild(tdActions);

        tbody.appendChild(tr);
      });
    });
  }

  function renderCaseStudyForm(caseId) {
    pageRoot.innerHTML = "";
    var isNew = !caseId;

    var header = createEl("div", { className: "page-header" });
    header.appendChild(createEl("h1", { className: "page-header-title" }, isNew ? "Add Case Study" : "Edit Case Study"));
    header.appendChild(createEl("a", { className: "btn btn-secondary", href: "#/case-studies" }, "← Back to List"));
    pageRoot.appendChild(header);

    var formCard = createEl("div", { className: "form-card" });
    var form = createEl("form");

    var gTitle = createEl("div", { className: "form-group" });
    gTitle.appendChild(createEl("label", null, "Deployment Headline *"));
    var inpTitle = createEl("input", { type: "text", required: "required" });
    gTitle.appendChild(inpTitle);
    form.appendChild(gTitle);

    var row1 = createEl("div", { className: "form-row-3" });
    var gPartner = createEl("div", { className: "form-group" });
    gPartner.appendChild(createEl("label", null, "Partner Organisation"));
    var inpPartner = createEl("input", { type: "text", placeholder: "e.g. ICAR-CIFT" });
    gPartner.appendChild(inpPartner);

    var gLoc = createEl("div", { className: "form-group" });
    gLoc.appendChild(createEl("label", null, "Location"));
    var inpLoc = createEl("input", { type: "text", placeholder: "e.g. Mumbai, Maharashtra" });
    gLoc.appendChild(inpLoc);

    var gStatus = createEl("div", { className: "form-group" });
    gStatus.appendChild(createEl("label", null, "Deployment Status"));
    var selStatus = createEl("select");
    selStatus.innerHTML = '<option value="Operational">Operational</option><option value="Completed">Completed</option><option value="Live">Live</option>';
    gStatus.appendChild(selStatus);

    row1.appendChild(gPartner);
    row1.appendChild(gLoc);
    row1.appendChild(gStatus);
    form.appendChild(row1);

    var gBody = createEl("div", { className: "form-group" });
    gBody.appendChild(createEl("label", null, "Impact Narrative & Technical Context"));
    var inpBody = createEl("textarea", { style: { minHeight: "150px" } });
    gBody.appendChild(inpBody);
    form.appendChild(gBody);

    var chkPub = createEl("div", { className: "form-check" });
    var inpPub = createEl("input", { type: "checkbox", id: "f_case_pub", checked: true });
    chkPub.appendChild(inpPub);
    chkPub.appendChild(createEl("label", { for: "f_case_pub" }, "Published on website"));
    form.appendChild(chkPub);

    var actions = createEl("div", { className: "form-actions" });
    actions.appendChild(createEl("a", { className: "btn btn-secondary", href: "#/case-studies" }, "Cancel"));
    var saveBtn = createEl("button", { type: "submit", className: "btn btn-primary" }, "Save Case Study");
    actions.appendChild(saveBtn);
    form.appendChild(actions);

    formCard.appendChild(form);
    pageRoot.appendChild(formCard);

    var existingCase = null;
    if (!isNew) {
      window.SeagoStore.get("case_studies", caseId, function(err, c){
        if (c) {
          existingCase = c;
          inpTitle.value = c.title || "";
          inpPartner.value = c.partner || "";
          inpLoc.value = c.location || "";
          selStatus.value = c.status || "Operational";
          inpBody.value = c.body || "";
          inpPub.checked = !!c.published;
        }
      });
    }

    form.addEventListener("submit", function(e){
      e.preventDefault();
      var t = inpTitle.value.trim();
      if (!t) {
        showToast("Title is required", "error");
        return;
      }
      var record = existingCase || {};
      record.title = t;
      record.partner = inpPartner.value.trim();
      record.location = inpLoc.value.trim();
      record.status = selStatus.value;
      record.body = inpBody.value.trim();
      record.published = inpPub.checked;

      window.SeagoStore.save("case_studies", record, function(err){
        if (!err) {
          isDirty = false;
          showToast("Case study saved", "success");
          updateSidebarBadges();
          window.location.hash = "#/case-studies";
        }
      });
    });
  }

  // ================= 11. SCREEN: GALLERY =================
  function renderGalleryGrid() {
    pageRoot.innerHTML = "";
    var header = createEl("div", { className: "page-header" });
    var info = createEl("div", { className: "page-header-info" });
    info.appendChild(createEl("h1", { className: "page-header-title" }, "Field Photography & Footage"));
    info.appendChild(createEl("p", { className: "page-header-sub" }, "Trial runs, speed tests, and customer backwater voyages."));
    header.appendChild(info);

    var addBtn = createEl("a", { className: "btn btn-primary", href: "#/gallery/new" }, "+ Add Media Item");
    header.appendChild(addBtn);
    pageRoot.appendChild(header);

    var grid = createEl("div", { className: "gallery-grid" });
    pageRoot.appendChild(grid);

    window.SeagoStore.list("gallery_items", function(err, items){
      if (!items || items.length === 0) {
        grid.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;"><h3>No media items</h3><p>Upload trail photos or video footage.</p></div>';
        return;
      }

      items.forEach(function(item){
        var card = createEl("div", { className: "gallery-card" });
        var mediaWrap = createEl("div", { className: "gallery-media" });

        var mUrl = item.url || "assets/photos/Outboard Motors.webp";
        if (item.media_type === "video") {
          if (item.poster_url) {
            mediaWrap.appendChild(createEl("img", { src: item.poster_url, alt: item.caption || "Video" }));
          } else {
            var vid = createEl("video", { src: mUrl, muted: "muted" });
            mediaWrap.appendChild(vid);
          }
          mediaWrap.appendChild(createEl("span", { className: "gallery-badge" }, "Video · " + (item.category || "")));
        } else {
          var img = createEl("img", { src: mUrl, alt: item.caption || "Photo" });
          img.style.cursor = "pointer";
          img.addEventListener("click", function(){
            openLightbox(mUrl, item.caption);
          });
          mediaWrap.appendChild(img);
          mediaWrap.appendChild(createEl("span", { className: "gallery-badge" }, "Photo · " + (item.category || "")));
        }

        var body = createEl("div", { className: "gallery-body" });
        body.appendChild(createEl("div", { className: "gallery-caption" }, item.caption || "No caption"));

        var actRow = createEl("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } });
        var pill = createEl("button", {
          type: "button",
          className: "pill " + (item.published ? "pill-published" : "pill-draft")
        }, item.published ? "Published" : "Draft");
        pill.addEventListener("click", function(){
          item.published = !item.published;
          window.SeagoStore.save("gallery_items", item, function(){
            renderGalleryGrid();
          });
        });
        actRow.appendChild(pill);

        var editA = createEl("a", { className: "btn btn-sm btn-secondary", href: "#/gallery/edit/" + item.id }, "Edit");
        actRow.appendChild(editA);
        body.appendChild(actRow);

        card.appendChild(mediaWrap);
        card.appendChild(body);
        grid.appendChild(card);
      });
    });
  }

  function renderGalleryForm(itemId) {
    pageRoot.innerHTML = "";
    var isNew = !itemId;

    var header = createEl("div", { className: "page-header" });
    header.appendChild(createEl("h1", { className: "page-header-title" }, isNew ? "Add Media Item" : "Edit Media Item"));
    header.appendChild(createEl("a", { className: "btn btn-secondary", href: "#/gallery" }, "← Back to Gallery"));
    pageRoot.appendChild(header);

    var formCard = createEl("div", { className: "form-card" });
    var form = createEl("form");

    var row1 = createEl("div", { className: "form-row" });
    var gType = createEl("div", { className: "form-group" });
    gType.appendChild(createEl("label", null, "Media Format"));
    var selType = createEl("select");
    selType.innerHTML = '<option value="photo">Photo / High-Res Image</option><option value="video">Video Clip</option>';
    gType.appendChild(selType);

    var gCat = createEl("div", { className: "form-group" });
    gCat.appendChild(createEl("label", null, "Gallery Category"));
    var selCat = createEl("select");
    selCat.innerHTML = '<option value="outboard">Outboard Motors</option><option value="backwater">Backwater Voyages</option><option value="tourism">Eco-Tourism</option><option value="photo">Trial Footage</option>';
    gCat.appendChild(selCat);

    row1.appendChild(gType);
    row1.appendChild(gCat);
    form.appendChild(row1);

    var gUrl = createEl("div", { className: "form-group" });
    gUrl.appendChild(createEl("label", null, "Asset URL or Relative File Path *"));
    var inpUrl = createEl("input", { type: "text", required: "required", placeholder: "e.g. assets/photos/Outboard Motors.webp" });
    var fileImgInput = createEl("input", { type: "file", accept: "image/*,video/*", style: { display: "none" } });
    var pickBtn = createEl("button", { type: "button", className: "btn btn-sm btn-secondary", style: { marginTop: "6px" } }, "Upload Local File");
    pickBtn.addEventListener("click", function(){ fileImgInput.click(); });
    fileImgInput.addEventListener("change", function(){
      if (fileImgInput.files && fileImgInput.files[0]) {
        var f = fileImgInput.files[0];
        showToast("Processing media file…", "info");
        if (f.type.match(/^image\//)) {
          processImageFile(f, function(err, res){
            if (!err && res) {
              inpUrl.value = res.url;
              showToast("Image stored", "success");
            }
          });
        } else {
          window.SeagoStore.uploadFile("video", f, function(err, res){
            if (!err && res) {
              inpUrl.value = res.url;
              showToast("Video stored", "success");
            }
          });
        }
      }
    });

    gUrl.appendChild(inpUrl);
    gUrl.appendChild(fileImgInput);
    gUrl.appendChild(pickBtn);
    form.appendChild(gUrl);

    var gCap = createEl("div", { className: "form-group" });
    gCap.appendChild(createEl("label", null, "Caption / Title"));
    var inpCap = createEl("input", { type: "text", placeholder: "e.g. Seagö 15 HP high-speed trial run" });
    gCap.appendChild(inpCap);
    form.appendChild(gCap);

    var chkPub = createEl("div", { className: "form-check" });
    var inpPub = createEl("input", { type: "checkbox", id: "f_gal_pub", checked: true });
    chkPub.appendChild(inpPub);
    chkPub.appendChild(createEl("label", { for: "f_gal_pub" }, "Published in public gallery"));
    form.appendChild(chkPub);

    var actions = createEl("div", { className: "form-actions" });
    actions.appendChild(createEl("a", { className: "btn btn-secondary", href: "#/gallery" }, "Cancel"));
    var saveBtn = createEl("button", { type: "submit", className: "btn btn-primary" }, "Save Media Item");
    actions.appendChild(saveBtn);
    form.appendChild(actions);

    formCard.appendChild(form);
    pageRoot.appendChild(formCard);

    var existingItem = null;
    if (!isNew) {
      window.SeagoStore.get("gallery_items", itemId, function(err, it){
        if (it) {
          existingItem = it;
          selType.value = it.media_type || "photo";
          selCat.value = it.category || "outboard";
          inpUrl.value = it.url || "";
          inpCap.value = it.caption || "";
          inpPub.checked = !!it.published;
        }
      });
    }

    form.addEventListener("submit", function(e){
      e.preventDefault();
      var u = inpUrl.value.trim();
      if (!u) {
        showToast("File URL is required", "error");
        return;
      }
      var record = existingItem || {};
      record.media_type = selType.value;
      record.category = selCat.value;
      record.url = u;
      record.caption = inpCap.value.trim();
      record.published = inpPub.checked;

      window.SeagoStore.save("gallery_items", record, function(err){
        if (!err) {
          isDirty = false;
          showToast("Media item saved", "success");
          updateSidebarBadges();
          window.location.hash = "#/gallery";
        }
      });
    });
  }

  // ================= 12. SCREEN: SITE SETTINGS =================
  function renderSiteSettings() {
    pageRoot.innerHTML = "";
    var header = createEl("div", { className: "page-header" });
    header.appendChild(createEl("h1", { className: "page-header-title" }, "Site & Organization Settings"));
    pageRoot.appendChild(header);

    var formCard = createEl("div", { className: "form-card" });
    var form = createEl("form");

    // Contact
    var s1 = createEl("div", { className: "form-section" });
    s1.appendChild(createEl("h3", { className: "form-section__title" }, "Contact Information"));
    var r1 = createEl("div", { className: "form-row" });
    var gMail = createEl("div", { className: "form-group" });
    gMail.appendChild(createEl("label", null, "Official Sales Email"));
    var inpMail = createEl("input", { type: "email" });
    gMail.appendChild(inpMail);

    var gPhone = createEl("div", { className: "form-group" });
    gPhone.appendChild(createEl("label", null, "WhatsApp & Telephone"));
    var inpPhone = createEl("input", { type: "text" });
    gPhone.appendChild(inpPhone);

    r1.appendChild(gMail);
    r1.appendChild(gPhone);
    s1.appendChild(r1);

    var gAddrSales = createEl("div", { className: "form-group" });
    gAddrSales.appendChild(createEl("label", null, "Sales & Registered HQ"));
    var inpAddrSales = createEl("textarea");
    gAddrSales.appendChild(inpAddrSales);
    s1.appendChild(gAddrSales);

    var gAddrMfg = createEl("div", { className: "form-group" });
    gAddrMfg.appendChild(createEl("label", null, "Manufacturing Facility"));
    var inpAddrMfg = createEl("input", { type: "text" });
    gAddrMfg.appendChild(inpAddrMfg);
    s1.appendChild(gAddrMfg);
    form.appendChild(s1);

    // Social Links
    var s2 = createEl("div", { className: "form-section" });
    s2.appendChild(createEl("h3", { className: "form-section__title" }, "Official Channels"));
    var r2 = createEl("div", { className: "form-row-3" });
    var gFb = createEl("div", { className: "form-group" });
    gFb.appendChild(createEl("label", null, "Facebook"));
    var inpFb = createEl("input", { type: "text" });
    gFb.appendChild(inpFb);

    var gInsta = createEl("div", { className: "form-group" });
    gInsta.appendChild(createEl("label", null, "Instagram"));
    var inpInsta = createEl("input", { type: "text" });
    gInsta.appendChild(inpInsta);

    var gX = createEl("div", { className: "form-group" });
    gX.appendChild(createEl("label", null, "X (Twitter)"));
    var inpX = createEl("input", { type: "text" });
    gX.appendChild(inpX);

    r2.appendChild(gFb);
    r2.appendChild(gInsta);
    r2.appendChild(gX);
    s2.appendChild(r2);
    form.appendChild(s2);

    // Hero Stats
    var s3 = createEl("div", { className: "form-section" });
    s3.appendChild(createEl("h3", { className: "form-section__title" }, "Hero Counter Metrics (4 Cards)"));
    var statsContainer = createEl("div", { id: "statsContainer" });
    s3.appendChild(statsContainer);
    form.appendChild(s3);

    function addStatRow(label, value, suffix) {
      var row = createEl("div", { className: "repeatable-item" });
      var lInp = createEl("input", { type: "text", placeholder: "Metric Label (e.g. HP Range)", value: label || "" });
      var vInp = createEl("input", { type: "text", placeholder: "Numeric Value (e.g. 3-50)", value: value || "" });
      var sInp = createEl("input", { type: "text", placeholder: "Suffix (e.g. HP)", value: suffix || "" });
      row.appendChild(lInp);
      row.appendChild(vInp);
      row.appendChild(sInp);
      statsContainer.appendChild(row);
    }

    // Leadership
    var s4 = createEl("div", { className: "form-section" });
    s4.appendChild(createEl("h3", { className: "form-section__title" }, "Founder & Executive"));
    var r4 = createEl("div", { className: "form-row" });
    var gFn = createEl("div", { className: "form-group" });
    gFn.appendChild(createEl("label", null, "Founder Full Name"));
    var inpFn = createEl("input", { type: "text" });
    gFn.appendChild(inpFn);

    var gFt = createEl("div", { className: "form-group" });
    gFt.appendChild(createEl("label", null, "Title"));
    var inpFt = createEl("input", { type: "text" });
    gFt.appendChild(inpFt);

    r4.appendChild(gFn);
    r4.appendChild(gFt);
    s4.appendChild(r4);
    form.appendChild(s4);

    var actions = createEl("div", { className: "form-actions" });
    var saveBtn = createEl("button", { type: "submit", className: "btn btn-primary" }, "Save Settings");
    actions.appendChild(saveBtn);
    form.appendChild(actions);

    formCard.appendChild(form);
    pageRoot.appendChild(formCard);

    window.SeagoStore.get("site_settings", "singleton", function(err, s){
      if (s) {
        inpMail.value = s.email || "";
        inpPhone.value = s.phone || "";
        inpAddrSales.value = s.address_sales || "";
        inpAddrMfg.value = s.address_manufacturing || "";
        inpFb.value = s.facebook_url || "";
        inpInsta.value = s.instagram_url || "";
        inpX.value = s.x_url || "";
        inpFn.value = s.founder_name || "";
        inpFt.value = s.founder_title || "";

        statsContainer.innerHTML = "";
        var stats = s.hero_stats || [];
        for (var i = 0; i < 4; i++) {
          var item = stats[i] || {};
          addStatRow(item.label, item.value, item.suffix);
        }
      }
    });

    form.addEventListener("submit", function(e){
      e.preventDefault();
      var stats = [];
      var rows = statsContainer.querySelectorAll(".repeatable-item");
      for (var i = 0; i < rows.length; i++) {
        var inputs = rows[i].querySelectorAll("input");
        stats.push({
          label: inputs[0].value.trim(),
          value: inputs[1].value.trim(),
          suffix: inputs[2].value.trim()
        });
      }

      var record = {
        id: "singleton",
        email: inpMail.value.trim(),
        phone: inpPhone.value.trim(),
        whatsapp: inpPhone.value.trim(),
        address_sales: inpAddrSales.value.trim(),
        address_manufacturing: inpAddrMfg.value.trim(),
        facebook_url: inpFb.value.trim(),
        instagram_url: inpInsta.value.trim(),
        x_url: inpX.value.trim(),
        hero_stats: stats,
        founder_name: inpFn.value.trim(),
        founder_title: inpFt.value.trim()
      };

      window.SeagoStore.save("site_settings", record, function(err){
        if (!err) {
          isDirty = false;
          showToast("Settings saved successfully", "success");
        }
      });
    });
  }

  // ================= 13. SCREEN: DATA (BACKUP & RESTORE) =================
  function renderDataScreen() {
    pageRoot.innerHTML = "";
    var header = createEl("div", { className: "page-header" });
    header.appendChild(createEl("h1", { className: "page-header-title" }, "Data & Backup Manager"));
    pageRoot.appendChild(header);

    var card = createEl("div", { className: "form-card" });

    // Export
    var s1 = createEl("div", { className: "form-section" });
    s1.appendChild(createEl("h3", { className: "form-section__title" }, "Export JSON Backup"));
    s1.appendChild(createEl("p", { className: "form-section__desc" }, "Export complete dataset (motors, battery packs, custom boats, case studies, gallery, settings) into a portable JSON snapshot."));
    var expBtn = createEl("button", { type: "button", className: "btn btn-primary" }, "Download Full Snapshot (.json)");
    expBtn.addEventListener("click", function(){
      window.SeagoStore.exportAll(function(err, jsonStr){
        if (!err && jsonStr) {
          var dateStr = new Date().toISOString().substring(0, 10);
          var blob = new Blob([jsonStr], { type: "application/json" });
          var url = URL.createObjectURL(blob);
          var a = createEl("a", { href: url, download: "seago-admin-backup-" + dateStr + ".json" });
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          showToast("Backup exported", "success");
        } else {
          showToast("Export failed", "error");
        }
      });
    });
    s1.appendChild(expBtn);
    card.appendChild(s1);

    // Import
    var s2 = createEl("div", { className: "form-section" });
    s2.appendChild(createEl("h3", { className: "form-section__title" }, "Import JSON Backup"));
    s2.appendChild(createEl("p", { className: "form-section__desc" }, "Restore your catalog from a previous backup. Current browser records will be replaced."));
    var fileInp = createEl("input", { type: "file", accept: "application/json", style: { display: "none" } });
    var impBtn = createEl("button", { type: "button", className: "btn btn-secondary" }, "Choose Backup File…");
    impBtn.addEventListener("click", function(){ fileInp.click(); });
    fileInp.addEventListener("change", function(){
      if (fileInp.files && fileInp.files[0]) {
        var file = fileInp.files[0];
        var reader = new FileReader();
        reader.onload = function(e){
          var content = e.target.result;
          openModal({
            title: "Confirm Restore",
            bodyText: "Restore catalog from '" + file.name + "'? Current changes will be replaced.",
            danger: true,
            confirmLabel: "Restore Now",
            onConfirm: function(){
              window.SeagoStore.importAll(content, function(err){
                if (!err) {
                  showToast("Restore completed successfully", "success");
                  updateSidebarBadges();
                } else {
                  showToast("Import error: " + (err.message || "Invalid JSON"), "error");
                }
              });
            }
          });
        };
        reader.readAsText(file);
      }
    });
    s2.appendChild(fileInp);
    s2.appendChild(impBtn);
    card.appendChild(s2);

    // Reset
    var s3 = createEl("div", { className: "form-section" });
    s3.appendChild(createEl("h3", { className: "form-section__title" }, "Reset to Official Factory Seed"));
    s3.appendChild(createEl("p", { className: "form-section__desc" }, "Reset all collections to the default Seagö engineering catalog specifications (3–50 HP models, 4 battery packs, 4 case studies)."));
    var resetBtn = createEl("button", { type: "button", className: "btn btn-danger" }, "Reset to Factory Seed");
    resetBtn.addEventListener("click", function(){
      openModal({
        title: "Factory Reset",
        bodyText: "This will clear all modifications in this browser and restore original Seagö factory seed data. Continue?",
        danger: true,
        confirmLabel: "Wipe & Reload Seed",
        onConfirm: function(){
          window.SeagoStore.resetToSeed(function(err){
            if (!err) {
              showToast("Reset to factory seed completed", "success");
              updateSidebarBadges();
            }
          });
        }
      });
    });
    s3.appendChild(resetBtn);
    card.appendChild(s3);

    pageRoot.appendChild(card);
  }

  // ================= 14. BOOTSTRAP =================
  function init() {
    checkAuth();
    if (isAuthenticated()) {
      handleRouting();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
