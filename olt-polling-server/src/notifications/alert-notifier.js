/**
 * Alert Notifier - Uses the new notification system
 * This is a wrapper that uses the main notifier module
 */

import { getNotificationSettings, notifyAlert } from './notifier.js';

export { getNotificationSettings as getAlertNotificationSettings };
export { notifyAlert };
