import { command, run, subcommands } from 'cmd-ts'

import count from './count'
import pin from './pin'
import sync from './sync'
import trim from './trim'

import 'dotenv/config'

const countCommand = command({
  name: 'count',
  description: 'Counts events per space',
  args: {},
  handler: async () => {
    await count()
  },
})

const pinCommand = command({
  name: 'pin',
  description: '',
  args: {},
  handler: async () => {
    await pin()
  },
})

const syncCommand = command({
  name: 'sync',
  description: 'Ingests blocks and inserts db rows',
  args: {},
  handler: async () => {
    await sync()
  },
})

const trimCommand = command({
  name: 'trim',
  description: 'Produces slim down version of Safe allocations',
  args: {},
  handler: async () => {
    await trim()
  },
})

run(
  subcommands({
    name: 'entrypoint',
    cmds: {
      count: countCommand,
      pin: pinCommand,
      sync: syncCommand,
      trim: trimCommand,
    },
  }),
  process.argv.slice(2)
)
