import { BlockTag } from 'viem'
import type { VercelRequest } from '@vercel/node'

import delegateStats, { DelegateStats } from '@/src/fns/delegateStats'

import loadBlockTag from '@/src/loaders/loadBlockTag'
import loadDelegators from '@/src/loaders/loadDelegators'

import { syncTip } from '@/src/commands/sync'

// /api/v1/safe.ggtest.eth/latest/delegates/top

// should support query params:
// - limit: number
// - offset: number
// - orderBy: 'power' | 'count'

export const GET = async (req: VercelRequest) => {
  const space = req.query.space as string
  const tag = req.query.space as BlockTag

  const {
    options: { totalSupply, strategies, network },
  } = req.body

  const limit = Number(req.query.limit) || 100
  const offset = Number(req.query.offset) || 0
  const orderBy = req.query.by

  if (orderBy != 'count' && orderBy != 'power') {
    return new Response('invalid orderBy', { status: 400 })
  }

  const { blockNumber, chain } = await loadBlockTag(tag, network)
  await syncTip(blockNumber, chain)

  const { delegatedPower, delegatorCount, scores } = await loadDelegators({
    space,
    strategies,
    network,
    blockNumber,
  })

  const _result = delegateStats({
    totalSupply,
    delegatedPower,
    delegatorCount,
    scores,
  })

  const result = _result
    .sort(orderBy == 'count' ? orderByCount : orderByPower)
    .slice(offset, offset + limit)

  const response = { delegates: result }

  return new Response(JSON.stringify(response))
}

function orderByCount(a: DelegateStats, b: DelegateStats) {
  return a.delegatorCount > b.delegatorCount ? -1 : 1
}
function orderByPower(a: DelegateStats, b: DelegateStats) {
  return a.votingPower > b.votingPower ? -1 : 1
}
