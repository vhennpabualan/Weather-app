// ============================================
// WEATHERHUB - ENHANCED JAVASCRIPT
// Modern Weather App with Dynamic Features
// ============================================

// ============================================
// API CONFIGURATION
// ============================================

const GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';

// Weather code to description mapping
const WEATHER_CODES = {
    0: { text: 'Clear sky', icon: '☀️' },
    1: { text: 'Mainly clear', icon: '🌤️' },
    2: { text: 'Partly cloudy', icon: '⛅' },
    3: { text: 'Overcast', icon: '☁️' },
    45: { text: 'Foggy', icon: '🌫️' },
    48: { text: 'Foggy', icon: '🌫️' },
    51: { text: 'Light drizzle', icon: '🌧️' },
    53: { text: 'Drizzle', icon: '🌧️' },
    55: { text: 'Heavy drizzle', icon: '🌧️' },
    61: { text: 'Slight rain', icon: '🌧️' },
    63: { text: 'Moderate rain', icon: '🌧️' },
    65: { text: 'Heavy rain', icon: '⛈️' },
    71: { text: 'Slight snow', icon: '❄️' },
    73: { text: 'Moderate snow', icon: '❄️' },
    75: { text: 'Heavy snow', icon: '❄️' },
    80: { text: 'Slight rain showers', icon: '🌧️' },
    81: { text: 'Moderate rain showers', icon: '🌧️' },
    82: { text: 'Heavy rain showers', icon: '⛈️' },
    85: { text: 'Slight snow showers', icon: '❄️' },
    86: { text: 'Heavy snow showers', icon: '❄️' },
    95: { text: 'Thunderstorm', icon: '⛈️' },
    96: { text: 'Thunderstorm with hail', icon: '⛈️' },
    99: { text: 'Thunderstorm with hail', icon: '⛈️' }
};

// ============================================
// DOM ELEMENTS
// ============================================

const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const locationBtn = document.getElementById('locationBtn');
const suggestionsList = document.getElementById('suggestions');
const weatherContent = document.getElementById('weatherContent');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('error');
const weatherSection = document.getElementById('weatherSection');

// ============================================
// APP STATE
// ============================================

let currentCity = null;
let currentWeatherData = null;
let forecastData = null;
let lastUpdateTime = null;

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Load theme first before initializing app
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
    }
    updateThemeButtonIcon();
    initializeApp();
});

async function initializeApp() {
    // Event Listeners
    searchBtn.addEventListener('click', handleSearch);
    locationBtn.addEventListener('click', getLocationFromBrowser);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    searchInput.addEventListener('input', handleSearchInput);

    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Load last city or get user location
    const savedCity = localStorage.getItem('lastCity');
    if (savedCity) {
        currentCity = savedCity;
        await fetchWeatherData(savedCity);
    } else {
        getLocationFromBrowser();
    }

    // Auto-refresh weather every 10 minutes
    setInterval(() => {
        if (currentCity) {
            fetchWeatherData(currentCity);
        }
    }, 600000); // 10 minutes

    // Update "last updated" time every minute
    setInterval(updateLastUpdated, 60000);

    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target !== searchInput && !suggestionsList.contains(e.target)) {
            suggestionsList.classList.remove('active');
        }
    });
}

// ============================================
// THEME TOGGLE
// ============================================

function updateThemeButtonIcon() {
    const themeBtn = document.getElementById('themeToggle');
    if (!themeBtn) {
        console.warn('Theme button not found');
        return;
    }
    
    const isLightMode = document.body.classList.contains('light-mode');
    console.log('Updating icon - Light mode:', isLightMode);
    
    if (isLightMode) {
        // Light mode is ON, show sun icon (to switch to dark)
        themeBtn.innerHTML = '<i class="fas fa-sun" aria-hidden="true"></i>';
        // Fallback text if icon doesn't load
        if (!themeBtn.querySelector('.fas')) {
            themeBtn.textContent = '☀️';
        }
        themeBtn.title = 'Switch to Dark Mode';
        themeBtn.setAttribute('aria-label', 'Switch to Dark Mode');
    } else {
        // Dark mode is ON, show moon icon (to switch to light)
        themeBtn.innerHTML = '<i class="fas fa-moon" aria-hidden="true"></i>';
        // Fallback text if icon doesn't load
        if (!themeBtn.querySelector('.fas')) {
            themeBtn.textContent = '🌙';
        }
        themeBtn.title = 'Switch to Light Mode';
        themeBtn.setAttribute('aria-label', 'Switch to Light Mode');
    }
    
    console.log('Icon updated successfully');
}

