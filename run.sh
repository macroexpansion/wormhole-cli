#!/bin/bash

PK=8d5e16c399231f1e8695eaf7b7a6c6384823157e8e98e2ec2d096ace9a68294a # evm
# PK=26qPmXeYwmdmocLA6bBQaHKbR5DBABjHx4Y1s86jmBB1Y7SgRYtaPhqAsCr6S7zUZYdqr3VLJVttjgV3N27V8HXL # solana
yarn ts-node src/index.ts transfer 0.01 0x4B245F0F489a790d1480923a83926c56915a9BEa \
    --from bsc \
    --to ethereum \
    --senderPK $PK \
    --payerPK 8d5e16c399231f1e8695eaf7b7a6c6384823157e8e98e2ec2d096ace9a68294a \
    --testnet
