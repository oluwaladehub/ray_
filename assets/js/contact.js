import { initCommon } from "./common.js";

initCommon("contact");
setupContactForm();

function setupContactForm() {
  const form = document.getElementById("contact-form");
  const message = document.getElementById("contact-form-message");
  if (!form || !message) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Sending...";
    }

    message.textContent = "";

    try {
      const payload = {
        name: form.elements.name?.value?.trim() || "",
        email: form.elements.email?.value?.trim() || "",
        phone: form.elements.phone?.value?.trim() || "",
        subject: form.elements.subject?.value?.trim() || "",
        message: form.elements.message?.value?.trim() || "",
      };

      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body?.ok) {
        throw new Error(body?.error || "Unable to send message right now.");
      }

      message.textContent = "Message sent successfully. Our team will contact you shortly.";
      form.reset();
    } catch (error) {
      message.textContent = error instanceof Error ? error.message : "Failed to send message.";
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Send Message";
      }
    }
  });
}
