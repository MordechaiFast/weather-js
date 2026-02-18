// call displayCard(weatherData, metric)
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