const weatherStatus = document.getElementById("weatherStatus");
const weatherDashboard = document.getElementById("weatherDashboard");
const currentWeather = document.getElementById("currentWeather");
const dailyForecast = document.getElementById("dailyForecast");
const selectedDayTitle = document.getElementById("selectedDayTitle");
const selectedDayStats = document.getElementById("selectedDayStats");
const chartCanvas = document.getElementById("weatherChart");

const useLocationBtn = document.getElementById("useLocationBtn");
const defaultLocationBtn = document.getElementById("defaultLocationBtn");

let weatherData = null;
let selectedDay = null;
let weatherChartInstance = null;

const defaultLocation = {
    latitude: 53.3811,
    longitude: -1.4701,
    label: "Sheffield, UK"
};

function weatherCodeToText(code) {
    const codes = {
        0: "Clear sky",
        1: "Mainly clear",
        2: "Partly cloudy",
        3: "Overcast",
        45: "Fog",
        48: "Rime fog",
        51: "Light drizzle",
        53: "Moderate drizzle",
        55: "Dense drizzle",
        61: "Slight rain",
        63: "Moderate rain",
        65: "Heavy rain",
        71: "Slight snow",
        73: "Moderate snow",
        75: "Heavy snow",
        80: "Rain showers",
        81: "Moderate showers",
        82: "Violent showers",
        95: "Thunderstorm"
    };

    return codes[code] || "Unknown";
}

function formatDay(dateString) {
    return new Date(dateString).toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short"
    });
}

function formatHour(dateString) {
    return new Date(dateString).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit"
    });
}

function average(values) {
    return values.reduce((total, value) => total + value, 0) / values.length;
}

async function fetchWeather({ latitude, longitude, label }) {
    weatherStatus.innerHTML = `<p class="text-muted">Receiving weather telemetry for ${label}...</p>`;
    weatherDashboard.classList.add("hidden");
    weatherStatus.classList.remove("hidden");

    const url = new URL("https://api.open-meteo.com/v1/forecast");

    url.search = new URLSearchParams({
        latitude,
        longitude,
        current: [
            "temperature_2m",
            "apparent_temperature",
            "precipitation",
            "weather_code",
            "wind_speed_10m",
            "cloud_cover"
        ].join(","),
        hourly: [
            "temperature_2m",
            "apparent_temperature",
            "precipitation_probability",
            "precipitation",
            "weather_code",
            "wind_speed_10m",
            "cloud_cover",
            "visibility"
        ].join(","),
        daily: [
            "weather_code",
            "temperature_2m_max",
            "temperature_2m_min",
            "precipitation_sum",
            "sunshine_duration"
        ].join(","),
        forecast_days: 7,
        timezone: "auto"
    });

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Weather request failed");
        }

        weatherData = await response.json();
        renderWeather(label);
    } catch (error) {
        console.error(error);
        weatherStatus.innerHTML = `<p class="text-muted">Weather data could not be loaded.</p>`;
    }
}

function renderWeather(label) {
    const current = weatherData.current;

    currentWeather.innerHTML = `
        <div>
            <p class="eyebrow">${label}</p>
            <h2>${Math.round(current.temperature_2m)}°C</h2>
            <p class="text-muted">${weatherCodeToText(current.weather_code)}</p>
        </div>

        <div class="weather-stat-grid">
            <div class="weather-stat">
                <span>Feels Like</span>
                <strong>${Math.round(current.apparent_temperature)}°C</strong>
            </div>

            <div class="weather-stat">
                <span>Wind</span>
                <strong>${Math.round(current.wind_speed_10m)} km/h</strong>
            </div>

            <div class="weather-stat">
                <span>Rain</span>
                <strong>${current.precipitation} mm</strong>
            </div>

            <div class="weather-stat">
                <span>Cloud Cover</span>
                <strong>${current.cloud_cover}%</strong>
            </div>
        </div>
    `;

    dailyForecast.innerHTML = weatherData.daily.time.map((day, index) => `
        <button class="weather-day-card" data-day="${day}">
            <span>${formatDay(day)}</span>
            <strong>
                ${Math.round(weatherData.daily.temperature_2m_max[index])}° /
                ${Math.round(weatherData.daily.temperature_2m_min[index])}°
            </strong>
            <small>${weatherCodeToText(weatherData.daily.weather_code[index])}</small>
            <small>${weatherData.daily.precipitation_sum[index]} mm rain</small>
            <small>${Math.round(weatherData.daily.sunshine_duration[index] / 3600)}h sun</small>
        </button>
    `).join("");

    document.querySelectorAll(".weather-day-card").forEach(button => {
        button.addEventListener("click", () => {
            selectedDay = button.dataset.day;
            updateActiveDay();
            renderSelectedDay();
        });
    });

    selectedDay = weatherData.daily.time[0];

    weatherStatus.classList.add("hidden");
    weatherDashboard.classList.remove("hidden");

    updateActiveDay();
    renderSelectedDay();
}

