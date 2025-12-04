/**
 * Plays a notification sound when new messages arrive
 * Handles browser autoplay restrictions gracefully
 * Uses Web Audio API to generate a "ping" sound
 */
export function playNotificationSound(): void {
  try {
    // Create audio context
    const audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();

    // Create oscillator for the ping sound
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Configure "ping" sound - higher frequency, short duration
    oscillator.frequency.value = 1200; // Higher pitched for a "ping" effect
    oscillator.type = 'sine';

    // Sharp attack and quick decay for "ping" effect
    const now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.4, now + 0.005); // Quick attack
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15); // Quick decay

    // Play the ping
    oscillator.start(now);
    oscillator.stop(now + 0.15);

    // Clean up
    oscillator.onended = () => {
      audioContext.close();
    };
  } catch (_error) {
    // Silently fail - notification sounds are non-critical
  }
}
