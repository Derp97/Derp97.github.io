import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const MARS_RADIUS = 2;

const marsWeatherPoints = [
    {
        id: "curiosity",
        name: "Curiosity Rover",
        site: "Gale Crater",
        status: "Active rover station",
        statusType: "active",
        lat: -4.5895,
        lon: 137.4417,
        tempC: -63,
        pressurePa: 750,
        windKmh: 18,
        dustTau: 0.4,
        summary: "Current-style rover weather point from Gale Crater."
    },
    {
        id: "perseverance",
        name: "Perseverance Rover",
        site: "Jezero Crater",
        status: "Active rover station",
        statusType: "active",
        lat: 18.4447,
        lon: 77.4508,
        tempC: -58,
        pressurePa: 730,
        windKmh: 22,
        dustTau: 0.6,
        summary: "Current-style rover weather point from Jezero Crater."
    },
    {
        id: "insight",
        name: "InSight Lander",
        site: "Elysium Planitia",
        status: "Historic archive",
        statusType: "historic",
        lat: 4.5024,
        lon: 135.6234,
        tempC: -62,
        pressurePa: 743,
        windKmh: 21,
        dustTau: 0.5,
        summary: "Historic Mars weather archive from the retired InSight lander."
    },
    {
        id: "olympus",
        name: "Olympus Mons",
        site: "Shield Volcano",
        status: "Modelled point",
        statusType: "modelled",
        lat: 18.65,
        lon: -133.8,
        tempC: -75,
        pressurePa: 320,
        windKmh: 36,
        dustTau: 0.3,
        summary: "Example modelled weather point for a dramatic Martian landmark."
    },
    {
        id: "valles",
        name: "Valles Marineris",
        site: "Canyon System",
        status: "Modelled point",
        statusType: "modelled",
        lat: -14,
        lon: -59,
        tempC: -50,
        pressurePa: 810,
        windKmh: 42,
        dustTau: 0.8,
        summary: "Example modelled weather point inside the largest canyon system on Mars."
    }
];

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

const markerMeshes = [];

initMarsGlobe();
renderStationButtons();
renderLocationCards();
selectStation(marsWeatherPoints[0]);
animate();

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

    camera.position.set(0, 1.2, 5);

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
    marsWeatherPoints.forEach(point => {
        const markerGeometry = new THREE.SphereGeometry(0.045, 18, 18);

        const markerMaterial = new THREE.MeshBasicMaterial({
            color: getTemperatureColour(point.tempC)
        });

        const marker = new THREE.Mesh(markerGeometry, markerMaterial);

        marker.position.copy(latLonToVector3(point.lat, point.lon, MARS_RADIUS + 0.06));
        marker.userData = point;

        marsGroup.add(marker);
        markerMeshes.push(marker);

        const ringGeometry = new THREE.RingGeometry(0.07, 0.095, 24);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: getTemperatureColour(point.tempC),
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
        selectStation(intersects[0].object.userData);
    }
}

function selectStation(point) {
    selectedMarker = point;

    stationName.textContent = `${point.name} — ${point.site}`;
    stationSummary.textContent = point.summary;

    stationMetrics.innerHTML = `
        <div class="station-metric">
            <span>Temperature</span>
            <strong>${formatNumber(point.tempC)}°C / ${formatNumber(cToF(point.tempC))}°F</strong>
            <small>Cold enough to be instantly dangerous without protection.</small>
        </div>

        <div class="station-metric">
            <span>Atmospheric pressure</span>
            <strong>${formatNumber(point.pressurePa, 0)} Pa / ${formatNumber(paToMbar(point.pressurePa), 1)} mbar</strong>
            <small>About ${formatNumber(paToEarthPercent(point.pressurePa), 2)}% of Earth's sea-level pressure.</small>
        </div>

        <div class="station-metric">
            <span>Wind speed</span>
            <strong>${formatNumber(point.windKmh)} km/h / ${formatNumber(kmhToMph(point.windKmh))} mph</strong>
            <small>Martian wind has less force than Earth wind because the air is extremely thin.</small>
        </div>

        <div class="station-metric">
            <span>Dust opacity</span>
            <strong>${getDustLabel(point.dustTau)}</strong>
            <small>Tau: ${formatNumber(point.dustTau, 2)}. Higher values mean dustier skies.</small>
        </div>
    `;

    document.querySelectorAll(".station-button").forEach(button => {
        button.classList.toggle("active", button.dataset.stationId === point.id);
    });
}

function renderStationButtons() {
    stationButtons.innerHTML = marsWeatherPoints.map(point => `
        <button class="station-button" data-station-id="${point.id}">
            ${point.site}
        </button>
    `).join("");

    document.querySelectorAll(".station-button").forEach(button => {
        button.addEventListener("click", () => {
            const point = marsWeatherPoints.find(item => item.id === button.dataset.stationId);
            selectStation(point);
        });
    });
}

function renderLocationCards() {
    locationCards.innerHTML = marsWeatherPoints.map(point => `
        <article class="card mars-location-card">
            <span class="location-status ${point.statusType}">
                ${point.status}
            </span>

            <p class="eyebrow">${point.site}</p>
            <h3>${point.name}</h3>

            <p class="text-muted">${point.summary}</p>

            <p>
                <strong>${formatNumber(point.tempC)}°C</strong>
                <span class="text-muted"> / ${formatNumber(cToF(point.tempC))}°F</span>
            </p>

            <p class="text-muted">
                Pressure: ${formatNumber(point.pressurePa, 0)} Pa ·
                Wind: ${formatNumber(point.windKmh)} km/h ·
                Dust: ${getDustLabel(point.dustTau)}
            </p>
        </article>
    `).join("");
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

function cToF(celsius) {
    return (celsius * 9 / 5) + 32;
}

function paToMbar(pa) {
    return pa / 100;
}

function paToEarthPercent(pa) {
    return (pa / 101325) * 100;
}

function kmhToMph(kmh) {
    return kmh * 0.621371;
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

function animate() {
    requestAnimationFrame(animate);

    marsGroup.rotation.y += 0.0007;

    const pulse = 1 + Math.sin(Date.now() * 0.006) * 0.25;

    markerMeshes.forEach(marker => {
        const isSelected = marker.userData.id === selectedMarker?.id;

        marker.scale.setScalar(isSelected ? pulse * 1.35 : 1);
    });

    controls.update();
    renderer.render(scene, camera);
}