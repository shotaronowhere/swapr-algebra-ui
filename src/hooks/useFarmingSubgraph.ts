import { useEffect, useState } from "react";
import { useWeb3React } from "@web3-react/core";
import { Contract, providers } from "ethers";
import ERC20_ABI from "abis/erc20.json";
import NON_FUN_POS_MAN from "abis/non-fun-pos-man.json";
import FARMING_CENTER_ABI from "abis/farming-center.json";
import FINITE_FARMING_ABI from "abis/finite-farming.json";
import { FARMING_CENTER, FINITE_FARMING, NONFUNGIBLE_POSITION_MANAGER_ADDRESSES } from "../constants/addresses";
import { BigNumber } from "@ethersproject/bignumber";
import {
    CURRENT_EVENTS,
    FETCH_ETERNAL_FARM,
    FETCH_ETERNAL_FARM_FROM_POOL,
    FETCH_FINITE_FARM_FROM_POOL,
    FETCH_LIMIT,
    FETCH_POOL,
    FETCH_POOLS_BY_IDS,
    FETCH_REWARDS,
    FETCH_TOKEN,
    FETCH_TOKENS_BY_IDS,
    FUTURE_EVENTS,
    HAS_TRANSFERED_POSITIONS,
    INFINITE_EVENTS,
    POSITIONS_ON_ETERNAL_FARMING,
    TRANSFERED_POSITIONS,
    TRANSFERED_POSITIONS_FOR_POOL,
} from "../utils/graphql-queries";
import { useClients } from "./subgraph/useClients";
import { formatUnits, parseUnits } from "@ethersproject/units";
import {
    Deposit,
    DetachedEternalFarming,
    EternalFarming,
    FarmingEvent,
    FormattedEternalFarming,
    FormattedRewardInterface,
    PoolChartSubgraph,
    PoolSubgraph,
    Position,
    SubgraphResponse,
    TickFarming,
    TokenSubgraph,
} from "../models/interfaces";
import { Aprs, FutureFarmingEvent } from "../models/interfaces";
import { fetchEternalFarmTVL, fetchLimitFarmAPR, fetchLimitFarmTVL } from "utils/api";
import { useEthPrices } from "./useEthPrices";

import AlgebraConfig from "algebra.config";

