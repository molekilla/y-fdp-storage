import * as Y from 'yjs'
import { FdpStoragePersistence } from '../../src/adapter'
import { ethers } from 'ethers'
import { BeeDebug, Bee } from '@ethersphere/bee-js'
import feeds from '../../src/swarm-feeds'

async function sleep(ms = 1000): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

describe('y-fdp-storage', () => {
  let persistence
  let postageBatchId

  beforeEach(async () => {
    const bee = new Bee('http://localhost:1633')
    const seqFeed = new feeds.SequentialFeed(bee)
    const wallet = ethers.Wallet.createRandom()

    // check stamps
    const beeDebugUrl = process.env.BEE_DEBUG_API_URL || 'http://localhost:1635'
    const beeDebug = new BeeDebug(beeDebugUrl)
    postageBatchId = await beeDebug.createPostageBatch('1', 20)

    //wait for chunk to be usable
    let postageBatch
    do {
      postageBatch = await beeDebug.getPostageBatch(postageBatchId)

    //  console.log('Waiting 1 sec for batch ID settlement...')
      await sleep()
    } while (!postageBatch.usable)

    const topic = '/crdt/document/test'
    persistence = new FdpStoragePersistence(bee, seqFeed, wallet, topic, postageBatchId)
  })

  it('when created should be defined', async () => {
    expect(persistence).toBeDefined()
  })

  it('when syncing one change, should update', async () => {
    const doc = new Y.Doc()

    doc.on('update', async update => {
      await persistence.storeUpdate(update)
    })

    doc.getArray('test').insert(0, ['Hello', 'World'])

    const mostRecentDoc = await persistence.getYDoc()
    expect(mostRecentDoc.getArray('test').toArray()).toEqual(['Hello', 'World'])
  })

  it('when syncing one or more changes, should update', async () => {
    const doc = new Y.Doc()

    doc.on('update', async update => {
      await persistence.storeUpdate(update)
    })

    doc.getArray('test').insert(0, ['Hello', 'World'])
    doc.getArray('test').insert(1, ['Hola', 'Mundo'])

    const mostRecentDoc = await persistence.getYDoc()
    expect(mostRecentDoc.getArray('test').toArray()).toEqual(['Hello', 'World'])
  })
})