function toggleTheme() {
    console.log('Theme toggle clicked');
    const isCurrentlyLight = document.body.classList.contains('light-mode');
    
    if (isCurrentlyLight) {
        // Switch to dark mode
        document.body.classList.remove('light-mode');
        localStorage.setItem('theme', 'dark');
        console.log('Switched to Dark Mode');
    } else {
        // Switch to light mode
        document.body.classList.add('light-mode');
        localStorage.setItem('theme', 'light');
        console.log('Switched to Light Mode');
    }
    
    updateThemeButtonIcon();
}

// ============================================
// SEARCH FUNCTIONALITY
// ============================================

async function handleSearch() {
    const city = searchInput.value.trim();
    if (!city) return;

    const simplifiedCity = city.split(',')[0].trim();
    currentCity = simplifiedCity;
    localStorage.setItem('lastCity', simplifiedCity);
    searchInput.value = '';
    suggestionsList.classList.remove('active');

    await fetchWeatherData(simplifiedCity);
}

async function handleSearchInput(e) {
    const query = e.target.value.trim();
    if (query.length < 2) {
        suggestionsList.classList.remove('active');
        return;
    }

    try {
        const url = `${GEO_URL}?name=${encodeURIComponent(query)}&count=10&language=en&format=json`;
        const response = await fetch(url);

        if (!response.ok) {
            suggestionsList.classList.remove('active');
            return;
        }

        const data = await response.json();

        if (!data.results || data.results.length === 0) {
            suggestionsList.classList.remove('active');
            return;
        }

        const suggestions = data.results.map(item => ({
            name: item.name,
            country: item.country,
            admin1: item.admin1,
            latitude: item.latitude,
            longitude: item.longitude
        }));

        displaySuggestions(suggestions);
    } catch (error) {
        console.error('Error fetching suggestions:', error);
        suggestionsList.classList.remove('active');
    }
}

function displaySuggestions(suggestions) {
    suggestionsList.innerHTML = '';
    suggestions.forEach(suggestion => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        const displayName = `${suggestion.name}${suggestion.admin1 ? ', ' + suggestion.admin1 : ''}, ${suggestion.country}`;
        const simpleName = `${suggestion.name}, ${suggestion.country}`;
        div.textContent = displayName;
        div.addEventListener('click', () => {
            searchInput.value = displayName;
            currentCity = simpleName;
            localStorage.setItem('lastCity', simpleName);
            suggestionsList.classList.remove('active');
            fetchWeatherByCoordinates(suggestion.latitude, suggestion.longitude);
        });
        suggestionsList.appendChild(div);
    });
    suggestionsList.classList.add('active');
}

// ============================================
// GEOLOCATION
// ============================================

function getLocationFromBrowser() {
    if (!navigator.geolocation) {
        showError('Geolocation is not supported by your browser');
        loadDefaultCity();
        return;
    }

    showLoading();
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;
            await fetchWeatherByCoordinates(latitude, longitude);
        },
        (error) => {
            console.error('Geolocation error:', error);
            loadDefaultCity();
        }
    );
}

async function loadDefaultCity() {
    const defaultCities = ['New York', 'London', 'Tokyo', 'Sydney', 'Paris'];
    const randomCity = defaultCities[Math.floor(Math.random() * defaultCities.length)];
    currentCity = randomCity;
    localStorage.setItem('lastCity', randomCity);
    await fetchWeatherData(randomCity);
}

// ============================================
// FETCH WEATHER DATA
// ============================================

