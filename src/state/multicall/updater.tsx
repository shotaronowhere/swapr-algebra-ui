import { useEffect, useMemo, useRef } from "react";
import { useAccount } from 'wagmi';
import { useMulticall2Contract } from "../../hooks/useContract";
import useDebounce from "../../hooks/useDebounce";
import chunkArray from "../../utils/chunkArray";
import { retry, RetryableError } from "../../utils/retry";
import { useBlockNumber } from "../application/hooks";
import { AppState } from "../index";
import { errorFetchingMulticallResults, fetchingMulticallResults, updateMulticallResults } from "./actions";
import { useAppDispatch, useAppSelector } from "state/hooks";
import { Call, parseCallKey } from "./utils";

const DEFAULT_GAS_REQUIRED = 1_000_000;

/**
 * Fetches a chunk of calls, enforcing a minimum block number constraint
 * @param multicall multicall contract to fetch against
 * @param chunk chunk of calls to make
 * @param blockNumber block number passed as the block tag in the eth_call
 */
async function fetchChunk(multicall: any, chunk: Call[], blockNumber: number): Promise<{ success: boolean; returnData: string }[]> {
    console.log('[fetchChunk] Attempting to fetch chunk:', { chunk, blockNumber });
    try {
        // ethers v6: use contract.methodName.staticCall(...) for non-view methods called statically
        // The ABI for 'multicall' is nonpayable, so staticCall is needed.
        // The result will be an array if multiple values are returned; named outputs are also properties.
        const multicallResponse = await multicall.multicall.staticCall(
            chunk.map((obj) => ({
                target: obj.address,
                callData: obj.callData,
                gasLimit: obj.gasRequired ?? DEFAULT_GAS_REQUIRED,
            })),
            { blockTag: blockNumber } // Options object as the last parameter
        );

        // The ABI defines two outputs: blockNumber and returnData (the array of results)
        // Access the returnData array, which is the second element and also named 'returnData'
        const multicallResults = multicallResponse.returnData;

        console.log('[fetchChunk] Raw multicallResults from multicall contract:', multicallResults);

        // Detailed log for each result from AlgebraInterfaceMulticall
        multicallResults.forEach((result: any, i: number) => {
            console.log(`[fetchChunk] Sub-call ${i} to ${chunk[i].address}: success: ${result.success}, returnData: ${result.returnData}, gasUsed: ${result.gasUsed?.toString()}`);
            if (!result.success && chunk[i].gasRequired) { // Check original gasRequired
                const requiredGas = BigInt(chunk[i].gasRequired ?? DEFAULT_GAS_REQUIRED);
                const usedGas = BigInt(result.gasUsed ?? 0);
                // Corrected gas check for BigInt
                if (result.returnData?.length <= 2 && usedGas >= (requiredGas * 95n / 100n)) { // Check if 0x and gas is high
                    console.warn(
                        `[fetchChunk] Sub-call ${i} failed. Gas used: ${usedGas.toString()}, Gas allowed: ${requiredGas.toString()}`,
                        `Target: ${chunk[i].address}, CallData: ${chunk[i].callData}`
                    );
                }
            }
        });

        return multicallResults;
    } catch (error: any) {
        if (error.code === -32000 || error.message?.indexOf("header not found") !== -1) {
            throw new RetryableError(`header not found for block number ${blockNumber}`);
        }
        console.error('[fetchChunk] Failed to fetch chunk, error object:', error);
        throw error;
    }
}

/**
 * From the current all listeners state, return each call key mapped to the
 * minimum number of blocks per fetch. This is how often each key must be fetched.
 * @param allListeners the all listeners state
 * @param chainId the current chain id
 */
export function activeListeningKeys(allListeners: AppState["multicall"]["callListeners"], chainId?: number): { [callKey: string]: number } {
    if (!allListeners || !chainId) return {};
    const listeners = allListeners[chainId];
    if (!listeners) return {};

    return Object.keys(listeners).reduce<{ [callKey: string]: number }>((memo, callKey) => {
        const keyListeners = listeners[callKey];

        memo[callKey] = Object.keys(keyListeners)
            .filter((key) => {
                const blocksPerFetch = parseInt(key);
                if (blocksPerFetch <= 0) return false;
                return keyListeners[blocksPerFetch] > 0;
            })
            .reduce((previousMin, current) => {
                return Math.min(previousMin, parseInt(current));
            }, Infinity);
        return memo;
    }, {});
}

/**
 * Return the keys that need to be refetched
 * @param callResults current call result state
 * @param listeningKeys each call key mapped to how old the data can be in blocks
 * @param chainId the current chain id
 * @param latestBlockNumber the latest block number
 */
export function outdatedListeningKeys(
    callResults: AppState["multicall"]["callResults"],
    listeningKeys: { [callKey: string]: number },
    chainId: number | undefined,
    latestBlockNumber: number | undefined
): string[] {
    if (!chainId || !latestBlockNumber) return [];
    const results = callResults[chainId];
    // no results at all, load everything
    if (!results) return Object.keys(listeningKeys);

    return Object.keys(listeningKeys).filter((callKey) => {
        const blocksPerFetch = listeningKeys[callKey];

        const data = callResults[chainId][callKey];
        // no data, must fetch
        if (!data) return true;

        const minDataBlockNumber = latestBlockNumber - (blocksPerFetch - 1);

        // already fetching it for a recent enough block, don't refetch it
        if (data.fetchingBlockNumber && data.fetchingBlockNumber >= minDataBlockNumber) return false;

        // if data is older than minDataBlockNumber, fetch it
        return !data.blockNumber || data.blockNumber < minDataBlockNumber;
    });
}

