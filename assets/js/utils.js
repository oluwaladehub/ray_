export function formatPrice(value) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

export function queryToState(search = window.location.search) {
  const params = new URLSearchParams(search);
  return {
    transactionType: params.get("transactionType") || "",
    location: params.get("location") || "",
    category: params.get("category") || "",
    beds: Number(params.get("beds") || 0),
    baths: Number(params.get("baths") || 0),
    minPrice: Number(params.get("minPrice") || 0),
    maxPrice: Number(params.get("maxPrice") || 0),
    sort: params.get("sort") || "recommended",
    exactLocationOnly: params.get("exactLocationOnly") === "true",
    page: Number(params.get("page") || 1),
    slug: params.get("slug") || ""
  };
}

export function stateToQuery(state) {
  const params = new URLSearchParams();
  Object.entries(state).forEach(([key, raw]) => {
    if (raw === "" || raw === 0 || raw === false || raw == null) return;
    params.set(key, String(raw));
  });
  return params.toString();
}

export function filterListings(listings, state) {
  return listings.filter((listing) => {
    if (state.transactionType && listing.transactionType !== state.transactionType) return false;
    if (state.location && !listing.location.toLowerCase().includes(state.location.toLowerCase())) return false;
    if (state.category && state.category !== "Any" && listing.category !== state.category) return false;
    if (state.beds && listing.specs.beds < state.beds) return false;
    if (state.baths && listing.specs.baths < state.baths) return false;
    if (state.minPrice && listing.price < state.minPrice) return false;
    if (state.maxPrice && listing.price > state.maxPrice) return false;
    if (state.exactLocationOnly && !listing.coordinatesLabel.toLowerCase().includes("exact")) return false;
    return true;
  });
}

export function sortListings(listings, sortMode) {
  const clone = [...listings];
  if (sortMode === "newest") {
    clone.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else if (sortMode === "price_high") {
    clone.sort((a, b) => b.price - a.price);
  } else if (sortMode === "price_low") {
    clone.sort((a, b) => a.price - b.price);
  }
  return clone;
}

export function getBySlug(items, slug) {
  return items.find((item) => item.slug === slug) || null;
}

export function cardTemplate(item) {
  const detailHref = item.category === "Land"
    ? "land-property.html"
    : item.transactionType === "rent"
      ? "shortlet-property.html"
      : "housing-property.html";

  return `
    <article class="card">
      <img class="card-image" src="${escapeHtml(item.gallery[0])}" alt="${escapeHtml(item.title)}" loading="lazy">
      <div class="card-body">
        <div class="card-meta">
          <span class="chip">${escapeHtml(item.transactionType)}</span>
          <span class="chip">${escapeHtml(item.category)}</span>
        </div>
        <h3>${escapeHtml(item.title)}</h3>
        <p class="price">${formatPrice(item.price)}</p>
        <p>${escapeHtml(item.location)}</p>
        <div class="stats">
          <span>${item.specs.beds} Beds</span>
          <span>${item.specs.baths} Baths</span>
          <span>${escapeHtml(item.specs.size)}</span>
        </div>
        <a class="btn btn-ghost" href="${detailHref}?slug=${encodeURIComponent(item.slug)}">View details</a>
      </div>
    </article>
  `;
}