async function fetchWeatherData(city) {
    showLoading();
    clearError();

    try {
        const geoUrl = `${GEO_URL}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
        const geoResponse = await fetch(geoUrl);

        if (!geoResponse.ok) {
            throw new Error(`Geocoding failed: ${geoResponse.status}`);
        }

        const geoData = await geoResponse.json();

        if (!geoData.results || geoData.results.length === 0) {
            showError(`City "${city}" not found. Try another search.`);
            hideLoading();
            return;
        }

        const { latitude, longitude, name, country } = geoData.results[0];
        currentCity = `${name}, ${country}`;

        await fetchWeatherByCoordinates(latitude, longitude);
    } catch (error) {
        showError('Failed to fetch weather data. Please try again.');
        console.error('Error:', error);
        hideLoading();
    }
}

async function fetchWeatherByCoordinates(lat, lon) {
    try {
        const url = `${WEATHER_URL}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,cloud_cover,pressure_msl,visibility&hourly=temperature_2m,precipitation_probability,precipitation,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,precipitation_probability_max&timezone=auto&forecast_days=7`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!data.current || !data.hourly || !data.daily) {
            throw new Error('Missing required weather data');
        }

        currentWeatherData = {
            current: data.current,
            hourly: data.hourly,
            daily: data.daily,
            timezone: data.timezone
        };

        forecastData = data;

        lastUpdateTime = new Date();
        displayCurrentWeather();
        displayHourlyForecast();
        displayDailyForecast();
        populateAdditionalDetails();

        hideLoading();
        weatherContent.classList.add('active');
    } catch (error) {
        showError('Failed to fetch weather data. Please check your connection.');
        console.error('Weather API Error:', error);
        hideLoading();
    }
}

// ============================================
// DISPLAY CURRENT WEATHER
// ============================================

function displayCurrentWeather() {
    if (!currentWeatherData || !currentWeatherData.current) return;

    const current = currentWeatherData.current;
    const daily = currentWeatherData.daily;

    if (!daily || !Array.isArray(daily.sunrise) || !Array.isArray(daily.sunset)) {
        console.warn('Missing daily data');
        return;
    }

    // Update city name
    document.getElementById('weatherCityName').textContent = currentCity;

    // Get weather code info
    const weatherCode = current.weather_code || 0;
    const weatherInfo = WEATHER_CODES[weatherCode] || { text: 'Unknown', icon: '🌡️' };

    // Apply dynamic background
    applyWeatherBackground(weatherCode);

    // Update weather icon and description
    const iconImg = getWeatherIconURL(weatherCode);
    document.getElementById('weatherIcon').src = iconImg;
    document.getElementById('weatherIcon').alt = weatherInfo.text;
    document.getElementById('weatherDescription').textContent = weatherInfo.text;

    // Update temperature
    document.getElementById('temperature').textContent = Math.round(current.temperature_2m || 0);

    // Update stats
    document.getElementById('humidity').textContent = `${current.relative_humidity_2m || 0}%`;
    document.getElementById('windSpeed').textContent = `${Math.round(current.wind_speed_10m || 0)} km/h`;
    document.getElementById('visibility').textContent = `${((current.visibility || 0) / 1000).toFixed(1)} km`;
    document.getElementById('pressure').textContent = `${Math.round(current.pressure_msl || 0)} hPa`;

    // Update sunrise/sunset
    try {
        if (daily.sunrise && daily.sunrise.length > 0 && daily.sunset && daily.sunset.length > 0) {
            // Parse times without UTC conversion - API returns times in local timezone already
            const sunriseStr = daily.sunrise[0];  // e.g., "2026-03-17T05:47"
            const sunsetStr = daily.sunset[0];    // e.g., "2026-03-17T17:28"
            
            // Extract hours and minutes from ISO string
            const sunriseTime = sunriseStr.split('T')[1]; // "05:47"
            const sunsetTime = sunsetStr.split('T')[1];   // "17:28"
            
            // Format as 12-hour time with AM/PM
            const formatTime = (timeStr) => {
                const [hours, minutes] = timeStr.split(':').map(Number);
                const period = hours >= 12 ? 'PM' : 'AM';
                const displayHours = hours % 12 || 12;
                return `${String(displayHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
            };
            
            document.getElementById('sunrise').textContent = formatTime(sunriseTime);
            document.getElementById('sunset').textContent = formatTime(sunsetTime);
        }
    } catch (e) {
        console.warn('Error parsing sunrise/sunset:', e);
        document.getElementById('sunrise').textContent = '--';
        document.getElementById('sunset').textContent = '--';
    }

    updateLastUpdated();
    updateCurrentConditions();
}

// ============================================
// APPLY WEATHER BACKGROUND
// ============================================

