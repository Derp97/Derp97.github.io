import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const MARS_RADIUS = 2;
const DEFAULT_CAMERA_POSITION = new THREE.Vector3(0, 1.2, 5);
const DEFAULT_CAMERA_TARGET = new THREE.Vector3(0, 0, 0);
const CURIOSITY_RAW_IMAGE_API =
    "https://mars.nasa.gov/api/v1/raw_image_items/?order=sol+desc%2Cinstrument_sort+asc%2Csample_type_sort+asc%2C+date_taken+desc&per_page=1&page=0&condition_1=msl%3Amission&search=&extended=thumbnail%3A%3Asample_type%3A%3Anoteq";

const PERSEVERANCE_RAW_IMAGE_API =
    "https://mars.nasa.gov/rss/api/?feed=raw_images&category=mars2020,ingenuity&feedtype=json&ver=1.2&num=1&page=0&order=sol+desc";

let marsMissionPoints = getMissionPoints();

const globeContainer = document.getElementById("mars-globe");
const stationName = document.getElementById("station-name");
const stationSummary = document.getElementById("station-summary");
const stationMetrics = document.getElementById("station-metrics");
const stationButtons = document.getElementById("station-buttons");
const locationCards = document.getElementById("mars-location-cards");

let marsGroup;
let scene;
let camera;
let renderer;
let controls;
let mars;
let selectedMarker = null;
let animationStarted = false;
let cameraFlight = null;

const markerMeshes = [];

bootstrapMarsDashboard();

async function bootstrapMarsDashboard() {
    if (!globeContainer) {
        console.error("Mars globe container not found.");
        return;
    }

    initMarsGlobe();
    renderStationButtons();
    renderLocationCards();
    selectStation(marsMissionPoints[0]);
    startAnimation();

    await enrichMissionPointsWithRoverPhotos();

    renderStationButtons();
    renderLocationCards();
    selectStation(
        marsMissionPoints.find(point => point.id === selectedMarker?.id) ?? marsMissionPoints[0]
    );
}


function createMarsPointOfInterest({
    id,
    name,
    site,
    lat,
    lon,
    status = "Point of interest",
    statusType = "modelled",
    agency = "Planetary reference point",
    missionGoal,
    summary,
    tempC,
    pressurePa,
    windKmh,
    dustTau,
    category = "points-of-interest"
}) {
    return {
        id,
        name,
        site,
        status,
        statusType,
        markerType: "landmark",
        category,
        lat,
        lon,
        missionType: "Point of interest",
        launchDate: null,
        landingDate: null,
        agency,
        missionGoal,
        modelledConditions: {
            tempC,
            pressurePa,
            windKmh,
            dustTau
        },
        summary,
        latestPhoto: null,
        latestPhotoStatus: "Point of interest reference only."
    };
}

