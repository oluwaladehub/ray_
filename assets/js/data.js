export const themeTokens = {
  primary: "#3e0091",
  primaryHover: "#320074",
  lavender: "#dccdff",
  surface: "#ffffff",
  border: "#e8e2fa",
  text: "#171426",
  muted: "#5f5872"
};

export const categories = [
  "Any",
  "Apartment",
  "Terrace",
  "Detached",
  "Semi-Detached",
  "Penthouse",
  "Land",
  "Commercial"
];

export const locations = [
  "Lekki Phase 1, Lagos",
  "Ikoyi, Lagos",
  "Victoria Island, Lagos",
  "Ikeja GRA, Lagos",
  "Orchid Road, Lekki, Lagos",
  "Chevron, Lekki, Lagos",
  "Ajah, Lagos",
  "Abuja, Nigeria"
];

export const listings = [
  {
    id: 280,
    slug: "seagate-estate-ikate-2br-apartment",
    title: "2 Bedroom Apartment in Seagate Estate, Ikate",
    transactionType: "sale",
    category: "Apartment",
    location: "Lekki Phase 1, Lagos",
    price: 165000000,
    specs: { beds: 2, baths: 2, size: "132 sqm" },
    tags: ["Verified", "Inspection Ready"],
    summary: "Modern apartment with premium finish and easy access to schools and shopping.",
    amenities: ["Smart Lock", "Pool", "Gym", "24/7 Power", "Security", "Parking"],
    coordinatesLabel: "Exact location available",
    createdAt: "2026-02-10",
    gallery: [
      "https://d3d6p1r1do6n32.cloudfront.net/df1ad4eb-8cfc-4ae1-84eb-1683e9aad683.jpg",
      "https://d3d6p1r1do6n32.cloudfront.net/6bbf205e-92f0-41b9-a55c-428baa36f695.jpg",
      "https://d3d6p1r1do6n32.cloudfront.net/46a1595b-f2fd-407f-bb20-1f299286e67e.JPG"
    ]
  },
  {
    id: 779,
    slug: "orchid-road-4br-terrace",
    title: "4 Bedroom Terrace on Orchid Road, Lekki",
    transactionType: "sale",
    category: "Terrace",
    location: "Orchid Road, Lekki, Lagos",
    price: 285000000,
    specs: { beds: 4, baths: 4, size: "220 sqm" },
    tags: ["Verified", "New"],
    summary: "Spacious terrace in a gated estate with cinema room, rooftop lounge and modern kitchen.",
    amenities: ["Cinema Room", "Rooftop Lounge", "BQ", "Security", "Parking", "Water Treatment"],
    coordinatesLabel: "Exact location available",
    createdAt: "2026-03-01",
    gallery: [
      "https://d3d6p1r1do6n32.cloudfront.net/24c6b5d4-6155-414b-857a-f6465088ba1a.JPG",
      "https://d3d6p1r1do6n32.cloudfront.net/8d12e068-1922-465e-b823-0b0a81358c1c.JPG",
      "https://d3d6p1r1do6n32.cloudfront.net/68cad55e-d414-4c5d-82c0-38e5df5fefd2.JPG"
    ]
  },
  {
    id: 770,
    slug: "ikeja-gra-2br-apartment",
    title: "2 Bedroom Apartment in Ikeja GRA",
    transactionType: "sale",
    category: "Apartment",
    location: "Ikeja GRA, Lagos",
    price: 220000000,
    specs: { beds: 2, baths: 2, size: "148 sqm" },
    tags: ["Verified"],
    summary: "Elegant apartment with private balcony, smart controls and quick airport access.",
    amenities: ["Elevator", "Smart Controls", "Balcony", "Security", "Gym", "Parking"],
    coordinatesLabel: "Exact location available",
    createdAt: "2026-02-24",
    gallery: [
      "https://d3d6p1r1do6n32.cloudfront.net/944fb903-55f0-491b-ae3a-10c5dcaa6d4d.jpg",
      "https://d3d6p1r1do6n32.cloudfront.net/cfe92c49-ca12-42f9-ab70-3006df1bf351.JPG",
      "https://d3d6p1r1do6n32.cloudfront.net/5d157c9a-200f-4f20-aef5-3347e8d2c1c6.JPG"
    ]
  },
  {
    id: 812,
    slug: "ikoyi-5br-detached-waterfront",
    title: "5 Bedroom Detached Home in Ikoyi",
    transactionType: "sale",
    category: "Detached",
    location: "Ikoyi, Lagos",
    price: 950000000,
    specs: { beds: 5, baths: 6, size: "480 sqm" },
    tags: ["Luxury", "Verified"],
    summary: "Waterfront detached home with private jetty access and expansive family spaces.",
    amenities: ["Private Jetty", "Cinema", "Pool", "CCTV", "Solar", "2 Living Rooms"],
    coordinatesLabel: "Approximate location",
    createdAt: "2026-01-18",
    gallery: [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  {
    id: 834,
    slug: "vi-commercial-office-floor",
    title: "Commercial Office Floor in Victoria Island",
    transactionType: "commercial",
    category: "Commercial",
    location: "Victoria Island, Lagos",
    price: 72000000,
    specs: { beds: 0, baths: 2, size: "340 sqm" },
    tags: ["Commercial", "Prime"],
    summary: "Premium office floor with elevator lobby, reception, and backup power.",
    amenities: ["Reception", "Elevator", "Backup Power", "Parking", "24/7 Access", "CCTV"],
    coordinatesLabel: "Exact location available",
    createdAt: "2026-02-28",
    gallery: [
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1497215842964-222b430dc094?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1507206130118-b5907dca2df6?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  {
    id: 861,
    slug: "ajah-3br-rent",
    title: "3 Bedroom Apartment in Ajah",
    transactionType: "rent",
    category: "Apartment",
    location: "Ajah, Lagos",
    price: 14500000,
    specs: { beds: 3, baths: 3, size: "170 sqm" },
    tags: ["For Rent", "Verified"],
    summary: "Freshly finished apartment with ensuite rooms in a secure mini estate.",
    amenities: ["Ensuite Rooms", "Spacious Kitchen", "Water Heater", "Security", "Parking", "Play Area"],
    coordinatesLabel: "Approximate location",
    createdAt: "2026-03-04",
    gallery: [
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1560185007-cde436f6a4d0?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  {
    id: 893,
    slug: "chevron-4br-lease",
    title: "4 Bedroom Semi-Detached Home in Chevron",
    transactionType: "lease",
    category: "Semi-Detached",
    location: "Chevron, Lekki, Lagos",
    price: 32000000,
    specs: { beds: 4, baths: 5, size: "260 sqm" },
    tags: ["For Lease", "Verified"],
    summary: "Modern semi-detached house with family lounge and all rooms ensuite.",
    amenities: ["Family Lounge", "Ensuite", "BQ", "Security", "Power Backup", "Parking"],
    coordinatesLabel: "Exact location available",
    createdAt: "2026-02-08",
    gallery: [
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600607687644-c7171b42498f?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  {
    id: 917,
    slug: "abuja-land-investment-plot",
    title: "Residential Land in Abuja",
    transactionType: "sale",
    category: "Land",
    location: "Abuja, Nigeria",
    price: 65000000,
    specs: { beds: 0, baths: 0, size: "600 sqm" },
    tags: ["Land", "Verified"],
    summary: "Dry and titled plot in a fast growing district, ideal for residential development.",
    amenities: ["Title Documents", "Road Access", "Survey", "Drainage", "Perimeter", "Utility Proximity"],
    coordinatesLabel: "Exact location available",
    createdAt: "2026-01-29",
    gallery: [
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1454789548928-9efd52dc4031?auto=format&fit=crop&w=1200&q=80"
    ]
  }
];

export const testimonials = [
  {
    name: "Tolu A.",
    role: "Home Buyer",
    quote: "The exact-location verification saved me from making a rushed decision. The process was clear end to end."
  },
  {
    name: "Mariam K.",
    role: "Investor",
    quote: "RaretifiedRealty listings felt cleaner and more transparent than anywhere else I searched."
  },
  {
    name: "David O.",
    role: "Tenant",
    quote: "I moved within two weeks. Filters were accurate and every property I inspected matched expectations."
  }
];

export const snaggingPackages = [
  {
    id: "basic",
    title: "Basic",
    priceLabel: "N150,000",
    turnaround: "48 hours",
    cta: "Select Basic",
    features: ["Visual defect mapping", "Electrical checks", "Plumbing checks", "PDF summary report"]
  },
  {
    id: "plus",
    title: "Plus",
    priceLabel: "N250,000",
    turnaround: "36 hours",
    cta: "Select Plus",
    features: ["Everything in Basic", "Thermal/moisture scan", "Finishing quality score", "Developer handover support"]
  },
  {
    id: "premium",
    title: "Premium",
    priceLabel: "N400,000",
    turnaround: "24 hours",
    cta: "Select Premium",
    features: ["Everything in Plus", "Mechanical systems review", "Rectification checklist", "Post-fix reinspection"]
  }
];

export const faqs = [
  {
    q: "What is snagging inspection?",
    a: "Snagging is a professional quality check to identify defects before final property handover."
  },
  {
    q: "How soon do I get the report?",
    a: "Depending on package, reports are delivered in 24 to 48 hours after physical inspection."
  },
  {
    q: "Can I share the report with the developer?",
    a: "Yes. Your report is structured for direct issue tracking with the developer or contractor."
  },
  {
    q: "Do you inspect occupied homes?",
    a: "Yes. We inspect both newly completed units and occupied properties requiring quality audits."
  }
];
