"use client";

import { useDeviceProfile } from "@/providers/device-provider";
import { SeqtrackSoundBrowser } from "@/components/sound/seqtrak-sound-browser";
import { PresetBankBrowser } from "@/components/sound/preset-bank-browser";

export default function SoundsPage() {
  const { profile } = useDeviceProfile();

  if (profile.id === "microfreak") {
    return <PresetBankBrowser />;
  }

  return <SeqtrackSoundBrowser />;
}