function updateActiveDay() {
    document.querySelectorAll(".weather-day-card").forEach(card => {
        card.classList.toggle("is-active", card.dataset.day === selectedDay);
    });
}

function getHourlyRowsForSelectedDay() {
    return weatherData.hourly.time
        .map((time, index) => ({ time, index }))
        .filter(item => item.time.startsWith(selectedDay));
}

function renderSelectedDay() {
    selectedDayTitle.textContent = `${formatDay(selectedDay)} - Hourly Weather`;

    const rows = getHourlyRowsForSelectedDay();

    renderWeatherChart(rows);
    renderSelectedDayStats(rows);
}

function renderWeatherChart(rows) {
    const labels = rows.map(({ time }) => formatHour(time));

    const temperatures = rows.map(({ index }) => weatherData.hourly.temperature_2m[index]);
    const rainChance = rows.map(({ index }) => weatherData.hourly.precipitation_probability[index]);
    const cloudCover = rows.map(({ index }) => weatherData.hourly.cloud_cover[index]);
    const windSpeed = rows.map(({ index }) => weatherData.hourly.wind_speed_10m[index]);

    if (weatherChartInstance) {
        weatherChartInstance.destroy();
    }

    weatherChartInstance = new Chart(chartCanvas, {
        type: "line",
        data: {
            labels,
            datasets: [
                {
                    label: "Temperature °C",
                    data: temperatures,
                    tension: 0.35,
                    borderWidth: 3,
                    pointRadius: 2,
                    yAxisID: "temperature"
                },
                {
                    label: "Rain chance %",
                    data: rainChance,
                    tension: 0.35,
                    borderWidth: 2,
                    pointRadius: 2,
                    yAxisID: "percent"
                },
                {
                    label: "Cloud cover %",
                    data: cloudCover,
                    tension: 0.35,
                    borderWidth: 2,
                    pointRadius: 2,
                    yAxisID: "percent"
                },
                {
                    label: "Wind km/h",
                    data: windSpeed,
                    tension: 0.35,
                    borderWidth: 2,
                    pointRadius: 2,
                    yAxisID: "wind"
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: "index",
                intersect: false
            },
            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        usePointStyle: true,
                        boxWidth: 10
                    },
                    onClick(event, legendItem, legend) {
                        const index = legendItem.datasetIndex;
                        const chart = legend.chart;

                        chart.setDatasetVisibility(
                            index,
                            !chart.isDatasetVisible(index)
                        );

                        chart.update();
                    }
                },
                tooltip: {
                    callbacks: {
                        label(context) {
                            const label = context.dataset.label || "";
                            return `${label}: ${context.formattedValue}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },
                temperature: {
                    type: "linear",
                    position: "left",
                    title: {
                        display: true,
                        text: "Temperature °C"
                    }
                },
                percent: {
                    type: "linear",
                    position: "right",
                    min: 0,
                    max: 100,
                    title: {
                        display: true,
                        text: "Rain / cloud %"
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                },
                wind: {
                    type: "linear",
                    position: "right",
                    display: false,
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}

function renderSelectedDayStats(rows) {
    const temperatures = rows.map(({ index }) => weatherData.hourly.temperature_2m[index]);
    const rainChance = rows.map(({ index }) => weatherData.hourly.precipitation_probability[index]);
    const cloudCover = rows.map(({ index }) => weatherData.hourly.cloud_cover[index]);
    const windSpeed = rows.map(({ index }) => weatherData.hourly.wind_speed_10m[index]);

    selectedDayStats.innerHTML = `
        <div class="weather-stat">
            <span>Peak Temp</span>
            <strong>${Math.round(Math.max(...temperatures))}°C</strong>
        </div>

        <div class="weather-stat">
            <span>Lowest Temp</span>
            <strong>${Math.round(Math.min(...temperatures))}°C</strong>
        </div>

        <div class="weather-stat">
            <span>Peak Rain Chance</span>
            <strong>${Math.round(Math.max(...rainChance))}%</strong>
        </div>

        <div class="weather-stat">
            <span>Average Cloud</span>
            <strong>${Math.round(average(cloudCover))}%</strong>
        </div>

        <div class="weather-stat">
            <span>Peak Wind</span>
            <strong>${Math.round(Math.max(...windSpeed))} km/h</strong>
        </div>
    `;
}

useLocationBtn.addEventListener("click", () => {
    if (!navigator.geolocation) {
        fetchWeather(defaultLocation);
        return;
    }

    weatherStatus.innerHTML = `<p class="text-muted">Requesting location...</p>`;

    navigator.geolocation.getCurrentPosition(
        position => {
            fetchWeather({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                label: "Your Location"
            });
        },
        () => {
            fetchWeather(defaultLocation);
        }
    );
});

defaultLocationBtn.addEventListener("click", () => {
    fetchWeather(defaultLocation);
});

fetchWeather(defaultLocation);