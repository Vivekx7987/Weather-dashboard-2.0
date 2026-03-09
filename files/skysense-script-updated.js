// ============================================
// SKYSENSE - FIXED & IMPROVED
// All features working: rain, snow, animations, etc.
// ============================================

// API Configuration
const CONFIG = {
    API_KEY: 'ec7f7e74a503db4ea94082ccae646b40',
    BASE_URL: 'https://api.openweathermap.org/data/2.5',
    UNITS: 'metric'
};

// DOM Elements
const elements = {
    splash: document.getElementById('splash'),
    hero: document.getElementById('hero'),
    heroBtn: document.getElementById('heroBtn'),
    skipHero: document.getElementById('skipHero'),
    app: document.getElementById('app'),
    floatingHome: document.getElementById('floatingHome'),
    locationBtn: document.getElementById('locationBtn'),
    themeBtn: document.getElementById('themeBtn'),
    cityInput: document.getElementById('cityInput'),
    searchBtn: document.getElementById('searchBtn'),
    weatherContent: document.getElementById('weatherContent'),
    errorMessage: document.getElementById('errorMessage'),
    time: document.getElementById('time'),
    date: document.getElementById('date'),
    canvas: document.getElementById('weatherCanvas'),
    cursorDot: document.querySelector('.cursor-dot'),
    cursorRing: document.querySelector('.cursor-ring') , 
    citySuggestions: document.getElementById('citySuggestions')
};


// Global variables for animations
let animationFrame;
let particles = [];

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌤️ SkySense initializing...');
    
    // Make sure hero is visible initially
    if (elements.hero) {
        elements.hero.style.display = 'flex';
        elements.hero.style.opacity = '1';
    }
    
    // Make sure app is hidden initially
    if (elements.app) {
        elements.app.style.opacity = '0';
        elements.app.style.transform = 'translateY(50px)';
    }
    
    initSplash();
    initCursor();
    initTime();
    initEventListeners();
    initCanvas();
    initParallax();
    
    console.log('✅ SkySense ready!');
    console.log('💡 Splash will auto-hide in 2.5s, then click "Explore Weather" or "Skip" button');
    
    // QUICK TEST: Uncomment the line below to skip directly to app (for debugging)
    // setTimeout(() => { hideHero(); }, 100);
});

// ============================================
// SPLASH SCREEN
// ============================================
function initSplash() {
    setTimeout(() => {
        console.log('⏱️ Hiding splash screen...');
        elements.splash.classList.add('hidden');
        
        // Remove splash from DOM after transition
        setTimeout(() => {
            if (elements.splash) {
                elements.splash.style.display = 'none';
                console.log('✅ Splash hidden! Hero video should now be visible.');
                console.log('👆 Click "Explore Weather" button to continue');
            }
        }, 600);
    }, 2500);
}

// ============================================
// PREMIUM CUSTOM CURSOR
// ============================================
let mouse = { x: 0, y: 0 };
let cursor = { dot: { x: 0, y: 0 }, ring: { x: 0, y: 0 } };

function initCursor() {
    document.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });
    
    animateCursor();
    
    // Hover effects on interactive elements
    setTimeout(() => {
        const interactiveElements = document.querySelectorAll('button, a, input, .rec-card, .mood-main, .mood-small, .stat-card, .forecast-card');
        interactiveElements.forEach(el => {
            el.addEventListener('mouseenter', () => {
                elements.cursorDot?.classList.add('hover');
                elements.cursorRing?.classList.add('hover');
            });
            el.addEventListener('mouseleave', () => {
                elements.cursorDot?.classList.remove('hover');
                elements.cursorRing?.classList.remove('hover');
            });
        });
    }, 500);
}

function animateCursor() {
    if (!elements.cursorDot || !elements.cursorRing) return;
    
    cursor.dot.x += (mouse.x - cursor.dot.x) * 0.3;
    cursor.dot.y += (mouse.y - cursor.dot.y) * 0.3;
    cursor.ring.x += (mouse.x - cursor.ring.x) * 0.15;
    cursor.ring.y += (mouse.y - cursor.ring.y) * 0.15;
    
    elements.cursorDot.style.transform = `translate(${cursor.dot.x}px, ${cursor.dot.y}px)`;
    elements.cursorRing.style.transform = `translate(${cursor.ring.x}px, ${cursor.ring.y}px)`;
    
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
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const options = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
    
    if (elements.time) elements.time.textContent = `${hours}:${minutes}`;
    if (elements.date) elements.date.textContent = now.toLocaleDateString('en-US', options);
}