export default function Updater(): null {
    const dispatch = useAppDispatch();
    const state = useAppSelector((state) => state.multicall);
    // wait for listeners to settle before triggering updates
    const debouncedListeners = useDebounce(state.callListeners, 100);
    const latestBlockNumber = useBlockNumber();
    const { chain } = useAccount();
    const chainId = chain?.id;
    const multicall2Contract = useMulticall2Contract();
    const cancellations = useRef<{ blockNumber: number; cancellations: (() => void)[] }>();

    const listeningKeys: { [callKey: string]: number } = useMemo(() => {
        return activeListeningKeys(debouncedListeners, chainId);
    }, [debouncedListeners, chainId]);

    const unserializedOutdatedCallKeys = useMemo(() => {
        return outdatedListeningKeys(state.callResults, listeningKeys, chainId, latestBlockNumber);
    }, [chainId, state.callResults, listeningKeys, latestBlockNumber]);

    const serializedOutdatedCallKeys = useMemo(() => JSON.stringify(unserializedOutdatedCallKeys.sort()), [unserializedOutdatedCallKeys]);

    useEffect(() => {
        if (!latestBlockNumber || !chainId || !multicall2Contract) return;

        const outdatedCallKeys: string[] = JSON.parse(serializedOutdatedCallKeys);
        if (outdatedCallKeys.length === 0) return;
        const calls = outdatedCallKeys.map((key) => parseCallKey(key));

        const chunkedCalls = chunkArray(calls);

        if (cancellations.current && cancellations.current.blockNumber !== latestBlockNumber) {
            cancellations.current.cancellations.forEach((c) => c());
        }

        dispatch(
            fetchingMulticallResults({
                calls,
                chainId,
                fetchingBlockNumber: latestBlockNumber,
            })
        );

        cancellations.current = {
            blockNumber: latestBlockNumber,
            cancellations: chunkedCalls.map((chunk, index) => {
                const { cancel, promise } = retry(() => fetchChunk(multicall2Contract, chunk, latestBlockNumber), {
                    n: 5,
                    minWait: 1500,
                    maxWait: 3000,
                });
                promise
                    .then((returnData) => {
                        // accumulates the length of all previous indices
                        const firstCallKeyIndex = chunkedCalls.slice(0, index).reduce<number>((memo, curr) => memo + curr.length, 0);
                        const lastCallKeyIndex = firstCallKeyIndex + returnData.length;

                        const slice = outdatedCallKeys.slice(firstCallKeyIndex, lastCallKeyIndex);

                        // split the returned slice into errors and success
                        const { erroredCallKeys, results } = slice.reduce<{
                            erroredCallKeys: string[]; // Store keys of errored calls
                            results: { [callKey: string]: string | null };
                        }>(
                            (memo, callKey, i) => {
                                if (returnData[i].success) {
                                    memo.results[callKey] = returnData[i].returnData ?? null;
                                } else {
                                    // For errored call, still add it to results with null,
                                    // so its blockNumber gets updated by updateMulticallResults.
                                    // This prevents immediate re-fetch by outdatedListeningKeys.
                                    memo.results[callKey] = null;
                                    memo.erroredCallKeys.push(callKey);
                                }
                                return memo;
                            },
                            { erroredCallKeys: [], results: {} }
                        );

                        // Dispatch all results (success or marked as null for error) to updateMulticallResults
                        // This ensures blockNumber is set for all attempted calls, preventing immediate refetch loops.
                        if (Object.keys(results).length > 0) {
                            dispatch(
                                updateMulticallResults({
                                    chainId,
                                    results, // This now includes null for errored calls
                                    blockNumber: latestBlockNumber,
                                })
                            );
                        }

                        // If there were specific errors, and errorFetchingMulticallResults action is used 
                        // for more than just logging (e.g. specific UI feedback or different state updates),
                        // it can be dispatched here. Ensure its reducer does not counteract the blockNumber update.
                        if (erroredCallKeys.length > 0) {
                            console.debug("Calls errored in fetch", erroredCallKeys.map(key => parseCallKey(key)));
                            dispatch(
                                errorFetchingMulticallResults({
                                    calls: erroredCallKeys.map(key => parseCallKey(key)),
                                    chainId,
                                    fetchingBlockNumber: latestBlockNumber, // Consider if this action/payload is still ideal
                                })
                            );
                        }
                    })
                    .catch((error: any) => {
                        if (error.isCancelledError) {
                            console.debug("Cancelled fetch for blockNumber", latestBlockNumber, chunk, chainId);
                            return;
                        }
                        // console.error('Failed to fetch multicall chunk', chunk, chainId, error)
                        dispatch(
                            errorFetchingMulticallResults({
                                calls: chunk,
                                chainId,
                                fetchingBlockNumber: latestBlockNumber,
                            })
                        );
                    });
                return cancel;
            }),
        };
    }, [chainId, multicall2Contract, dispatch, serializedOutdatedCallKeys, latestBlockNumber]);

    return null;
}