function getMissionPoints() {
    return [
        {
            id: "mars-overview",
            name: "Mars",
            site: "Planet Overview",
            status: "Planetary overview",
            statusType: "modelled",
            markerType: "overview",
            category: "overview",
            lat: null,
            lon: null,
            missionType: "Planet",
            launchDate: null,
            landingDate: null,
            agency: "Solar System reference body",
            missionGoal: "Reset the view to the full rotating Mars globe and use the planet itself as the main dashboard anchor.",
            modelledConditions: {
                tempC: -63,
                pressurePa: 610,
                windKmh: 25,
                dustTau: 0.5
            },
            summary: "Full planet overview. Selecting this pulls the camera back to the original globe view.",
            latestPhoto: null,
            latestPhotoStatus: "Planet overview reset point."
        },
        {
            id: "curiosity",
            rawImageFeed: "curiosity",
            name: "Curiosity Rover",
            site: "Gale Crater",
            status: "Active rover",
            statusType: "active",
            markerType: "mission",
            category: "active-missions",
            lat: -4.5895,
            lon: 137.4417,
            missionType: "Rover",
            launchDate: "2011-11-26",
            landingDate: "2012-08-06",
            agency: "NASA / JPL",
            missionGoal: "Explore whether Gale Crater ever had the right environmental conditions to support microbial life.",
            modelledConditions: {
                tempC: -63,
                pressurePa: 750,
                windKmh: 18,
                dustTau: 0.4
            },
            summary: "Active NASA rover exploring Mount Sharp inside Gale Crater. Mission imagery is loaded from NASA where available.",
            latestPhoto: null,
            latestPhotoStatus: "Checking NASA rover photo feed..."
        },
        {
            id: "perseverance",
            rawImageFeed: "perseverance",
            name: "Perseverance Rover",
            site: "Jezero Crater",
            status: "Active rover",
            statusType: "active",
            markerType: "mission",
            category: "active-missions",
            lat: 18.4447,
            lon: 77.4508,
            missionType: "Rover",
            launchDate: "2020-07-30",
            landingDate: "2021-02-18",
            agency: "NASA / JPL",
            missionGoal: "Search for signs of ancient microbial life and collect rock samples for future return to Earth.",
            modelledConditions: {
                tempC: -58,
                pressurePa: 730,
                windKmh: 22,
                dustTau: 0.6
            },
            summary: "Active NASA rover operating in Jezero Crater. Mission imagery is loaded from NASA where available.",
            latestPhoto: null,
            latestPhotoStatus: "Checking NASA rover photo feed..."
        },
        {
            id: "insight",
            name: "InSight Lander",
            site: "Elysium Planitia",
            status: "Retired lander archive",
            statusType: "historic",
            markerType: "mission",
            category: "archive-missions",
            lat: 4.5024,
            lon: 135.6234,
            missionType: "Stationary lander",
            launchDate: "2018-05-05",
            landingDate: "2018-11-26",
            endDate: "2022-12-21",
            agency: "NASA / JPL",
            missionGoal: "Study Mars' deep interior using seismic, heat-flow, and precision tracking instruments.",
            modelledConditions: {
                tempC: -62,
                pressurePa: 743,
                windKmh: 21,
                dustTau: 0.5
            },
            summary: "Retired NASA lander site. Shown as an archive location rather than a live weather station.",
            latestPhoto: null,
            latestPhotoStatus: "No live rover photo feed for this retired lander."
        },
        {
            id: "olympus",
            name: "Olympus Mons",
            site: "Shield Volcano",
            status: "Landmark model",
            statusType: "modelled",
            markerType: "landmark",
            category: "major-landmarks",
            lat: 18.65,
            lon: -133.8,
            missionType: "Planetary landmark",
            launchDate: null,
            landingDate: null,
            agency: "Geological reference point",
            missionGoal: "Use the tallest volcano in the Solar System as a dramatic reference marker on the globe.",
            modelledConditions: {
                tempC: -75,
                pressurePa: 320,
                windKmh: 36,
                dustTau: 0.3
            },
            summary: "Modelled landmark point. Conditions are illustrative and not measured by a surface probe.",
            latestPhoto: null,
            latestPhotoStatus: "Landmark reference only."
        },
        {
            id: "valles",
            name: "Valles Marineris",
            site: "Canyon System",
            status: "Landmark model",
            statusType: "modelled",
            markerType: "landmark",
            category: "major-landmarks",
            lat: -14,
            lon: -59,
            missionType: "Planetary landmark",
            launchDate: null,
            landingDate: null,
            agency: "Geological reference point",
            missionGoal: "Use Mars' largest canyon system as a terrain and scale reference on the dashboard.",
            modelledConditions: {
                tempC: -50,
                pressurePa: 810,
                windKmh: 42,
                dustTau: 0.8
            },
            summary: "Modelled landmark point. Conditions are illustrative and not measured by a surface probe.",
            latestPhoto: null,
            latestPhotoStatus: "Landmark reference only."
        },
        createMarsPointOfInterest({
            id: "hellas",
            category: "impact-basins",
            name: "Hellas Planitia",
            site: "Impact Basin",
            lat: -42.4,
            lon: 70.5,
            status: "Deep impact basin",
            agency: "Geological reference point",
            missionGoal: "Use one of the largest and deepest impact basins on Mars as a pressure and terrain reference.",
            summary: "A vast southern impact basin. Its depth makes it useful for illustrating how elevation affects modelled Martian pressure.",
            tempC: -45,
            pressurePa: 1150,
            windKmh: 28,
            dustTau: 0.7
        }),
        createMarsPointOfInterest({
            id: "utopia",
            category: "plains-regions",
            name: "Utopia Planitia",
            site: "Northern Plain",
            lat: 46.7,
            lon: 117.5,
            status: "Northern lowland",
            agency: "Geological reference point",
            missionGoal: "Mark a major Martian plain associated with historic landing regions and northern lowland geology.",
            summary: "A broad northern plain and one of Mars' major lowland regions.",
            tempC: -68,
            pressurePa: 900,
            windKmh: 24,
            dustTau: 0.5
        }),
        createMarsPointOfInterest({
            id: "elysium-mons",
            category: "volcanic-regions",
            name: "Elysium Mons",
            site: "Volcanic Province",
            lat: 25.0,
            lon: 147.0,
            status: "Volcanic landmark",
            agency: "Geological reference point",
            missionGoal: "Mark the Elysium volcanic region near the InSight landing zone.",
            summary: "A major Martian volcano in the Elysium volcanic province.",
            tempC: -72,
            pressurePa: 430,
            windKmh: 34,
            dustTau: 0.4
        }),
        createMarsPointOfInterest({
            id: "ascraeus",
            category: "volcanic-regions",
            name: "Ascraeus Mons",
            site: "Tharsis Volcano",
            lat: 11.9,
            lon: -104.5,
            status: "Shield volcano",
            agency: "Geological reference point",
            missionGoal: "Mark one of the giant Tharsis shield volcanoes.",
            summary: "One of the large volcanic shields in the Tharsis region.",
            tempC: -76,
            pressurePa: 360,
            windKmh: 38,
            dustTau: 0.35
        }),
        createMarsPointOfInterest({
            id: "pavonis",
            category: "volcanic-regions",
            name: "Pavonis Mons",
            site: "Tharsis Volcano",
            lat: 0.8,
            lon: -112.5,
            status: "Shield volcano",
            agency: "Geological reference point",
            missionGoal: "Mark the central volcano in the Tharsis Montes chain.",
            summary: "A major equatorial shield volcano in the Tharsis Montes chain.",
            tempC: -70,
            pressurePa: 390,
            windKmh: 35,
            dustTau: 0.4
        }),
        createMarsPointOfInterest({
            id: "arsia",
            category: "volcanic-regions",
            name: "Arsia Mons",
            site: "Tharsis Volcano",
            lat: -8.4,
            lon: -120.1,
            status: "Shield volcano",
            agency: "Geological reference point",
            missionGoal: "Mark the southern volcano in the Tharsis Montes chain.",
            summary: "A large shield volcano south of Pavonis Mons in the Tharsis region.",
            tempC: -73,
            pressurePa: 370,
            windKmh: 36,
            dustTau: 0.45
        }),
        createMarsPointOfInterest({
            id: "syrtis-major",
            category: "plains-regions",
            name: "Syrtis Major Planum",
            site: "Dark Volcanic Plain",
            lat: 8.4,
            lon: 69.5,
            status: "Albedo landmark",
            agency: "Geological reference point",
            missionGoal: "Mark one of the most recognisable dark surface regions on Mars.",
            summary: "A prominent dark volcanic plain visible from Earth-based observations.",
            tempC: -56,
            pressurePa: 720,
            windKmh: 27,
            dustTau: 0.55
        }),
        createMarsPointOfInterest({
            id: "north-pole",
            category: "polar-regions",
            name: "Planum Boreum",
            site: "North Polar Cap",
            lat: 87.0,
            lon: 0.0,
            status: "Polar region",
            agency: "Climate reference point",
            missionGoal: "Mark the north polar cap as a climate and seasonal reference point.",
            summary: "Mars' northern polar region, useful for showing seasonal ice and climate contrast.",
            tempC: -105,
            pressurePa: 610,
            windKmh: 44,
            dustTau: 0.25
        }),
        createMarsPointOfInterest({
            id: "south-pole",
            category: "polar-regions",
            name: "Planum Australe",
            site: "South Polar Cap",
            lat: -87.0,
            lon: 0.0,
            status: "Polar region",
            agency: "Climate reference point",
            missionGoal: "Mark the south polar cap as a climate and seasonal reference point.",
            summary: "Mars' southern polar region, including layered deposits and seasonal ice.",
            tempC: -112,
            pressurePa: 580,
            windKmh: 48,
            dustTau: 0.25
        })
    ];
}