function applyWeatherBackground(weatherCode) {
    if (!weatherSection) return;

    weatherSection.classList.remove(
        'weather-sunny',
        'weather-cloudy',
        'weather-rainy',
        'weather-snowy',
        'weather-stormy',
        'weather-foggy'
    );

    if (weatherCode === 0 || weatherCode === 1) {
        weatherSection.classList.add('weather-sunny');
    } else if (weatherCode === 2 || weatherCode === 3) {
        weatherSection.classList.add('weather-cloudy');
    } else if (weatherCode === 45 || weatherCode === 48) {
        weatherSection.classList.add('weather-foggy');
    } else if ((weatherCode >= 51 && weatherCode <= 82) || (weatherCode >= 80 && weatherCode <= 82)) {
        weatherSection.classList.add('weather-rainy');
    } else if ((weatherCode >= 71 && weatherCode <= 86)) {
        weatherSection.classList.add('weather-snowy');
    } else if ((weatherCode >= 95 && weatherCode <= 99)) {
        weatherSection.classList.add('weather-stormy');
    }
}

// ============================================
// UPDATE CURRENT CONDITIONS
// ============================================

function updateCurrentConditions() {
    if (!currentWeatherData || !currentWeatherData.current) return;

    const current = currentWeatherData.current;
    const hourly = forecastData.hourly || {};

    document.getElementById('feelsLikeInfo').textContent = `${Math.round(current.apparent_temperature || 0)}°`;
    document.getElementById('cloudCover').textContent = `${current.cloud_cover || 0}%`;

    const windGust = Math.round((current.wind_speed_10m || 0) * 1.6);
    document.getElementById('windGust').textContent = `${windGust} km/h`;

    const precipProbabilities = hourly.precipitation_probability || [];
    const nextHourPrecipChance = precipProbabilities.length > 0 ? precipProbabilities[0] : 0;
    document.getElementById('precipInfo').textContent = `${Math.round(nextHourPrecipChance)}%`;
}

// ============================================
// WEATHER ICON MAPPING
// ============================================

function getWeatherIconURL(code) {
    const iconMap = {
        0: '01d', 1: '02d', 2: '03d', 3: '04d', 45: '50d', 48: '50d',
        51: '09d', 53: '09d', 55: '09d', 61: '10d', 63: '10d', 65: '10d',
        71: '13d', 73: '13d', 75: '13d', 80: '10d', 81: '10d', 82: '10d',
        85: '13d', 86: '13d', 95: '11d', 96: '11d', 99: '11d'
    };

    const iconCode = iconMap[code] || '01d';
    return `https://openweathermap.org/img/wn/${iconCode}@4x.png`;
}

// ============================================
// DISPLAY HOURLY FORECAST
// ============================================

function displayHourlyForecast() {
    if (!forecastData || !forecastData.hourly) return;

    const hourlyContainer = document.getElementById('hourlyContainer');
    hourlyContainer.innerHTML = '';

    const hourly = forecastData.hourly;
    const times = hourly.time || [];
    const temps = hourly.temperature_2m || [];
    const codes = hourly.weather_code || [];

    if (times.length === 0) return;

    for (let i = 0; i < Math.min(12, times.length); i++) {
        try {
            const time = new Date(times[i] + 'Z');
            const hour = time.getHours();
            const temp = Math.round(temps[i] || 0);
            const code = codes[i] || 0;
            const iconImg = getWeatherIconURL(code);

            const hourlyItem = document.createElement('div');
            hourlyItem.className = 'hourly-item';
            hourlyItem.innerHTML = `
                <div class="time">${hour}:00</div>
                <img src="${iconImg}" alt="weather">
                <div class="temp">${temp}°</div>
            `;
            hourlyContainer.appendChild(hourlyItem);
        } catch (e) {
            console.warn('Error displaying hourly item:', e);
        }
    }
}

// ============================================
// DISPLAY DAILY FORECAST
// ============================================

