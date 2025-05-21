import { useCallback, useMemo, useState } from "react";
import { useV3PositionFromTokenId } from "hooks/useV3Positions";
import { Redirect, RouteComponentProps } from "react-router-dom";
import { WXDAI_EXTENDED } from "../../constants/tokens";
import { calculateGasMargin } from "../../utils/calculateGasMargin";
import useDebouncedChangeHandler from "hooks/useDebouncedChangeHandler";
import { useBurnV3ActionHandlers, useBurnV3State, useDerivedV3BurnInfo } from "state/burn/v3/hooks";
import Slider from "components/Slider";
import { AutoRow, RowBetween, RowFixed } from "components/Row";
import TransactionConfirmationModal, { ConfirmationModalContent } from "../../components/TransactionConfirmationModal";
import { AutoColumn } from "components/Column";
import { ButtonConfirmed, ButtonPrimary } from "components/Button";
import { Text } from "rebass";
import CurrencyLogo from "components/CurrencyLogo";
import FormattedCurrencyAmount from "components/FormattedCurrencyAmount";
import { useV3NFTPositionManagerContract } from "hooks/useContract";
import { useUserSlippageToleranceWithDefault } from "state/user/hooks";
import useTransactionDeadline from "hooks/useTransactionDeadline";
import { TransactionResponse } from "ethers";
import { useTransactionAdder } from "state/transactions/hooks";
import { Percent } from "@uniswap/sdk-core";
import { TYPE } from "theme";
import Loader from "components/Loader";
import DoubleCurrencyLogo from "components/DoubleLogo";
import { NonfungiblePositionManager } from "lib/src";
import { AddRemoveTabs } from "components/NavigationTabs";
import RangeBadge from "components/Badge/RangeBadge";
import Toggle from "components/Toggle";
import { t, Trans } from "@lingui/macro";
import usePrevious from "../../hooks/usePrevious";

import ReactGA from "react-ga";
import { useAppSelector } from "../../state/hooks";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { walletClientToSigner, publicClientToProvider } from "../../utils/ethersAdapters";
import useTheme from "../../hooks/useTheme";
import { WrappedCurrency } from "../../models/types";
import { GAS_PRICE_MULTIPLIER } from "../../hooks/useGasPrice";
import Card from "../../shared/components/Card/Card";
import { isMobileOnly } from "react-device-detect";

const DEFAULT_REMOVE_V3_LIQUIDITY_SLIPPAGE_TOLERANCE = new Percent(5, 100);

// redirect invalid tokenIds
export default function RemoveLiquidityV3({
    location,
    match: {
        params: { tokenId },
    },
}: RouteComponentProps<{ tokenId: string }>) {
    const parsedTokenId = useMemo(() => {
        try {
            return BigInt(tokenId);
        } catch {
            return null;
        }
    }, [tokenId]);

    if (parsedTokenId === null || parsedTokenId === 0n) {
        return <Redirect to={{ ...location, pathname: "/pool" }} />;
    }

    return <Remove tokenId={parsedTokenId} />;
}

