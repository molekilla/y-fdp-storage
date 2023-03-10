import * as Block from 'multiformats/block'
import { arrayify, hexlify } from 'ethers/lib/utils'
import feeds from './swarm-feeds'
import { Bee } from '@ethersphere/bee-js'
import * as bmt from '@fairdatasociety/bmt-js'

/**
 * Defines a block (chunk) stored in the feed.
 */
interface Block {
  state: Uint8Array | string
  chunk: any
  timestamp: any
}

export class FeedStorage {
  constructor(
    public bee: Bee,
    public feed: feeds.SequentialFeed,
    public signer: any,
    public topic: string,
    public postageBatchId: any,
  ) {}
  /**
   * Reads the last state from the feed.
   * @returns contract state
   */
  async storageRead(): Promise<{ state: Uint8Array }> {
    const feedR = this.feed.makeFeedR(this.topic, this.signer.address)
    const last = await feedR.findLastUpdate()

    const data = await this.bee.downloadData(last.reference)
    const block = data.json() as any

    return {
      state: arrayify(block.state),
    }
  }

  /**
   * Writes the state to the feed.
   * @param state The state to be written.
   * @returns void
   */
  async storageWrite(state: Uint8Array) {
    const feedRW = this.feed.makeFeedRW(this.topic, this.signer)

    const chunk = bmt.makeChunk(state)

    const block: Block = {
      state: hexlify(state),
      chunk: Buffer.from(chunk.address()).toString('hex'),
      timestamp: Date.now(),
    }

    const reference = await this.bee.uploadData(this.postageBatchId, JSON.stringify(block))

    return feedRW.setLastUpdate(this.postageBatchId, reference.reference)
  }
}
