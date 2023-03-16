import * as Y from 'yjs'
import { FeedStorage } from './storage'
import { ethers } from 'ethers'
import { Bee } from '@ethersphere/bee-js'
import { SequentialFeed } from './feeds/sequential-feed'
import { arrayify } from 'ethers/lib/utils'

/**
 * Persistence layer for Yjs documents.
 * This class is responsible for storing and retrieving Yjs documents.
 */
export class FdpStoragePersistence {
  private stateStorage: FeedStorage

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
    let current = null
    try {
      current = await this.stateStorage.storageRead()
      current = arrayify(current.state)
    } catch (e) {
    } finally {
      let merged
      if (current) {
        merged = Y.mergeUpdates([current, update])
      } else {
        merged = update
      }
      await this.stateStorage.storageWrite(merged)
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
}
