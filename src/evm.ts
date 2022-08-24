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
    approveEth,
    getForeignAssetSolana,
    getForeignAssetEth,
    getIsTransferCompletedEth,
    hexToUint8Array,
    nativeToHexString,
    CONTRACTS,
    // attestFromSolana,
    // attestFromEth,
    setDefaultWasm,
    // parseSequenceFromLogSolana,
    parseSequenceFromLogEth,
    // getEmitterAddressSolana,
    getEmitterAddressEth,
    getSignedVAAWithRetry,
    // createWrappedOnEth,
    tryNativeToUint8Array,
    tryNativeToHexString,
    // TokenImplementation__factory,
    // transferFromSolana,
    redeemOnEth,
    redeemOnSolana,
    postVaaSolana,
    transferFromEthNative,
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

export const transferEvmToken = async (
    transferAmount: string,
    targetAddress: string,
    senderPrivateKey: string,
    payerPrivateKey: string,
    sourceChain: string,
    destinationChain: string,
    network: string
): Promise<void> => {
    // create a signer for Eth
    // const sourceProvider = ethers.getDefaultProvider("goerli")

    const sourceProvider = new ethers.providers.JsonRpcProvider(
        EVM_NODE_URL[network][sourceChain]
    )
    const sourceSigner = new ethers.Wallet(senderPrivateKey, sourceProvider)
    const amount = ethers.utils.parseUnits(transferAmount, 18)

    const recipient = targetAddress

    // approve the bridge to spend tokens
    /* await approveEth(
        CONTRACTS.TESTNET[sourceChain].token_bridge,
        TEST_ERC20,
        signer,
        amount
    ) */
    // transfer tokens
    /* const receipt = await transferFromEth(
        CONTRACTS.TESTNET[sourceChain].token_bridge,
        signer,
        TEST_ERC20,
        amount,
        CHAIN_ID_SOLANA,
        hexToUint8Array(
            nativeToHexString(recipient.toString(), CHAIN_ID_SOLANA) || ''
        )
    ) */
    console.log('transfering...')
    const receipt = await transferFromEthNative(
        CONTRACTS[network][sourceChain].token_bridge,
        sourceSigner,
        amount,
        CHAIN_ID[destinationChain],
        hexToUint8Array(
            nativeToHexString(recipient, CHAIN_ID[destinationChain]) || ''
        )
    )
    // get the sequence from the logs (needed to fetch the vaa)
    console.log('getting sequence from logs...')
    const sequence = await parseSequenceFromLogEth(
        receipt,
        CONTRACTS[network][sourceChain].core
    )
    const emitterAddress = getEmitterAddressEth(
        CONTRACTS[network][sourceChain].token_bridge
    )
    // poll until the guardian(s) witness and sign the vaa
    console.log('getting signed VAA with retry...')
    const { vaaBytes: signedVAA } = await getSignedVAAWithRetry(
        WORMHOLE_RPC_HOSTS[network],
        CHAIN_ID[sourceChain],
        emitterAddress,
        sequence,
        {
            transport: NodeHttpTransport(),
        }
    )
    // post vaa to Solana
    console.log(`redeeming on ${destinationChain}...`)
    if (destinationChain === CHAIN.SOLANA) {
        /* console.log(`posting ${destinationChain}...`)
        await postVaaSolana(
            connection,
            async transaction => {
                transaction.partialSign(keypair)
                return transaction
            },
            CONTRACTS.TESTNET.solana.core,
            payerAddress,
            Buffer.from(signedVAA)
        ) */
        // redeem tokens on solana
        /* const transaction = await redeemOnSolana(
            connection,
            CONTRACTS.TESTNET.solana.core,
            CONTRACTS.TESTNET.solana.token_bridge,
            payerAddress,
            signedVAA
        )
        // sign, send, and confirm transaction
        transaction.partialSign(keypair)
        const txid = await connection.sendRawTransaction(transaction.serialize())
        await connection.confirmTransaction(txid)
        console.log('checking if transfer is completed...')
        const completed = await getIsTransferCompletedSolana(
            CONTRACTS.TESTNET.solana.token_bridge,
            signedVAA,
            connection
        )
        if (!completed) throw new Error('transfer not completed'); */
    } else {
        const destProvider = new ethers.providers.JsonRpcProvider(
            EVM_NODE_URL[network][destinationChain]
        )
        const destSigner = new ethers.Wallet(payerPrivateKey, destProvider)
        await redeemOnEth(
            CONTRACTS[network][destinationChain].token_bridge,
            destSigner,
            signedVAA
        )
        console.log('checking if transfer is completed...')
        let completed = await getIsTransferCompletedEth(
            CONTRACTS[network][destinationChain].token_bridge,
            destProvider,
            signedVAA
        )
        while (!completed) {
            await new Promise(r => setTimeout(r, 5000))
            completed = await getIsTransferCompletedEth(
                CONTRACTS[network][destinationChain].token_bridge,
                destProvider,
                signedVAA
            )
        }
    }
    console.log('done')
}
