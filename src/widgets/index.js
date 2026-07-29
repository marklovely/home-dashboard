/**
 * Central entry point for dashboard widgets.
 * Each subfolder's index.js self-registers with the widget registry.
 */
import.meta.glob('./*/index.js', { eager: true });
