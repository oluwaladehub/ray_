import { escapeHtml } from "./utils.js";
import { getSupabaseConfig } from "./config.js";
let distressEnabledPromise = null;
let shortletEnabledPromise = null;

export function initCommon(page) {
  renderHeader(page);
  renderFooter();
  bindMobileNav();
  bindHeaderScroll(page);
  bindFeatureVisibilityRefresh(page);
  void syncDistressVisibility(page);
  void syncShortletVisibility(page);
}

function renderHeader(page) {
  const host = document.getElementById("site-header");
  if (!host) return;
  const activeShortlet = page === "shortlet";
  const activeHousing = page === "sale" || page === "housing";
  const activeLand = page === "land";
  const activeDistress = page === "distress";
  const activeContact = page === "contact";

  host.innerHTML = `
    <div class="site-header">
      <div class="container header-inner">
        <a href="/index.html" class="brand" aria-label="RaretifiedRealty home">
          <img src="/ray.jpeg" alt="RaretifiedRealty logo">
          <span>RaretifiedRealty</span>
        </a>
        <button class="mobile-toggle" id="mobile-toggle" type="button" aria-label="Open menu">
          <svg class="mobile-toggle-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <nav class="nav" id="primary-nav">
          <div class="nav-mobile-head">
            <a href="/index.html" class="brand nav-mobile-brand" aria-label="RaretifiedRealty home">
              <img src="/ray.jpeg" alt="RaretifiedRealty logo">
              <span>RaretifiedRealty</span>
            </a>
            <button class="nav-close" id="nav-close" type="button" aria-label="Close menu">
              <svg class="mobile-toggle-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M6 6l12 12M18 6l-12 12" />
              </svg>
            </button>
          </div>
          ${link("Sales", "/housing.html", activeHousing)}
          ${link("Land", "/land.html", activeLand)}
          ${link("Distress", "/distress-sale.html", activeDistress, "data-distress-nav")}
          ${link("Contact", "/snagging.html", activeContact)}
        </nav>
        <button class="nav-backdrop" id="nav-backdrop" type="button" aria-label="Close menu"></button>
      </div>
    </div>
  `;
}

// ${link("Shortlet", "/shortlet.html", activeShortlet, "data-shortlet-nav")}

function link(text, href, active, extraAttrs = "") {
  const className = active ? "active" : "";
  const attrs = extraAttrs ? ` ${extraAttrs}` : "";
  return `<a class="${className}" href="${escapeHtml(href)}"${attrs}>${escapeHtml(text)}</a>`;
}

function getYear() {
  return new Date().getFullYear();
}

function renderFooter() {
  const host = document.getElementById("site-footer");
  if (!host) return;
  host.innerHTML = `
    <div class="site-footer">
      <div class="container footer-inner">
        <div class="footer-brand-col">
          <div class="brand">
            <img src="/ray.jpeg" alt="RaretifiedRealty logo">
            <span>RaretifiedRealty</span>
          </div>
          <p class="footer-copy">Copyright ${getYear()} RaretifiedRealty</p>
        </div>
        <a class="footer-social-link" href="https://www.instagram.com/raretifiedrealty/" target="_blank" rel="noopener noreferrer" aria-label="Follow RaretifiedRealty on Instagram">
          <svg class="footer-social-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <rect x="3" y="3" width="18" height="18" rx="6" />
            <circle cx="12" cy="12" r="4.2" />
            <circle cx="17.5" cy="6.5" r="1.2" />
          </svg>
          <span>@raretifiedrealty</span>
        </a>
      </div>
    </div>
  `;
}

