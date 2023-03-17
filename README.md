# y-fdp-storage
fdp-storage database provider for Yjs

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [API](#api)
- [References](#references)
- [License](#license)

## Install

`npm install y-fdp-storage`

## Usage
```typescript
import * as Y from 'yjs'
import { Bee } from '@ethersphere/bee-js'
import { hexToBytes, makePrivateKeySigner, FdpStoragePersistence } from 'y-fdp-storage'

const postageBatchId = process.env.BEE_POSTAGE || '1c082c5e642e15d49b6689f5437c2eb9e6aa9c546a8ed1d11d0024b043bca371'
const bee = new Bee('http://localhost:1633')

const testIdentity = {
  privateKey: '634fb5a872396d9693e5c9f9d7233cfa93f395c093371017ff44aa9ae6564cdd',
  publicKey: '03c32bb011339667a487b6c1c35061f15f7edc36aa9a0f8648aba07a4b8bd741b4',
  address: '8d3766440f0d7b949a5e32995d09619a7f86e632',
}
const wallet = makePrivateKeySigner(hexToBytes(testIdentity.privateKey))
const topic = '/crdt/document/test'

// Create FdpStoragePersistence object
const persistence = new FdpStoragePersistence(bee, wallet, topic, postageBatchId)

// Create Yjs document
const doc = new Y.Doc()

// On update event, store updates to bee
doc.on('update', async update => {
    await persistence.storeUpdate(update)
})

doc.getText('test').insert(0, 'Hello World')

const mostRecentDoc = await persistence.getYDoc()
// Hello World

const close = persistence.subscribe(doc);
```


## Usage with fdp-storage
```typescript
import * as Y from 'yjs'
import { FdpStorage } from '@fairdatasociety/fdp-storage'
const { hexToBytes } = Utils
import { hexToBytes, makePrivateKeySigner, FdpStoragePersistence } from 'y-fdp-storage'

const postageBatchId = process.env.BEE_POSTAGE || '1c082c5e642e15d49b6689f5437c2eb9e6aa9c546a8ed1d11d0024b043bca371'
const fdp = new FdpStorage('http://localhost:1633', postageBatchId)

const topic = '/crdt/document/test'

// Create FdpStoragePersistence object
const persistence = new FdpStoragePersistence(fdp.connection.bee, fdp.account.wallet, topic, fdp.connection.postageBatchId)

// Create Yjs document
const doc = new Y.Doc()

// On update event, store updates to bee
doc.on('update', async update => {
    await persistence.storeUpdate(update)
})

doc.getText('test').insert(0, 'Hello World')

const mostRecentDoc = await persistence.getYDoc()
// Hello World
```

## API

See `/docs` for generated TypeScript documentation.

## Maintainers

[molekilla](https://github.com/molekilla)

## References

[Yjs](https://docs.yjs.dev/)

## License


[Apache License 2.0](./LICENSE)
