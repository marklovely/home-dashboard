import { registerApp } from '../../services/appRegistry.js';
import { plexApp } from './PlexApp.js';

registerApp(plexApp);

export { plexApp };
