/**
 * @file Haptic feedback utility for enhanced mobile UX.
 * Provides tactile feedback for text selection, highlighting, and UI interactions.
 */

/**
 * @type HapticFeedbackType
 * @description Defines the different types of haptic feedback available, corresponding to various UI interactions.
 */
export type HapticFeedbackType = 
  | 'selection'     // Light tap for text selection
  | 'highlight'     // Medium vibration for highlighting
  | 'success'       // Success pattern for completed actions
  | 'error'         // Error pattern for failed actions
  | 'impact'        // Heavy impact for important actions
  | 'soft';         // Very light feedback for subtle interactions

/**
 * @description Checks if the current device and browser support the Vibration API or related haptic feedback APIs.
 * @returns {boolean} True if haptic feedback is supported, false otherwise.
 */
export const isHapticSupported = (): boolean => {
  return typeof window !== 'undefined' && 
         ('vibrate' in navigator || 
          'webkitVibrate' in navigator ||
          // @ts-ignore - iOS haptic feedback API
          ('hapticFeedback' in navigator));
};

/**
 * @description The core function that triggers a specific haptic feedback pattern. It handles
 * different patterns for iOS and Android where possible and fails silently if not supported.
 * @param {HapticFeedbackType} type - The type of haptic feedback to trigger.
 */
export const triggerHapticFeedback = (type: HapticFeedbackType): void => {
  if (!isHapticSupported()) return;

  try {
    // iOS Safari haptic feedback (iOS 10+)
    // @ts-ignore - iOS specific API
    if (window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function') {
      // Modern iOS haptic patterns
      const patterns = {
        selection: [10],
        highlight: [20],
        success: [10, 100, 10],
        error: [50, 100, 50],
        impact: [30],
        soft: [5]
      };

      if (navigator.vibrate) {
        navigator.vibrate(patterns[type]);
      }
      return;
    }

    // Android and other browsers with Vibration API
    if (navigator.vibrate) {
      const patterns = {
        selection: [15],           // Light tap for selection start
        highlight: [25],           // Medium vibration for highlight
        success: [10, 50, 10],     // Success double-tap pattern
        error: [50, 100, 50],      // Error pattern
        impact: [40],              // Heavy impact
        soft: [8]                  // Very light feedback
      };

      navigator.vibrate(patterns[type]);
      return;
    }

    // Fallback for WebKit browsers
    // @ts-ignore
    if (navigator.webkitVibrate) {
      const intensity = {
        selection: 15,
        highlight: 25,
        success: 20,
        error: 50,
        impact: 40,
        soft: 8
      };

      // @ts-ignore
      navigator.webkitVibrate(intensity[type]);
    }
  } catch (error) {
    // Silently fail if haptics are not supported or permission denied
    console.debug('Haptic feedback not available:', error);
  }
};

/**
 * @description Triggers a light haptic feedback for text selection events.
 */
export const hapticTextSelection = (): void => {
  triggerHapticFeedback('selection');
};

/**
 * @description Triggers a medium haptic feedback for highlighting actions.
 */
export const hapticHighlight = (): void => {
  triggerHapticFeedback('highlight');
};

/**
 * @description Triggers a success pattern haptic feedback for completed actions.
 */
export const hapticSuccess = (): void => {
  triggerHapticFeedback('success');
};

/**
 * @description Triggers an error pattern haptic feedback.
 */
export const hapticError = (): void => {
  triggerHapticFeedback('error');
};

/**
 * @description Triggers a very light haptic feedback for subtle interactions.
 */
export const hapticSoft = (): void => {
  triggerHapticFeedback('soft');
};

/**
 * @description Triggers a heavy impact haptic feedback for important actions.
 */
export const hapticImpact = (): void => {
  triggerHapticFeedback('impact');
};

/**
 * @description Requests permission for haptic feedback, which is required on some iOS devices.
 * @returns {Promise<boolean>} A promise that resolves to true if permission is granted, false otherwise.
 */
export const requestHapticPermission = async (): Promise<boolean> => {
  try {
    // @ts-ignore - iOS specific permission API
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      // @ts-ignore
      const permission = await DeviceMotionEvent.requestPermission();
      return permission === 'granted';
    }
    return true; // Assume granted for other platforms
  } catch (error) {
    console.debug('Haptic permission request failed:', error);
    return false;
  }
};
