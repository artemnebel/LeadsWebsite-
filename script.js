let map;
let service;
let markers = [];
let centerMarker = null;
let searchCircle = null;
let selectedCenter = null;
let infoWindow = null;
let currentMarker = null; // which marker's popup is open

// Track which places we've already shown (per search)
const seenPlaceIds = new Set();

// Results summary counts (per search)
let resultsCount = 0;
let noRealWebsiteCount = 0;

// Scan limit
const SCANS_KEY = "lf_scans_used";
const MAX_SCANS = 10; // Production limit
let scansUsed = 0;

// ---------- Scan limit helpers ----------

function loadScansFromStorage() {
  let stored = parseInt(localStorage.getItem(SCANS_KEY) || "0", 10);
  if (Number.isNaN(stored) || stored < 0) stored = 0;
  scansUsed = stored;
  updateScansUI();
}

function updateScansUI() {
  const label = document.getElementById("credits-label");
  if (label) {
    const remaining = MAX_SCANS - scansUsed;
    label.textContent = `${remaining}/${MAX_SCANS} Scans`;
  }
  localStorage.setItem(SCANS_KEY, String(scansUsed));
}

function consumeScan() {
  if (scansUsed >= MAX_SCANS) return false;
  scansUsed += 1;
  updateScansUI();
  return true;
}

// ---------- Results summary ----------

function milesToMeters(mi) {
  return mi * 1609.34;
}

function metersToMiles(m) {
  return m / 1609.34;
}

function updateRadiusLabel() {
  const el = document.getElementById("radius-value");
  if (!el || !searchCircle) return;
  const radiusMeters = searchCircle.getRadius();
  const miles = metersToMiles(radiusMeters);
  console.log('Updating radius:', radiusMeters, 'meters =', miles, 'miles');
  el.textContent = `${miles.toFixed(1)} mi`;
}

let loadingInterval = null;

function updateResultsSummary(statusText) {
  const el = document.getElementById("results-summary");
  const container = document.getElementById("results-summary-container");
  const addBtn = document.getElementById("add-to-csv-btn");
  if (!el || !container) return;

  // Clear any existing loading animation
  if (loadingInterval) {
    clearInterval(loadingInterval);
    loadingInterval = null;
  }

  if (statusText) {
    container.style.display = "flex";
    el.style.display = "block";
    if (addBtn) addBtn.style.display = "none";

    // Animate "Searching..." with dots
    if (statusText.toLowerCase().includes('searching')) {
      let dotCount = 0;
      el.textContent = "Searching";
      loadingInterval = setInterval(() => {
        dotCount = (dotCount + 1) % 4;
        el.textContent = "Searching" + ".".repeat(dotCount);
      }, 500);
    } else {
      el.textContent = statusText;
    }
    return;
  }

  if (resultsCount === 0) {
    container.style.display = "flex";
    el.style.display = "block";
    if (addBtn) addBtn.style.display = "none";
    el.textContent = "No businesses found for this search.";
    return;
  }

  const leadPart =
    noRealWebsiteCount > 0
      ? ` • ${noRealWebsiteCount} with no real website`
      : "";

  container.style.display = "flex";
  el.style.display = "block";
  el.textContent = `Found ${resultsCount} businesses${leadPart}.`;

  // Show "Add to CSV" button when there are results
  if (addBtn) addBtn.style.display = "block";
}

// Offset helper

function offsetLatLng(latLng, dxMeters, dyMeters) {
  const earthRadius = 6378137; // meters
  const dLat = dyMeters / earthRadius;
  const dLng = dxMeters / (earthRadius * Math.cos((Math.PI * latLng.lat()) / 180));

  const newLat = latLng.lat() + (dLat * 180) / Math.PI;
  const newLng = latLng.lng() + (dLng * 180) / Math.PI;

  return new google.maps.LatLng(newLat, newLng);
}

// ---------- Website classification ----------

