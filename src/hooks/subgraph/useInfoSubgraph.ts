import { useApolloClient } from "@apollo/client";
import { useState } from "react";
import { Contract, providers } from "ethers";
import { useActiveWeb3React } from "../web3";
import { useClients } from "./useClients";
import { POOLS_FROM_ADDRESSES, TOKENS_FROM_ADDRESSES, TOP_POOLS, TOP_TOKENS } from "../../utils/graphql-queries";
import { useBlocksFromTimestamps } from '../blocks'
import { useEthPrices } from '../useEthPrices'
import { useDeltaTimestamps } from "../../utils/queries";
import { formatTokenName, formatTokenSymbol, get2DayChange, getPercentChange } from "../../utils/info";

function parseTokensData(tokenData) {
    return tokenData ? tokenData.reduce((accum: { [address: string]: TokenFields }, poolData) => {
        accum[poolData.id] = poolData
        return accum
    }, {})
        : {}
}

export function useInfoSubgraph() {

    const { chainId, account } = useActiveWeb3React()

    const { dataClient } = useClients()

    const [t24, t48, tWeek] = useDeltaTimestamps()

    const { blocks, error: blockError } = useBlocksFromTimestamps([t24, t48, tWeek])
    const [block24, block48, blockWeek] = blocks ?? []

    const ethPrices = useEthPrices()

    const [poolsResult, setPools] = useState(null);
    const [poolsLoading, setPoolsLoading] = useState(null);

    const [tokensResult, setTokens] = useState(null);
    const [tokensLoading, setTokensLoading] = useState(null);

    async function fetchInfoPools(reload?: boolean) {

        if (!blocks || blockError || !ethPrices) return

        try {
            setPoolsLoading(true)

            const { data: { pools: topPools }, error } = (await dataClient.query({
                query: TOP_POOLS,
                fetchPolicy: reload ? 'network-only' : 'cache-first'
            }))

            if (error) throw new Error(`${error.name} ${error.message}`)

            const { data: { pools }, error: _error } = await dataClient.query({
                query: POOLS_FROM_ADDRESSES(undefined, topPools.map(el => el.id)),
                fetchPolicy: reload ? 'network-only' : 'cache-first'
            })

            if (error) throw new Error(`${_error.name} ${_error.message}`)

            setPools(pools)

        } catch (err) {
            console.error('Info pools fetch', err)
            setPools('failed')
        }

        setPoolsLoading(false)
    }

    async function fetchInfoTokens(reload?: boolean) {

        if (!blocks || blockError || !ethPrices) return

        try {
            setTokensLoading(true)

            const { data: { tokens: topTokens }, error } = (await dataClient.query({
                query: TOP_TOKENS,
                fetchPolicy: reload ? 'network-only' : 'cache-first'
            }))

            if (error) throw new Error(`${error.name} ${error.message}`)

            const tokenAddresses = topTokens.map(el => el.id)

            const { data: { tokens }, error: _error } = await dataClient.query({
                query: TOKENS_FROM_ADDRESSES(undefined, tokenAddresses),
                fetchPolicy: reload ? 'network-only' : 'cache-first'
            })

            if (error) throw new Error(`${_error.name} ${_error.message}`)

            const tokens24 = await fetchTokensByTime(block24.number, tokenAddresses)
            const tokens48 = await fetchTokensByTime(block48.number, tokenAddresses)
            const tokensWeek = await fetchTokensByTime(blockWeek.number, tokenAddresses)

            const parsedTokens = parseTokensData(tokens)
            const parsedTokens24 = parseTokensData(tokens24)
            const parsedTokens48 = parseTokensData(tokens48)
            const parsedTokensWeek = parseTokensData(tokensWeek)

            const formatted = tokenAddresses.reduce((accum: { [address: string]: TokenData }, address) => {
                const current: TokenFields | undefined = parsedTokens[address]
                const oneDay: TokenFields | undefined = parsedTokens24[address]
                const twoDay: TokenFields | undefined = parsedTokens48[address]
                const week: TokenFields | undefined = parsedTokensWeek[address]

                const [volumeUSD, volumeUSDChange] =
                    current && oneDay && twoDay
                        ? get2DayChange(current.volumeUSD, oneDay.volumeUSD, twoDay.volumeUSD)
                        : current
                            ? [parseFloat(current.volumeUSD), 0]
                            : [0, 0]

                const volumeUSDWeek =
                    current && week
                        ? parseFloat(current.volumeUSD) - parseFloat(week.volumeUSD)
                        : current
                            ? parseFloat(current.volumeUSD)
                            : 0
                const tvlUSD = current ? parseFloat(current.totalValueLockedUSD) : 0
                const tvlUSDChange = getPercentChange(current?.totalValueLockedUSD, oneDay?.totalValueLockedUSD)
                const tvlToken = current ? parseFloat(current.totalValueLocked) : 0
                const priceUSD = current ? parseFloat(current.derivedETH) * ethPrices.current : 0
                const priceUSDOneDay = oneDay ? parseFloat(oneDay.derivedETH) * ethPrices.oneDay : 0
                const priceUSDWeek = week ? parseFloat(week.derivedETH) * ethPrices.week : 0
                const priceUSDChange =
                    priceUSD && priceUSDOneDay ? getPercentChange(priceUSD.toString(), priceUSDOneDay.toString()) : 0
                console.log('PRICE USDD CHANGE', priceUSDChange, priceUSD, priceUSDOneDay)
                const priceUSDChangeWeek =
                    priceUSD && priceUSDWeek ? getPercentChange(priceUSD.toString(), priceUSDWeek.toString()) : 0
                const txCount =
                    current && oneDay
                        ? parseFloat(current.txCount) - parseFloat(oneDay.txCount)
                        : current
                            ? parseFloat(current.txCount)
                            : 0
                const feesUSD =
                    current && oneDay
                        ? parseFloat(current.feesUSD) - parseFloat(oneDay.feesUSD)
                        : current
                            ? parseFloat(current.feesUSD)
                            : 0

                accum[address] = {
                    exists: !!current,
                    address,
                    name: current ? formatTokenName(address, current.name) : '',
                    symbol: current ? formatTokenSymbol(address, current.symbol) : '',
                    volumeUSD,
                    volumeUSDChange,
                    volumeUSDWeek,
                    txCount,
                    tvlUSD,
                    feesUSD,
                    tvlUSDChange,
                    tvlToken,
                    priceUSD,
                    priceUSDChange,
                    priceUSDChangeWeek,
                }

                return accum
            }, {})

            setTokens(Object.values(formatted))

        } catch (err) {
            console.error('Info tokens fetch', err)
            setTokens('failed')
        }

        setTokensLoading(false)
    }

    async function fetchTokensByTime(blockNumber: number, tokenAddresses) {

        try {

            const { data: { tokens }, error: error } = await dataClient.query({
                query: TOKENS_FROM_ADDRESSES(blockNumber, tokenAddresses),
            })

            if (error) throw new Error(`${error.name} ${error.message}`)

            return tokens

        } catch (err) {
            console.error('Tokens by time fetch', err);
            return undefined
        }

    }

    return {
        blocksFetched: blockError ? false : !!ethPrices && !!blocks,
        fetchInfoPools: { poolsResult, poolsLoading, fetchInfoPoolsFn: fetchInfoPools },
        fetchInfoTokens: { tokensResult, tokensLoading, fetchInfoTokensFn: fetchInfoTokens },
    }

}