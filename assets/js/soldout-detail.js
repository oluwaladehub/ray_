import { escapeHtml, formatPrice, queryToState } from "./utils.js";
import { initCommon } from "./common.js";
import { getSupabaseConfig } from "./config.js";
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
  is_distress_sale,
  property_media(media_kind, bucket_name, object_path, sort_order, is_cover),
  property_stats(id, label, value, icon, sort_order),
  property_amenities(id, name, icon, sort_order)
`;

initCommon("distress");
void renderPage();

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

  const property = await fetchPropertyBySlug(supabase, slug);
  if (!property) {
    shell.innerHTML = `<article class="property-card"><h2>Property not found</h2></article>`;
    return;
  }

  if (!isSoldOutTag(property.tag)) {
    window.location.replace(`${detailPageForType(property.propertyType)}?slug=${encodeURIComponent(property.slug)}`);
    return;
  }

  const similar = await fetchSimilar(supabase, property.propertyType, property.slug);
  document.title = `RaretifiedRealty | ${property.title} (Sold Out)`;

  shell.innerHTML = soldOutTemplate(property);
  related.innerHTML = similar.length
    ? similar.map((item) => similarCardTemplate(item)).join("")
    : `<article class="property-card"><p>No related properties available right now.</p></article>`;

  bindGallery(property.imageUrls);
}

function createSupabaseClient() {
  const factory = window.supabase?.createClient;
  if (typeof factory !== "function") return null;
  const cfg = getSupabaseConfig();
  if (!cfg) return null;
  return factory(cfg.url, cfg.anonKey);
}

async function fetchPropertyBySlug(supabase, slug) {
  const { data, error } = await supabase
    .from("properties")
    .select(PROPERTY_SELECT)
    .eq("listing_status", "published")
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
    propertyType: row.property_type,
    title: row.title,
    tag: row.tag || "",
    location: row.location,
    description: row.description || "",
    priceDisplay: row.price_display || formatPrice(row.price_numeric || 0),
    imageUrls: imageUrls.length ? imageUrls : [""],
    videoUrls,
    stats: statRows.length
      ? statRows.map((stat) => ({
          id: stat.id || `${stat.label}-${stat.sort_order}`,
          label: stat.label || "Detail",
          value: stat.value || "-",
        }))
      : fallbackStats(row),
    amenities: amenityRows.length
      ? amenityRows.map((item) => ({
          id: item.id || item.name,
          name: item.name,
        }))
      : [],
  };
}

function fallbackStats(row) {
  if (row.property_type === "land") {
    return [
      { id: "size", label: "Size", value: "-" },
      { id: "title", label: "Title", value: "Verified" },
      { id: "status", label: "Status", value: "Sold Out" },
    ];
  }

  if (row.property_type === "shortlet") {
    return [
      { id: "guests", label: "Guests", value: String(row.guests ?? 0) },
      { id: "beds", label: "Beds", value: String(row.beds ?? row.bedrooms ?? 0) },
      { id: "baths", label: "Baths", value: String(row.bathrooms ?? 0) },
    ];
  }

  return [
    { id: "beds", label: "Beds", value: String(row.beds ?? row.bedrooms ?? 0) },
    { id: "baths", label: "Baths", value: String(row.bathrooms ?? 0) },
    { id: "status", label: "Status", value: "Sold Out" },
  ];
}

function resolveMediaUrl(supabase, media) {
  if (!media?.object_path) return "";
  if (media.object_path.startsWith("http://") || media.object_path.startsWith("https://")) return media.object_path;
  const bucket = media.bucket_name || "property-media";
  const { data } = supabase.storage.from(bucket).getPublicUrl(media.object_path);
  return data.publicUrl;
}

function soldOutTemplate(property) {
  const typeTitle = typeLabel(property.propertyType);

  return `
    <section class="shortlet-page-head">
      <div class="property-breadcrumb">
        <a href="/index.html">Home</a> / <a href="/distress-sale.html">Distress Sale</a> / <span>${escapeHtml(property.title)}</span>
      </div>
      <div class="detail-top-row">
        <div>
          <p class="eyebrow">Sold Out | ${escapeHtml(typeTitle)}</p>
          <h1 class="shortlet-title">${escapeHtml(property.title)}</h1>
          <p class="shortlet-location">${escapeHtml(property.location)}</p>
        </div>
        <p class="detail-guide-price">Last Listed Price: <strong>${escapeHtml(property.priceDisplay)}</strong></p>
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
          <h2>About this property</h2>
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
          <h2>Property Features</h2>
          <div class="shortlet-amenity-grid">
            ${property.amenities
              .slice(0, 12)
              .map((item) => `<div class="shortlet-amenity-item"><span>*</span><p>${escapeHtml(item.name)}</p></div>`)
              .join("")}
          </div>
        </section>
      </article>

      <aside class="shortlet-side">
        <article class="property-card">
          <h2>Property Sold Out</h2>
          <p>This distress property is no longer available.</p>
          <div class="form-row">
            <a class="btn btn-primary" href="/distress-sale.html">Back to Distress Sale</a>
          </div>
        </article>
        <div class="shortlet-security-note">
          <h3>Contact Disabled</h3>
          <p>Enquiry and booking are turned off because this property has been marked as sold out.</p>
        </div>
      </aside>
    </section>
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

function similarCardTemplate(item) {
  return `
    <a class="card" href="${detailHrefForItem(item)}">
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

function detailHrefForItem(item) {
  if (isSoldOutTag(item.tag)) {
    return `/soldout-property.html?slug=${encodeURIComponent(item.slug)}`;
  }
  return `${detailPageForType(item.propertyType)}?slug=${encodeURIComponent(item.slug)}`;
}

function typeLabel(type) {
  if (type === "land") return "Land";
  if (type === "shortlet") return "Shortlet";
  return "Housing";
}

function isSoldOutTag(tag) {
  return String(tag || "").trim().toLowerCase().includes("sold out");
}
