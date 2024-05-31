import AlgebraConfig from "algebra.config";

export const ALL_SUPPORTED_CHAIN_IDS: number[] = [AlgebraConfig.CHAIN_PARAMS[100].chainId, AlgebraConfig.CHAIN_PARAMS[10200].chainId];

export const L1_CHAIN_IDS = [] as const;

export type SupportedL1ChainId = typeof L1_CHAIN_IDS[number];

export const L2_CHAIN_IDS = [] as const;

export type SupportedL2ChainId = typeof L2_CHAIN_IDS[number];

interface L1ChainInfo {
    readonly label: string;
}

interface L2ChainInfo extends L1ChainInfo {
    readonly bridge: string;
    readonly logoUrl: string;
}

type ChainInfo = { readonly [chainId: number]: L1ChainInfo | L2ChainInfo } & {
    readonly [chainId in SupportedL2ChainId]: L2ChainInfo;
} & { readonly [chainId in SupportedL1ChainId]: L1ChainInfo };

export const CHAIN_INFO: ChainInfo = {
    [100]: {
        label: AlgebraConfig.CHAIN_PARAMS[100].chainName,
    },
    [10200]: {
        label: AlgebraConfig.CHAIN_PARAMS[10200].chainName,
    },
};
