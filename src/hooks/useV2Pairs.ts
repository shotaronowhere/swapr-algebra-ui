import { useMemo } from 'react'
//@ts-ignore
import IUniswapV2PairABI from '@uniswap/v2-core/build/IUniswapV2Pair.json'
import { Interface } from 'ethers'
import { V2_FACTORY_ADDRESSES } from '../constants/addresses'
import { useMultipleContractSingleData } from '../state/multicall/hooks'
import { Currency, CurrencyAmount } from '@uniswap/sdk-core'
import { computePairAddress, Pair } from '../utils/computePairAddress'
// import { Pair } from "@uniswap/v2-sdk"

const PAIR_INTERFACE = new Interface(IUniswapV2PairABI.abi)

export enum PairState {
    LOADING,
    NOT_EXISTS,
    EXISTS,
    INVALID,
}

export function useV2Pairs(currencies: [Currency | undefined, Currency | undefined][], sushi?: boolean): [PairState, Pair | null][] {
    const tokens = useMemo(
        () => currencies.map(([currencyA, currencyB]) => [currencyA?.wrapped, currencyB?.wrapped]),
        [currencies]
    )

    const pairAddresses = useMemo(
        () =>
            tokens.map(([tokenA, tokenB]) => {
                return tokenA &&
                    tokenB &&
                    tokenA.chainId === tokenB.chainId &&
                    !tokenA.equals(tokenB) &&
                    V2_FACTORY_ADDRESSES[tokenA.chainId]
                    ? computePairAddress({
                        factoryAddress: sushi ? '0xc35dadb65012ec5796536bd9864ed8773abc74c4' : V2_FACTORY_ADDRESSES[tokenA.chainId],
                        tokenA,
                        tokenB,
                        hash: sushi ? '0xe18a34eb0e04b04f7a0ac29a6e80748dca96319b42c54d679cb821dca90c6303' : '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f'
                    })
                    : undefined
            }),
        [tokens]
    )

    const results = useMultipleContractSingleData(pairAddresses, PAIR_INTERFACE, 'getReserves')

    return useMemo(() => {
        return results.map((result, i) => {
            const { result: reserves, loading } = result
            const tokenA = tokens[i][0]
            const tokenB = tokens[i][1]

            if (loading) return [PairState.LOADING, null]
            if (!tokenA || !tokenB || tokenA.equals(tokenB)) return [PairState.INVALID, null]
            if (!reserves) return [PairState.NOT_EXISTS, null]
            const { reserve0, reserve1 } = reserves
            const [token0, token1] = tokenA.sortsBefore(tokenB) ? [tokenA, tokenB] : [tokenB, tokenA]
            return [
                PairState.EXISTS,
                new Pair(
                    CurrencyAmount.fromRawAmount(token0, reserve0.toString()),
                    CurrencyAmount.fromRawAmount(token1, reserve1.toString()),
                    sushi
                )
            ]
        })
    }, [results, tokens])
}

export function useV2Pair(tokenA?: Currency, tokenB?: Currency, sushi?: boolean): [PairState, Pair | null] {
    const inputs: [[Currency | undefined, Currency | undefined]] = useMemo(() => [[tokenA, tokenB]], [tokenA, tokenB])
    return useV2Pairs(inputs, sushi)[0]
}
