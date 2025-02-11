export async function startCamera(): Promise<MediaStream> {
  try {
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        aspectRatio: { ideal: 1.7777 },
        facingMode: "user",
      },
    })
    return mediaStream
  } catch (error) {
    console.error("Failed to start camera:", error)
    throw new Error(error instanceof Error ? `Camera Error: ${error.message}` : "Unable to access camera")
  }
}

export function stopCamera(stream: MediaStream | null) {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop())
  }
}

