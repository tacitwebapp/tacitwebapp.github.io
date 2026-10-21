import Alpine from '../vendor/alpine.esm.js';
import { registerTacitApp } from './tacit-app.js';

window.Alpine = Alpine;
registerTacitApp(Alpine);
Alpine.start();
