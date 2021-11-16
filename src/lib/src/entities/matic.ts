import invariant from 'tiny-invariant'
import { Currency } from '@uniswap/sdk-core'
import { NativeCurrency } from '@uniswap/sdk-core'
import { Token } from '@uniswap/sdk-core'
import { WMATIC } from './wmatic'

/**
 * Ether is the main usage of a 'native' currency, i.e. for Ethereum mainnet and all testnets
 */
export class Matic extends NativeCurrency {
  protected constructor(chainId: number) {
    super(chainId, 18, 'MATIC', 'Matic')
  }

  public get wrapped(): Token {
    const weth9 = WMATIC[this.chainId]
    invariant(!!weth9, 'WRAPPED')
    return weth9
  }

  private static _etherCache: { [chainId: number]: Matic } = {}

  public static onChain(chainId: number): Matic {
    return this._etherCache[chainId] ?? (this._etherCache[chainId] = new Matic(chainId))
  }

  public equals(other: Currency): boolean {
    return other.isNative && other.chainId === this.chainId
  }
}