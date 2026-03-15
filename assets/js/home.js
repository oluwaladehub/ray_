import { escapeHtml, formatPrice, stateToQuery } from "./utils.js";
import { initCommon, isDistressSaleEnabled, isShortletEnabled } from "./common.js";
import { getSupabaseConfig } from "./config.js";
const PROPERTY_SELECT = `
  id,
  slug,
  property_type,
  title,
  tag,
  location,
  price_display,
  price_numeric,
  bedrooms,
  bathrooms,
  beds,
  is_featured,
  featured_rank,
  sort_rank,
  created_at,
  property_media(media_kind, bucket_name, object_path, sort_order, is_cover),
  property_stats(label, value, sort_order),
  property_amenities(name, sort_order)
`;

const EMPTY_IMAGE = "";
const homeData = {
  housing: [],
  land: [],
  shortlet: [],
  distress: [],
};
let homepageLocations = [];
let isLoadingCollections = true;

initCommon("home");
bindHomeSearch();
renderHomeCollections();
void hydrateHomepageFromSupabase();

function bindHomeSearch() {
  const form = document.getElementById("hero-search-form");
  const tabs = document.getElementById("transaction-tabs");
  const locationSelect = document.getElementById("home-location-select");
  const categoryInput = document.getElementById("home-category-input");
  const typeLabel = document.getElementById("home-type-label");
  const transactionSelect = document.getElementById("home-transaction");
  if (!form || !tabs || !locationSelect || !categoryInput || !typeLabel) return;
  const syncPill = initHeroTabPill(tabs);
  const syncTabsLayout = () => {
    const visibleTabs = Array.from(tabs.querySelectorAll(".tab")).filter((tab) => {
      return !tab.classList.contains("hidden");
    });
    const count = Math.max(1, visibleTabs.length);
    tabs.style.setProperty("--tab-count", String(count));
  };

  const initialTransaction = form.elements.transactionType.value || "sale";
  updateTypeLabel(typeLabel, initialTransaction, categoryInput);
  renderLocationOptions(locationSelect);
  syncTabsLayout();
  syncPill();

  void (async () => {
    const [distressEnabled, shortletEnabled] = await Promise.all([
      isDistressSaleEnabled(),
      isShortletEnabled(),
    ]);
    const distressTab = tabs.querySelector("[data-distress-tab]");
    const shortletTab = tabs.querySelector("[data-shortlet-tab]");

    distressTab?.classList.toggle("hidden", !distressEnabled);
    shortletTab?.classList.toggle("hidden", !shortletEnabled);
    syncTabsLayout();

    if (!distressEnabled && form.elements.transactionType.value === "commercial") {
      form.elements.transactionType.value = "sale";
      updateTypeLabel(typeLabel, "sale", categoryInput);
      tabs.querySelectorAll(".tab").forEach((tab) => {
        tab.classList.toggle("is-active", tab.dataset.value === "sale");
      });
      if (transactionSelect) {
        transactionSelect.value = "sale";
      }
    }

    if (!shortletEnabled && form.elements.transactionType.value === "rent") {
      form.elements.transactionType.value = "sale";
      updateTypeLabel(typeLabel, "sale", categoryInput);
      tabs.querySelectorAll(".tab").forEach((tab) => {
        tab.classList.toggle("is-active", tab.dataset.value === "sale");
      });
      if (transactionSelect) {
        transactionSelect.value = "sale";
      }
    }
    syncPill();
  })();

  tabs.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-value]");
    if (!btn) return;
    tabs.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("is-active"));
    btn.classList.add("is-active");
    form.elements.transactionType.value = btn.dataset.value;
    updateTypeLabel(typeLabel, btn.dataset.value, categoryInput);
    if (transactionSelect) {
      transactionSelect.value = btn.dataset.value;
    }
    syncTabsLayout();
    syncPill();
  });

  transactionSelect?.addEventListener("change", () => {
    form.elements.transactionType.value = transactionSelect.value;
    updateTypeLabel(typeLabel, transactionSelect.value, categoryInput);
    tabs.querySelectorAll(".tab").forEach((tab) => {
      tab.classList.toggle("is-active", tab.dataset.value === transactionSelect.value);
    });
    syncTabsLayout();
    syncPill();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const minPriceRaw = form.elements.minPrice?.value ?? form.elements.priceRange?.value ?? "";
    const maxPriceRaw = form.elements.maxPrice?.value ?? "";
    const state = {
      transactionType: form.elements.transactionType.value || "",
      location: form.elements.location.value.trim(),
      category: form.elements.category.value.trim(),
      beds: 0,
      baths: 0,
      minPrice: Number(String(minPriceRaw).replace(/,/g, "") || 0),
      maxPrice: Number(String(maxPriceRaw).replace(/,/g, "") || 0),
      sort: "recommended",
      exactLocationOnly: false,
      page: 1
    };
    const destination = resolveCollectionDestination(state);
    const query = stateToQuery(state);
    window.location.href = `${destination}${query ? `?${query}` : ""}`;
  });
}

