// ============================================
// SKYSENSE v2.0 â€” UPGRADED & FIXED
// Fixes: adaptive bg visibility, hero video,
//        cursor, local assets, theme logic
// Added: Â°C/Â°F toggle, sunrise/sunset, wind
//        direction, humidity bar, popular cities,
//        pressure/visibility status, min/max temp
// ============================================

const CONFIG = {
    API_KEY: 'ec7f7e74a503db4ea94082ccae646b40',
    BASE_URL: 'https://api.openweathermap.org/data/2.5',
    UNITS: 'metric'
};

// ============================================
// STATE
// ============================================
let state = {
    isCelsius: true,
    isDarkMode: false,
    lastWeatherData: null,
    lastForecastData: null,
    animationFrame: null,
    particles: [],
    mouse: { x: 0, y: 0 },
    cursor: { dot: { x: 0, y: 0 }, ring: { x: 0, y: 0 } },
    debounceTimer: null,
    heroScrollTicking: false,
    parallaxTicking: false
};

// ============================================
// DOM ELEMENTS
// ============================================
const el = {
    splash: document.getElementById('splash'),
    hero: document.getElementById('hero'),
    heroVideo: document.getElementById('heroVideo'),
    heroBtn: document.getElementById('heroBtn'),
    skipHero: document.getElementById('skipHero'),
    scrollIndicator: document.querySelector('.scroll-indicator'),
    app: document.getElementById('app'),
    dashboardHeader: document.getElementById('dashboardHeader'),
    floatingHome: document.getElementById('floatingHome'),
    locationBtn: document.getElementById('locationBtn'),
    themeBtn: document.getElementById('themeBtn'),
    unitToggle: document.getElementById('unitToggle'),
    unitC: document.getElementById('unitC'),
    unitF: document.getElementById('unitF'),
    cityInput: document.getElementById('cityInput'),
    searchBtn: document.getElementById('searchBtn'),
    weatherContent: document.getElementById('weatherContent'),
    errorMessage: document.getElementById('errorMessage'),
    loadingSkeleton: document.getElementById('loadingSkeleton'),
    time: document.getElementById('time'),
    date: document.getElementById('date'),
    canvas: document.getElementById('weatherCanvas'),
    cursorDot: document.querySelector('.cursor-dot'),
    cursorRing: document.querySelector('.cursor-ring'),
    citySuggestions: document.getElementById('citySuggestions')
};

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initSplash();
    initHeroExperience();
    initCursor();
    initTime();
    initEventListeners();
    initCanvas();
    initParallax();

    // Ensure the landing hero is visible and the dashboard is ready underneath it
    if (el.hero) {
        el.hero.style.display = 'flex';
        el.hero.style.opacity = '1';
    }
    if (el.app) {
        el.app.classList.add('visible');
        el.app.style.opacity = '1';
        el.app.style.transform = 'translateY(0)';
    }
});

// ============================================
// SPLASH SCREEN
// ============================================
function initSplash() {
    setTimeout(() => {
        el.splash?.classList.add('hidden');
        setTimeout(() => {
            if (el.splash) el.splash.style.display = 'none';
        }, 650);
    }, 2600);
}

// ============================================
// PREMIUM CUSTOM CURSOR
// Fixed: using left/top instead of transform
// so CSS transform(-50%,-50%) stays intact
// ============================================
function initCursor() {
    document.body.classList.add('native-cursor');
}

function animateCursor() {
    if (!el.cursorDot || !el.cursorRing) return;

    // Smooth lerp toward mouse
    state.cursor.dot.x += (state.mouse.x - state.cursor.dot.x) * 0.28;
    state.cursor.dot.y += (state.mouse.y - state.cursor.dot.y) * 0.28;
    state.cursor.ring.x += (state.mouse.x - state.cursor.ring.x) * 0.12;
    state.cursor.ring.y += (state.mouse.y - state.cursor.ring.y) * 0.12;

    // Use left/top so CSS transform: translate(-50%,-50%) still centers the element
    el.cursorDot.style.left = state.cursor.dot.x + 'px';
    el.cursorDot.style.top = state.cursor.dot.y + 'px';
    el.cursorRing.style.left = state.cursor.ring.x + 'px';
    el.cursorRing.style.top = state.cursor.ring.y + 'px';

    requestAnimationFrame(animateCursor);
}

// ============================================
// TIME AND DATE
// ============================================
function initTime() {
    updateTime();
    setInterval(updateTime, 1000);
}

function updateTime() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    if (el.time) el.time.textContent = `${hh}:${mm}`;
    if (el.date) el.date.textContent = now.toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'short', day: 'numeric'
    });
}

// ============================================
// EVENT LISTENERS
// ============================================
function initEventListeners() {
    el.heroBtn?.addEventListener('click', scrollToDashboard);
    el.skipHero?.addEventListener('click', scrollToDashboard);
    el.scrollIndicator?.addEventListener('click', scrollToDashboard);
    el.floatingHome?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    el.searchBtn?.addEventListener('click', searchWeather);
    el.cityInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') searchWeather(); });
    el.locationBtn?.addEventListener('click', getCurrentLocation);
    el.themeBtn?.addEventListener('click', toggleTheme);
    el.unitToggle?.addEventListener('click', toggleUnit);

    // City autocomplete
    el.cityInput?.addEventListener('input', handleCityInput);
    el.cityInput?.addEventListener('focus', handleCityInput);
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-box')) hideSuggestions();
    });

    // Popular city chips
    document.querySelectorAll('.city-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const city = chip.dataset.city;
            if (el.cityInput) el.cityInput.value = city;
            searchWeather();
        });
    });
}

// ============================================
// HERO EXPERIENCE
// ============================================
function initHeroExperience() {
    syncHeroProgress();
    updateHeroWeatherTrack('Clear');

    window.addEventListener('scroll', () => {
        if (state.heroScrollTicking) return;

        state.heroScrollTicking = true;
        requestAnimationFrame(() => {
            syncHeroProgress();
            state.heroScrollTicking = false;
        });
    }, { passive: true });

    if (!el.heroVideo) return;

    const tryPlayVideo = () => {
        const playPromise = el.heroVideo.play();
        if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {});
        }
    };

    el.heroVideo.muted = true;
    el.heroVideo.playsInline = true;

    if (el.heroVideo.readyState >= 2) {
        el.hero?.classList.add('video-ready');
    }

    el.heroVideo.addEventListener('loadeddata', () => {
        el.hero?.classList.add('video-ready');
    }, { once: true });

    el.heroVideo.addEventListener('error', () => {
        el.hero?.classList.add('video-fallback');
    });

    tryPlayVideo();

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            tryPlayVideo();
        }
    });
}

