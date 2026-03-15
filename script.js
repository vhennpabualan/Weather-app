// Open-Meteo API Configuration (No API key required!)
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

// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const locationBtn = document.getElementById('locationBtn');
const suggestionsDropdown = document.getElementById('suggestions');
const weatherContent = document.getElementById('weatherContent');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('error');

// State
let currentCity = null;
let currentWeatherData = null;
let forecastData = null;
let lastUpdateTime = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
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

    // Try to get user's location on load
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
}

// Search handling
async function handleSearch() {
    let city = searchInput.value.trim();
    if (!city) return;

    // Simplify city name by removing excessive admin regions
    // Keep only the first part before commas (the actual city name)
    const simplifiedCity = city.split(',')[0].trim();

    currentCity = simplifiedCity;
    localStorage.setItem('lastCity', simplifiedCity);
    searchInput.value = '';
    suggestionsDropdown.classList.remove('active');

    await fetchWeatherData(simplifiedCity);
}

async function handleSearchInput(e) {
    const query = e.target.value.trim();
    if (query.length < 2) {
        suggestionsDropdown.classList.remove('active');
        return;
    }

    try {
        const url = `${GEO_URL}?name=${encodeURIComponent(query)}&count=10&language=en&format=json`;
        const response = await fetch(url);
        
        if (!response.ok) {
            suggestionsDropdown.classList.remove('active');
            return;
        }

        const data = await response.json();

        if (!data.results || data.results.length === 0) {
            suggestionsDropdown.classList.remove('active');
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
        suggestionsDropdown.classList.remove('active');
    }
}

function displaySuggestions(suggestions) {
    suggestionsDropdown.innerHTML = '';
    suggestions.forEach(suggestion => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        // Display name with admin region for clarity
        const displayName = `${suggestion.name}${suggestion.admin1 ? ', ' + suggestion.admin1 : ''}, ${suggestion.country}`;
        // Simplified name for storage (just city, country)
        const simpleName = `${suggestion.name}, ${suggestion.country}`;
        div.textContent = displayName;
        div.addEventListener('click', () => {
            searchInput.value = displayName;
            currentCity = simpleName;
            localStorage.setItem('lastCity', simpleName);
            suggestionsDropdown.classList.remove('active');
            // Use coordinates directly (most reliable)
            fetchWeatherByCoordinates(suggestion.latitude, suggestion.longitude);
        });
        suggestionsDropdown.appendChild(div);
    });
    suggestionsDropdown.classList.add('active');
}

// Geolocation
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
            // Fallback to default city if geolocation fails
            loadDefaultCity();
        }
    );
}

// Load default city as fallback
async function loadDefaultCity() {
    const defaultCities = ['New York', 'London', 'Tokyo', 'Sydney', 'Paris'];
    const randomCity = defaultCities[Math.floor(Math.random() * defaultCities.length)];
    currentCity = randomCity;
    localStorage.setItem('lastCity', randomCity);
    await fetchWeatherData(randomCity);
}

// Fetch weather data
async function fetchWeatherData(city) {
    showLoading();
    clearError();

    try {
        // Get coordinates from city name
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
        // Fetch weather data from Open-Meteo
        const url = `${WEATHER_URL}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,cloud_cover,pressure_msl,visibility&hourly=temperature_2m,precipitation_probability,precipitation,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,precipitation_probability_max&timezone=auto&forecast_days=5`;
        
        console.log('Fetching weather from:', url);
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('API Response:', data);

        // Check if data has required fields
        if (!data.current) {
            throw new Error('Missing current weather data');
        }
        if (!data.hourly) {
            throw new Error('Missing hourly forecast data');
        }
        if (!data.daily) {
            throw new Error('Missing daily forecast data');
        }

        // Structure data to match our app's expectations
        currentWeatherData = {
            current: data.current,
            hourly: data.hourly,
            daily: data.daily,
            timezone: data.timezone
        };

        forecastData = data;

        // Update UI
        lastUpdateTime = new Date();
        displayCurrentWeather();
        displayHourlyForecast();
        displayDailyForecast();
        populateAdditionalDetails();

        hideLoading();
        weatherContent.classList.remove('hidden');
    } catch (error) {
        showError('Failed to fetch weather data. Please check your internet connection or try a different city.');
        console.error('Weather API Error:', error);
        hideLoading();
    }
}

