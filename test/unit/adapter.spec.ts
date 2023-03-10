import * as Y from 'yjs'
import { FdpStoragePersistence } from '../../src/adapter'
import { FdpStorage } from '@fairdatasociety/fdp-storage'

describe('y-fdp-storage', () => {
  let persistence

  beforeEach(() => {
    const id = `54ed0da82eb85ab72f9b8c37fdff0013ac5ba0bf96ead71d4a51313ed831b9e5`
    const client = new FdpStorage('http://localhost:1633', id)
    const topic = '/crdt/document/test'
    persistence = new FdpStoragePersistence(client.connection.bee, feed, client.account.wallet, topic, id)
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
