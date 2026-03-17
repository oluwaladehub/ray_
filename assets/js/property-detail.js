import { escapeHtml, formatPrice, queryToState } from "./utils.js";
import { initCommon } from "./common.js";
import { getSupabaseConfig } from "./config.js";
const WHATSAPP_NUMBER = "2349058886789";
const CLIENT_SESSION_KEY = "rr_client_session_id";
const PROPERTY_SELECT = `
  id,
  slug,
  property_type,
  title,
  tag,
  location,
  description,
  price_display,
  price_numeric,
  bedrooms,
  bathrooms,
  beds,
  guests,
  listing_status,
  property_media(media_kind, bucket_name, object_path, sort_order, is_cover),
  property_stats(id, label, value, icon, sort_order),
  property_amenities(id, name, icon, sort_order)
`;

const pageType = normalizeType(document.body.dataset.propertyType);

initCommon(pageType);
void renderPage();

function normalizeType(type) {
  if (type === "land" || type === "shortlet") return type;
  return "housing";
}

async function renderPage() {
  const shell = document.getElementById("property-shell");
  const related = document.getElementById("related-listings");
  if (!shell || !related) return;

  const supabase = createSupabaseClient();
  if (!supabase) {
    shell.innerHTML = `<article class="property-card"><h2>Unable to load property</h2></article>`;
    return;
  }

  const state = queryToState();
  const slug = state.slug;
  if (!slug) {
    shell.innerHTML = `<article class="property-card"><h2>Property not found</h2></article>`;
    return;
  }

  const property = await fetchProperty(supabase, pageType, slug);
  if (!property) {
    shell.innerHTML = `<article class="property-card"><h2>Property not found</h2></article>`;
    return;
  }

  const similar = await fetchSimilar(supabase, pageType, property.slug);
  document.title = `RaretifiedRealty | ${property.title}`;

  shell.innerHTML = propertyTemplate(property);
  related.innerHTML = similar.length
    ? similar.map((item) => similarCardTemplate(item)).join("")
    : `<article class="property-card"><p>No similar properties available right now.</p></article>`;

  bindGallery(property.imageUrls);
  bindBookingWidget(property);
  bindFloatingEnquiry(property);
}

function createSupabaseClient() {
  const factory = window.supabase?.createClient;
  if (typeof factory !== "function") return null;
  const cfg = getSupabaseConfig();
  if (!cfg) return null;
  return factory(cfg.url, cfg.anonKey);
}

async function fetchProperty(supabase, type, slug) {
  const { data, error } = await supabase
    .from("properties")
    .select(PROPERTY_SELECT)
    .eq("listing_status", "published")
    .eq("property_type", type)
    .eq("slug", slug)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return mapProperty(supabase, data);
}

async function fetchSimilar(supabase, type, currentSlug) {
  const { data, error } = await supabase
    .from("properties")
    .select(PROPERTY_SELECT)
    .eq("listing_status", "published")
    .eq("property_type", type)
    .neq("slug", currentSlug)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(3);

  if (error) return [];
  return (data ?? []).map((row) => mapProperty(supabase, row));
}