// Display current weather
function displayCurrentWeather() {
    if (!currentWeatherData || !currentWeatherData.current) return;

    const current = currentWeatherData.current;
    const daily = currentWeatherData.daily;
    
    // Safety checks
    if (!daily || !Array.isArray(daily.sunrise) || !Array.isArray(daily.sunset)) {
        console.warn('Missing daily data:', daily);
        return;
    }

    // Update header with city name
    // document.getElementById('headerCity').textContent = currentCity;

    // Update city name in weather section
    document.getElementById('weatherCityName').textContent = currentCity;

    // Get weather code info
    const weatherCode = current.weather_code || 0;
    const weatherInfo = WEATHER_CODES[weatherCode] || { text: 'Unknown', icon: '🌡️' };

    // Apply dynamic background based on weather condition
    applyWeatherBackground(weatherCode);

    // Update weather icon and description
    const iconImg = getWeatherIconURL(weatherCode);
    document.getElementById('weatherIcon').src = iconImg;
    document.getElementById('weatherIcon').alt = weatherInfo.text;
    document.getElementById('weatherDescription').textContent = weatherInfo.text;

    // Update temperatures
    document.getElementById('temperature').textContent = Math.round(current.temperature_2m || 0);

    // Update quick stats
    document.getElementById('humidity').textContent = `${current.relative_humidity_2m || 0}%`;
    document.getElementById('windSpeed').textContent = `${Math.round(current.wind_speed_10m || 0)} km/h`;
    document.getElementById('visibility').textContent = `${((current.visibility || 0) / 1000).toFixed(1)} km`;
    document.getElementById('pressure').textContent = `${Math.round(current.pressure_msl || 0)} hPa`;

    // Update sunrise/sunset with safety checks
    try {
        if (daily.sunrise && daily.sunrise.length > 0 && daily.sunset && daily.sunset.length > 0) {
            const sunrise = new Date(daily.sunrise[0] + 'Z');
            const sunset = new Date(daily.sunset[0] + 'Z');
            document.getElementById('sunrise').textContent = 
                sunrise.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            document.getElementById('sunset').textContent = 
                sunset.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        }
    } catch (e) {
        console.warn('Error parsing sunrise/sunset:', e);
        document.getElementById('sunrise').textContent = '--';
        document.getElementById('sunset').textContent = '--';
    }

    // Update last updated time
    updateLastUpdated();

    // Update conditions
    updateCurrentConditions();
}