function syncHeroProgress() {
    if (!el.hero) return;

    const heroHeight = el.hero.offsetHeight || window.innerHeight;
    const progress = Math.max(0, Math.min(1, window.scrollY / Math.max(heroHeight * 0.85, 1)));

    el.hero.style.setProperty('--hero-video-scale', (1.08 - progress * 0.08).toFixed(3));
    el.hero.style.setProperty('--hero-video-shift', `${Math.round(progress * 32)}px`);
    el.hero.style.setProperty('--hero-content-shift', `${Math.round(progress * -72)}px`);
    el.hero.style.setProperty('--hero-content-opacity', `${Math.max(0.18, 1 - progress * 1.05).toFixed(3)}`);
    el.hero.style.setProperty('--hero-meta-opacity', `${Math.max(0, 1 - progress * 1.35).toFixed(3)}`);
}

function scrollToDashboard() {
    const target = el.dashboardHeader || el.app;
    if (!target) return;

    target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}

function updateHeroWeatherTrack(weather) {
    const phases = document.querySelectorAll('.hero-phase');
    if (!phases.length) return;

    const normalized = String(weather || '').toLowerCase();
    let activePhase = 'clear';

    if (normalized === 'thunderstorm') {
        activePhase = 'thunderstorm';
    } else if (normalized === 'rain' || normalized === 'drizzle') {
        activePhase = 'rain';
    } else if (normalized === 'clouds' || normalized === 'mist' || normalized === 'fog' || normalized === 'haze') {
        activePhase = 'clouds';
    }

    phases.forEach(phase => {
        phase.classList.toggle('is-active', phase.dataset.phase === activePhase);
    });
}

// ============================================
// DARK MODE TOGGLE
// ============================================
function toggleTheme() {
    state.isDarkMode = !state.isDarkMode;
    document.body.classList.toggle('night-mode', state.isDarkMode);

    const sunIcon = el.themeBtn?.querySelector('.sun-icon');
    const moonIcon = el.themeBtn?.querySelector('.moon-icon');
    const label = el.themeBtn?.querySelector('.btn-label');

    if (state.isDarkMode) {
        sunIcon && (sunIcon.style.display = 'none');
        moonIcon && (moonIcon.style.display = 'block');
        label && (label.textContent = 'Light Mode');
    } else {
        sunIcon && (sunIcon.style.display = 'block');
        moonIcon && (moonIcon.style.display = 'none');
        label && (label.textContent = 'Dark Mode');
    }
}

// ============================================
// TEMPERATURE UNIT TOGGLE (Â°C / Â°F)
// ============================================
function toggleUnit() {
    state.isCelsius = !state.isCelsius;

    // Toggle active class on labels
    el.unitC?.classList.toggle('inactive', !state.isCelsius);
    el.unitF?.classList.toggle('inactive', state.isCelsius);

    // Update unit label in the temp display
    const unitSpan = document.getElementById('tempUnit');
    if (unitSpan) unitSpan.textContent = state.isCelsius ? 'C' : 'F';

    // Re-display using cached data if available
    if (state.lastWeatherData) {
        displayWeather(state.lastWeatherData);
    }
    if (state.lastForecastData) {
        displayForecast(state.lastForecastData);
    }
}

function convertTemp(celsius) {
    if (state.isCelsius) return Math.round(celsius);
    return Math.round((celsius * 9 / 5) + 32);
}

// ============================================
// CITY AUTOCOMPLETE
// ============================================
function handleCityInput() {
    const query = el.cityInput?.value.trim();
    if (!query || query.length < 2) {
        hideSuggestions();
        return;
    }
    clearTimeout(state.debounceTimer);
    state.debounceTimer = setTimeout(() => fetchCitySuggestions(query), 320);
}

async function fetchCitySuggestions(query) {
    if (!el.citySuggestions) return;
    try {
        el.citySuggestions.style.display = 'block';
        el.citySuggestions.innerHTML = '<div class="suggestion-loading">Searching cities...</div>';

        const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${CONFIG.API_KEY}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Geo API error');
        const cities = await res.json();

        if (!cities.length) {
            el.citySuggestions.innerHTML = '<div class="suggestion-no-results">No cities found</div>';
            return;
        }
        displayCitySuggestions(cities);
    } catch {
        hideSuggestions();
    }
}

function displayCitySuggestions(cities) {
    if (!el.citySuggestions) return;
    el.citySuggestions.innerHTML = '';
    el.citySuggestions.style.display = 'block';

    cities.forEach(city => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';

        let locationText = city.state ? `${city.state}, ` : '';
        locationText += getCountryName(city.country);

        item.innerHTML = `
            <svg class="suggestion-icon" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" stroke-width="2"/>
            </svg>
            <span class="suggestion-city">${city.name}</span>
            <span class="suggestion-location">${locationText}</span>
        `;
        item.addEventListener('click', () => {
            if (el.cityInput) el.cityInput.value = city.name;
            hideSuggestions();
            searchWeatherByCoords(city.lat, city.lon, city.name);
        });
        el.citySuggestions.appendChild(item);
    });
}

function hideSuggestions() {
    if (el.citySuggestions) {
        el.citySuggestions.style.display = 'none';
        el.citySuggestions.innerHTML = '';
    }
}

function getCountryName(code) {
    const countries = {
        'US': 'United States', 'GB': 'United Kingdom', 'IN': 'India', 'CA': 'Canada',
        'AU': 'Australia', 'DE': 'Germany', 'FR': 'France', 'IT': 'Italy', 'ES': 'Spain',
        'BR': 'Brazil', 'MX': 'Mexico', 'JP': 'Japan', 'CN': 'China', 'RU': 'Russia',
        'ZA': 'South Africa', 'AR': 'Argentina', 'NL': 'Netherlands', 'BE': 'Belgium',
        'CH': 'Switzerland', 'AT': 'Austria', 'SE': 'Sweden', 'NO': 'Norway',
        'DK': 'Denmark', 'FI': 'Finland', 'PL': 'Poland', 'GR': 'Greece',
        'PT': 'Portugal', 'TR': 'Turkey', 'EG': 'Egypt', 'SA': 'Saudi Arabia',
        'AE': 'UAE', 'KR': 'South Korea', 'TH': 'Thailand', 'SG': 'Singapore',
        'NZ': 'New Zealand', 'IE': 'Ireland', 'PK': 'Pakistan', 'NG': 'Nigeria',
        'BD': 'Bangladesh', 'NP': 'Nepal', 'LK': 'Sri Lanka', 'ID': 'Indonesia'
    };
    return countries[code] || code;
}

