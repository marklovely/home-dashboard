import { registerApp } from '../../services/appRegistry.js';
import { calendarApp } from './CalendarApp.js';

registerApp(calendarApp);

export { calendarApp };
