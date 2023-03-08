import * as Y from 'yjs'
import { Options, Pair, Batch, Query, KeyQuery } from 'interface-blockstore'
import { CID } from 'multiformats/cid'
import { FdpStorage } from '@fairdatasociety/fdp-storage'
import * as digest from 'multiformats/hashes/digest'
import { makeChunkedFile, ChunkAddress } from '@fairdatasociety/bmt-js'
import { AwaitIterable } from 'blockstore-core/dist/src/base'
import { BeeSon } from '@fairdatasociety/beeson'
import { codec, hasher } from '@fairdatasociety/beeson-multiformats'
import * as Block from 'multiformats/block'
import { JsonValue } from '@fairdatasociety/beeson/dist/types'
import { Reference } from '@ethersphere/swarm-cid'

/**
 * Asserts a beeson cid reference
 * @param cid cid
 * @param value value as Uint8Array
 * @returns true if the reference is a valid cid
 */
async function assertBeesonCidReference(cid: CID, value: Uint8Array): Promise<boolean> {
  const chunk = makeChunkedFile(value)
  const ref = chunk.address()

  const hash = digest.create(0x1b, ref).digest

  return cid.equals(hash)
}

/**
 * Converts array of number or Uint8Array to HexString without prefix.
 *
 * @param bytes   The input array
 * @param len     The length of the non prefixed HexString
 */
function bytesToHex(bytes: Uint8Array, len?: number): string {
  const hexByte = (n: number) => n.toString(16).padStart(2, '0')
  const hex = Array.from(bytes, hexByte).join('')
  if (len && hex.length !== len) {
    throw new TypeError(`Resulting HexString does not have expected length ${len}: ${hex}`)
  }

  return hex
}

/**
 * Get CID from Beeson helper
 * @param beeson beeson value
 * @returns A CID
 */
export async function getCidFromBeeson(beeson: BeeSon<JsonValue>): Promise<CID> {
  const value = beeson.serialize()
  const chunk = makeChunkedFile(value)
  const ref = chunk.address()

  return CID.decode(digest.create(0x1b, ref).digest)
}

/**
 * Get Swarm Reference from Beeson
 * @param beeson beeson value
 * @returns A Swarm Reference (chunk address)
 */
export async function getSwarmRefFromBeeson(beeson: BeeSon<JsonValue>): Promise<ChunkAddress> {
  const value = beeson.serialize()
  const chunk = makeChunkedFile(value)

  return chunk.address()
}

/**
 * Converts a swarm reference to cid
 * @param cid CID
 * @returns A swarm reference
 */
export function toSwarmRef(cid: CID): Reference {
  return bytesToHex(cid.multihash.digest) as Reference
}

/**
 * @param {IndexeddbPersistence} idbPersistence
 * @param {function(IDBObjectStore):void} [beforeApplyUpdatesCallback]
 */
export const fetchUpdates = (idbPersistence, beforeApplyUpdatesCallback = () => {}) => {
  const [updatesStore] = idb.transact(/** @type {IDBDatabase} */ idbPersistence.db, [updatesStoreName]) // , 'readonly')
  return idb
    .getAll(updatesStore, idb.createIDBKeyRangeLowerBound(idbPersistence._dbref, false))
    .then(updates => {
      beforeApplyUpdatesCallback(updatesStore)
      Y.transact(
        idbPersistence.doc,
        () => {
          updates.forEach(val => Y.applyUpdate(idbPersistence.doc, val))
        },
        idbPersistence,
        false,
      )
    })
    .then(() =>
      idb.getLastKey(updatesStore).then(lastKey => {
        idbPersistence._dbref = lastKey + 1
      }),
    )
    .then(() =>
      idb.count(updatesStore).then(cnt => {
        idbPersistence._dbsize = cnt
      }),
    )
    .then(() => updatesStore)
}

/**
 * @param {IndexeddbPersistence} idbPersistence
 * @param {boolean} forceStore
 */
export const storeState = (idbPersistence, forceStore = true) =>
  fetchUpdates(idbPersistence).then(updatesStore => {
    if (forceStore || idbPersistence._dbsize >= PREFERRED_TRIM_SIZE) {
      idb
        .addAutoKey(updatesStore, Y.encodeStateAsUpdate(idbPersistence.doc))
        .then(() => idb.del(updatesStore, idb.createIDBKeyRangeUpperBound(idbPersistence._dbref, true)))
        .then(() =>
          idb.count(updatesStore).then(cnt => {
            idbPersistence._dbsize = cnt
          }),
        )
    }
  })

/**
 * @param {string} name
 */
export const clearDocument = name => idb.deleteDB(name)

/**
 * @extends Observable<string>
 */
