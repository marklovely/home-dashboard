import { registerApp } from '../../services/appRegistry.js';
import { settingsApp } from './SettingsApp.js';

registerApp(settingsApp);

export { settingsApp };
