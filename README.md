## CLI

### Detail
```
yarn ts-node src/index.ts help transfer
```

### Transfer token example
```
yarn ts-node src/index.ts transfer 0.01 0x4B245F0F489a790d1480923a83926c56915a9BEa \
    --from solana \
    --to ethereum \
    --senderPK 26qPmXeYwmdmocLA6bBQaHKbR5DBABjHx4Y1s86jmBB1Y7SgRYtaPhqAsCr6S7zUZYdqr3VLJVttjgV3N27V8HX \ # private key of sender in Solana
    --payerPK 8d5e16c399231f1e8695eaf7b7a6c6384823157e8e98e2ec2d096ace9a68294a \ # private key of payer in Ethereum
    --testnet # run on testnet
```
