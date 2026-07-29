import { registerApp } from '../../services/appRegistry.js';
import { emergencyApp } from './EmergencyApp.js';

registerApp(emergencyApp);

export { emergencyApp };
