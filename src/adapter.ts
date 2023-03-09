import * as Y from 'yjs'
import { SequentialFeed } from './swarm-feeds'
import { Bee } from '@ethersphere/bee-js'
import { FeedStorage } from './storage'

/**
 * Persistence layer for Yjs documents.
 * This class is responsible for storing and retrieving Yjs documents.
 */
export class FdpStoragePersistence {
  private stateStorage: FeedStorage
  public synced: boolean = false

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
    this.stateStorage = new FeedStorage(bee, feed, signer, topic, postageBatchId)
  }


  /**
   * Writes the update to the feed.
   * @param update The update to be written.
   * @returns void
   */
  async storeUpdate(update) {
    await this.stateStorage.storageWrite(update)
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