export function useFarmingSubgraph() {
    const { chainId, account, provider } = useWeb3React();
    const { dataClient, farmingClient } = useClients();

    const [positionsForPool, setPositionsForPool] = useState<Position[] | null>(null);
    const [positionsForPoolLoading, setPositionsForPoolLoading] = useState<boolean>(false);

    const [transferredPositions, setTransferredPositions] = useState<Deposit[] | null>(null);
    const [transferredPositionsLoading, setTransferredPositionsLoading] = useState<boolean>(false);

    const [hasTransferredPositions, setHasTransferredPositions] = useState<boolean | null>(null);
    const [hasTransferredPositionsLoading, setHasTransferredPositionsLoading] = useState<boolean>(false);

    const [rewardsResult, setRewardsResult] = useState<FormattedRewardInterface[] | string>([]);
    const [rewardsLoading, setRewardsLoading] = useState<boolean>(false);

    const [futureEvents, setFutureEvents] = useState<FutureFarmingEvent[] | null>(null);
    const [futureEventsLoading, setFutureEventsLoading] = useState<boolean>(false);

    const [allEvents, setAllEvents] = useState<{ currentEvents: FarmingEvent[]; futureEvents: FutureFarmingEvent[] } | null>(null);
    const [allEventsLoading, setAllEventsLoading] = useState<boolean>(false);

    const [positionsOnFarmer, setPositionsOnFarmer] = useState<{ transferredPositionsIds: string[]; oldTransferredPositionsIds: string[] } | null>(null);
    const [positionsOnFarmerLoading, setPositionsOnFarmerLoading] = useState<boolean>(false);

    const [eternalFarms, setEternalFarms] = useState<FormattedEternalFarming[] | null>(null);
    const [eternalFarmsLoading, setEternalFarmsLoading] = useState<boolean>(false);

    const [positionsEternal, setPositionsEternal] = useState<TickFarming[] | null>(null);
    const [positionsEternalLoading, setPositionsEternalLoading] = useState<boolean>(false);

    const ethPrices = useEthPrices();

    async function fetchEternalFarmAPR() {
        const apiURL = AlgebraConfig.API.eternalFarmsAPR;

        try {
            return await fetch(apiURL).then((v) => v.json());
        } catch (error: any) {
            return {};
        }
    }

    async function getEvents(events: any[], farming = false) {
        const _events: any[] = [];

        for (let i = 0; i < events.length; i++) {
            console.log("count", i);
            const pool = await fetchPool(events[i].pool);
            const rewardToken = await fetchToken(events[i].rewardToken, farming);
            const bonusRewardToken = await fetchToken(events[i].bonusRewardToken, farming);
            const multiplierToken = await fetchToken(events[i].multiplierToken, farming);

            const _event: any = {
                ...events[i],
                pool,
                rewardToken,
                bonusRewardToken,
                multiplierToken,
                reward: formatUnits(BigNumber.from(events[i].reward), rewardToken.decimals),
                bonusReward: formatUnits(BigNumber.from(events[i].bonusReward), bonusRewardToken.decimals),
            };

            _events.push({ ..._event });
        }

        return _events;
    }

    async function fetchToken(tokenId: string, farming = false) {
        try {
            const {
                data: { tokens },
                error,
            } = await (farming ? farmingClient : dataClient).query<SubgraphResponse<TokenSubgraph[]>>({
                query: FETCH_TOKEN(),
                variables: { tokenId },
            });

            if (error) throw new Error(`${error.name} ${error.message}`);

            return tokens[0];
        } catch (err) {
            throw new Error("Fetch token " + err);
        }
    }

    async function fetchPool(poolId: string) {
        try {
            const {
                data: { pools },
                error,
            } = await dataClient.query<SubgraphResponse<PoolSubgraph[]>>({
                query: FETCH_POOL(),
                variables: { poolId },
            });

            if (error) throw new Error(`${error.name} ${error.message}`);

            return pools[0];
        } catch (err) {
            throw new Error("Fetch pools " + err);
        }
    }

    async function fetchLimit(limitFarmingId: string) {
        try {
            const {
                data: { limitFarmings },
                error,
            } = await farmingClient.query<SubgraphResponse<FutureFarmingEvent[]>>({
                query: FETCH_LIMIT(),
                variables: { limitFarmingId },
            });

            if (error) throw new Error(`${error.name} ${error.message}`);

            return limitFarmings[0];
        } catch (err) {
            throw new Error("Fetch limit farmings " + err);
        }
    }

    async function fetchEternalFarming(farmId: string) {
        try {
            const {
                data: { eternalFarmings },
                error,
            } = await farmingClient.query<SubgraphResponse<DetachedEternalFarming[]>>({
                query: FETCH_ETERNAL_FARM(),
                variables: { farmId },
            });

            if (error) throw new Error(`${error.name} ${error.message}`);

            return eternalFarmings[0];
        } catch (err: any) {
            throw new Error("Fetch infinite farming " + err.message);
        }
    }

    async function fetchRewards(reload?: boolean) {
        if (!account || !chainId) return;

        try {
            setRewardsLoading(true);

            const {
                data: { rewards },
                error,
            } = await farmingClient.query({
                query: FETCH_REWARDS(),
                fetchPolicy: reload ? "network-only" : "cache-first",
                variables: { account },
            });

            if (error) throw new Error(`${error.name} ${error.message}`);

            if (!provider) throw new Error("No provider");

            const newRewards: any[] = [];
            // skip 0x0000000000000000000000000000000000000000
            for (const reward of rewards) {
                if (reward.rewardAddress === "0x0000000000000000000000000000000000000000") continue;
                const rewardContract = new Contract(reward.rewardAddress, ERC20_ABI, provider);
                const symbol = await rewardContract.symbol();
                const name = await rewardContract.name();
                const decimals = await rewardContract.decimals();

                const newReward = {
                    ...reward,
                    amount: reward.amount > 0 ? (reward.amount / Math.pow(10, decimals)).toFixed(decimals) : 0,
                    trueAmount: reward.amount,
                    symbol,
                    name,
                };

                newRewards.push(newReward);
            }

            setRewardsResult(newRewards);
        } catch (err) {
            setRewardsResult("failed");
            console.log("err", err);
            if (err instanceof Error) {
                throw new Error("Reward fetching " + err.message);
            }
        }

        setRewardsLoading(false);
    }

    async function fetchFutureEvents(reload?: boolean) {
        try {
            setFutureEventsLoading(true);

            const {
                data: { limitFarmings: futureEvents },
                error,
            } = await farmingClient.query<SubgraphResponse<FutureFarmingEvent[]>>({
                query: FUTURE_EVENTS(),
                fetchPolicy: reload ? "network-only" : "cache-first",
                variables: { timestamp: Math.round(Date.now() / 1000) },
            });

            if (error) throw new Error(`${error.name} ${error.message}`);

            if (futureEvents.length === 0) {
                setFutureEvents([]);
                setFutureEventsLoading(false);
                return;
            }

            setFutureEvents(await getEvents(futureEvents, true));
        } catch (err) {
            throw new Error("Future limit farmings fetching " + err);
        } finally {
            setFutureEventsLoading(false);
        }
    }

    async function fetchAllEvents(reload?: boolean) {
        setAllEventsLoading(true);

        try {
            const {
                data: { limitFarmings: currentEvents },
                error,
            } = await farmingClient.query<SubgraphResponse<FarmingEvent[]>>({
                query: CURRENT_EVENTS(),
                fetchPolicy: reload ? "network-only" : "cache-first",
                variables: {
                    startTime: Math.round(Date.now() / 1000),
                    endTime: Math.round(Date.now() / 1000),
                },
            });

            if (error) throw new Error(`${error.name} ${error.message}`);

            const {
                data: { limitFarmings: futureEvents },
                error: _error,
            } = await farmingClient.query<SubgraphResponse<FutureFarmingEvent[]>>({
                query: FUTURE_EVENTS(),
                fetchPolicy: reload ? "network-only" : "cache-first",
                variables: { timestamp: Math.round(Date.now() / 1000) },
            });

            if (_error) throw new Error(`${_error.name} ${_error.message}`);

            if (currentEvents.length === 0 && futureEvents.length === 0) {
                setAllEvents({
                    currentEvents: [],
                    futureEvents: [],
                });
                setAllEventsLoading(false);
                return;
            }

            const eventTVL = await fetchLimitFarmTVL();
            const aprs: Aprs = await fetchLimitFarmAPR();

            const price = 1;

            const EVENT_LOCK = 100_000;

            setAllEvents({
                currentEvents: await getEvents(
                    currentEvents.map((el) => ({
                        ...el,
                        active: true,
                        apr: aprs[el.id] ? aprs[el.id] : 37,
                    })),
                    true
                ),
                futureEvents: await getEvents(
                    futureEvents.map((el) => ({
                        ...el,
                        locked: eventTVL[el.id] === undefined ? false : eventTVL[el.id] * price >= EVENT_LOCK,
                        apr: aprs[el.id] ? aprs[el.id] : 37,
                    })),
                    true
                ),
            });

            setAllEventsLoading(false);
        } catch (err) {
            throw new Error("Error while fetching current limit farmings " + err);
        } finally {
            setAllEventsLoading(false);
        }
    }

    async function fetchHasTransferredPositions() {
        if (!chainId || !account) return;

        if (!provider) throw new Error("No provider");

        try {
            setHasTransferredPositionsLoading(true);

            const {
                data: { deposits: positionsTransferred },
                error,
            } = await farmingClient.query<SubgraphResponse<Deposit[]>>({
                query: HAS_TRANSFERED_POSITIONS(),
                fetchPolicy: "network-only",
                variables: { account },
            });

            if (error) throw new Error(`${error.name} ${error.message}`);

            setHasTransferredPositions(Boolean(positionsTransferred.length));
            setHasTransferredPositionsLoading(false);
        } catch (err: any) {
            throw new Error("Has transferred positions " + err.code + " " + err.message);
        } finally {
            setHasTransferredPositionsLoading(false);
        }
    }

    async function fetchTransferredPositions(reload?: boolean) {
        if (!chainId || !account) return;

        if (!provider) throw new Error("No provider");

        try {
            setTransferredPositionsLoading(true);

            const {
                data: { deposits: positionsTransferred },
                error,
            } = await farmingClient.query<SubgraphResponse<Deposit[]>>({
                query: TRANSFERED_POSITIONS(true),
                fetchPolicy: reload ? "network-only" : "cache-first",
                variables: { account },
            });

            if (error) throw new Error(`${error.name} ${error.message}`);

            if (positionsTransferred.length === 0) {
                setTransferredPositions([]);
                setTransferredPositionsLoading(false);
                return;
            }

            const _positions: any[] = [];
            let i = 0;
            for (const position of positionsTransferred) {
                console.log("count", i)
                const nftContract = new Contract(NONFUNGIBLE_POSITION_MANAGER_ADDRESSES[chainId], NON_FUN_POS_MAN, provider.getSigner());

                const { tickLower, tickUpper, liquidity, token0, token1 } = await nftContract.positions(+position.id);

                let _position = {
                    ...position,
                    tickLower,
                    tickUpper,
                    liquidity,
                    token0,
                    token1,
                };

                if (!position.limitFarming && !position.eternalFarming && typeof position.pool === "string") {
                    const _pool = await fetchPool(position.pool);

                    if (!_pool) continue;
                    //@ts-ignore
                    _position = { ..._position, pool: _pool };
                }

                if (position.limitFarming) {
                    const finiteFarmingContract = new Contract(FINITE_FARMING[chainId], FINITE_FARMING_ABI, provider.getSigner());

                    const {
                        rewardToken,
                        bonusRewardToken,
                        pool,
                        startTime,
                        endTime,
                        createdAtTimestamp,
                        multiplierToken,
                        tokenAmountForTier1,
                        tokenAmountForTier2,
                        tokenAmountForTier3,
                        tier1Multiplier,
                        tier2Multiplier,
                        tier3Multiplier,
                    } = await fetchLimit(position.limitFarming);

                    const rewardInfo = await finiteFarmingContract.callStatic.getRewardInfo([rewardToken, bonusRewardToken, pool, +startTime, +endTime], +position.id);

                    const _rewardToken = await fetchToken(rewardToken, true);
                    const _bonusRewardToken = await fetchToken(bonusRewardToken, true);
                    const _multiplierToken = await fetchToken(multiplierToken, true);
                    const _pool = await fetchPool(pool);

                    if (!_pool || !_rewardToken || !_bonusRewardToken || !_multiplierToken) continue;

                    _position = {
                        ..._position,
                        //@ts-ignore
                        pool: _pool,
                        limitRewardToken: _rewardToken,
                        limitBonusRewardToken: _bonusRewardToken,
                        limitStartTime: +startTime,
                        limitEndTime: +endTime,
                        started: +startTime * 1000 < Date.now(),
                        ended: +endTime * 1000 < Date.now(),
                        createdAtTimestamp: +createdAtTimestamp,
                        limitEarned: rewardInfo[0] ? formatUnits(BigNumber.from(rewardInfo[0]), _rewardToken.decimals) : 0,
                        limitBonusEarned: rewardInfo[1] ? formatUnits(BigNumber.from(rewardInfo[1]), _bonusRewardToken.decimals) : 0,
                        multiplierToken: _multiplierToken,
                        limitTokenAmountForTier1: tokenAmountForTier1,
                        limitTokenAmountForTier2: tokenAmountForTier2,
                        limitTokenAmountForTier3: tokenAmountForTier3,
                        limitTier1Multiplier: tier1Multiplier,
                        limitTier2Multiplier: tier2Multiplier,
                        limitTier3Multiplier: tier3Multiplier,
                    };
                } else {
                    const {
                        data: { limitFarmings },
                        error,
                    } = await farmingClient.query({
                        //@ts-ignore
                        query: FETCH_FINITE_FARM_FROM_POOL([position.pool]),
                        fetchPolicy: "network-only",
                    });

                    if (error) throw new Error(`${error.name} ${error.message}`);

                    if (limitFarmings.filter((farm: any) => Math.round(Date.now() / 1000) < farm.startTime).length !== 0) {
                        _position = {
                            ..._position,
                            limitAvailable: true,
                        };
                    }
                }

                if (position.eternalFarming) {
                    const {
                        rewardToken,
                        bonusRewardToken,
                        pool,
                        startTime,
                        endTime,
                        multiplierToken,
                        tier1Multiplier,
                        tier2Multiplier,
                        tier3Multiplier,
                        tokenAmountForTier1,
                        tokenAmountForTier2,
                        tokenAmountForTier3,
                    } = await fetchEternalFarming(position.eternalFarming);

                    const farmingCenterContract = new Contract(FARMING_CENTER[chainId], FARMING_CENTER_ABI, provider.getSigner());

                    const { reward, bonusReward } = await farmingCenterContract.callStatic.collectRewards([rewardToken, bonusRewardToken, pool, startTime, endTime], +position.id, { from: account });

                    const _rewardToken = await fetchToken(rewardToken, true);
                    const _bonusRewardToken = await fetchToken(bonusRewardToken, true);
                    const _pool = await fetchPool(pool);
                    const _multiplierToken = await fetchToken(multiplierToken, true);

                    if (!_pool || !_rewardToken || !_bonusRewardToken || !_multiplierToken) continue;

                    _position = {
                        ..._position,
                        eternalRewardToken: _rewardToken,
                        eternalBonusRewardToken: _bonusRewardToken,
                        eternalStartTime: startTime,
                        eternalEndTime: endTime,
                        multiplierToken: _multiplierToken,
                        eternalTier1Multiplier: tier1Multiplier,
                        eternalTier2Multiplier: tier2Multiplier,
                        eternalTier3Multiplier: tier3Multiplier,
                        eternalTokenAmountForTier1: tokenAmountForTier1,
                        eternalTokenAmountForTier2: tokenAmountForTier2,
                        eternalTokenAmountForTier3: tokenAmountForTier3,
                        //@ts-ignore
                        pool: _pool,
                        eternalEarned: formatUnits(BigNumber.from(reward), _rewardToken.decimals),
                        eternalBonusEarned: formatUnits(BigNumber.from(bonusReward), _bonusRewardToken.decimals),
                    };
                } else {
                    const {
                        data: { eternalFarmings },
                        error,
                    } = await farmingClient.query({
                        //@ts-ignore
                        query: FETCH_ETERNAL_FARM_FROM_POOL([position.pool]),
                        fetchPolicy: "network-only",
                    });

                    if (error) throw new Error(`${error.name} ${error.message}`);

                    if (eternalFarmings.filter((farm: any) => (+farm.rewardRate || +farm.bonusRewardRate) && !farm.isDetached).length !== 0) {
                        _position = {
                            ..._position,
                            eternalAvailable: true,
                        };
                    }
                }

                _positions.push(_position);
            }
            setTransferredPositions(_positions);
        } catch (err: any) {
            throw new Error("Transferred positions " + "code: " + err.code + ", " + err.message);
        } finally {
            setTransferredPositionsLoading(false);
        }
    }

    async function fetchPositionsOnEternalFarming(reload?: boolean) {
        if (!chainId || !account) return;

        if (!provider) throw new Error("No provider");

        setPositionsEternalLoading(true);

        try {
            const {
                data: { deposits: eternalPositions },
                error,
            } = await farmingClient.query<SubgraphResponse<Position[]>>({
                query: POSITIONS_ON_ETERNAL_FARMING(),
                fetchPolicy: reload ? "network-only" : "cache-first",
                variables: { account },
            });

            if (error) throw new Error(`${error.name} ${error.message}`);

            if (eternalPositions.length === 0) {
                setPositionsEternal([]);
                setPositionsEternalLoading(false);
                return;
            }

            const _positions: TickFarming[] = [];
            let m = 0;
            for (const position of eternalPositions) {
                console.log("count m", m)
                const nftContract = new Contract(NONFUNGIBLE_POSITION_MANAGER_ADDRESSES[chainId], NON_FUN_POS_MAN, provider.getSigner());

                const { tickLower, tickUpper, liquidity, token0, token1 } = await nftContract.positions(+position.id);

                let _position: TickFarming = { tickLower, tickUpper, liquidity, token0, token1 };

                const { rewardToken, bonusRewardToken, pool, startTime, endTime } = await fetchEternalFarming(String(position.eternalFarming));

                const _pool = await fetchPool(pool);
                const _rewardToken = await fetchToken(rewardToken);
                const _bonusRewardToken = await fetchToken(bonusRewardToken);

                if (!_pool || !_rewardToken || !_bonusRewardToken) continue;

                _position = {
                    ..._position,
                    ...position,
                    pool: _pool,
                    rewardToken: _rewardToken,
                    bonusRewardToken: _bonusRewardToken,
                    startTime,
                    endTime,
                };

                _positions.push(_position);
            }

            setPositionsEternal(_positions);
        } catch (error: any) {
            throw new Error("Infinite farms loading" + error.code + error.message);
        }
    }

    async function fetchPositionsForPool(pool: PoolChartSubgraph, minRangeLength: string) {
        if (!chainId || !account) return;

        try {
            setPositionsForPoolLoading(true);

            const {
                data: { deposits: positionsTransferred },
                error: errorTransferred,
            } = await farmingClient.query<SubgraphResponse<Position[]>>({
                query: TRANSFERED_POSITIONS_FOR_POOL(),
                fetchPolicy: "network-only",
                variables: { account, pool: pool.id, minRangeLength },
            });

            if (errorTransferred) throw new Error(`${errorTransferred.name} ${errorTransferred.message}`);

            const _positions: Position[] = [];

            let _position: Position;

            //Hack
            for (const position of positionsTransferred) {
                _position = { ...position, onFarmingCenter: position.onFarmingCenter };

                _positions.push(_position);
            }

            setPositionsForPool(_positions);
        } catch (err) {
            throw new Error("Positions for pools " + err);
        } finally {
            setPositionsForPoolLoading(false);
        }
    }

    async function fetchPositionsOnFarmer(account: string) {
        try {
            setPositionsOnFarmerLoading(true);

            const {
                data: { deposits: positionsTransferred },
                error,
            } = await farmingClient.query<SubgraphResponse<Position[]>>({
                query: TRANSFERED_POSITIONS(true),
                fetchPolicy: "network-only",
                variables: { account },
            });

            if (error) throw new Error(`${error.name} ${error.message}`);

            // const { data: { deposits: oldPositionsTransferred }, error: _error } = (await oldFarmingClient.query<SubgraphResponse<Deposit[]>>({
            //     query: TRANSFERED_POSITIONS(false),
            //     fetchPolicy: 'network-only',
            //     variables: { account }
            // }))

            // if (_error) throw new Error(`${_error.name} ${_error.message}`)

            if (positionsTransferred.length === 0) {
                setPositionsOnFarmer({
                    transferredPositionsIds: [],
                    oldTransferredPositionsIds: [],
                });
                setPositionsOnFarmerLoading(false);
                return;
            }

            const transferredPositionsIds = positionsTransferred.map((position) => position.id);

            const oldTransferredPositionsIds = [];

            setPositionsOnFarmer({
                transferredPositionsIds,
                oldTransferredPositionsIds,
            });
        } catch (err) {
            setPositionsOnFarmerLoading(false);
            throw new Error("Fetching positions on farmer " + err);
        }
    }

    async function fetchEternalFarms(reload: boolean) {
        // if (!ethPrices) return

        setEternalFarmsLoading(true);

        try {
            const {
                data: { eternalFarmings },
                error,
            } = await farmingClient.query<SubgraphResponse<EternalFarming[]>>({
                query: INFINITE_EVENTS(Math.round(Date.now() / 1000)),
                fetchPolicy: reload ? "network-only" : "cache-first",
            });

            if (error) throw new Error(`${error.name} ${error.message}`);

            if (eternalFarmings.length === 0) {
                setEternalFarms([]);
                setEternalFarmsLoading(false);
                return;
            }

            // Collect all unique IDs
            const poolIds = [...new Set(eternalFarmings.map(farm => farm.pool))];
            const rewardTokenIds = [...new Set(eternalFarmings.map(farm => farm.rewardToken))];
            const bonusRewardTokenIds = [...new Set(eternalFarmings.map(farm => farm.bonusRewardToken))];
            const multiplierTokenIds = [...new Set(eternalFarmings.map(farm => farm.multiplierToken))];

            const allTokenIds = [...new Set([...rewardTokenIds, ...bonusRewardTokenIds, ...multiplierTokenIds])];

            // Fetch all pools and tokens in batch
            const {
                data: { pools: fetchedPoolsData },
                error: poolsError,
            } = await dataClient.query<SubgraphResponse<PoolSubgraph[]>>({
                query: FETCH_POOLS_BY_IDS(poolIds),
            });

            if (poolsError) throw new Error(`Fetch pools error: ${poolsError.name} ${poolsError.message}`);

            const {
                data: { tokens: fetchedTokensData },
                error: tokensError,
            } = await farmingClient.query<SubgraphResponse<TokenSubgraph[]>>({
                query: FETCH_TOKENS_BY_IDS(allTokenIds),
                variables: { tokenIds: allTokenIds }, // Ensure 'tokenIds' is the correct variable name if your GQL query expects it
            });

            if (tokensError) throw new Error(`Fetch tokens error: ${tokensError.name} ${tokensError.message}`);

            // Create maps for easy lookup
            const poolMap = new Map(fetchedPoolsData.map(p => [p.id, p]));
            const tokenMap = new Map(fetchedTokensData.map(t => [t.id, t]));

            let _eternalFarmings: FormattedEternalFarming[] = [];

            for (const farming of eternalFarmings) {
                const pool = poolMap.get(farming.pool);
                const rewardToken = tokenMap.get(farming.rewardToken);
                const bonusRewardToken = tokenMap.get(farming.bonusRewardToken);
                const multiplierToken = tokenMap.get(farming.multiplierToken);

                if (!pool || !rewardToken || !bonusRewardToken || !multiplierToken) {
                    console.warn("Missing data for farming id:", farming.id, { pool, rewardToken, bonusRewardToken, multiplierToken });
                    continue;
                }

                const _rewardRate = formatUnits(BigNumber.from(farming.rewardRate), rewardToken.decimals);
                const _bonusRewardRate = formatUnits(BigNumber.from(farming.bonusRewardRate), bonusRewardToken.decimals);

                const dailyRewardRate = Math.round(+_rewardRate * 86_400);
                const dailyBonusRewardRate = Math.round(+_bonusRewardRate * 86_400);

                _eternalFarmings.push({
                    ...farming,
                    rewardToken,
                    bonusRewardToken,
                    multiplierToken,
                    dailyRewardRate,
                    dailyBonusRewardRate,
                    pool,
                    apr: 0, // Assuming APR and TVL are handled elsewhere or will be adjusted
                    tvl: 0,
                });
            }

            setEternalFarms(_eternalFarmings);
        } catch (err) {
            setEternalFarms(null);
            if (err instanceof Error) {
                throw new Error("Error while fetching infinite farms " + err.message);
            }
        } finally {
            setEternalFarmsLoading(false);
        }
    }

    return {
        ethPricesFecthed: !!ethPrices,
        fetchRewards: { rewardsResult, rewardsLoading, fetchRewardsFn: fetchRewards },
        fetchFutureEvents: {
            futureEvents,
            futureEventsLoading,
            fetchFutureEventsFn: fetchFutureEvents,
        },
        fetchAllEvents: { allEvents, allEventsLoading, fetchAllEventsFn: fetchAllEvents },
        fetchPositionsForPool: {
            positionsForPool,
            positionsForPoolLoading,
            fetchPositionsForPoolFn: fetchPositionsForPool,
        },
        fetchTransferredPositions: {
            transferredPositions,
            transferredPositionsLoading,
            fetchTransferredPositionsFn: fetchTransferredPositions,
        },
        fetchHasTransferredPositions: {
            hasTransferredPositions,
            hasTransferredPositionsLoading,
            fetchHasTransferredPositionsFn: fetchHasTransferredPositions,
        },
        fetchPositionsOnFarmer: {
            positionsOnFarmer,
            positionsOnFarmerLoading,
            fetchPositionsOnFarmerFn: fetchPositionsOnFarmer,
        },
        fetchEternalFarms: {
            eternalFarms,
            eternalFarmsLoading,
            fetchEternalFarmsFn: fetchEternalFarms,
        },
        fetchPositionsOnEternalFarmings: {
            positionsEternal,
            positionsEternalLoading,
            fetchPositionsOnEternalFarmingFn: fetchPositionsOnEternalFarming,
        },
    };
}