// ============================================
// EVENT LISTENERS
// ============================================
function initEventListeners() {
    elements.heroBtn?.addEventListener('click', hideHero);
    elements.skipHero?.addEventListener('click', hideHero);
    elements.floatingHome?.addEventListener('click', scrollToTop);
    elements.searchBtn?.addEventListener('click', searchWeather);
    elements.cityInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchWeather();
    });
    elements.locationBtn?.addEventListener('click', getCurrentLocation);
    elements.themeBtn?.addEventListener('click', toggleTheme);
        elements.cityInput?.addEventListener('input', handleCityInput);
    elements.cityInput?.addEventListener('focus', handleCityInput);
    
    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-box')) {
            hideSuggestions();
        }
    });
    // ============================================
// CITY AUTOCOMPLETE WITH STATE & COUNTRY
// ============================================
let debounceTimer;

function handleCityInput(e) {
    const query = elements.cityInput?.value.trim();
    
    if (query.length < 2) {
        hideSuggestions();
        return;
    }
    
    // Debounce API calls (wait 300ms after user stops typing)
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        fetchCitySuggestions(query);
    }, 300);
}

async function fetchCitySuggestions(query) {
    if (!elements.citySuggestions) return;
    
    try {
        // Show loading state
        elements.citySuggestions.style.display = 'block';
        elements.citySuggestions.innerHTML = '<div class="suggestion-loading">Searching cities...</div>';
        
        // Use OpenWeather Geocoding API
        const url = `http://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${CONFIG.API_KEY}`;
        const response = await fetch(url);
        
        if (!response.ok) throw new Error('Failed to fetch cities');
        
        const cities = await response.json();
        
        if (cities.length === 0) {
            elements.citySuggestions.innerHTML = '<div class="suggestion-no-results">No cities found</div>';
            return;
        }
        
        // Display suggestions
        displayCitySuggestions(cities);
        
    } catch (error) {
        console.error('Error fetching city suggestions:', error);
        hideSuggestions();
    }
}

function displayCitySuggestions(cities) {
    if (!elements.citySuggestions) return;
    
    elements.citySuggestions.innerHTML = '';
    elements.citySuggestions.style.display = 'block';
    
    cities.forEach(city => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        
        // Build location string (City, State, Country) - INLINE
        let locationText = '';
        if (city.state) locationText = `${city.state}, `;
        locationText += getCountryName(city.country);
        
        item.innerHTML = `
            <svg class="suggestion-icon" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" 
                      stroke="currentColor" stroke-width="2"/>
                <circle cx="12" cy="9" r="2.5" fill="currentColor"/>
            </svg>
            <span class="suggestion-city">${city.name}</span>
            <span class="suggestion-location">${locationText}</span>
        `;
        
        // Click handler
        item.addEventListener('click', () => {
            selectCity(city);
        });
        
        elements.citySuggestions.appendChild(item);
    });
}

function selectCity(city) {
    // Set input value to city name
    if (elements.cityInput) {
        elements.cityInput.value = city.name;
    }
    
    // Hide suggestions
    hideSuggestions();
    
    // Automatically search for this city
    searchWeatherByCoordinates(city.lat, city.lon, city.name);
}

async function searchWeatherByCoordinates(lat, lon, cityName) {
    console.log(`🔍 Searching weather for: ${cityName}`);
    
    try {
        // Fetch weather data using coordinates for accuracy
        const weatherUrl = `${CONFIG.BASE_URL}/weather?lat=${lat}&lon=${lon}&units=${CONFIG.UNITS}&appid=${CONFIG.API_KEY}`;
        const forecastUrl = `${CONFIG.BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=${CONFIG.UNITS}&appid=${CONFIG.API_KEY}`;
        
        const [weatherResponse, forecastResponse] = await Promise.all([
            fetch(weatherUrl),
            fetch(forecastUrl)
        ]);
        
        if (!weatherResponse.ok || !forecastResponse.ok) {
            throw new Error('Failed to fetch weather data');
        }
        
        const weatherData = await weatherResponse.json();
        const forecastData = await forecastResponse.json();
        
        console.log('✅ Weather data received:', weatherData);
        
        displayWeather(weatherData);
        displayForecast(forecastData);
        updateTheme(weatherData.weather[0].main);
        updateRecommendations(weatherData);
        updateMoodImages(weatherData.weather[0].main);
        startWeatherAnimation(weatherData.weather[0].main);
        
        if (elements.weatherContent) elements.weatherContent.style.display = 'block';
        if (elements.errorMessage) elements.errorMessage.style.display = 'none';
        
    } catch (error) {
        console.error('❌ Error fetching weather:', error);
        showError('Unable to fetch weather. Please try again.');
    }
}

function hideSuggestions() {
    if (elements.citySuggestions) {
        elements.citySuggestions.style.display = 'none';
        elements.citySuggestions.innerHTML = '';
    }
}