// ============================================
// PARALLAX
// ============================================
function initParallax() {
    const layers = document.querySelectorAll('.parallax-layer');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!layers.length || reducedMotion || window.innerWidth < 900) return;

    const updateLayers = () => {
        const scrolled = window.pageYOffset;
        layers.forEach(layer => {
            const speed = parseFloat(layer.dataset.speed);
            layer.style.transform = `translate3d(0, ${-(scrolled * speed)}px, 0)`;
        });
        state.parallaxTicking = false;
    };

    updateLayers();

    window.addEventListener('scroll', () => {
        if (state.parallaxTicking) return;
        state.parallaxTicking = true;
        requestAnimationFrame(updateLayers);
    }, { passive: true });
}

// ============================================
// CANVAS
// ============================================
function initCanvas() {
    if (!el.canvas) return;
    el.canvas.width = window.innerWidth;
    el.canvas.height = window.innerHeight;
    window.addEventListener('resize', () => {
        el.canvas.width = window.innerWidth;
        el.canvas.height = window.innerHeight;
    });
}

// ============================================
// SEARCH WEATHER (by city name)
// ============================================
async function searchWeather() {
    const city = el.cityInput?.value.trim();
    if (!city) { showError('Please enter a city name'); return; }

    showLoading();

    try {
        const [weatherRes, forecastRes] = await Promise.all([
            fetch(`${CONFIG.BASE_URL}/weather?q=${encodeURIComponent(city)}&units=${CONFIG.UNITS}&appid=${CONFIG.API_KEY}`),
            fetch(`${CONFIG.BASE_URL}/forecast?q=${encodeURIComponent(city)}&units=${CONFIG.UNITS}&appid=${CONFIG.API_KEY}`)
        ]);

        if (!weatherRes.ok) throw new Error('City not found');
        if (!forecastRes.ok) throw new Error('Forecast unavailable');

        const weatherData = await weatherRes.json();
        const forecastData = await forecastRes.json();

        handleWeatherData(weatherData, forecastData);
    } catch (error) {
        hideLoading();
        showError(error.message || 'City not found. Please check the spelling and try again.');
    }
}

// ============================================
// SEARCH WEATHER (by coordinates)
// ============================================
async function searchWeatherByCoords(lat, lon, cityName) {
    showLoading();
    try {
        const [weatherRes, forecastRes] = await Promise.all([
            fetch(`${CONFIG.BASE_URL}/weather?lat=${lat}&lon=${lon}&units=${CONFIG.UNITS}&appid=${CONFIG.API_KEY}`),
            fetch(`${CONFIG.BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=${CONFIG.UNITS}&appid=${CONFIG.API_KEY}`)
        ]);

        if (!weatherRes.ok || !forecastRes.ok) throw new Error('Weather data unavailable');

        const weatherData = await weatherRes.json();
        const forecastData = await forecastRes.json();

        handleWeatherData(weatherData, forecastData);
    } catch (error) {
        hideLoading();
        showError(error.message || 'Unable to fetch weather. Please try again.');
    }
}

// ============================================
// CURRENT LOCATION
// ============================================
function getCurrentLocation() {
    if (!navigator.geolocation) { showError('Geolocation not supported by your browser'); return; }

    const origHTML = el.locationBtn?.innerHTML;
    if (el.locationBtn) el.locationBtn.innerHTML = '<span>Locating...</span>';

    navigator.geolocation.getCurrentPosition(
        async (pos) => {
            if (el.cityInput) el.cityInput.value = '';
            await searchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
            if (el.locationBtn && origHTML) el.locationBtn.innerHTML = origHTML;
        },
        () => {
            showError('Location access denied. Please allow location access and try again.');
            if (el.locationBtn && origHTML) el.locationBtn.innerHTML = origHTML;
        }
    );
}

// ============================================
// HANDLE WEATHER DATA (shared pipeline)
// ============================================
function handleWeatherData(weatherData, forecastData) {
    state.lastWeatherData = weatherData;
    state.lastForecastData = forecastData;

    displayWeather(weatherData);
    displayForecast(forecastData);
    updateTheme(weatherData.weather[0].main);
    updateHeroWeatherTrack(weatherData.weather[0].main);
    updateRecommendations(weatherData);
    updateMoodImages(weatherData.weather[0].main);
    startWeatherAnimation(weatherData.weather[0].main);

    hideLoading();
    if (el.weatherContent) el.weatherContent.style.display = 'block';
    if (el.errorMessage) el.errorMessage.style.display = 'none';
}

// ============================================
// LOADING STATES
// ============================================
function showLoading() {
    if (el.weatherContent) el.weatherContent.style.display = 'none';
    if (el.errorMessage) el.errorMessage.style.display = 'none';
    if (el.loadingSkeleton) el.loadingSkeleton.style.display = 'block';
}

function hideLoading() {
    if (el.loadingSkeleton) el.loadingSkeleton.style.display = 'none';
}

// ============================================
// DISPLAY WEATHER
// ============================================
function displayWeather(data) {
    const setEl = (id, val) => {
        const elem = document.getElementById(id);
        if (elem) elem.textContent = val;
    };

    setEl('locationName', `${data.name}, ${data.sys.country}`);
    setEl('tempNumber', convertTemp(data.main.temp));
    setEl('weatherDescription', data.weather[0].description);
    setEl('feelsLikeTemp', convertTemp(data.main.feels_like));
    setEl('tempMax', convertTemp(data.main.temp_max));
    setEl('tempMin', convertTemp(data.main.temp_min));
    setEl('humidityValue', `${data.main.humidity}%`);
    setEl('windValue', `${Math.round(data.wind.speed * 3.6)} km/h`);
    setEl('windDirection', `from ${getWindDirection(data.wind.deg || 0)}`);
    setEl('pressureValue', `${data.main.pressure} hPa`);
    setEl('pressureStatus', getPressureStatus(data.main.pressure));
    setEl('visibilityValue', `${(data.visibility / 1000).toFixed(1)} km`);
    setEl('visibilityStatus', getVisibilityStatus(data.visibility));
    setEl('tempUnit', state.isCelsius ? 'C' : 'F');

    // Weather icon
    const iconEl = document.getElementById('weatherIconLarge');
    if (iconEl) {
        iconEl.src = getWeatherIconUrl(data.weather[0].icon, '4x');
        iconEl.alt = `${data.weather[0].description} icon`;
    }

    // Sunrise / Sunset
    const sunriseDate = new Date(data.sys.sunrise * 1000);
    const sunsetDate = new Date(data.sys.sunset * 1000);
    setEl('sunriseTime', sunriseDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    setEl('sunsetTime', sunsetDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));

    // Animate sun arc
    animateSunArc(data.sys.sunrise, data.sys.sunset);

    // Humidity bar
    const humidityBar = document.getElementById('humidityBar');
    if (humidityBar) {
        setTimeout(() => { humidityBar.style.width = `${data.main.humidity}%`; }, 300);
    }

    // Last updated
    setEl('lastUpdated', `Updated ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`);
}

