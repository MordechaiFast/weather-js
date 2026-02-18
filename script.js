const BASE_URL = "https://api.openweathermap.org/data/2.5/weather";
const PADDING = 20;

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
    display(data, !fahrenheit); // metric if not fahrenheit
  } catch (err) {
    showError(err.message || String(err));
  }
});

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

function display(weatherData, metric = true) {
  const out = [];

  const city = `${weatherData.name}, ${weatherData.sys.country}`;
  const weatherDescription = weatherData.weather[0].description;

  const temp_current = weatherData.main.temp;
  const temp_min = weatherData.main.temp_min;
  const temp_max = weatherData.main.temp_max;
  const feels_like = weatherData.main.feels_like;
  const deg = metric ? '°C' : '°F';

  const raw_latitude = weatherData.coord.lat;
  const raw_longitude = weatherData.coord.lon;
  const longitude = longStr(raw_longitude);
  const latitude = latStr(raw_latitude);

  const raw_wind_speed = weatherData.wind && weatherData.wind.speed;
  const wind_degrees = weatherData.wind && weatherData.wind.deg;
  const raw_wind_gust = weatherData.wind && weatherData.wind.gust;
  const wind_speed = speedStr(raw_wind_speed, metric);
  const direction = typeof wind_degrees === 'number' ? directionStr(wind_degrees) : '';
  const gust_speed = raw_wind_gust ? speedStr(raw_wind_gust, metric) : null;

  const humidity = weatherData.main.humidity;
  const clouds = weatherData.clouds.all;
  const pressure = weatherData.main.pressure;
  const visibility = weatherData.visibility; // meters

  const sunrise_utc = weatherData.sys.sunrise;
  const sunset_utc = weatherData.sys.sunset;
  const timezone = weatherData.timezone; // seconds shift from UTC for location
  const sunrise = localTime(sunrise_utc, timezone);
  const sunset = localTime(sunset_utc, timezone);

  // build textual output similar to python print layout
  out.push(centerText(`${city} ${Math.round(temp_current)}${deg}`, PADDING) + ' ' + capitalize(weatherDescription));
  out.push(centerText(`${latitude} ${longitude}`, PADDING) + ` ${humidity}% humidity`);
  out.push(' '.repeat(PADDING) + `Feels like: ${Math.round(feels_like)}${deg}`);
  out.push(' '.repeat(PADDING) + `${clouds}% cloud cover`);
  out.push(`Wind: ${wind_speed} ${direction}` + (gust_speed ? `    Gusts: ${gust_speed}` : ''));
  out.push(`Temperature range: ${Math.round(temp_min)}-${Math.round(temp_max)}${deg}    Pressure: ${pressure} mb`);
  out.push(`Sunrise: ${time12hr(sunrise)}    Sunset: ${time12hr(sunset)}    Visibility: ${Math.round(visibility/1000)}km`);

  document.getElementById('results').hidden = false;
  document.getElementById('output').textContent = out.join('\n');
}

/* Utilities */

function centerText(s, width) {
  // approximate centering in monospace layout
  if (s.length >= width) return s;
  const pad = Math.max(0, Math.floor((width - s.length) / 2));
  return ' '.repeat(pad) + s;
}

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

function showError(msg) {
  const el = document.getElementById('error');
  el.textContent = msg;
}

function clearError() {
  document.getElementById('error').textContent = '';
}