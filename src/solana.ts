import {
    Token,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import { NodeHttpTransport } from '@improbable-eng/grpc-web-node-http-transport'
import {
    TokenAccountsFilter,
    clusterApiUrl,
    Connection,
    LAMPORTS_PER_SOL,
    PublicKey,
    SystemProgram,
    Keypair,
    Transaction,
} from '@solana/web3.js'
import * as ethers from 'ethers'
import {
    getForeignAssetSolana,
    getForeignAssetEth,
    hexToUint8Array,
    nativeToHexString,
    CHAIN_ID_SOLANA,
    CONTRACTS,
    attestFromSolana,
    attestFromEth,
    setDefaultWasm,
    parseSequenceFromLogSolana,
    getEmitterAddressSolana,
    getSignedVAAWithRetry,
    createWrappedOnEth,
    tryNativeToUint8Array,
    tryNativeToHexString,
    TokenImplementation__factory,
    transferFromSolana,
    redeemOnEth,
    getIsTransferCompletedEth,
} from '@certusone/wormhole-sdk'
import {
    getKeypair,
    base58ToKeypair,
    CHAIN,
    CHAIN_ID,
    EVM_NODE_URL,
} from './utils'

setDefaultWasm('node')

const SOLANA_HOST = clusterApiUrl('devnet')
const TEST_ERC20 = '0x2D8BE6BF0baA74e0A907016679CaE9190e80dD0A'
const TEST_SOLANA_TOKEN = '5DNHtAQtn5scsGgUqpdVf2377GDGgBforX4UnCNynKph'
const WORMHOLE_RPC_HOSTS = ['https://wormhole-v2-testnet-api.certus.one']
const ETH_PRIVATE_KEY =
    '8d5e16c399231f1e8695eaf7b7a6c6384823157e8e98e2ec2d096ace9a68294a'
const ETH_PUBLIC_KEY = '0xD0e09806Ffe02E172393B3B9c66c98d983b83A9F'

export const checkAttestSolanaToken = async (
    solanaToken: string,
    chain: CHAIN
) => {
    const provider = new ethers.providers.JsonRpcProvider(EVM_NODE_URL[chain])
    const address = await getForeignAssetEth(
        CONTRACTS.TESTNET[chain].token_bridge,
        provider,
        'solana',
        tryNativeToUint8Array(solanaToken, 'solana')
    )
    console.log(`token address on ${chain}: ${address}`)
}

export const attestSolanaToken = async (
    solanaToken: string,
    srcSignerPK: string,
    dstSignerPK: string,
    destinationChain: CHAIN
) => {
    try {
        const keypair: Keypair = base58ToKeypair(srcSignerPK)
        const payerAddress = keypair.publicKey.toString()

        const connection = new Connection(SOLANA_HOST, 'confirmed')

        const transaction = await attestFromSolana(
            connection,
            CONTRACTS.TESTNET.solana.core,
            CONTRACTS.TESTNET.solana.token_bridge,
            payerAddress,
            TEST_SOLANA_TOKEN
        )
        // sign, send, and confirm transaction
        transaction.partialSign(keypair)
        const txid = await connection.sendRawTransaction(
            transaction.serialize()
        )
        await connection.confirmTransaction(txid)
        console.log('solana attest token transaction:', txid)

        const info = await connection.getTransaction(txid)
        if (!info) {
            throw new Error(
                'An error occurred while fetching the transaction info'
            )
        }
        // get the sequence from the logs (needed to fetch the vaa)
        const sequence = parseSequenceFromLogSolana(info)
        const emitterAddress = await getEmitterAddressSolana(
            CONTRACTS.TESTNET.solana.token_bridge
        )
        // poll until the guardian(s) witness and sign the vaa
        console.log('getting signed VAA with retry...')
        const { vaaBytes: signedVAA } = await getSignedVAAWithRetry(
            WORMHOLE_RPC_HOSTS,
            CHAIN_ID_SOLANA,
            emitterAddress,
            sequence,
            {
                transport: NodeHttpTransport(),
            }
        )
        // console.log(signedVAA)
        // create a signer for Eth
        const provider = new ethers.providers.JsonRpcProvider(
            EVM_NODE_URL[destinationChain]
        )
        const signer = new ethers.Wallet(dstSignerPK, provider)
        try {
            console.log(`creating wrapped token on ${destinationChain}`)
            await createWrappedOnEth(
                CONTRACTS.TESTNET[destinationChain].token_bridge,
                signer,
                signedVAA
            )
            const address = await getForeignAssetEth(
                CONTRACTS.TESTNET[destinationChain].token_bridge,
                provider,
                'solana',
                tryNativeToUint8Array(solanaToken, 'solana')
            )
            console.log(`token address on ${destinationChain}: ${address}`)
        } catch (e) {
            // this could fail because the token is already attested (in an unclean env)
        }
        // provider.destroy()
    } catch (e) {
        console.error(e)
        console.error(
            `An error occurred while trying to attest from Solana to ${destinationChain}`
        )
    }
}

export const transferSolanaToken = async (
    transferAmount: string,
    solanaToken: string,
    targetAddress: string,
    senderPrivateKey: string,
    payerPrivateKey: string,
    destinationChain: string
) => {
    const provider = new ethers.providers.JsonRpcProvider(
        EVM_NODE_URL[destinationChain]
    )
    const signer = new ethers.Wallet(payerPrivateKey, provider)
    // const targetAddress = await signer.getAddress()

    // create a keypair for Solana
    // const keypair: Keypair = getKeypair('./sender2.json')
    const keypair: Keypair = base58ToKeypair(senderPrivateKey)
    const payerAddress = keypair.publicKey.toString()
    console.log('payer address: ', payerAddress)
    console.log(`receiver address on ${destinationChain}: ${targetAddress}`)

    // find the associated token account
    const fromAddress = (
        await Token.getAssociatedTokenAddress(
            ASSOCIATED_TOKEN_PROGRAM_ID,
            TOKEN_PROGRAM_ID,
            new PublicKey(solanaToken),
            keypair.publicKey
        )
    ).toString()

    const connection = new Connection(SOLANA_HOST, 'confirmed')

    // Get the initial solana token balance
    const tokenFilter: TokenAccountsFilter = {
        programId: TOKEN_PROGRAM_ID,
    }
    let results = await connection.getParsedTokenAccountsByOwner(
        keypair.publicKey,
        tokenFilter
    )
    let initialSolanaBalance: number = 0
    for (const item of results.value) {
        const tokenInfo = item.account.data.parsed.info
        const address = tokenInfo.mint
        const amount = tokenInfo.tokenAmount.uiAmount
        if (tokenInfo.mint === solanaToken) {
            initialSolanaBalance = amount
        }
    }

    // Get the initial wallet balance on Eth
    const originAssetHex = tryNativeToHexString(solanaToken, CHAIN_ID_SOLANA)
    if (!originAssetHex) {
        throw new Error('originAssetHex is null')
    }
    const foreignAsset = await getForeignAssetEth(
        CONTRACTS.TESTNET[destinationChain].token_bridge,
        provider,
        CHAIN_ID_SOLANA,
        hexToUint8Array(originAssetHex)
    )
    if (!foreignAsset) {
        throw new Error('foreignAsset is null')
    }
    let token = TokenImplementation__factory.connect(foreignAsset, signer)
    const initialBalOnEth = await token.balanceOf(await signer.getAddress())
    const initialBalOnEthFormatted = ethers.utils.formatUnits(
        initialBalOnEth._hex,
        9
    )

    // transfer the test token
    const amount = ethers.utils.parseUnits(transferAmount, 9).toBigInt()
    console.log('transfer amount:', amount)

    const transaction = await transferFromSolana(
        connection,
        CONTRACTS.TESTNET.solana.core,
        CONTRACTS.TESTNET.solana.token_bridge,
        payerAddress,
        fromAddress,
        solanaToken,
        amount,
        tryNativeToUint8Array(targetAddress, CHAIN_ID[destinationChain]),
        CHAIN_ID[destinationChain]
    )
    // sign, send, and confirm transaction
    transaction.partialSign(keypair)
    const txid = await connection.sendRawTransaction(transaction.serialize())
    console.log('solana tranfer token transaction:', txid)

    await connection.confirmTransaction(txid)
    const info = await connection.getTransaction(txid)
    if (!info) {
        throw new Error('An error occurred while fetching the transaction info')
    }
    // get the sequence from the logs (needed to fetch the vaa)
    const sequence = parseSequenceFromLogSolana(info)
    const emitterAddress = await getEmitterAddressSolana(
        CONTRACTS.TESTNET.solana.token_bridge
    )
    // poll until the guardian(s) witness and sign the vaa
    console.log('getting signed VAA with retry...')
    const { vaaBytes: signedVAA } = await getSignedVAAWithRetry(
        WORMHOLE_RPC_HOSTS,
        CHAIN_ID_SOLANA,
        emitterAddress,
        sequence,
        {
            transport: NodeHttpTransport(),
        }
    )
    console.log(`redeeming on ${destinationChain}...`)
    await redeemOnEth(
        CONTRACTS.TESTNET[destinationChain].token_bridge,
        signer,
        signedVAA
    )
    console.log('checking if transfer is completed...')
    const completed = await getIsTransferCompletedEth(
        CONTRACTS.TESTNET[destinationChain].token_bridge,
        provider,
        signedVAA
    )
    if (!completed) {
        throw new Error('transfer not completed')
    }
    console.log('done')
}

!(async () => {
    // await attestSolToEth()
    // await checkAttestToken()
    // await transferToken()
})()
