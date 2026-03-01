const GEO_URL = "https://api.openweathermap.org/geo/1.0/direct";
const ONECALL_URL = "https://api.openweathermap.org/data/3.0/onecall";

const MIKDASH_LAT = 31.7780;
const MIKDASH_LON = 35.2353;

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
  const temp_current = weatherData.temp;
  const pressure_current = weatherData.pressure;
  const sunriseTimestamp = weatherData.sunrise;
  const sunsetTimestamp = weatherData.sunset;
  const coords = `${latStr(data.lat)} ${longStr(data.lon)}`;
  const mikdashDirection = greatCircleDirection(data.lat, data.lon);

  // sunrise/sunset - convert using timezone shift (api timezone is seconds)
  const sunriseDate = localTime(weatherData.sunrise, data.timezone_offset); // returns JS Date in example earlier
  const sunsetDate = localTime(weatherData.sunset, data.timezone_offset);

  document.getElementById('results').hidden = false;
  document.getElementById('card-city').textContent = city;
  document.getElementById('card-temp').textContent = `${temp_current}${deg}`;
  document.getElementById('card-pressure').textContent = `${pressure_current} mb`;
  document.getElementById('card-sun').textContent = `${time12hr(sunriseDate)} / ${time12hr(sunsetDate)}`;
  document.getElementById('card-coords').textContent = coords;
  document.getElementById('card-mikdash-direction').textContent = mikdashDirection;

  // Populate hourly data from sunrise to sunset
  const hourlyBody = document.getElementById('hourly-body');
  hourlyBody.innerHTML = '';

  let hourlyData = data.hourly.filter(h => h.dt >= sunriseTimestamp && h.dt <= sunsetTimestamp);
  if (hourlyData.length === 0) {
    // If no hourly data for the day (e.g. after sunset), show the next day's data instead
    const nextDayStart = sunriseTimestamp + 24 * 3600;
    const nextDayEnd = sunsetTimestamp + 24 * 3600;
    hourlyData = data.hourly.filter(h => h.dt >= nextDayStart && h.dt < nextDayEnd);
  }
  
  hourlyData.forEach(hour => {
    const hourDate = localTime(hour.dt, data.timezone_offset);
    const timeStr = time12hr(hourDate, false);
    const temp = hour.temp;
    const pressure = hour.pressure;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${timeStr}</td>
      <td>${temp}${deg}</td>
      <td>${pressure} mb</td>
    `;
    hourlyBody.appendChild(row);
  });
}

/* Utilities */

function capitalize(s) {
  if (!s) return s;
  return s[0].toUpperCase() + s.slice(1);
}

function longStr(longitude) {
  const degrees = Math.trunc(longitude);
  const decimalDegrees = Math.abs(longitude - degrees);
  const minutes = Math.trunc(decimalDegrees * 60);
  const seconds = Math.round((decimalDegrees * 60 - minutes) * 60);
  const dir = degrees > 0 ? 'E' : 'W';
  return `${Math.abs(degrees)}°${String(minutes).padStart(2,'0')}'${String(seconds).padStart(2,'0')}"${dir}`;
}

function latStr(latitude) {
  const degrees = Math.trunc(latitude);
  const decimalDegrees = Math.abs(latitude - degrees);
  const minutes = Math.trunc(decimalDegrees * 60);
  const seconds = Math.round((decimalDegrees * 60 - minutes) * 60);
  const dir = degrees > 0 ? 'N' : 'S';
  return `${Math.abs(degrees)}°${String(minutes).padStart(2,'0')}'${String(seconds).padStart(2,'0')}"${dir}`;
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

function time12hr(dateObj, showSeconds = true) {
  if (!(dateObj instanceof Date)) return '';
  let hour = dateObj.getUTCHours(); // using UTC hours because dateObj is already shifted
  let minute = dateObj.getUTCMinutes();
  let second = dateObj.getUTCSeconds();
  if (hour > 12) hour -= 12;
  if (hour === 0) hour = 12;
  return `${hour}:${String(minute).padStart(2,'0')}${showSeconds ? `:${String(second).padStart(2,'0')}` : ''}`;
}

function d2r(deg) {
  return deg * Math.PI / 180;
}

function r2d(rad) {
  return rad * 180 / Math.PI;
}

function greatCircleDirection(lat1, lon1) {
  // Returns the compass direction from (lat1, lon1) to the mikdash location
  const lat2 = d2r(MIKDASH_LAT);
  const lon2 = d2r(MIKDASH_LON);
  lat1 = d2r(lat1);
  lon1 = d2r(lon1);
  const dLon = lon2 - lon1;
  const y = Math.sin(dLon);
  const x = Math.cos(lat1)*Math.tan(lat2) - Math.sin(lat1)*Math.cos(dLon);
  const brng = r2d(Math.atan2(y, x));
  return `${directionStr(brng)} (${brng.toFixed(0)}°)`;
}