import fs from 'fs'
import { Keypair } from '@solana/web3.js'

export const getKeypair = (path: string): Keypair => {
    const secretKey = Uint8Array.from(
        JSON.parse(fs.readFileSync(path) as unknown as string)
    )
    return Keypair.fromSecretKey(secretKey)
}
