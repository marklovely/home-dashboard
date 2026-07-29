import { registerWidget } from '../../services/widgetRegistry.js';
import { alexaWidget } from './AlexaWidget.js';

registerWidget(alexaWidget);

export { alexaWidget };
