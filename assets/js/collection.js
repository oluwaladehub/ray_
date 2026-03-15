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
  is_featured,
  featured_rank,
  sort_rank,
  created_at,
  property_media(media_kind, bucket_name, object_path, sort_order, is_cover),
  property_stats(label, value, icon, sort_order)
`;
const PAGE_SIZE = 4;
const EMPTY_IMAGE = "";

const propertyType = normalizePropertyType(document.body.dataset.propertyType);
const pageName = document.body.dataset.page || toPageName(propertyType);
const distressOnly = document.body.dataset.distressOnly === "true";
const pageState = queryToState();
let collectionItems = [];
let visibleCount = PAGE_SIZE;

initCommon(pageName);
bindLoadMore();
void hydrateCollection();

function normalizePropertyType(type) {
  if (type === "all" || type === "land" || type === "shortlet") return type;
  return "housing";
}

function toPageName(type) {
  if (type === "land") return "land";
  if (type === "shortlet") return "shortlet";
  return "housing";
}

function createSupabaseClient() {
  const factory = window.supabase?.createClient;
  if (typeof factory !== "function") return null;
  const cfg = getSupabaseConfig();
  if (!cfg) return null;
  return factory(cfg.url, cfg.anonKey);
}

async function hydrateCollection() {
  const supabase = createSupabaseClient();
  if (!supabase) {
    render([]);
    return;
  }

  try {
    let request = supabase
      .from("properties")
      .select(PROPERTY_SELECT)
      .eq("listing_status", "published")
      .eq("is_distress_sale", distressOnly ? true : false)
      .order("is_featured", { ascending: false })
      .order("featured_rank", { ascending: true, nullsFirst: false })
      .order("sort_rank", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(60);

    if (propertyType !== "all") {
      request = request.eq("property_type", propertyType);
    }

    const { data, error } = await request;

    if (error) {
      throw new Error(error.message);
    }

    collectionItems = (data ?? []).map((row) => mapPropertyRowToCollectionItem(supabase, row));
    collectionItems = applyPageFilters(collectionItems, pageState);
    render(collectionItems);
  } catch (error) {
    console.error("Failed to load collection page:", error);
    render([]);
  }
}

function applyPageFilters(items, state) {
  return items.filter((item) => {
    if (state.location && !item.location.toLowerCase().includes(state.location.toLowerCase())) return false;
    if (state.minPrice && item.price < state.minPrice) return false;
    if (state.maxPrice && item.price > state.maxPrice) return false;
    return true;
  });
}

function mapPropertyRowToCollectionItem(supabase, row) {
  const mediaRows = [...(row.property_media ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const statRows = [...(row.property_stats ?? [])].sort((a, b) => a.sort_order - b.sort_order);
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
    title: row.title || "Untitled",
    location: row.location || "Unknown location",
    description: row.description || "",
    price: Number(row.price_numeric || 0),
    priceDisplay: row.price_display || formatPrice(row.price_numeric || 0),
    tag: row.tag || (distressOnly ? "Distress Sale" : "Featured"),
    images: imageUrls.length ? imageUrls : [EMPTY_IMAGE],
    videoUrls,
    stats: buildCollectionStats(row, statRows, row.property_type),
  };
}

function buildCollectionStats(row, statRows, type) {
  if (statRows.length) {
    return statRows.slice(0, 3).map((stat) => ({
      label: stat.label || "Detail",
      value: stat.value || "-",
    }));
  }

  if (type === "land") {
    return [
      { label: "Size", value: "-" },
      { label: "Title", value: "Verified" },
      { label: "Status", value: "Available" },
    ];
  }

  if (type === "shortlet") {
    return [
      { label: "Guests", value: String(row.guests ?? 0) },
      { label: "Beds", value: String(row.beds ?? row.bedrooms ?? 0) },
      { label: "Baths", value: String(row.bathrooms ?? 0) },
    ];
  }

  return [
    { label: "Beds", value: String(row.beds ?? row.bedrooms ?? 0) },
    { label: "Baths", value: String(row.bathrooms ?? 0) },
    { label: "Status", value: "Verified" },
  ];
}

function resolveMediaUrl(supabase, media) {
  if (!media?.object_path) return "";
  if (media.object_path.startsWith("http://") || media.object_path.startsWith("https://")) {
    return media.object_path;
  }

  const bucket = media.bucket_name || "property-media";
  const { data } = supabase.storage.from(bucket).getPublicUrl(media.object_path);
  return data.publicUrl;
}

function bindLoadMore() {
  const loadMoreButton = document.getElementById("load-more");
  if (!loadMoreButton) return;
  loadMoreButton.addEventListener("click", () => {
    visibleCount += PAGE_SIZE;
    render(collectionItems);
  });
}

function render(items) {
  const heading = document.getElementById("collection-heading");
  const count = document.getElementById("collection-count");
  const grid = document.getElementById("collection-grid");
  const loadMoreButton = document.getElementById("load-more");
  if (!heading || !count || !grid || !loadMoreButton) return;

  const visible = items.slice(0, visibleCount);
  heading.textContent = document.body.dataset.pageTitle || heading.textContent;
  count.textContent = `${items.length} listings found`;

  if (!items.length) {
    grid.innerHTML = `<article class="collection-empty">No listings available right now.</article>`;
    loadMoreButton.classList.add("hidden");
    return;
  }

  grid.innerHTML = visible.map((item, index) => collectionCardTemplate(item, index)).join("");
  initCollectionSliders();

  if (visible.length >= items.length) loadMoreButton.classList.add("hidden");
  else loadMoreButton.classList.remove("hidden");
}

function collectionCardTemplate(item, index) {
  const reverseClass = index % 2 === 1 ? " is-reverse" : "";
  const videoBadge = item.propertyType === "shortlet" && item.videoUrls.length
    ? `<span class="collection-pill video">Video</span>`
    : "";

  return `
    <article class="collection-card${reverseClass}">
      <div class="collection-media">
        <div class="collection-slider" data-collection-slider>
          <div class="collection-track">
            ${item.images
              .map(
                (src, imageIndex) =>
                  `<img class="collection-slide" src="${escapeHtml(src)}" alt="${escapeHtml(item.title)} ${imageIndex + 1}" loading="lazy">`
              )
              .join("")}
          </div>
          <span class="collection-pill">${escapeHtml(item.tag)}</span>
          ${videoBadge}
          ${sliderControlsTemplate(item.images.length)}
        </div>
      </div>
      <div class="collection-body">
        <p class="collection-location">${escapeHtml(item.location)}</p>
        <h2>${escapeHtml(item.title)}</h2>
        <p class="collection-desc">${escapeHtml(item.description)}</p>
        <p class="collection-price">${formatDisplayPrice(item.priceDisplay, item.propertyType)}</p>
        <div class="collection-stats">
          ${item.stats.map((stat) => `<div class="collection-stat"><strong>${escapeHtml(stat.value)}</strong><span>${escapeHtml(stat.label)}</span></div>`).join("")}
        </div>
        <a class="btn btn-ghost" href="${detailHrefForItem(item)}">View Details</a>
      </div>
    </article>
  `;
}

function isSoldOutTag(tag) {
  return String(tag || "").trim().toLowerCase().includes("sold out");
}

function detailHrefForItem(item) {
  if (isSoldOutTag(item.tag)) {
    return `/soldout-property.html?slug=${encodeURIComponent(item.slug)}`;
  }
  return `${detailPageForType(item.propertyType)}?slug=${encodeURIComponent(item.slug)}`;
}

function detailPageForType(type) {
  if (type === "land") return "/land-property.html";
  if (type === "shortlet") return "/shortlet-property.html";
  return "/housing-property.html";
}

function formatDisplayPrice(value, type) {
  if (type !== "land") return escapeHtml(value);
  const [main, suffix] = String(value || "").split("/");
  if (!suffix) return escapeHtml(value);
  return `${escapeHtml(main)} <small>/${escapeHtml(suffix)}</small>`;
}

function sliderControlsTemplate(slideCount) {
  if (slideCount < 2) return "";
  const dots = Array.from({ length: slideCount }, (_, index) =>
    `<button class="collection-dot${index === 0 ? " is-active" : ""}" type="button" data-collection-to="${index}" aria-label="Show image ${index + 1}"></button>`
  ).join("");

  return `
    <button class="collection-nav prev" type="button" data-collection-dir="-1" aria-label="Previous image">&lsaquo;</button>
    <button class="collection-nav next" type="button" data-collection-dir="1" aria-label="Next image">&rsaquo;</button>
    <div class="collection-dots">${dots}</div>
  `;
}

function initCollectionSliders() {
  document.querySelectorAll("[data-collection-slider]").forEach((slider) => {
    if (slider.dataset.ready === "1") return;
    const track = slider.querySelector(".collection-track");
    const slides = slider.querySelectorAll(".collection-slide");
    const dots = slider.querySelectorAll(".collection-dot");
    if (!track || slides.length < 2) {
      slider.dataset.ready = "1";
      return;
    }

    let index = 0;
    let pointerStartX = null;
    let activePointerId = null;

    const sync = () => {
      track.style.transform = `translateX(-${index * 100}%)`;
      dots.forEach((dot, dotIndex) => {
        dot.classList.toggle("is-active", dotIndex === index);
      });
    };

    slider.addEventListener("click", (event) => {
      const nav = event.target.closest("[data-collection-dir]");
      if (nav) {
        event.preventDefault();
        const dir = Number(nav.dataset.collectionDir || 0);
        index = (index + dir + slides.length) % slides.length;
        sync();
        return;
      }

      const dot = event.target.closest("[data-collection-to]");
      if (dot) {
        event.preventDefault();
        index = Number(dot.dataset.collectionTo || 0);
        sync();
      }
    });

    const onSwipe = (deltaX) => {
      if (Math.abs(deltaX) < 35) return;
      index = deltaX < 0
        ? (index + 1 + slides.length) % slides.length
        : (index - 1 + slides.length) % slides.length;
      sync();
    };

    slider.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse") return;
      pointerStartX = event.clientX;
      activePointerId = event.pointerId;
    }, { passive: true });

    slider.addEventListener("pointerup", (event) => {
      if (pointerStartX == null || activePointerId !== event.pointerId) return;
      onSwipe(event.clientX - pointerStartX);
      pointerStartX = null;
      activePointerId = null;
    }, { passive: true });

    slider.addEventListener("pointercancel", () => {
      pointerStartX = null;
      activePointerId = null;
    }, { passive: true });

    sync();
    slider.dataset.ready = "1";
  });
}