// ============================================
// SUN ARC ANIMATION
// ============================================
function animateSunArc(sunriseTS, sunsetTS) {
    const now = Date.now() / 1000;
    const total = sunsetTS - sunriseTS;
    const elapsed = now - sunriseTS;
    let progress = Math.max(0, Math.min(1, elapsed / total));

    // Path length for "M 10 90 Q 100 10 190 90" arc â‰ˆ 250
    const pathLen = 250;
    const offset = pathLen - progress * pathLen;

    const progressPath = document.getElementById('sunProgressPath');
    const sunDot = document.getElementById('sunDot');

    if (progressPath) {
        progressPath.style.strokeDashoffset = offset;
    }

    // Move dot along the arc (parametric quadratic BÃ©zier)
    if (sunDot) {
        const t = progress;
        const p0 = { x: 10, y: 90 }, p1 = { x: 100, y: 10 }, p2 = { x: 190, y: 90 };
        const x = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x;
        const y = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y;
        sunDot.setAttribute('cx', x.toFixed(2));
        sunDot.setAttribute('cy', y.toFixed(2));
    }
}

// ============================================
// HELPERS
// ============================================
function getWindDirection(deg) {
    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return dirs[Math.round(deg / 22.5) % 16];
}

function getPressureStatus(hPa) {
    if (hPa < 1000) return 'Low';
    if (hPa > 1025) return 'High';
    return 'Normal';
}

function getVisibilityStatus(visMeters) {
    if (visMeters >= 10000) return 'Excellent';
    if (visMeters >= 5000) return 'Good';
    if (visMeters >= 2000) return 'Moderate';
    if (visMeters >= 1000) return 'Poor';
    return 'Very Poor';
}

// ============================================
// DISPLAY FORECAST
// ============================================
function displayForecast(data) {
    const grid = document.getElementById('forecastGrid');
    if (!grid) return;
    grid.innerHTML = '';

    // Pick one reading per day (every 8th item = 24h apart)
    const daily = data.list.filter((_, i) => i % 8 === 0).slice(0, 5);

    daily.forEach(day => {
        const date = new Date(day.dt * 1000);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

        const card = document.createElement('div');
        card.className = 'forecast-card';
        card.innerHTML = `
            <div class="forecast-day">${dayName}</div>
            <img class="forecast-icon" src="${getWeatherIconUrl(day.weather[0].icon, '2x')}" alt="${day.weather[0].description} icon" />
            <div class="forecast-temp">${convertTemp(day.main.temp)}\u00B0${state.isCelsius ? 'C' : 'F'}</div>
            <div class="forecast-range">
                <span class="forecast-high">\u2191${convertTemp(day.main.temp_max)}\u00B0</span>
                <span class="forecast-low">\u2193${convertTemp(day.main.temp_min)}\u00B0</span>
            </div>
            <div class="forecast-desc">${day.weather[0].description}</div>
        `;
        grid.appendChild(card);
    });
}
// ============================================
// WEATHER ICONS
// ============================================
function getWeatherIconUrl(iconCode, size = '2x') {
    return `https://openweathermap.org/img/wn/${iconCode}@${size}.png`;
}