function Remove({ tokenId }: { tokenId: bigint }) {
    const { position } = useV3PositionFromTokenId(tokenId);
    const prevPosition = usePrevious({ ...position });
    const _position = useMemo(() => {
        if (!position && prevPosition) {
            return { ...prevPosition };
        }
        return { ...position };
    }, [position]);

    const gasPrice = useAppSelector((state) => {
        if (!state.application.gasPrice.fetched) return 36;
        return state.application.gasPrice.override ? 36 : state.application.gasPrice.fetched;
    });

    // flag for receiving WETH
    const [receiveWETH, setReceiveWETH] = useState(true);

    // burn state
    const { percent } = useBurnV3State();

    const { address: account, chain } = useAccount();
    const chainId = chain?.id;
    const { data: walletClient } = useWalletClient({ chainId });
    const publicClient = usePublicClient({ chainId });
    const signer = useMemo(() => walletClient ? walletClientToSigner(walletClient) : undefined, [walletClient]);

    const theme = useTheme();

    const derivedInfo = useDerivedV3BurnInfo(position, receiveWETH);
    const prevDerivedInfo = usePrevious({ ...derivedInfo });
    const { positionSDK, liquidityPercentage, liquidityValue0, liquidityValue1, feeValue0, feeValue1, outOfRange, error } = useMemo(() => {
        if ((!derivedInfo.feeValue0 || !derivedInfo.liquidityValue0 || !derivedInfo.position) && prevDerivedInfo) {
            return {
                positionSDK: prevDerivedInfo.position,
                error: prevDerivedInfo.error,
                ...prevDerivedInfo,
            };
        }

        return {
            positionSDK: derivedInfo.position,
            error: derivedInfo.error,
            ...derivedInfo,
        };
    }, [derivedInfo]);

    const { onPercentSelect } = useBurnV3ActionHandlers();

    const removed = position?.liquidity === 0n;

    // boilerplate for the slider
    const [percentForSlider, onPercentSelectForSlider] = useDebouncedChangeHandler(percent, onPercentSelect);

    const deadline = useTransactionDeadline(); // custom from users settings
    const allowedSlippage = useUserSlippageToleranceWithDefault(DEFAULT_REMOVE_V3_LIQUIDITY_SLIPPAGE_TOLERANCE); // custom from users

    const [showConfirm, setShowConfirm] = useState(false);
    const [attemptingTxn, setAttemptingTxn] = useState(false);
    const [txnHash, setTxnHash] = useState<string | undefined>();
    const addTransaction = useTransactionAdder();
    const positionManager = useV3NFTPositionManagerContract();

    const burn = useCallback(async () => {
        setAttemptingTxn(true);
        if (!positionManager || !liquidityValue0 || !liquidityValue1 || !deadline || !account || !chainId || !feeValue0 || !feeValue1 || !positionSDK || !liquidityPercentage || !signer) {
            return;
        }

        const { calldata, value } = NonfungiblePositionManager.removeCallParameters(positionSDK, {
            tokenId: tokenId.toString(),
            liquidityPercentage,
            slippageTolerance: allowedSlippage,
            deadline: deadline.toString(),
            collectOptions: {
                expectedCurrencyOwed0: feeValue0,
                expectedCurrencyOwed1: feeValue1,
                recipient: account,
            },
        });

        const txn = {
            to: positionManager.target,
            data: calldata,
            value,
        };

        signer
            .estimateGas(txn)
            .then((estimate) => {
                const newTxn = {
                    ...txn,
                    gasLimit: calculateGasMargin(chainId, estimate),
                    gasPrice: BigInt(gasPrice) * BigInt(GAS_PRICE_MULTIPLIER),
                };

                return signer
                    .sendTransaction(newTxn)
                    .then((response: TransactionResponse) => {
                        ReactGA.event({
                            category: "Liquidity",
                            action: "RemoveV3",
                            label: [liquidityValue0.currency.symbol || '', liquidityValue1.currency.symbol || ''].join("/"),
                        });
                        setTxnHash(response.hash);
                        setAttemptingTxn(false);
                        addTransaction(response, {
                            summary: t`Remove ${liquidityValue0.currency.symbol || ''}/${liquidityValue1.currency.symbol || ''} liquidity`,
                        });
                    });
            })
            .catch((error) => {
                setAttemptingTxn(false);
                console.error(error);
            });
    }, [
        positionManager,
        liquidityValue0,
        liquidityValue1,
        deadline,
        account,
        chainId,
        feeValue0,
        feeValue1,
        positionSDK,
        liquidityPercentage,
        signer,
        tokenId,
        allowedSlippage,
        gasPrice,
        addTransaction,
    ]);

    const handleDismissConfirmation = useCallback(() => {
        setShowConfirm(false);
        // if there was a tx hash, we want to clear the input
        if (txnHash) {
            onPercentSelectForSlider(0);
        }
        setAttemptingTxn(false);
        setTxnHash("");
    }, [onPercentSelectForSlider, txnHash]);

    const pendingText = t`Removing ${liquidityValue0?.toSignificant(6) || ''} ${liquidityValue0?.currency?.symbol || ''} and ${liquidityValue1?.toSignificant(6) || ''} ${liquidityValue1?.currency?.symbol || ''}`;

    function modalHeader() {
        return (
            <AutoColumn gap={"sm"} style={{ padding: "16px" }}>
                <RowBetween align="flex-end">
                    <Text fontSize={16} fontWeight={500}>
                        <Trans>Pooled {liquidityValue0?.currency?.symbol}:</Trans>
                    </Text>
                    <RowFixed>
                        <Text fontSize={16} fontWeight={500} marginLeft={"6px"}>
                            {liquidityValue0 && <FormattedCurrencyAmount currencyAmount={liquidityValue0} />}
                        </Text>
                        <CurrencyLogo size="24px" style={{ marginLeft: "8px" }} currency={liquidityValue0?.currency as WrappedCurrency} />
                    </RowFixed>
                </RowBetween>
                <RowBetween align="flex-end">
                    <Text fontSize={16} fontWeight={500}>
                        <Trans>Pooled {liquidityValue1?.currency?.symbol}:</Trans>
                    </Text>
                    <RowFixed>
                        <Text fontSize={16} fontWeight={500} marginLeft={"6px"}>
                            {liquidityValue1 && <FormattedCurrencyAmount currencyAmount={liquidityValue1} />}
                        </Text>
                        <CurrencyLogo size="24px" style={{ marginLeft: "8px" }} currency={liquidityValue1?.currency as WrappedCurrency} />
                    </RowFixed>
                </RowBetween>
                {feeValue0?.greaterThan(0) || feeValue1?.greaterThan(0) ? (
                    <>
                        <TYPE.italic fontSize={12} color={theme.winterDisabledButton} textAlign="left" padding={"8px 0 0 0"}>
                            <Trans>You will also collect fees earned from this position.</Trans>
                        </TYPE.italic>
                        <RowBetween>
                            <Text fontSize={16} fontWeight={500}>
                                <Trans>{feeValue0?.currency?.symbol} Fees Earned:</Trans>
                            </Text>
                            <RowFixed>
                                <Text fontSize={16} fontWeight={500} marginLeft={"6px"}>
                                    {feeValue0 && <FormattedCurrencyAmount currencyAmount={feeValue0} />}
                                </Text>
                                <CurrencyLogo size="24px" style={{ marginLeft: "8px" }} currency={feeValue0?.currency as WrappedCurrency} />
                            </RowFixed>
                        </RowBetween>
                        <RowBetween>
                            <Text fontSize={16} fontWeight={500}>
                                <Trans>{feeValue1?.currency?.symbol} Fees Earned:</Trans>
                            </Text>
                            <RowFixed>
                                <Text fontSize={16} fontWeight={500} marginLeft={"6px"}>
                                    {feeValue1 && <FormattedCurrencyAmount currencyAmount={feeValue1} />}
                                </Text>
                                <CurrencyLogo size="24px" style={{ marginLeft: "8px" }} currency={feeValue1?.currency as WrappedCurrency} />
                            </RowFixed>
                        </RowBetween>
                    </>
                ) : null}
                <ButtonPrimary mt="16px" onClick={burn}>
                    <Trans>Remove</Trans>
                </ButtonPrimary>
            </AutoColumn>
        );
    }

    const showCollectAsWeth = Boolean(
        !chainId &&
        liquidityValue0?.currency &&
        liquidityValue1?.currency &&
        (liquidityValue0.currency.isNative ||
            liquidityValue1.currency.isNative ||
            liquidityValue0.currency.wrapped.equals(WXDAI_EXTENDED[liquidityValue0.currency.chainId]) ||
            liquidityValue1.currency.wrapped.equals(WXDAI_EXTENDED[liquidityValue1.currency.chainId]))
    );
    return (
        <div className={"maw-765 mh-a"}>
            <Card classes={"card-gradient-shadow p-2 br-24 mxs_p-1"}>
                <AddRemoveTabs creating={false} adding={false} positionID={tokenId.toString()} defaultSlippage={DEFAULT_REMOVE_V3_LIQUIDITY_SLIPPAGE_TOLERANCE} />
                {_position ? (
                    <AutoColumn gap="lg">
                        <div className={"flex-s-between mt-1 mxs_ml-1"}>
                            <RowFixed>
                                <DoubleCurrencyLogo currency0={feeValue0?.currency} currency1={feeValue1?.currency} size={24} margin={true} />
                                <TYPE.label ml="10px" fontSize="20px">{`${feeValue0?.currency?.symbol}/${feeValue1?.currency?.symbol}`}</TYPE.label>
                            </RowFixed>
                            <RangeBadge removed={removed} inRange={!outOfRange} />
                        </div>
                        <Card isDark={false} classes={"p-1 br-12 card-bg"}>
                            <div>
                                <TYPE.main fontWeight={400}>
                                    <Trans>Amount</Trans>
                                </TYPE.main>
                                <div className={"flex-s-between mv-05 mxs_fd-c"}>
                                    <div className={"fs-2 mxs_mv-05 mxs_w-100 mxs_ta-l"}>
                                        <Trans>{percentForSlider}%</Trans>
                                    </div>
                                    <AutoRow gap="4px" justify={"flex-end"}>
                                        <button className={"btn secondary pv-05 ph-1 fs-085 hover-b"} onClick={() => onPercentSelect(25)}>
                                            <Trans>25%</Trans>
                                        </button>
                                        <button className={"btn secondary pv-05 ph-1 fs-085 hover-b"} onClick={() => onPercentSelect(50)}>
                                            <Trans>50%</Trans>
                                        </button>
                                        <button className={"btn secondary pv-05 ph-1 fs-085 hover-b"} onClick={() => onPercentSelect(75)}>
                                            <Trans>75%</Trans>
                                        </button>
                                        <button className={"btn secondary pv-05 ph-1 fs-085 hover-b"} onClick={() => onPercentSelect(100)}>
                                            <Trans>Max</Trans>
                                        </button>
                                    </AutoRow>
                                </div>
                                <Slider value={percentForSlider} onChange={onPercentSelectForSlider} disabled={false} />
                            </div>
                        </Card>
                        <Card isDark={false} classes={"p-1 br-12 card-bg"}>
                            <AutoColumn gap="md">
                                <RowBetween>
                                    <Text fontSize={16} fontWeight={500}>
                                        <Trans>Pooled {liquidityValue0?.currency?.symbol}:</Trans>
                                    </Text>
                                    <RowFixed>
                                        <Text fontSize={16} fontWeight={500} marginLeft={"6px"}>
                                            {liquidityValue0 && <FormattedCurrencyAmount currencyAmount={liquidityValue0} />}
                                        </Text>
                                        <CurrencyLogo size="24px" style={{ marginLeft: "8px" }} currency={liquidityValue0?.currency as WrappedCurrency} />
                                    </RowFixed>
                                </RowBetween>
                                <RowBetween>
                                    <Text fontSize={16} fontWeight={500}>
                                        <Trans>Pooled {liquidityValue1?.currency?.symbol}:</Trans>
                                    </Text>
                                    <RowFixed>
                                        <Text fontSize={16} fontWeight={500} marginLeft={"6px"}>
                                            {liquidityValue1 && <FormattedCurrencyAmount currencyAmount={liquidityValue1} />}
                                        </Text>
                                        <CurrencyLogo size="24px" style={{ marginLeft: "8px" }} currency={liquidityValue1?.currency as WrappedCurrency} />
                                    </RowFixed>
                                </RowBetween>
                                {feeValue0?.greaterThan(0) || feeValue1?.greaterThan(0) ? (
                                    <>
                                        <RowBetween>
                                            <Text fontSize={16} fontWeight={500}>
                                                <Trans>{feeValue0?.currency?.symbol} Fees Earned:</Trans>
                                            </Text>
                                            <RowFixed>
                                                <Text fontSize={16} fontWeight={500} marginLeft={"6px"}>
                                                    {feeValue0 && <FormattedCurrencyAmount currencyAmount={feeValue0} />}
                                                </Text>
                                                <CurrencyLogo size="24px" style={{ marginLeft: "8px" }} currency={feeValue0?.currency as WrappedCurrency} />
                                            </RowFixed>
                                        </RowBetween>
                                        <RowBetween>
                                            <Text fontSize={16} fontWeight={500}>
                                                <Trans>{feeValue1?.currency?.symbol} Fees Earned:</Trans>
                                            </Text>
                                            <RowFixed>
                                                <Text fontSize={16} fontWeight={500} marginLeft={"6px"}>
                                                    {feeValue1 && <FormattedCurrencyAmount currencyAmount={feeValue1} />}
                                                </Text>
                                                <CurrencyLogo size="24px" style={{ marginLeft: "8px" }} currency={feeValue1?.currency as WrappedCurrency} />
                                            </RowFixed>
                                        </RowBetween>
                                    </>
                                ) : null}
                            </AutoColumn>
                        </Card>

                        {showCollectAsWeth && (
                            <RowBetween>
                                <TYPE.main>
                                    <Trans>Collect as WXDAI</Trans>
                                </TYPE.main>
                                <Toggle id="receive-as-weth" isActive={receiveWETH} toggle={() => setReceiveWETH((receiveWETH) => !receiveWETH)} />
                            </RowBetween>
                        )}

                        <div style={{ display: "flex" }}>
                            <AutoColumn gap="12px" style={{ flex: "1" }}>
                                <button disabled={removed || percent === 0 || !liquidityValue0} onClick={burn} className={"btn primary pv-1 br-12 b"}>
                                    {removed ? <Trans>Closed</Trans> : error ?? <Trans>Remove</Trans>}
                                </button>
                            </AutoColumn>
                        </div>
                    </AutoColumn>
                ) : (
                    <Loader />
                )}
            </Card>
        </div>
    );
}
