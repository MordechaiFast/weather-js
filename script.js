const GEO_URL = "https://api.openweathermap.org/geo/1.0/direct";
const ONECALL_URL = "https://api.openweathermap.org/data/3.0/onecall";

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('weather-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    clearError();
    const apiKey = api_key_3; // using the imported key from keys.js
    const city = document.getElementById('city').value.trim();
    const fahrenheit = document.getElementById('fahrenheit').checked;

    if (!city) {
      showError('City is required.');
      return;
    }

    try {
      const geoData = await getGeoDataCached(city, apiKey);
      if (!geoData || geoData.length === 0) {
        throw new Error('No weather data for this city.');
      }
      const { name, state, country, lat, lon } = geoData[0];
      const fullCityName = country === 'IL'
        ? geoData[0].local_names.he
        : `${name}${state ? ', ' + state : ''}, ${country}`;

      const weatherUrl = buildWeatherQuery(lat, lon, apiKey, fahrenheit);
      const data = await getWeatherData(weatherUrl);
      displayCard(fullCityName, data, !fahrenheit); // metric if not fahrenheit
    } catch (err) {
      showError(err.message || String(err));
    }
  });
});

function showError(msg) {
  const el = document.getElementById('error');
  el.textContent = msg;
}

function clearError() {
  document.getElementById('error').textContent = '';
}

async function getGeoDataCached(city, apiKey) {
  const cacheKey = `geoData_${city.toLowerCase()}`;
  try {
    // Check if data is already in localStorage
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      console.log('Using cached geoData for:', city);
      return JSON.parse(cached);
    }
  } catch (err) {
    // localStorage may be unavailable; continue with API call
  }

  // Query the API if not in cache
  const geoUrl = buildGeoQuery(city, apiKey);
  const geoData = await getGeoData(geoUrl);

  // Store in localStorage for future use
  try {
    localStorage.setItem(cacheKey, JSON.stringify(geoData));
  } catch (err) {
    // localStorage may be unavailable; continue without caching
  }

  return geoData;
}

function buildGeoQuery(city, apiKey) {
  const encoded = encodeURIComponent(city);
  return `${GEO_URL}?q=${encoded}&limit=1&appid=${apiKey}`;
}

async function getGeoData(url) {
  const resp = await fetch(url);
  if (!resp.ok) {
    if (resp.status === 401) throw new Error('Access denied. Check API key.');
    if (resp.status === 404) throw new Error('No weather data for this city.');
    const txt = await resp.text();
    throw new Error(resp.statusText || txt || `HTTP ${resp.status}`);
  }
  const json = await resp.json();
  console.log('Geocode response:', json);
  if (json[0] && json[0].country === 'PS') json[0].country = 'IL';
  return json;
}

function buildWeatherQuery(lat, lon, apiKey, fahrenheit=false) {
  const units = fahrenheit ? 'imperial' : 'metric';
  return `${ONECALL_URL}?lat=${lat}&lon=${lon}&units=${units}&appid=${apiKey}`;
}

async function getWeatherData(url) {
  const resp = await fetch(url);
  if (!resp.ok) {
    if (resp.status === 401) throw new Error('Access denied. Check API key.');
    if (resp.status === 404) throw new Error('No weather data for this city.');
    const txt = await resp.text();
    throw new Error(resp.statusText || txt || `HTTP ${resp.status}`);
  }
  const json = await resp.json();
  console.log('Weather response:', json);
  return json;
}

function displayCard(city, data, metric = true) {
  const deg = metric ? '°C' : '°F';
  const weatherData = data.current;
  const desc = weatherData.weather.description;
  const temp_current = Math.round(weatherData.temp);
  const feels_like = Math.round(weatherData.feels_like);
  const humidity = weatherData.humidity;
  const clouds = weatherData.clouds;
  const pressure = weatherData.pressure;
  const visibilityKm = Math.round(weatherData.visibility / 1000);
  const windSpeedLabel = speedStr(weatherData.wind_speed, metric);
  const windDir = directionStr(weatherData.wind_deg);
  const gust = weatherData.wind_gust ? speedStr(weatherData.wind_gust, metric) : null;
  const coords = `${latStr(data.lat)} ${longStr(data.lon)}`;

  // sunrise/sunset - convert using timezone shift (api timezone is seconds)
  const sunriseDate = localTime(weatherData.sunrise, data.timezone_offset); // returns JS Date in example earlier
  const sunsetDate = localTime(weatherData.sunset, data.timezone_offset);

  // icon
  const iconCode = weatherData.weather[0].icon;
  const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;

  document.getElementById('results').hidden = false;
  document.getElementById('card-city').textContent = city;
  document.getElementById('card-temp').textContent = `${temp_current}${deg}`;
  document.getElementById('card-desc').textContent = capitalize(desc);
  document.getElementById('card-feels').textContent = `${feels_like}${deg}`;
  document.getElementById('card-humidity').textContent = `${humidity}%`;
  document.getElementById('card-clouds').textContent = `${clouds}%`;
  document.getElementById('card-pressure').textContent = `${pressure} mb`;
  document.getElementById('card-visibility').textContent = `${visibilityKm} km`;
  document.getElementById('card-wind').textContent = `${windSpeedLabel} ${windDir}${gust ? ' • Gusts: ' + gust : ''}`;
  document.getElementById('card-sun').textContent = `${time12hr(sunriseDate)} / ${time12hr(sunsetDate)}`;
  document.getElementById('card-coords').textContent = coords;

  const img = document.getElementById('card-icon');
  img.src = iconUrl;
  img.alt = desc;
}

/* Utilities */

function capitalize(s) {
  if (!s) return s;
  return s[0].toUpperCase() + s.slice(1);
}

function longStr(longitude) {
  const degrees = Math.trunc(longitude);
  const minutes = Math.round(Math.abs((longitude - degrees) * 60));
  const dir = degrees > 0 ? 'E' : 'W';
  return `${Math.abs(degrees)}°${String(minutes).padStart(2,'0')}'${dir}`;
}

function latStr(latitude) {
  const degrees = Math.trunc(latitude);
  const minutes = Math.round(Math.abs((latitude - degrees) * 60));
  const dir = degrees > 0 ? 'N' : 'S';
  return `${Math.abs(degrees)}°${String(minutes).padStart(2,'0')}'${dir}`;
}

function speedStr(speed, metric=true) {
  if (typeof speed !== 'number') return '';
  if (metric) {
    const kmh = speed * 3.6;
    return `${kmh.toFixed(1)} km/h`;
  } else {
    return `${speed.toFixed(1)} mph`;
  }
}

function directionStr(deg) {
  // 16-sector compass
  const sectors = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  const idx = Math.floor(((deg + 11.25) % 360) / 22.5);
  return sectors[idx];
}

function localTime(utcSeconds, timezoneShiftSeconds) {
  // returns JS Date for the location local time (api gives timezone shift in seconds)
  const ts = (utcSeconds + timezoneShiftSeconds) * 1000;
  return new Date(ts);
}

function time12hr(dateObj) {
  if (!(dateObj instanceof Date)) return '';
  let hour = dateObj.getUTCHours(); // using UTC hours because dateObj is already shifted
  let minute = dateObj.getUTCMinutes();
  if (hour > 12) hour -= 12;
  if (hour === 0) hour = 12;
  return `${hour}:${String(minute).padStart(2,'0')}`;
}
