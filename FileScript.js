// FileScript.js
// Handles storing lead data and exporting CSV (clean format)

window.LeadExporter = (function () {
  // idKey -> lead object (idKey is placeId when available, else name+address)
  const leadsById = new Map();

  function makeIdKey(details) {
    const placeId = details.place_id || "";
    if (placeId) return placeId;

    const name = (details.name || "").trim();
    const address =
      (details.formatted_address || details.vicinity || "").trim();
    return `${name}::${address}` || String(Math.random());
  }

  function normalizeDetails(details) {
    const name = details.name || "";
    const address = details.formatted_address || details.vicinity || "";
    const phone = details.formatted_phone_number || "";
    const rating =
      details.rating != null && details.rating !== ""
        ? String(details.rating)
        : "";
    const reviews =
      details.user_ratings_total != null
        ? String(details.user_ratings_total)
        : "";

    // Shorter Google Maps URL: just a text search on name + address
    const query = [name, address].filter(Boolean).join(" ");
    const mapsUrl = query
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          query
        )}`
      : "";

    // Determine other platforms from website URL
    const website = details.website || "";
    const otherPlatforms = getOtherPlatforms(website);

    const idKey = makeIdKey(details);

    return { idKey, name, address, phone, rating, reviews, mapsUrl, otherPlatforms };
  }

  function getOtherPlatforms(url) {
    if (!url) return "";

    const lower = url.toLowerCase();
    const platforms = [];

    if (lower.includes("facebook.com") || lower.includes("fb.com")) {
      platforms.push("Facebook");
    }
    if (lower.includes("instagram.com")) {
      platforms.push("Instagram");
    }
    if (lower.includes("tiktok.com")) {
      platforms.push("TikTok");
    }
    if (lower.includes("yelp.com")) {
      platforms.push("Yelp");
    }
    if (lower.includes("tripadvisor.com")) {
      platforms.push("TripAdvisor");
    }
    if (lower.includes("grubhub.com")) {
      platforms.push("GrubHub");
    }
    if (lower.includes("doordash.com")) {
      platforms.push("DoorDash");
    }
    if (lower.includes("ubereats.com")) {
      platforms.push("UberEats");
    }
    if (lower.includes("seamless.com") || lower.includes("postmates.com")) {
      platforms.push("Delivery Site");
    }
    if (lower.includes("opentable.com")) {
      platforms.push("OpenTable");
    }
    if (lower.includes("toasttab.com")) {
      platforms.push("ToastTab");
    }

    return platforms.join(", ");
  }

  function addLead(details) {
    const lead = normalizeDetails(details);
    if (!lead.idKey) return;

    // Check if this is a duplicate
    const isDuplicate = leadsById.has(lead.idKey);
    if (isDuplicate) {
      console.log('Skipping duplicate:', lead.name);
      return; // Don't add duplicates
    }

    leadsById.set(lead.idKey, lead);
    console.log('Added lead:', lead.name, '(Total:', leadsById.size, ')');
  }

  function clearLeads() {
    leadsById.clear();
  }

  function getLeadCount() {
    return leadsById.size;
  }

  function csvEscape(value) {
    if (value == null) return "";
    const s = String(value).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    if (/[" ,\n]/.test(s)) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  function buildCsv() {
    // Header with Other Platforms column
    const header = [
      "Name",
      "Address",
      "Phone",
      "Rating",
      "Reviews",
      "Other Platforms",
      "Google Maps",
    ];
    const rows = [header.join(",")];

    for (const lead of leadsById.values()) {
      // Excel/Sheets hyperlink formula so the cell just shows "Maps"
      const mapsFormula = lead.mapsUrl
        ? `=HYPERLINK("${lead.mapsUrl}","Maps")`
        : "";

      const vals = [
        lead.name,
        lead.address,
        lead.phone,
        lead.rating,
        lead.reviews,
        lead.otherPlatforms,
        mapsFormula,
      ].map(csvEscape);

      rows.push(vals.join(","));
    }

    return rows.join("\r\n");
  }

  function downloadCsv(filename = "leads.csv") {
    if (leadsById.size === 0) {
      alert("No leads to export yet. Run a search first.");
      return;
    }

    const csv = buildCsv();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Show success message with count
    alert(`Successfully exported ${leadsById.size} unique leads to ${filename}`);
  }

  // Wire up button when DOM is ready
  document.addEventListener("DOMContentLoaded", () => {
    const downloadBtn = document.getElementById("download-csv-btn");
    if (downloadBtn) {
      downloadBtn.addEventListener("click", () => downloadCsv());
    }
  });

  return {
    addLead,
    clearLeads,
    downloadCsv,
    getLeadCount,
  };
})();