function displayDailyForecast() {
    if (!forecastData || !forecastData.daily) return;

    const dailyContainer = document.getElementById('dailyContainer');
    dailyContainer.innerHTML = '';

    const daily = forecastData.daily;
    const dates = daily.date || [];
    const maxTemps = daily.temperature_2m_max || [];
    const minTemps = daily.temperature_2m_min || [];
    const codes = daily.weather_code || [];

    if (dates.length === 0) return;

    const allTemps = [...maxTemps, ...minTemps].filter(t => t);
    const globalMin = Math.min(...allTemps);
    const globalMax = Math.max(...allTemps);
    const tempRange = globalMax - globalMin || 1;

    for (let i = 0; i < Math.min(7, dates.length); i++) {
        try {
            const date = new Date(dates[i] + 'T00:00:00Z');
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

            const maxTemp = Math.round(maxTemps[i] || 0);
            const minTemp = Math.round(minTemps[i] || 0);
            const code = codes[i] || 0;
            const weatherInfo = WEATHER_CODES[code] || { text: 'Unknown', icon: '🌡️' };
            const iconImg = getWeatherIconURL(code);

            const barStartPercent = ((minTemp - globalMin) / tempRange * 100);
            const barWidth = ((maxTemp - minTemp) / tempRange * 100);

            const dailyItem = document.createElement('div');
            dailyItem.className = 'daily-item';
            dailyItem.innerHTML = `
                <div class="date">${dayName}</div>
                <img src="${iconImg}" alt="weather">
                <div class="description">${weatherInfo.text}</div>
                <div class="daily-temps">
                    <div class="temp-bar">
                        <div class="temp-bar-fill" style="width: ${barWidth}%; margin-left: ${barStartPercent}%;"></div>
                    </div>
                    <div class="temp-max">${maxTemp}°</div>
                    <div class="temp-min">${minTemp}°</div>
                </div>
            `;
            dailyContainer.appendChild(dailyItem);
        } catch (e) {
            console.warn('Error displaying daily item:', e);
        }
    }
}

// ============================================
// POPULATE ADDITIONAL DETAILS
// ============================================

function populateAdditionalDetails() {
    if (!forecastData) return;

    const hourly = forecastData.hourly || {};
    const current = currentWeatherData.current || {};

    const precipProbabilities = hourly.precipitation_probability || [];
    const maxPrecipProb = precipProbabilities.length > 0 ? Math.max(0, ...precipProbabilities.slice(0, 24)) : 0;

    const precipAmounts = hourly.precipitation || [];
    const totalPrecip = precipAmounts.length > 0 ? precipAmounts.slice(0, 24).reduce((a, b) => a + (b || 0), 0) : 0;

    document.getElementById('precipChance').textContent = `${Math.round(maxPrecipProb)}%`;
    document.getElementById('precipAmount').textContent = `${totalPrecip.toFixed(1)} mm`;

    const cloudCover = current.cloud_cover || 0;
    const aqiValue = Math.max(1, Math.min(5, Math.ceil(cloudCover / 20)));
    const aqiLabels = ['Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'];
    document.getElementById('aqi').textContent = aqiValue;
    document.getElementById('aqiStatus').textContent = aqiLabels[aqiValue - 1];

    const cloudFactor = (100 - cloudCover) / 100;
    const approximateUVI = Math.max(0, 11 * cloudFactor);
    const uviLevel = approximateUVI < 3 ? 'Low' : 
                    approximateUVI < 6 ? 'Moderate' :
                    approximateUVI < 8 ? 'High' : 'Very High';

    document.getElementById('uvIndex').textContent = approximateUVI.toFixed(1);
    document.getElementById('uvLevel').textContent = uviLevel;
}

// ============================================
// UPDATE LAST UPDATED TIME
// ============================================

function updateLastUpdated() {
    if (!lastUpdateTime) return;

    const now = new Date();
    const diffMs = now - lastUpdateTime;
    const diffMins = Math.floor(diffMs / 60000);

    let timeString;
    if (diffMins === 0) {
        timeString = 'Just now';
    } else if (diffMins < 60) {
        timeString = `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else {
        const hours = Math.floor(diffMins / 60);
        timeString = `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }

    document.getElementById('lastUpdated').textContent = `Last updated: ${timeString}`;
}

// ============================================
// UI HELPER FUNCTIONS
// ============================================

function showLoading() {
    loading.classList.add('active');
    weatherContent.classList.remove('active');
}

function hideLoading() {
    loading.classList.remove('active');
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('active');
}

function clearError() {
    errorMessage.classList.remove('active');
}