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

    var header = createEl("div", { className: "page-header" });
    var info = createEl("div", { className: "page-header-info" });
    info.appendChild(createEl("h1", { className: "page-header-title" }, "Seagö CMS Studio · Website Pages"));
    info.appendChild(createEl("p", { className: "page-header-sub" }, "Live content management for all 7 public website pages. Edit headlines, copy, propulsion parameters, photos, or hotlines."));
    header.appendChild(info);

    var headerActions = createEl("div", { className: "page-header-actions" });
    var liveBtn = createEl("a", { className: "btn btn-outline-topbar", href: "index.html", target: "_blank", rel: "noopener" }, "↗ View Public Website");
    var backupBtn = createEl("a", { className: "btn btn-secondary", href: "#/data" }, "💾 Backups");
    headerActions.appendChild(liveBtn);
    headerActions.appendChild(backupBtn);
    header.appendChild(headerActions);
    wrap.appendChild(header);

    // All 7 Pages CMS Grid
    var hubGrid = createEl("div", { className: "cms-page-hub" });

    var websitePages = [
      {
        icon: "🏠",
        title: "Home Page",
        file: "index.html",
        route: "#/pages/home",
        desc: "Hero announcement banner, 4 headline metrics (3–50 HP, 80% fuel savings, zero emissions), deployment partners ticker, and commercial fleet CTA."
      },
      {
        icon: "⚡",
        title: "Products & Motors",
        file: "products.html",
        route: "#/pages/products",
        desc: "Outboard Motors catalog (3–50 HP models, power kW, RPM, cooling, PDF datasheets), marine LiFePO4 battery packs, and custom electric boats."
      },
      {
        icon: "ℹ️",
        title: "About & Leadership",
        file: "about.html",
        route: "#/pages/about",
        desc: "Decarbonization mission, Chennai manufacturing plant credentials, Kollam watercraft trial operations, PMSM motors, and Founder profile."
      },
      {
        icon: "🚢",
        title: "Field Case Studies",
        file: "case-studies.html",
        route: "#/pages/case-studies",
        desc: "ICAR-CIFT Vikalpika solar fishing boat, Kerala SWTD passenger ferries, Karnataka eco-tourism safari, and hydrogen fuel cell prototypes."
      },
      {
        icon: "📸",
        title: "Media Gallery",
        file: "gallery.html",
        route: "#/pages/gallery",
        desc: "High-resolution sea trials footage, factory component assembly photos, and YouTube video embed links."
      },
      {
        icon: "💡",
        title: "Tech & Economics",
        file: "know-more.html",
        route: "#/pages/know-more",
        desc: "Total Cost of Ownership (TCO) calculator, commercial fuel savings vs. 2-stroke petrol engines, and Indian maritime environmental metrics."
      },
      {
        icon: "📞",
        title: "Contact & Showroom",
        file: "contact.html",
        route: "#/pages/contact",
        desc: "Direct sales inquiries, Kerala showroom address, Chennai manufacturing plant details, WhatsApp chat hotline, and workshop hours."
      }
    ];

    websitePages.forEach(function(p){
      var card = createEl("div", { className: "cms-page-card" });

      var cardTop = createEl("div");
      var headWrap = createEl("div", { className: "cms-page-header" });
      var titleWrap = createEl("div", { className: "cms-page-title-wrap" });
      var iconEl = createEl("span", { className: "cms-page-icon-lg" }, p.icon);
      var titleBox = createEl("div");
      var titleEl = createEl("h3", { className: "cms-page-title" }, p.title);
      var slugEl = createEl("div", { className: "cms-page-slug" }, p.file);
      titleBox.appendChild(titleEl);
      titleBox.appendChild(slugEl);
      titleWrap.appendChild(iconEl);
      titleWrap.appendChild(titleBox);

      var statusPill = createEl("div", { className: "cms-status-pill" });
      var dot = createEl("span", { className: "cms-status-dot" });
      var statusTxt = createEl("span", null, "Live & Published");
      statusPill.appendChild(dot);
      statusPill.appendChild(statusTxt);

      headWrap.appendChild(titleWrap);
      headWrap.appendChild(statusPill);
      cardTop.appendChild(headWrap);

      var descEl = createEl("p", { className: "cms-page-desc" }, p.desc);
      cardTop.appendChild(descEl);
      card.appendChild(cardTop);

      var cardFooter = createEl("div", { className: "cms-page-footer" });
      var viewLink = createEl("a", { className: "btn btn-secondary btn-sm", href: p.file, target: "_blank", rel: "noopener" }, "↗ View Page");
      var editLink = createEl("a", { className: "btn btn-primary btn-sm", href: p.route }, "✎ Edit Page Content →");
      cardFooter.appendChild(viewLink);
      cardFooter.appendChild(editLink);
      card.appendChild(cardFooter);

      hubGrid.appendChild(card);
    });

    wrap.appendChild(hubGrid);

    // Bottom Two Columns: Global Settings Card + Quick Links
    var bottomCols = createEl("div", { className: "dash-columns", style: { marginTop: "28px" } });

    var globalCard = createEl("div", { className: "form-card" });
    globalCard.appendChild(createEl("h3", { className: "form-section__title" }, "Global Site Elements"));
    globalCard.appendChild(createEl("p", { className: "form-section__desc" }, "Configure sitewide navigation menus, footer legal notices, and official brand assets."));

    var globalBtns = createEl("div", { style: { display: "flex", gap: "10px", marginTop: "16px", flexWrap: "wrap" } });
    var setBtn = createEl("a", { className: "btn btn-secondary", href: "#/site-settings" }, "⚙ Edit Header, Footer & Social Links");
    var backupBtn2 = createEl("a", { className: "btn btn-secondary", href: "#/data" }, "💾 Export JSON Catalog Backup");
    globalBtns.appendChild(setBtn);
    globalBtns.appendChild(backupBtn2);
    globalCard.appendChild(globalBtns);

    var activityCard = createEl("div", { className: "form-card" });
    activityCard.appendChild(createEl("h3", { className: "form-section__title" }, "Propulsion Lineup Status"));
    activityCard.appendChild(createEl("p", { className: "form-section__desc" }, "Active engineering models deployed in the Products & Motors page."));

    var motorSummary = createEl("div", { style: { display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "16px" } });
    var hps = [3, 7, 10, 15, 20, 30, 40, 50];
    hps.forEach(function(hp){
      var pill = createEl("a", {
        className: "badge badge-success",
        style: { textDecoration: "none", padding: "6px 12px", fontSize: "12px" },
        href: "#/motors/edit/motor-" + hp + "hp"
      }, "Seagö " + hp + " HP");
      motorSummary.appendChild(pill);
    });
    activityCard.appendChild(motorSummary);

    bottomCols.appendChild(globalCard);
    bottomCols.appendChild(activityCard);
    wrap.appendChild(bottomCols);

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
      { id: "datasheet", label: "Datasheet & AI Auto-Detect" },
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

    var chooseAssetImgBtn = createEl("button", { type: "button", className: "btn btn-sm btn-secondary", style: { marginTop: "6px" } }, "📁 Choose from Asset Manager");
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
    var chooseAssetPdfBtn = createEl("button", { type: "button", className: "btn btn-sm btn-secondary" }, "📁 Choose from Asset Manager");
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
    tagEl.innerHTML = '<span class="catalog-detect-pulse"></span> AI DATASHEET & PHOTO PARSER';
    var titleEl = createEl("h4", { className: "catalog-detect-title" }, "Technical Specifications Extracted");
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
    var presetsLbl = createEl("span", { className: "catalog-detect-presets-label" }, "⚡ Quick Match Model:");
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
        // Run AI OCR on photo
        subEl.innerHTML = '<span class="catalog-detect-pulse" style="display:inline-block; vertical-align:middle; margin-right:6px;"></span> Optical AI scanning photo datasheet for specifications…';
        detectBox.classList.add("show");

        runImageOcr(fileObj, function(err, ocrText){
          if (!err && ocrText) {
            var ocrSpecs = detectCatalogSpecs(fName + " " + ocrText, ocrText);
            if (ocrSpecs) {
              renderDetectedSpecs(ocrSpecs);
              showToast("AI OCR extracted specifications from catalog photo!", "success");
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

  // ================= 13.5 SCREEN: ALL WEBSITE PAGES CMS =================
  function loadPageData(pageId, cb) {
    if (window.SeagoStore && typeof window.SeagoStore.get === "function") {
      window.SeagoStore.get("pages", pageId, function(err, page){
        if (!err && page) {
          cb(null, page);
        } else {
          var fallback = null;
          if (window._SEAGO_SEED_DATA && window._SEAGO_SEED_DATA.pages) {
            for (var i = 0; i < window._SEAGO_SEED_DATA.pages.length; i++) {
              if (window._SEAGO_SEED_DATA.pages[i].id === pageId) {
                fallback = window._SEAGO_SEED_DATA.pages[i];
                break;
              }
            }
          }
          cb(null, fallback || { id: pageId, title: pageId, updated_at: new Date().toISOString() });
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
    var backBtn = createEl("a", { className: "btn btn-secondary", href: "#/dashboard" }, "← CMS Hub");
    var liveBtn = createEl("a", { className: "btn btn-outline-topbar", href: slugName, target: "_blank", rel: "noopener" }, "↗ View Live Page");
    var saveBtn = createEl("button", { type: "button", className: "btn btn-primary" }, "Save Page (Ctrl+S)");
    if (typeof onSave === "function") {
      saveBtn.addEventListener("click", onSave);
    }
    headerActions.appendChild(backBtn);
    headerActions.appendChild(liveBtn);
    headerActions.appendChild(saveBtn);
    header.appendChild(headerActions);
    return header;
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

      // Section 1: Hero Banner
      var s1 = createEl("div", { className: "cms-section-card" });
      var h1 = createEl("div", { className: "cms-section-header" });
      var h1Left = createEl("div", { className: "cms-section-title-wrap" });
      h1Left.appendChild(createEl("span", { className: "cms-section-number" }, "1"));
      h1Left.appendChild(createEl("h3", { className: "cms-section-title" }, "Hero Announcement Banner"));
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
      var inpCta1 = createEl("input", { type: "text", value: page.cta_primary || "" });
      gCta1.appendChild(inpCta1);
      var gCta2 = createEl("div", { className: "form-group" });
      gCta2.appendChild(createEl("label", null, "Secondary Button Text"));
      var inpCta2 = createEl("input", { type: "text", value: page.cta_secondary || "" });
      gCta2.appendChild(inpCta2);
      rCta.appendChild(gCta1);
      rCta.appendChild(gCta2);
      s1.appendChild(rCta);
      form.appendChild(s1);

      // Section 2: Headline Metrics
      var s2 = createEl("div", { className: "cms-section-card" });
      var h2 = createEl("div", { className: "cms-section-header" });
      var h2Left = createEl("div", { className: "cms-section-title-wrap" });
      h2Left.appendChild(createEl("span", { className: "cms-section-number" }, "2"));
      h2Left.appendChild(createEl("h3", { className: "cms-section-title" }, "Headline Performance Statistics"));
      h2.appendChild(h2Left);
      s2.appendChild(h2);
      s2.appendChild(createEl("p", { className: "cms-section-desc" }, "The 4 headline statistics displayed directly below the hero banner."));

      var rS1 = createEl("div", { className: "form-row" });
      var gS1Val = createEl("div", { className: "form-group" });
      gS1Val.appendChild(createEl("label", null, "Stat 1 Value"));
      var inpS1Val = createEl("input", { type: "text", value: page.stat_1_val || "3–50 HP" });
      gS1Val.appendChild(inpS1Val);
      var gS1Lbl = createEl("div", { className: "form-group" });
      gS1Lbl.appendChild(createEl("label", null, "Stat 1 Label"));
      var inpS1Lbl = createEl("input", { type: "text", value: page.stat_1_lbl || "Power Spectrum" });
      gS1Lbl.appendChild(inpS1Lbl);
      rS1.appendChild(gS1Val);
      rS1.appendChild(gS1Lbl);
      s2.appendChild(rS1);

      var rS2 = createEl("div", { className: "form-row" });
      var gS2Val = createEl("div", { className: "form-group" });
      gS2Val.appendChild(createEl("label", null, "Stat 2 Value"));
      var inpS2Val = createEl("input", { type: "text", value: page.stat_2_val || "80%" });
      gS2Val.appendChild(inpS2Val);
      var gS2Lbl = createEl("div", { className: "form-group" });
      gS2Lbl.appendChild(createEl("label", null, "Stat 2 Label"));
      var inpS2Lbl = createEl("input", { type: "text", value: page.stat_2_lbl || "Fuel & Lube Savings" });
      gS2Lbl.appendChild(inpS2Lbl);
      rS2.appendChild(gS2Val);
      rS2.appendChild(gS2Lbl);
      s2.appendChild(rS2);

      var rS3 = createEl("div", { className: "form-row" });
      var gS3Val = createEl("div", { className: "form-group" });
      gS3Val.appendChild(createEl("label", null, "Stat 3 Value"));
      var inpS3Val = createEl("input", { type: "text", value: page.stat_3_val || "100%" });
      gS3Val.appendChild(inpS3Val);
      var gS3Lbl = createEl("div", { className: "form-group" });
      gS3Lbl.appendChild(createEl("label", null, "Stat 3 Label"));
      var inpS3Lbl = createEl("input", { type: "text", value: page.stat_3_lbl || "Zero Emissions" });
      gS3Lbl.appendChild(inpS3Lbl);
      rS3.appendChild(gS3Val);
      rS3.appendChild(gS3Lbl);
      s2.appendChild(rS3);

      var rS4 = createEl("div", { className: "form-row" });
      var gS4Val = createEl("div", { className: "form-group" });
      gS4Val.appendChild(createEl("label", null, "Stat 4 Value"));
      var inpS4Val = createEl("input", { type: "text", value: page.stat_4_val || "5+ States" });
      gS4Val.appendChild(inpS4Val);
      var gS4Lbl = createEl("div", { className: "form-group" });
      gS4Lbl.appendChild(createEl("label", null, "Stat 4 Label"));
      var inpS4Lbl = createEl("input", { type: "text", value: page.stat_4_lbl || "Active Deployments" });
      gS4Lbl.appendChild(inpS4Lbl);
      rS4.appendChild(gS4Val);
      rS4.appendChild(gS4Lbl);
      s2.appendChild(rS4);
      form.appendChild(s2);

      // Section 3: Trust & Deployment Partners
      var s3 = createEl("div", { className: "cms-section-card" });
      var h3 = createEl("div", { className: "cms-section-header" });
      var h3Left = createEl("div", { className: "cms-section-title-wrap" });
      h3Left.appendChild(createEl("span", { className: "cms-section-number" }, "3"));
      h3Left.appendChild(createEl("h3", { className: "cms-section-title" }, "Deployment Partners & Trust"));
      h3.appendChild(h3Left);
      s3.appendChild(h3);

      var gTrustHead = createEl("div", { className: "form-group" });
      gTrustHead.appendChild(createEl("label", null, "Trust Section Heading"));
      var inpTrustHead = createEl("input", { type: "text", value: page.trust_heading || "" });
      gTrustHead.appendChild(inpTrustHead);
      s3.appendChild(gTrustHead);

      var gTrustList = createEl("div", { className: "form-group" });
      gTrustList.appendChild(createEl("label", null, "Partner Organizations (separated by bullet ·)"));
      var inpTrustList = createEl("input", { type: "text", value: page.trust_partners || "" });
      gTrustList.appendChild(inpTrustList);
      s3.appendChild(gTrustList);
      form.appendChild(s3);

      // Section 4: Narrative / Why Electric
      var s4 = createEl("div", { className: "cms-section-card" });
      var h4 = createEl("div", { className: "cms-section-header" });
      var h4Left = createEl("div", { className: "cms-section-title-wrap" });
      h4Left.appendChild(createEl("span", { className: "cms-section-number" }, "4"));
      h4Left.appendChild(createEl("h3", { className: "cms-section-title" }, "Why Transition Narrative"));
      h4.appendChild(h4Left);
      s4.appendChild(h4);

      var gWhyHead = createEl("div", { className: "form-group" });
      gWhyHead.appendChild(createEl("label", null, "Section Headline"));
      var inpWhyHead = createEl("input", { type: "text", value: page.why_heading || "" });
      gWhyHead.appendChild(inpWhyHead);
      s4.appendChild(gWhyHead);

      var gWhyBody = createEl("div", { className: "form-group" });
      gWhyBody.appendChild(createEl("label", null, "Story & Market Problem Paragraph"));
      var inpWhyBody = createEl("textarea", { rows: "4" }, page.why_body || "");
      gWhyBody.appendChild(inpWhyBody);
      s4.appendChild(gWhyBody);
      form.appendChild(s4);

      // Section 5: Bottom CTA Banner
      var s5 = createEl("div", { className: "cms-section-card" });
      var h5 = createEl("div", { className: "cms-section-header" });
      var h5Left = createEl("div", { className: "cms-section-title-wrap" });
      h5Left.appendChild(createEl("span", { className: "cms-section-number" }, "5"));
      h5Left.appendChild(createEl("h3", { className: "cms-section-title" }, "Bottom Call-To-Action Banner"));
      h5.appendChild(h5Left);
      s5.appendChild(h5);

      var rCtaBan = createEl("div", { className: "form-row" });
      var gCtaTitle = createEl("div", { className: "form-group" });
      gCtaTitle.appendChild(createEl("label", null, "Banner Title"));
      var inpCtaTitle = createEl("input", { type: "text", value: page.cta_banner_title || "" });
      gCtaTitle.appendChild(inpCtaTitle);
      var gCtaBtn = createEl("div", { className: "form-group" });
      gCtaBtn.appendChild(createEl("label", null, "Button Label"));
      var inpCtaBtn = createEl("input", { type: "text", value: page.cta_banner_btn || "" });
      gCtaBtn.appendChild(inpCtaBtn);
      rCtaBan.appendChild(gCtaTitle);
      rCtaBan.appendChild(gCtaBtn);
      s5.appendChild(rCtaBan);
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
        page.stat_1_val = inpS1Val.value.trim();
        page.stat_1_lbl = inpS1Lbl.value.trim();
        page.stat_2_val = inpS2Val.value.trim();
        page.stat_2_lbl = inpS2Lbl.value.trim();
        page.stat_3_val = inpS3Val.value.trim();
        page.stat_3_lbl = inpS3Lbl.value.trim();
        page.stat_4_val = inpS4Val.value.trim();
        page.stat_4_lbl = inpS4Lbl.value.trim();
        page.trust_heading = inpTrustHead.value.trim();
        page.trust_partners = inpTrustList.value.trim();
        page.why_heading = inpWhyHead.value.trim();
        page.why_body = inpWhyBody.value.trim();
        page.cta_banner_title = inpCtaTitle.value.trim();
        page.cta_banner_btn = inpCtaBtn.value.trim();
        page.meta_desc = inpMeta.value.trim();
        savePageData(page);
      });

      formCard.appendChild(form);
      pageRoot.appendChild(formCard);
    });
  }

  // 2. PRODUCTS & MOTORS PAGE CMS (products.html)
  function renderProductsPageEditor() {
    pageRoot.innerHTML = "";
    loadPageData("products", function(err, page){
      if (!page) return;

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

      // Section 1: Hero
      var s1 = createEl("div", { className: "cms-section-card" });
      var h1 = createEl("div", { className: "cms-section-header" });
      var h1Left = createEl("div", { className: "cms-section-title-wrap" });
      h1Left.appendChild(createEl("span", { className: "cms-section-number" }, "1"));
      h1Left.appendChild(createEl("h3", { className: "cms-section-title" }, "Products Page Hero"));
      h1.appendChild(h1Left);
      s1.appendChild(h1);

      var gBadge = createEl("div", { className: "form-group" });
      gBadge.appendChild(createEl("label", null, "Category Badge"));
      var inpBadge = createEl("input", { type: "text", value: page.badge || "" });
      gBadge.appendChild(inpBadge);
      s1.appendChild(gBadge);

      var gHead = createEl("div", { className: "form-group" });
      gHead.appendChild(createEl("label", null, "Headline"));
      var inpHead = createEl("input", { type: "text", value: page.headline || "" });
      gHead.appendChild(inpHead);
      s1.appendChild(gHead);

      var gSub = createEl("div", { className: "form-group" });
      gSub.appendChild(createEl("label", null, "Introductory Narrative"));
      var inpSub = createEl("textarea", { rows: "3" }, page.subheadline || "");
      gSub.appendChild(inpSub);
      s1.appendChild(gSub);
      form.appendChild(s1);

      // Section 2: Outboard Motors Lineup (3–50 HP)
      var s2 = createEl("div", { className: "cms-section-card" });
      var h2 = createEl("div", { className: "cms-section-header" });
      var h2Left = createEl("div", { className: "cms-section-title-wrap" });
      h2Left.appendChild(createEl("span", { className: "cms-section-number" }, "2"));
      h2Left.appendChild(createEl("h3", { className: "cms-section-title" }, "Outboard Motors Lineup (3–50 HP)"));
      h2.appendChild(h2Left);

      var addMotorBtn = createEl("a", { className: "btn btn-sm btn-primary", href: "#/motors/new" }, "+ Add New Motor");
      h2.appendChild(addMotorBtn);
      s2.appendChild(h2);

      var gMIntro = createEl("div", { className: "form-group" });
      gMIntro.appendChild(createEl("label", null, "Outboard Range Description"));
      var inpMIntro = createEl("textarea", { rows: "2" }, page.motors_intro || "");
      gMIntro.appendChild(inpMIntro);
      s2.appendChild(gMIntro);

      // Active Motors List Cards
      var motorTableWrap = createEl("div", { style: { marginTop: "16px" } });
      window.SeagoStore.list("motors", function(mErr, motors){
        if (motors && motors.length > 0) {
          var mGrid = createEl("div", {
            style: {
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "12px",
              marginTop: "12px"
            }
          });

          motors.forEach(function(m){
            var mCard = createEl("div", {
              style: {
                background: "#F8FAFC",
                border: "1px solid var(--line)",
                borderRadius: "8px",
                padding: "14px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between"
              }
            });

            var mTop = createEl("div");
            var mHeader = createEl("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } });
            var mTitle = createEl("h4", { style: { margin: "0", fontSize: "14px", color: "var(--navy)" } }, m.title || (m.hp + " HP"));
            var mHpBadge = createEl("span", { className: "badge badge-success" }, m.hp + " HP");
            mHeader.appendChild(mTitle);
            mHeader.appendChild(mHpBadge);
            mTop.appendChild(mHeader);

            var mMeta = createEl("div", { style: { fontSize: "11.5px", color: "var(--text-muted)", marginTop: "6px" } });
            mMeta.textContent = (m.kw || "") + " · " + (m.voltage || "") + " · " + (m.cooling || "Liquid Cooled");
            mTop.appendChild(mMeta);
            mCard.appendChild(mTop);

            var mFooter = createEl("div", { style: { marginTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" } });
            var editBtn = createEl("a", { className: "btn btn-secondary btn-sm", href: "#/motors/edit/" + m.id }, "✎ Edit Specs");
            var previewLink = createEl("a", { className: "btn btn-outline-topbar btn-sm", href: m.catalog_path || "products.html", target: "_blank", rel: "noopener" }, "Datasheet ↗");
            mFooter.appendChild(editBtn);
            mFooter.appendChild(previewLink);
            mCard.appendChild(mFooter);

            mGrid.appendChild(mCard);
          });
          motorTableWrap.appendChild(mGrid);
        }
      });
      s2.appendChild(motorTableWrap);
      form.appendChild(s2);

      // Section 3: Marine LiFePO4 Battery Energy Storage
      var s3 = createEl("div", { className: "cms-section-card" });
      var h3 = createEl("div", { className: "cms-section-header" });
      var h3Left = createEl("div", { className: "cms-section-title-wrap" });
      h3Left.appendChild(createEl("span", { className: "cms-section-number" }, "3"));
      h3Left.appendChild(createEl("h3", { className: "cms-section-title" }, "Marine LiFePO4 Energy Storage Section"));
      h3.appendChild(h3Left);
      s3.appendChild(h3);

      var gBIntro = createEl("div", { className: "form-group" });
      gBIntro.appendChild(createEl("label", null, "Battery Architecture & Chemistry Description"));
      var inpBIntro = createEl("textarea", { rows: "3" }, page.batteries_intro || "");
      gBIntro.appendChild(inpBIntro);
      s3.appendChild(gBIntro);
      form.appendChild(s3);

      // Section 4: Custom Electric & Solar Hybrid Vessels
      var s4 = createEl("div", { className: "cms-section-card" });
      var h4 = createEl("div", { className: "cms-section-header" });
      var h4Left = createEl("div", { className: "cms-section-title-wrap" });
      h4Left.appendChild(createEl("span", { className: "cms-section-number" }, "4"));
      h4Left.appendChild(createEl("h3", { className: "cms-section-title" }, "Electric & Solar Vessels Section"));
      h4.appendChild(h4Left);
      s4.appendChild(h4);

      var gBoatIntro = createEl("div", { className: "form-group" });
      gBoatIntro.appendChild(createEl("label", null, "Vessel Hull & Passenger Transport Narrative"));
      var inpBoatIntro = createEl("textarea", { rows: "3" }, page.boats_intro || "");
      gBoatIntro.appendChild(inpBoatIntro);
      s4.appendChild(gBoatIntro);
      form.appendChild(s4);

      // Section 5: SEO
      var s5 = createEl("div", { className: "cms-section-card" });
      var h5 = createEl("div", { className: "cms-section-header" });
      var h5Left = createEl("div", { className: "cms-section-title-wrap" });
      h5Left.appendChild(createEl("span", { className: "cms-section-number" }, "5"));
      h5Left.appendChild(createEl("h3", { className: "cms-section-title" }, "SEO Search Metadata"));
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
      var save = createEl("button", { type: "submit", className: "btn btn-primary" }, "Save Products Page Changes");
      actions.appendChild(cancel);
      actions.appendChild(save);
      form.appendChild(actions);

      form.addEventListener("input", function(){ isDirty = true; });

      form.addEventListener("submit", function(e){
        e.preventDefault();
        page.badge = inpBadge.value.trim();
        page.headline = inpHead.value.trim();
        page.subheadline = inpSub.value.trim();
        page.motors_intro = inpMIntro.value.trim();
        page.batteries_intro = inpBIntro.value.trim();
        page.boats_intro = inpBoatIntro.value.trim();
        page.meta_desc = inpMeta.value.trim();
        savePageData(page);
      });

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
      var inpBadge = createEl("input", { type: "text", value: page.badge || "" });
      gBadge.appendChild(inpBadge);
      s1.appendChild(gBadge);

      var gHead = createEl("div", { className: "form-group" });
      gHead.appendChild(createEl("label", null, "Headline"));
      var inpHead = createEl("input", { type: "text", value: page.headline || "" });
      gHead.appendChild(inpHead);
      s1.appendChild(gHead);

      var gSub = createEl("div", { className: "form-group" });
      gSub.appendChild(createEl("label", null, "Subtitle"));
      var inpSub = createEl("textarea", { rows: "2" }, page.subheadline || "");
      gSub.appendChild(inpSub);
      s1.appendChild(gSub);
      form.appendChild(s1);

      // Section 2: Mission & Story
      var s2 = createEl("div", { className: "cms-section-card" });
      var h2 = createEl("div", { className: "cms-section-header" });
      var h2Left = createEl("div", { className: "cms-section-title-wrap" });
      h2Left.appendChild(createEl("span", { className: "cms-section-number" }, "2"));
      h2Left.appendChild(createEl("h3", { className: "cms-section-title" }, "Mission & Company Narrative"));
      h2.appendChild(h2Left);
      s2.appendChild(h2);

      var gMissTitle = createEl("div", { className: "form-group" });
      gMissTitle.appendChild(createEl("label", null, "Mission Title"));
      var inpMissTitle = createEl("input", { type: "text", value: page.mission_title || "" });
      gMissTitle.appendChild(inpMissTitle);
      s2.appendChild(gMissTitle);

      var gMissBody = createEl("div", { className: "form-group" });
      gMissBody.appendChild(createEl("label", null, "Mission Statement & Story"));
      var inpMissBody = createEl("textarea", { rows: "4" }, page.mission_body || "");
      gMissBody.appendChild(inpMissBody);
      s2.appendChild(gMissBody);
      form.appendChild(s2);

      // Section 3: Facilities & Testing
      var s3 = createEl("div", { className: "cms-section-card" });
      var h3 = createEl("div", { className: "cms-section-header" });
      var h3Left = createEl("div", { className: "cms-section-title-wrap" });
      h3Left.appendChild(createEl("span", { className: "cms-section-number" }, "3"));
      h3Left.appendChild(createEl("h3", { className: "cms-section-title" }, "Manufacturing & Watercraft Testing Facilities"));
      h3.appendChild(h3Left);
      s3.appendChild(h3);

      var gFac = createEl("div", { className: "form-group" });
      gFac.appendChild(createEl("label", null, "Chennai Propulsion Plant & Kollam Testing Location"));
      var inpFac = createEl("textarea", { rows: "3" }, page.manufacturing_location || "");
      gFac.appendChild(inpFac);
      s3.appendChild(gFac);

      var gHigh = createEl("div", { className: "form-group" });
      gHigh.appendChild(createEl("label", null, "Engineering & Technology Core Pillars"));
      var inpHigh = createEl("textarea", { rows: "3" }, page.engineering_highlights || "");
      gHigh.appendChild(inpHigh);
      s3.appendChild(gHigh);
      form.appendChild(s3);

      // Section 4: Leadership Profile
      var s4 = createEl("div", { className: "cms-section-card" });
      var h4 = createEl("div", { className: "cms-section-header" });
      var h4Left = createEl("div", { className: "cms-section-title-wrap" });
      h4Left.appendChild(createEl("span", { className: "cms-section-number" }, "4"));
      h4Left.appendChild(createEl("h3", { className: "cms-section-title" }, "Founder & Leadership Profile"));
      h4.appendChild(h4Left);
      s4.appendChild(h4);

      var rLead = createEl("div", { className: "form-row" });
      var gFName = createEl("div", { className: "form-group" });
      gFName.appendChild(createEl("label", null, "Founder Full Name"));
      var inpFName = createEl("input", { type: "text", value: page.founder_name || "" });
      gFName.appendChild(inpFName);
      var gFTitle = createEl("div", { className: "form-group" });
      gFTitle.appendChild(createEl("label", null, "Official Title"));
      var inpFTitle = createEl("input", { type: "text", value: page.founder_title || "" });
      gFTitle.appendChild(inpFTitle);
      rLead.appendChild(gFName);
      rLead.appendChild(gFTitle);
      s4.appendChild(rLead);

      var gFBio = createEl("div", { className: "form-group" });
      gFBio.appendChild(createEl("label", null, "Leadership Message / Biography"));
      var inpFBio = createEl("textarea", { rows: "3" }, page.founder_bio || "");
      gFBio.appendChild(inpFBio);
      s4.appendChild(gFBio);
      form.appendChild(s4);

      // Section 5: SEO
      var s5 = createEl("div", { className: "cms-section-card" });
      var gMeta = createEl("div", { className: "form-group" });
      gMeta.appendChild(createEl("label", null, "Google Search Meta Description"));
      var inpMeta = createEl("textarea", { rows: "2" }, page.meta_desc || "");
      gMeta.appendChild(inpMeta);
      s5.appendChild(gMeta);
      form.appendChild(s5);

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
        page.mission_title = inpMissTitle.value.trim();
        page.mission_body = inpMissBody.value.trim();
        page.manufacturing_location = inpFac.value.trim();
        page.engineering_highlights = inpHigh.value.trim();
        page.founder_name = inpFName.value.trim();
        page.founder_title = inpFTitle.value.trim();
        page.founder_bio = inpFBio.value.trim();
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
      var inpBadge = createEl("input", { type: "text", value: page.badge || "" });
      gBadge.appendChild(inpBadge);
      s1.appendChild(gBadge);

      var gHead = createEl("div", { className: "form-group" });
      gHead.appendChild(createEl("label", null, "Headline"));
      var inpHead = createEl("input", { type: "text", value: page.headline || "" });
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
      h2Left.appendChild(createEl("h3", { className: "cms-section-title" }, "Deployment: ICAR-CIFT Vikalpika Solar Boat"));
      h2.appendChild(h2Left);
      s2.appendChild(h2);

      var gVikTitle = createEl("div", { className: "form-group" });
      gVikTitle.appendChild(createEl("label", null, "Craft Title"));
      var inpVikTitle = createEl("input", { type: "text", value: page.vikalpika_title || "" });
      gVikTitle.appendChild(inpVikTitle);
      s2.appendChild(gVikTitle);

      var gVikDesc = createEl("div", { className: "form-group" });
      gVikDesc.appendChild(createEl("label", null, "Deployment Details & Fuel Savings Impact"));
      var inpVikDesc = createEl("textarea", { rows: "3" }, page.vikalpika_desc || "");
      gVikDesc.appendChild(inpVikDesc);
      s2.appendChild(gVikDesc);
      form.appendChild(s2);

      // Section 3: Deployment 2 - Water Transport
      var s3 = createEl("div", { className: "cms-section-card" });
      var h3 = createEl("div", { className: "cms-section-header" });
      var h3Left = createEl("div", { className: "cms-section-title-wrap" });
      h3Left.appendChild(createEl("span", { className: "cms-section-number" }, "3"));
      h3Left.appendChild(createEl("h3", { className: "cms-section-title" }, "Deployment: Kerala SWTD Public Ferry"));
      h3.appendChild(h3Left);
      s3.appendChild(h3);

      var gWtTitle = createEl("div", { className: "form-group" });
      gWtTitle.appendChild(createEl("label", null, "Ferry Project Title"));
      var inpWtTitle = createEl("input", { type: "text", value: page.water_transport_title || "" });
      gWtTitle.appendChild(inpWtTitle);
      s3.appendChild(gWtTitle);

      var gWtDesc = createEl("div", { className: "form-group" });
      gWtDesc.appendChild(createEl("label", null, "Transit Routes & Fleet Efficiency"));
      var inpWtDesc = createEl("textarea", { rows: "3" }, page.water_transport_desc || "");
      gWtDesc.appendChild(inpWtDesc);
      s3.appendChild(gWtDesc);
      form.appendChild(s3);

      // Section 4: Deployment 3 - Karnataka Tourism
      var s4 = createEl("div", { className: "cms-section-card" });
      var h4 = createEl("div", { className: "cms-section-header" });
      var h4Left = createEl("div", { className: "cms-section-title-wrap" });
      h4Left.appendChild(createEl("span", { className: "cms-section-number" }, "4"));
      h4Left.appendChild(createEl("h3", { className: "cms-section-title" }, "Deployment: Eco-Tourism Sanctuary Craft"));
      h4.appendChild(h4Left);
      s4.appendChild(h4);

      var gTourTitle = createEl("div", { className: "form-group" });
      gTourTitle.appendChild(createEl("label", null, "Sanctuary Craft Title"));
      var inpTourTitle = createEl("input", { type: "text", value: page.tourism_title || "" });
      gTourTitle.appendChild(inpTourTitle);
      s4.appendChild(gTourTitle);

      var gTourDesc = createEl("div", { className: "form-group" });
      gTourDesc.appendChild(createEl("label", null, "Wildlife Reserve Impact & Quiet Propulsion"));
      var inpTourDesc = createEl("textarea", { rows: "3" }, page.tourism_desc || "");
      gTourDesc.appendChild(inpTourDesc);
      s4.appendChild(gTourDesc);
      form.appendChild(s4);

      // Section 5: Deployment 4 - Hydrogen Fuel Cell
      var s5 = createEl("div", { className: "cms-section-card" });
      var h5 = createEl("div", { className: "cms-section-header" });
      var h5Left = createEl("div", { className: "cms-section-title-wrap" });
      h5Left.appendChild(createEl("span", { className: "cms-section-number" }, "5"));
      h5Left.appendChild(createEl("h3", { className: "cms-section-title" }, "Deployment: Hydrogen Fuel Cell Hybrid Prototype"));
      h5.appendChild(h5Left);
      s5.appendChild(h5);

      var gH2Title = createEl("div", { className: "form-group" });
      gH2Title.appendChild(createEl("label", null, "Vessel Prototype Title"));
      var inpH2Title = createEl("input", { type: "text", value: page.hydrogen_title || "" });
      gH2Title.appendChild(inpH2Title);
      s5.appendChild(gH2Title);

      var gH2Desc = createEl("div", { className: "form-group" });
      gH2Desc.appendChild(createEl("label", null, "Fuel Cell Powertrain Architecture"));
      var inpH2Desc = createEl("textarea", { rows: "3" }, page.hydrogen_desc || "");
      gH2Desc.appendChild(inpH2Desc);
      s5.appendChild(gH2Desc);
      form.appendChild(s5);

      // Section 6: SEO
      var s6 = createEl("div", { className: "cms-section-card" });
      var gMeta = createEl("div", { className: "form-group" });
      gMeta.appendChild(createEl("label", null, "Google Search Meta Description"));
      var inpMeta = createEl("textarea", { rows: "2" }, page.meta_desc || "");
      gMeta.appendChild(inpMeta);
      s6.appendChild(gMeta);
      form.appendChild(s6);

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
        page.vikalpika_title = inpVikTitle.value.trim();
        page.vikalpika_desc = inpVikDesc.value.trim();
        page.water_transport_title = inpWtTitle.value.trim();
        page.water_transport_desc = inpWtDesc.value.trim();
        page.tourism_title = inpTourTitle.value.trim();
        page.tourism_desc = inpTourDesc.value.trim();
        page.hydrogen_title = inpH2Title.value.trim();
        page.hydrogen_desc = inpH2Desc.value.trim();
        page.meta_desc = inpMeta.value.trim();
        savePageData(page);
      });

      formCard.appendChild(form);
      pageRoot.appendChild(formCard);
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
      var inpSub = createEl("textarea", { rows: "2" }, page.subheadline || "");
      gSub.appendChild(inpSub);
      s1.appendChild(gSub);
      form.appendChild(s1);

      // Section 2: Video Embed Link
      var s2 = createEl("div", { className: "cms-section-card" });
      var h2 = createEl("div", { className: "cms-section-header" });
      var h2Left = createEl("div", { className: "cms-section-title-wrap" });
      h2Left.appendChild(createEl("span", { className: "cms-section-number" }, "2"));
      h2Left.appendChild(createEl("h3", { className: "cms-section-title" }, "Featured Sea Trial Video"));
      h2.appendChild(h2Left);
      s2.appendChild(h2);

      var gVid = createEl("div", { className: "form-group" });
      gVid.appendChild(createEl("label", null, "YouTube / Video Embed URL"));
      var inpVid = createEl("input", { type: "url", value: page.video_embed || "" });
      gVid.appendChild(inpVid);
      s2.appendChild(gVid);
      form.appendChild(s2);

      // Section 3: Photo Albums Narrative
      var s3 = createEl("div", { className: "cms-section-card" });
      var h3 = createEl("div", { className: "cms-section-header" });
      var h3Left = createEl("div", { className: "cms-section-title-wrap" });
      h3Left.appendChild(createEl("span", { className: "cms-section-number" }, "3"));
      h3Left.appendChild(createEl("h3", { className: "cms-section-title" }, "Footage Description"));
      h3.appendChild(h3Left);
      s3.appendChild(h3);

      var gIntro = createEl("div", { className: "form-group" });
      gIntro.appendChild(createEl("label", null, "Photo Album Narrative"));
      var inpIntro = createEl("textarea", { rows: "3" }, page.intro_text || "");
      gIntro.appendChild(inpIntro);
      s3.appendChild(gIntro);
      form.appendChild(s3);

      // Section 4: SEO
      var s4 = createEl("div", { className: "cms-section-card" });
      var gMeta = createEl("div", { className: "form-group" });
      gMeta.appendChild(createEl("label", null, "Google Search Meta Description"));
      var inpMeta = createEl("textarea", { rows: "2" }, page.meta_desc || "");
      gMeta.appendChild(inpMeta);
      s4.appendChild(gMeta);
      form.appendChild(s4);

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
        page.video_embed = inpVid.value.trim();
        page.intro_text = inpIntro.value.trim();
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
      var inpSub = createEl("textarea", { rows: "2" }, page.subheadline || "");
      gSub.appendChild(inpSub);
      s1.appendChild(gSub);
      form.appendChild(s1);

      // Section 2: Direct Hotlines & Channels
      var s2 = createEl("div", { className: "cms-section-card" });
      var h2 = createEl("div", { className: "cms-section-header" });
      var h2Left = createEl("div", { className: "cms-section-title-wrap" });
      h2Left.appendChild(createEl("span", { className: "cms-section-number" }, "2"));
      h2Left.appendChild(createEl("h3", { className: "cms-section-title" }, "Direct Hotlines & Inquiries"));
      h2.appendChild(h2Left);
      s2.appendChild(h2);

      var rChans = createEl("div", { className: "form-row" });
      var gMail = createEl("div", { className: "form-group" });
      gMail.appendChild(createEl("label", null, "Commercial Sales Email"));
      var inpMail = createEl("input", { type: "email", value: page.sales_email || "" });
      gMail.appendChild(inpMail);
      var gPhone = createEl("div", { className: "form-group" });
      gPhone.appendChild(createEl("label", null, "Support Phone Hotline"));
      var inpPhone = createEl("input", { type: "text", value: page.support_phone || "" });
      gPhone.appendChild(inpPhone);
      var gWa = createEl("div", { className: "form-group" });
      gWa.appendChild(createEl("label", null, "WhatsApp Hotline"));
      var inpWa = createEl("input", { type: "text", value: page.whatsapp_number || "" });
      gWa.appendChild(inpWa);
      rChans.appendChild(gMail);
      rChans.appendChild(gPhone);
      rChans.appendChild(gWa);
      s2.appendChild(rChans);
      form.appendChild(s2);

      // Section 3: Physical Facilities
      var s3 = createEl("div", { className: "cms-section-card" });
      var h3 = createEl("div", { className: "cms-section-header" });
      var h3Left = createEl("div", { className: "cms-section-title-wrap" });
      h3Left.appendChild(createEl("span", { className: "cms-section-number" }, "3"));
      h3Left.appendChild(createEl("h3", { className: "cms-section-title" }, "Showroom & Manufacturing Facilities"));
      h3.appendChild(h3Left);
      s3.appendChild(h3);

      var gAddr1 = createEl("div", { className: "form-group" });
      gAddr1.appendChild(createEl("label", null, "Kerala Showroom & Experience Center"));
      var inpAddr1 = createEl("textarea", { rows: "2" }, page.sales_address || "");
      gAddr1.appendChild(inpAddr1);
      s3.appendChild(gAddr1);

      var gAddr2 = createEl("div", { className: "form-group" });
      gAddr2.appendChild(createEl("label", null, "Chennai Propulsion Manufacturing Plant"));
      var inpAddr2 = createEl("textarea", { rows: "2" }, page.manufacturing_address || "");
      gAddr2.appendChild(inpAddr2);
      s3.appendChild(gAddr2);

      var rHours = createEl("div", { className: "form-row" });
      var gHours = createEl("div", { className: "form-group" });
      gHours.appendChild(createEl("label", null, "Working Hours & Schedule"));
      var inpHours = createEl("input", { type: "text", value: page.hours || "" });
      gHours.appendChild(inpHours);
      var gResp = createEl("div", { className: "form-group" });
      gResp.appendChild(createEl("label", null, "Response SLA"));
      var inpResp = createEl("input", { type: "text", value: page.response_time || "" });
      gResp.appendChild(inpResp);
      rHours.appendChild(gHours);
      rHours.appendChild(gResp);
      s3.appendChild(rHours);
      form.appendChild(s3);

      // Section 4: SEO
      var s4 = createEl("div", { className: "cms-section-card" });
      var gMeta = createEl("div", { className: "form-group" });
      gMeta.appendChild(createEl("label", null, "Google Search Meta Description"));
      var inpMeta = createEl("textarea", { rows: "2" }, page.meta_desc || "");
      gMeta.appendChild(inpMeta);
      s4.appendChild(gMeta);
      form.appendChild(s4);

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
        page.sales_email = inpMail.value.trim();
        page.support_phone = inpPhone.value.trim();
        page.whatsapp_number = inpWa.value.trim();
        page.sales_address = inpAddr1.value.trim();
        page.manufacturing_address = inpAddr2.value.trim();
        page.hours = inpHours.value.trim();
        page.response_time = inpResp.value.trim();
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

          var openBtn = createEl("a", { className: "btn btn-outline-topbar btn-sm", href: asset.url, target: "_blank", rel: "noopener" }, "↗");
          
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
