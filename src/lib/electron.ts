/** Detect whether the app is running inside Electron */
export function isElectron(): boolean {
  return (
    typeof window !== "undefined" &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    !!(window as any).electronAPI
  );
}
