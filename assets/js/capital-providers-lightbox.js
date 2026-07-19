/* Click-to-expand lightbox for the static overview graphic on The
   Landscape page. Progressive enhancement over the plain
   <a target="_blank"> the image already sits in -- without this script
   the link still opens the full-size image in a new tab (and a
   right-click "save image" always works either way); with it, clicking
   opens an in-page overlay instead. Escape, the backdrop, or an
   explicit close button all dismiss it. No new dependencies. */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var trigger = document.querySelector(".cp-overview__trigger");
    if (!trigger) return;
    var thumb = trigger.querySelector("img");
    if (!thumb) return;

    var overlay = document.createElement("div");
    overlay.className = "cp-lightbox";
    overlay.hidden = true;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", thumb.alt);

    var full = document.createElement("img");
    full.src = trigger.getAttribute("href");
    full.alt = thumb.alt;

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "cp-lightbox__close";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.textContent = "×";

    overlay.appendChild(full);
    overlay.appendChild(closeBtn);
    document.body.appendChild(overlay);

    var lastFocused = null;

    function onKeydown(evt) {
      if (evt.key === "Escape") close();
    }

    function open(evt) {
      evt.preventDefault();
      lastFocused = document.activeElement;
      overlay.hidden = false;
      closeBtn.focus();
      document.addEventListener("keydown", onKeydown);
    }

    function close() {
      overlay.hidden = true;
      document.removeEventListener("keydown", onKeydown);
      if (lastFocused) lastFocused.focus();
    }

    trigger.addEventListener("click", open);
    closeBtn.addEventListener("click", close);
    overlay.addEventListener("click", function (evt) {
      if (evt.target === overlay) close();
    });
  });
})();
