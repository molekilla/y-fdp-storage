import * as Y from 'yjs'
import { FdpStoragePersistence } from '../../src/adapter'
import { Utils } from '@ethersphere/bee-js'
const { hexToBytes } = Utils
import { Bee } from '@ethersphere/bee-js'
import { SequentialFeed } from '../../src/feeds/sequential-feed'
import { Bytes, HexString, makePrivateKeySigner } from '../../src/feeds/utils'

describe('y-fdp-storage', () => {
  let persistence
  const postageBatchId =
    process.env.BEE_POSTAGE || '1c082c5e642e15d49b6689f5437c2eb9e6aa9c546a8ed1d11d0024b043bca371'

  beforeEach(async () => {
    const bee = new Bee('http://localhost:1633')
    const seqFeed = new SequentialFeed(bee)

    const testIdentity = {
      privateKey: '634fb5a872396d9693e5c9f9d7233cfa93f395c093371017ff44aa9ae6564cdd' as HexString,
      publicKey: '03c32bb011339667a487b6c1c35061f15f7edc36aa9a0f8648aba07a4b8bd741b4' as HexString,
      address: '8d3766440f0d7b949a5e32995d09619a7f86e632' as HexString,
    }
    const wallet = makePrivateKeySigner(hexToBytes(testIdentity.privateKey) as Bytes<32>)
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