// Helper function to get full country name from country code
function getCountryName(code) {
    const countries = {
        'US': 'United States', 'GB': 'United Kingdom', 'IN': 'India', 'CA': 'Canada',
        'AU': 'Australia', 'DE': 'Germany', 'FR': 'France', 'IT': 'Italy', 'ES': 'Spain',
        'BR': 'Brazil', 'MX': 'Mexico', 'JP': 'Japan', 'CN': 'China', 'RU': 'Russia',
        'ZA': 'South Africa', 'AR': 'Argentina', 'CL': 'Chile', 'CO': 'Colombia',
        'PE': 'Peru', 'VE': 'Venezuela', 'NL': 'Netherlands', 'BE': 'Belgium',
        'CH': 'Switzerland', 'AT': 'Austria', 'SE': 'Sweden', 'NO': 'Norway',
        'DK': 'Denmark', 'FI': 'Finland', 'PL': 'Poland', 'CZ': 'Czech Republic',
        'GR': 'Greece', 'PT': 'Portugal', 'TR': 'Turkey', 'EG': 'Egypt',
        'SA': 'Saudi Arabia', 'AE': 'UAE', 'IL': 'Israel', 'KR': 'South Korea',
        'TH': 'Thailand', 'VN': 'Vietnam', 'MY': 'Malaysia', 'SG': 'Singapore',
        'PH': 'Philippines', 'ID': 'Indonesia', 'NZ': 'New Zealand', 'IE': 'Ireland',
        'PK': 'Pakistan', 'BD': 'Bangladesh', 'LK': 'Sri Lanka', 'NP': 'Nepal'
    };
    
    return countries[code] || code;
}
}

function hideHero() {
    console.log('Hiding hero section...');
    if (!elements.hero || !elements.app) {
        console.error('Hero or App element not found!');
        return;
    }
    
    elements.hero.classList.add('hidden');
    
    setTimeout(() => {
        elements.hero.style.display = 'none';
        elements.app.classList.add('visible');
        elements.app.style.opacity = '1';
        elements.app.style.transform = 'translateY(0)';
        console.log('✅ Hero hidden, app now visible');
    }, 800);
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================
// THEME TOGGLE
// ============================================
let isDarkMode = false;

function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('night-mode');
    
    const sunIcon = elements.themeBtn?.querySelector('.sun-icon');
    const moonIcon = elements.themeBtn?.querySelector('.moon-icon');
    const label = elements.themeBtn?.querySelector('.btn-label');
    
    if (isDarkMode) {
        if (sunIcon) sunIcon.style.display = 'none';
        if (moonIcon) moonIcon.style.display = 'block';
        if (label) label.textContent = 'Light Mode';
    } else {
        if (sunIcon) sunIcon.style.display = 'block';
        if (moonIcon) moonIcon.style.display = 'none';
        if (label) label.textContent = 'Dark Mode';
    }
}

// ============================================
// PARALLAX EFFECT
// ============================================
function initParallax() {
    const layers = document.querySelectorAll('.parallax-layer');
    
    if (layers.length === 0) return;
    
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        
        layers.forEach(layer => {
            const speed = parseFloat(layer.dataset.speed);
            const yPos = -(scrolled * speed);
            layer.style.transform = `translateY(${yPos}px)`;
        });
    });
}

// ============================================
// CANVAS INITIALIZATION
// ============================================
function initCanvas() {
    if (!elements.canvas) {
        console.warn('Canvas element not found');
        return;
    }
    
    const canvas = elements.canvas;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
    
    console.log('✅ Canvas initialized:', canvas.width, 'x', canvas.height);
}

// ============================================
// SEARCH WEATHER
// ============================================
async function searchWeather() {
    const city = elements.cityInput?.value.trim();
    
    if (!city) {
        showError('Please enter a city name');
        return;
    }
    
    console.log('🔍 Searching weather for:', city);
    
    try {
        const weatherData = await fetchWeather(city);
        const forecastData = await fetchForecast(city);
        
        console.log('✅ Weather data received:', weatherData);
        
        displayWeather(weatherData);
        displayForecast(forecastData);
        updateTheme(weatherData.weather[0].main);
        updateRecommendations(weatherData);
        updateMoodImages(weatherData.weather[0].main);
        startWeatherAnimation(weatherData.weather[0].main);
        
        if (elements.weatherContent) elements.weatherContent.style.display = 'block';
        if (elements.errorMessage) elements.errorMessage.style.display = 'none';
        
    } catch (error) {
        console.error('❌ Error fetching weather:', error);
        showError('City not found. Please try again.');
    }
}

// ============================================
// FETCH WEATHER DATA
// ============================================
async function fetchWeather(city) {
    const url = `${CONFIG.BASE_URL}/weather?q=${city}&units=${CONFIG.UNITS}&appid=${CONFIG.API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) throw new Error('City not found');
    
    return await response.json();
}

async function fetchForecast(city) {
    const url = `${CONFIG.BASE_URL}/forecast?q=${city}&units=${CONFIG.UNITS}&appid=${CONFIG.API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) throw new Error('Forecast not available');
    
    return await response.json();
}