function bindMobileNav() {
  const toggle = document.getElementById("mobile-toggle");
  const nav = document.getElementById("primary-nav");
  const backdrop = document.getElementById("nav-backdrop");
  const close = document.getElementById("nav-close");
  if (!toggle || !nav || !backdrop) return;

  const syncState = (open) => {
    nav.classList.toggle("open", open);
    backdrop.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("nav-open", open);
  };

  toggle.setAttribute("aria-expanded", "false");
  nav.querySelectorAll("a").forEach((item, index) => {
    item.style.setProperty("--nav-i", String(index));
  });

  toggle.addEventListener("click", () => {
    syncState(!nav.classList.contains("open"));
  });

  nav.addEventListener("click", (event) => {
    const link = event.target.closest("a");
    if (link) {
      syncState(false);
    }
  });

  backdrop.addEventListener("click", () => syncState(false));
  close?.addEventListener("click", () => syncState(false));

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      syncState(false);
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 760) {
      syncState(false);
    }
  });
}

function bindHeaderScroll(page) {
  if (page !== "home") return;
  const header = document.querySelector(".site-header");
  if (!header) return;
  const onScroll = () => {
    if (window.scrollY > 140) header.classList.add("scrolled");
    else header.classList.remove("scrolled");
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

function clearFeatureVisibilityCache() {
  distressEnabledPromise = null;
  shortletEnabledPromise = null;
}

function bindFeatureVisibilityRefresh(page) {
  const refresh = () => {
    clearFeatureVisibilityCache();
    void syncDistressVisibility(page);
    void syncShortletVisibility(page);
  };

  window.addEventListener("focus", refresh);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      refresh();
    }
  });
}

function createSupabaseClient() {
  const factory = window.supabase?.createClient;
  if (typeof factory !== "function") return null;
  const cfg = getSupabaseConfig();
  if (!cfg) return null;
  return factory(cfg.url, cfg.anonKey);
}

export async function isDistressSaleEnabled() {
  if (distressEnabledPromise) {
    return distressEnabledPromise;
  }

  distressEnabledPromise = (async () => {
    const supabase = createSupabaseClient();
    if (!supabase) return false;

    const { data, error } = await supabase
      .from("properties")
      .select("id")
      .eq("listing_status", "published")
      .eq("is_distress_sale", true)
      .limit(1);

    if (error) {
      console.error("Failed to load distress sale status:", error);
      return false;
    }

    return Array.isArray(data) && data.length > 0;
  })();

  return distressEnabledPromise;
}

export async function isShortletEnabled() {
  if (shortletEnabledPromise) {
    return shortletEnabledPromise;
  }

  shortletEnabledPromise = (async () => {
    const supabase = createSupabaseClient();
    if (!supabase) return true;

    const { data, error } = await supabase.rpc("get_public_site_flags");

    if (error) {
      console.error("Failed to load shortlet status:", error);
      return true;
    }

    const flags = Array.isArray(data) ? data[0] : data;
    if (!flags || typeof flags.shortlet_enabled !== "boolean") {
      return true;
    }

    return flags.shortlet_enabled;
  })();

  return shortletEnabledPromise;
}

async function syncDistressVisibility(page) {
  const enabled = await isDistressSaleEnabled();

  document.querySelectorAll("[data-distress-nav]").forEach((linkEl) => {
    linkEl.classList.toggle("hidden", !enabled);
  });
  document.querySelectorAll("[data-distress-tab]").forEach((tabEl) => {
    tabEl.classList.toggle("hidden", !enabled);
  });

  if (!enabled && page === "distress") {
    window.location.replace("/index.html");
  }
}

async function syncShortletVisibility(page) {
  const enabled = await isShortletEnabled();

  document.querySelectorAll("[data-shortlet-nav]").forEach((linkEl) => {
    linkEl.classList.toggle("hidden", !enabled);
  });
  document.querySelectorAll("[data-shortlet-tab]").forEach((tabEl) => {
    tabEl.classList.toggle("hidden", !enabled);
  });
  document.querySelectorAll("[data-shortlet-section]").forEach((sectionEl) => {
    sectionEl.classList.toggle("hidden", !enabled);
  });

  if (!enabled && page === "shortlet") {
    window.location.replace("/index.html");
  }
}
