import { Token } from "@uniswap/sdk-core";
import { Xdai } from "../lib/src/entities/xdai";
import { WNATIVE } from "../lib/src/entities/wnative";

import AlgebraConfig from "algebra.config";

export const [DEFAULT_TOKENS, TOKENS_FOR_MULTIHOP, STABLE_TOKENS] = [
    AlgebraConfig.DEFAULT_TOKEN_LIST[100].defaultTokens,
    AlgebraConfig.DEFAULT_TOKEN_LIST[100].tokensForMultihop,
    AlgebraConfig.DEFAULT_TOKEN_LIST[100].stableTokens,
].map((tokens) => Object.entries(tokens).map(([address, { name, symbol, decimals }]) => new Token(AlgebraConfig.CHAIN_PARAMS[100].chainId, address, decimals, symbol, name)));

export const [DEFAULT_TOKENS_TESTNET, TOKENS_FOR_MULTIHOP_TESTNET, STABLE_TOKENS_TESTNET] = [
    AlgebraConfig.DEFAULT_TOKEN_LIST[10200].defaultTokens,
    AlgebraConfig.DEFAULT_TOKEN_LIST[10200].tokensForMultihop,
    AlgebraConfig.DEFAULT_TOKEN_LIST[10200].stableTokens,
].map((tokens) => Object.entries(tokens).map(([address, { name, symbol, decimals }]) => new Token(AlgebraConfig.CHAIN_PARAMS[10200].chainId, address, decimals, symbol, name)));

export const STABLE_TOKEN_FOR_USD_PRICE_MAINNET = new Token(
    AlgebraConfig.CHAIN_PARAMS[100].chainId,
    AlgebraConfig.DEFAULT_TOKEN_LIST[100].stableTokenForUSDPrice.address,
    AlgebraConfig.DEFAULT_TOKEN_LIST[100].stableTokenForUSDPrice.decimals,
    AlgebraConfig.DEFAULT_TOKEN_LIST[100].stableTokenForUSDPrice.symbol,
    AlgebraConfig.DEFAULT_TOKEN_LIST[100].stableTokenForUSDPrice.name
);

export const STABLE_TOKEN_FOR_USD_PRICE_TESTNET = new Token(
    AlgebraConfig.CHAIN_PARAMS[10200].chainId,
    AlgebraConfig.DEFAULT_TOKEN_LIST[10200].stableTokenForUSDPrice.address,
    AlgebraConfig.DEFAULT_TOKEN_LIST[10200].stableTokenForUSDPrice.decimals,
    AlgebraConfig.DEFAULT_TOKEN_LIST[10200].stableTokenForUSDPrice.symbol,
    AlgebraConfig.DEFAULT_TOKEN_LIST[10200].stableTokenForUSDPrice.name
);

export const STABLE_TOKEN_FOR_USD_PRICE: { [chainId: number]: Token } = {
    [100]: STABLE_TOKEN_FOR_USD_PRICE_MAINNET,
    [10200]: STABLE_TOKEN_FOR_USD_PRICE_TESTNET,
};

export const WXDAI_EXTENDED: { [chainId: number]: Token } = {
    ...WNATIVE,
};

export class ExtendedEther extends Xdai {
    private static _cachedEther: { [chainId: number]: ExtendedEther } = {};

    public get wrapped(): Token {
        if (this.chainId in WXDAI_EXTENDED) return WXDAI_EXTENDED[this.chainId];
        throw new Error("Unsupported chain ID");
    }

    public static onChain(chainId: number): ExtendedEther {
        return this._cachedEther[chainId] ?? (this._cachedEther[chainId] = new ExtendedEther(chainId));
    }
}
