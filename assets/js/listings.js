import { categories, listings, locations } from "./data.js";
import { cardTemplate, filterListings, queryToState, sortListings, stateToQuery } from "./utils.js";
import { initCommon } from "./common.js";

const PAGE_SIZE = 6;
let state = queryToState();
let visibleCount = PAGE_SIZE;

initCommon("listings");
setupFilters();
render();

function setupFilters() {
  const form = document.getElementById("filters-form");
  const categorySelect = document.getElementById("listings-categories");
  const locationsDatalist = document.getElementById("listings-locations");
  const sortSelect = document.getElementById("sort-select");
  const resetButton = document.getElementById("reset-filters");
  const loadMoreButton = document.getElementById("load-more");
  const openFilters = document.getElementById("open-filters");
  const closeFilters = document.getElementById("close-filters");
  const panel = document.getElementById("filters-panel");
  const quickTabs = document.getElementById("quick-tabs");
  const toggleMap = document.getElementById("toggle-map");
  const mapPanel = document.getElementById("map-panel");

  if (!form || !categorySelect || !locationsDatalist || !sortSelect || !resetButton || !loadMoreButton) return;

  categorySelect.innerHTML = categories.map((cat) => `<option value="${cat === "Any" ? "" : cat}">${cat}</option>`).join("");
  locationsDatalist.innerHTML = locations.map((loc) => `<option value="${loc}"></option>`).join("");

  form.elements.transactionType.value = state.transactionType;
  form.elements.location.value = state.location;
  form.elements.category.value = state.category;
  form.elements.beds.value = state.beds ? String(state.beds) : "";
  form.elements.baths.value = state.baths ? String(state.baths) : "";
  form.elements.minPrice.value = state.minPrice ? String(state.minPrice) : "";
  form.elements.maxPrice.value = state.maxPrice ? String(state.maxPrice) : "";
  form.elements.exactLocationOnly.checked = state.exactLocationOnly;
  sortSelect.value = state.sort;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    state = {
      ...state,
      transactionType: form.elements.transactionType.value,
      location: form.elements.location.value.trim(),
      category: form.elements.category.value,
      beds: Number(form.elements.beds.value || 0),
      baths: Number(form.elements.baths.value || 0),
      minPrice: Number(form.elements.minPrice.value || 0),
      maxPrice: Number(form.elements.maxPrice.value || 0),
      exactLocationOnly: form.elements.exactLocationOnly.checked,
      page: 1
    };
    visibleCount = PAGE_SIZE;
    syncUrl();
    render();
    panel?.classList.remove("open");
  });

  sortSelect.addEventListener("change", () => {
    state.sort = sortSelect.value;
    state.page = 1;
    visibleCount = PAGE_SIZE;
    syncUrl();
    render();
  });

  resetButton.addEventListener("click", () => {
    state = {
      transactionType: "",
      location: "",
      category: "",
      beds: 0,
      baths: 0,
      minPrice: 0,
      maxPrice: 0,
      sort: "recommended",
      exactLocationOnly: false,
      page: 1
    };
    form.reset();
    sortSelect.value = state.sort;
    visibleCount = PAGE_SIZE;
    syncUrl();
    render();
  });

  loadMoreButton.addEventListener("click", () => {
    visibleCount += PAGE_SIZE;
    render();
  });

  openFilters?.addEventListener("click", () => panel?.classList.add("open"));
  closeFilters?.addEventListener("click", () => panel?.classList.remove("open"));

  quickTabs?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-transaction]");
    if (!button) return;
    state.transactionType = button.dataset.transaction || "";
    form.elements.transactionType.value = state.transactionType;
    visibleCount = PAGE_SIZE;
    syncUrl();
    render();
  });

  toggleMap?.addEventListener("click", () => {
    mapPanel?.classList.toggle("hidden");
    toggleMap.textContent = mapPanel?.classList.contains("hidden") ? "Maps" : "Hide map";
  });
}

function syncUrl() {
  const query = stateToQuery(state);
  history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
}

function render() {
  const heading = document.getElementById("results-heading");
  const count = document.getElementById("results-count");
  const grid = document.getElementById("results-grid");
  const loadMoreButton = document.getElementById("load-more");
  const quickTabs = document.getElementById("quick-tabs");
  if (!heading || !count || !grid || !loadMoreButton) return;

  const filtered = filterListings(listings, state);
  const sorted = sortListings(filtered, state.sort);
  const visible = sorted.slice(0, visibleCount);

  heading.textContent = state.transactionType
    ? `${capitalize(state.transactionType)} Properties`
    : "Properties";
  count.textContent = `${sorted.length} listings found`;
  quickTabs?.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.transaction === state.transactionType);
  });

  if (!sorted.length) {
    grid.innerHTML = `<article class="property-card"><h3>No listings found</h3><p>Try adjusting your filters to see more results.</p></article>`;
    loadMoreButton.classList.add("hidden");
    return;
  }

  grid.innerHTML = visible.map(cardTemplate).join("");
  if (visible.length >= sorted.length) loadMoreButton.classList.add("hidden");
  else loadMoreButton.classList.remove("hidden");
}

function capitalize(value) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}