async function enrichMissionPointsWithRoverPhotos() {
    const roverPoints = marsMissionPoints.filter(point => point.rawImageFeed);

    await Promise.allSettled(
        roverPoints.map(async point => {
            try {
                const latestPhoto = await fetchLatestRawRoverImage(point.rawImageFeed);

                if (!latestPhoto) {
                    point.latestPhotoStatus = "NASA raw image feed unavailable, fallback mission profile shown.";
                    return;
                }

                point.latestPhoto = latestPhoto;
                point.latestPhotoStatus = `Latest NASA raw image: Sol ${latestPhoto.sol}, taken ${latestPhoto.earthDate}.`;
            } catch (error) {
                console.warn(`NASA raw image feed unavailable for ${point.name}:`, error);
                point.latestPhotoStatus = "NASA raw image feed unavailable, fallback mission profile shown.";
            }
        })
    );
}

async function fetchLatestRawRoverImage(feedName) {
    if (feedName === "curiosity") {
        return fetchLatestCuriosityRawImage();
    }

    if (feedName === "perseverance") {
        return fetchLatestPerseveranceRawImage();
    }

    return null;
}

async function fetchLatestCuriosityRawImage() {
    const response = await fetch(CURIOSITY_RAW_IMAGE_API);

    if (!response.ok) {
        throw new Error("Curiosity raw image request failed");
    }

    const data = await response.json();
    const item = data.items?.[0];

    if (!item) {
        return null;
    }

    return {
        id: item.id,
        sol: item.sol,
        earthDate: formatDateTime(item.date_taken),
        camera: item.instrument ?? "Unknown instrument",
        title: item.title ?? "Curiosity raw image",
        description: item.description ?? "",
        imageUrl: item.https_url || item.url,
        imageLink: item.link ? `https://mars.nasa.gov${item.link}` : item.https_url || item.url,
        credit: item.image_credit ?? "NASA/JPL-Caltech",
        rawDateTaken: item.date_taken,
        rawDateReceived: item.date_received
    };
}