function mapProperty(supabase, row) {
  const mediaRows = [...(row.property_media ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const statRows = [...(row.property_stats ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const amenityRows = [...(row.property_amenities ?? [])].sort((a, b) => a.sort_order - b.sort_order);

  const imageUrls = mediaRows
    .filter((item) => item.media_kind === "image")
    .map((item) => resolveMediaUrl(supabase, item))
    .filter(Boolean);
  const videoUrls = mediaRows
    .filter((item) => item.media_kind === "video")
    .map((item) => resolveMediaUrl(supabase, item))
    .filter(Boolean);

  return {
    slug: row.slug,
    title: row.title,
    tag: row.tag || "Verified",
    location: row.location,
    description: row.description || "",
    priceDisplay: row.price_display || formatPrice(row.price_numeric || 0),
    priceNumeric: Number(row.price_numeric || 0),
    bedrooms: Number(row.bedrooms ?? 0),
    bathrooms: Number(row.bathrooms ?? 0),
    beds: Number(row.beds ?? 0),
    guests: Number(row.guests ?? 0),
    imageUrls: imageUrls.length ? imageUrls : [""],
    videoUrls,
    stats: statRows.length
      ? statRows.map((stat) => ({
          id: stat.id || `${stat.label}-${stat.sort_order}`,
          label: stat.label || "Detail",
          value: stat.value || "-",
          icon: stat.icon || "",
        }))
      : fallbackStats(row),
    amenities: amenityRows.length
      ? amenityRows.map((item) => ({
          id: item.id || item.name,
          name: item.name,
          icon: item.icon || "",
        }))
      : [],
  };
}

function fallbackStats(row) {
  if (pageType === "land") {
    return [
      { id: "size", label: "Size", value: "-", icon: "straighten" },
      { id: "title", label: "Title", value: "Verified", icon: "verified" },
      { id: "status", label: "Status", value: "Available", icon: "task_alt" },
    ];
  }

  if (pageType === "shortlet") {
    return [
      { id: "guests", label: "Guests", value: String(row.guests ?? 0), icon: "group" },
      { id: "beds", label: "Beds", value: String(row.beds ?? row.bedrooms ?? 0), icon: "bed" },
      { id: "baths", label: "Baths", value: String(row.bathrooms ?? 0), icon: "shower" },
    ];
  }

  return [
    { id: "beds", label: "Beds", value: String(row.beds ?? row.bedrooms ?? 0), icon: "bed" },
    { id: "baths", label: "Baths", value: String(row.bathrooms ?? 0), icon: "shower" },
    { id: "status", label: "Status", value: "Verified", icon: "verified" },
  ];
}

function resolveMediaUrl(supabase, media) {
  if (!media?.object_path) return "";
  if (media.object_path.startsWith("http://") || media.object_path.startsWith("https://")) return media.object_path;
  const bucket = media.bucket_name || "property-media";
  const { data } = supabase.storage.from(bucket).getPublicUrl(media.object_path);
  return data.publicUrl;
}

function propertyTemplate(property) {
  if (pageType === "shortlet") {
    return shortletPropertyTemplate(property);
  }

  const typeTitle = pageType === "land" ? "Land" : "Housing";
  const badge = "For Sale";
  const sectionTitle = pageType === "land" ? "About this land" : "About this home";
  const featureTitle = pageType === "land" ? "Features & Details" : "Property Features";
  const noteTitle = pageType === "land" ? "Verified Property" : "Secure Transaction";
  const noteText = pageType === "land"
    ? "Title documents have been verified by our legal team."
    : "Property documents are fully verified.";

  return `
    <section class="shortlet-page-head">
      <div class="property-breadcrumb">
        <a href="/index.html">Home</a> / <a href="${collectionPageForType(pageType)}">${typeTitle}</a> / <span>${escapeHtml(property.title)}</span>
      </div>
      <div class="detail-top-row">
        <div>
          <p class="eyebrow">${badge} | ${escapeHtml(property.tag)}</p>
          <h1 class="shortlet-title">${escapeHtml(property.title)}</h1>
          <p class="shortlet-location">${escapeHtml(property.location)}</p>
        </div>
        <p class="detail-guide-price">Guide Price: <strong>${escapeHtml(property.priceDisplay)}</strong></p>
      </div>
    </section>

    <section class="property-gallery">
      <img class="property-main-image" id="main-image" src="${escapeHtml(property.imageUrls[0])}" alt="${escapeHtml(property.title)}">
      <div class="thumb-row" id="thumb-row">
        ${property.imageUrls
          .map(
            (img, idx) =>
              `<img class="thumb ${idx === 0 ? "is-active" : ""}" data-image="${escapeHtml(img)}" src="${escapeHtml(img)}" alt="Gallery image ${idx + 1}">`
          )
          .join("")}
      </div>
      ${videoGalleryTemplate(property)}
    </section>

    <section class="shortlet-detail-wrap">
      <article class="shortlet-content">
        <section class="shortlet-section">
          <h2>${sectionTitle}</h2>
          <p>${escapeHtml(property.description)}</p>
        </section>

        <section class="shortlet-section">
          <h2>Key Stats</h2>
          <div class="detail-stat-grid">
            ${property.stats
              .slice(0, 6)
              .map((stat) => `<div class="detail-stat-card"><strong>${escapeHtml(stat.value)}</strong><span>${escapeHtml(stat.label)}</span></div>`)
              .join("")}
          </div>
        </section>

        <section class="shortlet-section">
          <h2>${featureTitle}</h2>
          <div class="shortlet-amenity-grid">
            ${property.amenities
              .slice(0, 12)
              .map((item) => `<div class="shortlet-amenity-item"><span>*</span><p>${escapeHtml(item.name)}</p></div>`)
              .join("")}
          </div>
        </section>
      </article>

      <aside class="shortlet-side">
        <div class="shortlet-security-note">
          <h3>${noteTitle}</h3>
          <p>${noteText}</p>
        </div>
      </aside>
    </section>
    ${floatingWhatsAppTemplate(property)}
    ${floatingInquiryModalTemplate(property)}
  `;
}

function shortletPropertyTemplate(property) {
  const parts = [];
  if (property.guests) parts.push(`${property.guests} Guests`);
  if (property.bedrooms) parts.push(`${property.bedrooms} Bedrooms`);
  if (property.beds) parts.push(`${property.beds} Beds`);

  return `
    <section class="shortlet-page-head">
      <div class="property-breadcrumb">
        <a href="/index.html">Home</a> / <a href="/shortlet.html">Shortlet</a> / <span>${escapeHtml(property.title)}</span>
      </div>
      <h1 class="shortlet-title">${escapeHtml(property.title)}${property.bedrooms ? `: ${property.bedrooms}-Bedroom Luxury Shortlet` : ""}</h1>
      <p class="shortlet-meta">${parts.join(" | ")}</p>
      <p class="shortlet-location">${escapeHtml(property.location)}</p>
    </section>

    <section class="property-gallery">
      <img class="property-main-image" id="main-image" src="${escapeHtml(property.imageUrls[0])}" alt="${escapeHtml(property.title)}">
      <div class="thumb-row" id="thumb-row">
        ${property.imageUrls
          .map(
            (img, idx) =>
              `<img class="thumb ${idx === 0 ? "is-active" : ""}" data-image="${escapeHtml(img)}" src="${escapeHtml(img)}" alt="Gallery image ${idx + 1}">`
          )
          .join("")}
      </div>
      ${videoGalleryTemplate(property)}
    </section>

    <section class="shortlet-detail-wrap">
      <article class="shortlet-content">
        <section class="shortlet-section">
          <h2>About this space</h2>
          <p>${escapeHtml(property.description)}</p>
          <p>
            The space features a fully equipped kitchen, a dedicated workspace for remote professionals,
            and access to a serene swimming pool. Located close to key lifestyle spots while remaining private and secure.
          </p>
        </section>

        <section class="shortlet-section">
          <h2>What this place offers</h2>
          <div class="shortlet-amenity-grid">
            ${property.amenities
              .slice(0, 12)
              .map(
                (item) =>
                  `<div class="shortlet-amenity-item"><span>*</span><p>${escapeHtml(item.name)}</p></div>`
              )
              .join("")}
          </div>
          <button type="button" class="btn btn-ghost">Show all amenities</button>
        </section>

        ${shortletRulesTemplate()}
      </article>

      <aside class="shortlet-side">
        ${bookingWidgetTemplate(property)}
        <div class="shortlet-security-note">
          <h3>Secure Booking</h3>
          <p>Payment is handled securely upon arrival or via bank transfer.</p>
        </div>
      </aside>
    </section>
  `;
}

function shortletRulesTemplate() {
  return `
    <section class="shortlet-rules">
      <h2>Things to know</h2>
      <div class="shortlet-rules-grid">
        <article class="shortlet-rule-block">
          <h3>House Rules</h3>
          <ul>
            <li>Hard drugs and loud music are strictly prohibited.</li>
            <li>Pets are not allowed within the apartment.</li>
            <li>Check-in: 1:00 PM.</li>
            <li>Checkout: 12:00 PM.</li>
            <li>Smoking is not permitted within the premises.</li>
            <li>Unlawful activities are not allowed within the space.</li>
          </ul>
        </article>
        <article class="shortlet-rule-block">
          <h3>Safety & Property</h3>
          <ul>
            <li>Movement after 11:00 PM is restricted by estate policy.</li>
            <li>If you need to return late, inform security in advance.</li>
            <li>External ride-hailing drivers may be restricted in some estates.</li>
            <li>On-site/assigned pickup options can be arranged.</li>
          </ul>
        </article>
        <article class="shortlet-rule-block">
          <h3>Cancellation Policy</h3>
          <ul>
            <li>A refundable caution fee is mandatory.</li>
            <li>Refund timeline is typically 24 to 72 hours after checkout.</li>
            <li>Where there is property damage, caution fee may be retained.</li>
          </ul>
        </article>
      </div>
    </section>
  `;
}

function bookingWidgetTemplate(property) {
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = getTomorrowIso(today);
  return `
    <hr>
    <form id="booking-form" class="booking-form" data-title="${escapeHtml(property.title)}" data-price="${escapeHtml(property.priceDisplay)}" data-price-numeric="${property.priceNumeric}">
      <label><span>Full name</span><input name="name" required></label>
      <label><span>Phone</span><input name="phone" required></label>
      <div class="split-2">
        <label><span>Check-in</span><input name="checkIn" type="date" min="${today}" value="${today}" required></label>
        <label><span>Check-out</span><input name="checkOut" type="date" min="${tomorrow}" value="${tomorrow}" required></label>
      </div>
      <label><span>Guests</span><input name="guests" type="number" min="1" max="${Math.max(property.guests || 1, 1)}" value="1" required></label>
      <div class="form-row">
        <button type="submit" class="btn btn-primary" id="booking-submit-btn">Check Availability on WhatsApp</button>
      </div>
      <p class="booking-summary" id="booking-summary"></p>
    </form>
  `;
}

function floatingWhatsAppTemplate(property) {
  const label = `Quick enquiry for ${property.title}`;
  return `
    <button type="button" class="floating-whatsapp-btn" id="floating-whatsapp-btn" aria-label="${escapeHtml(label)}">
      <span class="floating-whatsapp-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M12.04 2.01C6.56 2.01 2.11 6.46 2.11 11.94c0 1.75.46 3.47 1.33 4.98L2 22l5.27-1.38a9.9 9.9 0 0 0 4.77 1.22h.01c5.48 0 9.93-4.45 9.93-9.93S17.53 2.01 12.04 2.01zm0 18.18h-.01a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3.13.82.84-3.05-.2-.32a8.25 8.25 0 0 1-1.26-4.39 8.25 8.25 0 0 1 8.24-8.24 8.25 8.25 0 0 1 8.24 8.24 8.25 8.25 0 0 1-8.24 8.26zm4.52-6.18c-.24-.12-1.4-.69-1.62-.77-.22-.08-.38-.12-.54.12-.16.24-.62.77-.76.93-.14.16-.28.18-.52.06-.24-.12-1.03-.38-1.96-1.21-.73-.65-1.22-1.46-1.36-1.7-.14-.24-.01-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.19-.46-.39-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.51.58.18 1.11.16 1.53.1.47-.07 1.4-.57 1.6-1.12.2-.55.2-1.02.14-1.12-.06-.1-.22-.16-.46-.28z"></path>
        </svg>
      </span>
      <span>WhatsApp</span>
    </button>
  `;
}

function floatingInquiryModalTemplate(property) {
  return `
    <div class="inquiry-modal" id="floating-inquiry-modal" aria-hidden="true">
      <button type="button" class="inquiry-modal-backdrop" data-modal-close aria-label="Close enquiry modal"></button>
      <article class="inquiry-modal-card" role="dialog" aria-modal="true" aria-labelledby="floating-inquiry-title">
        <div class="inquiry-modal-head">
          <h2 id="floating-inquiry-title">Send Enquiry</h2>
          <button type="button" class="inquiry-modal-close" data-modal-close aria-label="Close enquiry form">x</button>
        </div>
        <p class="inquiry-modal-sub">Property: ${escapeHtml(property.title)}</p>
        <form id="floating-inquiry-form" class="inquiry-form" data-title="${escapeHtml(property.title)}" data-price="${escapeHtml(property.priceDisplay)}">
          <label><span>Full name</span><input name="name" placeholder="Your name" required></label>
          <label><span>Phone</span><input name="phone" inputmode="tel" placeholder="Phone number" required></label>
          <label><span>Email (optional)</span><input type="email" name="email" placeholder="name@email.com"></label>
          <label><span>Message (optional)</span><textarea name="message" rows="3" placeholder="Any additional details"></textarea></label>
          <div class="form-row">
            <button type="submit" class="btn btn-primary">Send Enquiry on WhatsApp</button>
          </div>
        </form>
      </article>
    </div>
  `;
}

function bindGallery(images) {
  const mainImage = document.getElementById("main-image");
  const row = document.getElementById("thumb-row");
  if (!mainImage || !row || images.length < 2) return;

  row.addEventListener("click", (event) => {
    const thumb = event.target.closest(".thumb");
    if (!thumb) return;
    const src = thumb.dataset.image;
    if (!src) return;
    mainImage.src = src;
    row.querySelectorAll(".thumb").forEach((item) => item.classList.remove("is-active"));
    thumb.classList.add("is-active");
  });
}

function bindBookingWidget(property) {
  const form = document.getElementById("booking-form");
  const summary = document.getElementById("booking-summary");
  if (!form || !summary) return;
  const checkInInput = form.elements.checkIn;
  const checkOutInput = form.elements.checkOut;
  const submitButton = document.getElementById("booking-submit-btn");
  let isSubmitting = false;

  const ensureCheckoutAfterCheckin = () => {
    if (!checkInInput.value) return;
    const minimumCheckout = getTomorrowIso(checkInInput.value);
    checkOutInput.min = minimumCheckout;
    if (!checkOutInput.value || new Date(checkOutInput.value) <= new Date(checkInInput.value)) {
      checkOutInput.value = minimumCheckout;
    }
  };

  const syncSummary = () => {
    ensureCheckoutAfterCheckin();
    const checkIn = form.elements.checkIn.value;
    const checkOut = form.elements.checkOut.value;
    const guests = Number(form.elements.guests.value || 1);
    const nights = getNights(checkIn, checkOut);
    const total = nights * property.priceNumeric;
    summary.textContent = `${nights} night${nights > 1 ? "s" : ""} x ${property.priceDisplay} | Total: ${formatPrice(total)} (${guests} guest${guests > 1 ? "s" : ""})`;
  };

  checkInInput.addEventListener("change", syncSummary);
  checkOutInput.addEventListener("change", syncSummary);
  form.addEventListener("change", syncSummary);
  syncSummary();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity() || isSubmitting) return;
    ensureCheckoutAfterCheckin();
    const name = form.elements.name.value.trim();
    const phone = form.elements.phone.value.trim();
    const checkIn = form.elements.checkIn.value;
    const checkOut = form.elements.checkOut.value;
    const guests = Number(form.elements.guests.value || 1);
    const text = `Hello, my name is ${name}. I want to book "${property.title}" at ${property.priceDisplay}. Check-in: ${checkIn}, Check-out: ${checkOut}, Guests: ${guests}. You can reach me on ${phone}.`;
    isSubmitting = true;
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Connecting...";
    }

    try {
      const payload = {
        eventType: "whatsapp_click",
        propertySlug: property.slug,
        pagePath: window.location.pathname,
        sessionId: getOrCreateClientSessionId(),
        fullName: name,
        phone,
        checkIn,
        checkOut,
        guests,
        message: text,
      };
      const enquiry = await submitPublicEnquiry(payload);
      openWhatsApp(text, enquiry?.whatsappUrl);
    } finally {
      isSubmitting = false;
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Check Availability on WhatsApp";
      }
    }
  });
}

