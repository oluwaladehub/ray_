import { initCommon } from "./common.js";

initCommon("contact");
setupContactForm();

function setupContactForm() {
  const form = document.getElementById("contact-form");
  const message = document.getElementById("contact-form-message");
  if (!form || !message) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    message.textContent = "Message sent successfully. Our team will contact you shortly.";
    form.reset();
  });
}
