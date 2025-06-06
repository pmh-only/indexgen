import fs from 'node:fs'
import { render } from 'ejs'
import type { Directory } from './DirectoryFormat.js'
import path from 'node:path'
import moment from 'moment'

export class IndexTemplate {
  private readonly template = fs
    .readFileSync('./templates/index.ejs')
    .toString()

  public compileAll(rootDirectory: Directory): Map<string, string> {
    return this.compileOne(rootDirectory)
  }

  public compileOne(directory: Directory): Map<string, string> {
    const childOutputs = [...directory.directories.values()]
      .map((v) => [...this.compileOne(v)])
      .flat()

    const map = new Map<string, string>(childOutputs)

    map.set(
      path.join(directory.fullname, 'index.html'),
      render(this.template, {
        directory,
        indexedAt: moment.utc().format('YYYY-MM-DD HH:mm:ss UTC')
      })
    )

    return map
  }
}