function updateTypeLabel(typeLabelEl, transactionType, categoryInputEl) {
  if (!typeLabelEl) return;
  const label = getTabLabel(transactionType);
  typeLabelEl.textContent = `${label} Type`;
  if (categoryInputEl) {
    categoryInputEl.placeholder = `Any ${label} Category`;
  }
}

function getTabLabel(transactionType) {
  const labels = {
    sale: "R&C Properties",
    rent: "Shortlet",
    lease: "Landed Properties",
    commercial: "Distress",
  };

  return labels[transactionType] || "Property";
}

function renderHomeCollections() {
  if (isLoadingCollections) {
    renderCollectionSkeletons();
    return;
  }

  renderDistressCollection();
  renderHousingCollection();
  renderLandCollection();
  renderShortletCollection();
  initHomeMediaSliders();
}

function renderDistressCollection() {
  const section = document.getElementById("distress-home-section");
  const target = document.getElementById("distress-collection");
  if (!target || !section) return;

  const distress = homeData.distress;
  section.classList.toggle("hidden", distress.length === 0);

  target.innerHTML = distress.length
    ? distress.map((item) => distressCardTemplate(item)).join("")
    : '<p class="home-empty">No distress listings available right now.</p>';
}

function renderHousingCollection() {
  const target = document.getElementById("housing-collection");
  if (!target) return;

  const housing = homeData.housing;

  target.innerHTML = housing.length
    ? housing.map((item) => housingCardTemplate(item)).join("")
    : '<p class="home-empty">No houses available right now.</p>';
}

function renderLandCollection() {
  const target = document.getElementById("land-collection");
  if (!target) return;

  const lands = homeData.land;

  target.innerHTML = lands.length
    ? lands.map((item) => landCardTemplate(item)).join("")
    : '<p class="home-empty">No land listings available right now.</p>';
}

function housingCardTemplate(item) {
  const beds = item.specs?.beds || 0;
  const baths = item.specs?.baths || 0;
  const size = escapeHtml(item.specs?.size || "-");
  const slides = mediaSliderTemplate(item.gallery, item.title);
  return `
    <a class="home-listing-card home-housing-card" href="${detailHrefForProperty(item)}">
      <div class="home-listing-media">
        ${slides}
        <span class="home-listing-price">${formatPrice(item.price)}</span>
      </div>
      <div class="home-listing-info">
        <div class="home-listing-row">
          <h3>${escapeHtml(item.title)}</h3>
          <p class="home-listing-location">${escapeHtml(item.location)}</p>
        </div>
        <div class="home-listing-stats">
          <span>${beds} Beds</span>
          <span>${baths} Baths</span>
          <span>${size}</span>
        </div>
      </div>
    </a>
  `;
}

function landCardTemplate(item) {
  const slides = mediaSliderTemplate(item.gallery, item.title);
  return `
    <a class="home-listing-card home-land-card" href="${detailHrefForProperty(item)}">
      <div class="home-listing-media">
        ${slides}
      </div>
      <div class="home-listing-info">
        <h3>${escapeHtml(item.title)}</h3>
        <p class="home-land-location">${escapeHtml(item.location)}</p>
        <p class="home-land-price">${formatPrice(item.price)}</p>
      </div>
    </a>
  `;
}