async function fetchLatestPerseveranceRawImage() {
    const response = await fetch(PERSEVERANCE_RAW_IMAGE_API);

    if (!response.ok) {
        throw new Error("Perseverance raw image request failed");
    }

    const data = await response.json();
    const item = data.images?.[0];

    if (!item) {
        return null;
    }

    return {
        id: item.imageid,
        sol: item.sol,
        earthDate: formatDateTime(item.date_taken_utc),
        camera: item.camera?.instrument ?? "Unknown instrument",
        title: item.title ?? "Perseverance raw image",
        description: item.caption ?? "",
        imageUrl:
            item.image_files?.large ||
            item.image_files?.medium ||
            item.image_files?.small ||
            item.image_files?.full_res,
        imageLink: item.link,
        credit: item.credit ?? "NASA/JPL-Caltech",
        rawDateTaken: item.date_taken_utc,
        rawDateReceived: item.date_received,
        marsDateTaken: item.date_taken_mars
    };
}

function initMarsGlobe() {
    scene = new THREE.Scene();

    marsGroup = new THREE.Group();
    scene.add(marsGroup);

    camera = new THREE.PerspectiveCamera(
        45,
        globeContainer.clientWidth / globeContainer.clientHeight,
        0.1,
        100
    );

    camera.position.copy(DEFAULT_CAMERA_POSITION);

    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });

    renderer.setSize(globeContainer.clientWidth, globeContainer.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    globeContainer.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.minDistance = 3;
    controls.maxDistance = 8;

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.8);
    directionalLight.position.set(4, 2, 5);
    scene.add(directionalLight);

    const marsGeometry = new THREE.SphereGeometry(MARS_RADIUS, 96, 96);
    const marsTexture = new THREE.TextureLoader().load("../assets/imgs/mars-texture.jpg");

    const marsMaterial = new THREE.MeshStandardMaterial({
        map: marsTexture,
        roughness: 1
    });

    mars = new THREE.Mesh(marsGeometry, marsMaterial);
    marsGroup.add(mars);

    createAtmosphere();
    createMarkers();

    renderer.domElement.addEventListener("click", handleGlobeClick);
    window.addEventListener("resize", handleResize);
}

function createAtmosphere() {
    const atmosphereGeometry = new THREE.SphereGeometry(MARS_RADIUS * 1.03, 96, 96);

    const atmosphereMaterial = new THREE.MeshBasicMaterial({
        color: 0xff8a4c,
        transparent: true,
        opacity: 0.08,
        side: THREE.BackSide
    });

    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    marsGroup.add(atmosphere);
}