// ============================================
// UPDATE COLOR THEME â€” ALL GRADIENTS ARE DARK
// This is the core fix: every background is
// dark enough so white text is always readable.
// ============================================
function updateTheme(weather) {
    document.body.classList.remove(
        'weather-rain', 'weather-snow', 'weather-sunny',
        'weather-cloudy', 'weather-thunder', 'weather-mist'
    );

    const themes = {
        'Clear': {
            primary: '#ffb454',
            secondary: '#2c7396',
            accent: '#ffe08a',
            glow: 'rgba(255, 180, 84, 0.28)',
            gradient: 'linear-gradient(135deg, #15263b 0%, #254f6b 52%, #8a5319 100%)',
            heroFallback: 'linear-gradient(135deg, #142338 0%, #25516f 52%, #8a5319 100%)',
            heroOverlayTop: 'rgba(7, 14, 28, 0.22)',
            heroOverlayMid: 'rgba(17, 38, 62, 0.56)',
            heroOverlayBottom: 'rgba(12, 24, 40, 0.96)',
            glassBg: 'rgba(10, 20, 36, 0.56)',
            glassBorder: 'rgba(255, 232, 188, 0.14)',
            imageTint: 'linear-gradient(135deg, rgba(255, 194, 107, 0.2) 0%, rgba(44, 115, 150, 0.18) 100%)',
            bodyClass: 'weather-sunny'
        },
        'Rain': {
            primary: '#5fb6d8',
            secondary: '#2d6f8f',
            accent: '#ffd58a',
            glow: 'rgba(95, 182, 216, 0.24)',
            gradient: 'linear-gradient(135deg, #101b2e 0%, #183754 52%, #2e6178 100%)',
            heroFallback: 'linear-gradient(135deg, #101a2d 0%, #1a3a57 50%, #2e6178 100%)',
            heroOverlayTop: 'rgba(6, 13, 24, 0.28)',
            heroOverlayMid: 'rgba(13, 28, 47, 0.62)',
            heroOverlayBottom: 'rgba(9, 19, 34, 0.97)',
            glassBg: 'rgba(9, 19, 34, 0.6)',
            glassBorder: 'rgba(203, 235, 245, 0.14)',
            imageTint: 'linear-gradient(135deg, rgba(95, 182, 216, 0.2) 0%, rgba(255, 213, 138, 0.14) 100%)',
            bodyClass: 'weather-rain'
        },
        'Drizzle': {
            primary: '#79c4c9',
            secondary: '#3f8090',
            accent: '#ffd58a',
            glow: 'rgba(121, 196, 201, 0.24)',
            gradient: 'linear-gradient(135deg, #122132 0%, #21465b 55%, #3d7180 100%)',
            heroFallback: 'linear-gradient(135deg, #132132 0%, #24475d 52%, #3d7180 100%)',
            heroOverlayTop: 'rgba(7, 14, 24, 0.26)',
            heroOverlayMid: 'rgba(17, 34, 50, 0.6)',
            heroOverlayBottom: 'rgba(10, 22, 35, 0.97)',
            glassBg: 'rgba(10, 22, 35, 0.6)',
            glassBorder: 'rgba(218, 240, 238, 0.14)',
            imageTint: 'linear-gradient(135deg, rgba(121, 196, 201, 0.18) 0%, rgba(255, 213, 138, 0.14) 100%)',
            bodyClass: 'weather-rain'
        },
        'Thunderstorm': {
            primary: '#8693ff',
            secondary: '#39457d',
            accent: '#ffd166',
            glow: 'rgba(134, 147, 255, 0.28)',
            gradient: 'linear-gradient(135deg, #0b1020 0%, #18243b 42%, #39457d 100%)',
            heroFallback: 'linear-gradient(135deg, #0c1120 0%, #1a2640 44%, #39457d 100%)',
            heroOverlayTop: 'rgba(5, 8, 17, 0.3)',
            heroOverlayMid: 'rgba(14, 21, 36, 0.68)',
            heroOverlayBottom: 'rgba(10, 15, 28, 0.98)',
            glassBg: 'rgba(9, 15, 28, 0.64)',
            glassBorder: 'rgba(220, 223, 255, 0.14)',
            imageTint: 'linear-gradient(135deg, rgba(134, 147, 255, 0.18) 0%, rgba(255, 209, 102, 0.12) 100%)',
            bodyClass: 'weather-thunder'
        },
        'Snow': {
            primary: '#98d8e0',
            secondary: '#517f90',
            accent: '#edf7ff',
            glow: 'rgba(152, 216, 224, 0.22)',
            gradient: 'linear-gradient(135deg, #112235 0%, #25455e 54%, #4f7887 100%)',
            heroFallback: 'linear-gradient(135deg, #122337 0%, #274760 52%, #4f7887 100%)',
            heroOverlayTop: 'rgba(10, 18, 31, 0.2)',
            heroOverlayMid: 'rgba(17, 34, 50, 0.56)',
            heroOverlayBottom: 'rgba(10, 22, 35, 0.95)',
            glassBg: 'rgba(11, 24, 38, 0.56)',
            glassBorder: 'rgba(237, 247, 255, 0.16)',
            imageTint: 'linear-gradient(135deg, rgba(152, 216, 224, 0.16) 0%, rgba(237, 247, 255, 0.12) 100%)',
            bodyClass: 'weather-snow'
        },
        'Clouds': {
            primary: '#9fb2c4',
            secondary: '#5f7384',
            accent: '#ffd8a6',
            glow: 'rgba(159, 178, 196, 0.22)',
            gradient: 'linear-gradient(135deg, #16212f 0%, #2a394a 54%, #5a6774 100%)',
            heroFallback: 'linear-gradient(135deg, #16212f 0%, #2c3d4d 52%, #606d7a 100%)',
            heroOverlayTop: 'rgba(9, 15, 24, 0.22)',
            heroOverlayMid: 'rgba(20, 29, 39, 0.6)',
            heroOverlayBottom: 'rgba(11, 18, 28, 0.97)',
            glassBg: 'rgba(11, 19, 30, 0.62)',
            glassBorder: 'rgba(225, 232, 240, 0.14)',
            imageTint: 'linear-gradient(135deg, rgba(159, 178, 196, 0.18) 0%, rgba(255, 216, 166, 0.12) 100%)',
            bodyClass: 'weather-cloudy'
        },
        'Mist': {
            primary: '#9aafbe',
            secondary: '#647988',
            accent: '#ffd8a6',
            glow: 'rgba(154, 175, 190, 0.2)',
            gradient: 'linear-gradient(135deg, #16202c 0%, #243445 54%, #506172 100%)',
            heroFallback: 'linear-gradient(135deg, #16202c 0%, #283748 52%, #556676 100%)',
            heroOverlayTop: 'rgba(9, 15, 23, 0.24)',
            heroOverlayMid: 'rgba(19, 28, 38, 0.62)',
            heroOverlayBottom: 'rgba(11, 18, 27, 0.97)',
            glassBg: 'rgba(11, 19, 30, 0.62)',
            glassBorder: 'rgba(221, 227, 232, 0.14)',
            imageTint: 'linear-gradient(135deg, rgba(154, 175, 190, 0.18) 0%, rgba(255, 216, 166, 0.12) 100%)',
            bodyClass: 'weather-mist'
        },
        'Fog': {
            primary: '#9aafbe',
            secondary: '#647988',
            accent: '#ffd8a6',
            glow: 'rgba(154, 175, 190, 0.2)',
            gradient: 'linear-gradient(135deg, #16202c 0%, #243445 54%, #506172 100%)',
            heroFallback: 'linear-gradient(135deg, #16202c 0%, #283748 52%, #556676 100%)',
            heroOverlayTop: 'rgba(9, 15, 23, 0.24)',
            heroOverlayMid: 'rgba(19, 28, 38, 0.62)',
            heroOverlayBottom: 'rgba(11, 18, 27, 0.97)',
            glassBg: 'rgba(11, 19, 30, 0.62)',
            glassBorder: 'rgba(221, 227, 232, 0.14)',
            imageTint: 'linear-gradient(135deg, rgba(154, 175, 190, 0.18) 0%, rgba(255, 216, 166, 0.12) 100%)',
            bodyClass: 'weather-mist'
        },
        'Haze': {
            primary: '#a0b0bc',
            secondary: '#657787',
            accent: '#ffd39d',
            glow: 'rgba(160, 176, 188, 0.18)',
            gradient: 'linear-gradient(135deg, #17212c 0%, #293848 54%, #566878 100%)',
            heroFallback: 'linear-gradient(135deg, #17212c 0%, #2c3b49 52%, #5b6d7c 100%)',
            heroOverlayTop: 'rgba(10, 16, 24, 0.24)',
            heroOverlayMid: 'rgba(20, 29, 39, 0.62)',
            heroOverlayBottom: 'rgba(11, 18, 27, 0.97)',
            glassBg: 'rgba(11, 19, 30, 0.62)',
            glassBorder: 'rgba(224, 228, 231, 0.14)',
            imageTint: 'linear-gradient(135deg, rgba(160, 176, 188, 0.18) 0%, rgba(255, 211, 157, 0.12) 100%)',
            bodyClass: 'weather-mist'
        }
    };

    const theme = themes[weather] || themes['Clear'];

    document.documentElement.style.setProperty('--primary', theme.primary);
    document.documentElement.style.setProperty('--secondary', theme.secondary);
    document.documentElement.style.setProperty('--accent', theme.accent);
    document.documentElement.style.setProperty('--glow', theme.glow);
    document.documentElement.style.setProperty('--page-gradient', theme.gradient);
    document.documentElement.style.setProperty('--button-gradient', `linear-gradient(135deg, ${theme.accent} 0%, ${theme.primary} 56%, ${theme.secondary} 100%)`);
    document.documentElement.style.setProperty('--glass-bg', theme.glassBg);
    document.documentElement.style.setProperty('--glass-border', theme.glassBorder);
    document.documentElement.style.setProperty('--hero-fallback', theme.heroFallback);
    document.documentElement.style.setProperty('--hero-overlay-top', theme.heroOverlayTop);
    document.documentElement.style.setProperty('--hero-overlay-mid', theme.heroOverlayMid);
    document.documentElement.style.setProperty('--hero-overlay-bottom', theme.heroOverlayBottom);
    document.documentElement.style.setProperty('--image-tint', theme.imageTint);

    document.body.classList.add(theme.bodyClass);
}
// ============================================
// RECOMMENDATIONS ” OUTFIT & ACTIVITY
// Uses lighter static imagery and short tags for a cleaner UI
// ============================================
function updateRecommendations(data) {
    const weather = data.weather[0].main.toLowerCase();
    const temp = data.main.temp;

    const outfit = getOutfitRecommendation(weather, temp);
    const activity = getActivityRecommendation(weather, temp);

    const setRec = (mediaId, textId, tagId, stampId, recData) => {
        const mediaEl = document.getElementById(mediaId);
        const textEl = document.getElementById(textId);
        const tagEl = document.getElementById(tagId);
        const stampEl = document.getElementById(stampId);

        if (mediaEl) {
            mediaEl.src = recData.media;
            mediaEl.alt = recData.alt;
        }
        if (textEl) textEl.textContent = recData.text;
        if (tagEl) tagEl.textContent = recData.tag;
        if (stampEl) stampEl.textContent = recData.stamp;
    };

    setRec('outfitGif', 'outfitText', 'outfitEmoji', 'outfitStamp', outfit);
    setRec('activityGif', 'activityText', 'activityEmoji', 'activityStamp', activity);
}
function getOutfitRecommendation(weather, temp) {
    const recs = {
        'clear': temp > 30 ? {
            text: 'This is not weather, this is tandoor rehearsal. Wear the lightest thing you own or you will reach looking like melted kulfi.',
            tag: 'Kulfi alert',
            stamp: 'Heatwave fit',
            alt: 'Humorous Indian summer outfit idea',
            media: 'assets/clear side 1.gif'
        } : temp > 20 ? {
            text: 'Peak main-character weather. Tee, jeans, sunglasses, and the confidence of someone who got window seat in the metro.',
            tag: 'Hero entry',
            stamp: 'Metro ready',
            alt: 'Indian street style for pleasant sunny weather',
            media: 'assets/summeroutfit.gif'
        } : {
            text: 'Looks sunny but feels like Bangalore trust issues. Keep a light jacket before the evening breeze starts acting smart.',
            tag: 'Bangalore mode',
            stamp: 'Layer backup',
            alt: 'Light jacket look for cool clear weather in India',
            media: 'https://loremflickr.com/1200/800/india,hoodie,street?lock=103'
        },
        'rain': {
            text: 'Full pakoda protocol. Umbrella, waterproof shoes, and emotional readiness for one rogue auto splash.',
            tag: 'Pakoda mode',
            stamp: 'Splash alert',
            alt: 'Rainy day outfit with umbrella for Indian monsoon',
            media: 'assets/rainyoutfit.gif'
        },
        'drizzle': {
            text: 'Not proper rain, just the sky sending tiny WhatsApp voice notes. Light jacket and shoes that forgive puddles.',
            tag: 'Voice note rain',
            stamp: 'Puddle safe',
            alt: 'Drizzle-friendly streetwear for an Indian city',
            media: 'assets/rainyoutfit.gif'
        },
        'thunderstorm': {
            text: 'This is every Indian mom\'s "andar aao beta" forecast. Stay home if you can and keep the dramatic hero walk cancelled.',
            tag: 'Maa approved',
            stamp: 'Stay inside',
            alt: 'Storm-ready outfit mood for dramatic Indian weather',
            media: 'assets/rainyoutfit.gif'
        },
        'snow': {
            text: 'Shimla honeymoon montage energy. Layer like the group trip finally happened and your suitcase had a plan.',
            tag: 'Shimla scene',
            stamp: 'Mountain layers',
            alt: 'Layered winter outfit for snow in the Indian hills',
            media: 'assets/winteroutfit3.gif'
        },
        'clouds': temp > 30 ? {
            text: 'This is not weather, this is tandoor rehearsal. Wear the lightest thing you own or you will reach looking like melted kulfi.',
            tag: 'Kulfi alert',
            stamp: 'Heatwave fit',
            alt: 'Humorous Indian summer outfit idea',
            media: 'assets/extrahotsummer.gif'
        } : temp > 20 ? {
            text: 'Peak main-character weather. Tee, jeans, sunglasses, and the confidence of someone who got window seat in the metro.',
            tag: 'Hero entry',
            stamp: 'Metro ready',
            alt: 'Indian street style for pleasant sunny weather',
            media: 'assets/summeroutfit.gif'
        } : {
            text: 'Looks sunny but feels like Bangalore trust issues. Keep a light jacket before the evening breeze starts acting smart.',
            tag: 'Bangalore mode',
            stamp: 'Layer backup',
            alt: 'Light jacket look for cool clear weather in India',
            media: 'https://loremflickr.com/1200/800/india,hoodie,street?lock=103'
        },
        'mist': {
            text: 'Visibility low, vibes high. Light jacket, comfy shoes, and zero faith in Google Maps shortcuts.',
            tag: 'Low-vis chic',
            stamp: 'Mystery fit',
            alt: 'Misty morning outfit inspiration for India',
            media: 'assets/summeroutfit.gif'
        },
        'fog': {
            text: 'Fog outside, confusion inside. Keep the layers easy and the outfit practical because this weather loves surprise plot twists.',
            tag: 'Plot twist',
            stamp: 'Horn OK please',
            alt: 'Foggy day practical outfit for Indian conditions',
            media: 'assets/summeroutfit.gif'
        },
        'haze': {
            text: 'AQI entering villain arc. Keep it breathable, keep it simple, and maybe skip the all-black fashion statement today.',
            tag: 'AQI alert',
            stamp: 'Easy layers',
            alt: 'Simple breathable outfit for hazy Indian weather',
            media: 'assets/summeroutfit.gif'
        }
    };
    return recs[weather] || recs['clear'];
}
function getActivityRecommendation(weather, temp) {
    const recs = {
        'clear': temp > 30 ? {
            text: 'Best plan: AC, nimbu pani, and pretending 2 PM does not exist. Evening chai run is the only brave move.',
            tag: 'Survival plan',
            stamp: 'Shade only',
            alt: 'Funny Indian summer activity suggestion',
            media: 'https://loremflickr.com/1200/800/india,summer,drink?lock=201'
        } : temp > 20 ? {
            text: 'Cricket in the colony, chai tapri gossip, sunset drive, or that one friend forcing a reel on everybody.',
            tag: 'Colony cricket',
            stamp: 'Tapri approved',
            alt: 'Sunny day activity idea for an Indian audience',
            media: 'https://loremflickr.com/1200/800/india,cricket,park?lock=202'
        } : {
            text: 'Ideal for cafe hopping, long gossip walks, and acting like your weekend is extremely sorted.',
            tag: 'Cafe run',
            stamp: 'Weekend energy',
            alt: 'Pleasant weather cafe and street plan in India',
            media: 'https://loremflickr.com/1200/800/india,cafe,street?lock=203'
        },
        'rain': {
            text: 'Certified chai-pakoda weather. Add old Bollywood songs and suddenly everybody becomes a philosopher near the window.',
            tag: 'Chai break',
            stamp: 'Window seat',
            alt: 'Monsoon chai and pakoda mood for India',
            media: 'https://loremflickr.com/1200/800/india,chai,pakora?lock=204'
        },
        'drizzle': {
            text: 'Short walk if you are feeling filmi, nearest cafe if you are being practical.',
            tag: 'Filmy option',
            stamp: 'Reel weather',
            alt: 'Drizzle day cafe option for an Indian city',
            media: 'https://loremflickr.com/1200/800/india,drizzle,cafe?lock=205'
        },
        'thunderstorm': {
            text: 'Stay indoors, order snacks, and let the family WhatsApp group send weather warnings like breaking news.',
            tag: 'Snack shelter',
            stamp: 'Family alert',
            alt: 'Indoor rainy day idea with snacks for an Indian audience',
            media: 'https://loremflickr.com/1200/800/india,home,snacks?lock=206'
        },
        'snow': {
            text: 'Take photos for five minutes, complain about fingers for ten, then go find the nearest chai.',
            tag: 'Snow then chai',
            stamp: 'Tea first',
            alt: 'Snow day activity suggestion with chai in India',
            media: 'https://loremflickr.com/1200/800/india,snow,tea?lock=207'
        },
        'clouds': {
            text: 'Perfect day for a drive, samosa stop, and a playlist that behaves like your life is a movie.',
            tag: 'Samosa drive',
            stamp: 'Playlist ready',
            alt: 'Cloudy day road trip suggestion with Indian snack stop',
            media: 'https://loremflickr.com/1200/800/india,roadtrip,samosa?lock=208'
        },
        'mist': {
            text: 'Slow morning, hoodie weather, and enough fog for everybody to suddenly speak softly like it is an indie film.',
            tag: 'Indie morning',
            stamp: 'Soft launch',
            alt: 'Misty morning tea plan with Indian vibe',
            media: 'https://loremflickr.com/1200/800/india,mist,tea?lock=209'
        },
        'fog': {
            text: 'Local plans only. Delhi fog does not care about your punctuality, your route, or your optimism.',
            tag: 'Fog rules',
            stamp: 'Route doubtful',
            alt: 'Foggy day local plans for Indian weather',
            media: 'https://loremflickr.com/1200/800/india,fog,traffic?lock=210'
        },
        'haze': {
            text: 'Indoor tasks, light stretches, and one strong cup of chai while the outside world sorts itself out.',
            tag: 'Indoor reset',
            stamp: 'Stay cozy',
            alt: 'Indoor plan for hazy weather in India',
            media: 'https://loremflickr.com/1200/800/india,indoor,tea?lock=211'
        }
    };
    return recs[weather] || recs['clear'];
}
// ============================================
// MOOD / GALLERY IMAGES
// ============================================
function updateMoodImages(weather) {
    const images = {
        'Clear': {
            main: 'assets/clear main.jpg',
            side1: 'assets/clearsky1.jpg',
            side2: 'assets/clearsky3.jpg',
            caption: 'Dhoop full power, confidence even higher',
            chipMain: 'Dhoop level max',
            chip1: 'Chai optional',
            chip2: 'Cricket possible',
            altMain: 'Sunny Indian street weather mood',
            alt1: 'Chai mood for sunny weather',
            alt2: 'Cricket mood for sunny weather'
        },
        'Rain': {
            main: 'assets/rainysky1.jpg',
            side1: 'assets/rainysky2.jpg',
            side2: 'assets/rainysky3.jpg',
            caption: 'Mumbai rain logic: chaos outside, cinema inside',
            chipMain: 'Monsoon cinema',
            chip1: 'Tapri activated',
            chip2: 'Auto splash risk',
            altMain: 'Indian monsoon street mood',
            alt1: 'Chai stall during rainy weather',
            alt2: 'Auto rickshaw rain moment in India'
        },
        'Drizzle': {
            main: 'https://loremflickr.com/1200/800/india,drizzle,street?lock=307',
            side1: 'https://loremflickr.com/600/600/india,umbrella,street?lock=308',
            side2: 'https://loremflickr.com/600/600/india,cafe,window?lock=309',
            caption: 'Just enough rain to ruin hair, not enough to cancel plans',
            chipMain: 'Hair at risk',
            chip1: 'Umbrella maybe',
            chip2: 'Cafe safer',
            altMain: 'Drizzle weather in an Indian street',
            alt1: 'Umbrella moment during drizzle',
            alt2: 'Cafe window mood during drizzle'
        },
        'Thunderstorm': {
            main: 'https://loremflickr.com/1200/800/india,storm,sky?lock=310',
            side1: 'https://loremflickr.com/600/600/india,lightning,clouds?lock=311',
            side2: 'https://loremflickr.com/600/600/india,rain,traffic?lock=312',
            caption: 'Sky doing full Bollywood climax lighting',
            chipMain: 'Bollywood climax',
            chip1: 'Lightning cameo',
            chip2: 'Patience required',
            altMain: 'Dramatic storm sky mood',
            alt1: 'Storm clouds with lightning',
            alt2: 'Rain traffic during thunderstorm'
        },
        'Snow': {
            main: 'https://loremflickr.com/1200/800/shimla,snow,india?lock=313',
            side1: 'https://loremflickr.com/600/600/manali,street,snow?lock=314',
            side2: 'https://loremflickr.com/600/600/india,mountains,tea?lock=315',
            caption: 'Shimla postcard until someone says hands are freezing',
            chipMain: 'Shimla postcard',
            chip1: 'Layer count up',
            chip2: 'Tea compulsory',
            altMain: 'Snowy weather scene from the Indian hills',
            alt1: 'Snow-covered mountain street',
            alt2: 'Tea with winter mountain mood'
        },
        'Clouds': {
            main: 'assets/cloudysky1.jpg',
            side1: 'assets/cloudysky2.jpg',
            side2: 'assets/cloudysky3.jpg',
            caption: 'Overcast sky, overdressed people, excellent selfie chances',
            chipMain: 'Selfie weather',
            chip1: 'Terrace approved',
            chip2: 'Samosa pairing',
            altMain: 'Cloudy Indian city mood',
            alt1: 'Terrace sky moment on a cloudy day',
            alt2: 'Samosa and tea weather pairing'
        },
        'Mist': {
            main: 'https://loremflickr.com/1200/800/india,mist,road?lock=319',
            side1: 'https://loremflickr.com/600/600/india,fog,tea?lock=320',
            side2: 'https://loremflickr.com/600/600/india,hoodie,morning?lock=321',
            caption: 'Half the view missing, full mystery unlocked',
            chipMain: 'Mystery unlocked',
            chip1: 'Chai recommended',
            chip2: 'Hoodie weather',
            altMain: 'Misty road mood in India',
            alt1: 'Tea in misty weather',
            alt2: 'Hoodie morning in mist'
        },
        'Fog': {
            main: 'https://loremflickr.com/1200/800/delhi,fog,road?lock=322',
            side1: 'https://loremflickr.com/600/600/india,fog,traffic?lock=323',
            side2: 'https://loremflickr.com/600/600/india,tea,glass?lock=324',
            caption: 'Road visible by faith and hazard lights only',
            chipMain: 'Visibility by faith',
            chip1: 'Horn OK please',
            chip2: 'Tea helps',
            altMain: 'Foggy road scene in Delhi',
            alt1: 'Traffic in dense fog',
            alt2: 'Hot tea during foggy weather'
        },
        'Haze': {
            main: 'assets/cloudysky3.jpg',
            side1: 'assets/cloudysky2.jpg',
            side2: 'assets/cloudysky1.jpg',
            caption: 'Outside looks muted, inside needs chai',
            chipMain: 'Indoor energy',
            chip1: 'Mask maybe',
            chip2: 'Chai reset',
            altMain: 'Hazy city weather scene in India',
            alt1: 'Street scene with haze',
            alt2: 'Indoor chai mood during haze'
        }
    };

    const mood = images[weather] || images['Clear'];
    const setImg = (id, src, alt) => {
        const element = document.getElementById(id);
        if (element) {
            element.src = src;
            element.alt = alt;
        }
    };
    const setText = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    };

    setImg('moodImageMain', mood.main, mood.altMain);
    setImg('moodImage1', mood.side1, mood.alt1);
    setImg('moodImage2', mood.side2, mood.alt2);
    setText('moodCaption', mood.caption);
    setText('moodChipMain', mood.chipMain);
    setText('moodChip1', mood.chip1);
    setText('moodChip2', mood.chip2);
}
// ============================================
// CANVAS WEATHER ANIMATIONS
// ============================================
function startWeatherAnimation(weather) {
    if (state.animationFrame) {
        cancelAnimationFrame(state.animationFrame);
        state.animationFrame = null;
    }

    if (!el.canvas) return;

    const ctx = el.canvas.getContext('2d');
    ctx.clearRect(0, 0, el.canvas.width, el.canvas.height);
    state.particles = [];

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || window.innerWidth < 1100) return;

    const w = weather.toLowerCase();
    if (w.includes('rain') || w === 'drizzle') animateRain(ctx, el.canvas, w === 'drizzle' ? 55 : 90);
    else if (w.includes('snow')) animateSnow(ctx, el.canvas);
    else if (w.includes('thunder')) animateThunderstorm(ctx, el.canvas);
    else if (w === 'clear') animateSunParticles(ctx, el.canvas);
    // Clouds/mist/fog use CSS-only effects
}

