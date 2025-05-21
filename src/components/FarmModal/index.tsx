import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle, Frown, X } from "react-feather";
import { useFarmingSubgraph } from "../../hooks/useFarmingSubgraph";
import { useFarmingHandlers } from "../../hooks/useFarmingHandlers";
import { useAllTransactions } from "../../state/transactions/hooks";
import { useChunkedRows } from "../../utils/chunkForRows";
import Loader from "../Loader";
import { FarmingType } from "../../models/enums";
import { NFTPosition, NFTPositionDescription, NFTPositionIcon, NFTPositionIndex, NFTPositionLink, NFTPositionSelectCircle, NFTPositionsRow } from "./styled";
import { useSortedRecentTransactions } from "../../hooks/useSortedRecentTransactions";
import { NTFInterface } from "../../models/interfaces";
import { NavLink } from "react-router-dom";
import "./index.scss";
import FarmModalFarmingTiers from "components/FarmModalFarmingTiers";
import { IsActive } from "components/FarmingMyFarms/IsActive";
import { useCurrencyBalance } from "state/wallet/hooks";
import { ApprovalState, useApproveCallback } from "hooks/useApproveCallback";
import { CurrencyAmount } from "@uniswap/sdk-core";
import { FARMING_CENTER } from "constants/addresses";
import { useAccount } from "wagmi";
import { Token } from "@uniswap/sdk-core";
import { formatUnits } from "ethers";

import { t, Trans } from "@lingui/macro";

import AlgebraConfig from "algebra.config";
import { useV3PositionFromTokenId } from "../../hooks/useV3Positions";
import { useToken } from "../../hooks/Tokens";
import useUSDCPrice from "../../hooks/useUSDCPrice";
import { Position } from "lib/src";
import { usePool } from "../../hooks/usePools";
import { NEVER_RELOAD } from "../../state/multicall/hooks";

interface FarmModalProps {
    event: {
        pool: any;
        startTime: string;
        endTime: string;
        id: string;
        rewardToken: any;
        bonusRewardToken: any;
        tier1Multiplier: string;
        tier2Multiplier: string;
        tier3Multiplier: string;
        tokenAmountForTier1: string;
        tokenAmountForTier2: string;
        tokenAmountForTier3: string;
        multiplierToken: any;
        minRangeLength: string;
    };
    closeHandler: () => void;
    farmingType: FarmingType;
}

