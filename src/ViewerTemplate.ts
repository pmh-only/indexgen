import fs from 'node:fs'
import { render } from 'ejs'
import type { Directory } from './DirectoryFormat.js'
import path from 'node:path'

export class ViewerTemplate {
  private readonly template = fs
    .readFileSync('./templates/viewer.ejs')
    .toString()

  private readonly quicklinks = JSON.parse(
    fs.readFileSync('./templates/quicklinks.json').toString()
  )

  public compileAll(rootDirectory: Directory): Map<string, string> {
    return this.compileOne(rootDirectory)
  }

  public compileOne(directory: Directory): Map<string, string> {
    const childOutputs = [...directory.directories.values()]
      .map((v) => [...this.compileOne(v)])
      .flat()

    const map = new Map<string, string>(childOutputs)
    const files = [...directory.files.values()].filter((v) => v.viewerAvailable)

    for (const file of files) {
      map.set(
        path.join(directory.fullname, file.name, 'viewer.html'),
        render(this.template, {
          file,
          quicklinks: this.quicklinks
        })
      )
    }

    return map
  }
}