function classifyWebsite(url) {
  if (!url) {
    return { type: "none", label: "No website listed", isReal: false };
  }

  const lower = url.toLowerCase();

  const checks = [
    { domain: "facebook.com", type: "facebook", label: "Facebook page" },
    { domain: "fb.com", type: "facebook", label: "Facebook page" },
    { domain: "instagram.com", type: "instagram", label: "Instagram page" },
    { domain: "tiktok.com", type: "tiktok", label: "TikTok page" },
    { domain: "yelp.com", type: "yelp", label: "Yelp listing" },
    { domain: "tripadvisor.com", type: "tripadvisor", label: "Tripadvisor listing" },
    { domain: "grubhub.com", type: "grubhub", label: "Grubhub page" },
    { domain: "doordash.com", type: "doordash", label: "DoorDash page" },
    { domain: "ubereats.com", type: "ubereats", label: "UberEats page" },
    { domain: "seamless.com", type: "delivery", label: "Delivery site" },
    { domain: "postmates.com", type: "delivery", label: "Delivery site" },
    { domain: "opentable.com", type: "reservations", label: "Reservation page" },
    { domain: "toasttab.com", type: "ordering", label: "Ordering page" },
  ];

  for (const c of checks) {
    if (lower.includes(c.domain)) {
      return { type: c.type, label: c.label, isReal: false };
    }
  }

  // Anything else is likely their own "real" website
  return { type: "real", label: "Website", isReal: true };
}

function hasRealWebsite(url) {
  return classifyWebsite(url).isReal;
}

// ---------- Popup content ----------

