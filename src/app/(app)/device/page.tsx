"use client";

import { useMidiConnection } from "@/hooks/use-midi-connection";
import { ALL_CHANNELS, SEQTRAK_TRACKS, getTrackSolidClass } from "@/lib/midi/constants";
import type { SeqtrackChannel, ChannelTestResult } from "@/lib/midi/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useDeviceProfile } from "@/providers/device-provider";
import { getAllProfiles } from "@/lib/devices/registry";
import type { DeviceId } from "@/lib/devices/types";
import { useProject } from "@/providers/project-provider";

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    connected: "bg-green-500",
    disconnected: "bg-red-500",
    connecting: "bg-yellow-500",
    error: "bg-red-500",
    unsupported: "bg-gray-500",
  };
  return (
    <span className={`inline-block h-3 w-3 rounded-full ${colors[status] ?? "bg-gray-500"}`} />
  );
}

function ChannelTestRow({
  channel,
  result,
  onTest,
  trackName,
  trackType,
}: {
  channel: SeqtrackChannel;
  result?: ChannelTestResult;
  onTest: () => void;
  trackName: string;
  trackType: string;
}) {
  const colorClass = getTrackSolidClass(channel);

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-accent/50 transition-colors">
      <span className={`h-3 w-3 rounded-full shrink-0 ${colorClass}`} />
      <span className="font-medium w-20 font-mono text-sm">{trackName}</span>
      <span className="text-muted-foreground text-xs w-12">Ch {channel}</span>
      <span className="text-xs w-16">
        {trackType === "drum" ? (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">drum</Badge>
        ) : (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{trackType}</Badge>
        )}
      </span>
      <div className="flex-1" />
      <span className="w-20 text-center">
        {result?.status === "sent" && (
          <span className="text-green-400 text-sm font-mono">sent</span>
        )}
        {result?.status === "testing" && (
          <span className="text-yellow-400 text-sm font-mono animate-pulse">testing...</span>
        )}
        {result?.status === "error" && (
          <span className="text-red-400 text-sm font-mono">error</span>
        )}
        {(!result || result.status === "idle") && (
          <span className="text-muted-foreground text-sm font-mono">--</span>
        )}
      </span>
      <Button variant="outline" size="sm" onClick={onTest} className="h-7 text-xs" title="Send C3 note to this channel">
        Test
      </Button>
    </div>
  );
}

export default function DevicePage() {
  const {
    status,
    device,
    outputs,
    error,
    testResults,
    isTesting,
    selectDevice,
    runTest,
    testChannel,
  } = useMidiConnection();
  const { profile, setProfileById } = useDeviceProfile();
  const { project, createProjectForDevice } = useProject();
  const allProfiles = getAllProfiles();

  const handleProfileChange = (id: DeviceId) => {
    const newProfile = getAllProfiles().find(p => p.id === id);
    setProfileById(id);
    if (newProfile && newProfile.id !== project.deviceId) {
      createProjectForDevice(newProfile);
    }
  };

  const getResult = (ch: SeqtrackChannel) =>
    testResults.find((r) => r.channel === ch);

  const sentCount = testResults.filter((r) => r.status === "sent").length;
  const channelCount = profile.allChannels.length;

  return (
    <main className="min-h-screen p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">MIDI Device</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Connect and test your {profile.displayName}
          </p>
        </div>
        <Select
          value={profile.id}
          onValueChange={(id) => handleProfileChange(id as DeviceId)}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {allProfiles.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Connection Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <StatusDot status={status} />
            <div>
              <CardTitle className="text-base">
                {status === "connected" && device
                  ? `${device.name} Connected`
                  : status === "unsupported"
                    ? "Browser Not Supported"
                    : status === "error"
                      ? "Connection Error"
                      : "No Device Connected"}
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {status === "connected" && device
                  ? `Manufacturer: ${device.manufacturer} | ID: ${device.id.slice(0, 16)}...`
                  : status === "unsupported"
                    ? "Web MIDI API is not available. Use Chrome, Edge, or Firefox."
                    : error ?? `Connect your ${profile.displayName} via USB`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        {status !== "unsupported" && (
          <CardContent className="pt-0">
            <div className="flex items-center gap-3">
              <Select
                value={device?.id ?? ""}
                onValueChange={(id) => {
                  const d = outputs.find((o) => o.id === id);
                  if (d) selectDevice(d);
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select MIDI output..." />
                </SelectTrigger>
                <SelectContent>
                  {outputs.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No MIDI devices found
                    </SelectItem>
                  ) : (
                    outputs.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name}
                        {o.detectedDeviceId && ` (${o.detectedDeviceId})`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Channel Test */}
      {status !== "unsupported" && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Channel Test</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Send a test note (C3) on each of the {channelCount} {profile.displayName} channels
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {sentCount > 0 && (
                  <Badge variant="secondary" className="font-mono">
                    {sentCount}/{channelCount}
                  </Badge>
                )}
                <Button
                  onClick={runTest}
                  disabled={!device || isTesting}
                  size="sm"
                  title={`Send test note to all ${channelCount} channels`}
                >
                  {isTesting ? "Testing..." : "Test All Channels"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-0.5">
              {profile.tracks.map((t, i) => (
                <ChannelTestRow
                  key={`${t.channel}-${i}`}
                  channel={t.channel}
                  trackName={t.name}
                  trackType={t.type}
                  result={getResult(t.channel)}
                  onTest={() => testChannel(t.channel)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Troubleshooting</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 text-sm text-muted-foreground space-y-2">
          <p>1. Connect SEQTRAK to your Mac via USB-C cable</p>
          <p>2. Make sure SEQTRAK is powered on</p>
          <p>3. Use Chrome, Edge, or Firefox (Safari does not support Web MIDI)</p>
          <p>4. If no device appears, try unplugging and reconnecting the USB cable</p>
          <p>5. Click &quot;Test All Channels&quot; to verify each track receives MIDI</p>
        </CardContent>
      </Card>
    </main>
  );
}
