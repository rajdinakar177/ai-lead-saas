export async function GET() {
  const script = `
(function () {
  if (window.__LEADFLOW_WIDGET_LOADED__) {
    return;
  }

  window.__LEADFLOW_WIDGET_LOADED__ = true;

  const script =
    document.currentScript;

  if (!script) {
    console.error(
      "LeadFlow AI: Unable to locate widget script."
    );

    return;
  }

  const business =
    script.getAttribute(
      "data-business"
    );

  if (!business) {
    console.error(
      "LeadFlow AI: data-business is required."
    );

    return;
  }

  const scriptUrl =
    new URL(script.src);

  const baseUrl =
    scriptUrl.origin;

  /* -----------------------------------------
     ROOT
  ----------------------------------------- */

  const root =
    document.createElement(
      "div"
    );

  root.id =
    "leadflow-ai-widget";

  root.style.position =
    "fixed";

  root.style.right =
    "24px";

  root.style.bottom =
    "24px";

  root.style.zIndex =
    "2147483647";

  root.style.fontFamily =
    "Arial, Helvetica, sans-serif";

  document.body.appendChild(
    root
  );

  /* -----------------------------------------
     CHAT PANEL
  ----------------------------------------- */

  const panel =
    document.createElement(
      "div"
    );

  panel.style.position =
    "absolute";

  panel.style.right =
    "0";

  panel.style.bottom =
    "72px";

  panel.style.width =
    "400px";

  panel.style.maxWidth =
    "calc(100vw - 32px)";

  panel.style.height =
    "620px";

  panel.style.maxHeight =
    "calc(100vh - 120px)";

  panel.style.background =
    "#050505";

  panel.style.border =
    "1px solid rgba(255,255,255,0.12)";

  panel.style.borderRadius =
    "20px";

  panel.style.overflow =
    "hidden";

  panel.style.boxShadow =
    "0 24px 80px rgba(0,0,0,0.45)";

  panel.style.opacity =
    "0";

  panel.style.visibility =
    "hidden";

  panel.style.transform =
    "translateY(12px) scale(0.98)";

  panel.style.transformOrigin =
    "bottom right";

  panel.style.transition =
    "opacity 180ms ease, transform 180ms ease, visibility 180ms ease";

  /* -----------------------------------------
     IFRAME
  ----------------------------------------- */

  const iframe =
    document.createElement(
      "iframe"
    );

  iframe.src =
    baseUrl +
    "/widget/" +
    encodeURIComponent(
      business
    );

  iframe.title =
    "LeadFlow AI Assistant";

  iframe.style.width =
    "100%";

  iframe.style.height =
    "100%";

  iframe.style.border =
    "0";

  iframe.style.display =
    "block";

  iframe.setAttribute(
    "loading",
    "lazy"
  );

  panel.appendChild(
    iframe
  );

  /* -----------------------------------------
     BUTTON
  ----------------------------------------- */

  const button =
    document.createElement(
      "button"
    );

  button.type =
    "button";

  button.setAttribute(
    "aria-label",
    "Open AI assistant"
  );

  button.style.height =
    "56px";

  button.style.border =
    "0";

  button.style.borderRadius =
    "999px";

  button.style.padding =
    "0 22px";

  button.style.background =
    "#ffffff";

  button.style.color =
    "#050505";

  button.style.display =
    "flex";

  button.style.alignItems =
    "center";

  button.style.justifyContent =
    "center";

  button.style.gap =
    "9px";

  button.style.fontSize =
    "14px";

  button.style.fontWeight =
    "600";

  button.style.cursor =
    "pointer";

  button.style.boxShadow =
    "0 12px 40px rgba(0,0,0,0.25)";

  button.style.transition =
    "transform 150ms ease";

  /* -----------------------------------------
     ICON
  ----------------------------------------- */

  const icon =
    document.createElement(
      "span"
    );

  icon.innerHTML =
    "✦";

  icon.style.fontSize =
    "17px";

  /* -----------------------------------------
     LABEL
  ----------------------------------------- */

  const label =
    document.createElement(
      "span"
    );

  label.textContent =
    "Need help?";

  button.appendChild(
    icon
  );

  button.appendChild(
    label
  );

  root.appendChild(
    panel
  );

  root.appendChild(
    button
  );

  /* -----------------------------------------
     OPEN / CLOSE
  ----------------------------------------- */

  let open =
    false;

  function setOpen(
    value
  ) {
    open = value;

    if (open) {
      panel.style.opacity =
        "1";

      panel.style.visibility =
        "visible";

      panel.style.transform =
        "translateY(0) scale(1)";

      label.textContent =
        "Close";

      button.setAttribute(
        "aria-label",
        "Close AI assistant"
      );
    } else {
      panel.style.opacity =
        "0";

      panel.style.visibility =
        "hidden";

      panel.style.transform =
        "translateY(12px) scale(0.98)";

      label.textContent =
        "Need help?";

      button.setAttribute(
        "aria-label",
        "Open AI assistant"
      );
    }
  }

  button.addEventListener(
    "click",
    function () {
      setOpen(!open);
    }
  );

  button.addEventListener(
    "mouseenter",
    function () {
      button.style.transform =
        "translateY(-2px)";
    }
  );

  button.addEventListener(
    "mouseleave",
    function () {
      button.style.transform =
        "translateY(0)";
    }
  );

  /* -----------------------------------------
     MOBILE
  ----------------------------------------- */

  function updateMobileLayout() {
    if (
      window.innerWidth <
      520
    ) {
      root.style.right =
        "16px";

      root.style.bottom =
        "16px";

      panel.style.position =
        "fixed";

      panel.style.left =
        "12px";

      panel.style.right =
        "12px";

      panel.style.bottom =
        "84px";

      panel.style.width =
        "auto";

      panel.style.height =
        "calc(100vh - 110px)";

      panel.style.maxHeight =
        "none";
    } else {
      root.style.right =
        "24px";

      root.style.bottom =
        "24px";

      panel.style.position =
        "absolute";

      panel.style.left =
        "auto";

      panel.style.right =
        "0";

      panel.style.bottom =
        "72px";

      panel.style.width =
        "400px";

      panel.style.height =
        "620px";

      panel.style.maxHeight =
        "calc(100vh - 120px)";
    }
  }

  updateMobileLayout();

  window.addEventListener(
    "resize",
    updateMobileLayout
  );
})();
`;

  return new Response(
    script,
    {
      headers: {
        "Content-Type":
          "application/javascript; charset=utf-8",

        "Cache-Control":
          "public, max-age=300",
      },
    }
  );
}