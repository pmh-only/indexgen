import fs from 'node:fs'
import path from 'node:path'

export class AssetsManager {
  public async getAssetsRecursively(): Promise<Map<string, string>> {
    const assets = new Map<string, string>()
    const files = fs
      .readdirSync('./templates/assets', {
        recursive: true,
        withFileTypes: true
      })
      .filter((file) => file.isFile())
      .map((v) => path.join(v.parentPath, v.name))
      .map((v) => [path.join('_', path.relative('./templates/assets', v)), v])

    for (const [key, value] of files) {
      assets.set(key, value)
    }

    return assets
  }
}
