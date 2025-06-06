import path from 'node:path'
import mime from 'mime-types'

export type MediaType = 'audio' | 'video' | 'image' | 'other'

export class MediaTypes {
  private static readonly mediaTypePatterns: Record<MediaType, RegExp[]> = {
    audio: [/audio\/.*/],
    video: [/video\/.*/, /application\/mp4/],
    image: [/image\/.*/],
    other: []
  }

  public static getMediaType(fileName: string): MediaType {
    const ext = path.extname(fileName).toLowerCase()
    const mimeType = mime.contentType(ext)

    if (!mimeType) {
      return 'other'
    }

    for (const [mediaType, patterns] of Object.entries(
      this.mediaTypePatterns
    )) {
      if (!patterns.some((pattern) => pattern.test(mimeType))) {
        continue
      }

      return mediaType as MediaType
    }

    return 'other'
  }
}