// Apply weather-based background styling
function applyWeatherBackground(weatherCode) {
    const weatherSection = document.getElementById('weatherSection');
    if (!weatherSection) return;

    // Remove all weather classes
    weatherSection.classList.remove(
        'weather-sunny',
        'weather-cloudy',
        'weather-rainy',
        'weather-snowy',
        'weather-stormy',
        'weather-foggy'
    );

    // Apply appropriate weather class based on code
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

// Update current weather conditions
function updateCurrentConditions() {
    if (!currentWeatherData || !currentWeatherData.current) return;

    const current = currentWeatherData.current;
    const hourly = forecastData.hourly || {};

    // Feels like temperature
    document.getElementById('feelsLikeInfo').textContent = `${Math.round(current.apparent_temperature || 0)}°`;

    // Cloud cover
    document.getElementById('cloudCover').textContent = `${current.cloud_cover || 0}%`;

    // Wind gust (approximation - we'll use wind speed since gust may not be available)
    // Gust is typically 1.5-2x the average wind speed
    const windGust = Math.round((current.wind_speed_10m || 0) * 1.6);
    document.getElementById('windGust').textContent = `${windGust} km/h`;

    // Precipitation chance from hourly data
    const precipProbabilities = hourly.precipitation_probability || [];
    const nextHourPrecipChance = precipProbabilities.length > 0 ? precipProbabilities[0] : 0;
    document.getElementById('precipInfo').textContent = `${Math.round(nextHourPrecipChance)}%`;
}

// Get weather icon URL based on weather code
function getWeatherIconURL(code) {
    // Map WMO weather codes to Open-Meteo icon codes
    const iconMap = {
        0: '01d', // Clear
        1: '02d', // Mainly clear
        2: '03d', // Partly cloudy
        3: '04d', // Overcast
        45: '50d', // Foggy
        48: '50d', // Foggy
        51: '09d', // Drizzle
        53: '09d', // Drizzle
        55: '09d', // Heavy drizzle
        61: '10d', // Rain
        63: '10d', // Rain
        65: '10d', // Heavy rain
        71: '13d', // Snow
        73: '13d', // Snow
        75: '13d', // Heavy snow
        80: '10d', // Rain showers
        81: '10d', // Rain showers
        82: '10d', // Heavy rain showers
        85: '13d', // Snow showers
        86: '13d', // Snow showers
        95: '11d', // Thunderstorm
        96: '11d', // Thunderstorm
        99: '11d'  // Thunderstorm
    };
    
    const iconCode = iconMap[code] || '01d';
    return `https://openweathermap.org/img/wn/${iconCode}@4x.png`;
}

// Display hourly forecast
function displayHourlyForecast() {
    if (!forecastData || !forecastData.hourly) return;

    const hourlyContainer = document.getElementById('hourlyContainer');
    hourlyContainer.innerHTML = '';

    const hourly = forecastData.hourly;
    const times = hourly.time || [];
    const temps = hourly.temperature_2m || [];
    const codes = hourly.weather_code || [];

    // Safety check
    if (times.length === 0) return;

    // Display next 12 hours
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

// Display 5-day forecast
function displayDailyForecast() {
    if (!forecastData || !forecastData.daily) return;

    const dailyContainer = document.getElementById('dailyContainer');
    dailyContainer.innerHTML = '';

    const daily = forecastData.daily;
    const dates = daily.date || [];
    const maxTemps = daily.temperature_2m_max || [];
    const minTemps = daily.temperature_2m_min || [];
    const codes = daily.weather_code || [];

    // Safety check
    if (dates.length === 0) return;

    // Find min and max temps across all days for scaling
    const allTemps = [...maxTemps, ...minTemps].filter(t => t);
    const globalMin = Math.min(...allTemps);
    const globalMax = Math.max(...allTemps);
    const tempRange = globalMax - globalMin;

    // Display up to 7 days
    for (let i = 0; i < Math.min(7, dates.length); i++) {
        try {
            const date = new Date(dates[i] + 'T00:00:00Z');
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

            const maxTemp = Math.round(maxTemps[i] || 0);
            const minTemp = Math.round(minTemps[i] || 0);
            const code = codes[i] || 0;
            const weatherInfo = WEATHER_CODES[code] || { text: 'Unknown', icon: '🌡️' };
            const iconImg = getWeatherIconURL(code);

            // Calculate bar fill percentage
            const barStartPercent = ((minTemp - globalMin) / tempRange * 100);
            const barWidth = ((maxTemp - minTemp) / tempRange * 100);

            const dailyItem = document.createElement('div');
            dailyItem.className = 'daily-item';
            dailyItem.innerHTML = `
                <div class="date">${dayName}</div>
                <div class="weather-info">
                    <img src="${iconImg}" alt="weather">
                    <div class="description">${weatherInfo.text}</div>
                </div>
                <div class="temps">
                    <div class="temp-bar">
                        <div class="temp-bar-fill" style="width: ${barWidth}%; margin-left: ${barStartPercent}%;"></div>
                    </div>
                    <div class="temp-info">
                        <div class="temp-max">${maxTemp}°</div>
                        <div class="temp-min">${minTemp}°</div>
                    </div>
                </div>
            `;
            dailyContainer.appendChild(dailyItem);
        } catch (e) {
            console.warn('Error displaying daily item:', e);
        }
    }
}

// Populate additional details
function populateAdditionalDetails() {
    if (!forecastData) return;

    const hourly = forecastData.hourly || {};
    const current = currentWeatherData.current || {};

    // Precipitation info from hourly data with safety checks
    const precipProbabilities = hourly.precipitation_probability || [];
    const maxPrecipProb = precipProbabilities.length > 0 ? Math.max(0, ...precipProbabilities.slice(0, 24)) : 0;
    
    const precipAmounts = hourly.precipitation || [];
    const totalPrecip = precipAmounts.length > 0 ? precipAmounts.slice(0, 24).reduce((a, b) => a + (b || 0), 0) : 0;

    document.getElementById('precipChance').textContent = `${Math.round(maxPrecipProb)}%`;
    document.getElementById('precipAmount').textContent = `${totalPrecip.toFixed(1)} mm`;

    // Air Quality (using cloud cover as proxy for air quality)
    const cloudCover = current.cloud_cover || 0;
    const aqiValue = Math.max(1, Math.min(5, Math.ceil(cloudCover / 20)));
    const aqiLabels = ['Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'];
    document.getElementById('aqi').textContent = aqiValue;
    document.getElementById('aqiStatus').textContent = aqiLabels[aqiValue - 1];

    // UV Index (approximate based on weather code and cloud cover)
    const cloudFactor = (100 - cloudCover) / 100;
    const approximateUVI = Math.max(0, 11 * cloudFactor);
    const uviLevel = approximateUVI < 3 ? 'Low' : 
                    approximateUVI < 6 ? 'Moderate' :
                    approximateUVI < 8 ? 'High' : 'Very High';

    document.getElementById('uvIndex').textContent = approximateUVI.toFixed(1);
    document.getElementById('uvLevel').textContent = uviLevel;
}

// Update last updated time
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

// UI Helpers
function showLoading() {
    loading.classList.add('active');
    weatherContent.classList.add('hidden');
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

// Update last updated time periodically
setInterval(updateLastUpdated, 60000); // Update every minute

// Close suggestions dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (e.target !== searchInput && !suggestionsDropdown.contains(e.target)) {
        suggestionsDropdown.classList.remove('active');
    }
});
