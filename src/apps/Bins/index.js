import { registerApp } from '../../services/appRegistry.js';
import { binsApp } from './BinsApp.js';

registerApp(binsApp);

export { binsApp };
