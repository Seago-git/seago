// Replace this file with a Supabase-backed adapter later. Keep the API identical.
(function () {
  "use strict";

  // ── Constants ──────────────────────────────────────────────────────────────
  var LS_PREFIX = "seago_admin_v1:";
  var IDB_NAME  = "seago_admin_files";
  var IDB_STORE = "files";

  // ── IDB state ──────────────────────────────────────────────────────────────
  var _db        = null;
  var _idbFailed = false;

  // ── UUID generator ─────────────────────────────────────────────────────────
  function generateId(prefix) {
    var d = new Date().getTime();
    var p = prefix ? prefix + "-" : "";
    var uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (d + Math.random() * 16) % 16 | 0;
      d = Math.floor(d / 16);
      return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
    });
    return p + uuid;
  }

  // ── localStorage helpers ───────────────────────────────────────────────────
  function lsGet(key) {
    try {
      var raw = localStorage.getItem(key);
      if (raw === null) { return null; }
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function lsSet(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  }

  // ── IDB initialisation ─────────────────────────────────────────────────────
  function openIDB(cb) {
    if (_db) { cb(null, _db); return; }
    if (_idbFailed) { cb({ message: "File storage unavailable. Paste a path instead." }); return; }

    if (!window.indexedDB) {
      _idbFailed = true;
      cb({ message: "File storage unavailable. Paste a path instead." });
      return;
    }

    try {
      var req = window.indexedDB.open(IDB_NAME, 1);

      req.onupgradeneeded = function (evt) {
        var db = evt.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: "id" });
        }
      };

      req.onsuccess = function (evt) {
        _db = evt.target.result;
        cb(null, _db);
      };

      req.onerror = function (evt) {
        _idbFailed = true;
        cb({ message: "File storage unavailable. Paste a path instead.", detail: evt.target.error });
      };
    } catch (err) {
      _idbFailed = true;
      cb({ message: "File storage unavailable. Paste a path instead.", detail: err });
    }
  }

  // Kick off IDB open immediately
  openIDB(function () {});

  // ── Collection helpers ─────────────────────────────────────────────────────
  function readCollection(collection) {
    var data = lsGet(LS_PREFIX + collection);
    if (collection === "site_settings") {
      if (data && typeof data === "object") {
        return data;
      }
      return null;
    }
    if (Object.prototype.toString.call(data) !== "[object Array]") {
      return [];
    }
    return data;
  }

  function writeCollection(collection, data, cb) {
    var ok = lsSet(LS_PREFIX + collection, data);
    if (!ok) {
      cb({ message: "QuotaExceededError: localStorage quota exceeded for collection: " + collection });
      return false;
    }
    return true;
  }

  // ── Store methods ──────────────────────────────────────────────────────────

  function list(collection, cb) {
    setTimeout(function () {
      try {
        if (collection === "site_settings") {
          var settings = readCollection(collection);
          cb(null, settings ? [settings] : []);
          return;
        }
        var arr = readCollection(collection);
        arr.sort(function (a, b) {
          var sa = (a.sort_order !== undefined && a.sort_order !== null) ? a.sort_order : 9999;
          var sb = (b.sort_order !== undefined && b.sort_order !== null) ? b.sort_order : 9999;
          return sa - sb;
        });
        cb(null, arr);
      } catch (e) {
        cb(e);
      }
    }, 0);
  }

  function get(collection, id, cb) {
    setTimeout(function () {
      try {
        if (collection === "site_settings") {
          var settings = readCollection(collection);
          cb(null, settings);
          return;
        }
        var arr = readCollection(collection);
        var found = null;
        for (var i = 0; i < arr.length; i++) {
          if (String(arr[i].id) === String(id)) {
            found = arr[i];
            break;
          }
        }
        cb(null, found);
      } catch (e) {
        cb(e);
      }
    }, 0);
  }

  function save(collection, item, cb) {
    setTimeout(function () {
      try {
        if (!item || typeof item !== "object") {
          cb(new Error("Invalid item object"));
          return;
        }
        var now = new Date().toISOString();
        item.updated_at = now;

        if (collection === "site_settings") {
          item.id = "singleton";
          if (!writeCollection(collection, item, cb)) { return; }
          cb(null, item);
          return;
        }

        var arr = readCollection(collection);
        var foundIndex = -1;
        if (item.id) {
          for (var i = 0; i < arr.length; i++) {
            if (String(arr[i].id) === String(item.id)) {
              foundIndex = i;
              break;
            }
          }
        }

        if (foundIndex >= 0) {
          if (typeof item.sort_order !== "number") {
            item.sort_order = arr[foundIndex].sort_order;
          }
          arr[foundIndex] = item;
        } else {
          if (!item.id) {
            item.id = generateId(collection.replace(/_/g, "-"));
          }
          if (typeof item.sort_order !== "number") {
            var maxOrder = 0;
            for (var j = 0; j < arr.length; j++) {
              if (typeof arr[j].sort_order === "number" && arr[j].sort_order > maxOrder) {
                maxOrder = arr[j].sort_order;
              }
            }
            item.sort_order = maxOrder + 1;
          }
          arr.push(item);
        }

        if (!writeCollection(collection, arr, cb)) { return; }
        cb(null, item);
      } catch (e) {
        cb(e);
      }
    }, 0);
  }

  function remove(collection, id, cb) {
    setTimeout(function () {
      try {
        if (collection === "site_settings") {
          cb(null);
          return;
        }
        var arr = readCollection(collection);
        var filtered = [];
        for (var i = 0; i < arr.length; i++) {
          if (String(arr[i].id) !== String(id)) {
            filtered.push(arr[i]);
          }
        }
        if (!writeCollection(collection, filtered, cb)) { return; }
        cb(null);
      } catch (e) {
        cb(e);
      }
    }, 0);
  }

  function reorder(collection, orderedIds, cb) {
    setTimeout(function () {
      try {
        var arr = readCollection(collection);
        var orderMap = {};
        for (var i = 0; i < orderedIds.length; i++) {
          orderMap[String(orderedIds[i])] = i + 1;
        }
        for (var j = 0; j < arr.length; j++) {
          var sid = String(arr[j].id);
          if (typeof orderMap[sid] === "number") {
            arr[j].sort_order = orderMap[sid];
          }
        }
        if (!writeCollection(collection, arr, cb)) { return; }
        cb(null);
      } catch (e) {
        cb(e);
      }
    }, 0);
  }

  function uploadFile(kind, file, cb) {
    if (!file) {
      cb(new Error("No file provided"));
      return;
    }
    openIDB(function (idbErr, db) {
      var uuid = generateId("file");
      var fileName = file.name || "upload";
      var fileSize = file.size || 0;

      var reader = new FileReader();
      reader.onload = function (e) {
        var dataUrl = e.target.result;
        if (db) {
          try {
            var tx = db.transaction([IDB_STORE], "readwrite");
            var store = tx.objectStore(IDB_STORE);
            store.put({
              id: uuid,
              kind: kind,
              name: fileName,
              size: fileSize,
              dataUrl: dataUrl,
              blob: file
            });
          } catch (ex) {}
        }
        cb(null, {
          id: uuid,
          url: dataUrl,
          name: fileName,
          size: fileSize,
          kind: kind
        });
      };
      reader.onerror = function () {
        cb(new Error("Failed to read file"));
      };
      reader.readAsDataURL(file);
    });
  }

  function getFileUrl(fileId, cb) {
    openIDB(function (idbErr, db) {
      if (idbErr || !db) {
        cb(null, null);
        return;
      }
      try {
        var tx = db.transaction([IDB_STORE], "readonly");
        var store = tx.objectStore(IDB_STORE);
        var getReq = store.get(fileId);

        getReq.onerror = function (evt) {
          cb(null, null);
        };

        getReq.onsuccess = function (evt) {
          var rec = evt.target.result;
          if (!rec) { cb(null, null); return; }
          if (rec.dataUrl) {
            cb(null, { id: rec.id, url: rec.dataUrl, name: rec.name, size: rec.size });
          } else if (rec.blob) {
            try {
              var objUrl = URL.createObjectURL(rec.blob);
              cb(null, { id: rec.id, url: objUrl, name: rec.name, size: rec.size });
            } catch (ex) {
              cb(null, null);
            }
          } else {
            cb(null, null);
          }
        };
      } catch (e) {
        cb(null, null);
      }
    });
  }

  var KNOWN_COLLECTIONS = [
    "motors",
    "battery_packs",
    "boats",
    "case_studies",
    "gallery_items",
    "site_settings",
    "pages",
    "assets"
  ];

  function exportAll(cb) {
    setTimeout(function () {
      try {
        var out = {};
        for (var i = 0; i < KNOWN_COLLECTIONS.length; i++) {
          var col = KNOWN_COLLECTIONS[i];
          var val = lsGet(LS_PREFIX + col);
          out[col] = val !== null ? val : (col === "site_settings" ? {} : []);
        }
        cb(null, JSON.stringify(out, null, 2));
      } catch (e) {
        cb(e, null);
      }
    }, 0);
  }

  function importAll(jsonString, cb) {
    setTimeout(function () {
      try {
        var parsed = JSON.parse(jsonString);
        if (!parsed || typeof parsed !== "object") {
          cb(new Error("Invalid backup JSON format"));
          return;
        }
        var hasKnown = false;
        for (var i = 0; i < KNOWN_COLLECTIONS.length; i++) {
          if (Object.prototype.hasOwnProperty.call(parsed, KNOWN_COLLECTIONS[i])) {
            hasKnown = true;
            break;
          }
        }
        if (!hasKnown) {
          cb(new Error("No recognized collection found in backup"));
          return;
        }
        for (var j = 0; j < KNOWN_COLLECTIONS.length; j++) {
          var col = KNOWN_COLLECTIONS[j];
          if (Object.prototype.hasOwnProperty.call(parsed, col)) {
            var ok = lsSet(LS_PREFIX + col, parsed[col]);
            if (!ok) {
              cb(new Error("Storage quota exceeded during import of " + col));
              return;
            }
          }
        }
        cb(null);
      } catch (e) {
        cb(e);
      }
    }, 0);
  }

  function resetToSeed(cb) {
    setTimeout(function () {
      try {
        var keysToRemove = [];
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && k.indexOf(LS_PREFIX) === 0) {
            keysToRemove.push(k);
          }
        }
        for (var j = 0; j < keysToRemove.length; j++) {
          localStorage.removeItem(keysToRemove[j]);
        }
        if (window.SeagoStore && window.SeagoStore._pendingSeed) {
          window.SeagoStore._seedIfEmpty(window.SeagoStore._pendingSeed);
        } else if (window._SEAGO_SEED_DATA) {
          window.SeagoStore._seedIfEmpty(window._SEAGO_SEED_DATA);
        }
        cb(null);
      } catch (e) {
        cb(e);
      }
    }, 0);
  }

  function _seedIfEmpty(seedData) {
    if (!seedData || typeof seedData !== "object") {
      return;
    }
    window.SeagoStore._pendingSeed = seedData;
    var motorsKey = LS_PREFIX + "motors";
    if (localStorage.getItem(motorsKey) !== null) {
      return;
    }
    for (var i = 0; i < KNOWN_COLLECTIONS.length; i++) {
      var col = KNOWN_COLLECTIONS[i];
      if (Object.prototype.hasOwnProperty.call(seedData, col)) {
        lsSet(LS_PREFIX + col, seedData[col]);
      }
    }
  }

  window.SeagoStore = {
    list:         list,
    get:          get,
    save:         save,
    remove:       remove,
    reorder:      reorder,
    uploadFile:   uploadFile,
    getFileUrl:   getFileUrl,
    exportAll:    exportAll,
    importAll:    importAll,
    resetToSeed:  resetToSeed,
    _seedIfEmpty: _seedIfEmpty,
    _pendingSeed: null
  };

  if (window._SEAGO_SEED_DATA) {
    window.SeagoStore._seedIfEmpty(window._SEAGO_SEED_DATA);
  }
}());
