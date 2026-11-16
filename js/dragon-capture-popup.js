// Added feature: show a message when the existing game captures the visible dragon.
// This file does not replace or edit the original snapshot function.
(function () {
  "use strict";

  let dragonWasVisible = false;

  // Watch the existing renderer. When the game's original drawDragon() method
  // draws the dragon image, remember that the dragon is currently visible.
  const originalDrawImage = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function (...args) {
    const source = args[0];
    if (source && source.src && source.src.includes("images/dragon.png")) {
      dragonWasVisible = true;
    }
    return originalDrawImage.apply(this, args);
  };

  function createPopup() {
    if (document.querySelector("#dragonCapturePopup")) return;

    const popup = document.createElement("div");
    popup.id = "dragonCapturePopup";
    popup.setAttribute("role", "alertdialog");
    popup.setAttribute("aria-modal", "true");
    popup.innerHTML = `
      <div class="dragon-popup-box">
        <button class="dragon-popup-close" type="button" aria-label="Close">&times;</button>
        <div class="dragon-popup-title">You captured the Dragon's image!</div>
        <button class="dragon-popup-ok" type="button">OK</button>
      </div>
    `;

    const style = document.createElement("style");
    style.textContent = `
      #dragonCapturePopup {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: grid;
        place-items: center;
        background: rgba(0, 0, 0, 0.65);
        padding: 20px;
      }
      .dragon-popup-box {
        position: relative;
        width: min(90vw, 430px);
        padding: 34px 28px 26px;
        border: 2px solid #45e6d2;
        border-radius: 16px;
        background: #07111f;
        color: white;
        text-align: center;
        box-shadow: 0 0 35px rgba(69, 230, 210, 0.35);
        font-family: inherit;
      }
      .dragon-popup-title {
        font-size: 1.45rem;
        font-weight: 700;
        margin-bottom: 22px;
      }
      .dragon-popup-ok {
        border: 0;
        border-radius: 8px;
        padding: 10px 26px;
        background: #45e6d2;
        color: #07111f;
        font: inherit;
        font-weight: 700;
        cursor: pointer;
      }
      .dragon-popup-close {
        position: absolute;
        top: 8px;
        right: 12px;
        border: 0;
        background: transparent;
        color: white;
        font-size: 28px;
        line-height: 1;
        cursor: pointer;
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(popup);

    const close = () => popup.remove();
    popup.querySelector(".dragon-popup-close").addEventListener("click", close);
    popup.querySelector(".dragon-popup-ok").addEventListener("click", close);
  }

  function checkSnapshot() {
    // Let the game's existing snapshot handler finish first.
    window.setTimeout(() => {
      if (dragonWasVisible) createPopup();
    }, 0);
  }

  window.addEventListener("DOMContentLoaded", () => {
    document.querySelector("#cameraButton").addEventListener("click", checkSnapshot);

    window.addEventListener("keydown", (event) => {
      if (event.code === "Space" && !event.repeat) checkSnapshot();
    });
  });
})();
