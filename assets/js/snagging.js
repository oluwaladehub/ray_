import { faqs, snaggingPackages } from "./data.js";
import { escapeHtml } from "./utils.js";
import { initCommon } from "./common.js";

initCommon("snagging");
renderPackages();
renderFaqs();
setupForm();

function renderPackages() {
  const grid = document.getElementById("packages-grid");
  const select = document.getElementById("form-package");
  if (!grid || !select) return;

  grid.innerHTML = snaggingPackages.map((pkg) => `
      <article class="pricing-card">
        <p class="eyebrow">${escapeHtml(pkg.title)}</p>
        <h3>${escapeHtml(pkg.priceLabel)}</h3>
        <p>Report turnaround: ${escapeHtml(pkg.turnaround)}</p>
        <ul>
          ${pkg.features.map((feature) => `<li>${escapeHtml(feature)}</li>`).join("")}
        </ul>
        <button type="button" class="btn btn-ghost package-select" data-package="${escapeHtml(pkg.id)}">${escapeHtml(pkg.cta)}</button>
      </article>
    `).join("");

  select.innerHTML = snaggingPackages
    .map((pkg) => `<option value="${escapeHtml(pkg.id)}">${escapeHtml(pkg.title)} - ${escapeHtml(pkg.priceLabel)}</option>`)
    .join("");

  grid.addEventListener("click", (event) => {
    const button = event.target.closest(".package-select");
    if (!button) return;
    select.value = button.dataset.package || select.value;
    document.getElementById("snagging-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function renderFaqs() {
  const list = document.getElementById("faq-list");
  if (!list) return;
  list.innerHTML = faqs.map((item, index) => `
      <article class="faq-item ${index === 0 ? "open" : ""}">
        <button class="faq-trigger" type="button">${escapeHtml(item.q)}</button>
        <div class="faq-content"><p>${escapeHtml(item.a)}</p></div>
      </article>
    `).join("");

  list.addEventListener("click", (event) => {
    const trigger = event.target.closest(".faq-trigger");
    if (!trigger) return;
    const item = trigger.closest(".faq-item");
    if (!item) return;
    item.classList.toggle("open");
  });
}

function setupForm() {
  const form = document.getElementById("snagging-form");
  const message = document.getElementById("snag-form-message");
  if (!form || !message) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    message.textContent = "Request submitted successfully. Our inspection team will contact you shortly.";
    form.reset();
  });
}