function buildInfoContent(details) {
  const name = details.name || "Unknown business";
  const address =
    details.formatted_address || details.vicinity || "Address not available";

  const ratingVal = details.rating;
  const ratingText = ratingVal
    ? `${ratingVal.toFixed(1)} ★ (${details.user_ratings_total || 0} reviews)`
    : "No rating";

  const openNow =
    details.opening_hours && typeof details.opening_hours.open_now === "boolean"
      ? details.opening_hours.open_now
      : null;

  const openText =
    openNow === null
      ? ""
      : `<span style="color:${openNow ? "#16a34a" : "#dc2626"};">
           ${openNow ? "Open now" : "Closed now"}
         </span>`;

  const phone = details.formatted_phone_number;
  const phoneClean = phone ? phone.replace(/[^0-9+]/g, "") : null;
  const phoneLine = phone
    ? `<div style="margin-bottom:4px;"><strong>Phone:</strong> <a href="tel:${phoneClean}">${phone}</a></div>`
    : `<div style="margin-bottom:4px;"><strong>Phone:</strong> <span style="color:#f97316;">Not listed</span></div>`;

  const website = details.website;
  const websiteInfo = classifyWebsite(website);
  const websiteLine =
    websiteInfo.type === "none"
      ? `<div style="margin-bottom:2px;">
           <strong>Website:</strong>
           <span style="color:#dc2626;">No website listed</span>
         </div>`
      : `<div style="margin-bottom:2px;">
           <strong>${websiteInfo.label}:</strong>
           <a href="${website}" target="_blank" rel="noopener noreferrer">Open</a>
         </div>`;

  const mapsUrl = details.place_id
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        name
      )}&query_place_id=${details.place_id}`
    : null;

  const titleHtml = mapsUrl
    ? `<a href="${mapsUrl}" target="_blank" rel="noopener noreferrer"
          style="color:#2563eb; font-weight:600; text-decoration:underline;">
          ${name}
       </a>`
    : `<span style="font-weight:600;">${name}</span>`;

  return `
    <div style="
      max-width:260px;
      font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      background:#ffffff;
      color:#111827;
      padding:6px 4px;
    ">
      <div style="font-size:14px;margin-bottom:4px;">
        ${titleHtml}
      </div>
      <div style="font-size:12px;color:#374151;margin-bottom:4px;">
        ${address}
      </div>
      <div style="font-size:12px;margin-bottom:4px;">
        <strong>Rating:</strong> ${ratingText}
        ${openText ? " • " + openText : ""}
      </div>
      ${phoneLine}
      ${websiteLine}
    </div>
  `;
}

// ---------- Marker creation ----------

function createMarkerFromDetails(details) {
  if (!details.geometry || !details.geometry.location) return;

  const marker = new google.maps.Marker({
    map: map,
    position: details.geometry.location,
    animation: google.maps.Animation.DROP, // Animate pin dropping
  });

  resultsCount += 1;
  if (!hasRealWebsite(details.website)) {
    noRealWebsiteCount += 1;
  }
  updateResultsSummary();

  if (window.LeadExporter) {
    window.LeadExporter.addLead(details);
  }

  function openInfo(fromClick = false) {
    if (!infoWindow) {
      infoWindow = new google.maps.InfoWindow();
    }

    if (fromClick && infoWindow.getMap() && currentMarker === marker) {
      infoWindow.close();
      currentMarker = null;
      return;
    }

    infoWindow.setContent(buildInfoContent(details));
    infoWindow.open(map, marker);
    currentMarker = marker;
  }

  marker.addListener("click", () => openInfo(true));

  markers.push(marker);
}

// ---------- Marker clearing ----------

function clearMarkers() {
  for (const m of markers) {
    m.setMap(null);
  }
  markers = [];
  seenPlaceIds.clear();
}

// ---------- Map init & circle ----------

function initMap() {
  console.log('initMap called');
  const defaultCenter = { lat: 40.7128, lng: -74.0060 };

  const mapElement = document.getElementById("map");
  console.log('Map element:', mapElement);

  if (!mapElement) {
    console.error('Map element not found!');
    return;
  }

  map = new google.maps.Map(mapElement, {
    center: defaultCenter,
    zoom: 12,
  });

  console.log('Map created:', map);

  infoWindow = new google.maps.InfoWindow();

  map.addListener("click", () => {
    if (infoWindow) {
      infoWindow.close();
      currentMarker = null;
    }
  });

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        map.setCenter(userLocation);
        map.setZoom(13);
        selectedCenter = userLocation;
        createOrUpdateCircle();
      },
      () => {
        selectedCenter = defaultCenter;
        createOrUpdateCircle();
      }
    );
  } else {
    selectedCenter = defaultCenter;
    createOrUpdateCircle();
  }

  service = new google.maps.places.PlacesService(map);

  map.addListener("click", (e) => {
    selectedCenter = e.latLng;
    createOrUpdateCircle();
  });
}

// Make initMap globally accessible for Google Maps callback
window.initMap = initMap;

function createOrUpdateCircle() {
  if (!selectedCenter || !map) return;

  const centerLatLng =
    selectedCenter instanceof google.maps.LatLng
      ? selectedCenter
      : new google.maps.LatLng(selectedCenter.lat, selectedCenter.lng);

  const defaultRadiusMeters = milesToMeters(5.0); // Default 5 miles
  const radiusMeters = searchCircle ? searchCircle.getRadius() : defaultRadiusMeters;

  if (!centerMarker) {
    centerMarker = new google.maps.Marker({
      map,
      position: centerLatLng,
      title: "Search center",
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: "#000000",
        fillOpacity: 1,
        strokeColor: "#FFFFFF",
        strokeWeight: 2,
      },
    });
  } else {
    centerMarker.setPosition(centerLatLng);
  }

  if (!searchCircle) {
    searchCircle = new google.maps.Circle({
      map,
      center: centerLatLng,
      radius: radiusMeters,
      strokeColor: "#2563eb",
      strokeOpacity: 0.9,
      strokeWeight: 2,
      fillColor: "#2563eb",
      fillOpacity: 0.15,
      editable: true,
      draggable: true,
    });

    searchCircle.addListener("radius_changed", () => {
      const currentRadius = searchCircle.getRadius();
      const maxRadius = milesToMeters(10);

      if (currentRadius > maxRadius) {
        searchCircle.setRadius(maxRadius);
      }

      updateRadiusLabel();
    });

    searchCircle.addListener("center_changed", () => {
      selectedCenter = searchCircle.getCenter();
      if (centerMarker) {
        centerMarker.setPosition(selectedCenter);
      }
    });
  } else {
    searchCircle.setCenter(centerLatLng);
    searchCircle.setRadius(radiusMeters);
  }

  updateRadiusLabel();
}

// ---------- Places search ----------

function runNearbySearch(centerLatLng, radiusMeters, keyword, filters) {
  const request = {
    location: centerLatLng,
    radius: String(radiusMeters),
    keyword: keyword,
  };

  service.nearbySearch(request, (results, status) => {
    if (status !== "OK" || !results || results.length === 0) {
      updateResultsSummary("No results returned from Google Places.");
      return;
    }

    // Filter and process results
    const placesToFetch = results.filter((place) => {
      if (filters.minRating > 0 && place.rating && place.rating < filters.minRating) {
        return false;
      }
      if (!place.place_id || seenPlaceIds.has(place.place_id)) {
        return false;
      }
      seenPlaceIds.add(place.place_id);
      return true;
    });

    // Limit to 15 places for instant results
    const MAX_PLACES_TO_CHECK = 15;
    const limitedPlaces = placesToFetch.slice(0, MAX_PLACES_TO_CHECK);

    console.log(`Processing ${limitedPlaces.length} businesses (${placesToFetch.length} total found)...`);

    // If no places to check, show no results immediately
    if (limitedPlaces.length === 0) {
      updateResultsSummary();
      return;
    }

    // Track how many requests have completed
    let completedRequests = 0;

    // Instant processing - no delays, fire all requests immediately
    limitedPlaces.forEach((place) => {
      service.getDetails(
        {
          placeId: place.place_id,
          fields: [
            "name",
            "formatted_address",
            "formatted_phone_number",
            "website",
            "rating",
            "user_ratings_total",
            "opening_hours",
            "geometry",
            "place_id",
            "vicinity",
          ],
        },
        (details, detailsStatus) => {
          completedRequests++;

          if (detailsStatus !== "OK" || !details) {
            // Check if all requests are done
            if (completedRequests === limitedPlaces.length) {
              updateResultsSummary();
            }
            return;
          }

          console.log('Processing business:', details.name, 'Website:', details.website);

          if (filters.mustHavePhone && !details.formatted_phone_number) {
            console.log('  -> Filtered out: no phone');
            // Check if all requests are done
            if (completedRequests === limitedPlaces.length) {
              updateResultsSummary();
            }
            return;
          }

          // Only show businesses with NO website at all
          if (details.website) {
            console.log('  -> Filtered out: has website');
            // Check if all requests are done
            if (completedRequests === limitedPlaces.length) {
              updateResultsSummary();
            }
            return;
          }

          console.log('  -> ADDED to results (no website)');
          createMarkerFromDetails(details);

          // Check if all requests are done
          if (completedRequests === limitedPlaces.length) {
            updateResultsSummary();
          }
        }
      );
    });
  });
}


// ---------- DOM wiring ----------

document.addEventListener("DOMContentLoaded", () => {
  loadScansFromStorage();

  const searchBtn = document.getElementById("search-btn");
  const categoryInput = document.getElementById("category-input");
  const filterPhoneCheckbox = document.getElementById("filter-phone");
  const filterRatingSelect = document.getElementById("filter-rating");

  searchBtn.addEventListener("click", () => {
    if (scansUsed >= MAX_SCANS) {
      alert("You have used all of your scans. Thank you for trying Local Lead Finder!");
      return;
    }

    const keyword = categoryInput.value.trim();
    if (!keyword) {
      alert("Please enter a business category (e.g. plumbers, restaurants).");
      return;
    }

    if (!searchCircle) {
      alert("Click on the map to choose a search area first.");
      return;
    }

    const centerLatLng = searchCircle.getCenter();
    let radiusMeters = searchCircle.getRadius();

    const MAX_RADIUS = milesToMeters(10); // Max 10 miles
    if (radiusMeters > MAX_RADIUS) {
      radiusMeters = MAX_RADIUS;
      searchCircle.setRadius(MAX_RADIUS);
      alert("Maximum radius is 10 miles. Radius has been adjusted.");
    }

    const filters = {
      mustHavePhone: filterPhoneCheckbox.checked,
      minRating: parseFloat(filterRatingSelect.value) || 0,
    };

    // Consume one scan per search
    if (!consumeScan()) {
      alert("You have used all of your scans. Thank you for trying Local Lead Finder!");
      return;
    }

    clearMarkers();
    resultsCount = 0;
    noRealWebsiteCount = 0;
    updateResultsSummary("Searching...");

    // Don't clear leads anymore - we want to accumulate from multiple searches
    // if (window.LeadExporter) {
    //   window.LeadExporter.clearLeads();
    // }

    runNearbySearch(centerLatLng, radiusMeters, keyword, filters);
  });

  categoryInput.addEventListener("keyup", (event) => {
    if (event.key === "Enter") {
      searchBtn.click();
    }
  });

  // Wire up "Add to CSV" button
  const addToCsvBtn = document.getElementById("add-to-csv-btn");
  if (addToCsvBtn) {
    addToCsvBtn.addEventListener("click", () => {
      if (resultsCount === 0) {
        alert("No results to add. Run a search first.");
        return;
      }

      // Results are already added to LeadExporter automatically
      // Just provide feedback and hide the button
      addToCsvBtn.textContent = "✓ Added to CSV";
      addToCsvBtn.style.background = "#059669"; // Green to indicate success

      setTimeout(() => {
        addToCsvBtn.style.display = "none";
        // Reset for next search
        addToCsvBtn.textContent = "Add to CSV";
        addToCsvBtn.style.background = "#8b5cf6"; // Back to purple
      }, 1500);
    });
  }
});
