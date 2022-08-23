import { Command, Option } from 'commander'
import { CHAIN, getEnumValues, CHAIN_ID } from './utils'
import { transferSolanaToken, attestSolanaToken } from './solana'

const program = new Command()

program.name('Wormhole CLI').description('CLI to Wormhole SDK').version('0.1.0')

program
    .command('attest')
    .description('attest token from source chain to destination chain')
    .argument('<token>', 'token address to transfer')
    .requiredOption('--srcPK <string>', "sender source chain's private key")
    .requiredOption(
        '--dstPK <string>',
        "receiver destination chain's private key"
    )
    .addOption(
        new Option('-f, --from <chain>', 'source chain').choices(
            getEnumValues(CHAIN)
        )
    )
    .addOption(
        new Option('-t, --to <chain>', 'destination chain').choices(
            getEnumValues(CHAIN)
        )
    )
    .action(async (token, options) => {
        if (!options.from || !options.to) {
            console.error('--from and --to are required')
            process.exit(1)
        }

        if (options.from === options.to) {
            console.error('source chain == destination chain')
            process.exit(1)
        }

        const { srcPK, dstPK, from, to } = options

        switch (from) {
            case CHAIN.SOLANA:
                await attestSolanaToken(token, srcPK, dstPK, to)
                break
            case CHAIN.ETHEREUM:
                console.log('eth')
                break
            case CHAIN.BSC:
                console.log('bsc')
                break
            case CHAIN.POLYGON:
                break
            case CHAIN.AVAX:
                break
            default:
                console.log(
                    `sorry, cli only supports these chain ${getEnumValues(
                        CHAIN
                    )}`
                )
        }
    })

program
    .command('transfer')
    .description('transfer token from source chain to destination chain')
    .argument('<amount>', 'amount of token to transfer')
    .argument('<token>', 'token address to transfer')
    .argument('<receiver>', 'receiver address')
    .requiredOption('--senderPK <string>', "sender source chain's private key")
    .requiredOption(
        '--payerPK <string>',
        "payer destination chain's private key"
    )
    .addOption(
        new Option('-f, --from <chain>', 'source chain').choices(
            getEnumValues(CHAIN)
        )
    )
    .addOption(
        new Option('-t, --to <chain>', 'destination chain').choices(
            getEnumValues(CHAIN)
        )
    )
    .action(async (amount, token, receiver, options) => {
        if (!options.from || !options.to) {
            console.error('--from and --to are required')
            process.exit(1)
        }

        if (options.from === options.to) {
            console.error('source chain == destination chain')
            process.exit(1)
        }

        const { senderPK, payerPK, from, to } = options

        switch (from) {
            case CHAIN.SOLANA:
                await transferSolanaToken(
                    amount,
                    token,
                    receiver,
                    senderPK,
                    payerPK,
                    to
                )
                break
            case CHAIN.ETHEREUM:
                console.log('eth')
                break
            case CHAIN.BSC:
                console.log('bsc')
                break
            case CHAIN.POLYGON:
                break
            case CHAIN.AVAX:
                break
            default:
                console.log(
                    `sorry, cli only supports these chain ${getEnumValues(
                        CHAIN
                    )}`
                )
        }
    })

program.parse()
