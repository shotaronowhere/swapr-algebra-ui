import { useCallback, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "state/hooks";
import { useAccount } from "wagmi";
import { AppState } from "../index";
import { addPopup, ApplicationModal, PopupContent, removePopup, setOpenModal } from "./actions";

export function useBlockNumber(): number | undefined {
    const { chain } = useAccount();
    const chainId = chain?.id;

    return useAppSelector((state: AppState) => state.application.blockNumber[chainId ?? -1]);
}

export function useModalOpen(modal: ApplicationModal): boolean {
    const openModal = useAppSelector((state: AppState) => state.application.openModal);
    return openModal === modal;
}

export function useToggleModal(modal: ApplicationModal): () => void {
    const open = useModalOpen(modal);
    const dispatch = useAppDispatch();
    return useCallback(() => dispatch(setOpenModal(open ? null : modal)), [dispatch, modal, open]);
}

export function useToggleSettingsMenu(): () => void {
    return useToggleModal(ApplicationModal.SETTINGS);
}

export function useShowClaimPopup(): boolean {
    return useModalOpen(ApplicationModal.CLAIM_POPUP);
}

export function useToggleShowClaimPopup(): () => void {
    return useToggleModal(ApplicationModal.CLAIM_POPUP);
}

export function useToggleSelfClaimModal(): () => void {
    return useToggleModal(ApplicationModal.SELF_CLAIM);
}

export function useToggleDelegateModal(): () => void {
    return useToggleModal(ApplicationModal.DELEGATE);
}

export function useToggleVoteModal(): () => void {
    return useToggleModal(ApplicationModal.VOTE);
}

// returns a function that allows adding a popup
export function useAddPopup(): (content: PopupContent, key?: string) => void {
    const dispatch = useAppDispatch();

    return useCallback(
        (content: PopupContent, key?: string) => {
            dispatch(addPopup({ content, key }));
        },
        [dispatch]
    );
}

// returns a function that allows removing a popup via its key
export function useRemovePopup(): (key: string) => void {
    const dispatch = useAppDispatch();
    return useCallback(
        (key: string) => {
            dispatch(removePopup({ key }));
        },
        [dispatch]
    );
}

// get the list of active popups
export function useActivePopups(): AppState["application"]["popupList"] {
    const list = useAppSelector((state: AppState) => state.application.popupList);
    return useMemo(() => list.filter((item) => item.show), [list]);
}
