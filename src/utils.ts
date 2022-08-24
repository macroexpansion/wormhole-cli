import fs from 'fs'
import { Keypair } from '@solana/web3.js'
import bs58 from 'bs58'
import {
    CHAIN_ID_POLYGON,
    CHAIN_ID_ETH,
    CHAIN_ID_SOLANA,
    CHAIN_ID_BSC,
    CHAIN_ID_AVAX,
} from '@certusone/wormhole-sdk'
import { clusterApiUrl } from '@solana/web3.js'

export const SOLANA_HOST = {
    TESTNET: clusterApiUrl('devnet'),
    MAINNET: clusterApiUrl('mainnet-beta'),
}

export const WORMHOLE_RPC_HOSTS = {
    TESTNET: ['https://wormhole-v2-testnet-api.certus.one'],
    MAINNET: [
        'https://wormhole-v2-mainnet-api.certus.one',
        'https://wormhole.inotel.ro',
        'https://wormhole-v2-mainnet-api.mcf.rocks',
        'https://wormhole-v2-mainnet-api.chainlayer.network',
        'https://wormhole-v2-mainnet-api.staking.fund',
        'https://wormhole-v2-mainnet.01node.com',
    ],
}

export const CHAIN_ID = {
    solana: CHAIN_ID_SOLANA,
    ethereum: CHAIN_ID_ETH,
    bsc: CHAIN_ID_BSC,
    polygon: CHAIN_ID_POLYGON,
    // avax: CHAIN_ID_AVAX,
}

export const EVM_NODE_URL = {
    TESTNET: {
        ethereum:
            'https://goerli.infura.io/v3/ce3211bed477493b9ece37e3b031273e',
        bsc: 'https://data-seed-prebsc-1-s1.binance.org:8545',
        polygon: 'https://rpc-mumbai.maticvigil.com/',
    },
    MAINNET: {
        ethereum:
            'https://mainnet.infura.io/v3/ce3211bed477493b9ece37e3b031273e',
        bsc: 'https://bsc-dataseed.binance.org/',
        polygon: 'https://rpc-mainnet.maticvigil.com',
    },
}

export enum CHAIN {
    SOLANA = 'solana',
    ETHEREUM = 'ethereum',
    BSC = 'bsc',
    POLYGON = 'polygon',
    // AVAX = 'avax',
}

export function getEnumValues<T extends string | number>(e: any): Array<T> {
    return typeof e === 'object' ? Object.values(e) : []
}

export const getKeypair = (path: string): Keypair => {
    const secretKey = Uint8Array.from(
        JSON.parse(fs.readFileSync(path) as unknown as string)
    )
    return Keypair.fromSecretKey(secretKey)
}

export const bs58ToBytes = (
    secretKey: string,
    filename?: string
): Uint8Array => {
    const b = bs58.decode(secretKey)
    const j: Uint8Array = new Uint8Array(
        b.buffer,
        b.byteOffset,
        b.byteLength / Uint8Array.BYTES_PER_ELEMENT
    )
    if (filename) {
        fs.writeFileSync(`${filename}`, `[${j}]`)
    }
    return j
}

export const base58ToKeypair = (base58: string): Keypair => {
    return Keypair.fromSecretKey(bs58ToBytes(base58))
}