function bindFloatingEnquiry(property) {
  const button = document.getElementById("floating-whatsapp-btn");
  const modal = document.getElementById("floating-inquiry-modal");
  const form = document.getElementById("floating-inquiry-form");
  if (!button || !modal || !form) return;

  const closeModal = () => {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  };

  const openModal = () => {
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  };

  button.addEventListener("click", openModal);

  modal.addEventListener("click", (event) => {
    const close = event.target.closest("[data-modal-close]");
    if (close) {
      closeModal();
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("open")) {
      closeModal();
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const name = form.elements.name.value.trim();
    const phone = form.elements.phone.value.trim();
    const email = form.elements.email.value.trim();
    const note = form.elements.message.value.trim();
    const emailLine = email ? ` Email: ${email}.` : "";
    const noteLine = note ? ` Message: ${note}.` : "";
    const text = `Hello, my name is ${name}. I am interested in "${property.title}" listed at ${property.priceDisplay}. You can reach me on ${phone}.${emailLine}${noteLine}`;
    const payload = {
      eventType: "whatsapp_click",
      propertySlug: property.slug,
      pagePath: window.location.pathname,
      sessionId: getOrCreateClientSessionId(),
      fullName: name,
      phone,
      email: email || null,
      message: text,
    };
    const enquiry = await submitPublicEnquiry(payload);
    closeModal();
    openWhatsApp(text, enquiry?.whatsappUrl);
  });
}

function getNights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 1;
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diff = end.getTime() - start.getTime();
  const nights = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return nights > 0 ? nights : 1;
}

