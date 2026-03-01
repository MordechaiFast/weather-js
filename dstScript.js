const GEO_URL = "https://api.openweathermap.org/geo/1.0/direct";
const ONECALL_URL = "https://api.openweathermap.org/data/3.0/onecall";

const MIKDASH_LAT = 31.7780;
const MIKDASH_LON = 35.2353;

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('date').valueAsDate = new Date(); // default to today

  document.getElementById('input-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    clearError();
    const apiKey = api_key_3; // using the imported key from keys.js
    const city = document.getElementById('city').value.trim();
    const date = document.getElementById('date').value; // YYYY-MM-DD
 
    if (!city) {
      showError('City is required.');
      return;
    }

    try {
      const geoData = await getGeoDataCached(city, apiKey);
      if (!geoData || geoData.length === 0) {
        throw new Error('No data for this city.');
      }
      const { name, state, country, lat, lon } = geoData[0];
      const fullCityName = country === 'IL'
        ? geoData[0].local_names.he
        : `${name}${state ? ', ' + state : ''}, ${country}`;

      const weatherUrl = buildWeatherQuery(lat, lon, apiKey);
      const data = await getWeatherData(weatherUrl);
      displayCard(fullCityName, date, data);
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

function displayCard(city, date, data) {
    const dateOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    const timeOptions = {
      timeZone: data.timezone,
      timeZoneName: "long",
      hour12: false,
    };

    document.getElementById('results').hidden = false;
    
    document.getElementById('card-city').textContent = city;
    document.getElementById('card-coords').textContent = 
      `${latStr(data.lat)} ${longStr(data.lon)}`;
    document.getElementById('card-direction').textContent = 
      greatCircleDirection(data.lat, data.lon);

    document.getElementById('card-date').textContent = 
      new Date(date).toLocaleDateString(undefined, dateOptions);
    document.getElementById('card-tz').textContent =
      new Date(date).toLocaleTimeString(undefined, timeOptions).match(/\s+(.+)/)[1];
    document.getElementById('card-hebrew-date').textContent = 
      Intl.DateTimeFormat("he", {calendar: "hebrew"}).format(new Date(date));
}

/* Utilities */

function getTimezoneName(timeZone, date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
  }).formatToParts(date);
  return parts.find(p => p.type === "timeZoneName").value;
}

function getOffsetMinutes(timeZone, date) {
  const tz = getTimezoneName(timeZone, date);
  const match = tz.match(/GMT([+-]\d+)(?::(\d+))?/);
  if (!match) return 0;

  const h = parseInt(match[1], 10);
  const min = match[2] ? parseInt(match[2], 10) : 0;
  return h * 60 + Math.sign(h) * min;
}

function getStandardOffset(timeZone, year) {  // non-DST offset
  const jan = new Date(Date.UTC(year, 0, 1));
  const jul = new Date(Date.UTC(year, 6, 1));
  return Math.min(
    getOffsetMinutes(timeZone, jan),
    getOffsetMinutes(timeZone, jul)
  );
}

function formatOffset(minutes) {  // usable as tz identifier for Intl.DateTimeFormat
  const sign = minutes >= 0 ? "+" : "-";
  const abs = Math.abs(minutes);
  const h = String(Math.floor(abs / 60)).padStart(2, "0");
  const m = String(abs % 60).padStart(2, "0");
  return `${sign}${h}:${m}`;
}

function isDST(timeZone, date) {
  const year = date.getUTCFullYear();
  const offsetNow = getOffsetMinutes(timeZone, date);
  const standardOffset = getStandardOffset(timeZone, year);
  return offsetNow !== standardOffset;
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

function localTime(utcSeconds, timezoneShiftSeconds) {
  // returns JS Date for the location local time (api gives timezone shift in seconds)
  const ts = (utcSeconds + timezoneShiftSeconds) * 1000;
  return new Date(ts);
}

function directionStr(deg) {
  // 16-sector compass
  const sectors = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  const idx = Math.floor(((deg + 11.25) % 360) / 22.5);
  return sectors[idx];
}

function d2r(deg) {
  return deg * Math.PI / 180;
}

function r2d(rad) {
  return rad * 180 / Math.PI;
}

function greatCircleDirection(lat1, lon1) { // Davening direction
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