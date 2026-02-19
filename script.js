const BASE_URL = "https://api.openweathermap.org/data/2.5/weather";
const STORAGE_KEY = 'openweather_api_key';

document.addEventListener('DOMContentLoaded', () => {
  loadApiKey();

  document.getElementById('settings-form').addEventListener('submit', (ev) => {
    ev.preventDefault(); // important to prevent form navigation
    const key = document.getElementById('api-key').value.trim();
    if (key) {
      saveApiKey(key);
      showMessage('API key saved.');
    } else {
      showError('Enter an API key to save.');
    }
  });

  document.getElementById('clear-key').addEventListener('click', () => {
    clearApiKey();
    showMessage('Saved API key cleared.');
  });

  document.getElementById('weather-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    clearError();
    const apiKey = document.getElementById('api-key').value.trim();
    const city = document.getElementById('city').value.trim();
    const fahrenheit = document.getElementById('fahrenheit').checked;

    if (!apiKey || !city) {
      showError('API key and city are required.');
      return;
    }

    const url = buildWeatherQuery(city, apiKey, fahrenheit);
    try {
      const data = await getWeatherData(url);
      displayCard(data, !fahrenheit); // metric if not fahrenheit
    } catch (err) {
      showError(err.message || String(err));
    }
  });
});

function loadApiKey() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      document.getElementById('api-key').value = stored;
    }
  } catch (err) {
    // ignore; localStorage unavailable
  }
}

function saveApiKey(key) {
  try {
    localStorage.setItem(STORAGE_KEY, key);
    // no console.log of the key
  } catch (err) {
    // localStorage may be unavailable (eg. blocked)
    showError('Could not save API key to localStorage.');
  }
}

function removeApiKey() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    // ignore
  }
}

function clearApiKey() {
  removeApiKey();
  document.getElementById('api-key').value = '';
}

function showMessage(msg) {
  const el = document.getElementById('error');
  el.style.color = '#064e3b'; // green-ish for success messages
  el.textContent = msg;
  setTimeout(() => {
    // restore to default error color after 3s
    el.textContent = '';
    el.style.color = '';
  }, 3000);
}

function showError(msg) {
  const el = document.getElementById('error');
  el.textContent = msg;
}

function clearError() {
  document.getElementById('error').textContent = '';
}

function buildWeatherQuery(city, apiKey, fahrenheit=false) {
  const encoded = encodeURIComponent(city);
  const units = fahrenheit ? 'imperial' : 'metric';
  return `${BASE_URL}?q=${encoded}&units=${units}&appid=${apiKey}`;
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
  // match your python script behavior
  if (json.sys && json.sys.country === 'PS') json.sys.country = 'IL';
  return json;
}

function displayCard(weatherData, metric = true) {
  const deg = metric ? '°C' : '°F';
  const city = `${weatherData.name}, ${weatherData.sys.country}`;
  const desc = weatherData.weather[0].description;
  const temp_current = Math.round(weatherData.main.temp);
  const feels_like = Math.round(weatherData.main.feels_like);
  const temp_min = Math.round(weatherData.main.temp_min);
  const temp_max = Math.round(weatherData.main.temp_max);
  const humidity = weatherData.main.humidity;
  const clouds = weatherData.clouds.all;
  const pressure = weatherData.main.pressure;
  const visibilityKm = Math.round(weatherData.visibility / 1000);
  const windSpeedLabel = speedStr(weatherData.wind?.speed, metric);
  const windDir = (weatherData.wind && typeof weatherData.wind.deg === 'number') ? directionStr(weatherData.wind.deg) : '';
  const gust = weatherData.wind?.gust ? speedStr(weatherData.wind.gust, metric) : null;
  const coords = `${latStr(weatherData.coord.lat)} ${longStr(weatherData.coord.lon)}`;

  // sunrise/sunset - convert using timezone shift (api timezone is seconds)
  const timezone = weatherData.timezone;
  const sunriseDate = localTime(weatherData.sys.sunrise, timezone); // returns JS Date in example earlier
  const sunsetDate = localTime(weatherData.sys.sunset, timezone);

  // icon
  const iconCode = weatherData.weather[0].icon;
  const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;

  document.getElementById('results').hidden = false;
  document.getElementById('card-city').textContent = city;
  document.getElementById('card-temp').textContent = `${temp_current}${deg}`;
  document.getElementById('card-desc').textContent = capitalize(desc);
  document.getElementById('card-feels').textContent = `${feels_like}${deg}`;
  document.getElementById('card-minmax').textContent = `${temp_min}${deg} / ${temp_max}${deg}`;
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
