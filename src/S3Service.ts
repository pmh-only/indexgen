import fs from 'node:fs'
import ignore from 'ignore'
import {
  type _Object,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3'
import mime from 'mime-types'
import path from 'node:path'
import { createHash } from 'crypto'

export interface S3Object extends _Object {
  ContentType?: string
  ViewerAvailable?: boolean
}

export class S3Service {
  private readonly ignoreFile = ignore().add(
    fs.readFileSync('./configs/ignore').toString()
  )

  private readonly client = new S3Client({
    region: process.env.S3_REGION,
    credentials:
      process.env.S3_ACCESS_TOKEN === undefined ||
      process.env.S3_SECRET_TOKEN === undefined
        ? undefined
        : {
            accessKeyId: process.env.S3_ACCESS_TOKEN,
            secretAccessKey: process.env.S3_SECRET_TOKEN
          },

    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: true
  })

  public async getAllObjects(): Promise<S3Object[]> {
    const objects: S3Object[] = []
    let ContinuationToken = undefined as string | undefined

    for (;;) {
      const command = new ListObjectsV2Command({
        Bucket: 'pub',
        ContinuationToken
      })

      const response = await this.client.send(command)

      objects.push(
        ...(response.Contents?.filter(
          (v) => !this.ignoreFile.ignores(v.Key ?? '')
        ) ?? [])
      )

      if (response.IsTruncated === false) {
        break
      }

      ContinuationToken = response.NextContinuationToken
    }

    for (const object of objects) {
      object.ContentType =
        mime.contentType(path.extname(object.Key ?? '')) ||
        'application/octet-stream'

      object.ViewerAvailable = /^(image|audio|video)\/.*$/.test(
        object.ContentType ?? ''
      )
    }

    return objects
  }

  public async putAllTextObjects(objects: Map<string, string>): Promise<void> {
    const jobs = [...objects.entries()].map(
      ([Key, Body]) =>
        new Promise((resolve, reject) => {
          const command = new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key,
            Body,
            ContentType: 'text/html',
            IfNoneMatch: this.md5Quoted(Body)
          })

          this.client
            .send(command)
            .then(resolve.bind(this))
            .catch(reject.bind(this))
        })
    )

    await Promise.allSettled(jobs)
  }

  public async putAllBinaryObjects(objects: Map<string, string>) {
    const jobs = [...objects.entries()].map(
      ([Key, filepath]) =>
        new Promise((resolve, reject) => {
          const Body = fs.readFileSync(filepath)
          const command = new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key,
            Body,
            IfNoneMatch: this.md5Quoted(Body),
            ContentType:
              mime.contentType(path.extname(filepath)) ||
              'application/octet-stream'
          })

          this.client
            .send(command)
            .then(resolve.bind(this))
            .catch(reject.bind(this))
        })
    )

    await Promise.allSettled(jobs)
  }

  private md5Quoted(body: string | Buffer): string {
    const hash = createHash('md5').update(body).digest('hex')
    return `"${hash}"`
  }
}
