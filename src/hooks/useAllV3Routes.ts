import { Currency } from "@uniswap/sdk-core";
import { Pool, Route } from "lib/src";
import { useMemo } from "react";
import { useUserSingleHopOnly } from "../state/user/hooks";
import { useAccount } from "wagmi";
import { useV3SwapPools } from "./useV3SwapPools";

/**
 * Returns true if poolA is equivalent to poolB
 * @param poolA one of the two pools
 * @param poolB the other pool
 */
function poolEquals(poolA: Pool, poolB: Pool): boolean {
    return poolA === poolB || (poolA.token0.equals(poolB.token0) && poolA.token1.equals(poolB.token1) && poolA.fee === poolB.fee);
}

function computeAllRoutes(
    currencyIn: Currency,
    currencyOut: Currency,
    pools: Pool[],
    chainId: number,
    currentPath: Pool[] = [],
    allPaths: Route<Currency, Currency>[] = [],
    startCurrencyIn: Currency = currencyIn,
    maxHops = 2
): Route<Currency, Currency>[] {
    const tokenIn = currencyIn?.wrapped;
    const tokenOut = currencyOut?.wrapped;

    if (!tokenIn || !tokenOut) throw new Error("Missing tokenIn/tokenOut");

    for (const pool of pools) {
        if (!pool.involvesToken(tokenIn) || currentPath.find((pathPool) => poolEquals(pool, pathPool))) continue;

        const outputToken = pool.token0.equals(tokenIn) ? pool.token1 : pool.token0;
        if (outputToken.equals(tokenOut)) {
            allPaths.push(new Route([...currentPath, pool], startCurrencyIn, currencyOut));
        } else if (maxHops > 1) {
            computeAllRoutes(outputToken, currencyOut, pools, chainId, [...currentPath, pool], allPaths, startCurrencyIn, maxHops - 1);
        }
    }

    return allPaths;
}

/**
 * Returns all the routes from an input currency to an output currency
 * @param currencyIn the input currency
 * @param currencyOut the output currency
 */
export function useAllV3Routes(currencyIn?: Currency, currencyOut?: Currency): { loading: boolean; routes: Route<Currency, Currency>[] } {
    const { chain } = useAccount();
    const chainId = chain?.id;
    const { pools, loading: poolsLoading } = useV3SwapPools(currencyIn, currencyOut);

    const [singleHopOnly] = useUserSingleHopOnly();

    return useMemo(() => {
        if (poolsLoading || !chainId || !pools || !currencyIn || !currencyOut)
            return {
                loading: true,
                routes: [],
            };

        //Hack
        // const singleIfWrapped = (currencyIn.isNative || currencyOut.isNative)
        const singleIfWrapped = false;

        const routes = computeAllRoutes(currencyIn, currencyOut, pools, chainId, [], [], currencyIn, singleHopOnly || singleIfWrapped ? 1 : 3);

        return { loading: false, routes };
    }, [chainId, currencyIn, currencyOut, pools, poolsLoading, singleHopOnly]);
}
