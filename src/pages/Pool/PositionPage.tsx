import { useCallback, useMemo, useState } from "react";
import { NonfungiblePositionManager, Position } from "lib/src";
import { PoolState, usePool } from "hooks/usePools";
import { useToken } from "hooks/Tokens";
import { useDerivedPositionInfo } from "hooks/useDerivedPositionInfo";
import { useV3PositionFromTokenId } from "hooks/useV3Positions";
import { NavLink, RouteComponentProps, useLocation } from "react-router-dom";
import { calculateGasMargin } from "../../utils/calculateGasMargin";
import AutoColumn from "shared/components/AutoColumn";
import DoubleCurrencyLogo from "components/DoubleLogo";
import Badge from "components/Badge";
import CurrencyLogo from "components/CurrencyLogo";
import { t, Trans } from "@lingui/macro";
import { currencyId } from "utils/currencyId";
import { formatCurrencyAmount } from "utils/formatCurrencyAmount";
import { useV3PositionFees } from "hooks/useV3PositionFees";
import { Currency, CurrencyAmount, Fraction, Percent, Token } from "@uniswap/sdk-core";
import { useAccount, useWalletClient } from "wagmi";
import { walletClientToSigner } from "../../utils/ethersAdapters";
import { useV3NFTPositionManagerContract } from "hooks/useContract";
import { useIsTransactionPending, useTransactionAdder } from "state/transactions/hooks";
import { TransactionResponse } from "ethers";
import { Dots } from "components/swap/styled";
import { getPriceOrderingFromPositionForUI } from "../../components/PositionListItem";
import RateToggle from "../../components/RateToggle";
import { useSingleCallResult, NEVER_RELOAD } from "../../state/multicall/hooks";
import RangeBadge from "../../components/Badge/RangeBadge";
import { SwitchLocaleLink } from "../../components/SwitchLocaleLink";
import useUSDCPrice from "hooks/useUSDCPrice";
import Loader from "components/Loader";
import Toggle from "components/Toggle";
import { Bound } from "state/mint/v3/actions";
import useIsTickAtLimit from "hooks/useIsTickAtLimit";
import { formatTickPrice } from "utils/formatTickPrice";
import usePrevious from "../../hooks/usePrevious";
import ReactGA from "react-ga";
import { MouseoverTooltip } from "../../components/Tooltip";
import { useAppSelector } from "../../state/hooks";
import { FARMING_CENTER, NONFUNGIBLE_POSITION_MANAGER_ADDRESSES } from "../../constants/addresses";
import { useInverter } from "../../hooks/useInverter";
import { getRatio } from "../../utils/getRatio";
import { LinkedCurrency } from "./LinkedCurrency";
import { CurrentPriceCard } from "./CurrentPriceCard";
import { WrappedCurrency } from "../../models/types";
import Card from "../../shared/components/Card/Card";
import { RowBetween, RowFixed } from "components/Row";
import { ApplicationModal } from "../../state/application/actions";
import { useModalOpen, useToggleModal } from "../../state/application/hooks";
import { isAddress } from "../../utils";
import { DEFAULT_LISTENER_OPTIONS } from "state/multicall/hooks";

function useQuery() {
    const { search } = useLocation();

    return useMemo(() => new URLSearchParams(search), [search]);
}

