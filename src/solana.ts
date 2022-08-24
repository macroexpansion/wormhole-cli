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
    transferNativeSol,
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
    SOLANA_HOST,
    WORMHOLE_RPC_HOSTS,
} from './utils'

setDefaultWasm('node')

export const checkAttestSolanaToken = async (
    solanaToken: string,
    chain: CHAIN,
    network: string
) => {
    const provider = new ethers.providers.JsonRpcProvider(
        EVM_NODE_URL[network][chain]
    )
    const address = await getForeignAssetEth(
        CONTRACTS[network][chain].token_bridge,
        provider,
        'solana',
        tryNativeToUint8Array(solanaToken, 'solana')
    )
    console.log(`token address on ${chain}: ${address}`)
}

/* export const attestSolanaToken = async (
    solanaToken: string,
    srcSignerPK: string,
    dstSignerPK: string,
    destinationChain: CHAIN,
    network: string
) => {
    try {
        const keypair: Keypair = base58ToKeypair(srcSignerPK)
        const payerAddress = keypair.publicKey.toString()

        const connection = new Connection(SOLANA_HOST[network], 'confirmed')

        const transaction = await attestFromSolana(
            connection,
            CONTRACTS[network].solana.core,
            CONTRACTS[network].solana.token_bridge,
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
            CONTRACTS[network].solana.token_bridge
        )
        // poll until the guardian(s) witness and sign the vaa
        console.log('getting signed VAA with retry...')
        const { vaaBytes: signedVAA } = await getSignedVAAWithRetry(
            WORMHOLE_RPC_HOSTS[network],
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
            EVM_NODE_URL[network][destinationChain]
        )
        const signer = new ethers.Wallet(dstSignerPK, provider)
        try {
            console.log(`creating wrapped token on ${destinationChain}`)
            await createWrappedOnEth(
                CONTRACTS[network][destinationChain].token_bridge,
                signer,
                signedVAA
            )
            const address = await getForeignAssetEth(
                CONTRACTS[network][destinationChain].token_bridge,
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
} */

export const transferSolanaToken = async (
    transferAmount: string,
    targetAddress: string,
    senderPrivateKey: string,
    payerPrivateKey: string,
    destinationChain: string,
    network: string
): Promise<void> => {
    const provider = new ethers.providers.JsonRpcProvider(
        EVM_NODE_URL[network][destinationChain]
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
    /* const fromAddress = (
        await Token.getAssociatedTokenAddress(
            ASSOCIATED_TOKEN_PROGRAM_ID,
            TOKEN_PROGRAM_ID,
            new PublicKey(solanaToken),
            keypair.publicKey
        )
    ).toString() */

    const connection = new Connection(SOLANA_HOST[network], 'confirmed')

    // Get the initial solana token balance
    /* const tokenFilter: TokenAccountsFilter = {
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
    } */

    // Get the initial wallet balance on Eth
    /* const originAssetHex = tryNativeToHexString(solanaToken, CHAIN_ID_SOLANA)
    if (!originAssetHex) {
        throw new Error('originAssetHex is null')
    }
    const foreignAsset = await getForeignAssetEth(
        CONTRACTS[network][destinationChain].token_bridge,
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
    ) */

    // transfer the test token
    const amount = ethers.utils.parseUnits(transferAmount, 9).toBigInt()
    console.log('transfer amount:', amount)

    /* const transaction = await transferFromSolana(
        connection,
        CONTRACTS[network].solana.core,
        CONTRACTS[network].solana.token_bridge,
        payerAddress,
        fromAddress,
        solanaToken,
        amount,
        tryNativeToUint8Array(targetAddress, CHAIN_ID[destinationChain]),
        CHAIN_ID[destinationChain]
    ) */

    const transaction = await transferNativeSol(
        connection,
        CONTRACTS[network].solana.core,
        CONTRACTS[network].solana.token_bridge,
        payerAddress,
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
        CONTRACTS[network].solana.token_bridge
    )
    // poll until the guardian(s) witness and sign the vaa
    console.log('getting signed VAA with retry...')
    const { vaaBytes: signedVAA } = await getSignedVAAWithRetry(
        WORMHOLE_RPC_HOSTS[network],
        CHAIN_ID_SOLANA,
        emitterAddress,
        sequence,
        {
            transport: NodeHttpTransport(),
        }
    )
    console.log(`redeeming on ${destinationChain}...`)
    await redeemOnEth(
        CONTRACTS[network][destinationChain].token_bridge,
        signer,
        signedVAA
    )
    console.log('checking if transfer is completed...')
    let completed = await getIsTransferCompletedEth(
        CONTRACTS[network][destinationChain].token_bridge,
        provider,
        signedVAA
    )
    while (!completed) {
        await new Promise(r => setTimeout(r, 5000))
        completed = await getIsTransferCompletedEth(
            CONTRACTS[network][destinationChain].token_bridge,
            provider,
            signedVAA
        )
    }
    console.log('done')
}
