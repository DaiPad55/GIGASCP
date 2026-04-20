const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbycCgcOHts9nwrJTZvyIdKP7HCvyuPHpPtEE3Q-jurU0Vn-CCFhT1qaTuOCsClggcyDdw/exec";

const form = document.getElementById("reportForm");
const submitButton = document.getElementById("submitButton");
const statusMessage = document.getElementById("statusMessage");
const occurredAt = document.getElementById("occurredAt");

if (occurredAt) {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  occurredAt.value = local;
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(console.error);
  });
}

function getCheckedValues(name) {
  return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(el => el.value);
}

function setStatus(message, type = "") {
  statusMessage.textContent = message;
  statusMessage.className = `status ${type}`.trim();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const troubleTypes = getCheckedValues("troubleTypes");

  if (troubleTypes.length === 0) {
    setStatus("トラブルの種類を1つ以上選択してください。", "error");
    return;
  }

  const payload = {
    deviceId: document.getElementById("deviceId").value.trim(),
    schoolName: document.getElementById("schoolName").value,
    teacherName: document.getElementById("teacherName").value.trim(),
    troubleTypes,
    otherDetails: document.getElementById("otherDetails").value.trim(),
    occurredAt: document.getElementById("occurredAt").value,
    submittedAt: new Date().toISOString(),
    userAgent: navigator.userAgent
  };

  submitButton.disabled = true;
  setStatus("送信中です…");

  try {

const response = await fetch(GAS_WEB_APP_URL, {
  method: "POST",
  redirect: "follow",
  headers: {
    "Content-Type": "text/plain;charset=utf-8"
  },
  body: JSON.stringify(payload)
});


    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.message || "送信に失敗しました。");
    }

    form.reset();

    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    occurredAt.value = local;

    setStatus("送信しました。担当窓口へメール通知しています。", "ok");
  } catch (error) {
    console.error(error);
    setStatus(`送信エラー: ${error.message}`, "error");
  } finally {
    submitButton.disabled = false;
  }
});
``