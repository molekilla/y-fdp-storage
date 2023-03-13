import * as Y from 'yjs'
import { FeedStorage } from './storage'
import { ethers } from 'ethers'
import { Bee } from '@ethersphere/bee-js'
import { SequentialFeed } from './feeds/sequential-feed'

/**
 * Persistence layer for Yjs documents.
 * This class is responsible for storing and retrieving Yjs documents.
 */
export class FdpStoragePersistence {
  private stateStorage: FeedStorage

  /**
   * @param bee Bee instance
   * @param feed Swarm feed instance
   * @param signer Signer instance
   * @param topic Topic
   * @param postageBatchId Postage batch id
   */
  constructor(
    public bee: Bee,
    public feed: SequentialFeed,
    public signer: any,
    public topic: string,
    public postageBatchId: any,
  ) {
    const hash = ethers.utils.id(topic).slice(2)
    const h = ethers.utils.arrayify(hash)

    this.stateStorage = new FeedStorage(bee, feed, signer, h, postageBatchId)
  }

  /**
   * Writes the update to the feed.
   * @param update The update to be written.
   * @returns void
   */
  async storeUpdate(update) {
    const current = await this.stateStorage.storageRead()
    const merged = Y.mergeUpdates([current, update])
    await this.stateStorage.storageWrite(merged)
  }

  /**
   * Reads the last state from the feed.
   * @returns contract state
   */
  async getYDoc() {
    const updates = await this.stateStorage.storageRead()
    const doc = new Y.Doc()
    Y.applyUpdate(doc, updates.state)

    return doc
  }
}
