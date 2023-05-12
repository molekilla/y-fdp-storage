import * as Y from 'yjs'
import { FeedStorage } from './storage'
import { ethers } from 'ethers'
import { Bee } from '@ethersphere/bee-js'
import { SequentialFeed } from './feeds/sequential-feed'
import { arrayify, hexlify } from 'ethers/lib/utils'
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
   * Writes the state to the feed.
   * @param schemaFn  The schema function to be used to encode the state.
   * @param state The state to be written.
   * @returns void
   */
  async storeWithSchema(schemaFn: (state: string) => string, state: Uint8Array) {
    return this.stateStorage.storageWriteWithSchema(schemaFn, state)
  }
  /**
   * Converts a hex string to a Uint8Array.
   * @param hexstring hex string
   * @returns Uint8Array
   * */
  fromHexToUint8Array(hexstring: string): Uint8Array {
    return arrayify(hexstring)
  }

  /**
   * Converts a Uint8Array to a hex string.
   * @param arr Uint8Array
   * @returns hex string
   * */
  fromUint8ArrayToHex(arr: Uint8Array): string {
    return hexlify(arr)
  }

  /**
   * Writes the update to the feed.
   * @param update The update to be written. Handles exceptions internally.
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
   * Writes the update to the feed.
   * @param update The update to be written. Errors will be thrown if the update is not valid.
   * @returns void
   */
  async store(update) {
    await this.stateStorage.storageWrite(update)
  }

  /**
   * Reads the last state from the feed.
   * @returns Uint8Array
   */
  async read() {
    const updates = await this.stateStorage.storageRead()

    return updates.state
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
