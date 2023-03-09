import * as Block from 'multiformats/block'
import { BeeSon } from '@fairdatasociety/beeson'
import { makeChunk } from '@fairdatasociety/bmt-js'
import { arrayify, hexlify } from 'ethers/lib/utils'
import { SequentialFeed } from './swarm-feeds'
import { codec, hasher } from '@fairdatasociety/beeson-multiformats'
import { BlockDecoder } from 'multiformats/codecs/interface'
import { JsonValue } from '@fairdatasociety/beeson/dist/types'
import { Bee } from '@ethersphere/bee-js'

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
    public feed: SequentialFeed,
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

    const chunk = makeChunk(state)

    const block: Block = {
      state: hexlify(state),
      chunk: Buffer.from(chunk.address()).toString('hex'),
      timestamp: Date.now(),
    }

    const reference = await this.bee.uploadData(this.postageBatchId, JSON.stringify(block))

    return feedRW.setLastUpdate(this.postageBatchId, reference.reference)
  }

  /**
   * Serializes the contract state and writes it to the feed.
   */
  async serialize(state = {}) {
    const value = new BeeSon<JsonValue>({
      json: state,
    })
    const block = await Block.encode({ value, codec, hasher })

    await this.storageWrite(block.bytes)
  }

  /** Deserializes the contract state from the feed. */
  async deserialize() {
    const data = await this.storageRead()

    // decode a block
    const state = await Block.decode({
      bytes: data.state as Uint8Array,
      codec: codec as BlockDecoder<252, BeeSon<JsonValue>>,
      hasher,
    })

    const res = await state.value

    return res.json
  }

  // get state
  getState() {
    const { bee, feed, signer, topic, postageBatchId, ...state } = this

    return state
  }

  // set state
  setState(state: object) {
    Object.assign(this, state)
  }
}