// ============================================
// CURRENT LOCATION
// ============================================
function getCurrentLocation() {
    if (!navigator.geolocation) {
        showError('Geolocation not supported');
        return;
    }
    
    if (elements.locationBtn) {
        elements.locationBtn.innerHTML = '<span>Loading...</span>';
    }
    
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            try {
                const { latitude, longitude } = position.coords;
                const url = `${CONFIG.BASE_URL}/weather?lat=${latitude}&lon=${longitude}&units=${CONFIG.UNITS}&appid=${CONFIG.API_KEY}`;
                const response = await fetch(url);
                const weatherData = await response.json();
                
                if (elements.cityInput) elements.cityInput.value = weatherData.name;
                const forecastData = await fetchForecast(weatherData.name);
                
                displayWeather(weatherData);
                displayForecast(forecastData);
                updateTheme(weatherData.weather[0].main);
                updateRecommendations(weatherData);
                updateMoodImages(weatherData.weather[0].main);
                startWeatherAnimation(weatherData.weather[0].main);
                
                if (elements.weatherContent) elements.weatherContent.style.display = 'block';
                if (elements.errorMessage) elements.errorMessage.style.display = 'none';
                
                resetLocationButton();
                
            } catch (error) {
                console.error('Error fetching location weather:', error);
                showError('Unable to fetch weather');
                resetLocationButton();
            }
        },
        () => {
            showError('Location access denied');
            resetLocationButton();
        }
    );
}

