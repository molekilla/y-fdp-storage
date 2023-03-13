import * as Y from 'yjs'
import { FdpStoragePersistence } from '../../src/adapter'
import { ethers } from 'ethers'
import { Bee } from '@ethersphere/bee-js'
import { SequentialFeed } from '../../src/feeds/sequential-feed'

async function sleep(ms = 1000): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

describe('y-fdp-storage', () => {
  let persistence
  const postageBatchId = '54ed0da82eb85ab72f9b8c37fdff0013ac5ba0bf96ead71d4a51313ed831b9e5'

  beforeEach(async () => {
    const bee = new Bee('http://localhost:1633')
    const seqFeed = new SequentialFeed(bee)
    const wallet = ethers.Wallet.createRandom()

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
