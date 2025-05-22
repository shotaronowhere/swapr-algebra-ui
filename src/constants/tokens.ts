import { Token } from "@uniswap/sdk-core";
import { Xdai } from "../lib/src/entities/xdai";
import { WNATIVE } from "../lib/src/entities/wnative";

import AlgebraConfig from "algebra.config";

interface TokenDetails {
    name: string;
    symbol: string;
    decimals: number;
}

export const [DEFAULT_TOKENS, TOKENS_FOR_MULTIHOP, STABLE_TOKENS] = [
    AlgebraConfig.DEFAULT_TOKEN_LIST.defaultTokens,
    AlgebraConfig.DEFAULT_TOKEN_LIST.tokensForMultihop,
    AlgebraConfig.DEFAULT_TOKEN_LIST.stableTokens,
].map((tokens) => Object.entries(tokens).map(([address, tokenDetails]) => {
    const { name, symbol, decimals } = tokenDetails as TokenDetails;
    return new Token(AlgebraConfig.CHAIN_PARAMS.chainId, address, decimals, symbol, name);
}));

export const STABLE_TOKEN_FOR_USD_PRICE = new Token(
    AlgebraConfig.CHAIN_PARAMS.chainId,
    AlgebraConfig.DEFAULT_TOKEN_LIST.stableTokenForUSDPrice.address,
    AlgebraConfig.DEFAULT_TOKEN_LIST.stableTokenForUSDPrice.decimals,
    AlgebraConfig.DEFAULT_TOKEN_LIST.stableTokenForUSDPrice.symbol,
    AlgebraConfig.DEFAULT_TOKEN_LIST.stableTokenForUSDPrice.name
);

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
