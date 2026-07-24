const GAS_WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbwIgRi9j6wLQgreMkGiRAVVf9PQrXBkI6Yx3rWOaSUnEbH10SrcpHNDqCBkwJkM8AM/exec";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("reportForm");
  const submitButton = document.getElementById("submitButton");
  const savePdfButton = document.getElementById("savePdfButton");
  const statusMessage = document.getElementById("statusMessage");
  const occurredAt = document.getElementById("occurredAt");
  const otherDetails = document.getElementById("otherDetails");
  const attachmentsInput = document.getElementById("attachments");
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


  function fileToAttachment(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || "");
        const base64 = result.includes(",") ? result.split(",")[1] : result;
        resolve({
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
          data: base64
        });
      };
      reader.onerror = () => reject(new Error("添付ファイルの読み込みに失敗しました。"));
      reader.readAsDataURL(file);
    });
  }

  async function readAttachments() {
    if (!attachmentsInput || !attachmentsInput.files || attachmentsInput.files.length === 0) {
      return [];
    }

    const files = Array.from(attachmentsInput.files);
    const maxFileCount = 3;
    const maxTotalSize = 40 * 1024 * 1024;
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);

    if (files.length > maxFileCount) {
      throw new Error(`添付ファイルは${maxFileCount}個までにしてください。`);
    }

    if (totalSize > maxTotalSize) {
      throw new Error("添付ファイルの合計サイズは40MB以下にしてください。");
    }

    return Promise.all(files.map(fileToAttachment));
  }

  function validateTroubleTypes() {
    const isValid = getSelectedTroubleTypes().length > 0;

    if (troubleTypesError) {
      troubleTypesError.hidden = isValid;
    }

    return isValid;
  }

  async function buildPayload(options = {}) {
    const includeAttachments = options.includeAttachments !== false;
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
      attachments: includeAttachments ? await readAttachments() : [],
      occurredAt:
        document.getElementById("occurredAt")?.value || "",
      submittedAt: new Date().toISOString(),
      userAgent: navigator.userAgent
    };
  }


  function downloadBase64File(fileName, mimeType, base64Data) {
    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: mimeType || "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName || "Chromebookトラブル報告書.pdf";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function handleSavePdf() {
    if (!form) return;

    setStatus("");

    const nativeValid = form.reportValidity();
    const troubleValid = validateTroubleTypes();
    if (!nativeValid || !troubleValid) {
      setStatus("PDF保存前に必須項目を入力してください。", "error");
      return;
    }

    if (savePdfButton) {
      savePdfButton.disabled = true;
    }
    setStatus("PDFを作成中です…");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const payload = await buildPayload({ includeAttachments: false });
      payload.action = "generateReportPdf";

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
        throw new Error(data.message || "PDF作成に失敗しました。");
      }

      downloadBase64File(data.fileName, data.mimeType, data.data);
      setStatus("送信内容PDFを保存しました。", "ok");
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        setStatus("PDF作成タイムアウトです。通信状態または Web アプリ設定を確認してください。", "error");
      } else {
        console.error(error);
        setStatus(`PDF保存エラー: ${error.message}`, "error");
      }
    } finally {
      if (savePdfButton) {
        savePdfButton.disabled = false;
      }
    }
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
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const payload = await buildPayload();

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

  if (savePdfButton) {
    savePdfButton.addEventListener("click", handleSavePdf);
  }

  if (form) {
    form.addEventListener("submit", handleSubmit);
  }

  setOccurredAtNow();
  toggleDetailSections();
});
``