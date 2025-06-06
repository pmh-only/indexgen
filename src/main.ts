import 'dotenv/config'
import { S3Service } from './S3Service.js'
import { DirectoryFormat } from './DirectoryFormat.js'
import { IndexTemplate } from './IndexTemplate.js'
import { AssetsManager } from './AssetsManager.js'

class Main {
  private readonly s3 = new S3Service()
  private readonly formatter = new DirectoryFormat()
  private readonly template = new IndexTemplate()
  private readonly assets = new AssetsManager()

  private isProcessing = false

  public async main(): Promise<void> {
    this.checkEnv()
    await this.onCycle()
    await this.assets
      .getAssetsRecursively()
      .then(this.s3.putAllBinaryObjects.bind(this.s3))

    setInterval(
      this.onCycle.bind(this),
      parseInt(process.env.CYCLE_INTERVAL_SECONDS ?? '30') * 1000
    )
  }

  private async onCycle(): Promise<void> {
    if (this.isProcessing) return

    this.isProcessing = true

    await this.runJob().catch(() => {})

    this.isProcessing = false
  }

  private async runJob(): Promise<void> {
    const objects = await this.s3.getAllObjects()
    const directory = this.formatter.parse(objects)
    const indexes = this.template.compileAll(directory)

    await this.s3.putAllTextObjects(indexes)

    console.log('Finished Cycle', new Date())
  }

  private checkEnv() {
    if (process.env.S3_BUCKET_NAME === undefined) {
      throw new Error('S3_BUCKET_NAME is not set')
    }

    if (!(parseInt(process.env.CYCLE_INTERVAL_SECONDS ?? '30') > 0)) {
      throw new Error('CYCLE_INTERVAL_SECONDS must be a positive integer')
    }
  }
}

;['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, () => {
    console.log(`Received ${signal}, exiting...`)
    process.exit(0)
  })
})

new Main().main().catch((err) => {
  console.error('Error in main:', err)
  process.exit(1)
})
