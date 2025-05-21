import { Currency, CurrencyAmount, Price, Token } from "@uniswap/sdk-core";
import { useMemo } from "react";
import { useBestV3TradeExactOut } from "./useBestV3Trade";
import { useAccount } from "wagmi";

import { STABLE_TOKEN_FOR_USD_PRICE } from "constants/tokens";

// Stablecoin amounts used when calculating spot price for a given currency.
// The amount is large enough to filter low liquidity pairs.

// Two different consts used as a hack for allLiquidity flag in useUSDCPrice fn.
// Doing another way makes amounts in EnterAmount stuck somehow.
const STABLECOIN_AMOUNT_OUT_ALL: CurrencyAmount<Token> = CurrencyAmount.fromRawAmount(STABLE_TOKEN_FOR_USD_PRICE, 1);
const STABLECOIN_AMOUNT_OUT_FILTERED: CurrencyAmount<Token> = CurrencyAmount.fromRawAmount(STABLE_TOKEN_FOR_USD_PRICE, 100_000e1);

/**
 * Returns the price in USDC of the input currency
 * @param currency currency to compute the USDC price of
 */
export default function useUSDCPrice(currency?: Currency, allLiquidity?: boolean): Price<Currency, Token> | undefined {
    const { chain } = useAccount();
    const chainId = chain?.id;

    const amountOut = chainId ? (allLiquidity ? STABLECOIN_AMOUNT_OUT_ALL : STABLECOIN_AMOUNT_OUT_FILTERED) : undefined;
    const stablecoin = amountOut?.currency;

    const v3USDCTrade = useBestV3TradeExactOut(currency, amountOut);

    return useMemo(() => {
        if (!currency || !stablecoin) {
            return undefined;
        }

        // handle usdc
        if (currency?.wrapped.equals(stablecoin)) {
            return new Price(stablecoin, stablecoin, "1", "1");
        }

        if (v3USDCTrade.trade) {
            const { numerator, denominator } = v3USDCTrade.trade.route.midPrice;
            return new Price(currency, stablecoin, denominator, numerator);
        }

        return undefined;
    }, [currency, stablecoin, v3USDCTrade.trade]);
}

export function useUSDCValue(currencyAmount: CurrencyAmount<Currency> | undefined | null, allLiquidity = false) {
    const price = useUSDCPrice(currencyAmount?.currency, allLiquidity);

    return useMemo(() => {
        if (!price || !currencyAmount) return null;
        try {
            return price.quote(currencyAmount);
        } catch (error) {
            return null;
        }
    }, [currencyAmount, price]);
}