function createMarkers() {
    marsMissionPoints.forEach(point => {
        if (point.markerType === "overview") return;

        const markerRadius = point.markerType === "mission" ? 0.05 : 0.035;
        const markerGeometry = new THREE.SphereGeometry(markerRadius, 18, 18);

        const markerMaterial = new THREE.MeshBasicMaterial({
            color: getMarkerColour(point)
        });

        const marker = new THREE.Mesh(markerGeometry, markerMaterial);

        marker.position.copy(latLonToVector3(point.lat, point.lon, MARS_RADIUS + 0.06));
        marker.userData = point;

        marsGroup.add(marker);
        markerMeshes.push(marker);

        const ringInnerRadius = point.markerType === "mission" ? 0.07 : 0.052;
        const ringOuterRadius = point.markerType === "mission" ? 0.095 : 0.073;
        const ringGeometry = new THREE.RingGeometry(ringInnerRadius, ringOuterRadius, 24);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: getMarkerColour(point),
            transparent: true,
            opacity: 0.55,
            side: THREE.DoubleSide
        });

        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.copy(marker.position);
        ring.lookAt(new THREE.Vector3(0, 0, 0));
        ring.userData = point;

        marsGroup.add(ring);
        markerMeshes.push(ring);
    });
}

function handleGlobeClick(event) {
    const rect = renderer.domElement.getBoundingClientRect();

    const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(markerMeshes);

    if (intersects.length > 0) {
        selectStation(intersects[0].object.userData, true);
    }
}

function selectStation(point, moveCamera = false) {
    if (!point) return;

    selectedMarker = point;

    if (moveCamera) {
        if (point.markerType === "overview") {
            flyCameraToOverview();
        } else {
            flyCameraToStation(point);
        }
    }

    stationName.textContent = `${point.name} — ${point.site}`;
    stationSummary.textContent = point.summary;

    const missionAge = getMissionAgeText(point);
    const latestPhotoMarkup = getLatestPhotoMarkup(point);

    stationMetrics.innerHTML = `
        <div class="station-metric">
            <span>Mission type</span>
            <strong>${point.missionType}</strong>
            <small>${point.agency}</small>
        </div>

        <div class="station-metric">
            <span>Landing / status</span>
            <strong>${formatDate(point.landingDate) || "Reference point"}</strong>
            <small>${missionAge}</small>
        </div>

        <div class="station-metric station-metric-wide">
            <span>Mission objective</span>
            <strong>${point.status}</strong>
            <small>${point.missionGoal}</small>
        </div>

        <div class="station-metric station-metric-wide modelled-condition-note">
            <span>Modelled conditions</span>
            <strong>${formatNumber(point.modelledConditions.tempC)}°C / ${formatNumber(cToF(point.modelledConditions.tempC))}°F</strong>
            <small>
                Pressure ${formatNumber(point.modelledConditions.pressurePa, 0)} Pa ·
                Wind ${formatNumber(point.modelledConditions.windKmh)} km/h ·
                Dust ${getDustLabel(point.modelledConditions.dustTau)}.
                These are illustrative model values, not live probe weather.
            </small>
        </div>

        ${latestPhotoMarkup}
    `;

    document.querySelectorAll(".station-button").forEach(button => {
        button.classList.toggle("active", button.dataset.stationId === point.id);
    });
}

function getLatestPhotoMarkup(point) {
    if (!point.latestPhoto?.imageUrl) {
        return `
            <div class="station-metric station-metric-wide">
                <span>Latest image</span>
                <strong>Unavailable</strong>
                <small>${point.latestPhotoStatus}</small>
            </div>
        `;
    }

    return `
        <div class="station-metric station-metric-wide latest-rover-image-card">
            <span>Latest rover image</span>
            <a href="${point.latestPhoto.imageLink || point.latestPhoto.imageUrl}" target="_blank" rel="noopener">
                <img src="${point.latestPhoto.imageUrl}" alt="${point.latestPhoto.title || `Latest ${point.name} image`}" loading="lazy">
            </a>
            <small>
                ${point.latestPhoto.title || "Latest raw image"} · ${point.latestPhoto.camera} ·
                Sol ${point.latestPhoto.sol} · Taken ${point.latestPhoto.earthDate} ·
                Credit: ${point.latestPhoto.credit}
            </small>
        </div>
    `;
}

