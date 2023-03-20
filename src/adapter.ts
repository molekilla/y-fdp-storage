import * as Y from 'yjs'
import { FeedStorage } from './storage'
import { ethers } from 'ethers'
import { Bee } from '@ethersphere/bee-js'
import { SequentialFeed } from './feeds/sequential-feed'
import { arrayify } from 'ethers/lib/utils'
import { Subject } from 'rxjs'

/**
 * Persistence layer for Yjs documents.
 * This class is responsible for storing and retrieving Yjs documents.
 */
export class FdpStoragePersistence {
  private stateStorage: FeedStorage
  public onUpdates: Subject<any> = new Subject()
  /**
   * @param bee Bee instance
   * @param signer Signer instance
   * @param topic Topic
   * @param postageBatchId Postage batch id
   */
  constructor(public bee: Bee, public signer: any, public topic: string, public postageBatchId: any) {
    const hash = ethers.utils.id(topic).slice(2)
    const feed = new SequentialFeed(bee)
    this.stateStorage = new FeedStorage(bee, feed, signer, hash, postageBatchId)
  }

  /**
   * Writes the update to the feed.
   * @param update The update to be written.
   * @returns void
   */
  async storeUpdate(update) {
    try {
      const current = await this.stateStorage.storageRead()
      const temp = arrayify(current.state)

      const merged = Y.mergeUpdates([temp, update])
      await this.stateStorage.storageWrite(merged)
    } catch (e) {
      // 404 not found
      await this.stateStorage.storageWrite(update)
    }
  }
  /**
   * Reads the last state from the feed.
   * @returns contract state
   */
  async getYDoc() {
    const updates = await this.stateStorage.storageRead()
    const doc = new Y.Doc()

    Y.applyUpdate(doc, arrayify(updates.state))

    return doc
  }

  /**
   *  Subscribes to the feed and emits updates.
   * @returns void
   * @emits {update: Uint8Array, timestamp: number, reference: string}
   **/
  subscribe(doc: Y.Doc, interval = 15000) {
    const temp = setInterval(async () => {
      const updates = await this.stateStorage.storageRead()
      Y.applyUpdate(doc, arrayify(updates.state))
      this.onUpdates.next({ update: arrayify(updates.state), ...updates })
    }, interval)

    return () => clearInterval(temp)
  }

  /**
   *  Auto updates the feed.
   * @returns void
   * @emits {update: Uint8Array, timestamp: number, reference: string}
   **/
  autoUpdate(doc: Y.Doc, interval = 5000) {
    const temp = setInterval(async () => {
      const update = Y.encodeStateAsUpdate(doc)
      await this.stateStorage.storageWrite(update)
    }, interval)

    return () => clearInterval(temp)
  }
}