export function FarmModal({
    event: {
        pool,
        startTime,
        endTime,
        rewardToken,
        bonusRewardToken,
        tier1Multiplier,
        tier2Multiplier,
        tier3Multiplier,
        multiplierToken,
        tokenAmountForTier1,
        tokenAmountForTier2,
        tokenAmountForTier3,
        minRangeLength,
    },
    closeHandler,
    farmingType,
}: FarmModalProps) {
    const { address: account } = useAccount();

    const isTierFarming = useMemo(
        () => Boolean((+tier1Multiplier || +tier2Multiplier || +tier3Multiplier) && (+tokenAmountForTier1 || +tokenAmountForTier2 || +tokenAmountForTier3)),
        [tier1Multiplier, tier2Multiplier, tier3Multiplier, tokenAmountForTier1, tokenAmountForTier2, tokenAmountForTier3]
    );

    const [selectedNFT, setSelectedNFT] = useState<null | NTFInterface>(null);
    const {
        fetchPositionsForPool: { positionsForPool, positionsForPoolLoading, fetchPositionsForPoolFn },
    } = useFarmingSubgraph() || {};

    const { approveHandler, approvedHash, farmHandler, farmedHash } = useFarmingHandlers() || {};

    const [selectedTier, setSelectedTier] = useState<string | null>(null);

    useEffect(() => {
        fetchPositionsForPoolFn(pool, minRangeLength);
    }, []);

    const positionsForStake = useMemo(() => {
        if (!positionsForPool) return [];

        return positionsForPool.filter((position) => {
            if (position.pool !== pool.id) return;

            if (farmingType === FarmingType.ETERNAL && position.eternalFarming) return;

            if (farmingType === FarmingType.LIMIT && position.limitFarming) return;

            return true;
        });
    }, [positionsForPool]);
    const [chunkedPositions, setChunkedPositions] = useState<any[][] | null | undefined>(null);

    //TODO
    const _chunked = useChunkedRows(positionsForStake, 1000);

    const [submitState, setSubmitState] = useState(0);
    const [submitLoader, setSubmitLoader] = useState(false);

    useEffect(() => setChunkedPositions(_chunked), [_chunked]);

    const allTransactions = useAllTransactions();

    const sortedRecentTransactions = useSortedRecentTransactions();

    const confirmed = useMemo(() => sortedRecentTransactions.filter((tx) => tx.receipt).map((tx) => tx.hash), [sortedRecentTransactions, allTransactions]);

    const filterNFTs = useCallback(
        (fn) => {
            if (!selectedNFT) return;

            const _filtered = [selectedNFT].filter(fn);

            return _filtered.length > 0 ? _filtered[0] : null;
        },
        [selectedNFT]
    );

    const NFTsForApprove = useMemo(() => filterNFTs((v: NTFInterface) => !v.onFarmingCenter), [selectedNFT, submitState]);

    const NFTsForStake = useMemo(() => filterNFTs((v: NTFInterface) => v.onFarmingCenter), [selectedNFT, submitState]);

    useEffect(() => {
        if (!approvedHash || (approvedHash && submitState !== 0)) return;

        if (typeof approvedHash === "string") {
            setSubmitLoader(false);
        } else if (approvedHash.hash && confirmed.includes(approvedHash.hash)) {
            const _newChunked: any = [];

            if (chunkedPositions) {
                for (const row of chunkedPositions) {
                    const _newRow: any = [];

                    for (const position of row) {
                        if (position.id === approvedHash.id) {
                            position.onFarmingCenter = true;
                            setSelectedNFT((old) => ({
                                ...old,
                                onFarmingCenter: true,
                            }));
                        }
                        _newRow.push(position);
                    }
                    _newChunked.push(_newRow);
                }
            }

            setChunkedPositions(_newChunked);
            setSubmitState(1);
            setSubmitLoader(false);
        }
    }, [approvedHash, confirmed]);

    useEffect(() => {
        if (!farmedHash || (farmedHash && submitState !== 2)) return;

        if (typeof farmedHash === "string") {
            setSubmitLoader(false);
        } else if (farmedHash.hash && confirmed.includes(farmedHash.hash)) {
            const _newChunked: any = [];

            if (chunkedPositions) {
                for (const row of chunkedPositions) {
                    const _newRow: any = [];

                    for (const position of row) {
                        if (position.id === farmedHash.id) {
                            position.onFarmingCenter = true;
                            setSelectedNFT((old) => ({
                                ...old,
                                onFarmingCenter: true,
                            }));
                        }
                        _newRow.push(position);
                    }
                    _newChunked.push(_newRow);
                }
            }
            setChunkedPositions(_newChunked);
            setSubmitState(3);
            setSubmitLoader(false);
        }
    }, [farmedHash, confirmed]);

    const approveNFTs = useCallback(() => {
        setSubmitLoader(true);
        setSubmitState(0);
        if (selectedNFT && selectedNFT.id) {
            approveHandler(selectedNFT as { id: string; onFarmingCenter?: boolean });
        }
    }, [selectedNFT, approveHandler]);

    const farmNFTs = useCallback(
        (eventType: FarmingType) => {
            setSubmitLoader(true);
            setSubmitState(2);
            if (selectedNFT && selectedNFT.id) {
                farmHandler(
                    selectedNFT as { id: string; onFarmingCenter?: boolean },
                    {
                        pool: pool.id,
                        rewardToken: rewardToken.id,
                        bonusRewardToken: bonusRewardToken.id,
                        startTime,
                        endTime,
                    },
                    eventType,
                    selectedTier || 0
                );
            }
        },
        [selectedNFT, pool, rewardToken, bonusRewardToken, startTime, endTime, farmHandler, selectedTier]
    );

    const balance = useCurrencyBalance(
        account ?? undefined,
        multiplierToken ? new Token(AlgebraConfig.CHAIN_PARAMS.chainId, multiplierToken.id, +multiplierToken.decimals, multiplierToken.symbol, multiplierToken.name) : undefined
    );

    const isEnoughTokenForLock = useMemo(() => {
        if (!balance) return false;

        const _balance = +balance.toSignificant(4);

        switch (selectedTier) {
            case tokenAmountForTier1:
                return +_balance >= +formatUnits(BigInt(tokenAmountForTier1), multiplierToken.decimals);
            case tokenAmountForTier2:
                return +_balance >= +formatUnits(BigInt(tokenAmountForTier2), multiplierToken.decimals);
            case tokenAmountForTier3:
                return +_balance >= +formatUnits(BigInt(tokenAmountForTier3), multiplierToken.decimals);
            default:
                return true;
        }
    }, [balance, selectedTier, tokenAmountForTier1, tokenAmountForTier2, tokenAmountForTier3, multiplierToken?.decimals]);

    const tierSelectionHandler = useCallback(
        (tier) => {
            switch (tier) {
                case 0:
                    setSelectedTier(null);
                    break;
                case 1:
                    setSelectedTier(tokenAmountForTier1);
                    break;
                case 2:
                    setSelectedTier(tokenAmountForTier2);
                    break;
                case 3:
                    setSelectedTier(tokenAmountForTier3);
                    break;
                case "":
                    setSelectedTier("");
            }

            if (!isEnoughTokenForLock || tier === "") setSelectedNFT(null);
        },
        [isEnoughTokenForLock, selectedTier]
    );

    const _amountForApprove = useMemo(() => {
        if (!selectedTier || !multiplierToken) return undefined;

        return CurrencyAmount.fromRawAmount(new Token(AlgebraConfig.CHAIN_PARAMS.chainId, multiplierToken.id, +multiplierToken.decimals, multiplierToken.symbol, multiplierToken.name), selectedTier);
    }, [selectedTier, multiplierToken]);

    const [approval, approveCallback] = useApproveCallback(_amountForApprove, AlgebraConfig.V3_CONTRACTS.FARMING_CENTER_ADDRESS);

    const showApproval = approval !== ApprovalState.APPROVED && !!_amountForApprove;

    const linkToProviding = `/add/${pool.token0.id}/${pool.token1.id}`;

    return (
        <>
            {submitState === 3 ? (
                <div className={"w-100 p-1 c-w cur-d"}>
                    <div className={"f f-je mb-1 w-100"}>
                        <button className={"bg-t br-0"} onClick={closeHandler}>
                            <X size={18} stroke={"var(--white)"} />
                        </button>
                    </div>
                    <div className={"h-400 f c f-ac f-jc"}>
                        <CheckCircle size={55} stroke={"var(--green)"} />
                        {selectedNFT?.id && <p className={"mt-05"}>{t`Position #${selectedNFT.id} deposited succesfully!`}</p>}
                    </div>
                </div>
            ) : positionsForPoolLoading ? (
                <div className={"w-100 p-1 c-w h-400 f c f-ac f-jc cur-p"}>
                    <Loader stroke={"var(--white)"} size={"25px"} />
                </div>
            ) : (
                <div className={`w-100 c-w ${!isTierFarming && "h-400 pos-r"}`}>
                    <div className={"mb-1 flex-s-between"}>
                        <div>
                            <Trans>Select NFT for farming</Trans>
                        </div>
                        <button className={"bg-t br-0"} onClick={closeHandler}>
                            <X size={18} stroke={"var(--white)"} />
                        </button>
                    </div>
                    {isTierFarming && chunkedPositions && chunkedPositions.length !== 0 && (
                        <FarmModalFarmingTiers
                            tiersLimits={{
                                low: tokenAmountForTier1,
                                medium: tokenAmountForTier2,
                                high: tokenAmountForTier3,
                            }}
                            tiersMultipliers={{
                                low: tier1Multiplier,
                                medium: tier2Multiplier,
                                high: tier3Multiplier,
                            }}
                            multiplierToken={multiplierToken}
                            selectTier={tierSelectionHandler}
                        />
                    )}
                    {isTierFarming && chunkedPositions && chunkedPositions.length !== 0 && (
                        <div className="mv-1 f w-100">
                            <span className="b" style={{ fontSize: "18px" }}>{t`2. Select a Position`}</span>
                        </div>
                    )}
                    <div style={{ position: "relative", overflowY: "auto", height: "100%" }}>
                        <div style={{ height: "unset", marginLeft: "-1rem", position: "relative", marginRight: "-1rem" }} className="mb-1 pl-1 pr-1">
                            {chunkedPositions && chunkedPositions.length === 0 ? (
                                <div className={`f c f-ac f-jc`}>
                                    <Frown size={30} stroke={"var(--white)"} />
                                    <p className={"mt-1 mb-05"}>
                                        <Trans>No NFT-s for this pool</Trans>
                                    </p>
                                    <p>
                                        <Trans>To take part in this farming event, you need to</Trans>
                                    </p>
                                    <NavLink className={"flex-s-between c-w ph-1 pv-05 bg-p br-8 mt-1 hover-c-ph"} to={linkToProviding}>
                                        <span>{t`Provide liquidity for ${pool.token0.symbol} / ${pool.token1.symbol}`}</span>
                                        <ArrowRight className={"ml-05"} size={16} />
                                    </NavLink>
                                </div>
                            ) : chunkedPositions && chunkedPositions.length !== 0 ? (
                                chunkedPositions.map((row, i, arr) => (
                                    <div style={{ opacity: !isEnoughTokenForLock && selectedTier ? "0.5" : "1" }} className="mb-1 pl-1 pb-1 pr-1 mxs_pb-0 farm-modal__nft-position-row" key={i}>
                                        {row.map((token, j) => {
                                            return (
                                                <PoistionCard
                                                    token={token}
                                                    selectedNFT={selectedNFT}
                                                    isEnoughTokenForLock={isEnoughTokenForLock}
                                                    selectedTier={selectedTier}
                                                    submitLoader={submitLoader}
                                                    setSelectedNFT={setSelectedNFT}
                                                />
                                            );
                                        })}
                                    </div>
                                ))
                            ) : (
                                <NFTPositionsRow>
                                    {[0, 1, 2].map((el, i) => (
                                        <NFTPosition key={i} skeleton>
                                            <NFTPositionIcon skeleton />
                                            <NFTPositionDescription skeleton>
                                                <NFTPositionIndex skeleton />
                                                <NFTPositionLink skeleton />
                                            </NFTPositionDescription>
                                            <NFTPositionSelectCircle />
                                        </NFTPosition>
                                    ))}
                                </NFTPositionsRow>
                            )}
                        </div>
                        <div style={{ paddingBottom: "30px" }}>
                            {selectedTier === "" && chunkedPositions && chunkedPositions.length !== 0 ? (
                                <button disabled id={"farming-select-tier"} className={"btn primary w-100 p-1 farming-select-tier"}>
                                    <Trans>Select Tier</Trans>
                                </button>
                            ) : selectedTier && !isEnoughTokenForLock && chunkedPositions && chunkedPositions.length !== 0 ? (
                                <button disabled className="btn primary w-100 p-1">{t`Not enough ${multiplierToken.symbol}`}</button>
                            ) : selectedNFT ? (
                                <div className={`f mxs_fd-c w-100`}>
                                    {selectedTier && (
                                        <button
                                            disabled={!showApproval || !selectedTier}
                                            onClick={approveCallback}
                                            id={"farming-approve-algb"}
                                            className={"btn primary w-100 mr-1 mxs_mr-0 p-1 mxs_mb-1 farming-approve-algb"}
                                        >
                                            {approval === ApprovalState.PENDING ? (
                                                <span className={"f f-ac f-jc"}>
                                                    <Loader stroke={"white"} />
                                                    <span className={"ml-05"}>
                                                        <Trans>Approving</Trans>
                                                    </span>
                                                </span>
                                            ) : !showApproval ? (
                                                t`${multiplierToken.symbol} Approved`
                                            ) : (
                                                t`Approve ${multiplierToken.symbol}`
                                            )}
                                        </button>
                                    )}
                                    <button
                                        disabled={submitLoader || !NFTsForApprove}
                                        onClick={approveNFTs}
                                        id={"farming-approve-nft"}
                                        className={"btn primary w-100 mr-1 mxs_mr-0 mxs_mb-1 p-1 farming-approve-nft"}
                                    >
                                        {submitLoader && submitState === 0 ? (
                                            <span className={"f f-ac f-jc"}>
                                                <Loader stroke={"white"} />
                                                <span className={"ml-05"}>
                                                    <Trans>Approving</Trans>
                                                </span>
                                            </span>
                                        ) : NFTsForStake && !NFTsForApprove ? (
                                            t`Position Approved`
                                        ) : (
                                            t`Approve Position`
                                        )}
                                    </button>
                                    <button
                                        disabled={submitLoader || !NFTsForStake}
                                        onClick={() => farmNFTs(farmingType)}
                                        id={"farming-deposit-nft"}
                                        className={"btn primary w-100 mxs_mb-1 p-1 farming-deposit-nft"}
                                    >
                                        {submitLoader && submitState === 2 ? (
                                            <span className={"f f-ac f-jc"}>
                                                <Loader stroke={"white"} />
                                                <span className={"ml-05"}>
                                                    <Trans>Depositing</Trans>
                                                </span>
                                            </span>
                                        ) : (
                                            t`Deposit`
                                        )}
                                    </button>
                                </div>
                            ) : chunkedPositions && chunkedPositions.length !== 0 ? (
                                <button disabled id={"farming-select-nft"} className={`btn primary w-100 p-1 farming-select-nft`}>
                                    <Trans>Select Position</Trans>
                                </button>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// Internal component for displaying individual NFT position to stake
const PoistionCard = ({ token, selectedNFT, isEnoughTokenForLock, selectedTier, submitLoader, setSelectedNFT }) => {
    // token here is the selectedNFT from the modal's state (type NTFInterface)

    // Get the detailed, on-chain position data for the selected NFT
    const { loading: positionLoading, position: positionDetails }
        = useV3PositionFromTokenId(token?.id ? BigInt(token.id) : undefined) || {};

    const token0Address = positionDetails?.token0;
    const token1Address = positionDetails?.token1;

    const currency0 = useToken(token0Address);
    const currency1 = useToken(token1Address);

    // usePool will use NEVER_RELOAD because we modified it to accept ListenerOptions
    const [, poolInstance] = usePool(currency0 ?? undefined, currency1 ?? undefined, NEVER_RELOAD);

    const { liquidity, tickLower, tickUpper } = { ...positionDetails };

    const price0 = useUSDCPrice(currency0 ?? undefined);
    const price1 = useUSDCPrice(currency1 ?? undefined);

    const fiatValueOfLiquidity: () => CurrencyAmount<Token> | null = () => {
        if (positionLoading || !price0 || !price1 || !poolInstance || !liquidity || typeof tickLower !== "number" || typeof tickUpper !== "number") return null;
        const positionSDK = new Position({
            pool: poolInstance,
            liquidity: liquidity.toString(),
            tickLower,
            tickUpper,
        });
        // Ensure amounts are quoted correctly to get their fiat value
        const fiatAmount0 = price0.quote(positionSDK.amount0);
        const fiatAmount1 = price1.quote(positionSDK.amount1);
        return fiatAmount0.add(fiatAmount1);
    };

    return (
        <div
            className={"farm-modal__nft-position p-1 br-8 c-w"}
            key={token.id}
            data-selected={!!selectedNFT && selectedNFT.id === token.id}
            onClick={(e: any) => {
                if (!isEnoughTokenForLock && selectedTier) return;
                if (e.target.tagName !== "A" && !submitLoader) {
                    setSelectedNFT((old) =>
                        old && old.id === token.id
                            ? null
                            : {
                                onFarmingCenter: token.onFarmingCenter,
                                id: token.id,
                            }
                    );
                }
            }}
        >
            <NFTPositionIcon name={token.id}>{token.id}</NFTPositionIcon>
            <div style={{ marginLeft: "10px" }}>
                <p style={{ fontWeight: "bold" }}>
                    {currency0?.symbol} / {currency1?.symbol}
                </p>
                <p style={{ fontSize: "13px", marginTop: "6px" }}>${fiatValueOfLiquidity()?.toSignificant()}</p>
            </div>
            <div style={{ marginLeft: "auto" }}>
                <IsActive el={token} />
                <div className={"farm-modal__nft-position__description"}>
                    <a className={"fs-085 c-w hover-cp"} href={`${AlgebraConfig.MISC.appURL}/#/pool/${+token.id}`} rel="noopener noreferrer" target="_blank">
                        <Trans>View position</Trans>
                    </a>
                </div>
            </div>
        </div>
    );
};
