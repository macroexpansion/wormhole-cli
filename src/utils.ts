import fs from 'fs'
import { Keypair } from '@solana/web3.js'
import bs58 from 'bs58'

export const getKeypair = (path: string): Keypair => {
    const secretKey = Uint8Array.from(
        JSON.parse(fs.readFileSync(path) as unknown as string)
    )
    return Keypair.fromSecretKey(secretKey)
}

export const bs58ToBytes = (secretKey: string, filename: string) => {
    const b = bs58.decode(secretKey)
    const j = new Uint8Array(
        b.buffer,
        b.byteOffset,
        b.byteLength / Uint8Array.BYTES_PER_ELEMENT
    )
    fs.writeFileSync(`${filename}`, `[${j}]`)
}
