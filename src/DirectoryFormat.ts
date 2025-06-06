import moment from 'moment'
import path from 'node:path'
import prettyBytes from 'pretty-bytes'
import type { S3Object } from './S3Service.js'
import { MediaType, MediaTypes } from './MediaTypes.js'
import mime from 'mime-types'

export enum ObjectType {
  DIRECTORY,
  FILE
}

export interface ObjectBase {
  type: ObjectType
  name: string
  fullname: string
}

export interface Directory extends ObjectBase {
  type: ObjectType.DIRECTORY
  pathSlices: string[]
  directories: Map<string, Directory>
  files: Map<string, File>
}

export interface File extends ObjectBase {
  type: ObjectType.FILE
  mediaType: MediaType
  contentType: string
  viewerAvailable: boolean
  lastModified: string
  size: string
}

export class DirectoryFormat {
  public parse(objects: S3Object[]): Directory {
    const rootDirectory = this.initRootDirectory()

    for (const object of objects) {
      this.makeDirectoryRecursive(rootDirectory, path.dirname(object.Key ?? ''))
      this.makeFile(rootDirectory, object)
    }

    return rootDirectory
  }

  private initRootDirectory = (): Directory => ({
    type: ObjectType.DIRECTORY,
    pathSlices: [],
    name: '.',
    fullname: '',
    directories: new Map(),
    files: new Map()
  })

  private makeDirectoryRecursive(
    rootDirectory: Directory,
    directoryPath: string
  ): void {
    const directorySlices = this.getPathSlices(directoryPath)
    for (const parentDirectoryPrefix of directorySlices) {
      const currentDirectory = this.findDirectory(
        rootDirectory,
        parentDirectoryPrefix
      )

      if (currentDirectory !== undefined) continue

      const parentDirectory = this.findDirectory(
        rootDirectory,
        path.dirname(parentDirectoryPrefix)
      )

      parentDirectory?.directories.set(path.basename(parentDirectoryPrefix), {
        type: ObjectType.DIRECTORY,
        pathSlices: this.getPathSlices(parentDirectoryPrefix),
        name: path.basename(parentDirectoryPrefix),
        fullname: parentDirectoryPrefix,
        directories: new Map(),
        files: new Map()
      })
    }
  }

  private makeFile(rootDirectory: Directory, object: S3Object): void {
    const targetDirectory = this.findDirectory(
      rootDirectory,
      path.dirname(object.Key ?? '')
    )

    const mediaType = MediaTypes.getMediaType(object.Key ?? '')

    targetDirectory?.files.set(path.basename(object.Key ?? ''), {
      type: ObjectType.FILE,
      name: path.basename(object.Key ?? ''),
      mediaType: mediaType,
      contentType:
        mime.contentType(path.extname(object.Key ?? '')) ||
        'application/octet-stream',
      viewerAvailable: mediaType !== 'other',
      fullname: object.Key ?? '',
      lastModified: moment
        .utc(object.LastModified ?? new Date())
        .format('YYYY-MM-DD hh:mm:ss UTC'),
      size: prettyBytes(object.Size ?? 0)
    })
  }

  private getPathSlices(pathOrigin: string): string[] {
    return pathOrigin
      .split('/')
      .map((v, i, a) => path.join(...a.slice(0, i), v))
  }

  private findDirectory(
    rootDirectory: Directory,
    path: string
  ): Directory | undefined {
    if (path === '.') {
      return rootDirectory
    }

    let currentDirectory = rootDirectory as Directory | undefined

    for (const directorySlice of path.split('/')) {
      if (currentDirectory === undefined) continue
      currentDirectory = currentDirectory.directories.get(directorySlice)
    }

    return currentDirectory
  }
}
