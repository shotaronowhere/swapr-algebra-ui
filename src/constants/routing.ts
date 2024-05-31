// a list of tokens by chain
import { Currency, Token } from "@uniswap/sdk-core";
import { DEFAULT_TOKENS, TOKENS_FOR_MULTIHOP, ExtendedEther, WXDAI_EXTENDED, TOKENS_FOR_MULTIHOP_TESTNET, DEFAULT_TOKENS_TESTNET } from "./tokens";

import AlgebraConfig from "algebra.config";

type ChainTokenList = {
    readonly [chainId: number]: Token[];
};

type ChainCurrencyList = {
    readonly [chainId: number]: Currency[];
};

const WETH_ONLY: ChainTokenList = Object.fromEntries(Object.entries(WXDAI_EXTENDED).map(([key, value]) => [key, [value]]));

// used to construct intermediary pairs for trading
export const BASES_TO_CHECK_TRADES_AGAINST: ChainTokenList = {
    ...WETH_ONLY,
    [100]: [...WETH_ONLY[AlgebraConfig.CHAIN_PARAMS[100].chainId], ...TOKENS_FOR_MULTIHOP],
    [10200]: [...WETH_ONLY[10200], ...TOKENS_FOR_MULTIHOP_TESTNET],
};
export const ADDITIONAL_BASES: { [chainId: number]: { [tokenAddress: string]: Token[] } } = {};
/**
 * Some tokens can only be swapped via certain pairs, so we override the list of bases that are considered for these
 * tokens.
 */
export const CUSTOM_BASES: { [chainId: number]: { [tokenAddress: string]: Token[] } } = {};

/**
 * Shows up in the currency select for swap and add liquidity
 */
export const COMMON_BASES: ChainCurrencyList = {
    [100]: [ExtendedEther.onChain(AlgebraConfig.CHAIN_PARAMS[100].chainId).wrapped, ...DEFAULT_TOKENS],
    [10200]: [ExtendedEther.onChain(AlgebraConfig.CHAIN_PARAMS[10200].chainId).wrapped, ...DEFAULT_TOKENS_TESTNET],
};

// used to construct the list of all pairs we consider by default in the frontend
export const BASES_TO_TRACK_LIQUIDITY_FOR: ChainTokenList = {
    ...WETH_ONLY,
    [100]: [...WETH_ONLY[AlgebraConfig.CHAIN_PARAMS[100].chainId], ...TOKENS_FOR_MULTIHOP],
    [10200]: [...WETH_ONLY[10200], ...TOKENS_FOR_MULTIHOP_TESTNET],
};
export const PINNED_PAIRS: { readonly [chainId: number]: [Token, Token][] } = {
    [100]: [],
    [10200]: [],
};