function resetLocationButton() {
    if (elements.locationBtn) {
        elements.locationBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <circle cx="12" cy="12" r="3" fill="currentColor"/>
                <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="currentColor" stroke-width="2"/>
            </svg>
            <span class="btn-label">Use My Location</span>
        `;
    }
}

// ============================================
// DISPLAY WEATHER
// ============================================
function displayWeather(data) {
    const locationName = document.getElementById('locationName');
    const tempNumber = document.getElementById('tempNumber');
    const weatherDescription = document.getElementById('weatherDescription');
    const feelsLikeTemp = document.getElementById('feelsLikeTemp');
    const weatherIconLarge = document.getElementById('weatherIconLarge');
    const humidityValue = document.getElementById('humidityValue');
    const windValue = document.getElementById('windValue');
    const pressureValue = document.getElementById('pressureValue');
    const visibilityValue = document.getElementById('visibilityValue');
    
    if (locationName) locationName.textContent = `${data.name}, ${data.sys.country}`;
    if (tempNumber) tempNumber.textContent = Math.round(data.main.temp);
    if (weatherDescription) weatherDescription.textContent = data.weather[0].description;
    if (feelsLikeTemp) feelsLikeTemp.textContent = Math.round(data.main.feels_like);
    if (weatherIconLarge) weatherIconLarge.textContent = getWeatherEmoji(data.weather[0].main);
    
    if (humidityValue) humidityValue.textContent = `${data.main.humidity}%`;
    if (windValue) windValue.textContent = `${Math.round(data.wind.speed * 3.6)} km/h`;
    if (pressureValue) pressureValue.textContent = `${data.main.pressure} hPa`;
    if (visibilityValue) visibilityValue.textContent = `${(data.visibility / 1000).toFixed(1)} km`;
}

// ============================================
// DISPLAY FORECAST
// ============================================
function displayForecast(data) {
    const forecastGrid = document.getElementById('forecastGrid');
    if (!forecastGrid) return;
    
    forecastGrid.innerHTML = '';
    
    const dailyForecasts = data.list.filter((item, index) => index % 8 === 0).slice(0, 5);
    
    dailyForecasts.forEach(day => {
        const date = new Date(day.dt * 1000);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        
        const card = document.createElement('div');
        card.className = 'forecast-card';
        card.innerHTML = `
            <div class="forecast-day">${dayName}</div>
            <div class="forecast-icon">${getWeatherEmoji(day.weather[0].main)}</div>
            <div class="forecast-temp">${Math.round(day.main.temp)}°C</div>
            <div class="forecast-desc">${day.weather[0].description}</div>
        `;
        
        forecastGrid.appendChild(card);
    });
}

// ============================================
// WEATHER EMOJI MAPPING
// ============================================
function getWeatherEmoji(condition) {
    const emojiMap = {
        'Clear': '☀️',
        'Clouds': '☁️',
        'Rain': '🌧️',
        'Drizzle': '🌦️',
        'Thunderstorm': '⛈️',
        'Snow': '❄️',
        'Mist': '🌫️',
        'Fog': '🌫️',
        'Haze': '🌫️'
    };
    
    return emojiMap[condition] || '🌤️';
}

// ============================================
// UPDATE COLOR THEME WITH ANIMATIONS
// ============================================
function updateTheme(weather) {
    console.log('🎨 Updating theme for:', weather);
    
    // Remove all weather classes first
    document.body.classList.remove('weather-rain', 'weather-snow', 'weather-sunny', 'weather-cloudy', 'weather-thunder', 'weather-mist');
    document.body.classList.remove('light-theme', 'dark-theme');
    
    const themes = {
        'Clear': {
            primary: '#F59E0B',
            secondary: '#F97316',
            accent: '#FCD34D',
            glow: 'rgba(245, 158, 11, 0.4)',
            gradient: 'linear-gradient(135deg, #FDC830 0%, #F37335 100%)',
            bodyClass: 'weather-sunny',
            textTheme: 'dark-theme'
        },
        'Rain': {
            primary: '#3B82F6',
            secondary: '#1D4ED8',
            accent: '#60A5FA',
            glow: 'rgba(59, 130, 246, 0.4)',
            gradient: 'linear-gradient(135deg, #667db6 0%, #0082c8 100%)',
            bodyClass: 'weather-rain',
            textTheme: 'light-theme'
        },
        'Drizzle': {
            primary: '#4A90E2',
            secondary: '#2E6BA6',
            accent: '#6BA3E0',
            glow: 'rgba(74, 144, 226, 0.4)',
            gradient: 'linear-gradient(135deg, #6BA3E0 0%, #4A90E2 100%)',
            bodyClass: 'weather-rain',
            textTheme: 'light-theme'
        },
        'Thunderstorm': {
            primary: '#6B21A8',
            secondary: '#581C87',
            accent: '#A855F7',
            glow: 'rgba(168, 85, 247, 0.5)',
            gradient: 'linear-gradient(135deg, #434343 0%, #000000 100%)',
            bodyClass: 'weather-thunder',
            textTheme: 'light-theme'
        },
        'Snow': {
            primary: '#67E8F9',
            secondary: '#22D3EE',
            accent: '#A5F3FC',
            glow: 'rgba(103, 232, 249, 0.4)',
            gradient: 'linear-gradient(135deg, #e6dada 0%, #274046 100%)',
            bodyClass: 'weather-snow',
            textTheme: 'dark-theme'
        },
        'Clouds': {
            primary: '#6B7280',
            secondary: '#4B5563',
            accent: '#9CA3AF',
            glow: 'rgba(107, 114, 128, 0.4)',
            gradient: 'linear-gradient(135deg, #757F9A 0%, #D7DDE8 100%)',
            bodyClass: 'weather-cloudy',
            textTheme: 'dark-theme'
        },
        'Mist': {
            primary: '#94A3B8',
            secondary: '#64748B',
            accent: '#CBD5E1',
            glow: 'rgba(148, 163, 184, 0.4)',
            gradient: 'linear-gradient(135deg, #606c88 0%, #3f4c6b 100%)',
            bodyClass: 'weather-mist',
            textTheme: 'light-theme'
        },
        'Fog': {
            primary: '#94A3B8',
            secondary: '#64748B',
            accent: '#CBD5E1',
            glow: 'rgba(148, 163, 184, 0.4)',
            gradient: 'linear-gradient(135deg, #606c88 0%, #3f4c6b 100%)',
            bodyClass: 'weather-mist',
            textTheme: 'light-theme'
        },
        'Haze': {
            primary: '#94A3B8',
            secondary: '#64748B',
            accent: '#CBD5E1',
            glow: 'rgba(148, 163, 184, 0.4)',
            gradient: 'linear-gradient(135deg, #606c88 0%, #3f4c6b 100%)',
            bodyClass: 'weather-mist',
            textTheme: 'light-theme'
        }
    };
    
    const theme = themes[weather] || themes['Clear'];
    
    document.documentElement.style.setProperty('--primary', theme.primary);
    document.documentElement.style.setProperty('--secondary', theme.secondary);
    document.documentElement.style.setProperty('--accent', theme.accent);
    document.documentElement.style.setProperty('--glow', theme.glow);
    document.body.style.background = theme.gradient;
    
    // Add weather animation class
    document.body.classList.add(theme.bodyClass);
    
    // Add text theme class for dynamic colors
    document.body.classList.add(theme.textTheme);
    
    console.log('✅ Animated background:', theme.bodyClass);
    console.log('✅ Text theme:', theme.textTheme);
}

// ============================================
// UPDATE RECOMMENDATIONS WITH GIFS
// ============================================
function updateRecommendations(data) {
    const weather = data.weather[0].main.toLowerCase();
    const temp = data.main.temp;
    
    const outfitData = getOutfitRecommendation(weather, temp);
    const activityData = getActivityRecommendation(weather, temp);
    
    const outfitGif = document.getElementById('outfitGif');
    const outfitText = document.getElementById('outfitText');
    const outfitEmoji = document.getElementById('outfitEmoji');
    const activityGif = document.getElementById('activityGif');
    const activityText = document.getElementById('activityText');
    const activityEmoji = document.getElementById('activityEmoji');
    
    if (outfitGif) outfitGif.src = outfitData.gif;
    if (outfitText) outfitText.textContent = outfitData.text;
    if (outfitEmoji) outfitEmoji.textContent = outfitData.emoji;
    
    if (activityGif) activityGif.src = activityData.gif;
    if (activityText) activityText.textContent = activityData.text;
    if (activityEmoji) activityEmoji.textContent = activityData.emoji;
}

// ============================================
// OUTFIT RECOMMENDATIONS
// ============================================
function getOutfitRecommendation(weather, temp) {
    const recommendations = {
        'clear': temp > 30 ? {
            text:" Aaj ka outfit: halka kapda + sunscreen + ek thandi bottle pani ki ",
            emoji: "🥵",
            gif: "assets/summeroutfit.webp"
        } : temp > 20 ? {
            text: "T-shirt and jeans perfect! Maybe a light jacket for evening vibes. You're all set! 👌",
            emoji: "👕",
            gif: "https://media.giphy.com/media/3o7btPCcdNniyf0ArS/giphy.gif"
        } : {
            text: "Layer up! Hoodie weather incoming. The sun's tricking you - bring a jacket! 🧥",
            emoji: "🧥",
            gif: "https://media.giphy.com/media/xT8qBhrlNooHBYR9f2/giphy.gif"
        },
        'rain': {
            text: "Raincoat + umbrella combo! Waterproof shoes recommended. Let's splash in puddles! ☔",
            emoji: "☔",
            gif: "https://media.giphy.com/media/26uf2JHNV0Tq3ugkE/giphy.gif"
        },
        'drizzle': {
            text: "Light rain jacket should do! Maybe skip the umbrella. It's romantic drizzle time! 🌧️",
            emoji: "🧥",
            gif: "https://media.giphy.com/media/l0HlNQ03J5JxX6lva/giphy.gif"
        },
        'thunderstorm': {
            text: "STAY INSIDE! But if you must go out - full waterproof gear. Safety first! ⚡",
            emoji: "🏠",
            gif: "https://media.giphy.com/media/l4FGpP4lxGGgK5CBW/giphy.gif"
        },
        'snow': {
            text: "FULL WINTER MODE! Thermals, heavy jacket, gloves, beanie. Snowman building approved! ⛄",
            emoji: "🧤",
            gif: "https://media.giphy.com/media/xUPGcJfaJwK8rPbGa4/giphy.gif"
        },
        'clouds': {
            text: "Comfortable casual! No harsh sun, perfect for that stylish fit. Photographer's paradise! 📸",
            emoji: "👔",
            gif: "https://media.giphy.com/media/26BRuo6sLetdllPAQ/giphy.gif"
        },
        'mist': {
            text: "Layer up smartly! Fog makes it tricky - dress for mystery and adventure! 🌫️",
            emoji: "🧥",
            gif: "https://media.giphy.com/media/3oEduVuU9jNszS4tdK/giphy.gif"
        },
        'fog': {
            text: "Layer up smartly! Fog makes it tricky - dress for mystery and adventure! 🌫️",
            emoji: "🧥",
            gif: "https://media.giphy.com/media/3oEduVuU9jNszS4tdK/giphy.gif"
        },
        'haze': {
            text: "Layer up smartly! Fog makes it tricky - dress for mystery and adventure! 🌫️",
            emoji: "🧥",
            gif: "https://media.giphy.com/media/3oEduVuU9jNszS4tdK/giphy.gif"
        }
    };
    
    return recommendations[weather] || recommendations['clear'];
}

// ============================================
// ACTIVITY RECOMMENDATIONS
// ============================================
function getActivityRecommendation(weather, temp) {
    const recommendations = {
        'clear': temp > 30 ? {
            text: "ICE CREAM TIME! 🍦 Pool party, beach vibes, or AC chillin'. Stay hydrated, friend!",
            emoji: "🏖️",
            gif: "assets/summerbottle.gif"
        } : temp > 20 ? {
            text: "Perfect for outdoor adventures! Cycling, picnic, or park walk. Nature's calling! 🚴",
            emoji: "🌳",
            gif: "assets/spring.gif"
        } : {
            text: "Great for sightseeing or cafe hopping! Pleasant weather won't disappoint. Explore! ☕",
            emoji: "📸",
            gif: "assets/spring-gif-4.gif"
        },
        'rain': {
            text: "CHAI PAKODA WEATHER! 🫖 Cozy up with a book, hot beverage, and rain sounds. Pure bliss! ☕",
            emoji: "📚",
            gif: "https://media.giphy.com/media/5YiRHZtcSeiEyOpSV7/giphy.gif"
        },
        'drizzle': {
            text: "Romantic walk time! Or stay in with tea and good company. Poetry writing approved! 📝",
            emoji: "☕",
            gif: "https://media.giphy.com/media/Lopx9eUi34rbq/giphy.gif"
        },
        'thunderstorm': {
            text: "NETFLIX & CHILL! 🍿 Perfect excuse to binge-watch. Maybe some spicy maggi too? 🍜",
            emoji: "📺",
            gif: "https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif"
        },
        'snow': {
            text: "HOT CHOCOLATE PARTY! ☕ Build a snowman, snowball fight, or indoor gaming. Winter fun! ⛄",
            emoji: "⛄",
            gif: "https://media.giphy.com/media/3o6Zt0hNCfak3QCqsw/giphy.gif"
        },
        'clouds': {
            text: "Photographer's DREAM! 📷 Perfect lighting for outdoor adventures or cafe art sessions. 🎨",
            emoji: "📸",
            gif: "https://media.giphy.com/media/3oEduOnl5IHM5NRodO/giphy.gif"
        },
        'mist': {
            text: "Mysterious morning walks! Great for moody photography and aesthetic foggy vibes. 🌫️",
            emoji: "📸",
            gif: "https://media.giphy.com/media/l0HlNQ03J5JxX6lva/giphy.gif"
        },
        'fog': {
            text: "Mysterious morning walks! Great for moody photography and aesthetic foggy vibes. 🌫️",
            emoji: "📸",
            gif: "https://media.giphy.com/media/l0HlNQ03J5JxX6lva/giphy.gif"
        },
        'haze': {
            text: "Mysterious morning walks! Great for moody photography and aesthetic foggy vibes. 🌫️",
            emoji: "📸",
            gif: "https://media.giphy.com/media/l0HlNQ03J5JxX6lva/giphy.gif"
        }
    };
    
    return recommendations[weather] || recommendations['clear'];
}

// ============================================
// UPDATE MOOD IMAGES
// ============================================
function updateMoodImages(weather) {
    const images = {
        'Clear': {
            main: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=1200&q=80',
            side1: 'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=600&q=80',
            side2: 'https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=600&q=80',
            caption: 'Beautiful sunny day ☀️'
        },
        'Rain': {
            main: 'https://images.unsplash.com/photo-1428908728789-d2de25dbd4e2?w=1200&q=80',
            side1: 'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?w=600&q=80',
            side2: 'https://images.unsplash.com/photo-1519692933481-e162a57d6721?w=600&q=80',
            caption: 'Cozy rainy vibes 🌧️'
        },
        'Drizzle': {
            main: 'https://images.unsplash.com/photo-1515694346937-94d85e41e93f?w=1200&q=80',
            side1: 'https://images.unsplash.com/photo-1556485689-33e55ab56127?w=600&q=80',
            side2: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80',
            caption: 'Gentle drizzle mood 💧'
        },
        'Thunderstorm': {
            main: 'https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28?w=1200&q=80',
            side1: 'https://images.unsplash.com/photo-1527482797697-8795b05a13fe?w=600&q=80',
            side2: 'https://images.unsplash.com/photo-1514632595-4944383f2737?w=600&q=80',
            caption: 'Epic thunderstorm ⚡'
        },
        'Snow': {
            main: 'https://images.unsplash.com/photo-1547754980-3df97fed72a8?w=1200&q=80',
            side1: 'https://images.unsplash.com/photo-1478265409131-1f65c88f965c?w=600&q=80',
            side2: 'https://images.unsplash.com/photo-1516715094483-75da06b7e4f0?w=600&q=80',
            caption: 'Winter wonderland ❄️'
        },
        'Clouds': {
            main: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1200&q=80',
            side1: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=600&q=80',
            side2: 'https://images.unsplash.com/photo-1469365556835-3da3db4c97d5?w=600&q=80',
            caption: 'Peaceful cloudy skies ☁️'
        },
        'Mist': {
            main: 'https://images.unsplash.com/photo-1487621167305-5d248087c724?w=1200&q=80',
            side1: 'https://images.unsplash.com/photo-1445251836269-d158eaa028a6?w=600&q=80',
            side2: 'https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=600&q=80',
            caption: 'Mysterious misty morning 🌫️'
        },
        'Fog': {
            main: 'https://images.unsplash.com/photo-1487621167305-5d248087c724?w=1200&q=80',
            side1: 'https://images.unsplash.com/photo-1445251836269-d158eaa028a6?w=600&q=80',
            side2: 'https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=600&q=80',
            caption: 'Foggy atmosphere 🌫️'
        },
        'Haze': {
            main: 'https://images.unsplash.com/photo-1487621167305-5d248087c724?w=1200&q=80',
            side1: 'https://images.unsplash.com/photo-1445251836269-d158eaa028a6?w=600&q=80',
            side2: 'https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=600&q=80',
            caption: 'Hazy atmosphere 🌫️'
        }
    };
    
    const mood = images[weather] || images['Clear'];
    
    const moodImageMain = document.getElementById('moodImageMain');
    const moodImage1 = document.getElementById('moodImage1');
    const moodImage2 = document.getElementById('moodImage2');
    const moodCaption = document.getElementById('moodCaption');
    
    if (moodImageMain) moodImageMain.src = mood.main;
    if (moodImage1) moodImage1.src = mood.side1;
    if (moodImage2) moodImage2.src = mood.side2;
    if (moodCaption) moodCaption.textContent = mood.caption;
}

// ============================================
// WEATHER CANVAS ANIMATION - FIXED
// ============================================
function startWeatherAnimation(weather) {
    console.log('🎬 Starting animation for:', weather);
    
    // Stop any existing animation
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }
    
    if (!elements.canvas) {
        console.warn('Canvas not found');
        return;
    }
    
    const canvas = elements.canvas;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const weatherLower = weather.toLowerCase();
    
    if (weatherLower.includes('rain') || weatherLower === 'drizzle') {
        console.log('🌧️ Starting rain animation');
        animateRain(ctx, canvas);
    } else if (weatherLower.includes('snow')) {
        console.log('❄️ Starting snow animation');
        animateSnow(ctx, canvas);
    } else if (weatherLower.includes('thunder')) {
        console.log('⚡ Starting thunderstorm animation');
        animateThunderstorm(ctx, canvas);
    } else {
        console.log('☀️ No animation for:', weather);
    }
}

// ============================================
// RAIN ANIMATION - FIXED
// ============================================
function animateRain(ctx, canvas) {
    // Create rain particles
    particles = [];
    for (let i = 0; i < 150; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            length: Math.random() * 20 + 10,
            speed: Math.random() * 5 + 5,
            opacity: Math.random() * 0.5 + 0.3
        });
    }
    
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(drop => {
            ctx.strokeStyle = `rgba(174, 194, 224, ${drop.opacity})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(drop.x, drop.y);
            ctx.lineTo(drop.x, drop.y + drop.length);
            ctx.stroke();
            
            drop.y += drop.speed;
            
            if (drop.y > canvas.height) {
                drop.y = -drop.length;
                drop.x = Math.random() * canvas.width;
            }
        });
        
        animationFrame = requestAnimationFrame(draw);
    }
    
    draw();
}

