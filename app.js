const GAS_WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbwIgRi9j6wLQgreMkGiRAVVf9PQrXBkI6Yx3rWOaSUnEbH10SrcpHNDqCBkwJkM8AM/exec";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("reportForm");
  const submitButton = document.getElementById("submitButton");
  const statusMessage = document.getElementById("statusMessage");
  const occurredAt = document.getElementById("occurredAt");
  const otherDetails = document.getElementById("otherDetails");
  const otherDetailsHint = document.getElementById("otherDetailsHint");
  const troubleTypesError = document.getElementById("troubleTypesError");

  const troubleCheckboxes = Array.from(
    document.querySelectorAll('input[name="troubleTypes"]')
  );

  const detailSections = Array.from(
    document.querySelectorAll(".trouble-detail")
  );

  function setOccurredAtNow() {
    if (!occurredAt) return;
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

  function setStatus(message, type = "") {
    if (!statusMessage) return;
    statusMessage.textContent = message;
    statusMessage.className = `status ${type}`.trim();
  }

  function getCheckedValues(name) {
    return Array.from(
      document.querySelectorAll(`input[name="${name}"]:checked`)
    ).map((el) => el.value);
  }

  function getSelectedTroubleTypes() {
    return getCheckedValues("troubleTypes");
  }

  function clearInputsInSection(section) {
    const inputs = section.querySelectorAll("input, textarea, select");
    inputs.forEach((input) => {
      if (input.type === "checkbox" || input.type === "radio") {
        input.checked = false;
      } else {
        input.value = "";
      }
    });
  }

  function toggleDetailSections() {
    const selectedTypes = getSelectedTroubleTypes();

    detailSections.forEach((section) => {
      const targetType = section.dataset.type;
      const shouldShow = selectedTypes.includes(targetType);

      section.hidden = !shouldShow;

      if (!shouldShow) {
        clearInputsInSection(section);
      }
    });

    const isOtherSelected = selectedTypes.includes("その他");

    if (otherDetails) {
      otherDetails.required = isOtherSelected;
      otherDetails.setAttribute("aria-required", String(isOtherSelected));
    }

    if (otherDetailsHint) {
      otherDetailsHint.hidden = !isOtherSelected;
    }

    if (troubleTypesError) {
      troubleTypesError.hidden = selectedTypes.length > 0;
    }
  }

  function validateTroubleTypes() {
    const isValid = getSelectedTroubleTypes().length > 0;

    if (troubleTypesError) {
      troubleTypesError.hidden = isValid;
    }

    return isValid;
  }

  function buildPayload() {
    return {
      deviceId: document.getElementById("deviceId")?.value.trim() || "",
      schoolName: document.getElementById("schoolName")?.value || "",
      teacherName: document.getElementById("teacherName")?.value.trim() || "",
      troubleTypes: getSelectedTroubleTypes(),

      detailSelections: {
        chargeDetails: getCheckedValues("chargeDetails"),
        loginDetails: getCheckedValues("loginDetails"),
        bootDetails: getCheckedValues("bootDetails"),
        freezeDetails: getCheckedValues("freezeDetails"),
        touchDetails: getCheckedValues("touchDetails"),
        keyboardDetails: getCheckedValues("keyboardDetails"),
        cameraDetails: getCheckedValues("cameraDetails"),
        damageDetails: getCheckedValues("damageDetails"),
        heatDetails: getCheckedValues("heatDetails"),
        networkDetails: getCheckedValues("networkDetails"),
        otherTypeDetails: getCheckedValues("otherTypeDetails")
      },

      networkPattern:
        document.getElementById("networkPattern")?.value.trim() || "",
      otherDetails:
        document.getElementById("otherDetails")?.value.trim() || "",
      occurredAt:
        document.getElementById("occurredAt")?.value || "",
      submittedAt: new Date().toISOString(),
      userAgent: navigator.userAgent
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form) return;

    setStatus("");

    const nativeValid = form.reportValidity();
    const troubleValid = validateTroubleTypes();

    if (!nativeValid || !troubleValid) {
      setStatus("未入力の必須項目があります。入力内容を確認してください。", "error");
      return;
    }

    submitButton.disabled = true;
    setStatus("送信中です…");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const payload = buildPayload();

      const response = await fetch(GAS_WEB_APP_URL, {
        method: "POST",
        redirect: "follow",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const responseText = await response.text();

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error("サーバー応答をJSONとして解釈できませんでした。応答: " + responseText);
      }

      if (!data.ok) {
        throw new Error(data.message || "送信に失敗しました。");
      }

      form.reset();
      setOccurredAtNow();
      toggleDetailSections();

      setStatus("送信しました。担当窓口へメール通知しています。", "ok");
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === "AbortError") {
        setStatus("送信タイムアウトです。通信状態または Web アプリ設定を確認してください。", "error");
      } else {
        console.error(error);
        setStatus(`送信エラー: ${error.message}`, "error");
      }
    } finally {
      submitButton.disabled = false;
    }
  }

  troubleCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", toggleDetailSections);
  });

  if (form) {
    form.addEventListener("submit", handleSubmit);
  }

  setOccurredAtNow();
  toggleDetailSections();
});
``