function renderStationButtons() {
    const pointGroups = [
        {
            id: "overview",
            title: "Planet",
            points: marsMissionPoints.filter(point => point.category === "overview"),
            open: true
        },
        {
            id: "active-missions",
            title: "Active Missions",
            points: marsMissionPoints.filter(point => point.category === "active-missions"),
            open: true
        },
        {
            id: "archive-missions",
            title: "Archive Missions",
            points: marsMissionPoints.filter(point => point.category === "archive-missions"),
            open: false
        },
        {
            id: "major-landmarks",
            title: "Major Landmarks",
            points: marsMissionPoints.filter(point => point.category === "major-landmarks"),
            open: false
        },
        {
            id: "volcanic-regions",
            title: "Volcanic Regions",
            points: marsMissionPoints.filter(point => point.category === "volcanic-regions"),
            open: false
        },
        {
            id: "impact-basins",
            title: "Impact Basins",
            points: marsMissionPoints.filter(point => point.category === "impact-basins"),
            open: false
        },
        {
            id: "plains-regions",
            title: "Plains & Surface Regions",
            points: marsMissionPoints.filter(point => point.category === "plains-regions"),
            open: false
        },
        {
            id: "polar-regions",
            title: "Polar Regions",
            points: marsMissionPoints.filter(point => point.category === "polar-regions"),
            open: false
        },
        {
            id: "points-of-interest",
            title: "Other Points of Interest",
            points: marsMissionPoints.filter(point => !point.category || point.category === "points-of-interest"),
            open: false
        }
    ].filter(group => group.points.length > 0);

    stationButtons.innerHTML = pointGroups.map(group => `
        <details class="station-button-group" data-group-id="${group.id}" ${group.open ? "open" : ""}>
            <summary class="station-button-group-title">
                <span>${group.title}</span>
                <small>${group.points.length}</small>
            </summary>

            <div class="station-button-group-list">
                ${group.points.map(point => `
                    <button class="station-button compact" data-station-id="${point.id}">
                        <span>${point.markerType === "overview" ? "Mars Overview" : point.site}</span>
                        <small>${point.name}</small>
                    </button>
                `).join("")}
            </div>
        </details>
    `).join("");

    document.querySelectorAll(".station-button").forEach(button => {
        button.addEventListener("click", () => {
            const point = marsMissionPoints.find(item => item.id === button.dataset.stationId);
            selectStation(point, true);
        });
    });
}

function renderLocationCards() {
    locationCards.innerHTML = marsMissionPoints.map(point => `
        <article class="card mars-location-card">
            <span class="location-status ${point.statusType}">
                ${point.status}
            </span>

            <p class="eyebrow">${point.site}</p>
            <h3>${point.name}</h3>

            <p class="text-muted">${point.summary}</p>

            <div class="mission-card-meta">
                <p>
                    <span>Type</span>
                    <strong>${point.missionType}</strong>
                </p>

                <p>
                    <span>Landing</span>
                    <strong>${formatDate(point.landingDate) || "N/A"}</strong>
                </p>
            </div>

            <p class="text-muted">
                Modelled: ${formatNumber(point.modelledConditions.tempC)}°C ·
                ${formatNumber(point.modelledConditions.pressurePa, 0)} Pa ·
                Dust: ${getDustLabel(point.modelledConditions.dustTau)}
            </p>

            ${getLocationCardPhotoMarkup(point)}
        </article>
    `).join("");
}

function getLocationCardPhotoMarkup(point) {
    if (!point.latestPhoto?.imageUrl) {
        return `<p class="text-muted mission-card-note">${point.latestPhotoStatus}</p>`;
    }

    return `
        <a class="mission-card-image-link" href="${point.latestPhoto.imageLink || point.latestPhoto.imageUrl}" target="_blank" rel="noopener">
            <img src="${point.latestPhoto.imageUrl}" alt="${point.latestPhoto.title || `Latest ${point.name} image`}" loading="lazy">
        </a>
        <p class="text-muted mission-card-note">
            Latest NASA raw image · Sol ${point.latestPhoto.sol} · ${point.latestPhoto.camera}
        </p>
    `;
}



function flyCameraToOverview() {
    if (!camera || !controls) return;

    cameraFlight = {
        startTime: performance.now(),
        duration: 1200,
        fromCamera: camera.position.clone(),
        toCamera: DEFAULT_CAMERA_POSITION.clone(),
        fromTarget: controls.target.clone(),
        toTarget: DEFAULT_CAMERA_TARGET.clone()
    };
}

