import CurrencyLogo from "components/CurrencyLogo";
import { useAccount } from "wagmi";
import { WrappedCurrency } from "models/types";
import { useCallback, useMemo, useState } from "react";
import { useCurrencyBalance } from "state/wallet/hooks";
import "./index.scss";
import { formatAmountTokens } from "utils/numbers";
import { HelpCircle } from "react-feather";
import { Link } from "react-router-dom";
import { Token } from "@uniswap/sdk-core";
import NoTierIcon from "../../assets/images/no-tier-icon.png";
import BachelorTierIcon from "../../assets/images/bachelor-tier-icon.png";
import MasterTierIcon from "../../assets/images/master-tier-icon.png";
import ProfessorTierIcon from "../../assets/images/professor-tier-icon.png";
import { t, Trans } from "@lingui/macro";

import AlgebraConfig from "algebra.config";

interface StakeModalFarmingTiersProps {
    tiersLimits: {
        low: string;
        medium: string;
        high: string;
    };
    tiersMultipliers: {
        low: string;
        medium: string;
        high: string;
    };
    selectTier: any;
    multiplierToken: any;
}

export default function StakeModalFarmingTiers({ tiersLimits, tiersMultipliers, selectTier, multiplierToken }: StakeModalFarmingTiersProps) {
    const { address: account } = useAccount();

    const [selectedTier, setSelectedTier] = useState<number | undefined>(0);

    const balance = useCurrencyBalance(
        account ?? undefined,
        new Token(AlgebraConfig.CHAIN_PARAMS.chainId, multiplierToken.id, +multiplierToken.decimals, multiplierToken.symbol, multiplierToken.name) ?? undefined
    );
    const _balance = useMemo(() => (!balance ? "" : balance.toSignificant(4)), [balance]);

    const handleTier = useCallback(
        (tier) => {
            if (selectedTier === tier) {
                setSelectedTier(undefined);
                selectTier("");
                return;
            }
            setSelectedTier(tier);
            selectTier(tier);
        },
        [selectedTier]
    );

    const tiersList = useMemo(() => {
        if (!tiersLimits || !tiersMultipliers) return [];

        return [
            { img: NoTierIcon, title: t`No tier`, lock: 0, earn: 0 },
            { img: BachelorTierIcon, title: t`Bachelor`, lock: +tiersLimits.low, earn: +tiersMultipliers.low },
            { img: MasterTierIcon, title: t`Master`, lock: +tiersLimits.medium, earn: +tiersMultipliers.medium },
            { img: ProfessorTierIcon, title: t`Professor`, lock: +tiersLimits.high, earn: +tiersMultipliers.high },
        ];
    }, [tiersLimits, tiersMultipliers, balance]);

    return (
        <div className="f c">
            <div className="f-ac f farming-tier__balance br-8 mb-1">
                <div className="farming-tier__balance-title mr-1">
                    <Trans>Balance</Trans>
                </div>
                <div>
                    <div className="f">
                        <CurrencyLogo
                            currency={new Token(AlgebraConfig.CHAIN_PARAMS.chainId, multiplierToken.id, +multiplierToken.decimals, multiplierToken.symbol, multiplierToken.name) as WrappedCurrency}
                        />
                        <div className="ml-05" style={{ lineHeight: "24px" }}>{`${_balance} ${multiplierToken.symbol}`}</div>
                    </div>
                </div>
                <div className="ml-a mxs_display-none ms_display-none">
                    <Link to={"/swap"} className="farming-tier__balance-buy b">{t`Buy ${multiplierToken.symbol} →`}</Link>
                </div>
            </div>
            <div className="mb-1 f w-100">
                <span className="b" style={{ fontSize: "18px" }}>
                    <Trans>1. Select a Tier</Trans>
                </span>
                <div className="ml-a f f-ac farming-tier__hint">
                    <HelpCircle color="#347CC9" size={"14px"} />
                    <a href="https://help.algebra.finance/en/farm/multi-level-farming-on-algebra" target={"_blank"} rel={"noreferrer noopener"} className="ml-05">
                        <Trans>How tiers work</Trans>
                    </a>
                </div>
            </div>
            <div className="f w-100 farming-tier-wrapper pl-1 pb-1 pr-1 mxs_pb-0">
                {tiersList.map((tier, i) => (
                    <button className="p-1 f c w-100 farming-tier" key={i} data-selected={selectedTier === i} onClick={() => handleTier(i)}>
                        <div className="p-1 farming-tier__header w-100 ta-l pos-r">
                            <div className="farming-tier__img mb-1">
                                <img width={"48px"} height={"48px"} src={tier.img} />
                            </div>
                            <div className="farming-tier__title b f f-jb">
                                <span>{tier.title}</span>
                            </div>
                        </div>
                        <div className="p-1 farming-tier__body w-100">
                            <div className="farming-tier__locked w-100 f ac mb-1">
                                <span className="b">
                                    <Trans>Lock:</Trans>
                                </span>
                                <span className="ml-a farming-tier__locked-value">
                                    {tier.lock ? `${formatAmountTokens(tier.lock / Math.pow(10, +multiplierToken.decimals), true)} ${multiplierToken.symbol}` : "-"}
                                </span>
                            </div>
                            <div className="farming-tier__rewards f">
                                <span className="b">
                                    <Trans>Earn:</Trans>
                                </span>
                                <span className="ml-a farming-tier__rewards-value">{tier.earn ? `${100 + (tier.earn - 10000) / 100}%` : "100%"}</span>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