export class FdpStoragePersistence {
    private dbRef: number;
    private dbSize: number;
    private destroyed: boolean;
    public synced: boolean = false;
    private _storeTimeout: number
    private _storeTimeoutId: any
    /**
   * @param {string} name
   * @param {Y.Doc} doc
   */
  constructor(public fdp: FdpStorage, public name: string, public doc: Y.Doc) {
    this.dbRef = 0
    this.dbSize = 0
    this.destroyed = false
    // /**
    //  * @type {Promise<IndexeddbPersistence>}
    //  */
    // this.whenSynced = this._db.then(db => {
    //   this.db = db
    //   /**
    //    * @param {IDBObjectStore} updatesStore
    //    */
    //   const beforeApplyUpdatesCallback = updatesStore =>
    //     idb.addAutoKey(updatesStore, Y.encodeStateAsUpdate(doc))
    //   return fetchUpdates(this, beforeApplyUpdatesCallback).then(() => {
    //     if (this._destroyed) return this
    //     this.emit('synced', [this])
    //     this.synced = true
    //     return this
    //   })
    // })
    /**
     * Timeout in ms untill data is merged and persisted in idb.
     */
    this._storeTimeout = 1000
    /**
     * @type {any}
     */
    this._storeTimeoutId = null
    /**
     * @param {Uint8Array} update
     * @param {any} origin
     */
    this._storeUpdate = (update, origin) => {
      if (this.db && origin !== this) {
        const [updatesStore] = idb.transact(/** @type {IDBDatabase} */ this.db, [updatesStoreName])
        idb.addAutoKey(updatesStore, update)
        if (++this._dbsize >= PREFERRED_TRIM_SIZE) {
          // debounce store call
          if (this._storeTimeoutId !== null) {
            clearTimeout(this._storeTimeoutId)
          }
          this._storeTimeoutId = setTimeout(() => {
            storeState(this, false)
            this._storeTimeoutId = null
          }, this._storeTimeout)
        }
      }
    }
    doc.on('update', this._storeUpdate)
    this.destroy = this.destroy.bind(this)
    doc.on('destroy', this.destroy)
  }

  destroy() {
    if (this._storeTimeoutId) {
      clearTimeout(this._storeTimeoutId)
    }
    this.doc.off('update', this._storeUpdate)
    this.doc.off('destroy', this.destroy)
    this._destroyed = true
    return this._db.then(db => {
      db.close()
    })
  }

  /**
   * Destroys this instance and removes all data from indexeddb.
   *
   * @return {Promise<void>}
   */
  clearData() {
    return this.destroy().then(() => {
      idb.deleteDB(this.name)
    })
  }

  /**
   * @param {String | number | ArrayBuffer | Date} key
   * @return {Promise<String | number | ArrayBuffer | Date | any>}
   */
  get(key) {
    return this._db.then(db => {
      const [custom] = idb.transact(db, [customStoreName], 'readonly')
      return idb.get(custom, key)
    })
  }

  /**
   * @param {String | number | ArrayBuffer | Date} key
   * @param {String | number | ArrayBuffer | Date} value
   * @return {Promise<String | number | ArrayBuffer | Date>}
   */
  set(key, value) {
    return this._db.then(db => {
      const [custom] = idb.transact(db, [customStoreName])
      return idb.put(custom, value, key)
    })
  }

  /**
   * @param {String | number | ArrayBuffer | Date} key
   * @return {Promise<undefined>}
   */
  del(key) {
    return this._db.then(db => {
      const [custom] = idb.transact(db, [customStoreName])
      return idb.del(custom, key)
    })
  }
}



//   /**
//    * Adds a block to fdp-storage
//    * @param key
//    * @param val
//     */
//   async put(key: CID, val: Uint8Array): Promise<void> {
//     const isValidCid = assertBeesonCidReference(key, val)
//     if (!isValidCid) throw new Error(`Invalid CID: ${key}`)
//     this.fdp.connection.bee.uploadData(this.fdp.connection.postageBatchId, val)
//   }

//   /**
//    * Reads a block from fdp-storage
//    * @param key
//    * @returns
//    */
//   async get(key: CID): Promise<Uint8Array> {
//     const ref = toSwarmRef(key)

//     return this.fdp.connection.bee.downloadData(ref)
//   }

//   /**
//    *
//    * @param key
//    * @param options
//    * @returns
//    */
//   async has(key: CID, options?: Options | undefined): Promise<boolean> {
//     const ref = toSwarmRef(key)

//     return this.fdp.connection.bee.isReferenceRetrievable(ref.toString())
//   }

//   /**
//    *
//    * @param key
//    * @param options
//    */
//   async delete(key: CID, options?: Options | undefined): Promise<void> {
//     throw new Error('Method not implemented.')
//   }
