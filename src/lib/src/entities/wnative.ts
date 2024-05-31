import { Token } from "@uniswap/sdk-core";
import AlgebraConfig from "algebra.config";

/**
 * Known WETH9 implementation addresses, used in our implementation of Ether#wrapped
 */
export const WNATIVE: { [chainId: number]: Token } = {
    [100]: new Token(
        AlgebraConfig.CHAIN_PARAMS[100].chainId,
        AlgebraConfig.CHAIN_PARAMS[100].wrappedNativeCurrency.address,
        AlgebraConfig.CHAIN_PARAMS[100].wrappedNativeCurrency.decimals,
        AlgebraConfig.CHAIN_PARAMS[100].wrappedNativeCurrency.symbol,
        AlgebraConfig.CHAIN_PARAMS[100].wrappedNativeCurrency.name
    ),
    [10200]: new Token(
        AlgebraConfig.CHAIN_PARAMS[10200].chainId,
        AlgebraConfig.CHAIN_PARAMS[10200].wrappedNativeCurrency.address,
        AlgebraConfig.CHAIN_PARAMS[10200].wrappedNativeCurrency.decimals,
        AlgebraConfig.CHAIN_PARAMS[10200].wrappedNativeCurrency.symbol,
        AlgebraConfig.CHAIN_PARAMS[10200].wrappedNativeCurrency.name
    ),
};