function flyCameraToStation(point) {
    if (!point || point.markerType === "overview" || !camera || !controls || !marsGroup) return;

    /*
        latLonToVector3 returns the station position in the Mars group's local space.
        Because marsGroup is constantly rotating, we need to convert that local point
        into world space before moving the camera. Otherwise the camera flies to where
        the station started, not where it currently is on the rotating globe.
    */
    marsGroup.updateMatrixWorld(true);

    const localSurfacePosition = latLonToVector3(point.lat, point.lon, MARS_RADIUS + 0.08);
    const worldSurfacePosition = marsGroup.localToWorld(localSurfacePosition.clone());

    const targetPosition = worldSurfacePosition.clone().normalize().multiplyScalar(4.2);
    const targetLookAt = worldSurfacePosition.clone().multiplyScalar(0.72);

    cameraFlight = {
        startTime: performance.now(),
        duration: 1200,
        fromCamera: camera.position.clone(),
        toCamera: targetPosition,
        fromTarget: controls.target.clone(),
        toTarget: targetLookAt
    };
}

function updateCameraFlight() {
    if (!cameraFlight) return;

    const elapsed = performance.now() - cameraFlight.startTime;
    const progress = Math.min(elapsed / cameraFlight.duration, 1);
    const eased = easeInOutCubic(progress);

    camera.position.lerpVectors(
        cameraFlight.fromCamera,
        cameraFlight.toCamera,
        eased
    );

    controls.target.lerpVectors(
        cameraFlight.fromTarget,
        cameraFlight.toTarget,
        eased
    );

    if (progress >= 1) {
        cameraFlight = null;
    }
}

function easeInOutCubic(value) {
    return value < 0.5
        ? 4 * value * value * value
        : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function latLonToVector3(lat, lon, radius) {
    const phi = (90 - lat) * Math.PI / 180;
    const theta = (lon + 180) * Math.PI / 180;

    return new THREE.Vector3(
        -radius * Math.sin(phi) * Math.cos(theta),
         radius * Math.cos(phi),
         radius * Math.sin(phi) * Math.sin(theta)
    );
}

function getMarkerColour(point) {
    if (point.markerType === "mission" && point.statusType === "active") return 0x22c55e;
    if (point.statusType === "historic") return 0xf97316;
    if (point.missionType === "Point of interest") return 0xa78bfa;
    return getTemperatureColour(point.modelledConditions.tempC);
}

function getTemperatureColour(tempC) {
    if (tempC <= -80) return 0x4f9cff;
    if (tempC <= -60) return 0x7dd3fc;
    if (tempC <= -40) return 0xfacc15;
    return 0xf97316;
}

function getDustLabel(tau) {
    if (tau < 0.5) return "Clear skies";
    if (tau < 1) return "Slightly dusty";
    if (tau < 2) return "Dusty";
    if (tau < 5) return "Heavy dust";
    return "Dust storm conditions";
}

function getMissionAgeText(point) {
    if (point.markerType === "overview") {
        return "Full globe view and camera reset point.";
    }

    if (!point.landingDate) {
        return "Planetary landmark used as a reference point.";
    }

    const start = new Date(`${point.landingDate}T00:00:00Z`);
    const end = point.endDate ? new Date(`${point.endDate}T00:00:00Z`) : new Date();
    const days = Math.max(0, Math.floor((end - start) / 86400000));
    const years = days / 365.25;
    const prefix = point.endDate ? "Operated for" : "Operating for";

    return `${prefix} ${formatNumber(years, 1)} Earth years since landing.`;
}

function formatDate(value) {
    if (!value) return "";

    const date = new Date(`${value}T00:00:00Z`);

    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function formatDateTime(value) {
    if (!value) return "Unknown date";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function cToF(celsius) {
    return (celsius * 9 / 5) + 32;
}

function formatNumber(value, decimals = 1) {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return "Unavailable";
    }

    return Number(value).toFixed(decimals);
}

function handleResize() {
    camera.aspect = globeContainer.clientWidth / globeContainer.clientHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(globeContainer.clientWidth, globeContainer.clientHeight);
}

function startAnimation() {
    if (animationStarted) return;

    animationStarted = true;
    animate();
}

function animate() {
    requestAnimationFrame(animate);

    marsGroup.rotation.y += 0.0007;

    const pulse = 1 + Math.sin(Date.now() * 0.006) * 0.25;

    markerMeshes.forEach(marker => {
        const isSelected = marker.userData.id === selectedMarker?.id;
        marker.scale.setScalar(isSelected ? pulse * 1.35 : 1);
    });

    updateCameraFlight();

    controls.update();
    renderer.render(scene, camera);
}
