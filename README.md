# WeatherHub 🌦️

A fully-featured weather website with real-time updates, location services, and beautiful UI design.

## Features

✨ **Core Features:**
- 🌍 Real-time weather data with automatic location detection
- 🔍 Search for weather by city name
- 📍 Use current device location for accurate weather
- 💾 Automatic location memory (remembers last searched city)
- 🔄 Auto-refresh every 10 minutes
- ⚡ **No API key required!** Uses free Open-Meteo API

📊 **Weather Information:**
- Current temperature with "feels like" indicator
- Weather conditions and descriptions
- Hourly forecast (24 hours)
- 5-day daily forecast
- Wind speed, humidity, pressure, visibility
- Sunrise and sunset times
- Air quality estimate
- UV index calculation
- Precipitation chance and amount

🎨 **User Experience:**
- Beautiful gradient background
- Responsive design (mobile, tablet, desktop)
- Smooth animations and transitions
- City suggestions while typing
- Error handling with user-friendly messages
- Dark/light text contrast optimization

## Setup Instructions

### Step 1: Just Open It! 🚀

This app uses **Open-Meteo**, a completely free API that requires **NO API key**. Just open the app and start using it!

### Step 2: Run the Application

**Option A: Local Server (Recommended)**
```bash
# Using Python 3
python -m http.server 8000

# Using Python 2
python -m SimpleHTTPServer 8000

# Using Node.js
npx http-server
```

Then open: `http://localhost:8000`

**Option B: Direct File Opening**
- Simply double-click `index.html` in your file explorer
- Note: Geolocation may not work with the file:// protocol

**Option C: Online Hosting**
- Upload all files to a platform like Netlify, Vercel, or GitHub Pages
- It will work immediately, no configuration needed!

## File Structure

```
Weather-app/
├── index.html          # Main HTML structure
├── styles.css          # Complete styling with responsive design
├── script.js           # JavaScript logic and API integration
└── README.md           # This file
```

## How to Use

1. **Automatic Location**: The app will ask for permission to access your location on first load
2. **Manual Search**: Type a city name in the search bar and press Enter or click the search button
3. **Location Button**: Click the location icon to use your current location
4. **View Details**: Scroll down to see hourly forecast, 5-day forecast, and additional weather information

## API Data

The app uses **Open-Meteo Free Weather API** which includes:

- Current weather data
- Hourly forecast (up to 7 days)
- 5-day forecast
- Weather code mapping
- Timezone-aware data
- No rate limits for reasonable use
- No API key required

**Benefits:**
- Completely free and unlimited
- No registration needed
- No rate limits
- No API key to manage
- Privacy-focused (no tracking)
- Maintained by weather data experts

Learn more: https://open-meteo.com/

## Browser Requirements

- Modern browser with JavaScript support
- Geolocation support (for automatic location detection)
- Internet connection

**Tested on:**
- Chrome/Chromium (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Customization

### Change Theme Colors
Edit the CSS variables in `styles.css` (around line 8):
```css
:root {
    --primary-color: #667eea;
    --secondary-color: #764ba2;
    --accent-color: #f093fb;
    /* ... other colors ... */
}
```

### Adjust Auto-Refresh Interval
In `script.js`, find this line:
```javascript
setInterval(() => {
    if (currentCity) {
        fetchWeatherData(currentCity);
    }
}, 600000); // 10 minutes - change this value (in milliseconds)
```

### Add More Weather Details
Open-Meteo provides many additional parameters. Edit the API call in `fetchWeatherByCoordinates()` to include:
- Soil moisture
- Evapotranspiration
- Runoff depth
- And many weather parameters!

See: https://open-meteo.com/en/docs

## Troubleshooting

### No weather appears
- Check internet connection
- Open browser console (F12) to see error messages
- Try searching a different city
- Make sure location access is allowed (if using geolocation)

### Geolocation not working
- Must use HTTP/HTTPS (not file://)
- Check browser permissions for location access
- Some browsers/networks may block geolocation
- Use manual search as alternative

### City not found
- Check spelling of the city
- Try with country name (e.g., "Paris, France")
- Some small towns may not be in the database

### Page is slow
- Check internet speed
- Open-Meteo is usually very fast
- Try clearing browser cache
- Check if browser cache is enabled

## Production Considerations

For production deployment:

1. **Performance**: Minify CSS and JavaScript files
2. **Caching**: Implement local caching to minimize API calls
3. **Error Handling**: Current implementation is quite robust already
4. **Analytics**: Add tracking to understand user behavior
5. **SEO**: Add proper meta tags for search engines

## One-Command Deployment Examples

### Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=.
```

### Vercel
```bash
npm install -g vercel
vercel --prod
```

## License

This project is free to use and modify for personal and commercial purposes.

## Support

For issues with the Open-Meteo API:
- [Open-Meteo Documentation](https://open-meteo.com/en/docs)
- [Open-Meteo GitHub](https://github.com/open-meteo/open-meteo)

For issues with this weather app, check the browser console (F12) for error messages.

## Credits

- Weather data: [Open-Meteo](https://open-meteo.com/)
- Icons: [Font Awesome](https://fontawesome.com/) & [OpenWeatherMap Icons](https://openweathermap.org)
- Design inspiration: Modern weather applications

---

**Happy Weather Checking!** 🌤️✨

