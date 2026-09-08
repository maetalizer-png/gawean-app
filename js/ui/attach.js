import { $ } from "../dom.js";
import { chat } from "./chat.js";

let stream = null;
let lastBlob = null;

function stopCam() {
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
  const video = $("camera-video");
  if (video) video.srcObject = null;
  const overlay = $("camera-overlay");
  if (overlay) overlay.hidden = true;
  lastBlob = null;
  showLiveActions();
}

function showLiveActions() {
  const video = $("camera-video");
  const canvas = $("camera-canvas");
  const liveActions = $("camera-actions");
  const reviewActions = $("camera-review-actions");
  if (video) video.hidden = false;
  if (canvas) canvas.hidden = true;
  if (liveActions) liveActions.hidden = false;
  if (reviewActions) reviewActions.hidden = true;
}

function showReviewActions() {
  const video = $("camera-video");
  const canvas = $("camera-canvas");
  const liveActions = $("camera-actions");
  const reviewActions = $("camera-review-actions");
  if (video) video.hidden = true;
  if (canvas) canvas.hidden = false;
  if (liveActions) liveActions.hidden = true;
  if (reviewActions) reviewActions.hidden = false;
}

async function saveToGallery() {
  if (!lastBlob) return;
  const file = new File([lastBlob], "gawean-" + Date.now() + ".jpg", { type: "image/jpeg" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch {
      return;
    }
  }
  const url = URL.createObjectURL(lastBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  const toastEl = $("toast");
  if (toastEl) {
    toastEl.textContent = "Perangkat ini tidak mendukung berbagi langsung — foto masuk ke Download";
    toastEl.classList.add("show");
    setTimeout(() => toastEl.classList.remove("show"), 2600);
  }
}

export const attach = {
  open() {
    $("sheet-backdrop").classList.add("show");
    $("attach-sheet").hidden = false;
  },
  close() {
    $("sheet-backdrop").classList.remove("show");
    $("attach-sheet").hidden = true;
  },
  file(file) {
    if (!file) return;
    attach.close();
    stopCam();
    const wrap = document.createElement("div");
    wrap.className = file.type && file.type.startsWith("image/") ? "msg user media" : "msg user";
    if (file.type && file.type.startsWith("image/")) {
      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      const box = document.createElement("div");
      box.className = "msg-media";
      box.appendChild(img);
      wrap.appendChild(box);
    } else {
      const chip = document.createElement("div");
      chip.className = "msg-file";
      chip.textContent = file.name || "Berkas";
      wrap.appendChild(chip);
    }
    chat.addNode(wrap);
    if (file.type && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => chat.rememberImage(String(reader.result || ""));
      reader.readAsDataURL(file);
    }
  },
  async camera() {
    const video = $("camera-video");
    const overlay = $("camera-overlay");
    const native = $("pick-camera");
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (native) native.click();
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" } },
      });
      attach.close();
      overlay.hidden = false;
      showLiveActions();
      video.muted = true;
      video.setAttribute("playsinline", "true");
      video.srcObject = stream;
      await video.play();
    } catch {
      if (native) native.click();
    }
  },
  bind() {
    $("btn-plus").onclick = attach.open;
    $("attach-close").onclick = attach.close;
    $("sheet-backdrop").onclick = attach.close;
    const camBtn = $("att-camera");
    if (camBtn) camBtn.onclick = () => attach.camera();
    const cancel = $("camera-cancel");
    if (cancel) cancel.onclick = stopCam;
    const shot = $("camera-shot");
    if (shot) {
      shot.onclick = () => {
        const video = $("camera-video");
        const canvas = $("camera-canvas");
        if (!video || !video.videoWidth) return;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d").drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
          if (!blob) return;
          lastBlob = blob;
          showReviewActions();
        }, "image/jpeg", 0.9);
      };
    }
    const retake = $("camera-retake");
    if (retake) retake.onclick = () => { lastBlob = null; showLiveActions(); };
    const saveGallery = $("camera-save-gallery");
    if (saveGallery) saveGallery.onclick = () => saveToGallery();
    const send = $("camera-send");
    if (send) {
      send.onclick = () => {
        if (!lastBlob) return;
        attach.file(new File([lastBlob], "kamera.jpg", { type: "image/jpeg" }));
      };
    }
    ["pick-camera", "pick-gallery", "pick-file"].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("change", (e) => {
        attach.file(e.target.files && e.target.files[0]);
        e.target.value = "";
      });
    });
  },
};