function renderShortletCollection() {
  const section = document.getElementById("shortlet-home-section");
  const target = document.getElementById("shortlet-collection");
  if (!target || !section) return;

  const shortlets = homeData.shortlet;
  section.classList.toggle("hidden", shortlets.length === 0);

  target.innerHTML = shortlets.length
    ? shortlets.map((item) => shortletCardTemplate(item)).join("")
    : '<p class="home-empty">No shortlet stays available right now.</p>';
}

function detailPageForType(type) {
  if (type === "land") return "/land-property.html";
  if (type === "shortlet") return "/shortlet-property.html";
  return "/housing-property.html";
}

function isSoldOutTag(tag) {
  return String(tag || "").trim().toLowerCase().includes("sold out");
}

function detailHrefForProperty(item) {
  if (isSoldOutTag(item.tag)) {
    return `/soldout-property.html?slug=${encodeURIComponent(item.slug)}`;
  }
  return `${detailPageForType(item.propertyType)}?slug=${encodeURIComponent(item.slug)}`;
}

function distressCardTemplate(item) {
  const slides = mediaSliderTemplate(item.gallery, item.title);
  const normalizedTag = String(item.tag || "").trim();
  const hasTag = normalizedTag.length > 0;
  const isSoldOut = normalizedTag.toLowerCase().includes("sold out");
  const tag = hasTag ? normalizedTag : "Distress Sale";
  const tagClass = isSoldOut ? "home-distress-tag is-sold-out" : "home-distress-tag";
  return `
    <a class="home-listing-card home-distress-card" href="${detailHrefForProperty(item)}">
      <div class="home-listing-media">
        ${slides}
        <span class="${tagClass}">${escapeHtml(tag)}</span>
        <span class="home-listing-price">${formatPrice(item.price)}</span>
      </div>
      <div class="home-listing-info">
        <div class="home-listing-row">
          <h3>${escapeHtml(item.title)}</h3>
          <p class="home-listing-location">${escapeHtml(item.location)}</p>
        </div>
        <div class="home-listing-stats">
          <span>${escapeHtml(item.propertyType)}</span>
          <span>${escapeHtml(item.priceDisplay || formatPrice(item.price))}</span>
        </div>
      </div>
    </a>
  `;
}

function shortletCardTemplate(item) {
  const slides = mediaSliderTemplate(item.gallery, item.title);
  const amenities = Array.isArray(item.amenities) ? item.amenities.slice(0, 3) : [];
  return `
    <a class="home-shortlet-card" href="${detailHrefForProperty(item)}">
      <div class="home-shortlet-media">
        ${slides}
      </div>
      <div class="home-shortlet-content">
        <p class="home-shortlet-price">${formatPrice(item.price)}</p>
        <h3 class="home-shortlet-title">${escapeHtml(item.title)}</h3>
        <p class="home-shortlet-location">${escapeHtml(item.location)}</p>
        <div class="home-shortlet-amenities">
          ${amenities.map((name) => `<span>${escapeHtml(name)}</span>`).join("")}
        </div>
      </div>
    </a>
  `;
}

function resolveCollectionDestination(state) {
  const transactionType = String(state.transactionType || "").toLowerCase();
  const category = String(state.category || "").toLowerCase();
  if (category === "land") return "/land.html";
  if (transactionType === "rent") return "/shortlet.html";
  if (transactionType === "commercial") return "/distress-sale.html";
  if (transactionType === "lease") return "/land.html";
  return "/housing.html";
}

function mediaSliderTemplate(images, title) {
  const slides = Array.isArray(images) && images.length ? images : [EMPTY_IMAGE];
  const safeTitle = escapeHtml(title);
  const slideHtml = slides
    .map(
      (src, index) =>
        `<img class="home-media-slide" src="${escapeHtml(src)}" alt="${safeTitle} ${index + 1}" loading="lazy">`
    )
    .join("");

  if (slides.length < 2) {
    return `
      <div class="home-media-slider" data-media-slider>
        <div class="home-media-track">${slideHtml}</div>
      </div>
    `;
  }

  const dots = slides
    .map(
      (_, index) =>
        `<button class="home-media-dot${index === 0 ? " is-active" : ""}" type="button" data-slide-to="${index}" aria-label="Show image ${index + 1}"></button>`
    )
    .join("");

  return `
    <div class="home-media-slider" data-media-slider>
      <div class="home-media-track">${slideHtml}</div>
      <button class="home-media-nav prev" type="button" data-slide-dir="-1" aria-label="Previous image">&lsaquo;</button>
      <button class="home-media-nav next" type="button" data-slide-dir="1" aria-label="Next image">&rsaquo;</button>
      <div class="home-media-dots">${dots}</div>
    </div>
  `;
}

