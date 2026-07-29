import { registerApp } from '../../services/appRegistry.js';
import { weatherApp } from './WeatherApp.js';

registerApp(weatherApp);

export { weatherApp };
