/**
 * Device profile registry — detection, lookup, and enumeration.
 */

import type { DeviceProfile, DeviceId } from "./types";
import { seqtrackProfile, microfreakProfile, ko2Profile, genericProfile } from "./profiles";

const DEVICE_PROFILES: Record<DeviceId, DeviceProfile> = {
  seqtrak: seqtrackProfile,
  microfreak: microfreakProfile,
  ko2: ko2Profile,
  generic: genericProfile,
};

/** Detect device profile from a USB MIDI port name (case-insensitive substring match) */
export function detectDeviceProfile(portName: string): DeviceProfile {
  const lower = portName.toLowerCase();
  for (const profile of Object.values(DEVICE_PROFILES)) {
    if (profile.usbNames.some((n) => lower.includes(n.toLowerCase()))) {
      return profile;
    }
  }
  return genericProfile;
}

/** Get a profile by its DeviceId */
export function getDeviceProfile(id: DeviceId): DeviceProfile {
  return DEVICE_PROFILES[id] ?? genericProfile;
}

/** List all registered profiles */
export function getAllProfiles(): DeviceProfile[] {
  return Object.values(DEVICE_PROFILES);
}