function initHomeMediaSliders() {
  document.querySelectorAll("[data-media-slider]").forEach((slider) => {
    if (slider.dataset.ready === "1") return;

    const track = slider.querySelector(".home-media-track");
    const slides = slider.querySelectorAll(".home-media-slide");
    const dots = slider.querySelectorAll(".home-media-dot");
    if (!track || slides.length < 2) {
      slider.dataset.ready = "1";
      return;
    }

    let index = 0;
    let pointerStartX = null;
    let activePointerId = null;
    let suppressClick = false;

    const sync = () => {
      track.style.transform = `translateX(-${index * 100}%)`;
      dots.forEach((dot, dotIndex) => {
        dot.classList.toggle("is-active", dotIndex === index);
      });
    };

    slider.addEventListener("click", (event) => {
      if (suppressClick && !event.target.closest("[data-slide-dir],[data-slide-to]")) {
        event.preventDefault();
        event.stopPropagation();
        suppressClick = false;
        return;
      }

      const nav = event.target.closest("[data-slide-dir]");
      if (nav) {
        event.preventDefault();
        event.stopPropagation();
        const dir = Number(nav.dataset.slideDir || 0);
        index = (index + dir + slides.length) % slides.length;
        slider.classList.add("is-interacted");
        sync();
        return;
      }

      const dot = event.target.closest("[data-slide-to]");
      if (dot) {
        event.preventDefault();
        event.stopPropagation();
        index = Number(dot.dataset.slideTo || 0);
        slider.classList.add("is-interacted");
        sync();
      }
    });

    const onSwipe = (deltaX) => {
      if (Math.abs(deltaX) < 35) return;
      index = deltaX < 0
        ? (index + 1 + slides.length) % slides.length
        : (index - 1 + slides.length) % slides.length;
      slider.classList.add("is-interacted");
      suppressClick = true;
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

function initHeroTabPill(tabs) {
  const syncPill = () => {
    const activeTab = tabs.querySelector(".tab.is-active");
    if (!activeTab) return;

    const tabsRect = tabs.getBoundingClientRect();
    const activeRect = activeTab.getBoundingClientRect();
    tabs.style.setProperty("--pill-x", `${activeRect.left - tabsRect.left}px`);
    tabs.style.setProperty("--pill-y", `${activeRect.top - tabsRect.top}px`);
    tabs.style.setProperty("--pill-w", `${activeRect.width}px`);
    tabs.style.setProperty("--pill-h", `${activeRect.height}px`);
  };

  requestAnimationFrame(syncPill);
  window.addEventListener("resize", syncPill);
  return syncPill;
}

function renderLocationOptions(select = document.getElementById("home-location-select")) {
  if (!select) return;
  const options = [
    '<option value="">All locations</option>',
    ...homepageLocations.map((loc) => `<option value="${escapeHtml(loc)}">${escapeHtml(loc)}</option>`),
  ];
  select.innerHTML = options.join("");
}

async function hydrateHomepageFromSupabase() {
  const supabase = createSupabaseClient();
  if (!supabase) {
    isLoadingCollections = false;
    renderHomeCollections();
    return;
  }

  try {
    const [shortletEnabled, distressEnabled] = await Promise.all([
      isShortletEnabled(),
      isDistressSaleEnabled(),
    ]);

    const [housing, land, shortlet, distress] = await Promise.all([
      fetchHomepagePropertiesByType(supabase, "housing"),
      fetchHomepagePropertiesByType(supabase, "land"),
      shortletEnabled ? fetchHomepagePropertiesByType(supabase, "shortlet") : Promise.resolve([]),
      distressEnabled ? fetchHomepageDistressProperties(supabase) : Promise.resolve([]),
    ]);

    homeData.housing = housing;
    homeData.land = land;
    homeData.shortlet = shortlet;
    homeData.distress = distress;
    const merged = [...housing, ...land, ...shortlet, ...distress];
    homepageLocations = [...new Set(merged.map((item) => item.location).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b)
    );
  } catch (error) {
    console.error("Failed to load homepage data from Supabase:", error);
  } finally {
    isLoadingCollections = false;
    renderLocationOptions();
    renderHomeCollections();
  }
}

function createSupabaseClient() {
  const factory = window.supabase?.createClient;
  if (typeof factory !== "function") return null;
  const cfg = getSupabaseConfig();
  if (!cfg) return null;
  return factory(cfg.url, cfg.anonKey);
}

async function fetchHomepagePropertiesByType(supabase, propertyType) {
  const { data, error } = await supabase
    .from("properties")
    .select(PROPERTY_SELECT)
    .eq("listing_status", "published")
    .eq("property_type", propertyType)
    .eq("is_distress_sale", false)
    .order("is_featured", { ascending: false })
    .order("featured_rank", { ascending: true, nullsFirst: false })
    .order("sort_rank", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) {
    throw new Error(`Failed to fetch ${propertyType} properties: ${error.message}`);
  }

  const normalized = (data ?? []).map((row) => mapPropertyRowToListing(supabase, row));
  const featured = normalized.filter((item) => item.isFeatured);
  if (featured.length >= 3) return featured.slice(0, 3).map(stripInternalFields);

  const featuredIds = new Set(featured.map((item) => item.id));
  const fallback = normalized.filter((item) => !featuredIds.has(item.id));
  return [...featured, ...fallback].slice(0, 3).map(stripInternalFields);
}

async function fetchHomepageDistressProperties(supabase) {
  const { data, error } = await supabase
    .from("properties")
    .select(PROPERTY_SELECT)
    .eq("listing_status", "published")
    .eq("is_distress_sale", true)
    .order("sort_rank", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(`Failed to fetch distress properties: ${error.message}`);
  }

  return (data ?? []).map((row) => stripInternalFields(mapPropertyRowToListing(supabase, row)));
}

function mapPropertyRowToListing(supabase, row) {
  const mediaRows = [...(row.property_media ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const statRows = [...(row.property_stats ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const amenityRows = [...(row.property_amenities ?? [])].sort((a, b) => a.sort_order - b.sort_order);

  const imageUrls = mediaRows
    .filter((item) => item.media_kind === "image")
    .map((item) => resolveMediaUrl(supabase, item));

  const sizeStat = statRows.find((item) => item.label?.toLowerCase().includes("size"));

  return {
    id: row.id,
    slug: row.slug,
    propertyType: row.property_type,
    tag: row.tag || null,
    title: row.title,
    location: row.location,
    price: Number(row.price_numeric || 0),
    specs: {
      beds: Number(row.bedrooms ?? row.beds ?? 0),
      baths: Number(row.bathrooms ?? 0),
      size: sizeStat?.value || "-",
    },
    amenities: amenityRows.map((item) => item.name),
    gallery: imageUrls,
    createdAt: row.created_at,
    isFeatured: Boolean(row.is_featured),
  };
}

function stripInternalFields(item) {
  const { isFeatured, id, ...rest } = item;
  return rest;
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

function renderCollectionSkeletons() {
  renderSkeleton("housing-collection", 3, "housing");
  renderSkeleton("land-collection", 3, "land");
  renderSkeleton("shortlet-collection", 3, "shortlet");
}

function renderSkeleton(targetId, count, kind) {
  const target = document.getElementById(targetId);
  if (!target) return;

  target.innerHTML = Array.from({ length: count }, () => skeletonTemplate(kind)).join("");
}

function skeletonTemplate(kind) {
  if (kind === "shortlet") {
    return `
      <article class="home-skeleton home-skeleton-shortlet" aria-hidden="true">
        <div class="home-skeleton-media"></div>
        <div class="home-skeleton-content">
          <div class="home-skeleton-line lg"></div>
          <div class="home-skeleton-line md"></div>
          <div class="home-skeleton-line sm"></div>
        </div>
      </article>
    `;
  }

  return `
    <article class="home-skeleton home-skeleton-${kind}" aria-hidden="true">
      <div class="home-skeleton-media"></div>
      <div class="home-skeleton-content">
        <div class="home-skeleton-line lg"></div>
        <div class="home-skeleton-line md"></div>
        <div class="home-skeleton-line sm"></div>
      </div>
    </article>
  `;
}
