import { BigNumber } from '@ethersproject/bignumber'
import { Currency, CurrencyAmount, Token } from '@uniswap/sdk-core'
import { useTokenContract } from './useContract'
import { useSingleCallResult, NEVER_RELOAD } from '../state/multicall/hooks'

// returns undefined if input token is undefined, or fails to get token contract,
// or contract total supply cannot be fetched
export function useTotalSupply(token?: Currency): CurrencyAmount<Token> | undefined {
    const contract = useTokenContract(token?.isToken ? token.address : undefined, false)

    const totalSupply: BigNumber = useSingleCallResult(contract, 'totalSupply', undefined, NEVER_RELOAD)?.result?.[0]

    return token?.isToken && totalSupply ? CurrencyAmount.fromRawAmount(token, totalSupply.toString()) : undefined
}