// ============================================
// SNOW ANIMATION - FIXED
// ============================================
function animateSnow(ctx, canvas) {
    // Create snowflakes
    particles = [];
    for (let i = 0; i < 100; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 3 + 1,
            speed: Math.random() * 1 + 0.5,
            drift: Math.random() * 0.5 - 0.25,
            opacity: Math.random() * 0.6 + 0.4
        });
    }
    
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(flake => {
            ctx.fillStyle = `rgba(255, 255, 255, ${flake.opacity})`;
            ctx.beginPath();
            ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
            ctx.fill();
            
            flake.y += flake.speed;
            flake.x += flake.drift;
            
            if (flake.y > canvas.height) {
                flake.y = -flake.radius;
                flake.x = Math.random() * canvas.width;
            }
            
            if (flake.x > canvas.width) {
                flake.x = 0;
            } else if (flake.x < 0) {
                flake.x = canvas.width;
            }
        });
        
        animationFrame = requestAnimationFrame(draw);
    }
    
    draw();
}

// ============================================
// THUNDERSTORM ANIMATION - NEW
// ============================================
function animateThunderstorm(ctx, canvas) {
    // Heavy rain + lightning
    particles = [];
    for (let i = 0; i < 200; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            length: Math.random() * 30 + 15,
            speed: Math.random() * 8 + 7,
            opacity: Math.random() * 0.6 + 0.4
        });
    }
    
    let lightningTimer = 0;
    let showLightning = false;
    
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Lightning flash
        if (showLightning) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        // Heavy rain
        particles.forEach(drop => {
            ctx.strokeStyle = `rgba(174, 194, 224, ${drop.opacity})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(drop.x, drop.y);
            ctx.lineTo(drop.x, drop.y + drop.length);
            ctx.stroke();
            
            drop.y += drop.speed;
            
            if (drop.y > canvas.height) {
                drop.y = -drop.length;
                drop.x = Math.random() * canvas.width;
            }
        });
        
        // Random lightning
        lightningTimer++;
        if (lightningTimer > 120 && Math.random() < 0.02) {
            showLightning = true;
            setTimeout(() => { showLightning = false; }, 100);
            lightningTimer = 0;
        }
        
        animationFrame = requestAnimationFrame(draw);
    }
    
    draw();
}

// ============================================
// ERROR HANDLING
// ============================================
function showError(message) {
    if (elements.weatherContent) elements.weatherContent.style.display = 'none';
    if (elements.errorMessage) elements.errorMessage.style.display = 'block';
    
    const errorText = document.getElementById('errorText');
    if (errorText) errorText.textContent = message;
}

console.log('🌤️ SkySense loaded successfully!');