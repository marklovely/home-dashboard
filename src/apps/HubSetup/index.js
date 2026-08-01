import { registerApp } from '../../services/appRegistry.js';
import { hubSetupApp } from './HubSetupApp.js';

registerApp(hubSetupApp);

export { hubSetupApp };