function openWhatsApp(message, whatsappUrl) {
  const url = whatsappUrl || `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

function videoGalleryTemplate(property) {
  if (!property.videoUrls.length) return "";

  return `
    <section class="property-video-gallery">
      <h2>Property Videos</h2>
      <div class="property-video-grid">
        ${property.videoUrls
          .map(
            (url, index) =>
              `<video src="${escapeHtml(url)}" controls preload="metadata" class="property-video-item" aria-label="${escapeHtml(property.title)} video ${index + 1}"></video>`
          )
          .join("")}
      </div>
    </section>
  `;
}

function getTodayIso() {
  return new Date().toISOString().split("T")[0];
}

function getTomorrowIso(dateStr) {
  const date = new Date(dateStr || getTodayIso());
  date.setDate(date.getDate() + 1);
  return date.toISOString().split("T")[0];
}

function getOrCreateClientSessionId() {
  try {
    const existing = localStorage.getItem(CLIENT_SESSION_KEY);
    if (existing) return existing;
    const generated = (typeof crypto !== "undefined" && crypto.randomUUID)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(CLIENT_SESSION_KEY, generated);
    return generated;
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

async function submitPublicEnquiry(payload) {
  try {
    const response = await fetch("/api/public/enquiry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json();
    if (!response.ok || !body?.ok) return null;
    return body;
  } catch {
    return null;
  }
}

function similarCardTemplate(item) {
  return `
    <a class="card" href="${detailPageForType(pageType)}?slug=${encodeURIComponent(item.slug)}">
      <img class="card-image" src="${escapeHtml(item.imageUrls[0] || "")}" alt="${escapeHtml(item.title)}" loading="lazy">
      <div class="card-body">
        <h3>${escapeHtml(item.title)}</h3>
        <p class="price">${escapeHtml(item.priceDisplay)}</p>
        <p>${escapeHtml(item.location)}</p>
      </div>
    </a>
  `;
}

function detailPageForType(type) {
  if (type === "land") return "/land-property.html";
  if (type === "shortlet") return "/shortlet-property.html";
  return "/housing-property.html";
}

function collectionPageForType(type) {
  if (type === "land") return "/land.html";
  if (type === "shortlet") return "/shortlet.html";
  return "/housing.html";
}