function animateRain(ctx, canvas, count = 90) {
    for (let i = 0; i < count; i++) {
        state.particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            len: Math.random() * 18 + 8,
            speed: Math.random() * 5 + 4,
            opacity: Math.random() * 0.4 + 0.2
        });
    }
    const draw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        state.particles.forEach(d => {
            ctx.strokeStyle = `rgba(174, 210, 240, ${d.opacity})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(d.x, d.y);
            ctx.lineTo(d.x - 1, d.y + d.len);
            ctx.stroke();
            d.y += d.speed;
            if (d.y > canvas.height) { d.y = -d.len; d.x = Math.random() * canvas.width; }
        });
        state.animationFrame = requestAnimationFrame(draw);
    };
    draw();
}

function animateSnow(ctx, canvas) {
    for (let i = 0; i < 70; i++) {
        state.particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 3 + 1,
            speed: Math.random() * 0.8 + 0.3,
            drift: Math.random() * 0.4 - 0.2,
            opacity: Math.random() * 0.6 + 0.35
        });
    }
    const draw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        state.particles.forEach(f => {
            ctx.fillStyle = `rgba(255, 255, 255, ${f.opacity})`;
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
            ctx.fill();
            f.y += f.speed;
            f.x += f.drift;
            if (f.y > canvas.height) { f.y = -f.r; f.x = Math.random() * canvas.width; }
            if (f.x > canvas.width) f.x = 0;
            else if (f.x < 0) f.x = canvas.width;
        });
        state.animationFrame = requestAnimationFrame(draw);
    };
    draw();
}

function animateThunderstorm(ctx, canvas) {
    for (let i = 0; i < 120; i++) {
        state.particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            len: Math.random() * 28 + 14,
            speed: Math.random() * 9 + 6,
            opacity: Math.random() * 0.55 + 0.35
        });
    }
    let lightningTimer = 0, showLightning = false;
    const draw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (showLightning) {
            ctx.fillStyle = 'rgba(200, 180, 255, 0.2)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        state.particles.forEach(d => {
            ctx.strokeStyle = `rgba(140, 180, 220, ${d.opacity})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(d.x, d.y);
            ctx.lineTo(d.x - 2, d.y + d.len);
            ctx.stroke();
            d.y += d.speed;
            if (d.y > canvas.height) { d.y = -d.len; d.x = Math.random() * canvas.width; }
        });
        lightningTimer++;
        if (lightningTimer > 100 && Math.random() < 0.025) {
            showLightning = true;
            setTimeout(() => { showLightning = false; }, 80);
            lightningTimer = 0;
        }
        state.animationFrame = requestAnimationFrame(draw);
    };
    draw();
}

function animateSunParticles(ctx, canvas) {
    // Gentle golden dust particles rising upward
    for (let i = 0; i < 30; i++) {
        state.particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 2 + 0.5,
            speed: Math.random() * 0.5 + 0.2,
            opacity: Math.random() * 0.25 + 0.05,
            drift: Math.random() * 0.3 - 0.15
        });
    }
    const draw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        state.particles.forEach(p => {
            ctx.fillStyle = `rgba(255, 210, 80, ${p.opacity})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
            p.y -= p.speed;
            p.x += p.drift;
            if (p.y < -5) { p.y = canvas.height + 5; p.x = Math.random() * canvas.width; }
        });
        state.animationFrame = requestAnimationFrame(draw);
    };
    draw();
}

// ============================================
// ERROR HANDLING
// ============================================
function showError(message) {
    hideLoading();
    if (el.weatherContent) el.weatherContent.style.display = 'none';
    if (el.errorMessage) el.errorMessage.style.display = 'block';
    const errText = document.getElementById('errorText');
    if (errText) errText.textContent = message;
}

console.log('SkySense v2.0 loaded.');




