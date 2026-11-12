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

  // Preview Drawer (Slide-Over) Helpers
  var previewDrawer = document.getElementById("preview-drawer");
  var previewDrawerBackdrop = document.getElementById("preview-drawer-backdrop");
  var previewDrawerClose = document.getElementById("previewDrawerClose");

  function openPreviewDrawer() {
    if (previewDrawer) previewDrawer.classList.add("is-open");
    if (previewDrawerBackdrop) previewDrawerBackdrop.classList.add("is-open");
  }

  function closePreviewDrawer() {
    if (previewDrawer) previewDrawer.classList.remove("is-open");
    if (previewDrawerBackdrop) previewDrawerBackdrop.classList.remove("is-open");
  }

  function isPreviewDrawerOpen() {
    return previewDrawer && previewDrawer.classList.contains("is-open");
  }

  if (previewDrawerClose) {
    previewDrawerClose.addEventListener("click", closePreviewDrawer);
  }
  if (previewDrawerBackdrop) {
    previewDrawerBackdrop.addEventListener("click", closePreviewDrawer);
  }

  // Asset Picker Modal Helper
  function openAssetPicker(filterKind, onSelect) {
    window.SeagoStore.list("assets", function(err, assets){
      var list = assets || [];
      if (list.length === 0 && window.SEAGO_FACTORY_SEED && window.SEAGO_FACTORY_SEED.assets) {
        list = window.SEAGO_FACTORY_SEED.assets;
      }
      var filtered = list.filter(function(a){
        if (!filterKind) return true;
        if (filterKind === "image") return a.kind === "image" || /\.(png|jpe?g|webp|avif)$/i.test(a.url);
        if (filterKind === "pdf") return a.kind === "pdf" || /\.pdf$/i.test(a.url);
        return true;
      });

      var pickerGrid = createEl("div", {
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
          gap: "12px",
          maxHeight: "360px",
          overflowY: "auto",
          padding: "4px"
        }
      });

      if (filtered.length === 0) {
        pickerGrid.appendChild(createEl("div", { style: { gridColumn: "1/-1", padding: "20px", textAlign: "center", color: "var(--text-muted)" } }, "No matching assets found in Asset Manager."));
      }

      filtered.forEach(function(ast){
        var itemCard = createEl("div", {
          style: {
            border: "1px solid var(--line)",
            borderRadius: "6px",
            padding: "8px",
            cursor: "pointer",
            textAlign: "center",
            background: "#FFFFFF",
            transition: "all 0.15s ease"
          }
        });
        itemCard.addEventListener("mouseenter", function(){
          itemCard.style.borderColor = "var(--cyan)";
          itemCard.style.boxShadow = "0 4px 12px rgba(40,212,200,0.2)";
        });
        itemCard.addEventListener("mouseleave", function(){
          itemCard.style.borderColor = "var(--line)";
          itemCard.style.boxShadow = "none";
        });

        if (ast.kind === "image" || /\.(png|jpe?g|webp|avif)$/i.test(ast.url)) {
          var img = createEl("img", {
            src: ast.url,
            style: { width: "100%", height: "70px", objectFit: "cover", borderRadius: "4px", marginBottom: "6px" }
          });
          itemCard.appendChild(img);
        } else {
          var pIcon = createEl("div", {
            style: {
              height: "70px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#FEE2E2",
              color: "#DC2626",
              fontWeight: "700",
              fontSize: "12px",
              borderRadius: "4px",
              marginBottom: "6px"
            }
          }, "PDF");
          itemCard.appendChild(pIcon);
        }

        var lbl = createEl("div", {
          style: {
            fontSize: "11px",
            fontWeight: "600",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }
        }, ast.name);
        itemCard.appendChild(lbl);

        itemCard.addEventListener("click", function(){
          closeModal();
          if (typeof onSelect === "function") {
            onSelect(ast);
          }
        });

        pickerGrid.appendChild(itemCard);
      });

      openModal({
        title: "Select from Asset Manager",
        bodyEl: pickerGrid,
        hideConfirm: true,
        cancelLabel: "Close",
        maxWidth: "600px"
      });
    });
  }

  // Clipboard Copy Helper
  function copyToClipboard(text, cb) {
    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function(){
        if (typeof cb === "function") cb(true);
      })["catch"](function(){
        if (typeof cb === "function") cb(false);
      });
    } else {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        var ok = document.execCommand("copy");
        document.body.removeChild(ta);
        if (typeof cb === "function") cb(ok);
      } catch (err) {
        document.body.removeChild(ta);
        if (typeof cb === "function") cb(false);
      }
    }
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
    var cols = ["motors", "battery_packs", "boats", "case_studies", "gallery_items", "pages", "assets"];
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

  function processCatalogFile(file, cb) {
    if (!file) {
      cb(new Error("Please select a catalog file."));
      return;
    }
    var isPdf = file.type === "application/pdf" || (file.name && /\.pdf$/i.test(file.name));
    var isImg = file.type.indexOf("image/") === 0 || (file.name && /\.(png|jpe?g|webp|avif|bmp)$/i.test(file.name));

    if (!isPdf && !isImg) {
      cb(new Error("Please select a valid PDF datasheet or photo (JPG, PNG, WebP)."));
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      cb(new Error("Catalog file size must be less than 20MB."));
      return;
    }

    var kind = isPdf ? "pdf" : "image";
    window.SeagoStore.uploadFile(kind, file, cb);
  }

  function processPdfFile(file, cb) {
    processCatalogFile(file, cb);
  }

  function runImageOcr(file, cb) {
    if (!file || typeof FileReader === "undefined") {
      cb(new Error("File reader unavailable"));
      return;
    }

    function doRecognize() {
      if (!window.Tesseract) {
        cb(new Error("OCR engine unavailable"));
        return;
      }
      try {
        window.Tesseract.recognize(file, "eng", {
          logger: function(m) {}
        }).then(function(res){
          var txt = (res && res.data && res.data.text) ? res.data.text : "";
          cb(null, txt);
        })["catch"](function(err){
          cb(err);
        });
      } catch (ex) {
        cb(ex);
      }
    }

    if (window.Tesseract) {
      doRecognize();
    } else {
      var s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
      s.onload = function(){
        doRecognize();
      };
      s.onerror = function(){
        cb(new Error("OCR library could not be loaded from CDN"));
      };
      document.head.appendChild(s);
    }
  }

  // ================= 5. ROUTING & CONTROLLER DISPATCH =================
  function updateNavLinks(route) {
    var links = document.querySelectorAll(".sidebar-nav .nav-link");
    for (var i = 0; i < links.length; i++) {
      var r = links[i].getAttribute("data-route");
      if (r && (route === r || (r !== "/dashboard" && route.indexOf(r) === 0))) {
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
      pageTitle.textContent = "CMS Overview · All Website Pages";
      renderDashboard();
    } else if (root === "crm") {
      pageTitle.textContent = "CRM & Customer Inquiries";
      if (window.SeagoCRM && typeof window.SeagoCRM.renderCrmScreen === "function") {
        window.SeagoCRM.renderCrmScreen(action, id);
      }
    } else if (root === "pages") {
      var targetPage = action || "home";
      if (targetPage === "home") {
        pageTitle.textContent = "Home Page (index.html)";
        renderHomePageEditor();
      } else if (targetPage === "products") {
        pageTitle.textContent = "Products & Motors (products.html)";
        renderProductsPageEditor();
      } else if (targetPage === "about") {
        pageTitle.textContent = "About & Leadership (about.html)";
        renderAboutPageEditor();
      } else if (targetPage === "case-studies" || targetPage === "case_studies") {
        pageTitle.textContent = "Field Case Studies (case-studies.html)";
        renderCaseStudiesPageEditor();
      } else if (targetPage === "gallery") {
        pageTitle.textContent = "Media Gallery (gallery.html)";
        renderGalleryPageEditor();
      } else if (targetPage === "know-more" || targetPage === "know_more") {
        pageTitle.textContent = "Tech & Economics (know-more.html)";
        renderKnowMorePageEditor();
      } else if (targetPage === "contact") {
        pageTitle.textContent = "Contact & Showroom (contact.html)";
        renderContactPageEditor();
      } else if (targetPage === "edit" && id) {
        window.location.hash = "#/pages/" + id;
      } else {
        pageTitle.textContent = "CMS Overview";
        renderDashboard();
      }
    } else if (root === "motors") {
      if (action === "new") {
        pageTitle.textContent = "New Outboard Motor";
        renderMotorForm(null);
      } else if (action === "edit" && id) {
        pageTitle.textContent = "Edit Outboard Motor";
        renderMotorForm(id);
      } else {
        window.location.hash = "#/pages/products";
      }
    } else if (root === "battery-packs" || root === "boats") {
      window.location.hash = "#/pages/products";
    } else if (root === "case-studies") {
      window.location.hash = "#/pages/case-studies";
    } else if (root === "gallery") {
      window.location.hash = "#/pages/gallery";
    } else if (root === "media") {
      window.location.hash = "#/pages/gallery";
    } else if (root === "site-settings") {
      pageTitle.textContent = "Global Site Settings";
      renderSiteSettings();
    } else if (root === "data") {
      pageTitle.textContent = "Data & Backup";
      renderDataScreen();
    } else {
      window.location.hash = "#/dashboard";
    }
  }

  window.addEventListener("hashchange", handleRouting);

  // ================= 6. SCREEN: CMS OVERVIEW & ALL PAGES =================
  function renderDashboard() {
    pageRoot.innerHTML = "";
    var wrap = createEl("div");

    var header = createEl("div", { className: "page-header", style: { marginBottom: "12px" } });
    var info = createEl("div", { className: "page-header-info" });
    info.appendChild(createEl("h1", { className: "page-header-title" }, "Seagö CMS Studio · Website Pages"));
    info.appendChild(createEl("p", { className: "page-header-sub" }, "Select any website page below to visually edit headlines, copy, specs, and media."));
    header.appendChild(info);

    var headerActions = createEl("div", { className: "page-header-actions" });
    var crmBtn = createEl("a", { className: "btn btn-primary btn-sm", href: "#/crm", style: { display: "inline-flex", alignItems: "center", gap: "6px" } });
    crmBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg><span>CRM &amp; Inquiries</span>';
    var liveBtn = createEl("a", { className: "btn btn-outline-topbar btn-sm", href: "index.html", target: "_blank", rel: "noopener" });
    liveBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:5px; vertical-align:middle;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg><span>Public Website</span>';
    var backupBtn = createEl("a", { className: "btn btn-secondary btn-sm", href: "#/data" });
    backupBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:5px; vertical-align:middle;"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg><span>Backup JSON</span>';
    headerActions.appendChild(crmBtn);
    headerActions.appendChild(liveBtn);
    headerActions.appendChild(backupBtn);
    header.appendChild(headerActions);
    wrap.appendChild(header);

    // Quick Stats Ribbon
    var statsRow = createEl("div", { className: "cms-hub-stats-row" });

    var chip1 = createEl("div", { className: "cms-hub-stat-chip" });
    chip1.innerHTML = '<span class="cms-hub-stat-dot"></span><span><strong>6</strong> Live Website Pages</span>';

    var chip2 = createEl("div", { className: "cms-hub-stat-chip" });
    chip2.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#00D4AA" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg><span><strong>8</strong> Motors (3–50 HP)</span>';

    var chip3 = createEl("div", { className: "cms-hub-stat-chip" });
    chip3.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg><span>Storage Synced</span>';

    statsRow.appendChild(chip1);
    statsRow.appendChild(chip2);
    statsRow.appendChild(chip3);
    wrap.appendChild(statsRow);

    // All 6 Live Website Pages Compact Grid
    var hubGrid = createEl("div", { className: "cms-page-hub" });

    var websitePages = [
      {
        svg: '<svg class="cms-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>',
        title: "Home Page",
        file: "index.html",
        route: "#/pages/home",
        desc: "Hero video & banner · 3 range cards · 3 case teasers · 3 pillars"
      },
      {
        svg: '<svg class="cms-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>',
        title: "Products & Motors",
        file: "products.html",
        route: "#/pages/products",
        desc: "3–50 HP outboards · Battery specs · Electric & solar boats"
      },
      {
        svg: '<svg class="cms-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
        title: "About & Leadership",
        file: "about.html",
        route: "#/pages/about",
        desc: "Our story · 2 facilities · 3 priorities · Founder portrait & quote"
      },
      {
        svg: '<svg class="cms-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>',
        title: "Field Case Studies",
        file: "case-studies.html",
        route: "#/pages/case-studies",
        desc: "Vikalpika · Kerala transit · Karnataka tourism · Hydrogen vessel"
      },
      {
        svg: '<svg class="cms-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>',
        title: "Media Gallery",
        file: "gallery.html",
        route: "#/pages/gallery",
        desc: "Sea trials footage · Tourism runs · 10 fleet gallery photos"
      },
      {
        svg: '<svg class="cms-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>',
        title: "Contact & Showroom",
        file: "contact.html",
        route: "#/pages/contact",
        desc: "Kollam showroom · Chennai plant · Web3Forms quote setup"
      }
    ];

    websitePages.forEach(function(p){
      var card = createEl("div", { className: "cms-page-card" });

      var left = createEl("div", { className: "cms-page-header" });
      var iconEl = createEl("span", { className: "cms-page-icon-lg" });
      iconEl.innerHTML = p.svg;

      var titleBox = createEl("div", { style: { minWidth: "0", flex: "1" } });
      var titleRow = createEl("div", { className: "cms-page-title" });
      titleRow.appendChild(createEl("span", null, p.title));
      titleRow.appendChild(createEl("span", { className: "cms-page-slug" }, p.file));
      titleBox.appendChild(titleRow);

      var descEl = createEl("p", { className: "cms-page-desc" }, p.desc);
      titleBox.appendChild(descEl);

      left.appendChild(iconEl);
      left.appendChild(titleBox);
      card.appendChild(left);

      var footer = createEl("div", { className: "cms-page-footer" });
      var viewLink = createEl("a", { className: "btn btn-secondary btn-sm", href: p.file, target: "_blank", rel: "noopener", title: "View live page in new tab" });
      viewLink.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';

      var editLink = createEl("a", { className: "btn btn-primary btn-sm", href: p.route });
      editLink.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px; vertical-align:middle;"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg><span>Edit</span>';

      footer.appendChild(viewLink);
      footer.appendChild(editLink);
      card.appendChild(footer);

      hubGrid.appendChild(card);
    });

    wrap.appendChild(hubGrid);

    // Bottom Utility Strip: Global Settings & Motor Presets
    var bottomStrip = createEl("div", { className: "cms-hub-bottom-strip" });

    var stripLeft = createEl("div", { className: "cms-hub-strip-left" });
    var setBtn = createEl("a", { className: "btn btn-secondary btn-sm", href: "#/site-settings" });
    setBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:5px; vertical-align:middle;"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg><span>Global Header &amp; Footer</span>';
    stripLeft.appendChild(setBtn);
    bottomStrip.appendChild(stripLeft);

    var stripRight = createEl("div", { className: "cms-hub-strip-right" });
    var motorLabel = createEl("span", { style: { fontSize: "12px", color: "var(--text-muted)", marginRight: "4px", fontWeight: "600" } }, "Motors:");
    stripRight.appendChild(motorLabel);

    var hps = [3, 7, 10, 15, 20, 30, 40, 50];
    hps.forEach(function(hp){
      var pill = createEl("a", {
        className: "preset-pill",
        style: { textDecoration: "none", padding: "3px 8px", fontSize: "11px" },
        href: "#/motors/edit/motor-" + hp + "hp"
      }, hp + " HP");
      stripRight.appendChild(pill);
    });
    bottomStrip.appendChild(stripRight);
    wrap.appendChild(bottomStrip);

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
      if (item.custom_specs && item.custom_specs.length) {
        cloned.custom_specs = JSON.parse(JSON.stringify(item.custom_specs));
      }

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

      if (motor.custom_specs && motor.custom_specs.length > 0) {
        var extraSection = createEl("div", {
          style: {
            marginTop: "16px",
            paddingTop: "14px",
            borderTop: "1px solid rgba(255,255,255,0.12)"
          }
        });
        extraSection.appendChild(createEl("div", {
          style: {
            fontSize: "11px",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--cyan)",
            fontWeight: "700",
            marginBottom: "8px"
          }
        }, "Additional Specifications"));
        var extraGrid = createEl("div", {
          style: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px",
            fontSize: "12px",
            color: "#CBD5E1"
          }
        });
        for (var csi = 0; csi < motor.custom_specs.length; csi++) {
          var cs = motor.custom_specs[csi];
          if (cs && (cs.name || cs.value)) {
            var csItem = createEl("div");
            csItem.innerHTML = "<strong>" + escapeHtml(cs.name || "Parameter") + ":</strong> " + escapeHtml(cs.value || "—");
            extraGrid.appendChild(csItem);
          }
        }
        extraSection.appendChild(extraGrid);
        card.appendChild(extraSection);
      }

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

  // Catalog Presets Map for Seagö Electric Outboards (all 8 models)
  var SEAGO_CATALOG_PRESETS = {
    3: {
      hp: 3, title: "Seagö 3 HP", slug: "seago-3hp", kw: "2.2 kW", voltage: "51.2 V",
      battery: "51.2V 50 AH LiFePO4 – Lithium Ferrous Phosphate", motor: "Permanent Magnet Synchronous Motor (PMSM)",
      control: "Tiller Control", cooling: "Air Cooled", rpm: "4500 - 5000 RPM", gear_ratio: "2.08",
      transom: "417mm", weight: "13.5 Kg", boat_length: "2-4 metres", propeller: "—",
      catalog_path: "catalog/SEAGO 3 HP Technical Specifications.pdf",
      custom_specs: [{ name: "Sensor", value: "Magnetic Encoder" }, { name: "Gear Position", value: "Forward" }]
    },
    7: {
      hp: 7, title: "Seagö 7 HP", slug: "seago-7hp", kw: "5.1 kW", voltage: "51.2 V",
      battery: "51.2V 105 AH LiFePO4", motor: "Permanent Magnet Synchronous Motor (PMSM)",
      control: "Tiller Control", cooling: "Water Cooled", rpm: "5000 - 5500 RPM", gear_ratio: "2.08",
      transom: "S:440mm / L:568mm", weight: "S:30 Kg / L:31 Kg", boat_length: "3-5 metres", propeller: "—",
      catalog_path: "catalog/SEAGO 7 HP Technical Specifications.pdf",
      custom_specs: [{ name: "Sensor", value: "Magnetic Encoder" }, { name: "Gear Position", value: "Forward / Neutral / Reverse" }]
    },
    10: {
      hp: 10, title: "Seagö 10 HP", slug: "seago-10hp", kw: "7.3 kW", voltage: "73.6 V",
      battery: "73.6V 150 AH LiFePO4", motor: "Permanent Magnet Synchronous Motor (PMSM)",
      control: "Tiller / Remote Control", cooling: "Water Cooled", rpm: "4250 RPM", gear_ratio: "2.08 (27/13)",
      transom: "S:440mm / L:567mm", weight: "S:37.5 Kg / L:38 Kg", boat_length: "3-6 metres", propeller: "—",
      catalog_path: "catalog/SEAGO 10 HP Technical Specifications.pdf",
      custom_specs: [{ name: "Sensor", value: "Magnetic Encoder" }, { name: "Gear Position", value: "Forward / Neutral / Reverse" }]
    },
    15: {
      hp: 15, title: "Seagö 15 HP", slug: "seago-15hp", kw: "11 kW", voltage: "73.6 V",
      battery: "73.6V 210 AH LiFePO4", motor: "Permanent Magnet Synchronous Motor (PMSM)",
      control: "Tiller / Remote Control", cooling: "Water Cooled", rpm: "4650 - 4700 RPM", gear_ratio: "2.08 (27/13)",
      transom: "S:440mm / L:567mm", weight: "S:38 Kg / L:39.5 Kg", boat_length: "3.6-7.0 metres", propeller: "9 7/8 × 12",
      catalog_path: "catalog/SEAGO 15 HP Technical Specifications.pdf",
      custom_specs: [{ name: "Sensor", value: "Magnetic Encoder" }, { name: "Gear Position", value: "Forward / Neutral / Reverse" }]
    },
    20: {
      hp: 20, title: "Seagö 20 HP", slug: "seago-20hp", kw: "15 kW", voltage: "96 V",
      battery: "96V 210 AH LiFePO4", motor: "Permanent Magnet Synchronous Motor (PMSM)",
      control: "Tiller / Remote Control", cooling: "Water Cooled", rpm: "5800 RPM", gear_ratio: "2.08",
      transom: "S:440mm / L:570mm", weight: "S:45 Kg / L:48 Kg", boat_length: "4.5-8.0 metres", propeller: "—",
      catalog_path: "catalog/SEAGO 20 HP Technical Specifications.pdf",
      custom_specs: [{ name: "Sensor", value: "Magnetic Encoder" }, { name: "Gear Position", value: "Forward / Neutral / Reverse" }]
    },
    30: {
      hp: 30, title: "Seagö 30 HP", slug: "seago-30hp", kw: "22 kW", voltage: "96 V",
      battery: "96V 230 AH LiFePO4", motor: "Permanent Magnet Synchronous Motor (PMSM)",
      control: "Remote / Steering Grip", cooling: "Water Cooling", rpm: "5800 RPM", gear_ratio: "2.08",
      transom: "550mm", weight: "52.7 Kg", boat_length: "5.5-9.0 metres", propeller: "—",
      catalog_path: "catalog/SEAGO 30 HP Technical Specifications.pdf",
      custom_specs: [{ name: "Sensor", value: "Magnetic Encoder" }, { name: "Gear Position", value: "Forward / Neutral / Reverse" }]
    },
    40: {
      hp: 40, title: "Seagö 40 HP", slug: "seago-40hp", kw: "29.4 kW", voltage: "144 V",
      battery: "144V 200 AH LiFePO4", motor: "Permanent Magnet Synchronous Motor (PMSM)",
      control: "Steering Grip / Remote", cooling: "Water Cooled", rpm: "5000 - 6000 RPM", gear_ratio: "2.08",
      transom: "508mm", weight: "89 Kg", boat_length: "6.0-10.0 metres", propeller: "—",
      catalog_path: "catalog/SEAGO 40 HP Technical Specifications.pdf",
      custom_specs: [{ name: "Sensor", value: "Hall / Encoder" }, { name: "Gear Position", value: "Forward / Neutral / Reverse" }]
    },
    50: {
      hp: 50, title: "Seagö 50 HP", slug: "seago-50hp", kw: "37.2 kW", voltage: "144 V",
      battery: "144V 300 AH LiFePO4", motor: "Brushless DC / PMSM",
      control: "Steering Grip / Remote", cooling: "Water Cooled", rpm: "5500 RPM", gear_ratio: "1.8",
      transom: "508mm", weight: "105 Kg", boat_length: "7.0-12.0 metres", propeller: "—",
      catalog_path: "catalog/SEAGO 50 HP Technical Specifications.pdf",
      custom_specs: [{ name: "Sensor", value: "Hall / Encoder" }, { name: "Gear Position", value: "Forward / Neutral / Reverse" }]
    }
  };

  function extractPdfTextSnippet(file, cb) {
    if (!file || typeof FileReader === "undefined") {
      cb(null, "");
      return;
    }
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var str = "";
        if (typeof e.target.result === "string") {
          str = e.target.result;
        } else if (e.target.result) {
          var bytes = new Uint8Array(e.target.result);
          var scanLen = Math.min(bytes.length, 131072);
          var parts = [];
          for (var i = 0; i < scanLen; i++) {
            parts.push(String.fromCharCode(bytes[i]));
          }
          str = parts.join("");
        }

        var decodedAll = str;
        var hexMatches = str.match(/<FEFF([0-9A-Fa-f]+)>/g);
        if (hexMatches) {
          for (var h = 0; h < hexMatches.length; h++) {
            var rawHex = hexMatches[h].replace(/<FEFF|>/g, "");
            var dec = "";
            for (var c = 0; c < rawHex.length; c += 4) {
              dec += String.fromCharCode(parseInt(rawHex.substr(c, 4), 16));
            }
            decodedAll += " " + dec;
          }
        }
        cb(null, decodedAll);
      } catch (err) {
        cb(err, "");
      }
    };
    reader.onerror = function() {
      cb(null, "");
    };

    if (reader.readAsBinaryString) {
      reader.readAsBinaryString(file.slice(0, 131072));
    } else {
      reader.readAsArrayBuffer(file.slice(0, 131072));
    }
  }

  function detectCatalogSpecs(inputStr, textSnippet) {
    var combined = (inputStr || "") + " " + (textSnippet || "");
    if (!combined.trim()) return null;

    var lower = combined.toLowerCase();

    // Look for HP number (e.g. 15 HP, 15HP, 15 horsepower)
    var hpMatch = lower.match(/(\d{1,3})\s*(?:hp|horsepower)\b/);
    var hpNum = hpMatch ? parseInt(hpMatch[1], 10) : null;

    // Check if filename has digits like 3hp, 15hp
    if (!hpNum) {
      var fnHp = lower.match(/(?:seago[_\s-]*)?(\d{1,3})\s*hp/);
      if (fnHp) hpNum = parseInt(fnHp[1], 10);
    }

    var result = {};
    if (hpNum && SEAGO_CATALOG_PRESETS[hpNum]) {
      var p = SEAGO_CATALOG_PRESETS[hpNum];
      for (var k in p) {
        if (Object.prototype.hasOwnProperty.call(p, k)) {
          if (k === "custom_specs") {
            result.custom_specs = JSON.parse(JSON.stringify(p.custom_specs));
          } else {
            result[k] = p[k];
          }
        }
      }
    } else {
      if (hpNum) {
        result.hp = hpNum;
        result.title = "Seagö " + hpNum + " HP";
        result.slug = "seago-" + hpNum + "hp";
      }
      result.custom_specs = [];
    }

    // Generic extractions for custom or non-preset datasheets
    var kwMatch = lower.match(/(\d{1,3}(?:\.\d{1,2})?)\s*kw\b/);
    if (kwMatch && !result.kw) result.kw = kwMatch[1] + " kW";

    var voltMatch = lower.match(/(\d{2,3}(?:\.\d{1,2})?)\s*v(?:olts?|dc)?\b/);
    if (voltMatch && !result.voltage) result.voltage = voltMatch[1] + " V";

    var rpmMatch = lower.match(/(\d{3,5}(?:\s*[-–]\s*\d{3,5})?)\s*rpm\b/);
    if (rpmMatch && !result.rpm) result.rpm = rpmMatch[1] + " RPM";

    var batMatch = lower.match(/(\d{2,3}(?:\.\d)?\s*v?\s*[-–/]\s*\d{2,3}\s*a[hH](?:\s*lifepo4)?)/);
    if (batMatch && !result.battery) result.battery = batMatch[1].toUpperCase();

    if (!result.cooling) {
      if (lower.indexOf("water cool") !== -1) result.cooling = "Water Cooled";
      else if (lower.indexOf("air cool") !== -1) result.cooling = "Air Cooled";
    }

    if (!result.control) {
      if (lower.indexOf("tiller") !== -1 && lower.indexOf("remote") !== -1) result.control = "Tiller / Remote Control";
      else if (lower.indexOf("tiller") !== -1) result.control = "Tiller Control";
      else if (lower.indexOf("remote") !== -1) result.control = "Remote Control";
      else if (lower.indexOf("steering") !== -1) result.control = "Steering Grip";
    }

    if (!result.motor) {
      if (lower.indexOf("pmsm") !== -1 || lower.indexOf("permanent magnet") !== -1) {
        result.motor = "Permanent Magnet Synchronous Motor (PMSM)";
      } else if (lower.indexOf("brushless") !== -1 || lower.indexOf("bldc") !== -1) {
        result.motor = "Brushless DC / PMSM";
      }
    }

    var transomMatch = lower.match(/([sl]:\s*\d{3}\s*mm(?:\s*[\/|&]\s*[sl]:\s*\d{3}\s*mm)?|\d{3}\s*mm)/);
    if (transomMatch && !result.transom) result.transom = transomMatch[1].toUpperCase();

    var weightMatch = lower.match(/([sl]:\s*\d{2,3}(?:\.\d)?\s*kg(?:\s*[\/|&]\s*[sl]:\s*\d{2,3}(?:\.\d)?\s*kg)?|\d{2,3}(?:\.\d)?\s*kg)/);
    if (weightMatch && !result.weight) result.weight = weightMatch[1].toUpperCase();

    var boatLenMatch = lower.match(/(\d+(?:\.\d)?\s*[-–]\s*\d+(?:\.\d)?\s*m(?:etres?|s)?)/);
    if (boatLenMatch && !result.boat_length) result.boat_length = boatLenMatch[1];

    var propMatch = lower.match(/(\d+(?:\s+\d+\/\d+)?\s*[×x*]\s*\d+)/);
    if (propMatch && !result.propeller) result.propeller = propMatch[1];

    var ipMatch = lower.match(/\b(ip(?:67|68|65))\b/);
    if (ipMatch) {
      var hasIp = false;
      for (var i = 0; i < result.custom_specs.length; i++) {
        if (result.custom_specs[i].name.toLowerCase() === "ingress protection") hasIp = true;
      }
      if (!hasIp) {
        result.custom_specs.push({ name: "Ingress Protection", value: ipMatch[1].toUpperCase() });
      }
    }

    var torqueMatch = lower.match(/(\d{2,4}\s*nm)\b/);
    if (torqueMatch) {
      var hasTorque = false;
      for (var t = 0; t < result.custom_specs.length; t++) {
        if (result.custom_specs[t].name.toLowerCase() === "peak torque") hasTorque = true;
      }
      if (!hasTorque) {
        result.custom_specs.push({ name: "Peak Torque", value: torqueMatch[1].toUpperCase() });
      }
    }

    return (result.hp || result.kw || result.voltage) ? result : null;
  }

  function renderMotorForm(motorId) {
    pageRoot.innerHTML = "";
    var isNew = !motorId;

    var header = createEl("div", { className: "page-header" });
    var info = createEl("div", { className: "page-header-info" });
    info.appendChild(createEl("h1", { className: "page-header-title" }, isNew ? "Add Outboard Motor" : "Edit Outboard Motor"));
    info.appendChild(createEl("p", { className: "page-header-sub" }, "Configure engineering parameters, cooling system, and documentation."));
    header.appendChild(info);

    var headerActions = createEl("div", { className: "page-header-actions" });
    var previewBtn = createEl("button", { type: "button", className: "btn btn-secondary", id: "btnTogglePreview" });
    previewBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg><span>Live Card Preview (Ctrl+P)</span>';
    var backBtn = createEl("a", { className: "btn btn-secondary", href: "#/motors" }, "← Back to Motors");
    var topSaveBtn = createEl("button", { type: "button", className: "btn btn-primary" }, "Save Motor (Ctrl+S)");
    headerActions.appendChild(previewBtn);
    headerActions.appendChild(backBtn);
    headerActions.appendChild(topSaveBtn);
    header.appendChild(headerActions);
    pageRoot.appendChild(header);

    // Studio Section Tabs Bar
    var tabsBar = createEl("div", { className: "studio-tabs-bar" });
    var tabDefs = [
      { id: "all", label: "All Parameters" },
      { id: "core", label: "Model & Electrical" },
      { id: "mech", label: "Mechanical Specs" },
      { id: "datasheet", label: "Datasheet & Auto-Detect" },
      { id: "custom", label: "Custom Parameters" },
      { id: "media", label: "Photos & Publishing" }
    ];
    var tabBtns = [];

    function applyTabFilter(tabId) {
      for (var ti = 0; ti < tabBtns.length; ti++) {
        if (tabBtns[ti].getAttribute("data-tab") === tabId) {
          tabBtns[ti].classList.add("is-active");
        } else {
          tabBtns[ti].classList.remove("is-active");
        }
      }
      if (tabId === "all") {
        s1.style.display = "block";
        s2.style.display = "block";
        s3.style.display = "block";
        s4.style.display = "block";
        s5.style.display = "block";
        s6.style.display = "block";
      } else if (tabId === "core") {
        s1.style.display = "block";
        s2.style.display = "block";
        s3.style.display = "none";
        s4.style.display = "none";
        s5.style.display = "none";
        s6.style.display = "none";
      } else if (tabId === "mech") {
        s1.style.display = "none";
        s2.style.display = "none";
        s3.style.display = "block";
        s4.style.display = "none";
        s5.style.display = "none";
        s6.style.display = "none";
      } else if (tabId === "datasheet") {
        s1.style.display = "none";
        s2.style.display = "none";
        s3.style.display = "none";
        s4.style.display = "block";
        s5.style.display = "none";
        s6.style.display = "none";
      } else if (tabId === "custom") {
        s1.style.display = "none";
        s2.style.display = "none";
        s3.style.display = "none";
        s4.style.display = "none";
        s5.style.display = "block";
        s6.style.display = "none";
      } else if (tabId === "media") {
        s1.style.display = "none";
        s2.style.display = "none";
        s3.style.display = "none";
        s4.style.display = "block";
        s5.style.display = "none";
        s6.style.display = "block";
      }
    }

    tabDefs.forEach(function(tDef){
      var tBtn = createEl("button", {
        type: "button",
        className: "studio-tab-btn" + (tDef.id === "all" ? " is-active" : ""),
        "data-tab": tDef.id
      }, tDef.label);
      tBtn.addEventListener("click", function(){
        applyTabFilter(tDef.id);
      });
      tabBtns.push(tBtn);
      tabsBar.appendChild(tBtn);
    });

    pageRoot.appendChild(tabsBar);

    var formCard = createEl("div", { className: "form-card" });
    var form = createEl("form", { id: "motorEditForm", novalidate: "novalidate" });

    topSaveBtn.addEventListener("click", function(){
      if (typeof form.requestSubmit === "function") {
        form.requestSubmit();
      } else {
        form.dispatchEvent(new Event("submit", { cancelable: true }));
      }
    });

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

    var chooseAssetImgBtn = createEl("button", { type: "button", className: "btn btn-sm btn-secondary", style: { marginTop: "6px" } });
    chooseAssetImgBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:5px; vertical-align:middle;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg><span>Choose from Asset Manager</span>';
    chooseAssetImgBtn.addEventListener("click", function(){
      openAssetPicker("image", function(selected){
        currentImageUrl = selected.url;
        currentImageId = selected.id;
        imgThumbEl.src = selected.url;
        imgNameEl.textContent = selected.name;
        imgSizeEl.textContent = Math.round(selected.size / 1024) + " KB";
        imgPreview.style.display = "flex";
        isDirty = true;
        showToast("Attached photo from Asset Manager", "success");
      });
    });

    dropImg.appendChild(fileImgInput);
    gImg.appendChild(dropImg);
    gImg.appendChild(chooseAssetImgBtn);
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
            if (f.name && (/catalog|spec|datasheet|\bhp\b/i.test(f.name))) {
              checkCatalogDetection(f.name, f);
            }
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

    // Catalog PDF or Photo Datasheet
    var gPdf = createEl("div", { className: "form-group" });
    gPdf.appendChild(createEl("label", { for: "f_catalog" }, "Technical Specification Catalog (PDF or Photo Datasheet)"));
    var inpCatalog = createEl("input", { type: "text", id: "f_catalog", placeholder: "e.g. catalog/SEAGO 15 HP Technical Specifications.pdf or photo URL" });
    var filePdfInput = createEl("input", { type: "file", accept: "application/pdf,image/png,image/jpeg,image/webp,image/avif", style: { display: "none" } });
    var pdfActionsRow = createEl("div", { style: { display: "flex", gap: "8px", marginTop: "6px" } });
    var uploadPdfBtn = createEl("button", { type: "button", className: "btn btn-sm btn-secondary" }, "Upload Catalog (PDF / Photo)");
    var chooseAssetPdfBtn = createEl("button", { type: "button", className: "btn btn-sm btn-secondary" });
    chooseAssetPdfBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:5px; vertical-align:middle;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg><span>Choose from Asset Manager</span>';
    pdfActionsRow.appendChild(uploadPdfBtn);
    pdfActionsRow.appendChild(chooseAssetPdfBtn);

    chooseAssetPdfBtn.addEventListener("click", function(){
      openAssetPicker("pdf", function(selected){
        inpCatalog.value = selected.url;
        isDirty = true;
        updateCatalogPreview(selected.url, selected.name);
        showToast("Attached datasheet from Asset Manager", "success");
        checkCatalogDetection(selected.name, null);
      });
    });

    var catalogPreview = createEl("div", { className: "catalog-preview-thumb", style: { display: "none" } });

    // High-Tech Executive Auto-detection Panel
    var detectBox = createEl("div", { className: "catalog-detect-box" });
    
    var detectTop = createEl("div", { className: "catalog-detect-topbar" });
    var metaWrap = createEl("div", { className: "catalog-detect-meta" });
    var tagEl = createEl("div", { className: "catalog-detect-tag" });
    tagEl.innerHTML = '<span class="catalog-detect-pulse"></span> AUTOMATIC SPEC DETECTOR';
    var titleEl = createEl("h4", { className: "catalog-detect-title" }, "Detected Motor Specifications");
    var subEl = createEl("p", { className: "catalog-detect-sub", id: "catalogDetectSub" }, "Specifications detected from catalog datasheet or photo.");
    metaWrap.appendChild(tagEl);
    metaWrap.appendChild(titleEl);
    metaWrap.appendChild(subEl);

    var actWrap = createEl("div", { className: "catalog-detect-action" });
    var autoFillBtn = createEl("button", { type: "button", className: "btn-autofill", id: "btnAutoFillSpecs" });
    autoFillBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg><span>Auto-Fill Form Fields</span>';
    actWrap.appendChild(autoFillBtn);

    detectTop.appendChild(metaWrap);
    detectTop.appendChild(actWrap);

    var detectGrid = createEl("div", { className: "catalog-spec-grid" });

    // Quick Model Presets Bar
    var presetsBar = createEl("div", { className: "catalog-detect-presets" });
    var presetsLbl = createEl("span", { className: "catalog-detect-presets-label" });
    presetsLbl.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:5px; vertical-align:middle;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg><span>Quick Presets:</span>';
    presetsBar.appendChild(presetsLbl);

    var hpOptions = [3, 7, 10, 15, 20, 30, 40, 50];
    for (var hi = 0; hi < hpOptions.length; hi++) {
      (function(hpNum){
        var pBtn = createEl("button", {
          type: "button",
          className: "preset-pill",
          "data-hp": String(hpNum)
        }, hpNum + " HP");
        pBtn.addEventListener("click", function(){
          if (SEAGO_CATALOG_PRESETS[hpNum]) {
            renderDetectedSpecs(SEAGO_CATALOG_PRESETS[hpNum]);
            showToast("Loaded specifications for Seagö " + hpNum + " HP!", "info");
            var allPills = presetsBar.querySelectorAll(".preset-pill");
            for (var pi = 0; pi < allPills.length; pi++) {
              allPills[pi].classList.remove("active");
            }
            pBtn.classList.add("active");
          }
        });
        presetsBar.appendChild(pBtn);
      })(hpOptions[hi]);
    }

    var detectFooter = createEl("div", { className: "catalog-detect-footer" });
    detectFooter.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg><span>Parameters extracted directly from PDF or photo datasheet. Click <strong>Auto-Fill Form Fields</strong> to populate matching specifications and custom parameters below.</span>';

    detectBox.appendChild(detectTop);
    detectBox.appendChild(detectGrid);
    detectBox.appendChild(presetsBar);
    detectBox.appendChild(detectFooter);

    var detectedSpecsData = null;

    function renderDetectedSpecs(specs) {
      if (!specs) {
        detectBox.classList.remove("show");
        detectedSpecsData = null;
        return;
      }
      detectedSpecsData = specs;
      detectGrid.innerHTML = "";

      var specLabels = [
        { key: "hp", label: "Horsepower", fmt: function(v){ return v + " HP"; } },
        { key: "kw", label: "Rated Power", fmt: function(v){ return v; } },
        { key: "voltage", label: "Operating Voltage", fmt: function(v){ return v; } },
        { key: "motor", label: "Motor Type", fmt: function(v){ return v; } },
        { key: "cooling", label: "Cooling Method", fmt: function(v){ return v; } },
        { key: "control", label: "Control System", fmt: function(v){ return v; } },
        { key: "rpm", label: "Rated RPM", fmt: function(v){ return v; } },
        { key: "transom", label: "Transom Height", fmt: function(v){ return v; } },
        { key: "weight", label: "Dry Weight", fmt: function(v){ return v; } },
        { key: "boat_length", label: "Recommended Vessel", fmt: function(v){ return v; } },
        { key: "gear_ratio", label: "Gear Ratio", fmt: function(v){ return v; } },
        { key: "battery", label: "Recommended Marine Battery", wide: true, fmt: function(v){ return v; } }
      ];

      var specCount = 0;
      for (var sli = 0; sli < specLabels.length; sli++) {
        var sl = specLabels[sli];
        if (specs[sl.key]) {
          specCount++;
          var card = createEl("div", { className: "catalog-spec-card" + (sl.wide ? " catalog-spec-card--wide" : "") });
          var kEl = createEl("span", { className: "catalog-spec-k" }, sl.label);
          var vEl = createEl("span", { className: "catalog-spec-v" }, sl.fmt(specs[sl.key]));
          card.appendChild(kEl);
          card.appendChild(vEl);
          detectGrid.appendChild(card);
        }
      }

      if (specs.custom_specs && specs.custom_specs.length > 0) {
        for (var csi = 0; csi < specs.custom_specs.length; csi++) {
          var csItem = specs.custom_specs[csi];
          if (csItem.name && csItem.value) {
            specCount++;
            var cCard = createEl("div", { className: "catalog-spec-card" });
            var ckEl = createEl("span", { className: "catalog-spec-k" }, csItem.name);
            var cvEl = createEl("span", { className: "catalog-spec-v" }, csItem.value);
            cCard.appendChild(ckEl);
            cCard.appendChild(cvEl);
            detectGrid.appendChild(cCard);
          }
        }
      }

      subEl.innerHTML = "Matched <strong>" + escapeHtml(specs.title || ("Seagö " + specs.hp + " HP")) + "</strong> engineering datasheet · <strong>" + specCount + " parameters verified</strong>";
      detectBox.classList.add("show");
    }

    function updateCatalogPreview(url, fileName) {
      if (!url) {
        catalogPreview.style.display = "none";
        catalogPreview.innerHTML = "";
        return;
      }
      var isImg = (url.indexOf("data:image/") === 0) || /\.(png|jpe?g|webp|avif|bmp)$/i.test(url) || (fileName && /\.(png|jpe?g|webp|avif|bmp)$/i.test(fileName));
      catalogPreview.innerHTML = "";
      var wrap = createEl("div", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "10px 14px",
          background: "#F8FAFC",
          border: "1px solid var(--line)",
          borderRadius: "8px",
          marginTop: "10px"
        }
      });

      if (isImg) {
        var thumb = createEl("img", {
          src: url,
          alt: "Catalog Photo",
          style: {
            width: "50px",
            height: "50px",
            objectFit: "cover",
            borderRadius: "6px",
            border: "1px solid var(--line)",
            background: "#FFFFFF"
          }
        });
        wrap.appendChild(thumb);
        var info = createEl("div", { style: { flex: "1", minWidth: "0" } });
        info.appendChild(createEl("div", { style: { fontSize: "13px", fontWeight: "600", color: "var(--navy)" } }, "Catalog Photo Attached"));
        info.appendChild(createEl("div", { style: { fontSize: "11.5px", color: "var(--slate)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, fileName || "Photo Datasheet"));
        wrap.appendChild(info);

        var viewBtn = createEl("a", { href: url, target: "_blank", className: "btn btn-sm btn-secondary", style: { fontSize: "12px" } }, "View Photo");
        wrap.appendChild(viewBtn);
      } else {
        var pdfIcon = createEl("div", {
          style: {
            width: "38px",
            height: "38px",
            borderRadius: "6px",
            background: "#FEE2E2",
            color: "#DC2626",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "700",
            fontSize: "12px"
          }
        }, "PDF");
        wrap.appendChild(pdfIcon);
        var pInfo = createEl("div", { style: { flex: "1", minWidth: "0" } });
        pInfo.appendChild(createEl("div", { style: { fontSize: "13px", fontWeight: "600", color: "var(--navy)" } }, "PDF Datasheet Attached"));
        pInfo.appendChild(createEl("div", { style: { fontSize: "11.5px", color: "var(--slate)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, fileName || url));
        wrap.appendChild(pInfo);

        var openBtn = createEl("a", { href: url, target: "_blank", className: "btn btn-sm btn-secondary", style: { fontSize: "12px" } }, "Open PDF");
        wrap.appendChild(openBtn);
      }

      var removeBtn = createEl("button", {
        type: "button",
        className: "btn btn-sm btn-secondary",
        style: { color: "var(--danger)", fontSize: "12px" }
      }, "Remove");
      removeBtn.addEventListener("click", function(){
        inpCatalog.value = "";
        catalogPreview.style.display = "none";
        catalogPreview.innerHTML = "";
        detectBox.classList.remove("show");
        isDirty = true;
      });
      wrap.appendChild(removeBtn);

      catalogPreview.appendChild(wrap);
      catalogPreview.style.display = "block";
    }

    function checkCatalogDetection(sourceStr, fileObj) {
      if (!fileObj && !sourceStr) return;

      var fName = fileObj ? fileObj.name : sourceStr;
      var isImg = (fileObj && fileObj.type && fileObj.type.indexOf("image/") === 0) || /\.(png|jpe?g|webp|avif|bmp)$/i.test(fName);
      var isPdf = (fileObj && fileObj.type === "application/pdf") || /\.pdf$/i.test(fName);

      // Check if filename / source string matches any Seagö model or specs
      var specs = detectCatalogSpecs(fName, "");
      if (specs) {
        renderDetectedSpecs(specs);
        showToast("Detected specifications for Seagö " + (specs.hp || "") + " HP!", "info");
      }

      if (fileObj && isPdf) {
        extractPdfTextSnippet(fileObj, function(err, textSnippet){
          var pdfSpecs = detectCatalogSpecs(fName, textSnippet);
          if (pdfSpecs) {
            renderDetectedSpecs(pdfSpecs);
            showToast("Parsed specifications from PDF datasheet!", "info");
          }
        });
      }

      if (fileObj && isImg) {
        // Run OCR on photo
        subEl.innerHTML = '<span class="catalog-detect-pulse" style="display:inline-block; vertical-align:middle; margin-right:6px;"></span> Scanning photo datasheet for specifications…';
        detectBox.classList.add("show");

        runImageOcr(fileObj, function(err, ocrText){
          if (!err && ocrText) {
            var ocrSpecs = detectCatalogSpecs(fName + " " + ocrText, ocrText);
            if (ocrSpecs) {
              renderDetectedSpecs(ocrSpecs);
              showToast("Specifications detected from catalog photo!", "success");
            } else if (!specs) {
              subEl.innerHTML = "Photo scanned. Tap a quick model preset below to auto-fill specifications.";
            }
          } else {
            if (!specs) {
              subEl.innerHTML = "Photo uploaded. Tap a quick model preset below to auto-fill specifications.";
            }
          }
        });
      }
    }

    uploadPdfBtn.addEventListener("click", function(){ filePdfInput.click(); });
    filePdfInput.addEventListener("change", function(){
      if (filePdfInput.files && filePdfInput.files[0]) {
        var pf = filePdfInput.files[0];
        var isImg = pf.type.indexOf("image/") === 0 || /\.(png|jpe?g|webp|avif|bmp)$/i.test(pf.name);
        showToast(isImg ? "Uploading catalog photo…" : "Uploading PDF datasheet…", "info");
        processCatalogFile(pf, function(err, pres){
          if (!err && pres) {
            inpCatalog.value = pres.url;
            isDirty = true;
            updateCatalogPreview(pres.url, pf.name);
            showToast(isImg ? "Catalog photo uploaded" : "PDF uploaded", "success");
            checkCatalogDetection(pf.name, pf);
          } else {
            showToast(err ? err.message : "Upload failed", "error");
          }
        });
      }
    });

    inpCatalog.addEventListener("blur", function(){
      if (inpCatalog.value) {
        updateCatalogPreview(inpCatalog.value, inpCatalog.value);
        if (!detectedSpecsData) {
          checkCatalogDetection(inpCatalog.value, null);
        }
      }
    });

    autoFillBtn.addEventListener("click", function(){
      if (!detectedSpecsData) return;
      var s = detectedSpecsData;
      if (s.hp) inpHp.value = s.hp;
      if (s.title && (!inpTitle.value || isNew)) inpTitle.value = s.title;
      if (s.slug && (!inpSlug.value || isNew)) inpSlug.value = s.slug;
      if (s.kw) inpKw.value = s.kw;
      if (s.voltage) inpVolt.value = s.voltage;
      if (s.battery) inpBat.value = s.battery;
      if (s.motor) inpMotor.value = s.motor;
      if (s.control) inpControl.value = s.control;
      if (s.cooling) inpCooling.value = s.cooling;
      if (s.rpm) inpRpm.value = s.rpm;
      if (s.gear_ratio) inpGear.value = s.gear_ratio;
      if (s.transom) inpTransom.value = s.transom;
      if (s.weight) inpWeight.value = s.weight;
      if (s.boat_length) inpBoatLen.value = s.boat_length;
      if (s.propeller) inpPropeller.value = s.propeller;

      if (s.custom_specs && s.custom_specs.length > 0) {
        for (var csi = 0; csi < s.custom_specs.length; csi++) {
          var cs = s.custom_specs[csi];
          var existingRows = customSpecsContainer.querySelectorAll(".repeatable-item");
          var alreadyExists = false;
          for (var eri = 0; eri < existingRows.length; eri++) {
            var kInp = existingRows[eri].querySelector("input");
            if (kInp && kInp.value.toLowerCase() === cs.name.toLowerCase()) {
              alreadyExists = true;
              break;
            }
          }
          if (!alreadyExists) {
            addCustomSpecRow(cs.name, cs.value);
          }
        }
      }

      isDirty = true;
      showToast("Auto-filled specifications for " + (s.title || (s.hp + " HP motor")) + "!", "success");
    });

    gPdf.appendChild(inpCatalog);
    gPdf.appendChild(filePdfInput);
    gPdf.appendChild(pdfActionsRow);
    gPdf.appendChild(catalogPreview);
    gPdf.appendChild(detectBox);
    s4.appendChild(gPdf);

    // Section 5: Additional Technical Parameters
    var s5 = createEl("div", { className: "form-section" });
    var h5Wrap = createEl("div", { className: "form-section__header" });
    h5Wrap.appendChild(createEl("span", { className: "form-section__badge" }, "5"));
    h5Wrap.appendChild(createEl("h3", { className: "form-section__title" }, "Additional Technical Parameters"));
    s5.appendChild(h5Wrap);
    s5.appendChild(createEl("p", { className: "form-section__desc" }, "Add custom engineering parameters or new datasheet specifications not covered in standard fields (e.g. Ingress Protection, Peak Torque, Warranty)."));

    var customSpecsContainer = createEl("div", { id: "customSpecsContainer" });
    var s5Header = createEl("div", { className: "repeatable-header" });
    s5Header.innerHTML = "<span>Specification Parameter</span><span>Assigned Value</span><span></span>";
    customSpecsContainer.appendChild(s5Header);
    var addParamBtn = createEl("button", { type: "button", className: "btn btn-sm btn-secondary", style: { marginTop: "10px" } }, "+ Add New Parameter");

    function addCustomSpecRow(key, val) {
      var row = createEl("div", { className: "repeatable-item" });
      var kInp = createEl("input", { type: "text", placeholder: "Parameter (e.g. Ingress Protection)", value: key || "" });
      var vInp = createEl("input", { type: "text", placeholder: "Value (e.g. IP67 Submersible)", value: val || "" });
      var del = createEl("button", { type: "button", className: "btn-icon", style: { color: "var(--danger)" }, title: "Remove Parameter" }, "×");
      del.addEventListener("click", function(){
        if (row.parentNode) {
          row.parentNode.removeChild(row);
          isDirty = true;
        }
      });
      row.appendChild(kInp);
      row.appendChild(vInp);
      row.appendChild(del);
      customSpecsContainer.appendChild(row);
      isDirty = true;
    }

    addParamBtn.addEventListener("click", function(){
      addCustomSpecRow("", "");
    });

    s5.appendChild(customSpecsContainer);
    s5.appendChild(addParamBtn);

    // Section 6: Publication Status
    var s6 = createEl("div", { className: "form-section" });
    var chkPub = createEl("div", { className: "form-check" });
    var inpPub = createEl("input", { type: "checkbox", id: "f_pub", checked: true });
    var lblPub = createEl("label", { for: "f_pub" }, "Publish this model on public website catalog");
    chkPub.appendChild(inpPub);
    chkPub.appendChild(lblPub);
    s6.appendChild(chkPub);

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
    form.appendChild(s6);
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

    function updateLivePreviewDrawer() {
      var dBody = document.getElementById("previewDrawerBody");
      if (!dBody) return;
      dBody.innerHTML = "";
      
      var mockCard = createEl("div", { className: "mock-public-card" });
      var cardHeader = createEl("div", { className: "mock-card-header" });
      var hpBadge = createEl("span", { className: "mock-card-hp" }, (inpHp.value ? inpHp.value + " HP" : "3–50 HP") + " Electric Outboard");
      var cardTitle = createEl("h3", { className: "mock-card-title" }, inpTitle.value || "Seagö Outboard Motor");
      var cardCooling = createEl("div", { className: "mock-card-cooling" }, (inpCooling.value || "Water Cooled") + " · " + (inpMotor.value || "PMSM Motor"));
      
      var hLeft = createEl("div");
      hLeft.appendChild(hpBadge);
      hLeft.appendChild(cardTitle);
      hLeft.appendChild(cardCooling);
      cardHeader.appendChild(hLeft);
      mockCard.appendChild(cardHeader);

      var imgWrap = createEl("div", { className: "mock-card-img-wrap" });
      var imgEl = createEl("img", {
        className: "mock-card-img",
        src: currentImageUrl || "assets/photos/Outboard Motors.webp",
        alt: inpTitle.value || "Motor Preview"
      });
      imgWrap.appendChild(imgEl);
      mockCard.appendChild(imgWrap);

      var specsGrid = createEl("div", { className: "mock-specs-grid" });
      var liveSpecs = [
        { k: "Rated Power", v: inpKw.value || "—" },
        { k: "Operating Voltage", v: inpVolt.value || "—" },
        { k: "Rated RPM", v: inpRpm.value || "—" },
        { k: "Dry Weight", v: inpWeight.value || "—" },
        { k: "Transom Height", v: inpTransom.value || "—" },
        { k: "Control Method", v: inpControl.value || "—" }
      ];
      liveSpecs.forEach(function(sp){
        var b = createEl("div", { className: "mock-spec-box" });
        b.appendChild(createEl("div", { className: "mock-spec-lbl" }, sp.k));
        b.appendChild(createEl("div", { className: "mock-spec-val" }, sp.v));
        specsGrid.appendChild(b);
      });
      mockCard.appendChild(specsGrid);

      if (inpBat.value) {
        var batBox = createEl("div", { className: "mock-spec-box", style: { marginBottom: "14px" } });
        batBox.appendChild(createEl("div", { className: "mock-spec-lbl" }, "Recommended Marine Battery"));
        batBox.appendChild(createEl("div", { className: "mock-spec-val" }, inpBat.value));
        mockCard.appendChild(batBox);
      }

      if (inpCatalog.value) {
        var catLink = createEl("a", {
          href: inpCatalog.value,
          target: "_blank",
          className: "btn btn-primary btn-full",
          style: { textAlign: "center", textDecoration: "none", marginTop: "10px" }
        }, "Download Technical Datasheet");
        mockCard.appendChild(catLink);
      }

      dBody.appendChild(mockCard);
    }

    previewBtn.addEventListener("click", function(){
      updateLivePreviewDrawer();
      openPreviewDrawer();
    });

    form.addEventListener("input", function(){
      isDirty = true;
      if (isPreviewDrawerOpen()) {
        updateLivePreviewDrawer();
      }
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

        if (motor.custom_specs && motor.custom_specs.length > 0) {
          for (var ci = 0; ci < motor.custom_specs.length; ci++) {
            var cs = motor.custom_specs[ci];
            addCustomSpecRow(cs.name || cs.key, cs.value);
          }
        } else {
          if (motor.sensor) addCustomSpecRow("Sensor", motor.sensor);
          if (motor.gear_pos) addCustomSpecRow("Gear Position", motor.gear_pos);
          if (motor.display && motor.display !== "—") addCustomSpecRow("Display", motor.display);
          if (motor.notes) addCustomSpecRow("Notes", motor.notes);
        }

        if (motor.catalog_path) {
          updateCatalogPreview(motor.catalog_path, motor.catalog_path);
          checkCatalogDetection(motor.catalog_path, null);
        }

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

        var customSpecs = [];
        var cRows = customSpecsContainer.querySelectorAll(".repeatable-item");
        for (var cri = 0; cri < cRows.length; cri++) {
          var inps = cRows[cri].querySelectorAll("input");
          if (inps.length >= 2) {
            var paramKey = inps[0].value.trim();
            var paramVal = inps[1].value.trim();
            if (paramKey || paramVal) {
              customSpecs.push({ name: paramKey, value: paramVal });
            }
          }
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
        record.custom_specs = customSpecs;
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
    gPhone.appendChild(createEl("label", null, "WhatsApp & Telephone Number"));
    var inpPhone = createEl("input", { type: "text" });
    gPhone.appendChild(inpPhone);

    r1.appendChild(gMail);
    r1.appendChild(gPhone);
    s1.appendChild(r1);

    var gWaTip = createEl("div", { className: "form-group" });
    gWaTip.appendChild(createEl("label", null, "WhatsApp Floating Button Tooltip"));
    var inpWaTip = createEl("input", { type: "text", placeholder: "e.g. Chat with us" });
    gWaTip.appendChild(inpWaTip);
    s1.appendChild(gWaTip);

    var gAddrSales = createEl("div", { className: "form-group" });
    gAddrSales.appendChild(createEl("label", null, "Sales & Registered HQ (Kollam Showroom)"));
    var inpAddrSales = createEl("textarea");
    gAddrSales.appendChild(inpAddrSales);
    s1.appendChild(gAddrSales);

    var gAddrMfg = createEl("div", { className: "form-group" });
    gAddrMfg.appendChild(createEl("label", null, "Manufacturing Facility (Chennai Plant)"));
    var inpAddrMfg = createEl("input", { type: "text" });
    gAddrMfg.appendChild(inpAddrMfg);
    s1.appendChild(gAddrMfg);
    form.appendChild(s1);

    // Social Links
    var s2 = createEl("div", { className: "form-section" });
    s2.appendChild(createEl("h3", { className: "form-section__title" }, "Official Channels & Social Links"));
    var r2 = createEl("div", { className: "form-row" });
    var gFb = createEl("div", { className: "form-group" });
    gFb.appendChild(createEl("label", null, "Facebook URL"));
    var inpFb = createEl("input", { type: "text" });
    gFb.appendChild(inpFb);

    var gInsta = createEl("div", { className: "form-group" });
    gInsta.appendChild(createEl("label", null, "Instagram URL"));
    var inpInsta = createEl("input", { type: "text" });
    gInsta.appendChild(inpInsta);
    r2.appendChild(gFb);
    r2.appendChild(gInsta);
    s2.appendChild(r2);

    var r2b = createEl("div", { className: "form-row" });
    var gX = createEl("div", { className: "form-group" });
    gX.appendChild(createEl("label", null, "X (Twitter) URL"));
    var inpX = createEl("input", { type: "text" });
    gX.appendChild(inpX);

    var gLi = createEl("div", { className: "form-group" });
    gLi.appendChild(createEl("label", null, "LinkedIn URL"));
    var inpLi = createEl("input", { type: "text" });
    gLi.appendChild(inpLi);
    r2b.appendChild(gX);
    r2b.appendChild(gLi);
    s2.appendChild(r2b);
    form.appendChild(s2);

    // Floating Quote Request Modal
    var sModal = createEl("div", { className: "form-section" });
    sModal.appendChild(createEl("h3", { className: "form-section__title" }, "Floating 'Request Quote' Modal Settings"));
    var gQTitle = createEl("div", { className: "form-group" });
    gQTitle.appendChild(createEl("label", null, "Modal Heading"));
    var inpQTitle = createEl("input", { type: "text" });
    gQTitle.appendChild(inpQTitle);
    sModal.appendChild(gQTitle);

    var gQSub = createEl("div", { className: "form-group" });
    gQSub.appendChild(createEl("label", null, "Modal Subtitle / Instructions"));
    var inpQSub = createEl("textarea");
    gQSub.appendChild(inpQSub);
    sModal.appendChild(gQSub);
    form.appendChild(sModal);

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

    // Footer Copyright
    var s5 = createEl("div", { className: "form-section" });
    s5.appendChild(createEl("h3", { className: "form-section__title" }, "Footer & Copyright"));
    var gCopy = createEl("div", { className: "form-group" });
    gCopy.appendChild(createEl("label", null, "Copyright Notice"));
    var inpCopy = createEl("input", { type: "text" });
    gCopy.appendChild(inpCopy);
    s5.appendChild(gCopy);
    form.appendChild(s5);

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
        inpWaTip.value = s.whatsapp_tip || "Chat with us";
        inpAddrSales.value = s.address_sales || "";
        inpAddrMfg.value = s.address_manufacturing || "";
        inpFb.value = s.facebook_url || "";
        inpInsta.value = s.instagram_url || "";
        inpX.value = s.x_url || "";
        inpLi.value = s.linkedin_url || "";
        inpQTitle.value = s.quote_modal_title || "Request a Custom Propulsion Quote";
        inpQSub.value = s.quote_modal_subtitle || "";
        inpFn.value = s.founder_name || "";
        inpFt.value = s.founder_title || "";
        inpCopy.value = s.copyright_text || "© 2026 Seagö. All rights reserved.";

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
        whatsapp_tip: inpWaTip.value.trim(),
        address_sales: inpAddrSales.value.trim(),
        address_manufacturing: inpAddrMfg.value.trim(),
        facebook_url: inpFb.value.trim(),
        instagram_url: inpInsta.value.trim(),
        x_url: inpX.value.trim(),
        linkedin_url: inpLi.value.trim(),
        quote_modal_title: inpQTitle.value.trim(),
        quote_modal_subtitle: inpQSub.value.trim(),
        hero_stats: stats,
        founder_name: inpFn.value.trim(),
        founder_title: inpFt.value.trim(),
        copyright_text: inpCopy.value.trim()
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

  // ================= 13.5 SCREEN: ALL WEBSITE PAGES CMS =================
  function loadPageData(pageId, cb) {
    if (window.SeagoStore && typeof window.SeagoStore.get === "function") {
      window.SeagoStore.get("pages", pageId, function(err, page){
        var seedFallback = null;
        if (window._SEAGO_SEED_DATA && window._SEAGO_SEED_DATA.pages) {
          for (var i = 0; i < window._SEAGO_SEED_DATA.pages.length; i++) {
            if (window._SEAGO_SEED_DATA.pages[i].id === pageId) {
              seedFallback = window._SEAGO_SEED_DATA.pages[i];
              break;
            }
          }
        }
        if (!err && page) {
          if (seedFallback) {
            for (var k in seedFallback) {
              if (seedFallback.hasOwnProperty(k) && (page[k] === undefined || page[k] === null || page[k] === "")) {
                page[k] = seedFallback[k];
              }
            }
          }
          cb(null, page);
        } else {
          cb(null, seedFallback || { id: pageId, title: pageId, updated_at: new Date().toISOString() });
        }
      });
    } else {
      cb(new Error("Storage unavailable"));
    }
  }

  function savePageData(pageRecord, cb) {
    pageRecord.updated_at = new Date().toISOString();
    window.SeagoStore.save("pages", pageRecord, function(err){
      if (!err) {
        isDirty = false;
        showToast("Changes saved to " + (pageRecord.title || "page") + " successfully!", "success");
      } else {
        showToast("Error saving page: " + err.message, "error");
      }
      if (typeof cb === "function") cb(err);
    });
  }

  function createPageHeader(pageTitleText, slugName, onSave) {
    var header = createEl("div", { className: "page-header" });
    var info = createEl("div", { className: "page-header-info" });
    var titleRow = createEl("div", { style: { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" } });
    titleRow.appendChild(createEl("h1", { className: "page-header-title" }, pageTitleText));
    titleRow.appendChild(createEl("span", { className: "nav-slug-badge", style: { fontSize: "12px", padding: "3px 8px" } }, slugName));
    info.appendChild(titleRow);
    info.appendChild(createEl("p", { className: "page-header-sub" }, "Live CMS editor · Content updates reflect directly on the public website."));
    header.appendChild(info);

    var headerActions = createEl("div", { className: "page-header-actions" });
    var backBtn = createEl("a", { className: "btn btn-secondary", href: "#/dashboard" });
    backBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:5px; vertical-align:middle;"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg><span>CMS Hub</span>';
    var liveBtn = createEl("a", { className: "btn btn-outline-topbar", href: slugName, target: "_blank", rel: "noopener" });
    liveBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:5px; vertical-align:middle;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg><span>View Live Page</span>';
    var saveBtn = createEl("button", { type: "button", className: "btn btn-primary" });
    saveBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px; vertical-align:middle;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg><span>Save Page (Ctrl+S)</span>';
    if (typeof onSave === "function") {
      saveBtn.addEventListener("click", onSave);
    }
    headerActions.appendChild(backBtn);
    headerActions.appendChild(liveBtn);
    headerActions.appendChild(saveBtn);
    header.appendChild(headerActions);
    return header;
  }

  // Universal Media Input (URL + Asset Picker + Direct File Upload)
  function createMediaField(labelText, initialValue, isVideo) {
    var group = createEl("div", { className: "form-group" });
    group.appendChild(createEl("label", null, labelText));

    var row = createEl("div", { style: { display: "flex", gap: "8px", alignItems: "center" } });
    var inp = createEl("input", { type: "text", value: initialValue || "", style: { flex: "1" } });

    var pickBtn = createEl("button", {
      type: "button",
      className: "btn btn-secondary btn-sm",
      style: { whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "4px" }
    });
    pickBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span>Select Asset</span>';
    pickBtn.addEventListener("click", function(){
      openAssetPicker(isVideo ? null : "image", function(selected){
        if (selected && selected.url) {
          inp.value = selected.url;
          inp.dispatchEvent(new Event("input", { bubbles: true }));
          showToast("Asset selected: " + (selected.name || selected.url), "info");
        }
      });
    });

    var fileInp = createEl("input", { type: "file", accept: isVideo ? "video/*" : "image/*", style: { display: "none" } });
    var uploadBtn = createEl("button", {
      type: "button",
      className: "btn btn-secondary btn-sm",
      style: { whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "4px" }
    });
    uploadBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg><span>Upload</span>';
    uploadBtn.addEventListener("click", function(){ fileInp.click(); });
    fileInp.addEventListener("change", function(){
      if (fileInp.files && fileInp.files[0]) {
        var f = fileInp.files[0];
        if (f.type.match(/^image\//)) {
          processImageFile(f, function(err, res){
            if (!err && res) {
              inp.value = res.url;
              inp.dispatchEvent(new Event("input", { bubbles: true }));
              showToast("Uploaded & attached image!", "success");
            } else {
              showToast(err ? err.message : "Upload failed", "error");
            }
          });
        } else {
          window.SeagoStore.uploadFile(isVideo ? "video" : "image", f, function(err, res){
            if (!err && res) {
              inp.value = res.url;
              inp.dispatchEvent(new Event("input", { bubbles: true }));
              showToast("Uploaded & attached media!", "success");
            }
          });
        }
      }
    });

    row.appendChild(inp);
    row.appendChild(pickBtn);
    row.appendChild(uploadBtn);
    row.appendChild(fileInp);
    group.appendChild(row);

    return { group: group, input: inp };
  }

  // 1. HOME PAGE CMS (index.html)
  function renderHomePageEditor() {
    pageRoot.innerHTML = "";
    loadPageData("home", function(err, page){
      if (!page) return;

      var form = createEl("form", { novalidate: "novalidate" });
      var header = createPageHeader("Home Page CMS", "index.html", function(){
        if (typeof form.requestSubmit === "function") {
          form.requestSubmit();
        } else {
          form.dispatchEvent(new Event("submit", { cancelable: true }));
        }
      });
      pageRoot.appendChild(header);

      var formCard = createEl("div", { className: "form-card" });

      // Section 1: Hero Banner & Video
      var s1 = createEl("div", { className: "cms-section-card" });
      var h1 = createEl("div", { className: "cms-section-header" });
      var h1Left = createEl("div", { className: "cms-section-title-wrap" });
      h1Left.appendChild(createEl("span", { className: "cms-section-number" }, "1"));
      h1Left.appendChild(createEl("h3", { className: "cms-section-title" }, "Hero Announcement & Visuals"));
      h1.appendChild(h1Left);
      s1.appendChild(h1);

      var gBadge = createEl("div", { className: "form-group" });
      gBadge.appendChild(createEl("label", null, "Top Announcement Badge"));
      var inpBadge = createEl("input", { type: "text", value: page.badge || "" });
      gBadge.appendChild(inpBadge);
      s1.appendChild(gBadge);

      var gHead = createEl("div", { className: "form-group" });
      gHead.appendChild(createEl("label", null, "Main Headline"));
      var inpHead = createEl("input", { type: "text", value: page.headline || "" });
      gHead.appendChild(inpHead);
      s1.appendChild(gHead);

      var gSub = createEl("div", { className: "form-group" });
      gSub.appendChild(createEl("label", null, "Hero Subheadline"));
      var inpSub = createEl("textarea", { rows: "3" }, page.subheadline || "");
      gSub.appendChild(inpSub);
      s1.appendChild(gSub);

      var rCta = createEl("div", { className: "form-row" });
      var gCta1 = createEl("div", { className: "form-group" });
      gCta1.appendChild(createEl("label", null, "Primary Button Text"));
      var inpCta1 = createEl("input", { type: "text", value: page.cta_primary || "Request a Quote" });
      gCta1.appendChild(inpCta1);
      var gCta2 = createEl("div", { className: "form-group" });
      gCta2.appendChild(createEl("label", null, "Secondary Button Text"));
      var inpCta2 = createEl("input", { type: "text", value: page.cta_secondary || "Explore Products" });
      gCta2.appendChild(inpCta2);
      rCta.appendChild(gCta1);
      rCta.appendChild(gCta2);
      s1.appendChild(rCta);

      var mediaVid = createMediaField("Hero Background Video (MP4)", page.hero_video_url || "assets/photos/ai-artwork-videoacc3e3fb-0a4f-467d-bd82-8fc7c55db4ec.mp4", true);
      s1.appendChild(mediaVid.group);

      var rFloat = createEl("div", { className: "form-row" });
      var gFloatT = createEl("div", { className: "form-group" });
      gFloatT.appendChild(createEl("label", null, "Hero Float Badge Title"));
      var inpFloatT = createEl("input", { type: "text", value: page.float_badge_title || "100% Electric" });
      gFloatT.appendChild(inpFloatT);
      var gFloatS = createEl("div", { className: "form-group" });
      gFloatS.appendChild(createEl("label", null, "Hero Float Badge Subtitle"));
      var inpFloatS = createEl("input", { type: "text", value: page.float_badge_sub || "Zero local emissions" });
      gFloatS.appendChild(inpFloatS);
      rFloat.appendChild(gFloatT);
      rFloat.appendChild(gFloatS);
      s1.appendChild(rFloat);

      form.appendChild(s1);

      // Section 2: Headline Metrics
      var s2 = createEl("div", { className: "cms-section-card" });
      var h2 = createEl("div", { className: "cms-section-header" });
      var h2Left = createEl("div", { className: "cms-section-title-wrap" });
      h2Left.appendChild(createEl("span", { className: "cms-section-number" }, "2"));
      h2Left.appendChild(createEl("h3", { className: "cms-section-title" }, "Headline Metrics (Hero Counter Strip)"));
      h2.appendChild(h2Left);
      s2.appendChild(h2);
      s2.appendChild(createEl("p", { className: "cms-section-desc" }, "The 3 key statistics displayed directly inside the homepage hero section."));

      var rS1 = createEl("div", { className: "form-row-3" });
      var gS1Val = createEl("div", { className: "form-group" });
      gS1Val.appendChild(createEl("label", null, "Stat 1 Value"));
      var inpS1Val = createEl("input", { type: "text", value: page.stat_1_val || "5" });
      gS1Val.appendChild(inpS1Val);
      var gS1Lbl = createEl("div", { className: "form-group" });
      gS1Lbl.appendChild(createEl("label", null, "Stat 1 Label"));
      var inpS1Lbl = createEl("input", { type: "text", value: page.stat_1_lbl || "States Operating" });
      gS1Lbl.appendChild(inpS1Lbl);
      rS1.appendChild(gS1Val);
      rS1.appendChild(gS1Lbl);

      var gS2Val = createEl("div", { className: "form-group" });
      gS2Val.appendChild(createEl("label", null, "Stat 2 Value"));
      var inpS2Val = createEl("input", { type: "text", value: page.stat_2_val || "50 HP" });
      gS2Val.appendChild(inpS2Val);
      var gS2Lbl = createEl("div", { className: "form-group" });
      gS2Lbl.appendChild(createEl("label", null, "Stat 2 Label"));
      var inpS2Lbl = createEl("input", { type: "text", value: page.stat_2_lbl || "Max Outboard" });
      gS2Lbl.appendChild(inpS2Lbl);
      rS1.appendChild(gS2Val);
      rS1.appendChild(gS2Lbl);

      var gS3Val = createEl("div", { className: "form-group" });
      gS3Val.appendChild(createEl("label", null, "Stat 3 Value"));
      var inpS3Val = createEl("input", { type: "text", value: page.stat_3_val || "2+ Yrs" });
      gS3Val.appendChild(inpS3Val);
      var gS3Lbl = createEl("div", { className: "form-group" });
      gS3Lbl.appendChild(createEl("label", null, "Stat 3 Label"));
      var inpS3Lbl = createEl("input", { type: "text", value: page.stat_3_lbl || "Field-Proven" });
      gS3Lbl.appendChild(inpS3Lbl);
      rS1.appendChild(gS3Val);
      rS1.appendChild(gS3Lbl);

      s2.appendChild(rS1);
      form.appendChild(s2);

      // Section 3: Trust & Deployment Partners
      var s3 = createEl("div", { className: "cms-section-card" });
      var h3 = createEl("div", { className: "cms-section-header" });
      var h3Left = createEl("div", { className: "cms-section-title-wrap" });
      h3Left.appendChild(createEl("span", { className: "cms-section-number" }, "3"));
      h3Left.appendChild(createEl("h3", { className: "cms-section-title" }, "Trust Marquee & Deployment Partners"));
      h3.appendChild(h3Left);
      s3.appendChild(h3);

      var gTrustHead = createEl("div", { className: "form-group" });
      gTrustHead.appendChild(createEl("label", null, "Trust Marquee Heading"));
      var inpTrustHead = createEl("input", { type: "text", value: page.trust_heading || "Deployed & Trusted Across" });
      gTrustHead.appendChild(inpTrustHead);
      s3.appendChild(gTrustHead);

      var gTrustList = createEl("div", { className: "form-group" });
      gTrustList.appendChild(createEl("label", null, "Partner Organizations & States (separated by bullet ·)"));
      var inpTrustList = createEl("input", { type: "text", value: page.trust_partners || "" });
      gTrustList.appendChild(inpTrustList);
      s3.appendChild(gTrustList);
      form.appendChild(s3);

      // Section 4: Our Range Teaser Cards
      var s4 = createEl("div", { className: "cms-section-card" });
      var h4 = createEl("div", { className: "cms-section-header" });
      var h4Left = createEl("div", { className: "cms-section-title-wrap" });
      h4Left.appendChild(createEl("span", { className: "cms-section-number" }, "4"));
      h4Left.appendChild(createEl("h3", { className: "cms-section-title" }, "Product Range Overview Cards"));
      h4.appendChild(h4Left);
      s4.appendChild(h4);

      var rRangeHead = createEl("div", { className: "form-row" });
      var gREyebrow = createEl("div", { className: "form-group" });
      gREyebrow.appendChild(createEl("label", null, "Range Eyebrow"));
      var inpREyebrow = createEl("input", { type: "text", value: page.range_head_eyebrow || "Our Range" });
      gREyebrow.appendChild(inpREyebrow);
      var gRTitle = createEl("div", { className: "form-group" });
      gRTitle.appendChild(createEl("label", null, "Range Title"));
      var inpRTitle = createEl("input", { type: "text", value: page.range_head_title || "Everything you need to electrify your fleet" });
      gRTitle.appendChild(inpRTitle);
      rRangeHead.appendChild(gREyebrow);
      rRangeHead.appendChild(gRTitle);
      s4.appendChild(rRangeHead);

      var gRDesc = createEl("div", { className: "form-group" });
      gRDesc.appendChild(createEl("label", null, "Range Subtitle"));
      var inpRDesc = createEl("textarea", { rows: "2" }, page.range_head_desc || "");
      gRDesc.appendChild(inpRDesc);
      s4.appendChild(gRDesc);

      // Range Card 1
      var rc1Box = createEl("div", { style: { background: "#F8FAFC", border: "1px solid var(--line)", borderRadius: "6px", padding: "12px", marginBottom: "12px" } });
      rc1Box.appendChild(createEl("h4", { style: { margin: "0 0 10px", fontSize: "13px", color: "var(--navy)" } }, "Range Card 01: Outboard Motors"));
      var rc1Title = createEl("input", { type: "text", value: page.range_card1_title || "Outboard Motors", style: { marginBottom: "8px" } });
      rc1Box.appendChild(rc1Title);
      var rc1Desc = createEl("textarea", { rows: "2", style: { marginBottom: "8px" } }, page.range_card1_desc || "");
      rc1Box.appendChild(rc1Desc);
      var rc1Img = createMediaField("Card 01 Photo", page.range_card1_img || "assets/photos/Outboard Motors.webp", false);
      rc1Box.appendChild(rc1Img.group);
      s4.appendChild(rc1Box);

      // Range Card 2
      var rc2Box = createEl("div", { style: { background: "#F8FAFC", border: "1px solid var(--line)", borderRadius: "6px", padding: "12px", marginBottom: "12px" } });
      rc2Box.appendChild(createEl("h4", { style: { margin: "0 0 10px", fontSize: "13px", color: "var(--navy)" } }, "Range Card 02: Battery Packs"));
      var rc2Title = createEl("input", { type: "text", value: page.range_card2_title || "Battery Packs", style: { marginBottom: "8px" } });
      rc2Box.appendChild(rc2Title);
      var rc2Desc = createEl("textarea", { rows: "2", style: { marginBottom: "8px" } }, page.range_card2_desc || "");
      rc2Box.appendChild(rc2Desc);
      var rc2Img = createMediaField("Card 02 Photo", page.range_card2_img || "assets/photos/Battery Box.webp", false);
      rc2Box.appendChild(rc2Img.group);
      s4.appendChild(rc2Box);

      // Range Card 3
      var rc3Box = createEl("div", { style: { background: "#F8FAFC", border: "1px solid var(--line)", borderRadius: "6px", padding: "12px" } });
      rc3Box.appendChild(createEl("h4", { style: { margin: "0 0 10px", fontSize: "13px", color: "var(--navy)" } }, "Range Card 03: Electric & Solar Boats"));
      var rc3Title = createEl("input", { type: "text", value: page.range_card3_title || "Electric & Solar Boats", style: { marginBottom: "8px" } });
      rc3Box.appendChild(rc3Title);
      var rc3Desc = createEl("textarea", { rows: "2", style: { marginBottom: "8px" } }, page.range_card3_desc || "");
      rc3Box.appendChild(rc3Desc);
      var rc3Img = createMediaField("Card 03 Photo", page.range_card3_img || "assets/photos/seago-electric-boat.webp", false);
      rc3Box.appendChild(rc3Img.group);
      s4.appendChild(rc3Box);

      form.appendChild(s4);

      // Section 5: Field Case Studies Teasers
      var s5 = createEl("div", { className: "cms-section-card" });
      var h5 = createEl("div", { className: "cms-section-header" });
      var h5Left = createEl("div", { className: "cms-section-title-wrap" });
      h5Left.appendChild(createEl("span", { className: "cms-section-number" }, "5"));
      h5Left.appendChild(createEl("h3", { className: "cms-section-title" }, "Field Case Studies Teaser Section"));
      h5.appendChild(h5Left);
      s5.appendChild(h5);

      var rCasesHead = createEl("div", { className: "form-row" });
      var gCEyebrow = createEl("div", { className: "form-group" });
      gCEyebrow.appendChild(createEl("label", null, "Case Studies Eyebrow"));
      var inpCEyebrow = createEl("input", { type: "text", value: page.cases_head_eyebrow || "Proven in the Field" });
      gCEyebrow.appendChild(inpCEyebrow);
      var gCTitle = createEl("div", { className: "form-group" });
      gCTitle.appendChild(createEl("label", null, "Case Studies Heading"));
      var inpCTitle = createEl("input", { type: "text", value: page.cases_head_title || "Real deployments, real waterways" });
      gCTitle.appendChild(inpCTitle);
      rCasesHead.appendChild(gCEyebrow);
      rCasesHead.appendChild(gCTitle);
      s5.appendChild(rCasesHead);

      var gCDesc = createEl("div", { className: "form-group" });
      gCDesc.appendChild(createEl("label", null, "Case Studies Section Subtitle"));
      var inpCDesc = createEl("textarea", { rows: "2" }, page.cases_head_desc || "");
      gCDesc.appendChild(inpCDesc);
      s5.appendChild(gCDesc);

      // Case Teaser 1
      var ct1Box = createEl("div", { style: { background: "#F8FAFC", border: "1px solid var(--line)", borderRadius: "6px", padding: "12px", marginBottom: "12px" } });
      ct1Box.appendChild(createEl("h4", { style: { margin: "0 0 10px", fontSize: "13px", color: "var(--navy)" } }, "Teaser 01: Fishing Fleets"));
      var rCt1 = createEl("div", { className: "form-row" });
      var inpCt1Tag = createEl("input", { type: "text", value: page.case_teaser1_tag || "Maharashtra", placeholder: "Tag / State" });
      var inpCt1Title = createEl("input", { type: "text", value: page.case_teaser1_title || "Fishing Fleets", placeholder: "Title" });
      rCt1.appendChild(inpCt1Tag);
      rCt1.appendChild(inpCt1Title);
      ct1Box.appendChild(rCt1);
      var inpCt1Desc = createEl("textarea", { rows: "2", style: { marginBottom: "8px" } }, page.case_teaser1_desc || "");
      ct1Box.appendChild(inpCt1Desc);
      var ct1Img = createMediaField("Case 01 Photo", page.case_teaser1_img || "assets/photos/vikalpika.webp", false);
      ct1Box.appendChild(ct1Img.group);
      s5.appendChild(ct1Box);

      // Case Teaser 2
      var ct2Box = createEl("div", { style: { background: "#F8FAFC", border: "1px solid var(--line)", borderRadius: "6px", padding: "12px", marginBottom: "12px" } });
      ct2Box.appendChild(createEl("h4", { style: { margin: "0 0 10px", fontSize: "13px", color: "var(--navy)" } }, "Teaser 02: Tourism Boats"));
      var rCt2 = createEl("div", { className: "form-row" });
      var inpCt2Tag = createEl("input", { type: "text", value: page.case_teaser2_tag || "Karnataka", placeholder: "Tag / State" });
      var inpCt2Title = createEl("input", { type: "text", value: page.case_teaser2_title || "Tourism Boats", placeholder: "Title" });
      rCt2.appendChild(inpCt2Tag);
      rCt2.appendChild(inpCt2Title);
      ct2Box.appendChild(rCt2);
      var inpCt2Desc = createEl("textarea", { rows: "2", style: { marginBottom: "8px" } }, page.case_teaser2_desc || "");
      ct2Box.appendChild(inpCt2Desc);
      var ct2Img = createMediaField("Case 02 Photo", page.case_teaser2_img || "assets/photos/seago-tourism-boat.webp", false);
      ct2Box.appendChild(ct2Img.group);
      s5.appendChild(ct2Box);

      // Case Teaser 3
      var ct3Box = createEl("div", { style: { background: "#F8FAFC", border: "1px solid var(--line)", borderRadius: "6px", padding: "12px" } });
      ct3Box.appendChild(createEl("h4", { style: { margin: "0 0 10px", fontSize: "13px", color: "var(--navy)" } }, "Teaser 03: Public Transport System"));
      var rCt3 = createEl("div", { className: "form-row" });
      var inpCt3Tag = createEl("input", { type: "text", value: page.case_teaser3_tag || "Kerala", placeholder: "Tag / State" });
      var inpCt3Title = createEl("input", { type: "text", value: page.case_teaser3_title || "Public Transport System", placeholder: "Title" });
      rCt3.appendChild(inpCt3Tag);
      rCt3.appendChild(inpCt3Title);
      ct3Box.appendChild(rCt3);
      var inpCt3Desc = createEl("textarea", { rows: "2", style: { marginBottom: "8px" } }, page.case_teaser3_desc || "");
      ct3Box.appendChild(inpCt3Desc);
      var ct3Img = createMediaField("Case 03 Photo", page.case_teaser3_img || "assets/photos/Publictransport.webp", false);
      ct3Box.appendChild(ct3Img.group);
      s5.appendChild(ct3Box);

      form.appendChild(s5);

      // Section 6: Why Seagö Pillars
      var s6 = createEl("div", { className: "cms-section-card" });
      var h6 = createEl("div", { className: "cms-section-header" });
      var h6Left = createEl("div", { className: "cms-section-title-wrap" });
      h6Left.appendChild(createEl("span", { className: "cms-section-number" }, "6"));
      h6Left.appendChild(createEl("h3", { className: "cms-section-title" }, "Why Seagö (Editorial Split & 3 Pillars)"));
      h6.appendChild(h6Left);
      s6.appendChild(h6);

      var gWhyHead = createEl("div", { className: "form-group" });
      gWhyHead.appendChild(createEl("label", null, "Section Headline"));
      var inpWhyHead = createEl("input", { type: "text", value: page.why_heading || "Built for Indian waterways, backed by real deployments" });
      gWhyHead.appendChild(inpWhyHead);
      s6.appendChild(gWhyHead);

      var gWhyBody = createEl("div", { className: "form-group" });
      gWhyBody.appendChild(createEl("label", null, "Story & Engineering Overview Paragraph"));
      var inpWhyBody = createEl("textarea", { rows: "3" }, page.why_body || "");
      gWhyBody.appendChild(inpWhyBody);
      s6.appendChild(gWhyBody);

      // Pillar 1
      var p1Box = createEl("div", { style: { background: "#F8FAFC", border: "1px solid var(--line)", borderRadius: "6px", padding: "10px", marginBottom: "8px" } });
      p1Box.appendChild(createEl("label", { style: { fontWeight: "600", fontSize: "12px", color: "var(--navy)" } }, "Pillar 01"));
      var inpP1Title = createEl("input", { type: "text", value: page.why_pillar1_title || "Zero-Emission Propulsion", style: { marginBottom: "6px" } });
      p1Box.appendChild(inpP1Title);
      var inpP1Desc = createEl("textarea", { rows: "2" }, page.why_pillar1_desc || "");
      p1Box.appendChild(inpP1Desc);
      s6.appendChild(p1Box);

      // Pillar 2
      var p2Box = createEl("div", { style: { background: "#F8FAFC", border: "1px solid var(--line)", borderRadius: "6px", padding: "10px", marginBottom: "8px" } });
      p2Box.appendChild(createEl("label", { style: { fontWeight: "600", fontSize: "12px", color: "var(--navy)" } }, "Pillar 02"));
      var inpP2Title = createEl("input", { type: "text", value: page.why_pillar2_title || "Manufactured in Chennai", style: { marginBottom: "6px" } });
      p2Box.appendChild(inpP2Title);
      var inpP2Desc = createEl("textarea", { rows: "2" }, page.why_pillar2_desc || "");
      p2Box.appendChild(inpP2Desc);
      s6.appendChild(p2Box);

      // Pillar 3
      var p3Box = createEl("div", { style: { background: "#F8FAFC", border: "1px solid var(--line)", borderRadius: "6px", padding: "10px" } });
      p3Box.appendChild(createEl("label", { style: { fontWeight: "600", fontSize: "12px", color: "var(--navy)" } }, "Pillar 03"));
      var inpP3Title = createEl("input", { type: "text", value: page.why_pillar3_title || "Dedicated Service & Spares", style: { marginBottom: "6px" } });
      p3Box.appendChild(inpP3Title);
      var inpP3Desc = createEl("textarea", { rows: "2" }, page.why_pillar3_desc || "");
      p3Box.appendChild(inpP3Desc);
      s6.appendChild(p3Box);

      form.appendChild(s6);

      // Section 7: Bottom CTA Banner
      var s7 = createEl("div", { className: "cms-section-card" });
      var h7 = createEl("div", { className: "cms-section-header" });
      var h7Left = createEl("div", { className: "cms-section-title-wrap" });
      h7Left.appendChild(createEl("span", { className: "cms-section-number" }, "7"));
      h7Left.appendChild(createEl("h3", { className: "cms-section-title" }, "Bottom Call-To-Action Banner"));
      h7.appendChild(h7Left);
      s7.appendChild(h7);

      var gCtaTitle = createEl("div", { className: "form-group" });
      gCtaTitle.appendChild(createEl("label", null, "Banner Title"));
      var inpCtaTitle = createEl("input", { type: "text", value: page.cta_banner_title || "Ready to electrify your fleet?" });
      gCtaTitle.appendChild(inpCtaTitle);
      s7.appendChild(gCtaTitle);

      var gCtaText = createEl("div", { className: "form-group" });
      gCtaText.appendChild(createEl("label", null, "Banner Subtext"));
      var inpCtaText = createEl("textarea", { rows: "2" }, page.cta_banner_text || "");
      gCtaText.appendChild(inpCtaText);
      s7.appendChild(gCtaText);

      var rCtaBtns = createEl("div", { className: "form-row" });
      var gCtaBtn1 = createEl("div", { className: "form-group" });
      gCtaBtn1.appendChild(createEl("label", null, "Primary Button Label"));
      var inpCtaBtn = createEl("input", { type: "text", value: page.cta_banner_btn || "Request a Quote" });
      gCtaBtn1.appendChild(inpCtaBtn);
      var gCtaBtn2 = createEl("div", { className: "form-group" });
      gCtaBtn2.appendChild(createEl("label", null, "Secondary Button Label"));
      var inpCtaBtnSec = createEl("input", { type: "text", value: page.cta_banner_secondary_btn || "Explore Our Range" });
      gCtaBtn2.appendChild(inpCtaBtnSec);
      rCtaBtns.appendChild(gCtaBtn1);
      rCtaBtns.appendChild(gCtaBtn2);
      s7.appendChild(rCtaBtns);
      form.appendChild(s7);

      // Section 8: SEO
      var s8 = createEl("div", { className: "cms-section-card" });
      var h8 = createEl("div", { className: "cms-section-header" });
      var h8Left = createEl("div", { className: "cms-section-title-wrap" });
      h8Left.appendChild(createEl("span", { className: "cms-section-number" }, "8"));
      h8Left.appendChild(createEl("h3", { className: "cms-section-title" }, "SEO Search Metadata"));
      h8.appendChild(h8Left);
      s8.appendChild(h8);

      var gMeta = createEl("div", { className: "form-group" });
      gMeta.appendChild(createEl("label", null, "Google Search Meta Description"));
      var inpMeta = createEl("textarea", { rows: "2" }, page.meta_desc || "");
      gMeta.appendChild(inpMeta);
      s8.appendChild(gMeta);
      form.appendChild(s8);

      // Submit Bar
      var actions = createEl("div", { className: "form-actions" });
      var cancel = createEl("a", { className: "btn btn-secondary", href: "#/dashboard" }, "Cancel");
      var save = createEl("button", { type: "submit", className: "btn btn-primary" }, "Save Home Page Changes");
      actions.appendChild(cancel);
      actions.appendChild(save);
      form.appendChild(actions);

      form.addEventListener("input", function(){ isDirty = true; });

      form.addEventListener("submit", function(e){
        e.preventDefault();
        page.badge = inpBadge.value.trim();
        page.headline = inpHead.value.trim();
        page.subheadline = inpSub.value.trim();
        page.cta_primary = inpCta1.value.trim();
        page.cta_secondary = inpCta2.value.trim();
        page.hero_video_url = mediaVid.input.value.trim();
        page.float_badge_title = inpFloatT.value.trim();
        page.float_badge_sub = inpFloatS.value.trim();
        page.stat_1_val = inpS1Val.value.trim();
        page.stat_1_lbl = inpS1Lbl.value.trim();
        page.stat_2_val = inpS2Val.value.trim();
        page.stat_2_lbl = inpS2Lbl.value.trim();
        page.stat_3_val = inpS3Val.value.trim();
        page.stat_3_lbl = inpS3Lbl.value.trim();
        page.trust_heading = inpTrustHead.value.trim();
        page.trust_partners = inpTrustList.value.trim();
        page.range_head_eyebrow = inpREyebrow.value.trim();
        page.range_head_title = inpRTitle.value.trim();
        page.range_head_desc = inpRDesc.value.trim();
        page.range_card1_title = rc1Title.value.trim();
        page.range_card1_desc = rc1Desc.value.trim();
        page.range_card1_img = rc1Img.input.value.trim();
        page.range_card2_title = rc2Title.value.trim();
        page.range_card2_desc = rc2Desc.value.trim();
        page.range_card2_img = rc2Img.input.value.trim();
        page.range_card3_title = rc3Title.value.trim();
        page.range_card3_desc = rc3Desc.value.trim();
        page.range_card3_img = rc3Img.input.value.trim();
        page.cases_head_eyebrow = inpCEyebrow.value.trim();
        page.cases_head_title = inpCTitle.value.trim();
        page.cases_head_desc = inpCDesc.value.trim();
        page.case_teaser1_tag = inpCt1Tag.value.trim();
        page.case_teaser1_title = inpCt1Title.value.trim();
        page.case_teaser1_desc = inpCt1Desc.value.trim();
        page.case_teaser1_img = ct1Img.input.value.trim();
        page.case_teaser2_tag = inpCt2Tag.value.trim();
        page.case_teaser2_title = inpCt2Title.value.trim();
        page.case_teaser2_desc = inpCt2Desc.value.trim();
        page.case_teaser2_img = ct2Img.input.value.trim();
        page.case_teaser3_tag = inpCt3Tag.value.trim();
        page.case_teaser3_title = inpCt3Title.value.trim();
        page.case_teaser3_desc = inpCt3Desc.value.trim();
        page.case_teaser3_img = ct3Img.input.value.trim();
        page.why_heading = inpWhyHead.value.trim();
        page.why_body = inpWhyBody.value.trim();
        page.why_pillar1_title = inpP1Title.value.trim();
        page.why_pillar1_desc = inpP1Desc.value.trim();
        page.why_pillar2_title = inpP2Title.value.trim();
        page.why_pillar2_desc = inpP2Desc.value.trim();
        page.why_pillar3_title = inpP3Title.value.trim();
        page.why_pillar3_desc = inpP3Desc.value.trim();
        page.cta_banner_title = inpCtaTitle.value.trim();
        page.cta_banner_text = inpCtaText.value.trim();
        page.cta_banner_btn = inpCtaBtn.value.trim();
        page.cta_banner_secondary_btn = inpCtaBtnSec.value.trim();
        page.meta_desc = inpMeta.value.trim();
        savePageData(page);
      });

      formCard.appendChild(form);
      pageRoot.appendChild(formCard);
    });
  }

  // Modal: Create or Edit a Product Section
  function openSectionEditModal(sec, onSave) {
    var isNew = !sec;
    var item = sec ? Object.assign({}, sec) : {
      id: "sec-custom-" + Date.now(),
      title: "",
      badge: "NEW RANGE",
      intro: "",
      layout: "selector",
      unit: "Model",
      image_url: "assets/photos/Outboard Motors.webp",
      reverse: false,
      published: true,
      products: []
    };

    var wrap = createEl("div", { style: { display: "flex", flexDirection: "column", gap: "14px" } });

    var gTitle = createEl("div", { className: "form-group" });
    gTitle.appendChild(createEl("label", null, "Section Title *"));
    var inpTitle = createEl("input", { type: "text", value: item.title || "", placeholder: "e.g. Inboard Motors, Pod Drives, Accessories" });
    gTitle.appendChild(inpTitle);
    wrap.appendChild(gTitle);

    var r1 = createEl("div", { className: "form-row" });
    var gBadge = createEl("div", { className: "form-group" });
    gBadge.appendChild(createEl("label", null, "Category Badge"));
    var inpBadge = createEl("input", { type: "text", value: item.badge || "", placeholder: "e.g. 10–100 kW · Commercial" });
    gBadge.appendChild(inpBadge);
    r1.appendChild(gBadge);

    var gLayout = createEl("div", { className: "form-group" });
    gLayout.appendChild(createEl("label", null, "Display Layout Type"));
    var selLayout = createEl("select");
    var optSel = createEl("option", { value: "selector" }, "Interactive Selector (Tabs with Specs & Photos)");
    var optGrid = createEl("option", { value: "grid" }, "Card Grid (Multi-product card catalog)");
    if (item.layout === "grid") optGrid.selected = true; else optSel.selected = true;
    selLayout.appendChild(optSel);
    selLayout.appendChild(optGrid);
    gLayout.appendChild(selLayout);
    r1.appendChild(gLayout);
    wrap.appendChild(r1);

    var r2 = createEl("div", { className: "form-row" });
    var gUnit = createEl("div", { className: "form-group" });
    gUnit.appendChild(createEl("label", null, "Selector Unit (for Tab buttons)"));
    var inpUnit = createEl("input", { type: "text", value: item.unit || "HP", placeholder: "e.g. HP, Seats, kW, Pack" });
    gUnit.appendChild(inpUnit);
    r2.appendChild(gUnit);

    var gRev = createEl("div", { className: "form-group", style: { display: "flex", alignItems: "center", gap: "8px", paddingTop: "26px" } });
    var chkRev = createEl("input", { type: "checkbox", id: "m_sec_rev" });
    chkRev.checked = !!item.reverse;
    gRev.appendChild(chkRev);
    gRev.appendChild(createEl("label", { for: "m_sec_rev", style: { margin: "0", cursor: "pointer" } }, "Alternate layout (Media on Right)"));
    r2.appendChild(gRev);
    wrap.appendChild(r2);

    var gIntro = createEl("div", { className: "form-group" });
    gIntro.appendChild(createEl("label", null, "Section Description / Narrative"));
    var inpIntro = createEl("textarea", { rows: "3", placeholder: "Describe this equipment category for boatbuilders and commercial fleet operators..." }, item.intro || "");
    gIntro.appendChild(inpIntro);
    wrap.appendChild(gIntro);

    var mediaSec = createMediaField("Featured Category Image", item.image_url || "assets/photos/Outboard Motors.webp", false);
    wrap.appendChild(mediaSec.group);

    openModal({
      title: isNew ? "Create New Product Section" : "Edit Product Section",
      bodyEl: wrap,
      maxWidth: "580px",
      confirmLabel: isNew ? "Create Section" : "Save Section Details",
      onConfirm: function(){
        var t = inpTitle.value.trim();
        if (!t) {
          showToast("Section title is required", "error");
          return;
        }
        item.title = t;
        item.badge = inpBadge.value.trim();
        item.intro = inpIntro.value.trim();
        item.layout = selLayout.value;
        item.unit = inpUnit.value.trim() || "Model";
        item.reverse = chkRev.checked;
        item.image_url = mediaSec.input.value.trim() || "assets/photos/Outboard Motors.webp";
        if (typeof onSave === "function") onSave(item);
      }
    });
  }

  // Modal: Add or Edit a Product in a Section
  function openProductEditModal(section, prod, onSave) {
    var isNew = !prod;
    var item = prod ? JSON.parse(JSON.stringify(prod)) : {
      id: "prod-" + Date.now(),
      key: "",
      name: "",
      tag: "",
      description: "",
      image_url: section.image_url || "assets/photos/Outboard Motors.webp",
      photos: [],
      datasheet: "",
      quote_url: "",
      specs: {},
      published: true
    };

    var wrap = createEl("div", { style: { display: "flex", flexDirection: "column", gap: "14px", maxHeight: "72vh", overflowY: "auto", paddingRight: "4px" } });

    var r1 = createEl("div", { className: "form-row" });
    var gName = createEl("div", { className: "form-group" });
    gName.appendChild(createEl("label", null, "Product Name / Model Display *"));
    var inpName = createEl("input", { type: "text", value: item.name || "", placeholder: "e.g. SEAGÖ 60 HP or 40 Seater Pontoon" });
    gName.appendChild(inpName);
    r1.appendChild(gName);

    var gKey = createEl("div", { className: "form-group" });
    gKey.appendChild(createEl("label", null, "Selector Tab Key * (" + (section.unit || "Label") + ")"));
    var inpKey = createEl("input", { type: "text", value: item.key || "", placeholder: "e.g. 60 or 40 or 73.6V" });
    gKey.appendChild(inpKey);
    r1.appendChild(gKey);
    wrap.appendChild(r1);

    var r2 = createEl("div", { className: "form-row" });
    var gTag = createEl("div", { className: "form-group" });
    gTag.appendChild(createEl("label", null, "Subtitle / Spec Tag"));
    var inpTag = createEl("input", { type: "text", value: item.tag || "", placeholder: "e.g. 60 HP · 45 kW · 144 V" });
    gTag.appendChild(inpTag);
    r2.appendChild(gTag);

    var gDs = createEl("div", { className: "form-group" });
    gDs.appendChild(createEl("label", null, "Datasheet / Catalog PDF URL (optional)"));
    var inpDs = createEl("input", { type: "text", value: item.datasheet || "", placeholder: "catalog/SEAGO Technical Specifications.pdf" });
    gDs.appendChild(inpDs);
    r2.appendChild(gDs);
    wrap.appendChild(r2);

    var gDesc = createEl("div", { className: "form-group" });
    gDesc.appendChild(createEl("label", null, "Short Description / Summary"));
    var inpDesc = createEl("textarea", { rows: "2", placeholder: "Key performance, application, or commercial vessel notes..." }, item.description || "");
    gDesc.appendChild(inpDesc);
    wrap.appendChild(gDesc);

    var mediaProd = createMediaField("Primary Product Image", item.image_url || section.image_url || "assets/photos/Outboard Motors.webp", false);
    wrap.appendChild(mediaProd.group);

    // Gallery / Slideshow photos
    var gGallery = createEl("div", { className: "form-group" });
    gGallery.appendChild(createEl("label", null, "Slideshow Photos (enter additional image URLs, one per line)"));
    var initialPhotoLines = (Array.isArray(item.photos) && item.photos.length > 0)
      ? item.photos.map(function(p){ return typeof p === 'string' ? p : (p.url || ''); }).filter(Boolean).join('\n')
      : "";
    var inpPhotos = createEl("textarea", { rows: "2", placeholder: "assets/photos/sundeck/sundeck-1.webp\nassets/photos/sundeck/sundeck-2.webp" }, initialPhotoLines);
    gGallery.appendChild(inpPhotos);
    wrap.appendChild(gGallery);

    // Specifications Key-Value Editor
    var specsSection = createEl("div", { style: { border: "1px solid var(--line)", borderRadius: "8px", padding: "14px", background: "#F8FAFC" } });
    var specsHeader = createEl("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" } });
    specsHeader.appendChild(createEl("h5", { style: { margin: "0", fontSize: "13px", fontWeight: "700", color: "var(--navy)" } }, "Technical Specifications Grid"));

    var presetWrap = createEl("div", { style: { display: "flex", gap: "6px" } });
    var btnPreMotor = createEl("button", { type: "button", className: "btn btn-secondary btn-sm", style: { padding: "2px 6px", fontSize: "10.5px" } }, "+ Motor Specs");
    var btnPreBoat = createEl("button", { type: "button", className: "btn btn-secondary btn-sm", style: { padding: "2px 6px", fontSize: "10.5px" } }, "+ Boat Specs");
    presetWrap.appendChild(btnPreMotor);
    presetWrap.appendChild(btnPreBoat);
    specsHeader.appendChild(presetWrap);
    specsSection.appendChild(specsHeader);

    var specRowsContainer = createEl("div", { style: { display: "flex", flexDirection: "column", gap: "8px" } });

    function addSpecRow(key, val) {
      var row = createEl("div", { style: { display: "flex", gap: "8px", alignItems: "center" } });
      var kInp = createEl("input", { type: "text", value: key || "", placeholder: "Spec Name (e.g. Rated Power)", style: { flex: "1" } });
      var vInp = createEl("input", { type: "text", value: val || "", placeholder: "Value (e.g. 45 kW)", style: { flex: "1.2" } });
      var dBtn = createEl("button", { type: "button", className: "btn btn-secondary btn-sm", style: { color: "var(--danger)", padding: "4px 8px" } }, "×");
      dBtn.addEventListener("click", function(){ row.remove(); });
      row.appendChild(kInp);
      row.appendChild(vInp);
      row.appendChild(dBtn);
      specRowsContainer.appendChild(row);
    }

    btnPreMotor.addEventListener("click", function(){
      var defaultMotorSpecs = [
        ["Rated Power", "45 kW"], ["Rated Voltage", "144 V"], ["Recommended Battery", "144V 300 AH LiFePO4"],
        ["Motor Type", "PMSM"], ["Maximum Speed", "5500 RPM"], ["Weight", "95 Kg"], ["Cooling System", "Water Cooled"]
      ];
      defaultMotorSpecs.forEach(function(pair){ addSpecRow(pair[0], pair[1]); });
    });

    btnPreBoat.addEventListener("click", function(){
      var defaultBoatSpecs = [
        ["Length", "8.50 m"], ["Beam", "4.57 m"], ["Draft", "0.35 m"],
        ["Seating Capacity", "30 Persons"], ["Hull Material", "Composite FRP / Aluminum"], ["Propulsion", "100% Electric"]
      ];
      defaultBoatSpecs.forEach(function(pair){ addSpecRow(pair[0], pair[1]); });
    });

    var existingSpecs = (item.specs && typeof item.specs === "object") ? item.specs : {};
    var exKeys = Object.keys(existingSpecs);
    if (exKeys.length > 0) {
      exKeys.forEach(function(k){ addSpecRow(k, existingSpecs[k]); });
    } else {
      addSpecRow("Rated Power", "");
      addSpecRow("Rated Voltage", "");
    }
    specsSection.appendChild(specRowsContainer);

    var addSpecBtn = createEl("button", { type: "button", className: "btn btn-secondary btn-sm", style: { marginTop: "10px" } }, "+ Add Specification Row");
    addSpecBtn.addEventListener("click", function(){ addSpecRow("", ""); });
    specsSection.appendChild(addSpecBtn);
    wrap.appendChild(specsSection);

    openModal({
      title: isNew ? "Add Product to Section" : "Edit Product",
      bodyEl: wrap,
      maxWidth: "700px",
      confirmLabel: isNew ? "Add Product" : "Save Product Details",
      onConfirm: function(){
        var pName = inpName.value.trim();
        var pKey = inpKey.value.trim();
        if (!pName || !pKey) {
          showToast("Product name and selector tab key are required", "error");
          return;
        }

        item.name = pName;
        item.key = pKey;
        item.tag = inpTag.value.trim();
        item.datasheet = inpDs.value.trim();
        item.description = inpDesc.value.trim();
        item.image_url = mediaProd.input.value.trim() || section.image_url;

        // Collect gallery photos
        var extraLines = inpPhotos.value.split("\n").map(function(l){ return l.trim(); }).filter(Boolean);
        var photosArr = [];
        if (item.image_url) photosArr.push({ url: item.image_url, caption: item.name });
        extraLines.forEach(function(url, idx){
          if (url !== item.image_url) {
            photosArr.push({ url: url, caption: item.name + " (" + (idx + 1) + ")" });
          }
        });
        item.photos = photosArr;

        // Collect specs
        var collectedSpecs = {};
        var rows = specRowsContainer.children;
        for (var i = 0; i < rows.length; i++) {
          var inps = rows[i].querySelectorAll("input");
          if (inps && inps.length >= 2) {
            var sk = inps[0].value.trim();
            var sv = inps[1].value.trim();
            if (sk) collectedSpecs[sk] = sv;
          }
        }
        item.specs = collectedSpecs;

        if (typeof onSave === "function") onSave(item);
      }
    });
  }

  // 2. PRODUCTS & MOTORS PAGE CMS (products.html) - Dynamic Sections & Products Builder
  function renderProductsPageEditor() {
    pageRoot.innerHTML = "";
    loadPageData("products", function(err, page){
      if (!page) return;

      window.SeagoStore.list("product_sections", function(secErr, sectionsList){
        var sections = (sectionsList && sectionsList.length > 0) ? sectionsList : ((window._SEAGO_SEED_DATA && window._SEAGO_SEED_DATA.product_sections) || []);

        var form = createEl("form", { novalidate: "novalidate" });
        var header = createPageHeader("Products & Outboard Fleet", "products.html", function(){
          if (typeof form.requestSubmit === "function") {
            form.requestSubmit();
          } else {
            form.dispatchEvent(new Event("submit", { cancelable: true }));
          }
        });
        pageRoot.appendChild(header);

        var formCard = createEl("div", { className: "form-card" });

        // Section 1: Hero Settings
        var s1 = createEl("div", { className: "cms-section-card" });
        var h1 = createEl("div", { className: "cms-section-header" });
        var h1Left = createEl("div", { className: "cms-section-title-wrap" });
        h1Left.appendChild(createEl("span", { className: "cms-section-number" }, "1"));
        h1Left.appendChild(createEl("h3", { className: "cms-section-title" }, "Products Page Hero"));
        h1.appendChild(h1Left);
        s1.appendChild(h1);

        var gBadge = createEl("div", { className: "form-group" });
        gBadge.appendChild(createEl("label", null, "Category Badge"));
        var inpBadge = createEl("input", { type: "text", value: page.badge || "PRODUCTS" });
        gBadge.appendChild(inpBadge);
        s1.appendChild(gBadge);

        var gHead = createEl("div", { className: "form-group" });
        gHead.appendChild(createEl("label", null, "Headline"));
        var inpHead = createEl("input", { type: "text", value: page.headline || "One range, every vessel" });
        gHead.appendChild(inpHead);
        s1.appendChild(gHead);

        var gSub = createEl("div", { className: "form-group" });
        gSub.appendChild(createEl("label", null, "Introductory Narrative"));
        var inpSub = createEl("textarea", { rows: "3" }, page.subheadline || "");
        gSub.appendChild(inpSub);
        s1.appendChild(gSub);
        form.appendChild(s1);

        // Section 2: Product Sections & Catalog Builder
        var s2 = createEl("div", { className: "cms-section-card" });
        var h2 = createEl("div", { className: "cms-section-header", style: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" } });
        var h2Left = createEl("div", { className: "cms-section-title-wrap" });
        h2Left.appendChild(createEl("span", { className: "cms-section-number" }, "2"));
        var h2TitleWrap = createEl("div");
        h2TitleWrap.appendChild(createEl("h3", { className: "cms-section-title", style: { margin: "0" } }, "Product Catalog Sections & Builder"));
        h2TitleWrap.appendChild(createEl("p", { style: { margin: "2px 0 0", fontSize: "12px", color: "var(--text-muted)" } }, "Add new sections, reorder them, or add new products to any existing section"));
        h2Left.appendChild(h2TitleWrap);
        h2.appendChild(h2Left);

        var addSectionBtn = createEl("button", { type: "button", className: "btn btn-sm btn-primary", style: { display: "inline-flex", alignItems: "center", gap: "6px" } });
        addSectionBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg><span>+ Create New Section</span>';
        addSectionBtn.addEventListener("click", function(){
          openSectionEditModal(null, function(newSec){
            sections.push(newSec);
            persistAllSections(function(){
              renderSectionsList();
              showToast("New product section created!", "success");
            });
          });
        });
        h2.appendChild(addSectionBtn);
        s2.appendChild(h2);

        var sectionsContainer = createEl("div", { style: { marginTop: "18px", display: "flex", flexDirection: "column", gap: "16px" } });
        s2.appendChild(sectionsContainer);
        form.appendChild(s2);

        // Section 3: Bottom Call-To-Action Banner
        var s3 = createEl("div", { className: "cms-section-card" });
        var h3 = createEl("div", { className: "cms-section-header" });
        var h3Left = createEl("div", { className: "cms-section-title-wrap" });
        h3Left.appendChild(createEl("span", { className: "cms-section-number" }, "3"));
        h3Left.appendChild(createEl("h3", { className: "cms-section-title" }, "Bottom Call-To-Action Banner"));
        h3.appendChild(h3Left);
        s3.appendChild(h3);

        var rCtaBan = createEl("div", { className: "form-row" });
        var gCtaTitle = createEl("div", { className: "form-group" });
        gCtaTitle.appendChild(createEl("label", null, "Banner Title"));
        var inpCtaTitle = createEl("input", { type: "text", value: page.cta_banner_title || "Tell us your boat, we'll spec the system" });
        gCtaTitle.appendChild(inpCtaTitle);
        var gCtaBtn = createEl("div", { className: "form-group" });
        gCtaBtn.appendChild(createEl("label", null, "Button Label"));
        var inpCtaBtn = createEl("input", { type: "text", value: page.cta_banner_btn || "Request a Quote" });
        gCtaBtn.appendChild(inpCtaBtn);
        rCtaBan.appendChild(gCtaTitle);
        rCtaBan.appendChild(gCtaBtn);
        s3.appendChild(rCtaBan);

        var gCtaText = createEl("div", { className: "form-group" });
        gCtaText.appendChild(createEl("label", null, "Banner Subtext"));
        var inpCtaText = createEl("textarea", { rows: "2" }, page.cta_banner_text || "");
        gCtaText.appendChild(inpCtaText);
        s3.appendChild(gCtaText);
        form.appendChild(s3);

        // Section 4: SEO Metadata
        var s4 = createEl("div", { className: "cms-section-card" });
        var h4 = createEl("div", { className: "cms-section-header" });
        var h4Left = createEl("div", { className: "cms-section-title-wrap" });
        h4Left.appendChild(createEl("span", { className: "cms-section-number" }, "4"));
        h4Left.appendChild(createEl("h3", { className: "cms-section-title" }, "SEO Search Metadata"));
        h4.appendChild(h4Left);
        s4.appendChild(h4);

        var gMeta = createEl("div", { className: "form-group" });
        gMeta.appendChild(createEl("label", null, "Google Search Meta Description"));
        var inpMeta = createEl("textarea", { rows: "2" }, page.meta_desc || "");
        gMeta.appendChild(inpMeta);
        s4.appendChild(gMeta);
        form.appendChild(s4);

        // Submit Bar
        var actions = createEl("div", { className: "form-actions" });
        var cancel = createEl("a", { className: "btn btn-secondary", href: "#/dashboard" }, "Cancel");
        var save = createEl("button", { type: "submit", className: "btn btn-primary" }, "Save Products Page Changes");
        actions.appendChild(cancel);
        actions.appendChild(save);
        form.appendChild(actions);

        function persistAllSections(done) {
          isDirty = true;
          try {
            localStorage.setItem("seago_admin_v1:product_sections", JSON.stringify(sections));
          } catch(e){}
          if (typeof done === "function") done();
        }

        // Section list renderer
        function renderSectionsList() {
          sectionsContainer.innerHTML = "";
          if (!sections || sections.length === 0) {
            var emptyNotice = createEl("div", { style: { padding: "24px", textAlign: "center", background: "#F8FAFC", border: "1px dashed var(--line)", borderRadius: "8px" } });
            emptyNotice.appendChild(createEl("p", { style: { margin: "0 0 12px", color: "var(--text-muted)" } }, "No product sections found. Click '+ Create New Section' to begin."));
            sectionsContainer.appendChild(emptyNotice);
            return;
          }

          sections.forEach(function(sec, sIdx){
            var sCard = createEl("div", {
              style: {
                background: "#FFFFFF",
                border: "1px solid var(--line)",
                borderRadius: "10px",
                overflow: "hidden",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
              }
            });

            // Card Header
            var scHeader = createEl("div", {
              style: {
                padding: "14px 18px",
                background: "#F8FAFC",
                borderBottom: "1px solid var(--line)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px"
              }
            });

            var scHeaderLeft = createEl("div", { style: { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" } });
            var numBadge = createEl("span", {
              style: {
                background: "var(--navy)",
                color: "#fff",
                fontSize: "11px",
                fontWeight: "700",
                padding: "2px 8px",
                borderRadius: "4px"
              }
            }, "Section " + (sIdx + 1));
            scHeaderLeft.appendChild(numBadge);

            var sTitleEl = createEl("h4", { style: { margin: "0", fontSize: "15px", color: "var(--navy)", fontWeight: "700" } }, sec.title || "Untitled Section");
            scHeaderLeft.appendChild(sTitleEl);

            if (sec.badge) {
              var sBadgeEl = createEl("span", { className: "badge badge-primary", style: { fontSize: "11px" } }, sec.badge);
              scHeaderLeft.appendChild(sBadgeEl);
            }

            var layoutTypeBadge = createEl("span", {
              style: {
                fontSize: "10.5px",
                fontWeight: "600",
                color: "var(--slate)",
                background: "#E2E8F0",
                padding: "2px 7px",
                borderRadius: "4px"
              }
            }, sec.layout === "grid" ? "Card Grid Layout" : ("Selector Tabs (" + (sec.unit || "Unit") + ")"));
            scHeaderLeft.appendChild(layoutTypeBadge);

            var scHeaderActions = createEl("div", { style: { display: "flex", alignItems: "center", gap: "6px" } });

            // Move Up
            if (sIdx > 0) {
              var upBtn = createEl("button", { type: "button", className: "btn btn-secondary btn-sm", style: { padding: "4px 8px" }, title: "Move Section Up" });
              upBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"></polyline></svg>';
              upBtn.addEventListener("click", function(){
                var temp = sections[sIdx];
                sections[sIdx] = sections[sIdx - 1];
                sections[sIdx - 1] = temp;
                persistAllSections(renderSectionsList);
              });
              scHeaderActions.appendChild(upBtn);
            }

            // Move Down
            if (sIdx < sections.length - 1) {
              var downBtn = createEl("button", { type: "button", className: "btn btn-secondary btn-sm", style: { padding: "4px 8px" }, title: "Move Section Down" });
              downBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>';
              downBtn.addEventListener("click", function(){
                var temp = sections[sIdx];
                sections[sIdx] = sections[sIdx + 1];
                sections[sIdx + 1] = temp;
                persistAllSections(renderSectionsList);
              });
              scHeaderActions.appendChild(downBtn);
            }

            // Edit Section
            var editSecBtn = createEl("button", { type: "button", className: "btn btn-secondary btn-sm", style: { display: "inline-flex", alignItems: "center", gap: "4px" } });
            editSecBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg><span>Edit Section</span>';
            editSecBtn.addEventListener("click", function(){
              openSectionEditModal(sec, function(updated){
                sections[sIdx] = updated;
                persistAllSections(function(){
                  renderSectionsList();
                  showToast("Section updated!", "success");
                });
              });
            });
            scHeaderActions.appendChild(editSecBtn);

            // Delete Section
            var delSecBtn = createEl("button", { type: "button", className: "btn btn-secondary btn-sm", style: { color: "var(--danger)" }, title: "Delete Section" });
            delSecBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
            delSecBtn.addEventListener("click", function(){
              openModal({
                title: "Delete Section",
                bodyText: "Are you sure you want to delete section '" + (sec.title || "this section") + "' and all its products? This will remove it from the live products page.",
                danger: true,
                confirmLabel: "Delete Section",
                onConfirm: function(){
                  sections.splice(sIdx, 1);
                  persistAllSections(function(){
                    renderSectionsList();
                    showToast("Section deleted", "info");
                  });
                }
              });
            });
            scHeaderActions.appendChild(delSecBtn);

            scHeader.appendChild(scHeaderLeft);
            scHeader.appendChild(scHeaderActions);
            sCard.appendChild(scHeader);

            // Card Body: Section Summary & Products
            var scBody = createEl("div", { style: { padding: "16px 18px" } });

            if (sec.intro) {
              var introP = createEl("p", { style: { margin: "0 0 14px", fontSize: "13.5px", color: "var(--slate)", lineHeight: "1.6" } }, sec.intro);
              scBody.appendChild(introP);
            }

            // Products Subsection
            var prodsWrap = createEl("div", { style: { marginTop: "12px", borderTop: "1px solid var(--line)", paddingTop: "14px" } });
            var prodsBar = createEl("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" } });
            var prodsTitle = createEl("h5", { style: { margin: "0", fontSize: "13px", fontWeight: "700", color: "var(--navy)", display: "flex", alignItems: "center", gap: "8px" } });
            var prodList = Array.isArray(sec.products) ? sec.products : [];
            prodsTitle.innerHTML = '<span>Products in this section</span> <span class="badge badge-neutral" style="font-size:10.5px;">' + prodList.length + ' products</span>';
            prodsBar.appendChild(prodsTitle);

            var addProdBtn = createEl("button", { type: "button", className: "btn btn-sm btn-outline-topbar", style: { display: "inline-flex", alignItems: "center", gap: "5px" } });
            addProdBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg><span>+ Add Product to this Section</span>';
            addProdBtn.addEventListener("click", function(){
              openProductEditModal(sec, null, function(newProd){
                if (!Array.isArray(sec.products)) sec.products = [];
                sec.products.push(newProd);
                persistAllSections(function(){
                  renderSectionsList();
                  showToast("Product added to " + (sec.title || "section") + "!", "success");
                });
              });
            });
            prodsBar.appendChild(addProdBtn);
            prodsWrap.appendChild(prodsBar);

            if (prodList.length === 0) {
              var pEmpty = createEl("div", { style: { padding: "16px", textAlign: "center", background: "#F8FAFC", borderRadius: "6px", fontSize: "12.5px", color: "var(--text-muted)" } });
              pEmpty.textContent = "No products in this section yet. Click '+ Add Product to this Section' above to add models.";
              prodsWrap.appendChild(pEmpty);
            } else {
              var pGrid = createEl("div", {
                style: {
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                  gap: "12px"
                }
              });

              prodList.forEach(function(p, pIdx){
                var pCard = createEl("div", {
                  style: {
                    background: "#F8FAFC",
                    border: "1px solid var(--line)",
                    borderRadius: "8px",
                    padding: "12px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between"
                  }
                });

                var pTop = createEl("div");
                var pHeadRow = createEl("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "6px" } });
                var pTitle = createEl("h6", { style: { margin: "0", fontSize: "13.5px", fontWeight: "700", color: "var(--navy)" } }, p.name || ("Product " + (p.key || (pIdx + 1))));
                var pKeyBadge = createEl("span", { className: "badge badge-success", style: { fontSize: "10.5px" } }, (sec.unit ? (p.key + " " + sec.unit) : ("Tab: " + p.key)));
                pHeadRow.appendChild(pTitle);
                pHeadRow.appendChild(pKeyBadge);
                pTop.appendChild(pHeadRow);

                if (p.tag) {
                  var pTagEl = createEl("div", { style: { fontSize: "11px", color: "var(--blue)", fontWeight: "600", marginTop: "4px" } }, p.tag);
                  pTop.appendChild(pTagEl);
                }

                // Specs summary chips
                if (p.specs && typeof p.specs === "object") {
                  var spChips = createEl("div", { style: { display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "8px" } });
                  var spKeys = Object.keys(p.specs).slice(0, 3);
                  spKeys.forEach(function(k){
                    var ch = createEl("span", {
                      style: {
                        fontSize: "10px",
                        background: "#E2E8F0",
                        color: "var(--navy)",
                        padding: "2px 6px",
                        borderRadius: "3px"
                      }
                    }, k + ": " + p.specs[k]);
                    spChips.appendChild(ch);
                  });
                  pTop.appendChild(spChips);
                }
                pCard.appendChild(pTop);

                // Product Actions Footer
                var pFoot = createEl("div", { style: { marginTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--line)", paddingTop: "8px" } });
                
                var pOrderBtns = createEl("div", { style: { display: "flex", gap: "3px" } });
                if (pIdx > 0) {
                  var pUp = createEl("button", { type: "button", className: "btn btn-secondary btn-sm", style: { padding: "2px 6px", fontSize: "10px" }, title: "Move Product Left" }, "←");
                  pUp.addEventListener("click", function(){
                    var t = sec.products[pIdx];
                    sec.products[pIdx] = sec.products[pIdx - 1];
                    sec.products[pIdx - 1] = t;
                    persistAllSections(renderSectionsList);
                  });
                  pOrderBtns.appendChild(pUp);
                }
                if (pIdx < prodList.length - 1) {
                  var pDn = createEl("button", { type: "button", className: "btn btn-secondary btn-sm", style: { padding: "2px 6px", fontSize: "10px" }, title: "Move Product Right" }, "→");
                  pDn.addEventListener("click", function(){
                    var t = sec.products[pIdx];
                    sec.products[pIdx] = sec.products[pIdx + 1];
                    sec.products[pIdx + 1] = t;
                    persistAllSections(renderSectionsList);
                  });
                  pOrderBtns.appendChild(pDn);
                }
                pFoot.appendChild(pOrderBtns);

                var pCrudBtns = createEl("div", { style: { display: "flex", gap: "6px" } });
                var pEditBtn = createEl("button", { type: "button", className: "btn btn-secondary btn-sm", style: { padding: "3px 8px", fontSize: "11px" } }, "Edit");
                pEditBtn.addEventListener("click", function(){
                  openProductEditModal(sec, p, function(updatedProd){
                    sec.products[pIdx] = updatedProd;
                    persistAllSections(function(){
                      renderSectionsList();
                      showToast("Product updated!", "success");
                    });
                  });
                });
                pCrudBtns.appendChild(pEditBtn);

                var pDelBtn = createEl("button", { type: "button", className: "btn btn-secondary btn-sm", style: { padding: "3px 8px", fontSize: "11px", color: "var(--danger)" }, title: "Delete Product" }, "×");
                pDelBtn.addEventListener("click", function(){
                  openModal({
                    title: "Delete Product",
                    bodyText: "Are you sure you want to delete '" + (p.name || ("product " + p.key)) + "' from " + (sec.title || "this section") + "?",
                    danger: true,
                    confirmLabel: "Delete Product",
                    onConfirm: function(){
                      sec.products.splice(pIdx, 1);
                      persistAllSections(function(){
                        renderSectionsList();
                        showToast("Product removed", "info");
                      });
                    }
                  });
                });
                pCrudBtns.appendChild(pDelBtn);
                pFoot.appendChild(pCrudBtns);

                pCard.appendChild(pFoot);
                pGrid.appendChild(pCard);
              });
              prodsWrap.appendChild(pGrid);
            }

            scBody.appendChild(prodsWrap);
            sCard.appendChild(scBody);
            sectionsContainer.appendChild(sCard);
          });
        }

        renderSectionsList();

        form.addEventListener("input", function(){ isDirty = true; });

        form.addEventListener("submit", function(e){
          e.preventDefault();
          page.badge = inpBadge.value.trim();
          page.headline = inpHead.value.trim();
          page.subheadline = inpSub.value.trim();
          page.cta_banner_title = inpCtaTitle.value.trim();
          page.cta_banner_btn = inpCtaBtn.value.trim();
          page.cta_banner_text = inpCtaText.value.trim();
          page.meta_desc = inpMeta.value.trim();

          persistAllSections(function(){
            savePageData(page);
          });
        });

        formCard.appendChild(form);
        pageRoot.appendChild(formCard);
      });
    });
  }

      formCard.appendChild(form);
      pageRoot.appendChild(formCard);
    });
  }

  // 3. ABOUT US & LEADERSHIP PAGE CMS (about.html)
  function renderAboutPageEditor() {
    pageRoot.innerHTML = "";
    loadPageData("about", function(err, page){
      if (!page) return;

      var form = createEl("form", { novalidate: "novalidate" });
      var header = createPageHeader("About Seagö & Leadership", "about.html", function(){
        if (typeof form.requestSubmit === "function") {
          form.requestSubmit();
        } else {
          form.dispatchEvent(new Event("submit", { cancelable: true }));
        }
      });
      pageRoot.appendChild(header);

      var formCard = createEl("div", { className: "form-card" });

      // Section 1: Hero
      var s1 = createEl("div", { className: "cms-section-card" });
      var h1 = createEl("div", { className: "cms-section-header" });
      var h1Left = createEl("div", { className: "cms-section-title-wrap" });
      h1Left.appendChild(createEl("span", { className: "cms-section-number" }, "1"));
      h1Left.appendChild(createEl("h3", { className: "cms-section-title" }, "About Hero Narrative"));
      h1.appendChild(h1Left);
      s1.appendChild(h1);

      var gBadge = createEl("div", { className: "form-group" });
      gBadge.appendChild(createEl("label", null, "Banner Badge"));
      var inpBadge = createEl("input", { type: "text", value: page.badge || "ABOUT US" });
      gBadge.appendChild(inpBadge);
      s1.appendChild(gBadge);

      var gHead = createEl("div", { className: "form-group" });
      gHead.appendChild(createEl("label", null, "Headline"));
      var inpHead = createEl("input", { type: "text", value: page.headline || "Building the electric fleet India's waterways need" });
      gHead.appendChild(inpHead);
      s1.appendChild(gHead);

      var gSub = createEl("div", { className: "form-group" });
      gSub.appendChild(createEl("label", null, "Subtitle"));
      var inpSub = createEl("textarea", { rows: "2" }, page.subheadline || "");
      gSub.appendChild(inpSub);
      s1.appendChild(gSub);
      form.appendChild(s1);

      // Section 2: Our Story & Impact Counters
      var s2 = createEl("div", { className: "cms-section-card" });
      var h2 = createEl("div", { className: "cms-section-header" });
      var h2Left = createEl("div", { className: "cms-section-title-wrap" });
      h2Left.appendChild(createEl("span", { className: "cms-section-number" }, "2"));
      h2Left.appendChild(createEl("h3", { className: "cms-section-title" }, "Our Story & Impact Metrics"));
      h2.appendChild(h2Left);
      s2.appendChild(h2);

      var gStoryEyebrow = createEl("div", { className: "form-group" });
      gStoryEyebrow.appendChild(createEl("label", null, "Story Section Eyebrow"));
      var inpStoryEye = createEl("input", { type: "text", value: page.story_eyebrow || "Our Story" });
      gStoryEyebrow.appendChild(inpStoryEye);
      s2.appendChild(gStoryEyebrow);

      var gStoryP1 = createEl("div", { className: "form-group" });
      gStoryP1.appendChild(createEl("label", null, "Story Paragraph 1"));
      var inpStoryP1 = createEl("textarea", { rows: "3" }, page.story_p1 || "");
      gStoryP1.appendChild(inpStoryP1);
      s2.appendChild(gStoryP1);

      var gStoryP2 = createEl("div", { className: "form-group" });
      gStoryP2.appendChild(createEl("label", null, "Story Paragraph 2"));
      var inpStoryP2 = createEl("textarea", { rows: "3" }, page.story_p2 || "");
      gStoryP2.appendChild(inpStoryP2);
      s2.appendChild(gStoryP2);

      s2.appendChild(createEl("h4", { style: { margin: "14px 0 8px", fontSize: "12.5px", color: "var(--navy)" } }, "3 Impact Statistics Strip"));
      var rStoryStats = createEl("div", { className: "form-row-3" });
      var gSt1 = createEl("div", { className: "form-group" });
      gSt1.appendChild(createEl("label", null, "Stat 1 (e.g. 5 / States Operating)"));
      var inpSt1Val = createEl("input", { type: "text", value: page.story_stat1_val || "5", placeholder: "Val" });
      var inpSt1Lbl = createEl("input", { type: "text", value: page.story_stat1_lbl || "States Operating", placeholder: "Label", style: { marginTop: "4px" } });
      gSt1.appendChild(inpSt1Val);
      gSt1.appendChild(inpSt1Lbl);
      rStoryStats.appendChild(gSt1);

      var gSt2 = createEl("div", { className: "form-group" });
      gSt2.appendChild(createEl("label", null, "Stat 2 (e.g. 2+ Yrs / Field-Proven)"));
      var inpSt2Val = createEl("input", { type: "text", value: page.story_stat2_val || "2+ Yrs", placeholder: "Val" });
      var inpSt2Lbl = createEl("input", { type: "text", value: page.story_stat2_lbl || "Field-Proven", placeholder: "Label", style: { marginTop: "4px" } });
      gSt2.appendChild(inpSt2Val);
      gSt2.appendChild(inpSt2Lbl);
      rStoryStats.appendChild(gSt2);

      var gSt3 = createEl("div", { className: "form-group" });
      gSt3.appendChild(createEl("label", null, "Stat 3 (e.g. 50 HP / Max Outboard)"));
      var inpSt3Val = createEl("input", { type: "text", value: page.story_stat3_val || "50 HP", placeholder: "Val" });
      var inpSt3Lbl = createEl("input", { type: "text", value: page.story_stat3_lbl || "Max Outboard", placeholder: "Label", style: { marginTop: "4px" } });
      gSt3.appendChild(inpSt3Val);
      gSt3.appendChild(inpSt3Lbl);
      rStoryStats.appendChild(gSt3);
      s2.appendChild(rStoryStats);

      form.appendChild(s2);

      // Section 3: Where We Work (Facilities & Offices)
      var s3 = createEl("div", { className: "cms-section-card" });
      var h3 = createEl("div", { className: "cms-section-header" });
      var h3Left = createEl("div", { className: "cms-section-title-wrap" });
      h3Left.appendChild(createEl("span", { className: "cms-section-number" }, "3"));
      h3Left.appendChild(createEl("h3", { className: "cms-section-title" }, "Where We Work (Locations)"));
      h3.appendChild(h3Left);
      s3.appendChild(h3);

      var rLocHead = createEl("div", { className: "form-row" });
      var gLocEye = createEl("div", { className: "form-group" });
      gLocEye.appendChild(createEl("label", null, "Locations Eyebrow"));
      var inpLocEye = createEl("input", { type: "text", value: page.loc_eyebrow || "Where We Work" });
      gLocEye.appendChild(inpLocEye);
      var gLocHead = createEl("div", { className: "form-group" });
      gLocHead.appendChild(createEl("label", null, "Locations Heading"));
      var inpLocHead = createEl("input", { type: "text", value: page.loc_heading || "Manufacturing in Tamil Nadu, sales in Kerala" });
      gLocHead.appendChild(inpLocHead);
      rLocHead.appendChild(gLocEye);
      rLocHead.appendChild(gLocHead);
      s3.appendChild(rLocHead);

      var gLocSub = createEl("div", { className: "form-group" });
      gLocSub.appendChild(createEl("label", null, "Locations Subtitle"));
      var inpLocSub = createEl("textarea", { rows: "2" }, page.loc_sub || "");
      gLocSub.appendChild(inpLocSub);
      s3.appendChild(gLocSub);

      // Location 1: Chennai
      var loc1Box = createEl("div", { style: { background: "#F8FAFC", border: "1px solid var(--line)", borderRadius: "6px", padding: "12px", marginBottom: "12px" } });
      loc1Box.appendChild(createEl("h4", { style: { margin: "0 0 10px", fontSize: "13px", color: "var(--navy)" } }, "Location 1: Manufacturing Facility"));
      var rLoc1 = createEl("div", { className: "form-row" });
      var inpLoc1Title = createEl("input", { type: "text", value: page.loc1_title || "Manufacturing Facility", placeholder: "Facility Title" });
      var inpLoc1Addr = createEl("input", { type: "text", value: page.loc1_addr || "Chennai, Tamil Nadu, India", placeholder: "Address / City" });
      rLoc1.appendChild(inpLoc1Title);
      rLoc1.appendChild(inpLoc1Addr);
      loc1Box.appendChild(rLoc1);
      var inpLoc1Desc = createEl("textarea", { rows: "2", style: { marginTop: "8px" } }, page.loc1_desc || "");
      loc1Box.appendChild(inpLoc1Desc);
      s3.appendChild(loc1Box);

      // Location 2: Kerala
      var loc2Box = createEl("div", { style: { background: "#F8FAFC", border: "1px solid var(--line)", borderRadius: "6px", padding: "12px" } });
      loc2Box.appendChild(createEl("h4", { style: { margin: "0 0 10px", fontSize: "13px", color: "var(--navy)" } }, "Location 2: Sales & Support Office"));
      var rLoc2 = createEl("div", { className: "form-row" });
      var inpLoc2Title = createEl("input", { type: "text", value: page.loc2_title || "Sales & Support Office", placeholder: "Office Title" });
      var inpLoc2Addr = createEl("input", { type: "text", value: page.loc2_addr || "Kerala, India", placeholder: "Address / City" });
      rLoc2.appendChild(inpLoc2Title);
      rLoc2.appendChild(inpLoc2Addr);
      loc2Box.appendChild(rLoc2);
      var inpLoc2Desc = createEl("textarea", { rows: "2", style: { marginTop: "8px" } }, page.loc2_desc || "");
      loc2Box.appendChild(inpLoc2Desc);
      s3.appendChild(loc2Box);

      form.appendChild(s3);

      // Section 4: Our Approach (3 Priorities)
      var s4 = createEl("div", { className: "cms-section-card" });
      var h4 = createEl("div", { className: "cms-section-header" });
      var h4Left = createEl("div", { className: "cms-section-title-wrap" });
      h4Left.appendChild(createEl("span", { className: "cms-section-number" }, "4"));
      h4Left.appendChild(createEl("h3", { className: "cms-section-title" }, "Our Approach (Three Uncompromised Priorities)"));
      h4.appendChild(h4Left);
      s4.appendChild(h4);

      var rAppHead = createEl("div", { className: "form-row" });
      var gAppEye = createEl("div", { className: "form-group" });
      gAppEye.appendChild(createEl("label", null, "Approach Eyebrow"));
      var inpAppEye = createEl("input", { type: "text", value: page.approach_eyebrow || "Our Approach" });
      gAppEye.appendChild(inpAppEye);
      var gAppHead = createEl("div", { className: "form-group" });
      gAppHead.appendChild(createEl("label", null, "Approach Heading"));
      var inpAppHead = createEl("input", { type: "text", value: page.approach_heading || "Three things we don't compromise on" });
      gAppHead.appendChild(inpAppHead);
      rAppHead.appendChild(gAppEye);
      rAppHead.appendChild(gAppHead);
      s4.appendChild(rAppHead);

      var gAppSub = createEl("div", { className: "form-group" });
      gAppSub.appendChild(createEl("label", null, "Approach Subtitle"));
      var inpAppSub = createEl("textarea", { rows: "2" }, page.approach_sub || "");
      gAppSub.appendChild(inpAppSub);
      s4.appendChild(gAppSub);

      // Priority 1
      var pr1Box = createEl("div", { style: { background: "#F8FAFC", border: "1px solid var(--line)", borderRadius: "6px", padding: "10px", marginBottom: "8px" } });
      pr1Box.appendChild(createEl("label", { style: { fontWeight: "600", fontSize: "12px", color: "var(--navy)" } }, "Priority 01"));
      var inpPr1Title = createEl("input", { type: "text", value: page.priority1_title || "Engineered for Indian Waters", style: { marginBottom: "6px" } });
      pr1Box.appendChild(inpPr1Title);
      var inpPr1Desc = createEl("textarea", { rows: "2" }, page.priority1_desc || "");
      pr1Box.appendChild(inpPr1Desc);
      s4.appendChild(pr1Box);

      // Priority 2
      var pr2Box = createEl("div", { style: { background: "#F8FAFC", border: "1px solid var(--line)", borderRadius: "6px", padding: "10px", marginBottom: "8px" } });
      pr2Box.appendChild(createEl("label", { style: { fontWeight: "600", fontSize: "12px", color: "var(--navy)" } }, "Priority 02"));
      var inpPr2Title = createEl("input", { type: "text", value: page.priority2_title || "Manufactured, Not Imported", style: { marginBottom: "6px" } });
      pr2Box.appendChild(inpPr2Title);
      var inpPr2Desc = createEl("textarea", { rows: "2" }, page.priority2_desc || "");
      pr2Box.appendChild(inpPr2Desc);
      s4.appendChild(pr2Box);

      // Priority 3
      var pr3Box = createEl("div", { style: { background: "#F8FAFC", border: "1px solid var(--line)", borderRadius: "6px", padding: "10px" } });
      pr3Box.appendChild(createEl("label", { style: { fontWeight: "600", fontSize: "12px", color: "var(--navy)" } }, "Priority 03"));
      var inpPr3Title = createEl("input", { type: "text", value: page.priority3_title || "Field-Tested With Real Institutions", style: { marginBottom: "6px" } });
      pr3Box.appendChild(inpPr3Title);
      var inpPr3Desc = createEl("textarea", { rows: "2" }, page.priority3_desc || "");
      pr3Box.appendChild(inpPr3Desc);
      s4.appendChild(pr3Box);

      form.appendChild(s4);

      // Section 5: Leadership Profile
      var s5 = createEl("div", { className: "cms-section-card" });
      var h5 = createEl("div", { className: "cms-section-header" });
      var h5Left = createEl("div", { className: "cms-section-title-wrap" });
      h5Left.appendChild(createEl("span", { className: "cms-section-number" }, "5"));
      h5Left.appendChild(createEl("h3", { className: "cms-section-title" }, "Founder & Leadership Profile"));
      h5.appendChild(h5Left);
      s5.appendChild(h5);

      var rLead = createEl("div", { className: "form-row" });
      var gFName = createEl("div", { className: "form-group" });
      gFName.appendChild(createEl("label", null, "Founder Full Name"));
      var inpFName = createEl("input", { type: "text", value: page.founder_name || "Gopish Kumar.G" });
      gFName.appendChild(inpFName);
      var gFTitle = createEl("div", { className: "form-group" });
      gFTitle.appendChild(createEl("label", null, "Official Title"));
      var inpFTitle = createEl("input", { type: "text", value: page.founder_title || "Founder & CEO, Seagö" });
      gFTitle.appendChild(inpFTitle);
      rLead.appendChild(gFName);
      rLead.appendChild(gFTitle);
      s5.appendChild(rLead);

      var mediaFounder = createMediaField("Founder Portrait Photo", page.founder_image || "assets/photos/founder.webp", false);
      s5.appendChild(mediaFounder.group);

      var gFQuote = createEl("div", { className: "form-group" });
      gFQuote.appendChild(createEl("label", null, "Founder Pull Quote"));
      var inpFQuote = createEl("input", { type: "text", value: page.founder_quote || "We build exactly what India's waterways need." });
      gFQuote.appendChild(inpFQuote);
      s5.appendChild(gFQuote);

      var gFBio = createEl("div", { className: "form-group" });
      gFBio.appendChild(createEl("label", null, "Leadership Message / Biography"));
      var inpFBio = createEl("textarea", { rows: "3" }, page.founder_bio || "");
      gFBio.appendChild(inpFBio);
      s5.appendChild(gFBio);

      var rLeadContact = createEl("div", { className: "form-row" });
      var gFMail = createEl("div", { className: "form-group" });
      gFMail.appendChild(createEl("label", null, "Direct Email"));
      var inpFMail = createEl("input", { type: "email", value: page.founder_email || "sales@seago.in" });
      gFMail.appendChild(inpFMail);
      var gFPhone = createEl("div", { className: "form-group" });
      gFPhone.appendChild(createEl("label", null, "Direct Telephone / WhatsApp"));
      var inpFPhone = createEl("input", { type: "text", value: page.founder_phone || "+91 86063 66633" });
      gFPhone.appendChild(inpFPhone);
      rLeadContact.appendChild(gFMail);
      rLeadContact.appendChild(gFPhone);
      s5.appendChild(rLeadContact);

      form.appendChild(s5);

      // Section 6: SEO
      var s6 = createEl("div", { className: "cms-section-card" });
      var h6 = createEl("div", { className: "cms-section-header" });
      var h6Left = createEl("div", { className: "cms-section-title-wrap" });
      h6Left.appendChild(createEl("span", { className: "cms-section-number" }, "6"));
      h6Left.appendChild(createEl("h3", { className: "cms-section-title" }, "SEO Search Metadata"));
      h6.appendChild(h6Left);
      s6.appendChild(h6);

      var gMeta = createEl("div", { className: "form-group" });
      gMeta.appendChild(createEl("label", null, "Google Search Meta Description"));
      var inpMeta = createEl("textarea", { rows: "2" }, page.meta_desc || "");
      gMeta.appendChild(inpMeta);
      s6.appendChild(gMeta);
      form.appendChild(s6);

      // Submit Bar
      var actions = createEl("div", { className: "form-actions" });
      var cancel = createEl("a", { className: "btn btn-secondary", href: "#/dashboard" }, "Cancel");
      var save = createEl("button", { type: "submit", className: "btn btn-primary" }, "Save About Page Changes");
      actions.appendChild(cancel);
      actions.appendChild(save);
      form.appendChild(actions);

      form.addEventListener("input", function(){ isDirty = true; });

      form.addEventListener("submit", function(e){
        e.preventDefault();
        page.badge = inpBadge.value.trim();
        page.headline = inpHead.value.trim();
        page.subheadline = inpSub.value.trim();
        page.story_eyebrow = inpStoryEye.value.trim();
        page.story_p1 = inpStoryP1.value.trim();
        page.story_p2 = inpStoryP2.value.trim();
        page.story_stat1_val = inpSt1Val.value.trim();
        page.story_stat1_lbl = inpSt1Lbl.value.trim();
        page.story_stat2_val = inpSt2Val.value.trim();
        page.story_stat2_lbl = inpSt2Lbl.value.trim();
        page.story_stat3_val = inpSt3Val.value.trim();
        page.story_stat3_lbl = inpSt3Lbl.value.trim();
        page.loc_eyebrow = inpLocEye.value.trim();
        page.loc_heading = inpLocHead.value.trim();
        page.loc_sub = inpLocSub.value.trim();
        page.loc1_title = inpLoc1Title.value.trim();
        page.loc1_addr = inpLoc1Addr.value.trim();
        page.loc1_desc = inpLoc1Desc.value.trim();
        page.loc2_title = inpLoc2Title.value.trim();
        page.loc2_addr = inpLoc2Addr.value.trim();
        page.loc2_desc = inpLoc2Desc.value.trim();
        page.approach_eyebrow = inpAppEye.value.trim();
        page.approach_heading = inpAppHead.value.trim();
        page.approach_sub = inpAppSub.value.trim();
        page.priority1_title = inpPr1Title.value.trim();
        page.priority1_desc = inpPr1Desc.value.trim();
        page.priority2_title = inpPr2Title.value.trim();
        page.priority2_desc = inpPr2Desc.value.trim();
        page.priority3_title = inpPr3Title.value.trim();
        page.priority3_desc = inpPr3Desc.value.trim();
        page.founder_name = inpFName.value.trim();
        page.founder_title = inpFTitle.value.trim();
        page.founder_image = mediaFounder.input.value.trim();
        page.founder_quote = inpFQuote.value.trim();
        page.founder_bio = inpFBio.value.trim();
        page.founder_email = inpFMail.value.trim();
        page.founder_phone = inpFPhone.value.trim();
        page.meta_desc = inpMeta.value.trim();
        savePageData(page);
      });

      formCard.appendChild(form);
      pageRoot.appendChild(formCard);
    });
  }

  // 4. CASE STUDIES PAGE CMS (case-studies.html)
  function renderCaseStudiesPageEditor() {
    pageRoot.innerHTML = "";
    loadPageData("case_studies", function(err, page){
      if (!page) return;

      var form = createEl("form", { novalidate: "novalidate" });
      var header = createPageHeader("Field Case Studies & Proof", "case-studies.html", function(){
        if (typeof form.requestSubmit === "function") {
          form.requestSubmit();
        } else {
          form.dispatchEvent(new Event("submit", { cancelable: true }));
        }
      });
      pageRoot.appendChild(header);

      var formCard = createEl("div", { className: "form-card" });

      // Section 1: Hero
      var s1 = createEl("div", { className: "cms-section-card" });
      var h1 = createEl("div", { className: "cms-section-header" });
      var h1Left = createEl("div", { className: "cms-section-title-wrap" });
      h1Left.appendChild(createEl("span", { className: "cms-section-number" }, "1"));
      h1Left.appendChild(createEl("h3", { className: "cms-section-title" }, "Case Studies Page Hero"));
      h1.appendChild(h1Left);
      s1.appendChild(h1);

      var gBadge = createEl("div", { className: "form-group" });
      gBadge.appendChild(createEl("label", null, "Hero Badge"));
      var inpBadge = createEl("input", { type: "text", value: page.badge || "CASE STUDIES" });
      gBadge.appendChild(inpBadge);
      s1.appendChild(gBadge);

      var gHead = createEl("div", { className: "form-group" });
      gHead.appendChild(createEl("label", null, "Headline"));
      var inpHead = createEl("input", { type: "text", value: page.headline || "Proven in the field, not just on paper" });
      gHead.appendChild(inpHead);
      s1.appendChild(gHead);

      var gSub = createEl("div", { className: "form-group" });
      gSub.appendChild(createEl("label", null, "Introduction Subtitle"));
      var inpSub = createEl("textarea", { rows: "3" }, page.subheadline || "");
      gSub.appendChild(inpSub);
      s1.appendChild(gSub);
      form.appendChild(s1);

      // Section 2: Deployment 1 - Vikalpika
      var s2 = createEl("div", { className: "cms-section-card" });
      var h2 = createEl("div", { className: "cms-section-header" });
      var h2Left = createEl("div", { className: "cms-section-title-wrap" });
      h2Left.appendChild(createEl("span", { className: "cms-section-number" }, "2"));
      h2Left.appendChild(createEl("h3", { className: "cms-section-title" }, "Deployment 01: ICAR-CIFT Vikalpika Solar-Electric Vessel"));
      h2.appendChild(h2Left);
      s2.appendChild(h2);

      var rVikHead = createEl("div", { className: "form-row" });
      var gVikTag = createEl("div", { className: "form-group" });
      gVikTag.appendChild(createEl("label", null, "Case Tag / Date"));
      var inpVikTag = createEl("input", { type: "text", value: page.vikalpika_tag || "Maharashtra · May 2025" });
      gVikTag.appendChild(inpVikTag);
      var gVikTitle = createEl("div", { className: "form-group" });
      gVikTitle.appendChild(createEl("label", null, "Project Title"));
      var inpVikTitle = createEl("input", { type: "text", value: page.vikalpika_title || "Fishing Fleets — India's First Electric Fishing Vessel" });
      gVikTitle.appendChild(inpVikTitle);
      rVikHead.appendChild(gVikTag);
      rVikHead.appendChild(gVikTitle);
      s2.appendChild(rVikHead);

      var gVikDesc = createEl("div", { className: "form-group" });
      gVikDesc.appendChild(createEl("label", null, "Deployment Details & Impact Narrative"));
      var inpVikDesc = createEl("textarea", { rows: "3" }, page.vikalpika_desc || "");
      gVikDesc.appendChild(inpVikDesc);
      s2.appendChild(gVikDesc);

      var mediaVik = createMediaField("Vikalpika Vessel Photo", page.vikalpika_image || "assets/photos/vikalpika.webp", false);
      s2.appendChild(mediaVik.group);

      s2.appendChild(createEl("h4", { style: { margin: "12px 0 6px", fontSize: "12.5px", color: "var(--navy)" } }, "3 Mini-Metrics"));
      var rVikStats = createEl("div", { className: "form-row-3" });
      var gV1 = createEl("div", { className: "form-group" });
      gV1.appendChild(createEl("label", null, "Metric 1 (Val / Lbl)"));
      var inpV1Val = createEl("input", { type: "text", value: page.vikalpika_stat1_val || "1st" });
      var inpV1Lbl = createEl("input", { type: "text", value: page.vikalpika_stat1_lbl || "Electric Fishing Vessel in India", style: { marginTop: "4px" } });
      gV1.appendChild(inpV1Val);
      gV1.appendChild(inpV1Lbl);
      rVikStats.appendChild(gV1);

      var gV2 = createEl("div", { className: "form-group" });
      gV2.appendChild(createEl("label", null, "Metric 2 (Val / Lbl)"));
      var inpV2Val = createEl("input", { type: "text", value: page.vikalpika_stat2_val || "2025" });
      var inpV2Lbl = createEl("input", { type: "text", value: page.vikalpika_stat2_lbl || "Launched", style: { marginTop: "4px" } });
      gV2.appendChild(inpV2Val);
      gV2.appendChild(inpV2Lbl);
      rVikStats.appendChild(gV2);

      var gV3 = createEl("div", { className: "form-group" });
      gV3.appendChild(createEl("label", null, "Metric 3 (Val / Lbl)"));
      var inpV3Val = createEl("input", { type: "text", value: page.vikalpika_stat3_val || "ICAR-CIFT" });
      var inpV3Lbl = createEl("input", { type: "text", value: page.vikalpika_stat3_lbl || "Research Partner", style: { marginTop: "4px" } });
      gV3.appendChild(inpV3Val);
      gV3.appendChild(inpV3Lbl);
      rVikStats.appendChild(gV3);
      s2.appendChild(rVikStats);

      form.appendChild(s2);

      // Section 3: Deployment 2 - Water Transport
      var s3 = createEl("div", { className: "cms-section-card" });
      var h3 = createEl("div", { className: "cms-section-header" });
      var h3Left = createEl("div", { className: "cms-section-title-wrap" });
      h3Left.appendChild(createEl("span", { className: "cms-section-number" }, "3"));
      h3Left.appendChild(createEl("h3", { className: "cms-section-title" }, "Deployment 02: Kerala Public Transit Ferry Fleet"));
      h3.appendChild(h3Left);
      s3.appendChild(h3);

      var rWtHead = createEl("div", { className: "form-row" });
      var gWtTag = createEl("div", { className: "form-group" });
      gWtTag.appendChild(createEl("label", null, "Case Tag / Region"));
      var inpWtTag = createEl("input", { type: "text", value: page.water_transport_tag || "Kerala" });
      gWtTag.appendChild(inpWtTag);
      var gWtTitle = createEl("div", { className: "form-group" });
      gWtTitle.appendChild(createEl("label", null, "Project Title"));
      var inpWtTitle = createEl("input", { type: "text", value: page.water_transport_title || "Public Transport System" });
      gWtTitle.appendChild(inpWtTitle);
      rWtHead.appendChild(gWtTag);
      rWtHead.appendChild(gWtTitle);
      s3.appendChild(rWtHead);

      var gWtDesc = createEl("div", { className: "form-group" });
      gWtDesc.appendChild(createEl("label", null, "Transit Routes & Fleet Efficiency"));
      var inpWtDesc = createEl("textarea", { rows: "3" }, page.water_transport_desc || "");
      gWtDesc.appendChild(inpWtDesc);
      s3.appendChild(gWtDesc);

      var mediaWt = createMediaField("Ferry Vessel Photo", page.water_transport_image || "assets/photos/Publictransport.webp", false);
      s3.appendChild(mediaWt.group);

      s3.appendChild(createEl("h4", { style: { margin: "12px 0 6px", fontSize: "12.5px", color: "var(--navy)" } }, "3 Mini-Metrics"));
      var rWtStats = createEl("div", { className: "form-row-3" });
      var gW1 = createEl("div", { className: "form-group" });
      gW1.appendChild(createEl("label", null, "Metric 1 (Val / Lbl)"));
      var inpW1Val = createEl("input", { type: "text", value: page.water_transport_stat1_val || "Daily" });
      var inpW1Lbl = createEl("input", { type: "text", value: page.water_transport_stat1_lbl || "Commuter Routes", style: { marginTop: "4px" } });
      gW1.appendChild(inpW1Val);
      gW1.appendChild(inpW1Lbl);
      rWtStats.appendChild(gW1);

      var gW2 = createEl("div", { className: "form-group" });
      gW2.appendChild(createEl("label", null, "Metric 2 (Val / Lbl)"));
      var inpW2Val = createEl("input", { type: "text", value: page.water_transport_stat2_val || "Zero" });
      var inpW2Lbl = createEl("input", { type: "text", value: page.water_transport_stat2_lbl || "Exhaust Onboard", style: { marginTop: "4px" } });
      gW2.appendChild(inpW2Val);
      gW2.appendChild(inpW2Lbl);
      rWtStats.appendChild(gW2);

      var gW3 = createEl("div", { className: "form-group" });
      gW3.appendChild(createEl("label", null, "Metric 3 (Val / Lbl)"));
      var inpW3Val = createEl("input", { type: "text", value: page.water_transport_stat3_val || "Silent" });
      var inpW3Lbl = createEl("input", { type: "text", value: page.water_transport_stat3_lbl || "Operation", style: { marginTop: "4px" } });
      gW3.appendChild(inpW3Val);
      gW3.appendChild(inpW3Lbl);
      rWtStats.appendChild(gW3);
      s3.appendChild(rWtStats);

      form.appendChild(s3);

      // Section 4: Deployment 3 - Karnataka Tourism
      var s4 = createEl("div", { className: "cms-section-card" });
      var h4 = createEl("div", { className: "cms-section-header" });
      var h4Left = createEl("div", { className: "cms-section-title-wrap" });
      h4Left.appendChild(createEl("span", { className: "cms-section-number" }, "4"));
      h4Left.appendChild(createEl("h3", { className: "cms-section-title" }, "Deployment 03: Karnataka Eco-Tourism Heritage Waterways"));
      h4.appendChild(h4Left);
      s4.appendChild(h4);

      var rTourHead = createEl("div", { className: "form-row" });
      var gTourTag = createEl("div", { className: "form-group" });
      gTourTag.appendChild(createEl("label", null, "Case Tag / State"));
      var inpTourTag = createEl("input", { type: "text", value: page.tourism_tag || "Karnataka" });
      gTourTag.appendChild(inpTourTag);
      var gTourTitle = createEl("div", { className: "form-group" });
      gTourTitle.appendChild(createEl("label", null, "Tourism Project Title"));
      var inpTourTitle = createEl("input", { type: "text", value: page.tourism_title || "Tourism Boats — Hampi, Hubli, Gadag, Bagalkot & Honnavar" });
      gTourTitle.appendChild(inpTourTitle);
      rTourHead.appendChild(gTourTag);
      rTourHead.appendChild(gTourTitle);
      s4.appendChild(rTourHead);

      var gTourDesc = createEl("div", { className: "form-group" });
      gTourDesc.appendChild(createEl("label", null, "Heritage Waterways Impact & Quiet Rides"));
      var inpTourDesc = createEl("textarea", { rows: "3" }, page.tourism_desc || "");
      gTourDesc.appendChild(inpTourDesc);
      s4.appendChild(gTourDesc);

      var mediaTour = createMediaField("Tourism Boat Photo", page.tourism_image || "assets/photos/seago-tourism-boat.webp", false);
      s4.appendChild(mediaTour.group);

      s4.appendChild(createEl("h4", { style: { margin: "12px 0 6px", fontSize: "12.5px", color: "var(--navy)" } }, "3 Mini-Metrics"));
      var rTourStats = createEl("div", { className: "form-row-3" });
      var gT1 = createEl("div", { className: "form-group" });
      gT1.appendChild(createEl("label", null, "Metric 1 (Val / Lbl)"));
      var inpT1Val = createEl("input", { type: "text", value: page.tourism_stat1_val || "5" });
      var inpT1Lbl = createEl("input", { type: "text", value: page.tourism_stat1_lbl || "Locations Deployed", style: { marginTop: "4px" } });
      gT1.appendChild(inpT1Val);
      gT1.appendChild(inpT1Lbl);
      rTourStats.appendChild(gT1);

      var gT2 = createEl("div", { className: "form-group" });
      gT2.appendChild(createEl("label", null, "Metric 2 (Val / Lbl)"));
      var inpT2Val = createEl("input", { type: "text", value: page.tourism_stat2_val || "100%" });
      var inpT2Lbl = createEl("input", { type: "text", value: page.tourism_stat2_lbl || "Electric", style: { marginTop: "4px" } });
      gT2.appendChild(inpT2Val);
      gT2.appendChild(inpT2Lbl);
      rTourStats.appendChild(gT2);

      var gT3 = createEl("div", { className: "form-group" });
      gT3.appendChild(createEl("label", null, "Metric 3 (Val / Lbl)"));
      var inpT3Val = createEl("input", { type: "text", value: page.tourism_stat3_val || "Silent" });
      var inpT3Lbl = createEl("input", { type: "text", value: page.tourism_stat3_lbl || "Operation", style: { marginTop: "4px" } });
      gT3.appendChild(inpT3Val);
      gT3.appendChild(inpT3Lbl);
      rTourStats.appendChild(gT3);
      s4.appendChild(rTourStats);

      form.appendChild(s4);

      // Section 5: Deployment 4 - Hydrogen Fuel Cell (Completed)
      var s5 = createEl("div", { className: "cms-section-card" });
      var h5 = createEl("div", { className: "cms-section-header" });
      var h5Left = createEl("div", { className: "cms-section-title-wrap" });
      h5Left.appendChild(createEl("span", { className: "cms-section-number" }, "5"));
      h5Left.appendChild(createEl("h3", { className: "cms-section-title" }, "Deployment 04: Hydrogen Fuel Cell Boat (IMU R&D)"));
      h5.appendChild(h5Left);
      s5.appendChild(h5);

      var rH2Head = createEl("div", { className: "form-row" });
      var gH2Tag = createEl("div", { className: "form-group" });
      gH2Tag.appendChild(createEl("label", null, "Case Tag / Status"));
      var inpH2Tag = createEl("input", { type: "text", value: page.hydrogen_tag || "Tamil Nadu · Completed" });
      gH2Tag.appendChild(inpH2Tag);
      var gH2Title = createEl("div", { className: "form-group" });
      gH2Title.appendChild(createEl("label", null, "Vessel Prototype Title"));
      var inpH2Title = createEl("input", { type: "text", value: page.hydrogen_title || "Hydrogen Fuel-Cell Boat" });
      gH2Title.appendChild(inpH2Title);
      rH2Head.appendChild(gH2Tag);
      rH2Head.appendChild(gH2Title);
      s5.appendChild(rH2Head);

      var gH2Desc = createEl("div", { className: "form-group" });
      gH2Desc.appendChild(createEl("label", null, "Fuel Cell Powertrain Architecture & Findings"));
      var inpH2Desc = createEl("textarea", { rows: "3" }, page.hydrogen_desc || "");
      gH2Desc.appendChild(inpH2Desc);
      s5.appendChild(gH2Desc);

      var mediaH2 = createMediaField("Hydrogen Boat Prototype Photo", page.hydrogen_image || "assets/photos/hydrogenboat.webp", false);
      s5.appendChild(mediaH2.group);

      s5.appendChild(createEl("h4", { style: { margin: "12px 0 6px", fontSize: "12.5px", color: "var(--navy)" } }, "3 Mini-Metrics"));
      var rH2Stats = createEl("div", { className: "form-row-3" });
      var gH1Metric = createEl("div", { className: "form-group" });
      gH1Metric.appendChild(createEl("label", null, "Metric 1 (Val / Lbl)"));
      var inpH1Val = createEl("input", { type: "text", value: page.hydrogen_stat1_val || "IMU" });
      var inpH1Lbl = createEl("input", { type: "text", value: page.hydrogen_stat1_lbl || "Research Partner", style: { marginTop: "4px" } });
      gH1Metric.appendChild(inpH1Val);
      gH1Metric.appendChild(inpH1Lbl);
      rH2Stats.appendChild(gH1Metric);

      var gH2Metric = createEl("div", { className: "form-group" });
      gH2Metric.appendChild(createEl("label", null, "Metric 2 (Val / Lbl)"));
      var inpH2Val = createEl("input", { type: "text", value: page.hydrogen_stat2_val || "Tamil Nadu" });
      var inpH2Lbl = createEl("input", { type: "text", value: page.hydrogen_stat2_lbl || "Research Base", style: { marginTop: "4px" } });
      gH2Metric.appendChild(inpH2Val);
      gH2Metric.appendChild(inpH2Lbl);
      rH2Stats.appendChild(gH2Metric);

      var gH3Metric = createEl("div", { className: "form-group" });
      gH3Metric.appendChild(createEl("label", null, "Metric 3 (Val / Lbl)"));
      var inpH3Val = createEl("input", { type: "text", value: page.hydrogen_stat3_val || "Completed" });
      var inpH3Lbl = createEl("input", { type: "text", value: page.hydrogen_stat3_lbl || "R&D Programme", style: { marginTop: "4px" } });
      gH3Metric.appendChild(inpH3Val);
      gH3Metric.appendChild(inpH3Lbl);
      rH2Stats.appendChild(gH3Metric);
      s5.appendChild(rH2Stats);

      form.appendChild(s5);

      // Section 6: Bottom CTA Banner
      var s6 = createEl("div", { className: "cms-section-card" });
      var h6 = createEl("div", { className: "cms-section-header" });
      var h6Left = createEl("div", { className: "cms-section-title-wrap" });
      h6Left.appendChild(createEl("span", { className: "cms-section-number" }, "6"));
      h6Left.appendChild(createEl("h3", { className: "cms-section-title" }, "Bottom Call-To-Action Banner"));
      h6.appendChild(h6Left);
      s6.appendChild(h6);

      var rCtaBan = createEl("div", { className: "form-row" });
      var gCtaTitle = createEl("div", { className: "form-group" });
      gCtaTitle.appendChild(createEl("label", null, "Banner Title"));
      var inpCtaTitle = createEl("input", { type: "text", value: page.cta_banner_title || "Have a fleet, route, or vessel in mind?" });
      gCtaTitle.appendChild(inpCtaTitle);
      var gCtaBtn = createEl("div", { className: "form-group" });
      gCtaBtn.appendChild(createEl("label", null, "Button Label"));
      var inpCtaBtn = createEl("input", { type: "text", value: page.cta_banner_btn || "Request a Quote" });
      gCtaBtn.appendChild(inpCtaBtn);
      rCtaBan.appendChild(gCtaTitle);
      rCtaBan.appendChild(gCtaBtn);
      s6.appendChild(rCtaBan);

      var gCtaText = createEl("div", { className: "form-group" });
      gCtaText.appendChild(createEl("label", null, "Banner Subtext"));
      var inpCtaText = createEl("textarea", { rows: "2" }, page.cta_banner_text || "Whether it's a single boat or a multi-vessel deployment, tell us the details and we'll help you scope it.");
      gCtaText.appendChild(inpCtaText);
      s6.appendChild(gCtaText);
      form.appendChild(s6);

      // Section 7: SEO
      var s7 = createEl("div", { className: "cms-section-card" });
      var h7 = createEl("div", { className: "cms-section-header" });
      var h7Left = createEl("div", { className: "cms-section-title-wrap" });
      h7Left.appendChild(createEl("span", { className: "cms-section-number" }, "7"));
      h7Left.appendChild(createEl("h3", { className: "cms-section-title" }, "SEO Search Metadata"));
      h7.appendChild(h7Left);
      s7.appendChild(h7);

      var gMeta = createEl("div", { className: "form-group" });
      gMeta.appendChild(createEl("label", null, "Google Search Meta Description"));
      var inpMeta = createEl("textarea", { rows: "2" }, page.meta_desc || "");
      gMeta.appendChild(inpMeta);
      s7.appendChild(gMeta);
      form.appendChild(s7);

      // Submit Bar
      var actions = createEl("div", { className: "form-actions" });
      var cancel = createEl("a", { className: "btn btn-secondary", href: "#/dashboard" }, "Cancel");
      var save = createEl("button", { type: "submit", className: "btn btn-primary" }, "Save Case Studies Changes");
      actions.appendChild(cancel);
      actions.appendChild(save);
      form.appendChild(actions);

      form.addEventListener("input", function(){ isDirty = true; });

      form.addEventListener("submit", function(e){
        e.preventDefault();
        page.badge = inpBadge.value.trim();
        page.headline = inpHead.value.trim();
        page.subheadline = inpSub.value.trim();
        page.vikalpika_tag = inpVikTag.value.trim();
        page.vikalpika_title = inpVikTitle.value.trim();
        page.vikalpika_desc = inpVikDesc.value.trim();
        page.vikalpika_image = mediaVik.input.value.trim();
        page.vikalpika_stat1_val = inpV1Val.value.trim();
        page.vikalpika_stat1_lbl = inpV1Lbl.value.trim();
        page.vikalpika_stat2_val = inpV2Val.value.trim();
        page.vikalpika_stat2_lbl = inpV2Lbl.value.trim();
        page.vikalpika_stat3_val = inpV3Val.value.trim();
        page.vikalpika_stat3_lbl = inpV3Lbl.value.trim();
        page.water_transport_tag = inpWtTag.value.trim();
        page.water_transport_title = inpWtTitle.value.trim();
        page.water_transport_desc = inpWtDesc.value.trim();
        page.water_transport_image = mediaWt.input.value.trim();
        page.water_transport_stat1_val = inpW1Val.value.trim();
        page.water_transport_stat1_lbl = inpW1Lbl.value.trim();
        page.water_transport_stat2_val = inpW2Val.value.trim();
        page.water_transport_stat2_lbl = inpW2Lbl.value.trim();
        page.water_transport_stat3_val = inpW3Val.value.trim();
        page.water_transport_stat3_lbl = inpW3Lbl.value.trim();
        page.tourism_tag = inpTourTag.value.trim();
        page.tourism_title = inpTourTitle.value.trim();
        page.tourism_desc = inpTourDesc.value.trim();
        page.tourism_image = mediaTour.input.value.trim();
        page.tourism_stat1_val = inpT1Val.value.trim();
        page.tourism_stat1_lbl = inpT1Lbl.value.trim();
        page.tourism_stat2_val = inpT2Val.value.trim();
        page.tourism_stat2_lbl = inpT2Lbl.value.trim();
        page.tourism_stat3_val = inpT3Val.value.trim();
        page.tourism_stat3_lbl = inpT3Lbl.value.trim();
        page.hydrogen_tag = inpH2Tag.value.trim();
        page.hydrogen_title = inpH2Title.value.trim();
        page.hydrogen_desc = inpH2Desc.value.trim();
        page.hydrogen_image = mediaH2.input.value.trim();
        page.hydrogen_stat1_val = inpH1Val.value.trim();
        page.hydrogen_stat1_lbl = inpH1Lbl.value.trim();
        page.hydrogen_stat2_val = inpH2Val.value.trim();
        page.hydrogen_stat2_lbl = inpH2Lbl.value.trim();
        page.hydrogen_stat3_val = inpH3Val.value.trim();
        page.hydrogen_stat3_lbl = inpH3Lbl.value.trim();
        page.cta_banner_title = inpCtaTitle.value.trim();
        page.cta_banner_text = inpCtaText.value.trim();
        page.cta_banner_btn = inpCtaBtn.value.trim();
        page.meta_desc = inpMeta.value.trim();
        savePageData(page);
      });

      formCard.appendChild(form);
      pageRoot.appendChild(formCard);
    });
  }

  // Helper: Modal for Adding/Editing Gallery Photos
  function openGalleryPhotoModal(existingItem, onSaved) {
    var isNew = !existingItem;
    var modalWrap = createEl("div");

    var formRow1 = createEl("div", { className: "form-row" });

    var gType = createEl("div", { className: "form-group" });
    gType.appendChild(createEl("label", null, "Media Format"));
    var selType = createEl("select");
    selType.innerHTML = '<option value="photo">Photo (High-Res Image)</option><option value="video">Video Reel</option>';
    if (existingItem && existingItem.media_type) selType.value = existingItem.media_type;
    gType.appendChild(selType);
    formRow1.appendChild(gType);

    var gCat = createEl("div", { className: "form-group" });
    gCat.appendChild(createEl("label", null, "Gallery Category"));
    var selCat = createEl("select");
    selCat.innerHTML = '<option value="outboard">Outboard Motors</option><option value="trials">Sea Trials &amp; Testing</option><option value="tourism">Tourism &amp; Charters</option><option value="backwater">Backwater Voyages</option><option value="factory">Manufacturing &amp; R&amp;D</option>';
    if (existingItem && existingItem.category) selCat.value = existingItem.category;
    gCat.appendChild(selCat);
    formRow1.appendChild(gCat);

    modalWrap.appendChild(formRow1);

    // Photo Upload & Preview
    var gUpload = createEl("div", { className: "form-group" });
    gUpload.appendChild(createEl("label", null, "Photo Image (Upload Local File or Pick Asset) *"));

    var previewBox = createEl("div", { style: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" } });
    var thumbImg = createEl("img", {
      src: existingItem && existingItem.url ? existingItem.url : "assets/photos/Outboard Motors.webp",
      alt: "Preview",
      style: { width: "70px", height: "50px", objectFit: "cover", borderRadius: "6px", border: "1px solid var(--line)", background: "#0a192f" }
    });
    previewBox.appendChild(thumbImg);

    var inpUrl = createEl("input", {
      type: "text",
      value: existingItem && existingItem.url ? existingItem.url : "",
      placeholder: "e.g. assets/photos/Outboard Motors.webp",
      style: { flex: "1" }
    });
    inpUrl.addEventListener("input", function(){
      thumbImg.src = inpUrl.value.trim() || "assets/photos/Outboard Motors.webp";
    });
    previewBox.appendChild(inpUrl);
    gUpload.appendChild(previewBox);

    var uploadBtnsRow = createEl("div", { style: { display: "flex", gap: "8px", marginTop: "4px" } });
    var fileInput = createEl("input", { type: "file", accept: "image/*,video/*", style: { display: "none" } });
    var uploadBtn = createEl("button", { type: "button", className: "btn btn-secondary btn-sm" }, "Upload Local File");
    var pickAssetBtn = createEl("button", { type: "button", className: "btn btn-secondary btn-sm" }, "Choose from Asset Manager");

    uploadBtn.addEventListener("click", function(){ fileInput.click(); });
    fileInput.addEventListener("change", function(){
      if (fileInput.files && fileInput.files[0]) {
        var f = fileInput.files[0];
        showToast("Processing media file...", "info");
        if (f.type.match(/^image\//)) {
          processImageFile(f, function(err, res){
            if (!err && res) {
              inpUrl.value = res.url;
              thumbImg.src = res.url;
              showToast("Photo processed & stored!", "success");
            } else {
              showToast(err ? err.message : "Image processing failed", "error");
            }
          });
        } else {
          window.SeagoStore.uploadFile("video", f, function(err, res){
            if (!err && res) {
              inpUrl.value = res.url;
              showToast("Video stored!", "success");
            }
          });
        }
      }
    });

    pickAssetBtn.addEventListener("click", function(){
      openAssetPicker("image", function(selected){
        inpUrl.value = selected.url;
        thumbImg.src = selected.url;
        showToast("Attached from Asset Manager", "success");
      });
    });

    uploadBtnsRow.appendChild(fileInput);
    uploadBtnsRow.appendChild(uploadBtn);
    uploadBtnsRow.appendChild(pickAssetBtn);
    gUpload.appendChild(uploadBtnsRow);
    modalWrap.appendChild(gUpload);

    // Caption
    var gCap = createEl("div", { className: "form-group" });
    gCap.appendChild(createEl("label", null, "Caption / Title"));
    var inpCap = createEl("input", {
      type: "text",
      value: existingItem && existingItem.caption ? existingItem.caption : "",
      placeholder: "e.g. Seagö 15 HP Outboard testing in backwaters"
    });
    gCap.appendChild(inpCap);
    modalWrap.appendChild(gCap);

    // Published toggle
    var chkPub = createEl("div", { className: "form-check", style: { marginTop: "12px" } });
    var inpPub = createEl("input", {
      type: "checkbox",
      id: "m_gal_pub",
      checked: existingItem ? !!existingItem.published : true
    });
    chkPub.appendChild(inpPub);
    chkPub.appendChild(createEl("label", { for: "m_gal_pub" }, "Published (visible on live website)"));
    modalWrap.appendChild(chkPub);

    openModal({
      title: isNew ? "Add Photo to Gallery" : "Edit Gallery Photo",
      bodyEl: modalWrap,
      maxWidth: "540px",
      confirmLabel: isNew ? "Add Photo" : "Save Changes",
      onConfirm: function(){
        var urlVal = inpUrl.value.trim();
        if (!urlVal) {
          showToast("Photo URL or file is required", "error");
          return;
        }
        var record = existingItem ? JSON.parse(JSON.stringify(existingItem)) : {};
        record.id = record.id || ("gallery-" + Date.now());
        record.media_type = selType.value;
        record.category = selCat.value;
        record.url = urlVal;
        record.caption = inpCap.value.trim() || "Seagö Electric Marine Photo";
        record.published = inpPub.checked;
        record.updated_at = new Date().toISOString();

        window.SeagoStore.save("gallery_items", record, function(err){
          if (!err) {
            showToast(isNew ? "Photo added to gallery!" : "Photo updated!", "success");
            if (typeof onSaved === "function") onSaved();
          } else {
            showToast("Error saving photo: " + err.message, "error");
          }
        });
      }
    });
  }

  // 5. GALLERY PAGE CMS (gallery.html)
  function renderGalleryPageEditor() {
    pageRoot.innerHTML = "";
    loadPageData("gallery", function(err, page){
      if (!page) return;

      var form = createEl("form", { novalidate: "novalidate" });
      var header = createPageHeader("Media Gallery & Sea Trials", "gallery.html", function(){
        if (typeof form.requestSubmit === "function") {
          form.requestSubmit();
        } else {
          form.dispatchEvent(new Event("submit", { cancelable: true }));
        }
      });
      pageRoot.appendChild(header);

      var formCard = createEl("div", { className: "form-card" });

      // Section 1: Hero
      var s1 = createEl("div", { className: "cms-section-card" });
      var h1 = createEl("div", { className: "cms-section-header" });
      var h1Left = createEl("div", { className: "cms-section-title-wrap" });
      h1Left.appendChild(createEl("span", { className: "cms-section-number" }, "1"));
      h1Left.appendChild(createEl("h3", { className: "cms-section-title" }, "Gallery Page Hero"));
      h1.appendChild(h1Left);
      s1.appendChild(h1);

      var gBadge = createEl("div", { className: "form-group" });
      gBadge.appendChild(createEl("label", null, "Hero Badge"));
      var inpBadge = createEl("input", { type: "text", value: page.badge || "" });
      gBadge.appendChild(inpBadge);
      s1.appendChild(gBadge);

      var gHead = createEl("div", { className: "form-group" });
      gHead.appendChild(createEl("label", null, "Headline"));
      var inpHead = createEl("input", { type: "text", value: page.headline || "" });
      gHead.appendChild(inpHead);
      s1.appendChild(gHead);

      var gSub = createEl("div", { className: "form-group" });
      gSub.appendChild(createEl("label", null, "Subheadline"));
      var inpSub = createEl("textarea", { rows: "2" }, page.subheadline || "Sea trials, customer deliveries, and footage across Indian waters.");
      gSub.appendChild(inpSub);
      s1.appendChild(gSub);
      form.appendChild(s1);

      // Section 2: Video Sections Headings
      var s2 = createEl("div", { className: "cms-section-card" });
      var h2 = createEl("div", { className: "cms-section-header" });
      var h2Left = createEl("div", { className: "cms-section-title-wrap" });
      h2Left.appendChild(createEl("span", { className: "cms-section-number" }, "2"));
      h2Left.appendChild(createEl("h3", { className: "cms-section-title" }, "Video Sections & Editorial Headers"));
      h2.appendChild(h2Left);
      s2.appendChild(h2);

      // Sea Trials
      var stBox = createEl("div", { style: { background: "#F8FAFC", border: "1px solid var(--line)", borderRadius: "6px", padding: "10px", marginBottom: "10px" } });
      stBox.appendChild(createEl("label", { style: { fontWeight: "600", fontSize: "12px", color: "var(--navy)" } }, "Sea Trials Section"));
      var rSt = createEl("div", { className: "form-row" });
      var inpStEye = createEl("input", { type: "text", value: page.sea_trials_eyebrow || "Sea Trials & Verification", placeholder: "Eyebrow" });
      var inpStTitle = createEl("input", { type: "text", value: page.sea_trials_title || "Engineered on the Water", placeholder: "Title" });
      rSt.appendChild(inpStEye);
      rSt.appendChild(inpStTitle);
      stBox.appendChild(rSt);
      var inpStDesc = createEl("textarea", { rows: "2", style: { marginTop: "6px" } }, page.sea_trials_desc || "High-resolution video trials across each outboard horsepower category.");
      stBox.appendChild(inpStDesc);
      s2.appendChild(stBox);

      // Tourism Runs
      var trBox = createEl("div", { style: { background: "#F8FAFC", border: "1px solid var(--line)", borderRadius: "6px", padding: "10px", marginBottom: "10px" } });
      trBox.appendChild(createEl("label", { style: { fontWeight: "600", fontSize: "12px", color: "var(--navy)" } }, "Tourism Runs Section"));
      var rTr = createEl("div", { className: "form-row" });
      var inpTrEye = createEl("input", { type: "text", value: page.tourism_eyebrow || "Tourism Runs", placeholder: "Eyebrow" });
      var inpTrTitle = createEl("input", { type: "text", value: page.tourism_title || "Full boats, no engine roar", placeholder: "Title" });
      rTr.appendChild(inpTrEye);
      rTr.appendChild(inpTrTitle);
      trBox.appendChild(rTr);
      var inpTrDesc = createEl("textarea", { rows: "2", style: { marginTop: "6px" } }, page.tourism_desc || "Tourism operators running Seagö outboards on charter routes — no exhaust, no engine roar over the passengers.");
      trBox.appendChild(inpTrDesc);
      s2.appendChild(trBox);

      // Field Footage
      var ffBox = createEl("div", { style: { background: "#F8FAFC", border: "1px solid var(--line)", borderRadius: "6px", padding: "10px", marginBottom: "10px" } });
      ffBox.appendChild(createEl("label", { style: { fontWeight: "600", fontSize: "12px", color: "var(--navy)" } }, "From the Field Footage Section"));
      var rFf = createEl("div", { className: "form-row" });
      var inpFfEye = createEl("input", { type: "text", value: page.field_eyebrow || "From the Field", placeholder: "Eyebrow" });
      var inpFfTitle = createEl("input", { type: "text", value: page.field_title || "Trials & customer footage", placeholder: "Title" });
      rFf.appendChild(inpFfEye);
      rFf.appendChild(inpFfTitle);
      ffBox.appendChild(rFf);
      var inpFfDesc = createEl("textarea", { rows: "2", style: { marginTop: "6px" } }, page.field_desc || "Raw clips recorded during sea trials and handovers — straight off the camera, nothing staged.");
      ffBox.appendChild(inpFfDesc);
      s2.appendChild(ffBox);

      // Fleet Gallery Header
      var flBox = createEl("div", { style: { background: "#F8FAFC", border: "1px solid var(--line)", borderRadius: "6px", padding: "10px" } });
      flBox.appendChild(createEl("label", { style: { fontWeight: "600", fontSize: "12px", color: "var(--navy)" } }, "The Fleet Gallery Section"));
      var rFl = createEl("div", { className: "form-row" });
      var inpFlEye = createEl("input", { type: "text", value: page.fleet_eyebrow || "Gallery", placeholder: "Eyebrow" });
      var inpFlTitle = createEl("input", { type: "text", value: page.fleet_title || "The fleet, up close", placeholder: "Title" });
      rFl.appendChild(inpFlEye);
      rFl.appendChild(inpFlTitle);
      flBox.appendChild(rFl);
      var inpFlDesc = createEl("textarea", { rows: "2", style: { marginTop: "6px" } }, page.fleet_desc || "Boats, motors, and installs from our deployments across the five states we operate in.");
      flBox.appendChild(inpFlDesc);
      s2.appendChild(flBox);

      form.appendChild(s2);

      // Section 3: Photo Gallery & Sea Trials Library
      var s3 = createEl("div", { className: "cms-section-card" });
      var h3 = createEl("div", { className: "cms-section-header" });
      var h3Left = createEl("div", { className: "cms-section-title-wrap" });
      h3Left.appendChild(createEl("span", { className: "cms-section-number" }, "3"));
      h3Left.appendChild(createEl("h3", { className: "cms-section-title" }, "Photo Gallery & Sea Trials Library"));
      h3.appendChild(h3Left);

      var addPhotoBtn = createEl("button", { type: "button", className: "btn btn-primary btn-sm" });
      addPhotoBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:4px; vertical-align:middle;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg><span>+ Add Photo</span>';
      h3.appendChild(addPhotoBtn);
      s3.appendChild(h3);

      var pDesc = createEl("p", { style: { fontSize: "12.5px", color: "var(--text-muted)", marginBottom: "16px" } }, "Photos and video reels published on the public gallery page. Click \"+ Add Photo\" to upload local files or choose from existing assets.");
      s3.appendChild(pDesc);

      var galleryGrid = createEl("div", { className: "gallery-grid" });
      s3.appendChild(galleryGrid);

      function loadGalleryItems() {
        galleryGrid.innerHTML = '<div style="grid-column: 1 / -1; padding: 20px; text-align: center; color: var(--text-muted);">Loading gallery photos…</div>';
        window.SeagoStore.list("gallery_items", function(err, items){
          galleryGrid.innerHTML = "";
          if (!items || items.length === 0) {
            galleryGrid.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1; padding: 30px; text-align: center;"><p style="margin:0 0 10px;">No photos in gallery yet. Click "+ Add Photo" above to add your first photo.</p></div>';
            return;
          }

          items.forEach(function(item){
            var card = createEl("div", { className: "gallery-card" });
            var mediaWrap = createEl("div", { className: "gallery-media" });
            var mUrl = item.url || "assets/photos/Outboard Motors.webp";

            var img = createEl("img", { src: mUrl, alt: item.caption || "Photo" });
            mediaWrap.appendChild(img);

            var catBadge = createEl("span", { className: "gallery-badge" }, (item.category || "photo").toUpperCase());
            mediaWrap.appendChild(catBadge);
            card.appendChild(mediaWrap);

            var body = createEl("div", { className: "gallery-body", style: { padding: "12px" } });
            var caption = createEl("div", { className: "gallery-caption", style: { fontSize: "13px", fontWeight: "600", color: "var(--navy)", marginBottom: "10px", lineHeight: "1.3" } }, item.caption || "Untitled Photo");
            body.appendChild(caption);

            var footerRow = createEl("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px" } });
            var statusPill = createEl("span", {
              className: "badge " + (item.published ? "badge-success" : "badge-secondary"),
              style: { fontSize: "11px", padding: "2px 8px", cursor: "pointer" },
              title: "Click to toggle visibility"
            }, item.published ? "Published" : "Draft");

            statusPill.addEventListener("click", function(){
              item.published = !item.published;
              window.SeagoStore.save("gallery_items", item, function(){
                loadGalleryItems();
                showToast("Photo " + (item.published ? "published" : "set to draft"), "info");
              });
            });

            var btnGroup = createEl("div", { style: { display: "flex", gap: "6px" } });
            var editBtn = createEl("button", { type: "button", className: "btn btn-secondary btn-sm", style: { padding: "4px 8px", fontSize: "11px" } }, "Edit");
            editBtn.addEventListener("click", function(){
              openGalleryPhotoModal(item, loadGalleryItems);
            });

            var delBtn = createEl("button", { type: "button", className: "btn btn-secondary btn-sm", style: { padding: "4px 8px", fontSize: "11px", color: "var(--danger)" }, title: "Delete Photo" }, "Delete");
            delBtn.addEventListener("click", function(){
              openModal({
                title: "Delete Gallery Photo?",
                bodyText: "Are you sure you want to remove \"" + (item.caption || "this photo") + "\" from the gallery?",
                confirmLabel: "Delete Photo",
                danger: true,
                onConfirm: function(){
                  window.SeagoStore.delete("gallery_items", item.id, function(){
                    loadGalleryItems();
                    showToast("Photo deleted from gallery", "info");
                  });
                }
              });
            });

            btnGroup.appendChild(editBtn);
            btnGroup.appendChild(delBtn);
            footerRow.appendChild(statusPill);
            footerRow.appendChild(btnGroup);
            body.appendChild(footerRow);

            card.appendChild(body);
            galleryGrid.appendChild(card);
          });
        });
      }

      addPhotoBtn.addEventListener("click", function(){
        openGalleryPhotoModal(null, loadGalleryItems);
      });

      loadGalleryItems();
      form.appendChild(s3);

      // Section 4: Bottom CTA Banner
      var s4 = createEl("div", { className: "cms-section-card" });
      var h4 = createEl("div", { className: "cms-section-header" });
      var h4Left = createEl("div", { className: "cms-section-title-wrap" });
      h4Left.appendChild(createEl("span", { className: "cms-section-number" }, "4"));
      h4Left.appendChild(createEl("h3", { className: "cms-section-title" }, "Bottom Call-To-Action Banner"));
      h4.appendChild(h4Left);
      s4.appendChild(h4);

      var rCtaBan = createEl("div", { className: "form-row" });
      var gCtaTitle = createEl("div", { className: "form-group" });
      gCtaTitle.appendChild(createEl("label", null, "Banner Title"));
      var inpCtaTitle = createEl("input", { type: "text", value: page.cta_banner_title || "Put a Seagö on your boat" });
      gCtaTitle.appendChild(inpCtaTitle);
      var gCtaBtn = createEl("div", { className: "form-group" });
      gCtaBtn.appendChild(createEl("label", null, "Button Label"));
      var inpCtaBtn = createEl("input", { type: "text", value: page.cta_banner_btn || "Request a Quote" });
      gCtaBtn.appendChild(inpCtaBtn);
      rCtaBan.appendChild(gCtaTitle);
      rCtaBan.appendChild(gCtaBtn);
      s4.appendChild(rCtaBan);

      var gCtaText = createEl("div", { className: "form-group" });
      gCtaText.appendChild(createEl("label", null, "Banner Subtext"));
      var inpCtaText = createEl("textarea", { rows: "2" }, page.cta_banner_text || "Tell us your boat size, use case, and timeline — we'll get back to you with a configuration and quote within one business day.");
      gCtaText.appendChild(inpCtaText);
      s4.appendChild(gCtaText);
      form.appendChild(s4);

      // Section 5: SEO
      var s5 = createEl("div", { className: "cms-section-card" });
      var h5 = createEl("div", { className: "cms-section-header" });
      var h5Left = createEl("div", { className: "cms-section-title-wrap" });
      h5Left.appendChild(createEl("span", { className: "cms-section-number" }, "5"));
      h5Left.appendChild(createEl("h3", { className: "cms-section-title" }, "SEO Metadata"));
      h5.appendChild(h5Left);
      s5.appendChild(h5);

      var gMeta = createEl("div", { className: "form-group" });
      gMeta.appendChild(createEl("label", null, "Google Search Meta Description"));
      var inpMeta = createEl("textarea", { rows: "2" }, page.meta_desc || "");
      gMeta.appendChild(inpMeta);
      s5.appendChild(gMeta);
      form.appendChild(s5);

      // Submit Bar
      var actions = createEl("div", { className: "form-actions" });
      var cancel = createEl("a", { className: "btn btn-secondary", href: "#/dashboard" }, "Cancel");
      var save = createEl("button", { type: "submit", className: "btn btn-primary" }, "Save Gallery Changes");
      actions.appendChild(cancel);
      actions.appendChild(save);
      form.appendChild(actions);

      form.addEventListener("input", function(){ isDirty = true; });

      form.addEventListener("submit", function(e){
        e.preventDefault();
        page.badge = inpBadge.value.trim();
        page.headline = inpHead.value.trim();
        page.subheadline = inpSub.value.trim();
        page.sea_trials_eyebrow = inpStEye.value.trim();
        page.sea_trials_title = inpStTitle.value.trim();
        page.sea_trials_desc = inpStDesc.value.trim();
        page.tourism_eyebrow = inpTrEye.value.trim();
        page.tourism_title = inpTrTitle.value.trim();
        page.tourism_desc = inpTrDesc.value.trim();
        page.field_eyebrow = inpFfEye.value.trim();
        page.field_title = inpFfTitle.value.trim();
        page.field_desc = inpFfDesc.value.trim();
        page.fleet_eyebrow = inpFlEye.value.trim();
        page.fleet_title = inpFlTitle.value.trim();
        page.fleet_desc = inpFlDesc.value.trim();
        page.cta_banner_title = inpCtaTitle.value.trim();
        page.cta_banner_text = inpCtaText.value.trim();
        page.cta_banner_btn = inpCtaBtn.value.trim();
        page.meta_desc = inpMeta.value.trim();
        savePageData(page);
      });

      formCard.appendChild(form);
      pageRoot.appendChild(formCard);
    });
  }

  // 6. TECH & ECONOMICS PAGE CMS (know-more.html)
  function renderKnowMorePageEditor() {
    pageRoot.innerHTML = "";
    loadPageData("know_more", function(err, page){
      if (!page) return;

      var form = createEl("form", { novalidate: "novalidate" });
      var header = createPageHeader("Technology & Economics (Know-More)", "know-more.html", function(){
        if (typeof form.requestSubmit === "function") {
          form.requestSubmit();
        } else {
          form.dispatchEvent(new Event("submit", { cancelable: true }));
        }
      });
      pageRoot.appendChild(header);

      var formCard = createEl("div", { className: "form-card" });

      // Section 1: Hero
      var s1 = createEl("div", { className: "cms-section-card" });
      var h1 = createEl("div", { className: "cms-section-header" });
      var h1Left = createEl("div", { className: "cms-section-title-wrap" });
      h1Left.appendChild(createEl("span", { className: "cms-section-number" }, "1"));
      h1Left.appendChild(createEl("h3", { className: "cms-section-title" }, "Tech Page Hero"));
      h1.appendChild(h1Left);
      s1.appendChild(h1);

      var gBadge = createEl("div", { className: "form-group" });
      gBadge.appendChild(createEl("label", null, "Hero Badge"));
      var inpBadge = createEl("input", { type: "text", value: page.badge || "" });
      gBadge.appendChild(inpBadge);
      s1.appendChild(gBadge);

      var gHead = createEl("div", { className: "form-group" });
      gHead.appendChild(createEl("label", null, "Main Headline"));
      var inpHead = createEl("input", { type: "text", value: page.headline || "" });
      gHead.appendChild(inpHead);
      s1.appendChild(gHead);

      var gSub = createEl("div", { className: "form-group" });
      gSub.appendChild(createEl("label", null, "Subheadline"));
      var inpSub = createEl("textarea", { rows: "3" }, page.subheadline || "");
      gSub.appendChild(inpSub);
      s1.appendChild(gSub);
      form.appendChild(s1);

      // Section 2: Economics & TCO Breakdown
      var s2 = createEl("div", { className: "cms-section-card" });
      var h2 = createEl("div", { className: "cms-section-header" });
      var h2Left = createEl("div", { className: "cms-section-title-wrap" });
      h2Left.appendChild(createEl("span", { className: "cms-section-number" }, "2"));
      h2Left.appendChild(createEl("h3", { className: "cms-section-title" }, "Total Cost of Ownership (TCO) Parameters"));
      h2.appendChild(h2Left);
      s2.appendChild(h2);

      var rEco1 = createEl("div", { className: "form-row" });
      var gFuelStat = createEl("div", { className: "form-group" });
      gFuelStat.appendChild(createEl("label", null, "Fuel & Lube Savings Ratio"));
      var inpFuelStat = createEl("input", { type: "text", value: page.fuel_saving_stat || "" });
      gFuelStat.appendChild(inpFuelStat);
      var gPayback = createEl("div", { className: "form-group" });
      gPayback.appendChild(createEl("label", null, "Payback Period"));
      var inpPayback = createEl("input", { type: "text", value: page.payback_period || "" });
      gPayback.appendChild(inpPayback);
      rEco1.appendChild(gFuelStat);
      rEco1.appendChild(gPayback);
      s2.appendChild(rEco1);

      var rEco2 = createEl("div", { className: "form-row" });
      var gMaint = createEl("div", { className: "form-group" });
      gMaint.appendChild(createEl("label", null, "Maintenance Savings Narrative"));
      var inpMaint = createEl("input", { type: "text", value: page.maintenance_savings || "" });
      gMaint.appendChild(inpMaint);
      var gEmiss = createEl("div", { className: "form-group" });
      gEmiss.appendChild(createEl("label", null, "Annual CO2 Avoidance per Craft"));
      var inpEmiss = createEl("input", { type: "text", value: page.emissions_reduction || "" });
      gEmiss.appendChild(inpEmiss);
      rEco2.appendChild(gMaint);
      rEco2.appendChild(gEmiss);
      s2.appendChild(rEco2);
      form.appendChild(s2);

      // Section 3: SEO
      var s3 = createEl("div", { className: "cms-section-card" });
      var gMeta = createEl("div", { className: "form-group" });
      gMeta.appendChild(createEl("label", null, "Google Search Meta Description"));
      var inpMeta = createEl("textarea", { rows: "2" }, page.meta_desc || "");
      gMeta.appendChild(inpMeta);
      s3.appendChild(gMeta);
      form.appendChild(s3);

      // Submit Bar
      var actions = createEl("div", { className: "form-actions" });
      var cancel = createEl("a", { className: "btn btn-secondary", href: "#/dashboard" }, "Cancel");
      var save = createEl("button", { type: "submit", className: "btn btn-primary" }, "Save Tech Page Changes");
      actions.appendChild(cancel);
      actions.appendChild(save);
      form.appendChild(actions);

      form.addEventListener("input", function(){ isDirty = true; });

      form.addEventListener("submit", function(e){
        e.preventDefault();
        page.badge = inpBadge.value.trim();
        page.headline = inpHead.value.trim();
        page.subheadline = inpSub.value.trim();
        page.fuel_saving_stat = inpFuelStat.value.trim();
        page.payback_period = inpPayback.value.trim();
        page.maintenance_savings = inpMaint.value.trim();
        page.emissions_reduction = inpEmiss.value.trim();
        page.meta_desc = inpMeta.value.trim();
        savePageData(page);
      });

      formCard.appendChild(form);
      pageRoot.appendChild(formCard);
    });
  }

  // 7. CONTACT & SHOWROOMS PAGE CMS (contact.html)
  function renderContactPageEditor() {
    pageRoot.innerHTML = "";
    loadPageData("contact", function(err, page){
      if (!page) return;

      var form = createEl("form", { novalidate: "novalidate" });
      var header = createPageHeader("Contact & Showrooms", "contact.html", function(){
        if (typeof form.requestSubmit === "function") {
          form.requestSubmit();
        } else {
          form.dispatchEvent(new Event("submit", { cancelable: true }));
        }
      });
      pageRoot.appendChild(header);

      var formCard = createEl("div", { className: "form-card" });

      // Section 1: Hero
      var s1 = createEl("div", { className: "cms-section-card" });
      var h1 = createEl("div", { className: "cms-section-header" });
      var h1Left = createEl("div", { className: "cms-section-title-wrap" });
      h1Left.appendChild(createEl("span", { className: "cms-section-number" }, "1"));
      h1Left.appendChild(createEl("h3", { className: "cms-section-title" }, "Contact Page Hero"));
      h1.appendChild(h1Left);
      s1.appendChild(h1);

      var gBadge = createEl("div", { className: "form-group" });
      gBadge.appendChild(createEl("label", null, "Hero Badge"));
      var inpBadge = createEl("input", { type: "text", value: page.badge || "CONTACT" });
      gBadge.appendChild(inpBadge);
      s1.appendChild(gBadge);

      var gHead = createEl("div", { className: "form-group" });
      gHead.appendChild(createEl("label", null, "Headline"));
      var inpHead = createEl("input", { type: "text", value: page.headline || "Get in touch" });
      gHead.appendChild(inpHead);
      s1.appendChild(gHead);

      var gSub = createEl("div", { className: "form-group" });
      gSub.appendChild(createEl("label", null, "Subheadline"));
      var inpSub = createEl("textarea", { rows: "2" }, page.subheadline || "");
      gSub.appendChild(inpSub);
      s1.appendChild(gSub);
      form.appendChild(s1);

      // Section 2: Get In Touch Narrative
      var s2 = createEl("div", { className: "cms-section-card" });
      var h2 = createEl("div", { className: "cms-section-header" });
      var h2Left = createEl("div", { className: "cms-section-title-wrap" });
      h2Left.appendChild(createEl("span", { className: "cms-section-number" }, "2"));
      h2Left.appendChild(createEl("h3", { className: "cms-section-title" }, "Get In Touch Overview Card"));
      h2.appendChild(h2Left);
      s2.appendChild(h2);

      var rInfoHead = createEl("div", { className: "form-row" });
      var gInfoEye = createEl("div", { className: "form-group" });
      gInfoEye.appendChild(createEl("label", null, "Eyebrow"));
      var inpInfoEye = createEl("input", { type: "text", value: page.info_eyebrow || "GET IN TOUCH" });
      gInfoEye.appendChild(inpInfoEye);
      var gInfoTitle = createEl("div", { className: "form-group" });
      gInfoTitle.appendChild(createEl("label", null, "Heading"));
      var inpInfoTitle = createEl("input", { type: "text", value: page.info_title || "We'd love to hear about your project" });
      gInfoTitle.appendChild(inpInfoTitle);
      rInfoHead.appendChild(gInfoEye);
      rInfoHead.appendChild(gInfoTitle);
      s2.appendChild(rInfoHead);

      var gInfoDesc = createEl("div", { className: "form-group" });
      gInfoDesc.appendChild(createEl("label", null, "Overview Description"));
      var inpInfoDesc = createEl("textarea", { rows: "3" }, page.info_desc || "Whether you're outfitting a single boat or building out a fleet, our team can help you find the right motor, battery, and configuration for the water you operate in.");
      gInfoDesc.appendChild(inpInfoDesc);
      s2.appendChild(gInfoDesc);
      form.appendChild(s2);

      // Section 3: Direct Hotlines & Channels
      var s3 = createEl("div", { className: "cms-section-card" });
      var h3 = createEl("div", { className: "cms-section-header" });
      var h3Left = createEl("div", { className: "cms-section-title-wrap" });
      h3Left.appendChild(createEl("span", { className: "cms-section-number" }, "3"));
      h3Left.appendChild(createEl("h3", { className: "cms-section-title" }, "Direct Hotlines & Inquiries"));
      h3.appendChild(h3Left);
      s3.appendChild(h3);

      var rChans = createEl("div", { className: "form-row" });
      var gMail = createEl("div", { className: "form-group" });
      gMail.appendChild(createEl("label", null, "Commercial Sales Email"));
      var inpMail = createEl("input", { type: "email", value: page.sales_email || "sales@seago.in" });
      gMail.appendChild(inpMail);
      var gPhone = createEl("div", { className: "form-group" });
      gPhone.appendChild(createEl("label", null, "Support Phone Hotline"));
      var inpPhone = createEl("input", { type: "text", value: page.support_phone || "+91 86063 66633" });
      gPhone.appendChild(inpPhone);
      var gWa = createEl("div", { className: "form-group" });
      gWa.appendChild(createEl("label", null, "WhatsApp Hotline"));
      var inpWa = createEl("input", { type: "text", value: page.whatsapp_number || "+91 86063 66633" });
      gWa.appendChild(inpWa);
      rChans.appendChild(gMail);
      rChans.appendChild(gPhone);
      rChans.appendChild(gWa);
      s3.appendChild(rChans);
      form.appendChild(s3);

      // Section 4: Physical Facilities & Hours
      var s4 = createEl("div", { className: "cms-section-card" });
      var h4 = createEl("div", { className: "cms-section-header" });
      var h4Left = createEl("div", { className: "cms-section-title-wrap" });
      h4Left.appendChild(createEl("span", { className: "cms-section-number" }, "4"));
      h4Left.appendChild(createEl("h3", { className: "cms-section-title" }, "Showroom & Manufacturing Facilities"));
      h4.appendChild(h4Left);
      s4.appendChild(h4);

      var gAddr1 = createEl("div", { className: "form-group" });
      gAddr1.appendChild(createEl("label", null, "Kerala Sales Office & Showroom"));
      var inpAddr1 = createEl("textarea", { rows: "2" }, page.sales_address || "GG Plaza, NH-66, Lalaji Junction,\nKarunagappally, Kollam – 690518, Kerala, India");
      gAddr1.appendChild(inpAddr1);
      s4.appendChild(gAddr1);

      var gAddr2 = createEl("div", { className: "form-group" });
      gAddr2.appendChild(createEl("label", null, "Chennai Propulsion Manufacturing Plant"));
      var inpAddr2 = createEl("textarea", { rows: "2" }, page.manufacturing_address || "Chennai, Tamil Nadu, India");
      gAddr2.appendChild(inpAddr2);
      s4.appendChild(gAddr2);

      var rHours = createEl("div", { className: "form-row" });
      var gHours = createEl("div", { className: "form-group" });
      gHours.appendChild(createEl("label", null, "Working Hours & Schedule"));
      var inpHours = createEl("input", { type: "text", value: page.hours || "Monday – Saturday: 9:00 AM – 6:00 PM IST" });
      gHours.appendChild(inpHours);
      var gResp = createEl("div", { className: "form-group" });
      gResp.appendChild(createEl("label", null, "Response SLA"));
      var inpResp = createEl("input", { type: "text", value: page.response_time || "Under 24 hours turnaround for commercial inquiries" });
      gResp.appendChild(inpResp);
      rHours.appendChild(gHours);
      rHours.appendChild(gResp);
      s4.appendChild(rHours);
      form.appendChild(s4);

      // Section 5: Web3Forms Quote Form Settings
      var s5 = createEl("div", { className: "cms-section-card" });
      var h5 = createEl("div", { className: "cms-section-header" });
      var h5Left = createEl("div", { className: "cms-section-title-wrap" });
      h5Left.appendChild(createEl("span", { className: "cms-section-number" }, "5"));
      h5Left.appendChild(createEl("h3", { className: "cms-section-title" }, "Request a Quote Form Settings"));
      h5.appendChild(h5Left);
      s5.appendChild(h5);

      var rFormHead = createEl("div", { className: "form-row" });
      var gFTitle = createEl("div", { className: "form-group" });
      gFTitle.appendChild(createEl("label", null, "Form Card Heading"));
      var inpFTitle = createEl("input", { type: "text", value: page.form_title || "Request a Quote" });
      gFTitle.appendChild(inpFTitle);
      var gFSub = createEl("div", { className: "form-group" });
      gFSub.appendChild(createEl("label", null, "Form Card Subtitle"));
      var inpFSub = createEl("input", { type: "text", value: page.form_subtitle || "Fill in your details and our team will get back to you with pricing, specs, and lead time." });
      gFSub.appendChild(inpFSub);
      rFormHead.appendChild(gFTitle);
      rFormHead.appendChild(gFSub);
      s5.appendChild(rFormHead);

      var rFormKeys = createEl("div", { className: "form-row" });
      var gFKey = createEl("div", { className: "form-group" });
      gFKey.appendChild(createEl("label", null, "Web3Forms Access Key"));
      var inpFKey = createEl("input", { type: "text", value: page.web3forms_key || "12fe7002-524c-4c4c-a9c9-cd31891d7432" });
      gFKey.appendChild(inpFKey);
      var gFSubj = createEl("div", { className: "form-group" });
      gFSubj.appendChild(createEl("label", null, "Email Notification Subject"));
      var inpFSubj = createEl("input", { type: "text", value: page.form_subject || "New Quote Request — Seagö Website" });
      gFSubj.appendChild(inpFSubj);
      rFormKeys.appendChild(gFKey);
      rFormKeys.appendChild(gFSubj);
      s5.appendChild(rFormKeys);
      form.appendChild(s5);

      // Section 6: SEO
      var s6 = createEl("div", { className: "cms-section-card" });
      var h6 = createEl("div", { className: "cms-section-header" });
      var h6Left = createEl("div", { className: "cms-section-title-wrap" });
      h6Left.appendChild(createEl("span", { className: "cms-section-number" }, "6"));
      h6Left.appendChild(createEl("h3", { className: "cms-section-title" }, "SEO Search Metadata"));
      h6.appendChild(h6Left);
      s6.appendChild(h6);

      var gMeta = createEl("div", { className: "form-group" });
      gMeta.appendChild(createEl("label", null, "Google Search Meta Description"));
      var inpMeta = createEl("textarea", { rows: "2" }, page.meta_desc || "");
      gMeta.appendChild(inpMeta);
      s6.appendChild(gMeta);
      form.appendChild(s6);

      // Submit Bar
      var actions = createEl("div", { className: "form-actions" });
      var cancel = createEl("a", { className: "btn btn-secondary", href: "#/dashboard" }, "Cancel");
      var save = createEl("button", { type: "submit", className: "btn btn-primary" }, "Save Contact Changes");
      actions.appendChild(cancel);
      actions.appendChild(save);
      form.appendChild(actions);

      form.addEventListener("input", function(){ isDirty = true; });

      form.addEventListener("submit", function(e){
        e.preventDefault();
        page.badge = inpBadge.value.trim();
        page.headline = inpHead.value.trim();
        page.subheadline = inpSub.value.trim();
        page.info_eyebrow = inpInfoEye.value.trim();
        page.info_title = inpInfoTitle.value.trim();
        page.info_desc = inpInfoDesc.value.trim();
        page.sales_email = inpMail.value.trim();
        page.support_phone = inpPhone.value.trim();
        page.whatsapp_number = inpWa.value.trim();
        page.sales_address = inpAddr1.value.trim();
        page.manufacturing_address = inpAddr2.value.trim();
        page.hours = inpHours.value.trim();
        page.response_time = inpResp.value.trim();
        page.form_title = inpFTitle.value.trim();
        page.form_subtitle = inpFSub.value.trim();
        page.web3forms_key = inpFKey.value.trim();
        page.form_subject = inpFSubj.value.trim();
        page.meta_desc = inpMeta.value.trim();
        savePageData(page);
      });

      formCard.appendChild(form);
      pageRoot.appendChild(formCard);
    });
  }

  // ================= 13.6 SCREEN: DIGITAL ASSET MANAGER (DAM) =================
  function renderMediaLibrary() {
    pageRoot.innerHTML = "";
    var wrap = createEl("div");

    var header = createEl("div", { className: "page-header" });
    var info = createEl("div", { className: "page-header-info" });
    info.appendChild(createEl("h1", { className: "page-header-title" }, "Digital Asset Manager (DAM)"));
    info.appendChild(createEl("p", { className: "page-header-sub" }, "Browse, upload, and copy URLs for catalog PDFs, product imagery, and diagrams."));
    header.appendChild(info);

    var headerActions = createEl("div", { className: "page-header-actions" });
    var uploadFileBtn = createEl("button", { type: "button", className: "btn btn-primary" }, "+ Upload New File");
    headerActions.appendChild(uploadFileBtn);
    header.appendChild(headerActions);
    wrap.appendChild(header);

    // Hidden file input for header upload button
    var damFileInput = createEl("input", { type: "file", accept: "application/pdf,image/*", style: { display: "none" } });
    wrap.appendChild(damFileInput);
    uploadFileBtn.addEventListener("click", function(){ damFileInput.click(); });

    // Drag-and-drop dropzone
    var dropzone = createEl("div", { className: "dam-upload-dropzone" });
    dropzone.innerHTML = '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>' +
      '<div style="font-size:14px;font-weight:600;margin-top:8px;color:var(--navy);">Drop PDF Datasheets or Imagery to Upload</div>' +
      '<p>Files are stored in local browser database and ready for 1-click URL copying</p>';
    dropzone.addEventListener("click", function(){ damFileInput.click(); });
    wrap.appendChild(dropzone);

    // Toolbar (Search + Category Filter Chips)
    var toolbar = createEl("div", { className: "dam-toolbar" });
    var filtersWrap = createEl("div", { className: "dam-filters" });
    var filterCategories = ["All", "Datasheets", "Imagery", "Case Studies", "Branding"];
    var currentCat = "All";
    var currentSearch = "";

    var searchBox = createEl("div", { className: "search-box", style: { maxWidth: "260px" } });
    var searchIcon = createEl("span", { className: "search-box-icon" });
    searchIcon.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
    var searchInp = createEl("input", { type: "text", placeholder: "Search assets…" });
    searchBox.appendChild(searchIcon);
    searchBox.appendChild(searchInp);

    var assetGrid = createEl("div", { className: "asset-grid" });

    function loadAndRenderAssets() {
      window.SeagoStore.list("assets", function(err, assets){
        var list = assets || [];
        if (list.length === 0 && window.SEAGO_FACTORY_SEED && window.SEAGO_FACTORY_SEED.assets) {
          list = window.SEAGO_FACTORY_SEED.assets;
        }

        var filtered = list.filter(function(a){
          var matchesCat = (currentCat === "All") || (a.category === currentCat);
          var matchesSearch = !currentSearch || (a.name.toLowerCase().indexOf(currentSearch.toLowerCase()) !== -1) || (a.url.toLowerCase().indexOf(currentSearch.toLowerCase()) !== -1);
          return matchesCat && matchesSearch;
        });

        assetGrid.innerHTML = "";
        if (filtered.length === 0) {
          var empty = createEl("div", { style: { gridColumn: "1/-1", textAlign: "center", padding: "40px", color: "var(--text-muted)" } }, "No digital assets found matching filters.");
          assetGrid.appendChild(empty);
          return;
        }

        filtered.forEach(function(asset){
          var card = createEl("div", { className: "asset-card" });
          
          var thumbWrap = createEl("div", { className: "asset-card-thumb-wrap" });
          if (asset.kind === "image" || /\.(png|jpe?g|webp|avif)$/i.test(asset.url)) {
            var img = createEl("img", { className: "asset-card-img", src: asset.url, alt: asset.name });
            thumbWrap.appendChild(img);
          } else {
            var pdfIcon = createEl("div", { className: "asset-card-icon-pdf" });
            pdfIcon.innerHTML = '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
            thumbWrap.appendChild(pdfIcon);
          }
          var badge = createEl("span", { className: "asset-card-badge" }, asset.category || (asset.kind === "pdf" ? "PDF" : "Image"));
          thumbWrap.appendChild(badge);
          card.appendChild(thumbWrap);

          var body = createEl("div", { className: "asset-card-body" });
          var name = createEl("h4", { className: "asset-card-name", title: asset.name }, asset.name);
          var meta = createEl("div", { className: "asset-card-meta" });
          var sizeStr = asset.size ? (Math.round(asset.size / 1024) + " KB") : "Standard";
          meta.textContent = sizeStr + " · " + (asset.url.indexOf("data:") === 0 ? "Uploaded File" : asset.url);
          body.appendChild(name);
          body.appendChild(meta);

          var actions = createEl("div", { className: "asset-card-actions" });
          var copyBtn = createEl("button", { type: "button", className: "btn btn-secondary btn-sm", style: { flex: "1" } }, "Copy URL");
          copyBtn.addEventListener("click", function(){
            copyToClipboard(asset.url, function(ok){
              if (ok) {
                showToast("Copied to clipboard: " + asset.url, "success");
              } else {
                prompt("Copy file URL:", asset.url);
              }
            });
          });

          var openBtn = createEl("a", { className: "btn btn-outline-topbar btn-sm", href: asset.url, target: "_blank", rel: "noopener", title: "Open in new tab" });
          openBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
          
          var delBtn = createEl("button", { type: "button", className: "btn btn-secondary btn-sm", style: { color: "var(--danger)" }, title: "Delete Asset" }, "×");
          delBtn.addEventListener("click", function(){
            openModal({
              title: "Delete Asset",
              bodyText: "Are you sure you want to remove '" + asset.name + "' from the Asset Manager?",
              danger: true,
              confirmLabel: "Delete File",
              onConfirm: function(){
                window.SeagoStore.remove("assets", asset.id, function(err2){
                  if (!err2) {
                    showToast("Asset removed", "info");
                    loadAndRenderAssets();
                    updateSidebarBadges();
                  }
                });
              }
            });
          });

          actions.appendChild(copyBtn);
          actions.appendChild(openBtn);
          actions.appendChild(delBtn);
          body.appendChild(actions);
          card.appendChild(body);

          assetGrid.appendChild(card);
        });
      });
    }

    filterCategories.forEach(function(cat){
      var chip = createEl("button", {
        type: "button",
        className: "dam-filter-chip" + (cat === currentCat ? " is-active" : "")
      }, cat);
      chip.addEventListener("click", function(){
        currentCat = cat;
        var allChips = filtersWrap.querySelectorAll(".dam-filter-chip");
        for (var ci = 0; ci < allChips.length; ci++) {
          allChips[ci].classList.remove("is-active");
        }
        chip.classList.add("is-active");
        loadAndRenderAssets();
      });
      filtersWrap.appendChild(chip);
    });

    toolbar.appendChild(filtersWrap);
    toolbar.appendChild(searchBox);
    wrap.appendChild(toolbar);
    wrap.appendChild(assetGrid);
    pageRoot.appendChild(wrap);

    searchInp.addEventListener("input", function(){
      currentSearch = searchInp.value.trim();
      loadAndRenderAssets();
    });

    function handleFileUpload(file) {
      if (!file) return;
      var isPdf = (file.type === "application/pdf") || /\.pdf$/i.test(file.name);
      var category = isPdf ? "Datasheets" : (/case/i.test(file.name) ? "Case Studies" : "Imagery");
      
      showToast("Uploading " + file.name + "…", "info");
      var reader = new FileReader();
      reader.onload = function(e){
        var newAsset = {
          id: "ast-" + Date.now(),
          name: file.name,
          url: e.target.result,
          kind: isPdf ? "pdf" : "image",
          size: file.size,
          category: category,
          updated_at: new Date().toISOString()
        };
        window.SeagoStore.save("assets", newAsset, function(err){
          if (!err) {
            showToast("Asset uploaded: " + file.name, "success");
            loadAndRenderAssets();
            updateSidebarBadges();
          } else {
            showToast("Upload error: " + err.message, "error");
          }
        });
      };
      reader.readAsDataURL(file);
    }

    damFileInput.addEventListener("change", function(){
      if (damFileInput.files && damFileInput.files[0]) {
        handleFileUpload(damFileInput.files[0]);
      }
    });

    dropzone.addEventListener("dragover", function(e){
      e.preventDefault();
      dropzone.style.borderColor = "var(--cyan)";
    });
    dropzone.addEventListener("dragleave", function(){
      dropzone.style.borderColor = "";
    });
    dropzone.addEventListener("drop", function(e){
      e.preventDefault();
      dropzone.style.borderColor = "";
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileUpload(e.dataTransfer.files[0]);
      }
    });

    loadAndRenderAssets();
  }

  // ================= 13.7 COMMAND PALETTE (CTRL+K) =================
  function initCommandPalette() {
    var dialog = document.getElementById("command-dialog");
    var backdrop = document.getElementById("commandBackdrop");
    var input = document.getElementById("commandInput");
    var results = document.getElementById("commandResults");
    var searchBtn = document.getElementById("topbarSearchBtn");
    var selectedIdx = 0;
    var matchedItems = [];

    function openPalette() {
      if (!dialog) return;
      dialog.style.display = "flex";
      selectedIdx = 0;
      if (input) {
        input.value = "";
        input.focus();
      }
      filterAndRender("");
    }

    function closePalette() {
      if (!dialog) return;
      dialog.style.display = "none";
    }

    if (backdrop) backdrop.addEventListener("click", closePalette);
    if (searchBtn) searchBtn.addEventListener("click", openPalette);

    function filterAndRender(query) {
      if (!results) return;
      var q = (query || "").toLowerCase();
      matchedItems = [];

      var staticCommands = [
        { title: "CMS Overview & All Pages", group: "Studio", tag: "Hub", route: "#/dashboard" },
        { title: "CRM & Customer Inquiries", group: "CRM", tag: "Inquiries", route: "#/crm" },
        { title: "WhatsApp & Unified Inbox", group: "CRM", tag: "Messages", route: "#/crm" },
        { title: "Lead Pipeline & Opportunities", group: "CRM", tag: "Pipeline", route: "#/crm" },
        { title: "Channel Integrations & Webhooks", group: "CRM", tag: "Config", route: "#/crm" },
        { title: "Home Page (index.html)", group: "Pages", tag: "Live CMS", route: "#/pages/home" },
        { title: "Products & Motors (products.html)", group: "Pages", tag: "Live CMS", route: "#/pages/products" },
        { title: "+ Add New Outboard Motor", group: "Actions", tag: "Create", route: "#/motors/new" },
        { title: "About & Leadership (about.html)", group: "Pages", tag: "Live CMS", route: "#/pages/about" },
        { title: "Field Case Studies (case-studies.html)", group: "Pages", tag: "Live CMS", route: "#/pages/case-studies" },
        { title: "Media Gallery (gallery.html)", group: "Pages", tag: "Live CMS", route: "#/pages/gallery" },
        { title: "Tech & Economics (know-more.html)", group: "Pages", tag: "Live CMS", route: "#/pages/know-more" },
        { title: "Contact & Showrooms (contact.html)", group: "Pages", tag: "Live CMS", route: "#/pages/contact" },
        { title: "Header & Footer Settings", group: "Global", tag: "Config", route: "#/site-settings" },
        { title: "Export & Data Backups", group: "System", tag: "Data", route: "#/data" }
      ];

      staticCommands.forEach(function(cmd){
        if (!q || cmd.title.toLowerCase().indexOf(q) !== -1 || cmd.group.toLowerCase().indexOf(q) !== -1 || cmd.tag.toLowerCase().indexOf(q) !== -1) {
          matchedItems.push(cmd);
        }
      });

      if (window.SeagoStore) {
        window.SeagoStore.list("motors", function(err, motors){
          if (!err && motors) {
            motors.forEach(function(m){
              var mTitle = m.title || ("Seagö " + m.hp + " HP Motor");
              if (!q || mTitle.toLowerCase().indexOf(q) !== -1 || (m.hp && String(m.hp).indexOf(q) !== -1) || (m.kw && m.kw.toLowerCase().indexOf(q) !== -1)) {
                matchedItems.push({
                  title: mTitle,
                  group: "Motors Catalog",
                  tag: m.hp + " HP",
                  route: "#/motors/edit/" + m.id
                });
              }
            });
          }
          renderMatchedList();
        });
      } else {
        renderMatchedList();
      }
    }

    function renderMatchedList() {
      results.innerHTML = "";
      if (matchedItems.length === 0) {
        results.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px;">No commands or records found.</div>';
        return;
      }

      if (selectedIdx >= matchedItems.length) selectedIdx = 0;
      if (selectedIdx < 0) selectedIdx = matchedItems.length - 1;

      matchedItems.forEach(function(item, idx){
        var row = createEl("div", {
          className: "command-item" + (idx === selectedIdx ? " is-selected" : "")
        });

        var left = createEl("div", { className: "command-item-left" });
        var icon = createEl("span", null, "→");
        var title = createEl("span", { style: { fontWeight: "600" } }, item.title);
        left.appendChild(icon);
        left.appendChild(title);

        var tag = createEl("span", { className: "command-item-tag" }, item.group + " · " + item.tag);
        row.appendChild(left);
        row.appendChild(tag);

        row.addEventListener("click", function(){
          window.location.hash = item.route;
          closePalette();
        });

        results.appendChild(row);
      });
    }

    if (input) {
      input.addEventListener("input", function(){
        selectedIdx = 0;
        filterAndRender(input.value.trim());
      });

      input.addEventListener("keydown", function(e){
        if (e.key === "ArrowDown") {
          e.preventDefault();
          selectedIdx++;
          renderMatchedList();
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          selectedIdx--;
          renderMatchedList();
        } else if (e.key === "Enter") {
          e.preventDefault();
          if (matchedItems[selectedIdx]) {
            window.location.hash = matchedItems[selectedIdx].route;
            closePalette();
          }
        } else if (e.key === "Escape") {
          closePalette();
        }
      });
    }
  }

  // Global Keyboard Shortcuts (Ctrl+K, Ctrl+S, Ctrl+P, Escape)
  window.addEventListener("keydown", function(e){
    if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.keyCode === 75)) {
      e.preventDefault();
      var cDlg = document.getElementById("command-dialog");
      if (cDlg && cDlg.style.display === "flex") {
        cDlg.style.display = "none";
      } else {
        var sBtn = document.getElementById("topbarSearchBtn");
        if (sBtn) sBtn.click();
      }
    } else if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.keyCode === 80)) {
      var pBtn = document.getElementById("btnTogglePreview");
      if (pBtn) {
        e.preventDefault();
        pBtn.click();
      }
    } else if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.keyCode === 83)) {
      var saveBtn = document.querySelector(".btn-primary[type='submit']") || document.getElementById("btnSaveMotor");
      if (saveBtn) {
        e.preventDefault();
        saveBtn.click();
      }
    } else if (e.key === "Escape") {
      var d = document.getElementById("command-dialog");
      if (d) d.style.display = "none";
      closePreviewDrawer();
      closeModal();
    }
  });

  // ================= 14. BOOTSTRAP =================
  function init() {
    initCommandPalette();
    checkAuth();
    if (isAuthenticated()) {
      handleRouting();
      updateSidebarBadges();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
