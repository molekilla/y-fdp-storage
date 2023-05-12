import * as Block from 'multiformats/block'
import { hexlify } from 'ethers/lib/utils'
import { SequentialFeed } from './feeds/sequential-feed'
import { Bee } from '@ethersphere/bee-js'

/**
 * Defines a block (chunk) stored in the feed.
 */
interface Block {
  state: Uint8Array | string
  timestamp: any
}

export class FeedStorage {
  constructor(
    public bee: Bee,
    public feed: SequentialFeed,
    public signer: any,
    public topic: any,
    public postageBatchId: any,
  ) {}
  /**
   * Reads the last state from the feed.
   * @returns contract state
   */
  async storageRead(): Promise<{ state: Uint8Array }> {
    const feedR = this.feed.makeFeedR(this.topic, this.signer.address)
    const last = await feedR.getLastUpdate()
    const state = await this.bee.downloadData(last.reference)

    return {
      ...JSON.parse(state.text()),
      ...last,
    }
  }

  /**
   * Writes the state to the feed.
   * @param state The state to be written.
   * @returns void
   */
  async storageWrite(state: Uint8Array) {
    const feedRW = this.feed.makeFeedRW(this.topic, this.signer)

    const block: Block = {
      state: hexlify(state),
      timestamp: Date.now(),
    }
    const reference = await this.bee.uploadData(this.postageBatchId, JSON.stringify(block))

    return feedRW.setLastUpdate(this.postageBatchId, reference.reference)
  }

  /**
   * Writes the state to the feed.
   * @param schemaFn  The schema function to be used to encode the state.
   * @param state The state to be written.
   * @returns void
   */
  async storageWriteWithSchema(schemaFn: (state: string) => string, state: Uint8Array) {
    const feedRW = this.feed.makeFeedRW(this.topic, this.signer)

    let block
    if (state) {
      block = schemaFn(hexlify(state))
    } else {
      block = schemaFn('')
    }
    const reference = await this.bee.uploadData(this.postageBatchId, JSON.stringify(block))

    return feedRW.setLastUpdate(this.postageBatchId, reference.reference)
  }
}