export default function PositionPage({
    match: {
        params: { tokenId: tokenIdFromUrl },
    },
}: RouteComponentProps<{ tokenId?: string }>) {
    const { address: account, chain } = useAccount();
    const chainId = chain?.id;
    const { data: walletClient } = useWalletClient({ chainId });
    const signer = useMemo(() => walletClient ? walletClientToSigner(walletClient) : undefined, [walletClient]);

    const query = useQuery();

    const isOnFarming = useMemo(() => query.get("onFarming"), [tokenIdFromUrl, query]);

    const parsedTokenId = tokenIdFromUrl ? BigInt(tokenIdFromUrl) : undefined;
    const { loading, position: positionDetails } = useV3PositionFromTokenId(parsedTokenId);
    const { position: existingPosition } = useDerivedPositionInfo(positionDetails);

    const gasPrice = useAppSelector((state) => {
        if (!state.application.gasPrice.fetched) return 36;
        return state.application.gasPrice.override ? 36 : state.application.gasPrice.fetched;
    });

    const { tokenId } = positionDetails || {};

    const prevPositionDetails = usePrevious({ ...positionDetails });
    const {
        token0: _token0Address,
        token1: _token1Address,
        liquidity: _liquidity,
        tickLower: _tickLower,
        tickUpper: _tickUpper,
    } = useMemo(() => {
        if (!positionDetails && prevPositionDetails && prevPositionDetails.liquidity) {
            return { ...prevPositionDetails };
        }
        return { ...positionDetails };
    }, [positionDetails]);

    const removed = _liquidity === 0n;

    const token0 = useToken(_token0Address);
    const token1 = useToken(_token1Address);

    const currency0 = token0 as Currency;
    const currency1 = token1 as Currency;

    // flag for receiving WETH
    const [receiveWETH, setReceiveWETH] = useState(false);

    // construct Position from details returned
    const [poolState, pool] = usePool(token0 ?? undefined, token1 ?? undefined);
    const [prevPoolState, prevPool] = usePrevious([poolState, pool]) || [];
    const [_poolState, _pool] = useMemo(() => {
        if (!pool && prevPool && prevPoolState) {
            return [prevPoolState, prevPool];
        }
        return [poolState, pool];
    }, [pool, poolState]);

    const position = useMemo(() => {
        if (_pool && _liquidity && typeof _tickLower === "number" && typeof _tickUpper === "number") {
            return new Position({
                pool: _pool,
                liquidity: _liquidity.toString(),
                tickLower: _tickLower,
                tickUpper: _tickUpper,
            });
        }
        return undefined;
    }, [_liquidity, _pool, _tickLower, _tickUpper]);

    const tickAtLimit = useIsTickAtLimit(_tickLower, _tickUpper);

    const pricesFromPosition = getPriceOrderingFromPositionForUI(position);
    const [manuallyInverted, setManuallyInverted] = useState(false);

    // handle manual inversion
    const { priceLower, priceUpper, base } = useInverter({
        priceLower: pricesFromPosition.priceLower,
        priceUpper: pricesFromPosition.priceUpper,
        quote: pricesFromPosition.quote,
        base: pricesFromPosition.base,
        invert: manuallyInverted,
    });

    const inverted = token1 ? base?.equals(token1) : undefined;
    const currencyQuote = inverted ? currency0 : currency1;
    const currencyBase = inverted ? currency1 : currency0;

    const ratio = useMemo(() => {
        return priceLower && _pool && priceUpper ? getRatio(inverted ? priceUpper.invert() : priceLower, _pool.token0Price, inverted ? priceLower.invert() : priceUpper) : undefined;
    }, [inverted, _pool, priceLower, priceUpper]);

    // fees
    const [feeValue0, feeValue1] = useV3PositionFees(_pool ?? undefined, positionDetails?.tokenId, receiveWETH);

    const [collecting, setCollecting] = useState<boolean>(false);
    const [collectMigrationHash, setCollectMigrationHash] = useState<string | null>(null);
    const isCollectPending = useIsTransactionPending(collectMigrationHash ?? undefined);
    const [showConfirm, setShowConfirm] = useState(false);

    // usdc prices always in terms of tokens
    const price0 = useUSDCPrice(token0 ?? undefined, undefined, DEFAULT_LISTENER_OPTIONS);
    const price1 = useUSDCPrice(token1 ?? undefined, undefined, DEFAULT_LISTENER_OPTIONS);

    const fiatValueOfFees: CurrencyAmount<Currency> | null = useMemo(() => {
        if (!price0 || !price1 || !feeValue0 || !feeValue1) return null;

        // we wrap because it doesn't matter, the quote returns a USDC amount
        const feeValue0Wrapped = feeValue0?.wrapped;
        const feeValue1Wrapped = feeValue1?.wrapped;

        if (!feeValue0Wrapped || !feeValue1Wrapped) return null;

        const amount0 = price0.quote(feeValue0Wrapped);
        const amount1 = price1.quote(feeValue1Wrapped);
        return amount0.add(amount1);
    }, [price0, price1, feeValue0, feeValue1]);

    const prevFiatValueOfFees = usePrevious(fiatValueOfFees);
    const _fiatValueOfFees = useMemo(() => {
        if (!fiatValueOfFees && prevFiatValueOfFees) {
            return prevFiatValueOfFees;
        }
        return fiatValueOfFees;
    }, [fiatValueOfFees]);

    const fiatValueOfLiquidity: CurrencyAmount<Token> | null = useMemo(() => {
        if (!price0 || !price1 || !position) return null;
        const amount0 = price0.quote(position.amount0);
        const amount1 = price1.quote(position.amount1);
        return amount0.add(amount1);
    }, [price0, price1, position]);

    const prevFiatValueOfLiquidity = usePrevious(fiatValueOfLiquidity);
    const _fiatValueOfLiquidity = useMemo(() => {
        if (!fiatValueOfLiquidity && prevFiatValueOfLiquidity) {
            return prevFiatValueOfLiquidity;
        }
        return fiatValueOfLiquidity;
    }, [fiatValueOfLiquidity]);

    const addTransaction = useTransactionAdder();
    const positionManager = useV3NFTPositionManagerContract();
    const collect = useCallback(() => {
        if (!chainId || !feeValue0 || !feeValue1 || !positionManager || !account || !tokenId || !signer) return;

        setCollecting(true);

        const collectAddress = isOnFarming ? FARMING_CENTER[chainId] : NONFUNGIBLE_POSITION_MANAGER_ADDRESSES[chainId];

        const { calldata, value } = NonfungiblePositionManager.collectCallParameters({
            tokenId: tokenId.toString(),
            expectedCurrencyOwed0: feeValue0,
            expectedCurrencyOwed1: feeValue1,
            recipient: account,
        });

        const txn = {
            to: collectAddress,
            data: calldata,
            value: value,
        };

        signer
            .estimateGas(txn)
            .then((estimate) => {
                const newTxn = {
                    ...txn,
                    gasLimit: calculateGasMargin(chainId, estimate),
                    gasPrice: BigInt(gasPrice) * 1000000000n,
                };

                return signer
                    .sendTransaction(newTxn)
                    .then((response: TransactionResponse) => {
                        setCollectMigrationHash(response.hash);
                        setCollecting(false);

                        ReactGA.event({
                            category: "Liquidity",
                            action: "CollectV3",
                            label: [feeValue0.currency.symbol || '', feeValue1.currency.symbol || ''].join("/"),
                        });

                        addTransaction(response, {
                            summary: t`Collect ${feeValue0.currency.symbol || ''}/${feeValue1.currency.symbol || ''} fees`,
                        });
                    });
            })
            .catch((error) => {
                setCollecting(false);
                console.error(error);
            });
    }, [chainId, feeValue0, feeValue1, positionManager, account, tokenId, addTransaction, signer, gasPrice]);

    const owner = useSingleCallResult(
        !!tokenId ? positionManager : null,
        "ownerOf",
        [tokenId?.toString()],
        NEVER_RELOAD
    ).result?.[0];
    const ownsNFT = owner === account || positionDetails?.operator === account;

    const feeValueUpper = inverted ? feeValue0 : feeValue1;
    const feeValueLower = inverted ? feeValue1 : feeValue0;

    // check if price is within range
    const below = _pool && typeof _tickLower === "number" ? _pool.tickCurrent < _tickLower : undefined;
    const above = _pool && typeof _tickUpper === "number" ? _pool.tickCurrent >= _tickUpper : undefined;
    const inRange: boolean = typeof below === "boolean" && typeof above === "boolean" ? !below && !above : false;

    // const removeLiquidityModalOpen = useModalOpen(ApplicationModal.POOL_REMOVE_LIQUIDITY); // Commented out due to missing enum member

    function modalHeader() {
        return (
            <>
                <Card isDark classes={"p-1 br-12 card-bg"}>
                    <div className={"flex-s-between mb-1"}>
                        <div className={"f f-ac"}>
                            <CurrencyLogo currency={feeValueUpper?.currency as WrappedCurrency} size={"24px"} />
                            <span className={"ml-05 c-w"}>{feeValueUpper ? formatCurrencyAmount(feeValueUpper, 4) : "-"}</span>
                        </div>
                        <span className={"c-w"}>{feeValueUpper?.currency?.symbol}</span>
                    </div>
                    <div className={"flex-s-between"}>
                        <div className={"f f-ac"}>
                            <CurrencyLogo currency={feeValueLower?.currency as WrappedCurrency} size={"24px"} />
                            <span className={"c-w ml-05"}>{feeValueLower ? formatCurrencyAmount(feeValueLower, 4) : "-"}</span>
                        </div>
                        <span className={"c-w"}>{feeValueLower?.currency?.symbol}</span>
                    </div>
                </Card>
                <div className={"c-p mv-05 fs-075"}>
                    <Trans>Collecting fees will withdraw currently available fees for you.</Trans>
                </div>
                <button className={"btn primary pv-05 br-8 b w-100"} onClick={collect}>
                    <Trans>Collect</Trans>
                </button>
            </>
        );
    }

    const showCollectAsWeth = Boolean(
        (ownsNFT || isOnFarming) && (feeValue0?.greaterThan(0) || feeValue1?.greaterThan(0)) && currency0 && currency1 && (currency0.isNative || currency1.isNative) && !collectMigrationHash
    );

    return (
        <div className={"maw-765 mh-a"}>
            {loading || _poolState === PoolState.LOADING ? (
                <Card classes={"br-24 f c f-ac f-jc h-800"}>
                    <Loader stroke={"white"} size={"2rem"} />
                </Card>
            ) : (
                <>
                    <NavLink className={"c-p mb-1 f w-fc hover-op trans-op"} to="/pool">
                        <Trans>← Back to Positions Overview</Trans>
                    </NavLink>
                    <Card classes={"card-gradient-shadow br-24 p-2 mxs_p-1"}>
                        <AutoColumn gap="1">
                            <div className={"flex-s-between ms_fd-c"}>
                                <div className={"f f-ac ms_w-100 ms_mb-1 mxs_fd-c"}>
                                    <div className={"f f-ac ml-1 mxs_ml-2 mxs_w-100 mxs_mb-05"}>
                                        <DoubleCurrencyLogo currency0={currencyBase} currency1={currencyQuote} size={24} margin={false} />
                                        <span className={"mr-05 fs-125 b"}>
                                            &nbsp;{currencyQuote?.symbol === "sDAI" ? "sexyDAI🔥" : currencyQuote?.symbol}&nbsp;/&nbsp;{currencyBase?.symbol}
                                        </span>
                                    </div>
                                    <div className={"f f-ac mxs_w-100"}>
                                        <MouseoverTooltip text={<Trans>Current pool fee.</Trans>}>
                                            <Badge className={"mr-05 fs-085"}>
                                                <Trans>{new Percent(existingPosition?.pool?.fee || 100, 1_000_000).toSignificant()}%</Trans>
                                            </Badge>
                                        </MouseoverTooltip>
                                        <RangeBadge removed={removed} inRange={inRange} />
                                    </div>
                                </div>
                                {ownsNFT ? (
                                    <div className={"f ms_w-100"}>
                                        {currency0 && currency1 && tokenId ? (
                                            <NavLink
                                                to={`/increase/${currencyId(currency0, chainId || 100)}/${currencyId(currency1, chainId || 100)}/${tokenId}`}
                                                className={"btn primary pv-025 ph-05 br-8 mr-05"}
                                            >
                                                <Trans>Increase Liquidity</Trans>
                                            </NavLink>
                                        ) : null}
                                        {tokenId && !removed ? (
                                            <NavLink to={`/remove/${tokenId}`} className={"btn primary pv-025 ph-05 br-8"}>
                                                <Trans>Remove Liquidity</Trans>
                                            </NavLink>
                                        ) : null}
                                    </div>
                                ) : (
                                    <div className={"ms_w-100"}>
                                        <p>Position currently farming.</p>
                                        <p style={{ fontSize: "12px", marginTop: "4px" }}>To manage this position, you must own the position NFT.</p>
                                    </div>
                                )}
                            </div>
                            <Card isDark={false} classes={"p-1 br-12"}>
                                <div className={"f c mb-05"}>
                                    <span className={"b mb-05"}>
                                        <Trans>Liquidity</Trans>
                                    </span>
                                    {_fiatValueOfLiquidity?.greaterThan(new Fraction(1, 100)) ? (
                                        <span className={"fs-2"}>
                                            <Trans>${_fiatValueOfLiquidity.toFixed(2, { groupSeparator: "," })}</Trans>
                                        </span>
                                    ) : (
                                        <span className={"fs-2"}>
                                            <Trans>$-</Trans>
                                        </span>
                                    )}
                                </div>
                                <Card isDark classes={"p-1 br-12 card-bg"}>
                                    <div className={"flex-s-between mb-1"}>
                                        <LinkedCurrency chainId={chainId} currency={currencyQuote} />
                                        <div className={"f f-ac"}>
                                            <span>{inverted ? formatCurrencyAmount(position?.amount0, 4) : formatCurrencyAmount(position?.amount1, 4)}</span>
                                            {typeof ratio === "number" && !removed ? (
                                                <Badge className={"ml-05 fs-075"}>
                                                    <Trans>{inverted ? ratio : 100 - ratio}%</Trans>
                                                </Badge>
                                            ) : null}
                                        </div>
                                    </div>
                                    <div className={"flex-s-between"}>
                                        <LinkedCurrency chainId={chainId} currency={currencyBase} />
                                        <div className={"f f-ac"}>
                                            <span>{inverted ? formatCurrencyAmount(position?.amount1, 4) : formatCurrencyAmount(position?.amount0, 4)}</span>
                                            {typeof ratio === "number" && !removed ? (
                                                <Badge className={"ml-05 fs-075"}>
                                                    <Trans>{inverted ? 100 - ratio : ratio}%</Trans>
                                                </Badge>
                                            ) : null}
                                        </div>
                                    </div>
                                </Card>
                            </Card>
                            <Card isDark={false} classes={"p-1 br-12 card-bg"}>
                                <div className={"f c mb-05"}>
                                    <span className={"b mb-05"}>
                                        <Trans>Unclaimed fees</Trans>
                                    </span>
                                    <div className={"flex-s-between"}>
                                        {_fiatValueOfFees?.greaterThan(new Fraction(1, 100)) ? (
                                            <span className={"fs-2 c-g"}>
                                                <Trans>${+_fiatValueOfFees.toFixed(2, { groupSeparator: "," }) < 0.01 ? "<0.01" : _fiatValueOfFees?.toFixed(2, { groupSeparator: "," })}</Trans>
                                            </span>
                                        ) : (
                                            <span className={"fs-2"}>
                                                <Trans>$-</Trans>
                                            </span>
                                        )}
                                        {ownsNFT && (feeValue0?.greaterThan(0) || feeValue1?.greaterThan(0) || !!collectMigrationHash) ? (
                                            <button className={"btn primary pv-025 ph-05 br-8"} disabled={collecting || !!collectMigrationHash} onClick={collect}>
                                                {!!collectMigrationHash && !isCollectPending ? (
                                                    <span>
                                                        <Trans>Collected</Trans>
                                                    </span>
                                                ) : isCollectPending || collecting ? (
                                                    <Dots>
                                                        <Trans>Collecting</Trans>
                                                    </Dots>
                                                ) : (
                                                    <span>
                                                        <Trans>Collect fees</Trans>
                                                    </span>
                                                )}
                                            </button>
                                        ) : null}
                                    </div>
                                </div>
                                <Card isDark classes={"p-1 br-12 card-bg"}>
                                    <div className={"flex-s-between mb-1"}>
                                        <div className={"f f-ac"}>
                                            <CurrencyLogo currency={feeValueUpper?.currency as WrappedCurrency} size={"24px"} />
                                            <span className={"ml-05"}>{feeValueUpper?.currency?.symbol}</span>
                                        </div>
                                        <span>{feeValueUpper ? formatCurrencyAmount(feeValueUpper, 4) : "-"}</span>
                                    </div>
                                    <div className={"flex-s-between"}>
                                        <div className={"f f-ac"}>
                                            <CurrencyLogo currency={feeValueLower?.currency as WrappedCurrency} size={"24px"} />
                                            <span className={"ml-05"}>{feeValueLower?.currency?.symbol}</span>
                                        </div>
                                        <span>{feeValueLower ? formatCurrencyAmount(feeValueLower, 4) : "-"}</span>
                                    </div>
                                </Card>
                                {showCollectAsWeth && (
                                    <div className={"flex-s-between mt-075"}>
                                        <Trans>Collect as WXDAI</Trans>
                                        <Toggle id="receive-as-weth" isActive={receiveWETH} toggle={() => setReceiveWETH((receiveWETH) => !receiveWETH)} />
                                    </div>
                                )}
                            </Card>
                            <Card isDark={false} classes={"p-1 br-12 card-bg"}>
                                <div className={"flex-s-between mb-1 fs-085"}>
                                    <div className={"f f-ac mxs_fd-c"}>
                                        <div className={"mr-05 fs-1 mxs_w-100 mxs_mr-0"}>
                                            <Trans>Price range</Trans>
                                        </div>
                                        <div className={"mxs_w-100 mxs_mt-05"}>
                                            <RangeBadge removed={removed} inRange={inRange} />
                                            <span style={{ width: "8px" }} />
                                        </div>
                                    </div>
                                    <div>
                                        {currencyBase && currencyQuote && (
                                            <RateToggle currencyA={currencyBase} currencyB={currencyQuote} handleRateToggle={() => setManuallyInverted(!manuallyInverted)} />
                                        )}
                                    </div>
                                </div>

                                <div className={"f f-ac mb-1 ms_fd-c"}>
                                    <Card isDark classes={"w-100 p-1 br-12 card-bg"}>
                                        <AutoColumn gap="1" justify="center">
                                            <span className={"c-lg fs-095 ta-c"} style={{ color: "var(--white)" }}>
                                                <Trans>Min price</Trans>
                                            </span>
                                            <span className={"fs-125 ta-c"}>{formatTickPrice(priceLower, tickAtLimit, Bound.LOWER)}</span>
                                            <span className={"c-lg fs-095 ta-c"} style={{ color: "var(--white)" }}>
                                                <Trans>
                                                    {currencyQuote?.symbol} per {currencyBase?.symbol}
                                                </Trans>
                                            </span>
                                            {inRange && (
                                                <span className={"c-lg fs-075 ta-c"}>
                                                    <Trans>Your position will be 100% {currencyBase?.symbol} at this price.</Trans>
                                                </span>
                                            )}
                                        </AutoColumn>
                                    </Card>
                                    <span className={"mh-1 c-lg hide-s"}>⟷</span>
                                    <span className={"show-s c-lg mv-05 fs-125"}>↕</span>
                                    <Card isDark classes={"w-100 p-1 br-12 card-bg"}>
                                        <AutoColumn gap="1" justify="center">
                                            <span className={"c-lg fs-095 ta-c"} style={{ color: "var(--white)" }}>
                                                <Trans>Max price</Trans>
                                            </span>
                                            <span className={"fs-125 ta-c"}>{formatTickPrice(priceUpper, tickAtLimit, Bound.UPPER)}</span>
                                            <span className={"c-lg fs-095 ta-c"} style={{ color: "var(--white)" }}>
                                                <Trans>
                                                    {currencyQuote?.symbol} per {currencyBase?.symbol}
                                                </Trans>
                                            </span>
                                            {inRange && (
                                                <span className={"c-lg fs-075 ta-c"}>
                                                    <Trans>Your position will be 100% {currencyQuote?.symbol} at this price.</Trans>
                                                </span>
                                            )}
                                        </AutoColumn>
                                    </Card>
                                </div>
                                <CurrentPriceCard
                                    inverted={inverted}
                                    //@ts-ignore
                                    pool={_pool}
                                    currencyQuote={currencyQuote}
                                    currencyBase={currencyBase}
                                />
                            </Card>
                        </AutoColumn>
                    </Card>
                    <SwitchLocaleLink />
                </>
            )}
        </div>
    );
}
